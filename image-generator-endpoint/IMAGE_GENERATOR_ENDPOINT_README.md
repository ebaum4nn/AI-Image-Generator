# RunPod Image Generator Endpoint Setup

This **separate repository** contains the RunPod serverless endpoint for image generation using various AI models from Hugging Face.

## Repository Structure

- `handler.py` - RunPod serverless handler for image generation
- `Dockerfile.runpod` - Docker configuration for RunPod deployment
- `requirements.txt` - Python dependencies
- `runpod-endpoint-config.json` - Endpoint configuration with HF_TOKEN
- `deploy_runpod_endpoint.py` - Deployment script
- `test_api.py` - Local testing script

## Setup Instructions

### 1. Create Hugging Face Secret in RunPod

1. Go to your RunPod account
2. Navigate to Secrets section
3. Create a new secret named `HuggingFaceAPI`
4. Add your Hugging Face token as the secret value

### 2. Update Configuration

Edit `runpod-endpoint-config.json`:
- Change `imageName` to your actual Docker registry path
- Adjust GPU types, memory, etc. as needed

### 3. Deploy Endpoint

Run the deployment script:

```bash
python deploy_runpod_endpoint.py
```

This will create a RunPod serverless endpoint with the HF_TOKEN environment variable set to `{{ RUNPOD_SECRET_HuggingFaceAPI }}`.

## How HF_TOKEN Works

The `{{ RUNPOD_SECRET_HuggingFaceAPI }}` syntax tells RunPod to inject your secret value into the `HF_TOKEN` environment variable at runtime. The handler.py automatically:

1. Reads the `HF_TOKEN` environment variable
2. Authenticates with Hugging Face using `huggingface_hub.login()`
3. Loads the image generation model using the appropriate pipeline

## Model Caching & Volume Mounting

The endpoint is configured with **persistent volume mounting** for model caching:

- **Volume Size**: 100GB persistent storage
- **Mount Path**: `/app/model_cache`
- **Purpose**: Cache image generation models to avoid re-downloading

### How It Works

1. **First Run**: Model downloads from Hugging Face and caches to persistent volume
2. **Subsequent Runs**: Model loads instantly from cached volume
3. **Container Restarts**: Cached model persists across restarts

### Cache Directories

The following environment variables ensure proper caching:
- `TRANSFORMERS_CACHE=/app/model_cache`
- `DIFFUSERS_CACHE=/app/model_cache`
- `HF_HOME=/app/model_cache`

## Testing

After deployment, test the endpoint using:

```bash
python test_api.py
```

Or use the existing test scripts in the parent directory.