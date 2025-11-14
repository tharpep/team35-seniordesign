"""
Quick Test Script for Artifact Injection
Tests the injection system without requiring full RAG setup
"""

import sys
import requests

# Test data
TEST_ARTIFACTS = {
    "flashcard": {
        "artifact_type": "flashcards",
        "version": "1.0",
        "cards": [
            {
                "id": "fc_test_001",
                "front": "What is the capital of France?",
                "back": "Paris is the capital and largest city of France.",
                "tags": ["geography", "europe"],
                "difficulty": 1,
                "source_refs": ["test"],
                "hints": ["It's known as the City of Light"]
            }
        ],
        "provenance": {
            "test": {"note_id": "test_note", "similarity": 1.0}
        },
        "metrics": {
            "tokens_in": 50,
            "tokens_out": 30,
            "latency_ms": 100
        }
    },
    "mcq": {
        "artifact_type": "mcq",
        "version": "1.0",
        "questions": [
            {
                "id": "mcq_test_001",
                "stem": "What is 2 + 2?",
                "options": ["3", "4", "5", "6"],
                "answer_index": 1,
                "rationale": "2 + 2 equals 4 through basic arithmetic addition.",
                "bloom_level": "remember",
                "source_refs": ["test"]
            }
        ],
        "provenance": {
            "test": {"note_id": "test_note", "similarity": 1.0}
        },
        "metrics": {
            "tokens_in": 60,
            "tokens_out": 40,
            "latency_ms": 120
        }
    },
    "insight": {
        "artifact_type": "insights",
        "version": "1.0",
        "insights": [
            {
                "id": "ins_test_001",
                "title": "Focus and Productivity",
                "takeaway": "Taking regular breaks improves focus and retention during study sessions."
            }
        ],
        "provenance": {
            "test": {"note_id": "test_note", "similarity": 1.0}
        },
        "metrics": {
            "tokens_in": 40,
            "tokens_out": 25,
            "latency_ms": 90
        }
    }
}


def test_backend_health(backend_url):
    """Test if backend is running"""
    print("🔍 Testing backend health...")
    try:
        response = requests.get(f"{backend_url}/api/health", timeout=5)
        if response.status_code == 200:
            print(f"   ✓ Backend is healthy at {backend_url}")
            return True
        else:
            print(f"   ✗ Backend returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"   ✗ Cannot connect to backend at {backend_url}")
        print("   Make sure the server is running:")
        print("     cd webapp/backend")
        print("     npm start")
        return False
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        return False


def test_artifact_injection(backend_url, artifact_type, artifact_data, session_id=None):
    """Test injecting a single artifact"""
    print(f"\n📦 Testing {artifact_type.upper()} injection...")
    
    try:
        payload = {
            "artifact": artifact_data,
            "session_id": session_id
        }
        
        response = requests.post(
            f"{backend_url}/api/materials/inject",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 201:
            result = response.json()
            material = result.get('material', {})
            print(f"   ✓ Success!")
            print(f"   - Artifact ID: {material.get('id')}")
            print(f"   - Session ID: {material.get('session_id')}")
            print(f"   - Type: {material.get('type')}")
            print(f"   - Title: {material.get('title', '')[:60]}...")
            return True
        else:
            error = response.json()
            print(f"   ✗ Failed with status {response.status_code}")
            print(f"   - Error: {error.get('message', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"   ✗ Exception: {str(e)}")
        return False


def run_tests(backend_url="http://localhost:3001", session_id=None):
    """Run all injection tests"""
    print("=" * 70)
    print("  ARTIFACT INJECTION TEST SUITE")
    print("=" * 70)
    print()
    print(f"Backend URL: {backend_url}")
    if session_id:
        print(f"Target Session: {session_id}")
    else:
        print("Target Session: Most recent (auto-selected)")
    print()
    
    # Test 1: Backend health
    if not test_backend_health(backend_url):
        print("\n❌ Backend health check failed. Cannot proceed with tests.")
        return False
    
    # Test 2: Inject each artifact type
    results = {}
    for artifact_type, artifact_data in TEST_ARTIFACTS.items():
        success = test_artifact_injection(backend_url, artifact_type, artifact_data, session_id)
        results[artifact_type] = success
    
    # Summary
    print("\n" + "=" * 70)
    print("  TEST SUMMARY")
    print("=" * 70)
    print()
    
    total = len(results)
    passed = sum(1 for success in results.values() if success)
    failed = total - passed
    
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print()
    
    for artifact_type, success in results.items():
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"   {status} - {artifact_type}")
    
    print()
    
    if passed == total:
        print("✅ All tests passed!")
        print()
        print("💡 Next steps:")
        print("   1. Check database: SELECT * FROM study_artifacts ORDER BY created_at DESC LIMIT 3;")
        print("   2. Open webapp frontend to see injected artifacts")
        print("   3. Try the full demo: python src/demos/injection_demo.py")
        return True
    else:
        print("❌ Some tests failed. Check the output above for details.")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Test artifact injection system')
    parser.add_argument('--backend-url', default='http://localhost:3001', help='Backend URL')
    parser.add_argument('--session-id', type=int, help='Session ID to inject into')
    
    args = parser.parse_args()
    
    success = run_tests(args.backend_url, args.session_id)
    sys.exit(0 if success else 1)
