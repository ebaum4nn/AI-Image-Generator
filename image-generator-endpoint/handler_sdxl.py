#!/usr/bin/env python3
"""
RunPod Serverless Handler for SDXL Image Generation
Simple API endpoint for text-to-image generation using Stable Diffusion XL.
"""

import runpod
import json
import os
import time
import logging
import torch
from diffusers import StableDiffusionXLPipeline
from huggingface_hub import login
from typing import Dict, Any, Optional
import base64
from io import BytesIO

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for pipeline
pipeline = None

def load_pipeline():
    """Load the SDXL image generation pipeline"""
    global pipeline

    if pipeline is None:
        logger.info("Loading SDXL image generation pipeline...")

        try:
            # Authenticate with Hugging Face
            hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
            if hf_token:
                logger.info("Authenticating with Hugging Face...")
                login(token=hf_token)
                logger.info("Successfully authenticated with Hugging Face")
            else:
                logger.warning("No HF_TOKEN or HUGGINGFACE_TOKEN found - SDXL model requires authentication")

            # Load SDXL pipeline
            pipeline = StableDiffusionXLPipeline.from_pretrained(
                "stabilityai/stable-diffusion-xl-base-1.0",
                torch_dtype=torch.float16,
                variant="fp16",
                use_safetensors=True
            )
            logger.info("Loaded SDXL base model")

            # Move to GPU if available
            if torch.cuda.is_available():
                pipeline = pipeline.to("cuda")
                # Enable memory efficient attention
                pipeline.enable_attention_slicing()
                logger.info("SDXL pipeline loaded on GPU with attention slicing!")
            else:
                logger.warning("CUDA not available, running on CPU (this will be slow)")

            return True

        except Exception as e:
            logger.error(f"Failed to load SDXL pipeline: {e}")
            return False

    return True

