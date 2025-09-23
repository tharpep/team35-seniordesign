"""
Simple Purdue GenAI Studio API Client
Basic chat functionality for testing and verification
"""

import json
import urllib.request
import urllib.error


class PurdueGenAI:
    """Simple client for Purdue GenAI Studio"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://genai.rcac.purdue.edu/api/chat/completions"
    
    def chat(self, message: str, model: str = "llama3.1:latest") -> str:
        """
        Send a message and get a response
        
        Args:
            message: Your message to the AI
            model: Model to use (default: llama3.1:latest)
            
        Returns:
            str: AI response
            
        Raises:
            Exception: If API call fails
        """
        try:
            # Prepare request
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            body = {
                "model": model,
                "messages": [{"role": "user", "content": message}],
                "stream": False
            }
            
            # Make request
            data = json.dumps(body).encode('utf-8')
            req = urllib.request.Request(self.base_url, data=data, headers=headers, method='POST')
            
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    response_data = json.loads(response.read().decode('utf-8'))
                    return response_data["choices"][0]["message"]["content"]
                else:
                    error_text = response.read().decode('utf-8')
                    raise Exception(f"API Error {response.status}: {error_text}")
                    
        except urllib.error.HTTPError as e:
            error_text = e.read().decode('utf-8') if hasattr(e, 'read') else str(e)
            raise Exception(f"HTTP Error {e.code}: {error_text}")
        except Exception as e:
            raise Exception(f"Error calling Purdue GenAI: {str(e)}")


# Example usage
if __name__ == "__main__":
    # Replace with your actual API key
    api_key = "your-api-key-here"
    
    client = PurdueGenAI(api_key)
    
    try:
        response = client.chat("Hello! What is your name?")
        print(f"AI Response: {response}")
    except Exception as e:
        print(f"Error: {e}")