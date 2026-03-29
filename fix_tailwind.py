import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    new_content = content

    # Opacity bracket syntax
    def modify_opacity(m):
        prefix = m.group(1)
        digits = m.group(2)
        if digits.startswith("0"):
            num = int(digits)
        else:
            if len(digits) == 1:
                num = int(digits) * 10
            else:
                return m.group(0) 
        return f"{prefix}/{num}"
    
    new_content = re.sub(r'([\w-]+)/\[0\.(\d+)\]', modify_opacity, new_content)

    # Gradients
    new_content = new_content.replace('bg-gradient-to-', 'bg-linear-to-')

    # Translate px
    new_content = new_content.replace('translate-y-[1px]', 'translate-y-px')
    new_content = new_content.replace('translate-x-[1px]', 'translate-x-px')
    new_content = new_content.replace('-translate-y-[1px]', '-translate-y-px')
    new_content = new_content.replace('-translate-x-[1px]', '-translate-x-px')

    # break-words
    new_content = re.sub(r'\bbreak-words\b', 'wrap-break-word', new_content)

    # CSS variables in brackets
    new_content = re.sub(r'\[var\((--[\w-]+)\)\]', r'(\1)', new_content)

    # Important modifier movement
    new_content = re.sub(r'(["\'`\s])!([a-z]+-[a-zA-Z0-9-\/]+)', r'\1\2!', new_content)

    # Rem to tailwind units
    new_content = new_content.replace('min-w-[8rem]', 'min-w-32')
    new_content = new_content.replace('w-[8rem]', 'w-32')
    new_content = new_content.replace('w-[12rem]', 'w-48')
    new_content = new_content.replace('min-w-[12rem]', 'min-w-48')
    new_content = new_content.replace('min-w-[16rem]', 'min-w-64')
    new_content = new_content.replace('min-w-[20rem]', 'min-w-80')

    # z-index
    new_content = re.sub(r'\bz-\[(\d+)\]', r'z-\1', new_content)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        return True
    return False

def walk_dir(path):
    changed = 0
    for root, dirs, files in os.walk(path):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                if process_file(os.path.join(root, file)):
                    print(f"Fixed: {os.path.join(root, file).replace('/Users/prafullsaxena/Desktop/Development/zenith/', '')}")
                    changed += 1
    return changed

print(f"\nScanning plugins...")
plugins_changed = walk_dir('/Users/prafullsaxena/Desktop/Development/zenith/src/renderer/src/plugins')

print(f"\nScanning components...")
components_changed = walk_dir('/Users/prafullsaxena/Desktop/Development/zenith/src/renderer/src/components')

total = plugins_changed + components_changed
print(f"\nGlobal sweep complete! Modified {total} files.")
