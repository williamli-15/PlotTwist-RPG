import modal
from typing import List, Dict, Any

app = modal.App("plottwist-llm-simple")

# Simpler image without model download during build
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install([
        "transformers>=4.36.0", 
        "torch>=2.0.0",
        "accelerate>=0.24.0",
        "fastapi[standard]",
        "pydantic"
    ])
)

@app.cls(
    image=image,
    gpu="T4",  # Use smaller/cheaper GPU for testing
    scaledown_window=600,  # Keep warm longer for faster responses
    timeout=600,
    keep_warm=1,  # Keep 1 instance warm
)
@modal.concurrent(max_inputs=5)
class SimpleLLM:
    def __init__(self):
        self.model = None
        self.tokenizer = None
    
    @modal.enter()
    def load_model(self):
        """Load model when container starts"""
        from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
        import torch
        
        print("Loading small model...")
        
        # Use a smaller, faster model
        model_name = "microsoft/DialoGPT-medium"
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
                
            self.model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype=torch.float16,
                device_map="auto"
            )
            print("Model loaded successfully!")
        except Exception as e:
            print(f"Error loading model: {e}")
            # Fallback to pipeline
            self.pipeline = pipeline(
                "text-generation",
                model="gpt2-medium",
                device=0 if torch.cuda.is_available() else -1
            )
            self.use_pipeline = True
            print("Using GPT2 pipeline as fallback")

    @modal.method()
    def generate_response(self, messages: List[Dict[str, str]], max_tokens: int = 150) -> str:
        """Generate response from messages"""
        import torch
        
        try:
            if hasattr(self, 'use_pipeline'):
                # Use pipeline fallback - better context handling
                conversation = ""
                system_prompt = ""
                
                # Extract system prompt and conversation
                for msg in messages:
                    if msg['role'] == 'system':
                        system_prompt = msg['content']
                    elif msg['role'] == 'user':
                        conversation += f"Human: {msg['content']}\n"
                    elif msg['role'] == 'assistant':
                        conversation += f"Assistant: {msg['content']}\n"
                
                # Create prompt with personality context
                if system_prompt:
                    prompt = f"[Character: {system_prompt}]\n\n{conversation}Assistant:"
                else:
                    prompt = f"{conversation}Assistant:"
                
                outputs = self.pipeline(
                    prompt,
                    max_length=len(prompt.split()) + max_tokens,
                    num_return_sequences=1,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=self.pipeline.tokenizer.eos_token_id
                )
                
                response = outputs[0]['generated_text'][len(prompt):].strip()
                # Clean up common artifacts
                response = response.split("Human:")[0].split("[Character:")[0].strip()
                return response if response else "I understand. Please tell me more!"
            
            # Build conversation context with system prompt
            conversation = ""
            system_prompt = ""
            
            # Process messages to separate system prompt from conversation
            for msg in messages:
                if msg['role'] == 'system':
                    system_prompt = msg['content']
                elif msg['role'] == 'user':
                    conversation += f"Human: {msg['content']}\n"
                elif msg['role'] == 'assistant':
                    conversation += f"Assistant: {msg['content']}\n"
            
            # Create context-aware prompt
            if system_prompt:
                full_prompt = f"[Character: {system_prompt}]\n\n{conversation}Assistant:"
            else:
                full_prompt = f"{conversation}Assistant:"
            
            # Tokenize and generate
            inputs = self.tokenizer.encode(full_prompt, return_tensors="pt").to(self.model.device)
            
            with torch.no_grad():
                outputs = self.model.generate(
                    inputs,
                    max_new_tokens=max_tokens,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id,
                    eos_token_id=self.tokenizer.eos_token_id,
                )
            
            # Decode only the new tokens
            response = self.tokenizer.decode(outputs[0][inputs.shape[-1]:], skip_special_tokens=True)
            
            # Clean up response
            response = response.split("Human:")[0].split("[Character:")[0].strip()
            
            return response if response else "I understand. Please tell me more!"
            
        except Exception as e:
            print(f"Generation error: {e}")
            return "I'm having trouble processing that. Could you try rephrasing?"

@app.function(image=image)
@modal.fastapi_endpoint(method="POST", label="chat")
def chat_endpoint(item: Dict[str, Any]):
    """Chat endpoint compatible with OpenRouter API"""
    
    try:
        messages = item.get("messages", [])
        max_tokens = min(item.get("max_tokens", 150), 300)  # Limit tokens
        
        if not messages:
            return {"error": "No messages provided"}
        
        # Get LLM service
        llm = SimpleLLM()
        response_text = llm.generate_response.remote(messages, max_tokens)
        
        # Return in OpenRouter format
        return {
            "choices": [{
                "message": {
                    "role": "assistant", 
                    "content": response_text
                },
                "finish_reason": "stop"
            }],
            "usage": {"total_tokens": len(response_text.split())}
        }
            
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return {
            "choices": [{
                "message": {
                    "role": "assistant", 
                    "content": "I apologize, but I'm experiencing some technical difficulties right now."
                },
                "finish_reason": "stop"
            }]
        }

@app.local_entrypoint()
def test():
    """Test the LLM locally"""
    test_messages = [
        {"role": "system", "content": "You are Linn, a friendly hackathon host."},
        {"role": "user", "content": "Hi! Tell me about this hackathon."}
    ]
    
    llm = SimpleLLM()
    response = llm.generate_response.remote(test_messages)
    print("Response:", response)