def generate_image(prompt: str,
                  height: int = 1024,
                  width: int = 1024,
                  num_inference_steps: int = 25,
                  guidance_scale: float = 7.5) -> Dict[str, Any]:
    """
    Generate image using SDXL

    Args:
        prompt: The input text prompt
        height: Image height (must be multiple of 8 for SDXL)
        width: Image width (must be multiple of 8 for SDXL)
        num_inference_steps: Number of denoising steps
        guidance_scale: Guidance scale for classifier-free guidance

    Returns:
        Dictionary containing the generated image data and metadata
    """
    global pipeline

    try:
        # Ensure pipeline is loaded
        if not load_pipeline():
            return {
                "success": False,
                "error": "Failed to load SDXL pipeline",
                "image_data": "",
                "usage": {"inference_steps": 0},
                "model": "error",
                "timestamp": int(time.time())
            }

        logger.info(f"Generating image with prompt: {prompt[:100]}...")

        # Validate and adjust dimensions (must be multiple of 8 for SDXL)
        height = max(512, min(height, 1536))  # SDXL typical range
        width = max(512, min(width, 1536))
        height = (height // 8) * 8  # Ensure multiple of 8
        width = (width // 8) * 8

        # Clamp other parameters
        num_inference_steps = max(1, min(num_inference_steps, 50))
        guidance_scale = max(1.0, min(guidance_scale, 20.0))

        logger.info(f"Parameters: height={height}, width={width}, steps={num_inference_steps}, guidance={guidance_scale}")

        # Clear CUDA cache before generation
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        # Generate image
        with torch.no_grad():
            image = pipeline(
                prompt=prompt,
                height=height,
                width=width,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
            ).images[0]

        # Convert to base64
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        image_data = base64.b64encode(buffer.getvalue()).decode('utf-8')

        # Create response
        response = {
            "success": True,
            "image_data": f"data:image/png;base64,{image_data}",
            "usage": {
                "inference_steps": num_inference_steps,
                "height": height,
                "width": width,
                "guidance_scale": guidance_scale
            },
            "model": "stabilityai/stable-diffusion-xl-base-1.0",
            "timestamp": int(time.time())
        }

        logger.info(f"Image generated successfully. Size: {image.size}")
        return response

    except Exception as e:
        logger.error(f"Error in generate_image: {str(e)}")
        return {
            "success": False,
            "error": f"Generation error: {str(e)}",
            "image_data": "",
            "usage": {"inference_steps": 0},
            "model": "error",
            "timestamp": int(time.time())
        }

def handler(job):
    """
    RunPod serverless handler function for SDXL

    Expected input format:
    {
        "prompt": "Your image prompt here",
        "height": 1024,
        "width": 1024,
        "num_inference_steps": 25,
        "guidance_scale": 7.5
    }
    """
    try:
        logger.info(f"Handler called with job: {job}")
        job_input = job.get("input", {})
        logger.info(f"Extracted job_input: {job_input}")

        # Validate required parameters
        if not job_input.get("prompt"):
            logger.error("Missing required parameter: prompt")
            return {
                "error": "Missing required parameter: 'prompt'",
                "success": False
            }

        # Extract parameters with defaults
        prompt = job_input["prompt"]
        height = job_input.get("height", 1024)
        width = job_input.get("width", 1024)
        num_inference_steps = job_input.get("num_inference_steps", 25)
        guidance_scale = job_input.get("guidance_scale", 7.5)

        # Enhanced logging for request tracking
        logger.info(f"🚀 PROCESSING SDXL IMAGE GENERATION REQUEST")
        logger.info(f"📝 Prompt: {prompt}")
        logger.info(f"🎛️  Parameters: height={height}, width={width}, steps={num_inference_steps}, guidance={guidance_scale}")

        # Validate parameters
        if not isinstance(prompt, str) or len(prompt.strip()) == 0:
            return {
                "error": "Prompt must be a non-empty string",
                "success": False
            }

        if height < 512 or height > 1536:
            return {
                "error": "height must be between 512 and 1536",
                "success": False
            }

        if width < 512 or width > 1536:
            return {
                "error": "width must be between 512 and 1536",
                "success": False
            }

        if num_inference_steps < 1 or num_inference_steps > 50:
            return {
                "error": "num_inference_steps must be between 1 and 50",
                "success": False
            }

        if guidance_scale < 1.0 or guidance_scale > 20.0:
            return {
                "error": "guidance_scale must be between 1.0 and 20.0",
                "success": False
            }

        logger.info(f"Processing SDXL image generation request for prompt: {prompt[:100]}...")

        # Generate image
        result = generate_image(
            prompt=prompt,
            height=height,
            width=width,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale
        )

        logger.info(f"SDXL image generation completed. Success: {result.get('success', False)}")

        # Ensure the response is JSON serializable and properly formatted
        response = {
            "success": result.get("success", False),
            "image_data": result.get("image_data", ""),
            "usage": result.get("usage", {}),
            "model": result.get("model", "unknown"),
            "timestamp": result.get("timestamp", time.time())
        }

        if not result.get("success", False):
            response["error"] = result.get("error", "Unknown error")

        logger.info(f"Final response being returned with image data length: {len(response.get('image_data', ''))}")
        return response

    except Exception as e:
        logger.error(f"Error in handler: {str(e)}")
        return {
            "error": f"Handler error: {str(e)}",
            "success": False
        }

# Health check endpoint
def health_check():
    """Health check for the SDXL service"""
    global pipeline

    if pipeline is None:
        return {
            "status": "unhealthy",
            "message": "SDXL Pipeline not loaded"
        }

    return {
        "status": "healthy",
        "message": "SDXL Pipeline loaded and ready",
        "model": "stabilityai/stable-diffusion-xl-base-1.0"
    }

# Pre-load the pipeline when the container starts
logger.info("🚀 Container starting - pre-loading SDXL pipeline...")
if load_pipeline():
    logger.info("✅ SDXL pipeline pre-loaded successfully!")
else:
    logger.error("❌ SDXL pipeline pre-loading failed - requests will attempt to load on-demand")

logger.info("🎯 Starting RunPod serverless listener for SDXL...")

# Start the RunPod serverless handler - this should always run
runpod.serverless.start({"handler": handler})