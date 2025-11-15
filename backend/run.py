#!/usr/bin/env python3
"""
Run script for DSABA LMS
Uses new Clean Architecture implementation
"""
import uvicorn
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def main():
    """Main function to start the FastAPI server"""
    print("Starting DSABA LMS (Clean Architecture)...")
    print("Using new implementation from src/main.py")
    
    # Start the server using new main
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["./src"],
        log_level="info"
    )

if __name__ == "__main__":
    main()