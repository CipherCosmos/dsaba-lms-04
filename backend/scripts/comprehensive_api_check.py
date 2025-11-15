#!/usr/bin/env python3
"""
Comprehensive API Endpoint and Data Structure Checker
Checks for mismatches between frontend API calls and backend endpoints
"""

import sys
import os
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Add app directory to path
app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

def find_backend_endpoints() -> Dict[str, List[Dict]]:
    """Find all backend API endpoints"""
    endpoints = {}
    api_dir = Path(app_dir) / "src" / "api" / "v1"
    
    for file in api_dir.glob("*.py"):
        if file.name == "__init__.py":
            continue
            
        with open(file, 'r') as f:
            content = f.read()
            
        # Find router prefix
        prefix_match = re.search(r'router\s*=\s*APIRouter\([^)]*prefix\s*=\s*["\']([^"\']+)["\']', content)
        prefix = prefix_match.group(1) if prefix_match else ""
        
        # Find all route decorators
        route_pattern = r'@router\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\']'
        matches = re.finditer(route_pattern, content)
        
        for match in matches:
            method = match.group(1).upper()
            path = match.group(2)
            full_path = f"/{prefix}{path}".replace("//", "/")
            
            if full_path not in endpoints:
                endpoints[full_path] = []
            endpoints[full_path].append({
                "method": method,
                "file": file.name,
                "path": full_path
            })
    
    return endpoints

def find_frontend_api_calls() -> Dict[str, List[Dict]]:
    """Find all frontend API calls"""
    api_calls = {}
    frontend_dir = Path(app_dir).parent / "frontend" / "src" / "services"
    api_file = frontend_dir / "api.ts"
    
    if not api_file.exists():
        return {}
    
    with open(api_file, 'r') as f:
        content = f.read()
    
    # Find apiClient calls
    patterns = [
        (r'apiClient\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\']', "direct"),
        (r'apiClient\.(get|post|put|delete|patch)\s*\(\s*`([^`]+)`', "template"),
    ]
    
    for pattern, ptype in patterns:
        matches = re.finditer(pattern, content)
        for match in matches:
            method = match.group(1).upper()
            path = match.group(2)
            
            # Handle template strings
            if ptype == "template":
                path = re.sub(r'\$\{[^}]+\}', '{}', path)
            
            if path not in api_calls:
                api_calls[path] = []
            api_calls[path].append({
                "method": method,
                "type": ptype
            })
    
    return api_calls

def check_mismatches():
    """Check for mismatches between frontend and backend"""
    print("=" * 80)
    print("COMPREHENSIVE API ENDPOINT CHECK")
    print("=" * 80)
    
    backend_endpoints = find_backend_endpoints()
    frontend_calls = find_frontend_api_calls()
    
    print(f"\n📊 Statistics:")
    print(f"   Backend endpoints: {sum(len(v) for v in backend_endpoints.values())}")
    print(f"   Frontend API calls: {sum(len(v) for v in frontend_calls.values())}")
    
    # Check for frontend calls without backend endpoints
    print("\n🔍 Checking for frontend calls without matching backend endpoints...")
    missing_backend = []
    
    for path, calls in frontend_calls.items():
        for call in calls:
            method = call["method"]
            # Try to find matching backend endpoint
            found = False
            for backend_path, backend_routes in backend_endpoints.items():
                # Normalize paths for comparison
                normalized_frontend = path.replace('{', '').replace('}', '').replace('${', '').replace('}', '')
                normalized_backend = backend_path.replace('{', '').replace('}', '')
                
                # Check if paths match (allowing for parameter differences)
                if normalized_frontend == normalized_backend or \
                   (normalized_frontend in normalized_backend or normalized_backend in normalized_frontend):
                    # Check method
                    if any(r["method"] == method for r in backend_routes):
                        found = True
                        break
            
            if not found:
                missing_backend.append({
                    "path": path,
                    "method": method,
                    "type": call["type"]
                })
    
    if missing_backend:
        print(f"   ⚠️  Found {len(missing_backend)} frontend calls without matching backend endpoints:")
        for item in missing_backend[:20]:  # Show first 20
            print(f"      {item['method']} {item['path']}")
        if len(missing_backend) > 20:
            print(f"      ... and {len(missing_backend) - 20} more")
    else:
        print("   ✅ All frontend calls have matching backend endpoints")
    
    # Check for backend endpoints without frontend calls
    print("\n🔍 Checking for backend endpoints without frontend calls...")
    unused_backend = []
    
    for path, routes in backend_endpoints.items():
        for route in routes:
            method = route["method"]
            found = False
            
            for frontend_path, calls in frontend_calls.items():
                normalized_frontend = frontend_path.replace('{', '').replace('}', '').replace('${', '').replace('}', '')
                normalized_backend = path.replace('{', '').replace('}', '')
                
                if normalized_frontend == normalized_backend or \
                   (normalized_frontend in normalized_backend or normalized_backend in normalized_frontend):
                    if any(c["method"] == method for c in calls):
                        found = True
                        break
            
            if not found:
                unused_backend.append({
                    "path": path,
                    "method": method,
                    "file": route["file"]
                })
    
    if unused_backend:
        print(f"   ℹ️  Found {len(unused_backend)} backend endpoints without frontend calls:")
        for item in unused_backend[:20]:  # Show first 20
            print(f"      {item['method']} {item['path']} ({item['file']})")
        if len(unused_backend) > 20:
            print(f"      ... and {len(unused_backend) - 20} more")
    else:
        print("   ✅ All backend endpoints have frontend calls")
    
    return {
        "missing_backend": missing_backend,
        "unused_backend": unused_backend,
        "backend_count": sum(len(v) for v in backend_endpoints.values()),
        "frontend_count": sum(len(v) for v in frontend_calls.values())
    }

if __name__ == "__main__":
    try:
        results = check_mismatches()
        print("\n" + "=" * 80)
        print("✅ Check complete!")
        print("=" * 80)
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error during check: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

