import { NextRequest, NextResponse } from 'next/server';
import { saveImage } from '../../../lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { saveImageGeneration } from '../../../lib/db';
import crypto from 'crypto';

interface GenerationRequest {
  prompt: string;
  height: number;
  width: number;
  num_inference_steps: number;
  guidance_scale: number;
}

interface FluxResponse {
  success: boolean;
  image_data?: string;
  error?: string;
}

async function callFluxEndpoint(
  endpointUrl: string,
  prompt: string,
  height: number = 1024,
  width: number = 1024,
  numInferenceSteps: number = 20,
  guidanceScale: number = 3.5,
  apiKey?: string,
  maxAttempts: number = 180
): Promise<FluxResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const payload = {
    input: {
      prompt,
      height,
      width,
      num_inference_steps: numInferenceSteps,
      guidance_scale: guidanceScale,
    },
  };

  try {
    // Submit the job
    console.log('Calling RunPod endpoint:', endpointUrl);
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    console.log('RunPod response status:', response.status);
    console.log('RunPod response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const jobResponse = await response.json();

    // Check if it's already completed (synchronous response)
    if (jobResponse.status === 'COMPLETED') {
      return jobResponse.output || {};
    }

    // Handle asynchronous processing
    const jobId = jobResponse.id;
    if (!jobId) {
      return { success: false, error: 'No job ID received' };
    }

    // Poll for completion
    return await pollJobStatus(endpointUrl, jobId, apiKey, maxAttempts);

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed'
    };
  }
}

