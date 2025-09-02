#!/usr/bin/env python3
"""
TypeScript type checking hook for Claude Code.
Automatically checks TypeScript files for type errors after modification.
"""

import sys
import os
import subprocess
import shutil
import json
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# Add parent 'hooks' directory to Python path to find 'common.py'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common import (
    get_hook_data,
    exit_success,
    exit_with_error,
    is_dry_run,
    logger,
    get_file_paths_from_tool_input,
    EXIT_GENERAL_ERROR,
    EXIT_POLICY_VIOLATION
)


# TypeScript file extensions to check
TYPESCRIPT_EXTENSIONS = {'.ts', '.tsx', '.mts', '.cts'}


def find_tsconfig(project_dir: str) -> Optional[str]:
    """
    Find the appropriate tsconfig.json file for the project.
    
    Args:
        project_dir: The project root directory
    
    Returns:
        Path to tsconfig.json if found, None otherwise
    """
    # Check common locations
    possible_configs = [
        os.path.join(project_dir, 'tsconfig.json'),
        os.path.join(project_dir, 'apps', 'extension', 'tsconfig.json'),
        os.path.join(project_dir, 'packages', 'tsconfig.json'),
    ]
    
    for config_path in possible_configs:
        if os.path.exists(config_path):
            logger.debug(f"Found tsconfig at: {config_path}")
            return config_path
    
    # Try to find any tsconfig.json in the project
    try:
        result = subprocess.run(
            ['find', project_dir, '-name', 'tsconfig.json', '-type', 'f'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            configs = result.stdout.strip().split('\n')
            # Prefer the one closest to root
            configs.sort(key=lambda x: x.count(os.sep))
            logger.debug(f"Found tsconfig at: {configs[0]}")
            return configs[0]
    except (subprocess.TimeoutExpired, subprocess.SubprocessError):
        pass
    
    return None


def check_typescript_availability() -> Tuple[bool, str]:
    """
    Check if TypeScript compiler is available.
    
    Returns:
        Tuple of (is_available, command_to_use)
    """
    project_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())
    
    # First check for npm/npx in the project (preferred)
    if shutil.which("npx"):
        # Check if TypeScript is available via npx
        try:
            result = subprocess.run(
                ["npx", "--no-install", "tsc", "--version"],
                capture_output=True,
                text=True,
                timeout=5,
                cwd=project_dir
            )
            if result.returncode == 0:
                logger.debug(f"Found TypeScript via npx: {result.stdout.strip()}")
                return True, "npx tsc"
        except (subprocess.TimeoutExpired, subprocess.SubprocessError):
            pass
    
    # Check for global tsc installation
    if shutil.which("tsc"):
        logger.debug("Found global TypeScript installation")
        return True, "tsc"
    
    return False, ""


def should_check_file(file_path: str) -> bool:
    """
    Check if a file should be type-checked.
    
    Args:
        file_path: Path to the file
    
    Returns:
        True if the file should be checked, False otherwise
    """
    if not file_path:
        return False
    
    path = Path(file_path)
    
    # Check if it's a TypeScript file
    if path.suffix.lower() not in TYPESCRIPT_EXTENSIONS:
        return False
    
    # Skip declaration files
    if path.name.endswith('.d.ts'):
        return False
    
    # Skip test files if desired (optional)
    # if '.test.' in path.name or '.spec.' in path.name:
    #     return False
    
    # Skip node_modules
    if 'node_modules' in path.parts:
        return False
    
    return True


def parse_tsc_output(output: str) -> List[Dict[str, Any]]:
    """
    Parse TypeScript compiler output to extract errors.
    
    Args:
        output: Raw output from tsc command
    
    Returns:
        List of parsed error dictionaries
    """
    errors = []
    
    # TypeScript error format: file(line,column): error TS1234: message
    error_pattern = r'^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$'
    
    for line in output.split('\n'):
        match = re.match(error_pattern, line.strip())
        if match:
            errors.append({
                'file': match.group(1),
                'line': int(match.group(2)),
                'column': int(match.group(3)),
                'code': match.group(4),
                'message': match.group(5)
            })
    
    return errors


def format_errors_for_claude(errors: List[Dict[str, Any]]) -> str:
    """
    Format TypeScript errors in a clear way for Claude to understand.
    
    Args:
        errors: List of error dictionaries
    
    Returns:
        Formatted error message
    """
    if not errors:
        return ""
    
    # Group errors by file
    errors_by_file = {}
    for error in errors:
        file = error['file']
        if file not in errors_by_file:
            errors_by_file[file] = []
        errors_by_file[file].append(error)
    
    messages = ["TypeScript type errors found:"]
    
    for file, file_errors in errors_by_file.items():
        messages.append(f"\n{file}:")
        for error in file_errors:
            messages.append(f"  Line {error['line']}, Column {error['column']}: {error['code']}")
            messages.append(f"    {error['message']}")
    
    messages.append("\nPlease fix these type errors before continuing.")
    
    return '\n'.join(messages)


def run_type_check(files: List[str], project_dir: str) -> Tuple[bool, str]:
    """
    Run TypeScript type checking on specified files.
    
    Args:
        files: List of file paths to check
        project_dir: Project root directory
    
    Returns:
        Tuple of (has_errors, error_message)
    """
    # Find tsconfig
    tsconfig_path = find_tsconfig(project_dir)
    
    # Check TypeScript availability
    tsc_available, tsc_command = check_typescript_availability()
    if not tsc_available:
        logger.warning("TypeScript compiler not found, skipping type check")
        return False, ""
    
    # Build the TypeScript command
    cmd_parts = tsc_command.split()
    cmd_parts.extend(['--noEmit', '--skipLibCheck'])
    
    if tsconfig_path:
        # Get the directory containing tsconfig
        tsconfig_dir = os.path.dirname(tsconfig_path)
        cmd_parts.extend(['--project', tsconfig_path])
        
        # Make file paths relative to tsconfig directory for better error messages
        relative_files = []
        for file in files:
            try:
                rel_path = os.path.relpath(file, tsconfig_dir)
                relative_files.append(rel_path)
            except ValueError:
                # File is on different drive or can't be made relative
                relative_files.append(file)
        
        # Add the specific files to check
        cmd_parts.extend(relative_files)
        working_dir = tsconfig_dir
    else:
        # No tsconfig found, use basic checking
        cmd_parts.extend(['--allowJs', '--checkJs'])
        cmd_parts.extend(files)
        working_dir = project_dir
    
    logger.debug(f"Running command: {' '.join(cmd_parts)}")
    logger.debug(f"Working directory: {working_dir}")
    
    try:
        # Run TypeScript compiler
        result = subprocess.run(
            cmd_parts,
            capture_output=True,
            text=True,
            cwd=working_dir,
            timeout=15
        )
        
        # TypeScript returns non-zero exit code when there are errors
        if result.returncode != 0:
            errors = parse_tsc_output(result.stdout)
            if errors:
                error_message = format_errors_for_claude(errors)
                logger.info(f"Found {len(errors)} TypeScript error(s)")
                return True, error_message
            elif result.stderr:
                # Compilation error (not type error)
                logger.warning(f"TypeScript compilation issue: {result.stderr}")
                return False, ""
        
        logger.info("TypeScript type check passed")
        return False, ""
        
    except subprocess.TimeoutExpired:
        logger.error("TypeScript check timed out")
        return False, ""
    except subprocess.SubprocessError as e:
        logger.error(f"Error running TypeScript: {e}")
        return False, ""


def main():
    """Main entry point for the TypeScript checking hook."""
    try:
        # Get hook data
        hook_data = get_hook_data()
        
        # Check if this is a dry run
        if is_dry_run():
            logger.info("Dry run mode - skipping type check")
            exit_success()
        
        # Get the tool name and input
        tool_name = hook_data.get('tool_name', '')
        tool_input = hook_data.get('tool_input', {})
        
        # Only process Edit, MultiEdit, and Write tools
        if tool_name not in ['Edit', 'MultiEdit', 'Write']:
            exit_success()
        
        # Extract file paths from tool input
        file_paths = get_file_paths_from_tool_input(tool_name, tool_input)
        
        if not file_paths:
            logger.debug("No file paths found in tool input")
            exit_success()
        
        # Filter for TypeScript files
        ts_files = [f for f in file_paths if should_check_file(f)]
        
        if not ts_files:
            logger.debug("No TypeScript files to check")
            exit_success()
        
        logger.info(f"Checking TypeScript types for {len(ts_files)} file(s)")
        
        # Get project directory
        project_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())
        
        # Run type checking
        has_errors, error_message = run_type_check(ts_files, project_dir)
        
        if has_errors:
            # Return blocking error with formatted message
            response = {
                "continue": True,  # Let Claude continue but with feedback
                "decision": "block",
                "reason": error_message
            }
            print(json.dumps(response))
            sys.exit(EXIT_POLICY_VIOLATION)
        
        # No errors found
        exit_success()
        
    except Exception as e:
        logger.error(f"Unexpected error in TypeScript hook: {e}")
        exit_with_error(f"TypeScript check hook error: {e}", EXIT_GENERAL_ERROR)


if __name__ == "__main__":
    main()