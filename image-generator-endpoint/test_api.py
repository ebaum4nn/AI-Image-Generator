#!/usr/bin/env python3
"""
Test script for the FLUX.2-dev handler
"""

import json
from handler import handler

def test_handler():
    """Test the handler with sample inputs"""

    test_cases = [
        {
            "input": {
                "prompt": "A beautiful landscape with mountains and a lake at sunset",
                "height": 512,
                "width": 512,
                "num_inference_steps": 10,
                "guidance_scale": 3.5
            }
        },
        {
            "input": {
                "prompt": "A futuristic city with flying cars and neon lights",
                "height": 1024,
                "width": 1024,
                "num_inference_steps": 20,
                "guidance_scale": 7.5
            }
        }
    ]

    for i, test_case in enumerate(test_cases):
        print(f"\n--- Test Case {i+1} ---")
        print(f"Input: {json.dumps(test_case, indent=2)}")

        try:
            result = handler(test_case)
            print(f"Success: {result.get('success', False)}")
            if result.get('success'):
                print(f"Image data length: {len(result.get('image_data', ''))}")
                print(f"Model: {result.get('model')}")
                print(f"Usage: {result.get('usage')}")
            else:
                print(f"Error: {result.get('error')}")
        except Exception as e:
            print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_handler()