async function pollJobStatus(
  endpointUrl: string,
  jobId: string,
  apiKey?: string,
  maxAttempts: number = 180
): Promise<FluxResponse> {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const statusUrl = endpointUrl.replace('/run', `/status/${jobId}`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(statusUrl, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const statusData = await response.json();
      const status = statusData.status;

      if (status === 'COMPLETED') {
        return statusData.output || {};
      } else if (status === 'FAILED') {
        const errorMsg = statusData.error || 'Job failed';
        return { success: false, error: errorMsg };
      } else if (['IN_QUEUE', 'IN_PROGRESS'].includes(status)) {
        // Wait 5 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        // Wait 5 seconds for unknown status
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

    } catch (error) {
      // Wait 5 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return { success: false, error: 'Job timed out' };
}

// saving handled via lib/storage

export async function POST(request: NextRequest) {
  try {
    console.log('Generate API called');

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: GenerationRequest = await request.json();
    const { prompt, height, width, num_inference_steps, guidance_scale } = body;

    console.log('Request body:', { prompt, height, width, num_inference_steps, guidance_scale });

    // Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Validate parameters
    if (height < 256 || height > 2048 || height % 16 !== 0) {
      return NextResponse.json(
        { success: false, error: 'Height must be between 256 and 2048 and divisible by 16' },
        { status: 400 }
      );
    }

    if (width < 256 || width > 2048 || width % 16 !== 0) {
      return NextResponse.json(
        { success: false, error: 'Width must be between 256 and 2048 and divisible by 16' },
        { status: 400 }
      );
    }

    if (num_inference_steps < 1 || num_inference_steps > 50) {
      return NextResponse.json(
        { success: false, error: 'Steps must be between 1 and 50' },
        { status: 400 }
      );
    }

    if (guidance_scale < 1.0 || guidance_scale > 20.0) {
      return NextResponse.json(
        { success: false, error: 'Guidance must be between 1.0 and 20.0' },
        { status: 400 }
      );
    }

    // Get endpoint URL and API key from environment variables
    const endpointUrl = process.env.FLUX_ENDPOINT_URL;
    const apiKey = process.env.FLUX_API_KEY;

    console.log('Environment variables:', {
      endpointUrl: endpointUrl ? 'set' : 'not set',
      apiKey: apiKey ? 'set' : 'not set'
    });

    if (!endpointUrl || !apiKey) {
      // In development, provide a graceful fallback to avoid HTTP 500s
      if (process.env.NODE_ENV === 'development') {
        const placeholderBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
        const timestamp = Date.now();
        const safePrompt = prompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const filename = `flux_placeholder_${timestamp}_${safePrompt}.png`;
        // Fetch watermark settings from backend (public GET)
        let wmSettings: any = null;
        try {
          const base = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
          const res = await fetch(`${base}/api/admin/watermarks`);
          if (res.ok) wmSettings = await res.json();
        } catch {}

        const tokens = {
          email: session.user.email,
          timestamp: new Date().toISOString(),
          filename,
        };
        const renderTpl = (tpl: string) => tpl
          .replaceAll('{email}', tokens.email)
          .replaceAll('{timestamp}', tokens.timestamp)
          .replaceAll('{filename}', tokens.filename);

        const visibleText = wmSettings?.visible_enabled !== false
          ? renderTpl(String(wmSettings?.visible_text_template || `Image Generator • {email} • {timestamp}`))
          : undefined;
        const hiddenText = wmSettings?.hidden_enabled !== false
          ? JSON.stringify({
              user: session.user.email,
              ts: tokens.timestamp,
              filename,
              promptHash: crypto.createHash('sha256').update(prompt.trim()).digest('hex'),
            })
          : undefined;
        const imageUrl = await saveImage(placeholderBase64, filename, {
          visibleText,
          hiddenText,
          hiddenKey: String(wmSettings?.hidden_key || 'watermark'),
          visibleOptions: {
            position: wmSettings?.visible_position || 'bottom-right',
            opacity: typeof wmSettings?.visible_opacity === 'number' ? wmSettings.visible_opacity : 0.15,
            bar: wmSettings?.visible_bar !== false,
            fontScale: typeof wmSettings?.font_scale === 'number' ? wmSettings.font_scale : 0.03,
            fontFamily: wmSettings?.visible_font_family || undefined,
            fontDataUrl: wmSettings?.visible_font_data_url || undefined,
          }
        });
        // Save to database for consistency
        await saveImageGeneration({
          userEmail: session.user.email,
          prompt: prompt.trim(),
          imageUrl,
          width,
          height,
          steps: num_inference_steps ?? 20,
          guidance: guidance_scale ?? 3.5,
          creditsUsed: 1
        });
        return NextResponse.json({ success: true, imageUrl, prompt, timestamp: new Date().toISOString() });
      }
      return NextResponse.json(
        { success: false, error: 'Generation service not configured' },
        { status: 200 }
      );
    }

    // Call the Flux endpoint
    console.log('About to call Flux endpoint...');
    const result = await callFluxEndpoint(
      endpointUrl,
      prompt.trim(),
      height,
      width,
      num_inference_steps,
      guidance_scale,
      apiKey
    );
    console.log('Flux endpoint result:', { success: result.success, hasImageData: !!result.image_data });

    if (!result.success) {
      console.error('Flux endpoint failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'Image generation failed. This may be due to high server load or invalid parameters. Please try again.' },
        { status: 200 }
      );
    }

    // Convert base64 image data to data URL
    const imageData = result.image_data;
    if (!imageData) {
      console.error('No image data received from Flux endpoint');
      return NextResponse.json(
        { success: false, error: 'No image data received from generation service' },
        { status: 200 }
      );
    }

    // Validate base64 data
    if (typeof imageData !== 'string' || imageData.length < 100) {
      console.error('Invalid image data received:', typeof imageData, imageData.length);
      return NextResponse.json(
        { success: false, error: 'Invalid image data received from generation service' },
        { status: 200 }
      );
    }

    console.log('Image data length:', imageData.length);
    console.log('Image data starts with:', imageData.substring(0, 50));

    // Remove data URL prefix if present
    const base64Data = imageData.startsWith('data:image/png;base64,')
      ? imageData.split(',')[1]
      : imageData;

    console.log('Base64 data length after processing:', base64Data.length);

    // Generate unique filename
    const timestamp = Date.now();
    const safePrompt = prompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const filename = `flux_${timestamp}_${safePrompt}.png`;

    console.log('Saving image with filename:', filename);

    // Save image locally
    // Fetch watermark settings from backend (public GET)
    let wmSettings: any = null;
    try {
      const base = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const res = await fetch(`${base}/api/admin/watermarks`);
      if (res.ok) wmSettings = await res.json();
    } catch {}

    const tokens = {
      email: session.user.email,
      timestamp: new Date().toISOString(),
      filename,
    };
    const renderTpl = (tpl: string) => tpl
      .replaceAll('{email}', tokens.email)
      .replaceAll('{timestamp}', tokens.timestamp)
      .replaceAll('{filename}', tokens.filename);

    const visibleText = wmSettings?.visible_enabled !== false
      ? renderTpl(String(wmSettings?.visible_text_template || `Image Generator • {email} • {timestamp}`))
      : undefined;
    const hiddenText = wmSettings?.hidden_enabled !== false
      ? JSON.stringify({
          user: session.user.email,
          ts: tokens.timestamp,
          filename,
          promptHash: crypto.createHash('sha256').update(prompt.trim()).digest('hex'),
        })
      : undefined;

    const imageUrl = await saveImage(imageData, filename, {
      visibleText,
      hiddenText,
      hiddenKey: String(wmSettings?.hidden_key || 'watermark'),
      visibleOptions: {
        position: wmSettings?.visible_position || 'bottom-right',
        opacity: typeof wmSettings?.visible_opacity === 'number' ? wmSettings.visible_opacity : 0.15,
        bar: wmSettings?.visible_bar !== false,
        fontScale: typeof wmSettings?.font_scale === 'number' ? wmSettings.font_scale : 0.03,
        fontFamily: wmSettings?.visible_font_family || undefined,
        fontDataUrl: wmSettings?.visible_font_data_url || undefined,
      }
    });
    console.log('Image saved locally at:', imageUrl);

    // Save to database
    const saved = await saveImageGeneration({
      userEmail: session.user.email,
      prompt: prompt.trim(),
      imageUrl,
      width,
      height,
      steps: num_inference_steps,
      guidance: guidance_scale,
      creditsUsed: 1
    });

    if (!saved) {
      console.error('Failed to save image generation to database');
      // Don't fail the request, just log the error
    } else {
      console.log('Image generation saved to database');
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      prompt,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'X-Credit-Value': '1'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 200 });
  }
}