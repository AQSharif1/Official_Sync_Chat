#!/usr/bin/env python3
"""
SQL Syntax Validator
Quick check for PostgreSQL syntax issues
"""

import re
import sys

def validate_sql_syntax(sql_content):
    """Basic SQL syntax validation"""
    errors = []
    warnings = []
    
    lines = sql_content.split('\n')
    
    for i, line in enumerate(lines, 1):
        line = line.strip()
        if not line or line.startswith('--'):
            continue
            
        # Check for common syntax errors
        if 'ADD CONSTRAINT IF NOT EXISTS' in line:
            errors.append(f"Line {i}: 'ADD CONSTRAINT IF NOT EXISTS' is not valid PostgreSQL syntax")
            
        # Check for proper DO block syntax
        if line.startswith('DO $$') and not line.endswith('$$;'):
            # Check if the block is properly closed
            block_content = []
            j = i
            while j < len(lines):
                block_content.append(lines[j-1])
                if lines[j-1].strip().endswith('$$;'):
                    break
                j += 1
            else:
                errors.append(f"Line {i}: DO block not properly closed")
                
        # Check for proper function syntax
        if 'CREATE OR REPLACE FUNCTION' in line:
            if '$$' not in ''.join(lines[i-1:i+10]):
                warnings.append(f"Line {i}: Function may be missing proper delimiters")
    
    return errors, warnings

def main():
    try:
        with open('public/TESTED_WORKING_FIX.sql', 'r') as f:
            sql_content = f.read()
        
        errors, warnings = validate_sql_syntax(sql_content)
        
        print("SQL Syntax Validation Results:")
        print("=" * 40)
        
        if errors:
            print(f"❌ ERRORS FOUND ({len(errors)}):")
            for error in errors:
                print(f"  {error}")
        else:
            print("✅ No syntax errors found")
            
        if warnings:
            print(f"\n⚠️ WARNINGS ({len(warnings)}):")
            for warning in warnings:
                print(f"  {warning}")
        else:
            print("✅ No warnings")
            
        print(f"\n📊 File contains {len(sql_content.split(';'))} SQL statements")
        print("✅ Ready for deployment" if not errors else "❌ Fix errors before deployment")
        
    except FileNotFoundError:
        print("❌ SQL file not found")
        return 1
        
    return 0 if not errors else 1

if __name__ == "__main__":
    sys.exit(main())
