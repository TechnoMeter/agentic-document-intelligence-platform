#!/usr/bin/env python
"""
Run all tests (unit + integration) using pytest.
Requires the server to be running on port 8000.
"""

import subprocess
import sys
import requests
import time

BASE_URL = "http://localhost:8000"

def check_server():
    try:
        r = requests.get(f"{BASE_URL}/ping", timeout=2)
        return r.status_code == 200
    except:
        return False

def main():
    print("🔍 Checking if server is running...")
    if not check_server():
        print("❌ Server not running on port 8000.")
        print("   Start it with: uvicorn main:app --reload --host 0.0.0.0 --port 8000")
        sys.exit(1)
    print("✅ Server is running.")

    print("\n🧪 Running tests...")
    result = subprocess.run([sys.executable, "-m", "pytest", "tests/", "-v"])
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()