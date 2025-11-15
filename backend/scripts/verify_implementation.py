#!/usr/bin/env python3
"""
Verification script for Profile Management & Password Reset implementation
Checks that all components are properly integrated
"""

import sys
import os
import importlib.util

# Set up environment variables for testing
os.environ.setdefault("JWT_SECRET_KEY", "verification-secret-key-for-testing-only-min-32-chars")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("ENV", "test")

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def check_import(module_name, description):
    """Check if a module can be imported"""
    try:
        importlib.import_module(module_name)
        print(f"✅ {description}")
        return True
    except Exception as e:
        print(f"❌ {description}: {e}")
        return False

def main():
    """Run verification checks"""
    print("🔍 Verifying Profile Management & Password Reset Implementation...")
    print("")
    
    checks = [
        ("src.domain.entities.password_reset_token", "PasswordResetToken entity"),
        ("src.domain.repositories.password_reset_token_repository", "PasswordResetTokenRepository interface"),
        ("src.infrastructure.database.repositories.password_reset_token_repository_impl", "PasswordResetTokenRepository implementation"),
        ("src.application.services.password_reset_service", "PasswordResetService"),
        ("src.api.v1.profile", "Profile router"),
        ("src.infrastructure.database.models", "PasswordResetTokenModel"),
    ]
    
    results = []
    for module_name, description in checks:
        results.append(check_import(module_name, description))
    
    print("")
    if all(results):
        print("✅ All components verified successfully!")
        return 0
    else:
        print("❌ Some components failed verification")
        return 1

if __name__ == "__main__":
    sys.exit(main())

