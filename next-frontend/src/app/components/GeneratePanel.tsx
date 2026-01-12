'use client';

import React from 'react';

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

interface GeneratePanelProps {
  params: GenerationParams;
  presets: Preset[];
  selectedPreset: string;
  isDebugMode: boolean;
  isGenerating: boolean;
  error?: string;
  generationStatusLabel: string;
  onSubmit: (e: React.FormEvent) => void;
  onPresetChange: (presetName: string) => void;
  onParamChange: (key: keyof GenerationParams, value: string | number) => void;
}

export default function GeneratePanel({
  params,
  presets,
  selectedPreset,
  isDebugMode,
  isGenerating,
  error,
  generationStatusLabel,
  onSubmit,
  onPresetChange,
  onParamChange,
}: GeneratePanelProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 pt-8 lg:h-full">
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label htmlFor="preset" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preset Recipe (Optional)
          </label>
          <select
            id="preset"
            value={selectedPreset}
            onChange={(e) => onPresetChange(e.target.value)}
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Custom Settings</option>
            {presets.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name} - {preset.description}
              </option>
            ))}
          </select>
          {selectedPreset && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Preset loaded: {selectedPreset}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Prompt
          </label>
          <textarea
            id="prompt"
            value={params.prompt}
            onChange={(e) => onParamChange('prompt', e.target.value)}
            placeholder="Describe the image you want to generate..."
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            required
          />
        </div>

        <div>
          <label htmlFor="count" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number of Images
          </label>
          <input
            type="number"
            id="count"
            value={params.count}
            onChange={(e) => onParamChange('count', Math.max(1, parseInt(e.target.value || '1')))}
            min="1"
            max="10"
            step="1"
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Each image costs 1 credit.</p>
        </div>

        {isDebugMode && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="width" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Width
              </label>
              <input
                type="number"
                id="width"
                value={params.width}
                onChange={(e) => onParamChange('width', parseInt(e.target.value))}
                min="256"
                max="2048"
                step="16"
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="height" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Height
              </label>
              <input
                type="number"
                id="height"
                value={params.height}
                onChange={(e) => onParamChange('height', parseInt(e.target.value))}
                min="256"
                max="2048"
                step="16"
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="steps" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Steps
              </label>
              <input
                type="number"
                id="steps"
                value={params.steps}
                onChange={(e) => onParamChange('steps', parseInt(e.target.value))}
                min="1"
                max="50"
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="guidance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Guidance
              </label>
              <input
                type="number"
                id="guidance"
                value={params.guidance}
                onChange={(e) => onParamChange('guidance', parseFloat(e.target.value))}
                min="1.0"
                max="20.0"
                step="0.1"
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isGenerating}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {isGenerating ? generationStatusLabel : 'Generate'}
        </button>
      </form>
    </div>
  );
}
