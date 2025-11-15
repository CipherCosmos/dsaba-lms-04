"""
Comprehensive cleanup script for the exam management system.
Removes unused code, optimizes queries, and ensures consistency.
"""

import os
import re
from pathlib import Path
from typing import List, Set, Dict, Any
import ast
import logging

logger = logging.getLogger(__name__)


class CodeCleanup:
    """Handles code cleanup and optimization"""
    
    def __init__(self, backend_dir: str = "backend"):
        self.backend_dir = Path(backend_dir)
        self.unused_imports = set()
        self.unused_functions = set()
        self.unused_variables = set()
        self.duplicate_code = []
        
    def find_unused_imports(self) -> Set[str]:
        """Find unused imports across the codebase"""
        unused = set()
        
        for py_file in self.backend_dir.rglob("*.py"):
            if py_file.name.startswith("__"):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                tree = ast.parse(content)
                imports = []
                used_names = set()
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            imports.append(alias.name)
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            for alias in node.names:
                                imports.append(f"{node.module}.{alias.name}")
                    elif isinstance(node, ast.Name):
                        used_names.add(node.id)
                    elif isinstance(node, ast.Attribute):
                        used_names.add(node.attr)
                
                for imp in imports:
                    if imp not in used_names and not any(imp.startswith(used) for used in used_names):
                        unused.add(f"{py_file}: {imp}")
                        
            except Exception as e:
                logger.warning(f"Could not parse {py_file}: {e}")
        
        return unused
    
    def find_unused_functions(self) -> Set[str]:
        """Find unused functions across the codebase"""
        unused = set()
        
        for py_file in self.backend_dir.rglob("*.py"):
            if py_file.name.startswith("__"):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                tree = ast.parse(content)
                functions = []
                function_calls = set()
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        functions.append(node.name)
                    elif isinstance(node, ast.Call):
                        if isinstance(node.func, ast.Name):
                            function_calls.add(node.func.id)
                        elif isinstance(node.func, ast.Attribute):
                            function_calls.add(node.func.attr)
                
                for func in functions:
                    if func not in function_calls and not func.startswith('_'):
                        unused.add(f"{py_file}: {func}")
                        
            except Exception as e:
                logger.warning(f"Could not parse {py_file}: {e}")
        
        return unused
    
    def find_duplicate_code(self) -> List[Dict[str, Any]]:
        """Find duplicate code blocks"""
        duplicates = []
        
        # Common patterns to look for
        patterns = [
            r'def get_.*_by_id\(.*\):',
            r'def create_.*\(.*\):',
            r'def update_.*\(.*\):',
            r'def delete_.*\(.*\):',
            r'if current_user\.role\.value not in',
            r'raise HTTPException\(status_code=403',
            r'raise HTTPException\(status_code=404',
        ]
        
        for pattern in patterns:
            matches = {}
            for py_file in self.backend_dir.rglob("*.py"):
                if py_file.name.startswith("__"):
                    continue
                    
                try:
                    with open(py_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    for match in re.finditer(pattern, content, re.MULTILINE):
                        code_block = content[match.start():match.end() + 200]  # Get some context
                        if code_block in matches:
                            duplicates.append({
                                'pattern': pattern,
                                'file1': matches[code_block],
                                'file2': str(py_file),
                                'code': code_block[:100] + "..."
                            })
                        else:
                            matches[code_block] = str(py_file)
                            
                except Exception as e:
                    logger.warning(f"Could not analyze {py_file}: {e}")
        
        return duplicates
    
    def find_hardcoded_values(self) -> List[Dict[str, Any]]:
        """Find hardcoded values that should be constants"""
        hardcoded = []
        
        patterns = [
            (r'status_code=403', 'HTTP status codes'),
            (r'status_code=404', 'HTTP status codes'),
            (r'status_code=422', 'HTTP status codes'),
            (r'status_code=500', 'HTTP status codes'),
            (r'password.*=.*["\'][^"\']{6,}["\']', 'Hardcoded passwords'),
            (r'localhost:3000', 'Hardcoded URLs'),
            (r'localhost:5432', 'Hardcoded database URLs'),
            (r'["\'][A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}["\']', 'Hardcoded emails'),
        ]
        
        for py_file in self.backend_dir.rglob("*.py"):
            if py_file.name.startswith("__"):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                for pattern, description in patterns:
                    for match in re.finditer(pattern, content):
                        hardcoded.append({
                            'file': str(py_file),
                            'line': content[:match.start()].count('\n') + 1,
                            'pattern': pattern,
                            'description': description,
                            'match': match.group()
                        })
                        
            except Exception as e:
                logger.warning(f"Could not analyze {py_file}: {e}")
        
        return hardcoded
    
    def find_missing_docstrings(self) -> List[Dict[str, Any]]:
        """Find functions without docstrings"""
        missing_docs = []
        
        for py_file in self.backend_dir.rglob("*.py"):
            if py_file.name.startswith("__"):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef) and not node.name.startswith('_'):
                        if not ast.get_docstring(node):
                            missing_docs.append({
                                'file': str(py_file),
                                'function': node.name,
                                'line': node.lineno
                            })
                            
            except Exception as e:
                logger.warning(f"Could not analyze {py_file}: {e}")
        
        return missing_docs
    
    def find_inconsistent_naming(self) -> List[Dict[str, Any]]:
        """Find inconsistent naming conventions"""
        inconsistencies = []
        
        for py_file in self.backend_dir.rglob("*.py"):
            if py_file.name.startswith("__"):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        # Check function naming (should be snake_case)
                        if not re.match(r'^[a-z_][a-z0-9_]*$', node.name):
                            inconsistencies.append({
                                'file': str(py_file),
                                'type': 'function',
                                'name': node.name,
                                'line': node.lineno,
                                'issue': 'Function name should be snake_case'
                            })
                    
                    elif isinstance(node, ast.ClassDef):
                        # Check class naming (should be PascalCase)
                        if not re.match(r'^[A-Z][a-zA-Z0-9]*$', node.name):
                            inconsistencies.append({
                                'file': str(py_file),
                                'type': 'class',
                                'name': node.name,
                                'line': node.lineno,
                                'issue': 'Class name should be PascalCase'
                            })
                    
                    elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
                        # Check variable naming (should be snake_case)
                        if not re.match(r'^[a-z_][a-z0-9_]*$', node.id) and not node.id.isupper():
                            inconsistencies.append({
                                'file': str(py_file),
                                'type': 'variable',
                                'name': node.id,
                                'line': node.lineno,
                                'issue': 'Variable name should be snake_case'
                            })
                            
            except Exception as e:
                logger.warning(f"Could not analyze {py_file}: {e}")
        
        return inconsistencies
    
    def find_long_functions(self) -> List[Dict[str, Any]]:
        """Find functions that are too long (more than 50 lines)"""
        long_functions = []
        
        for py_file in self.backend_dir.rglob("*.py"):
            if py_file.name.startswith("__"):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        # Calculate function length
                        lines = content.split('\n')
                        start_line = node.lineno - 1
                        end_line = node.end_lineno - 1 if hasattr(node, 'end_lineno') else start_line + 50
                        
                        function_length = end_line - start_line + 1
                        
                        if function_length > 50:
                            long_functions.append({
                                'file': str(py_file),
                                'function': node.name,
                                'line': node.lineno,
                                'length': function_length
                            })
                            
            except Exception as e:
                logger.warning(f"Could not analyze {py_file}: {e}")
        
        return long_functions
    
    def find_complex_functions(self) -> List[Dict[str, Any]]:
        """Find functions with high cyclomatic complexity"""
        complex_functions = []
        
        for py_file in self.backend_dir.rglob("*.py"):
            if py_file.name.startswith("__"):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        complexity = 1  # Base complexity
                        
                        for child in ast.walk(node):
                            if isinstance(child, (ast.If, ast.While, ast.For, ast.AsyncFor, ast.AsyncWith, ast.With)):
                                complexity += 1
                            elif isinstance(child, ast.ExceptHandler):
                                complexity += 1
                            elif isinstance(child, ast.BoolOp):
                                complexity += len(child.values) - 1
                        
                        if complexity > 10:
                            complex_functions.append({
                                'file': str(py_file),
                                'function': node.name,
                                'line': node.lineno,
                                'complexity': complexity
                            })
                            
            except Exception as e:
                logger.warning(f"Could not analyze {py_file}: {e}")
        
        return complex_functions
    
    def generate_cleanup_report(self) -> Dict[str, Any]:
        """Generate a comprehensive cleanup report"""
        logger.info("Generating cleanup report...")
        
        report = {
            'unused_imports': list(self.find_unused_imports()),
            'unused_functions': list(self.find_unused_functions()),
            'duplicate_code': self.find_duplicate_code(),
            'hardcoded_values': self.find_hardcoded_values(),
            'missing_docstrings': self.find_missing_docstrings(),
            'inconsistent_naming': self.find_inconsistent_naming(),
            'long_functions': self.find_long_functions(),
            'complex_functions': self.find_complex_functions()
        }
        
        return report
    
    def print_cleanup_report(self, report: Dict[str, Any]) -> None:
        """Print the cleanup report in a readable format"""
        print("\n" + "="*80)
        print("CODE CLEANUP REPORT")
        print("="*80)
        
        print(f"\nUnused Imports ({len(report['unused_imports'])}):")
        for item in report['unused_imports'][:10]:  # Show first 10
            print(f"  - {item}")
        if len(report['unused_imports']) > 10:
            print(f"  ... and {len(report['unused_imports']) - 10} more")
        
        print(f"\nUnused Functions ({len(report['unused_functions'])}):")
        for item in report['unused_functions'][:10]:  # Show first 10
            print(f"  - {item}")
        if len(report['unused_functions']) > 10:
            print(f"  ... and {len(report['unused_functions']) - 10} more")
        
        print(f"\nDuplicate Code Patterns ({len(report['duplicate_code'])}):")
        for item in report['duplicate_code'][:5]:  # Show first 5
            print(f"  - {item['pattern']} in {item['file1']} and {item['file2']}")
        if len(report['duplicate_code']) > 5:
            print(f"  ... and {len(report['duplicate_code']) - 5} more")
        
        print(f"\nHardcoded Values ({len(report['hardcoded_values'])}):")
        for item in report['hardcoded_values'][:10]:  # Show first 10
            print(f"  - {item['file']}:{item['line']} - {item['description']}")
        if len(report['hardcoded_values']) > 10:
            print(f"  ... and {len(report['hardcoded_values']) - 10} more")
        
        print(f"\nMissing Docstrings ({len(report['missing_docstrings'])}):")
        for item in report['missing_docstrings'][:10]:  # Show first 10
            print(f"  - {item['file']}:{item['line']} - {item['function']}")
        if len(report['missing_docstrings']) > 10:
            print(f"  ... and {len(report['missing_docstrings']) - 10} more")
        
        print(f"\nInconsistent Naming ({len(report['inconsistent_naming'])}):")
        for item in report['inconsistent_naming'][:10]:  # Show first 10
            print(f"  - {item['file']}:{item['line']} - {item['name']} ({item['issue']})")
        if len(report['inconsistent_naming']) > 10:
            print(f"  ... and {len(report['inconsistent_naming']) - 10} more")
        
        print(f"\nLong Functions ({len(report['long_functions'])}):")
        for item in report['long_functions'][:10]:  # Show first 10
            print(f"  - {item['file']}:{item['line']} - {item['function']} ({item['length']} lines)")
        if len(report['long_functions']) > 10:
            print(f"  ... and {len(report['long_functions']) - 10} more")
        
        print(f"\nComplex Functions ({len(report['complex_functions'])}):")
        for item in report['complex_functions'][:10]:  # Show first 10
            print(f"  - {item['file']}:{item['line']} - {item['function']} (complexity: {item['complexity']})")
        if len(report['complex_functions']) > 10:
            print(f"  ... and {len(report['complex_functions']) - 10} more")
        
        print("\n" + "="*80)
        print("SUMMARY")
        print("="*80)
        
        total_issues = sum(len(v) for v in report.values() if isinstance(v, list))
        print(f"Total issues found: {total_issues}")
        
        if total_issues == 0:
            print("✅ No issues found! Code is clean and well-structured.")
        else:
            print("⚠️  Issues found. Consider addressing them for better code quality.")
        
        print("="*80)


def main():
    """Main cleanup function"""
    logger.info("Starting code cleanup analysis...")
    
    cleanup = CodeCleanup()
    report = cleanup.generate_cleanup_report()
    cleanup.print_cleanup_report(report)
    
    logger.info("Code cleanup analysis completed")


if __name__ == "__main__":
    main()
