# Image Generator Next.js Web Interface

A Next.js web application for generating images using AI models via RunPod serverless endpoints.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory with your RunPod credentials:
```env
IMAGE_GENERATOR_ENDPOINT_URL=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run
IMAGE_GENERATOR_API_KEY=your_runpod_api_key_here

# Storage Configuration
STORAGE_TYPE=local  # Options: local, s3
LOCAL_STORAGE_PATH=public/images
S3_BUCKET_NAME=your-images-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
```

Get your API key from: https://runpod.io/console/user/settings

## Storage

### Local Storage (Default)
Images are saved to the `public/images/` directory and served directly by Next.js.

### S3 Storage (Future)
Set `STORAGE_TYPE=s3` and configure the S3 variables for cloud storage.

## Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- Web-based interface for AI image generation
- **Preset Recipes**: Dropdown selection of predefined generation recipes
- Adjustable parameters (width, height, steps, guidance)
- Local file storage with download functionality
- Real-time image display
- History of generated images
- Responsive design with dark mode support

## Creating Custom Presets

Add JSON files to the `presets/` folder to create custom generation recipes:

```json
{
  "name": "My Custom Style",
  "description": "Description of your preset",
  "prompt": "Your custom prompt template",
  "height": 1024,
  "width": 1024,
  "steps": 20,
  "guidance": 3.5
}
```

The presets will automatically appear in the dropdown menu.

## API

The application provides a REST API endpoint at `/api/generate` that accepts POST requests with the following JSON payload:

```json
{
  "prompt": "A beautiful sunset over mountains",
  "height": 1024,
  "width": 1024,
  "num_inference_steps": 20,
  "guidance_scale": 3.5
}
```

## Environment Variables

- `FLUX_ENDPOINT_URL`: Your RunPod endpoint URL
- `FLUX_API_KEY`: Your RunPod API key
- `STORAGE_TYPE`: Storage backend (local or s3)
- `LOCAL_STORAGE_PATH`: Local directory for image storage
- `S3_BUCKET_NAME`: S3 bucket name (for future S3 support)
- `S3_REGION`: AWS region
- `S3_ACCESS_KEY_ID`: AWS access key
- `S3_SECRET_ACCESS_KEY`: AWS secret key

## Deployment

Build for production:
```bash
npm run build
npm start
```

The application will be available on port 3000.