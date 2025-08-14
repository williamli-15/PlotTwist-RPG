import modal
import asyncio
from typing import List, Dict, Any
import json
import os

# Create Modal app
app = modal.App("plottwist-rpg-llm")

# Model configuration - Using Qwen2.5-7B-Instruct (great for chat/roleplay)
MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct"
MODEL_REVISION = "main"

# Define the image with all necessary ML dependencies
def download_model():
    from transformers import AutoTokenizer, AutoModelForCausalLM
    import torch
    
    print(f"Downloading {MODEL_NAME}...")
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_NAME,
        revision=MODEL_REVISION,
        trust_remote_code=True
    )
    
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME, 
        revision=MODEL_REVISION,
        torch_dtype=torch.float16,
        trust_remote_code=True
    )
    print("Model downloaded successfully!")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install([
        "torch>=2.0.0",
        "transformers>=4.36.0", 
        "accelerate>=0.24.0",
        "bitsandbytes>=0.41.0",
        "sentencepiece",
        "protobuf",
        "fastapi[standard]",
        "pydantic",
        "hf_transfer"
    ])
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    .run_function(download_model)
)

@app.cls(
    image=image,
    gpu="A10G",  # Good balance of performance/cost
    scaledown_window=240,  # Keep warm for 4 minutes
    timeout=300,  # 5 minute timeout
)
@modal.concurrent(max_inputs=10)  # Handle multiple requests
class LLMService:
    @modal.enter()
    def setup(self):
        """Load model into GPU memory when container starts"""
        from transformers import AutoTokenizer, AutoModelForCausalLM
        import torch
        
        print("Loading model into memory...")
        self.tokenizer = AutoTokenizer.from_pretrained(
            MODEL_NAME,
            revision=MODEL_REVISION,
            trust_remote_code=True
        )
        
        self.model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME,
            revision=MODEL_REVISION,
            torch_dtype=torch.float16,
            trust_remote_code=True,
            device_map="auto",
            load_in_8bit=True  # Use 8-bit quantization to save memory
        )
        print("Model loaded successfully!")

    @modal.method()
    def generate_streaming(self, messages: List[Dict[str, str]], max_tokens: int = 5000) -> str:
        """Generate streaming response"""
        import torch
        from transformers import TextIteratorStreamer
        from threading import Thread
        
        # Apply chat template
        try:
            formatted_prompt = self.tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
        except Exception as e:
            print(f"Error applying chat template: {e}")
            # Fallback: simple concatenation
            formatted_prompt = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
            formatted_prompt += "\nassistant:"
        
        # Tokenize
        inputs = self.tokenizer(formatted_prompt, return_tensors="pt").to(self.model.device)
        
        # Generation parameters
        generation_kwargs = {
            "input_ids": inputs.input_ids,
            "max_new_tokens": max_tokens,
            "temperature": 0.7,
            "do_sample": True,
            "top_p": 0.9,
            "repetition_penalty": 1.1,
            "pad_token_id": self.tokenizer.eos_token_id,
        }
        
        # Generate
        with torch.no_grad():
            outputs = self.model.generate(**generation_kwargs)
        
        # Decode only the new tokens (skip input)
        new_tokens = outputs[0][inputs.input_ids.shape[-1]:]
        response = self.tokenizer.decode(new_tokens, skip_special_tokens=True)
        
        return response.strip()

# Web endpoint that mimics OpenRouter's API format
@app.function(image=image)
@modal.fastapi_endpoint(method="POST", label="chat")
def chat_endpoint(item: Dict[str, Any]):
    """Chat endpoint that matches OpenRouter API format"""
    
    try:
        messages = item.get("messages", [])
        max_tokens = item.get("max_tokens", 5000)
        stream = item.get("stream", False)
        
        if not messages:
            return {"error": "No messages provided"}
        
        # Get LLM service
        llm_service = LLMService()
        
        # Generate response
        response_text = llm_service.generate_streaming.remote(messages, max_tokens)
        
        if stream:
            # For now, return the full response
            # TODO: Implement proper streaming
            return {
                "choices": [{
                    "delta": {"content": response_text},
                    "finish_reason": "stop"
                }]
            }
        else:
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
        return {"error": str(e)}

# Local test function
@app.local_entrypoint()
def test():
    """Test the LLM locally"""
    test_messages = [
        {"role": "system", "content": "You are Linn Bieske, the lead host of Hack-Nation: Global AI Online-Hackathon."},
        {"role": "user", "content": "Hi! Tell me about this hackathon."}
    ]
    
    llm_service = LLMService()
    response = llm_service.generate_streaming.remote(test_messages)
    print("Response:", response)