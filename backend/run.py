#!/usr/bin/env python3
import uvicorn
import os
from database import engine, Base
from init_db import init_database
from seed_data import create_seed_data

def main():
    """Main function to start the FastAPI server"""
    # Create database tables
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Initialize with basic data
    print("Initializing database...")
    init_database()
    
    # Add seed data
    print("Adding seed data...")
    create_seed_data()
    
    # Start the server
    print("Starting FastAPI server...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["./"],
        log_level="info"
    )

if __name__ == "__main__":
    main()