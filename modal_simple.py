import modal

app = modal.App("plottwist-simple-test")

image = modal.Image.debian_slim().pip_install("fastapi[standard]")

@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def simple_chat(item: dict):
    """Simple test endpoint"""
    messages = item.get("messages", [])
    
    # Simple response for testing
    response_text = f"Hello! You sent {len(messages)} messages. This is a test from Modal!"
    
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

@app.local_entrypoint()
def test():
    """Test locally"""
    result = simple_chat.remote({"messages": [{"role": "user", "content": "test"}]})
    print("Test result:", result)