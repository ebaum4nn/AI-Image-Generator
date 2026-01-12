FROM nvidia/cuda:11.8.0-devel-ubuntu22.04

# Set working directory
WORKDIR /app

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    gcc \
    g++ \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python
RUN ln -s /usr/bin/python3 /usr/bin/python

# Upgrade pip to latest version
RUN pip install --upgrade pip setuptools wheel

# Install basic dependencies first (separately for better error handling)
RUN pip install --no-cache-dir runpod
RUN pip install --no-cache-dir flask
RUN pip install --no-cache-dir requests

# Install accelerate first (required for device_map)
RUN pip install --no-cache-dir accelerate>=0.20.0

# Install PyTorch with CUDA support 
RUN pip install --no-cache-dir torch>=2.0.0 torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install transformers and diffusers
RUN pip install --no-cache-dir transformers>=4.32.0 diffusers>=0.25.0

# Install additional utilities
RUN pip install --no-cache-dir numpy sentencepiece bitsandbytes Pillow

# Copy requirements for reference (already installed above)
COPY requirements.txt .

# Copy handler script
COPY handler.py .

# Set model cache directory (model will be downloaded at runtime)
ENV TRANSFORMERS_CACHE=/app/model_cache
ENV DIFFUSERS_CACHE=/app/model_cache
RUN mkdir -p /app/model_cache

# Note: Model will be downloaded on first use to avoid build failures
# This prevents Docker build timeouts and layer size issues

# Expose port for local testing
EXPOSE 8000

# Set environment variables
ENV PYTHONPATH="/app"
ENV PYTHONUNBUFFERED=1
ENV CUDA_VISIBLE_DEVICES="0"

# Set the command to run the handler
CMD ["python", "handler.py"]