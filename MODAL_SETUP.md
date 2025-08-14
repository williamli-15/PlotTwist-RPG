# Modal LLM Backend Setup

This guide helps you replace OpenRouter/Gemini with your own Modal-hosted LLM.

## 1. Install Modal

```bash
pip install modal
python3 -m modal setup
```

Follow the browser authentication to get your API token.

## 2. Deploy the LLM Service

```bash
# Deploy the Modal app
modal deploy modal_llm.py

# Test it locally first
modal run modal_llm.py::test
```

After deployment, Modal will give you an endpoint URL like:
```
https://your-username--plottwist-rpg-llm-chat.modal.run
```

## 3. Update Environment Variables

Add to your `.env.local`:

```bash
# Add your Modal endpoint
MODAL_ENDPOINT=https://your-username--plottwist-rpg-llm-chat.modal.run

# Keep OpenRouter as backup
OPENROUTER_API_KEY=your_openrouter_key
```

## 4. Switch to Modal Backend

Update your `DynamicChatService.js` to use Modal:

```javascript
// In app/components/DynamicChatService.js
// Change this line:
const response = await fetch('/api/chat', {

// To this:
const response = await fetch('/api/chat-modal', {
```

## 5. Model Details

**Current Model:** Qwen/Qwen2.5-7B-Instruct
- Great for roleplay and chat
- 7B parameters (similar to Gemini Flash)
- Supports chat templates
- Good at following character personalities

**Performance:**
- Cold start: ~10-15 seconds (first request)
- Warm requests: ~2-5 seconds
- GPU: A10G (good balance of cost/performance)
- Memory: 8-bit quantization for efficiency

## 6. Costs (Approximate)

With Modal free credits:
- GPU time: ~$0.60/hour for A10G
- Compute: minimal
- Storage: minimal

The service auto-scales down when not in use.

## 7. Monitoring

Check your Modal dashboard at https://modal.com for:
- Function logs
- GPU usage
- Cost tracking
- Performance metrics

## 8. Alternative Models

If you want to try different models, edit `modal_llm.py`:

```python
# For smaller/faster:
MODEL_NAME = "microsoft/DialoGPT-medium"

# For larger/better quality:
MODEL_NAME = "meta-llama/Llama-3.1-8B-Instruct" 

# For roleplay specialist:
MODEL_NAME = "NousResearch/Hermes-3-Llama-3.1-8B"
```

## 9. Troubleshooting

**Cold starts taking too long?**
- Increase `container_idle_timeout` in modal_llm.py

**Out of memory errors?**
- Switch to smaller model or use `load_in_4bit=True`

**API errors?**
- Check Modal logs with `modal logs plottwist-rpg-llm`

**Responses not good enough?**
- Adjust temperature, top_p in generation parameters
- Try a different model

## 10. Rollback

To switch back to OpenRouter, just change:

```javascript
// Back to OpenRouter
const response = await fetch('/api/chat', {
```