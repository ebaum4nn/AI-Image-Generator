# FLUX.2-dev RunPod Endpoint

This is a RunPod serverless endpoint for generating images using the Black Forest Labs FLUX.2-dev model.

## Features

- Text-to-image generation using FLUX.2-dev
- Configurable image dimensions (256-2048px, multiples of 16)
- Adjustable inference steps and guidance scale
- Returns images as base64-encoded PNG data
- Optimized for RunPod serverless environment

## API Usage

### Input Format

```json
{
  "prompt": "A beautiful landscape with mountains and a lake",
  "height": 1024,
  "width": 1024,
  "num_inference_steps": 20,
  "guidance_scale": 3.5
}
```

### Parameters

- `prompt` (required): Text description of the image to generate
- `height` (optional): Image height in pixels (256-2048, multiple of 16). Default: 1024
- `width` (optional): Image width in pixels (256-2048, multiple of 16). Default: 1024
- `num_inference_steps` (optional): Number of denoising steps (1-50). Default: 20
- `guidance_scale` (optional): Classifier-free guidance scale (1.0-20.0). Default: 3.5

### Output Format

```json
{
  "success": true,
  "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "usage": {
    "inference_steps": 20,
    "height": 1024,
    "width": 1024,
    "guidance_scale": 3.5
  },
  "model": "black-forest-labs/FLUX.2-dev",
  "timestamp": 1735689600
}
```

## Local Testing

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the test script:
```bash
python test_api.py
```

## Deployment to RunPod

1. Build and push the Docker image:
```bash
docker build -t your-registry/flux-endpoint .
docker push your-registry/flux-endpoint
```

2. Create a new endpoint in RunPod with:
   - Docker image: `your-registry/flux-endpoint`
   - GPU: A100 or H100 recommended (24GB+ VRAM)
   - Handler: `handler` (defined in handler.py)

## Requirements

- CUDA-compatible GPU with at least 24GB VRAM
- Python 3.8+
- PyTorch 2.1+
- CUDA 12.1+
- **Hugging Face account with access to FLUX.2-dev model**

## Model Information

- **Model**: black-forest-labs/FLUX.2-dev (FLUX.2 architecture)
- **Type**: Advanced text-to-image diffusion model
- **License**: Apache 2.0
- **Size**: ~23GB (downloaded on first run)
- **Architecture**: FLUX.2 with Mistral-3B text encoder

## Hugging Face Authentication

FLUX.2-dev is a gated model that requires authentication. You need:

1. A Hugging Face account
2. Access to the `black-forest-labs/FLUX.2-dev` model (request access if needed)
3. A Hugging Face API token

### Setting up the Token

**Option 1: RunPod Environment Variables (Recommended)**
In your RunPod endpoint configuration, add environment variables:
- Key: `HF_TOKEN`
- Value: `your_huggingface_token_here`

**Option 2: Docker Environment Variable**
In `Dockerfile.runpod`, uncomment and set:
```dockerfile
ENV HF_TOKEN="your_huggingface_token_here"
```

**Option 3: Build-time Argument**
Add to your Docker build command:
```bash
docker build --build-arg HF_TOKEN=your_token_here -f Dockerfile.runpod -t flux-endpoint .
```

⚠️ **Security Warning**: Never commit tokens to version control. Use environment variables or RunPod's secure configuration.

## Performance Notes

- First request may take longer due to model download
- Recommended settings for speed: 10-15 inference steps
- Higher guidance_scale (>7) for more precise prompt following
- Image dimensions should be multiples of 16