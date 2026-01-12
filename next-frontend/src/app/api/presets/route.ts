import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

export interface Preset {
  name: string;
  description: string;
  prompt: string;
  height: number;
  width: number;
  steps: number;
  guidance: number;
}

export async function GET() {
  try {
    const presetsDir = path.join(process.cwd(), 'presets');

    // Read all JSON files from the presets directory
    const files = await readdir(presetsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    const presets: Preset[] = [];

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(presetsDir, file);
        const content = await readFile(filePath, 'utf-8');
        const preset: Preset = JSON.parse(content);
        presets.push(preset);
      } catch (error) {
        console.error(`Error loading preset ${file}:`, error);
        // Continue with other presets if one fails
      }
    }

    // Sort presets by name
    presets.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      presets
    });

  } catch (error) {
    console.error('Error loading presets:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load presets',
        presets: []
      },
      { status: 500 }
    );
  }
}