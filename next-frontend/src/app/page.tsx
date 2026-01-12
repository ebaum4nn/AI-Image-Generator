'use client';

import React, { useState, useEffect } from 'react';
import Gallery from './components/Gallery';
import GeneratePanel from './components/GeneratePanel';
import SidebarNav from './components/SidebarNav';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface GenerationParams {
  prompt: string;
  height: number;
  width: number;
  steps: number;
  guidance: number;
    count: number;
}

interface Preset {
  name: string;
  description: string;
  prompt: string;
  height: number;
  width: number;
  steps: number;
  guidance: number;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  timestamp: Date;
}

export default function Home() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [params, setParams] = useState<GenerationParams>({
    prompt: '',
    height: 1024,
    width: 1024,
    steps: 20,
    guidance: 3.5,
    count: 1,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string>('');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);
  // Lightbox moved into Gallery component

  // Check if debug mode is enabled
  const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

  // Gallery now manages its own pagination internally

  // Get the current generation status message based on elapsed time
  const getGenerationStatusMessage = () => {
    if (!isGenerating || !generationStartTime) return 'Processing...';

    if (generationProgress) {
      return `Generating ${generationProgress.current} of ${generationProgress.total}...`;
    }

    const elapsedSeconds = (Date.now() - generationStartTime) / 1000;
    if (elapsedSeconds < 60) return 'Processing...';
    if (elapsedSeconds < 180) return 'High volume detected, processing may take longer...';
    return 'Generating image...';
  };

  // Removed redirect for unauthenticated users to allow public homepage

  // Load presets on component mount
  useEffect(() => {
    const loadPresets = async () => {
      try {
        const response = await fetch('/api/presets');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setPresets(data.presets);
          }
        }
      } catch (error) {
        console.error('Failed to load presets:', error);
      }
    };

    loadPresets();
  }, []);

  // Load previously generated images on component mount
  useEffect(() => {
    const loadPreviousImages = async () => {
      if (!session || status !== 'authenticated') return;

      try {
        const response = await fetch('/api/images');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const previousImages: GeneratedImage[] = data.images.map((img: any) => ({
              id: img.id.toString(),
              prompt: img.prompt,
              imageUrl: img.imageUrl,
              timestamp: new Date(img.timestamp),
            }));
            
            // Preserve any existing processing placeholders
            const existingProcessingImages = generatedImages.filter(img => 
              !img.imageUrl && img.id.startsWith('processing-')
            );
            
            setGeneratedImages([...existingProcessingImages, ...previousImages]);
          }
        }
      } catch (error) {
        console.error('Failed to load previous images:', error);
      }
    };

    loadPreviousImages();
  }, [session, status]);

  // Restore generation state from localStorage on mount
  useEffect(() => {
    const savedGenerationState = localStorage.getItem('generationState');
    if (savedGenerationState) {
      try {
        const { isGenerating: savedIsGenerating, generationStartTime: savedStartTime, processingImage } = JSON.parse(savedGenerationState);
        
        // Only restore if it's been less than 15 minutes (to avoid stale state)
        const now = Date.now();
        if (savedStartTime && (now - savedStartTime) < 15 * 60 * 1000) {
          setIsGenerating(savedIsGenerating);
          setGenerationStartTime(savedStartTime);
          
          // Restore the processing placeholder if it exists
          if (processingImage) {
            setGeneratedImages(prev => [processingImage, ...prev.filter(img => img.id !== processingImage.id)]);
          }
        } else {
          // Clear stale state
          localStorage.removeItem('generationState');
        }
      } catch (error) {
        console.error('Failed to restore generation state:', error);
        localStorage.removeItem('generationState');
      }
    }
  }, []);

  // Save generation state to localStorage whenever it changes
  useEffect(() => {
    if (isGenerating && generationStartTime) {
      // Find the processing image
      const processingImage = generatedImages.find(img => !img.imageUrl && img.id.startsWith('processing-'));
      
      const stateToSave = {
        isGenerating,
        generationStartTime,
        processingImage: processingImage || null
      };
      
      localStorage.setItem('generationState', JSON.stringify(stateToSave));
    } else {
      // Clear localStorage when not generating
      localStorage.removeItem('generationState');
    }
  }, [isGenerating, generationStartTime, generatedImages]);

  // Function to refresh images from server (if needed elsewhere)
  const refreshImages = async () => {
    if (!session || status !== 'authenticated') return;

    try {
      const response = await fetch('/api/images');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const refreshedImages: GeneratedImage[] = data.images.map((img: any) => ({
            id: img.id.toString(),
            prompt: img.prompt,
            imageUrl: img.imageUrl,
            timestamp: new Date(img.timestamp),
          }));
          setGeneratedImages(refreshedImages);
        }
      }
    } catch (error) {
      console.error('Failed to refresh images:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!params.prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (!session || !session.user) {
      setError('Please sign in to generate images.');
      return;
    }

    const requestedCount = Math.max(1, params.count || 1);
    if (session.user.credits < requestedCount) {
      setError(`Insufficient credits. You need ${requestedCount} credits but have ${session.user.credits}. Please buy more credits.`);
      return;
    }

    setIsGenerating(true);
    setGenerationStartTime(Date.now());
    setError('');
    try {
      for (let i = 0; i < requestedCount; i++) {
        setGenerationProgress({ current: i + 1, total: requestedCount });
        // Add a processing placeholder to the images list
        const processingImage: GeneratedImage = {
          id: `processing-${Date.now()}-${i}`,
          prompt: params.prompt,
          imageUrl: '',
          timestamp: new Date(),
        };
        setGeneratedImages(prev => [processingImage, ...prev]);

        // Retry logic for failed requests
        let response;
        let retryCount = 0;
        const maxRetries = 1;

        while (retryCount <= maxRetries) {
          try {
            response = await fetch('/api/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(params),
            });

            if (response.ok) {
              break; // Success, exit retry loop
            } else if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
              retryCount++;
            } else {
              break; // Max retries reached
            }
          } catch (fetchError) {
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              retryCount++;
            } else {
              throw fetchError; // Re-throw after max retries
            }
          }
        }

        if (!response!.ok) {
          throw new Error(`HTTP error! status: ${response!.status}`);
        }

        const data = await response!.json();

        if (data.success && data.imageUrl) {
          // Deduct credits based on response header if provided
          const creditHeader = response!.headers.get('X-Credit-Value');
          const creditAmount = creditHeader ? (parseInt(creditHeader, 10) || 1) : 1;
          await fetch('/api/credits', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'deduct', amount: creditAmount }),
          });

          // Update session to refresh credit balance
          await update();
          // Replace the processing placeholder with the actual image
          setGeneratedImages(prev => {
            const updated = prev.map(img =>
              img.id === processingImage.id
                ? {
                    ...img,
                    imageUrl: data.imageUrl,
                    timestamp: new Date(),
                  }
                : img
            );
            return updated;
          });

        } else {
          setError(data.error || 'Failed to generate image');
          // Remove the processing placeholder on error
          setGeneratedImages(prev => prev.filter(img => img.id !== processingImage.id));

          // Do not modify credits on failure; credits are only deducted on success
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
      setGenerationStartTime(null);
      setGenerationProgress(null);
      localStorage.removeItem('generationState');
    }
  };

  // Keyboard/lightbox logic handled by Gallery

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);

    if (!presetName) {
      // Reset to defaults if no preset selected
      setParams({
        prompt: '',
        height: 1024,
        width: 1024,
        steps: 20,
        guidance: 3.5,
        count: 1,
      });
      return;
    }

    const preset = presets.find(p => p.name === presetName);
    if (preset) {
      setParams({
        prompt: preset.prompt,
        height: preset.height,
        width: preset.width,
        steps: preset.steps,
        guidance: preset.guidance,
        count: 1,
      });
    }
  };

  const handleParamChange = (key: keyof GenerationParams, value: string | number) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Trash handling moved into Gallery; parent only updates local state via callback

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show public homepage if not logged in
  if (!session) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <h1 className="text-4xl font-bold mb-4">Welcome to Image Generator</h1>
        <p className="mb-6 max-w-xl text-center text-lg text-gray-700 dark:text-gray-300">
          Create images with AI-powered generation. Our streamlined, credit-based platform delivers consistent, high-quality results.
        </p>
        <a href="/auth/signin" className="btn btn-primary">Sign In</a>
        <a href="/auth/signup" className="btn btn-secondary mt-2">Sign Up</a>
      </main>
    );
  }

  const generationStatusLabel = getGenerationStatusMessage();

  return (
    <div className="bg-gray-50 dark:bg-gray-900 pt-16">
      <div className="w-full px-4 pt-0 pb-8">

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Form section */}
            <div className="w-full lg:w-1/4 lg:flex-shrink-0 lg:sticky lg:top-0">
              <div className="flex flex-col gap-4 p-0">
                <GeneratePanel
                  params={params}
                  presets={presets}
                  selectedPreset={selectedPreset}
                  isDebugMode={isDebugMode}
                  isGenerating={isGenerating}
                  error={error}
                  generationStatusLabel={generationStatusLabel}
                  onSubmit={handleSubmit}
                  onPresetChange={handlePresetChange}
                  onParamChange={handleParamChange}
                />
              </div>
            </div>
          {/* Gallery section */}
          <div className="w-full pb-20 lg:pb-0">
            {generatedImages.length > 0 && (
              <Gallery
                images={generatedImages}
                isDebugMode={isDebugMode}
                onRemoveImage={(id) =>
                  setGeneratedImages((prev) => prev.filter((img) => img.id !== id))
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}