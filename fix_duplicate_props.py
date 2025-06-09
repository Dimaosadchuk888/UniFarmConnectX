#!/usr/bin/env python3

import os
import re

def fix_notification_objects(file_path):
    """Fix malformed notification objects with duplicate properties"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Pattern to match showNotification calls with malformed syntax
    pattern = r'showNotification\(\{\s*message: ([^,]+), type: \'loading\',\s*type: \'(\w+)\',\s*duration: (\d+)\s*\}\);'
    
    def replace_func(match):
        message = match.group(1)
        actual_type = match.group(2)
        duration = match.group(3)
        return f'showNotification({{\n        message: {message},\n        type: \'{actual_type}\',\n        duration: {duration}\n      }});'
    
    # Replace malformed patterns
    content = re.sub(pattern, replace_func, content, flags=re.MULTILINE | re.DOTALL)
    
    # Fix other malformed patterns
    content = re.sub(r'message: ([^,]+), type: \'loading\',\s*type: \'(\w+)\',', r'message: \1,\n        type: \'\2\',', content)
    content = re.sub(r'message: ([^,]+), type: \'loading\',\s*duration:', r'message: \1,\n        type: \'loading\',\n        duration:', content)
    
    with open(file_path, 'w') as f:
        f.write(content)

# Fix all TypeScript files
base_path = 'client/src'
for root, dirs, files in os.walk(base_path):
    for file in files:
        if file.endswith('.tsx'):
            file_path = os.path.join(root, file)
            fix_notification_objects(file_path)

print("Fixed duplicate properties in notification objects")