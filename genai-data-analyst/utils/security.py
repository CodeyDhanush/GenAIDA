"""
Security and safe code validation utilities.
"""

import ast

DISALLOWED_MODULES = {
    'os', 'sys', 'subprocess', 'shutil', 'socket', 'urllib', 'requests',
    'builtins', 'importlib', 'pty', 'posix', 'nt', 'commands', 'platform',
    'asyncio', 'multiprocessing', 'threading'
}

DISALLOWED_FUNCTIONS = {
    'eval', 'exec', 'compile', '__import__', 'open', 'input', 'breakpoint',
    'globals', 'locals', 'getattr', 'setattr', 'delattr'
}

def is_safe_code_execution(code_str: str) -> bool:
    """
    Statically inspect Python code using AST to ensure no unsafe operations.
    Disallows imports of os, sys, subprocess, file IO, or code execution builtins.
    """
    try:
        tree = ast.parse(code_str)
        for node in ast.walk(tree):
            # Block unauthorized imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name.split('.')[0] in DISALLOWED_MODULES:
                        return False
            elif isinstance(node, ast.ImportFrom):
                if node.module and node.module.split('.')[0] in DISALLOWED_MODULES:
                    return False
            # Block unauthorized function calls
            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    if node.func.id in DISALLOWED_FUNCTIONS:
                        return False
        return True
    except SyntaxError:
        return False
