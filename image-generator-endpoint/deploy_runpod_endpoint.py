#!/usr/bin/env python3
"""
RunPod Endpoint Deployment Script
Creates or updates a RunPod serverless endpoint with HF_TOKEN environment variable
"""

import requests
import json
import time

def load_api_key():
    """Load RunPod API key from file"""
    try:
        # Try current directory first
        with open('runpod-api-key.txt', 'r') as f:
            lines = f.read().strip().split('\n')
            return lines[1] if len(lines) > 1 else lines[0]
    except FileNotFoundError:
        try:
            # Try parent directory (for separate repo setup)
            with open('../runpod-api-key.txt', 'r') as f:
                lines = f.read().strip().split('\n')
                return lines[1] if len(lines) > 1 else lines[0]
        except FileNotFoundError:
            print("❌ Error: runpod-api-key.txt file not found in current or parent directory!")
            return None

def create_or_update_endpoint(api_key, config_file='runpod-endpoint-config.json'):
    """Create or update RunPod endpoint with HF_TOKEN"""

    # Load configuration
    try:
        with open(config_file, 'r') as f:
            config = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: {config_file} not found!")
        return False

    url = "https://api.runpod.ai/graphql"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # GraphQL mutation to create endpoint
    mutation = """
    mutation CreateEndpoint($input: EndpointInput!) {
        createEndpoint(input: $input) {
            id
            name
            status
        }
    }
    """

    # Prepare endpoint input
    endpoint_input = {
        "name": config["name"],
        "template": {
            "imageName": config["imageName"],
            "env": config["env"],
            "gpuTypes": config["gpuTypes"],
            "minVram": config["minVram"],
            "containerDiskInGb": config["containerDiskInGb"],
            "volumeInGb": config["volumeInGb"],
            "ports": config["ports"],
            "maxConcurrency": config["maxConcurrency"],
            "maxRuntime": config["maxRuntime"],
            "idleTimeout": config["idleTimeout"],
            "locations": config["locations"]
        }
    }

    payload = {
        "query": mutation,
        "variables": {"input": endpoint_input}
    }

    print("🚀 Creating/updating RunPod endpoint with HF_TOKEN...")
    print(f"📝 Configuration: {json.dumps(config, indent=2)}")

    try:
        response = requests.post(url, headers=headers, json=payload)

        if response.status_code == 200:
            data = response.json()
            if 'errors' in data:
                print(f"❌ GraphQL errors: {data['errors']}")
                return False

            endpoint = data.get('data', {}).get('createEndpoint')
            if endpoint:
                print(f"✅ Endpoint created/updated successfully!")
                print(f"🆔 ID: {endpoint['id']}")
                print(f"📛 Name: {endpoint['name']}")
                print(f"📊 Status: {endpoint['status']}")
                return True
            else:
                print("❌ No endpoint data in response")
                return False
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"📄 Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error creating endpoint: {e}")
        return False

def main():
    """Main function"""
    print("🔧 RunPod Endpoint Deployment with HF_TOKEN")
    print("=" * 50)

    api_key = load_api_key()
    if not api_key:
        return

    success = create_or_update_endpoint(api_key)

    if success:
        print("\n🎉 Endpoint configured with HF_TOKEN for image generation access!")
        print("🔑 The HF_TOKEN will be injected from RUNPOD_SECRET_HuggingFaceAPI")
    else:
        print("\n❌ Failed to configure endpoint")

if __name__ == "__main__":
    main()