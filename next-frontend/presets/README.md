# Image Generation Presets

This folder contains preset recipes for image generation. Each preset is a JSON file that defines a specific generation configuration.

## Preset Format

Each preset file should be a valid JSON file with the following structure:

```json
{
  "name": "Preset Display Name",
  "description": "Brief description of what this preset does",
  "prompt": "The text prompt for image generation",
  "height": 1024,
  "width": 1024,
  "steps": 20,
  "guidance": 3.5
}
```

## Field Descriptions

- **name**: Display name shown in the dropdown (required)
- **description**: Short description of the preset (required)
- **prompt**: Text prompt for image generation (required)
- **height**: Image height in pixels (256-2048, multiple of 16) (required)
- **width**: Image width in pixels (256-2048, multiple of 16) (required)
- **steps**: Number of inference steps (1-50) (required)
- **guidance**: Guidance scale (1.0-20.0) (required)

## File Naming

Use descriptive filenames with the `.json` extension:
- `sample-preset.json`

## Usage

Presets are automatically loaded when the application starts. Select a preset from the dropdown to load its settings into the form. You can then modify individual parameters or use the preset as-is.

## Examples

See `sample-preset.json` for an example of a basic generation configuration.