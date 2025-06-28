#!/usr/bin/env python3

import os
import re
from pathlib import Path

# Маппинг алиасов на их реальные пути
alias_map = {
    '@/components': 'components',
    '@/contexts': 'contexts', 
    '@/hooks': 'hooks',
    '@/layouts': 'layouts',
    '@/lib': 'lib',
    '@/pages': 'pages',
    '@/services': 'services',
    '@/utils': 'utils',
    '@/types': 'types',
    '@/store': 'store',
    '@/config': 'config',
    '@/styles': 'styles'
}

def calculate_relative_path(from_file, to_path):
    """Вычисляет относительный путь от файла к директории"""
    from_dir = os.path.dirname(from_file)
    from_parts = from_dir.split('/')
    
    # Находим индекс 'src' в пути
    try:
        src_index = from_parts.index('src')
    except ValueError:
        return './' + to_path
    
    # Считаем уровень вложенности от src
    levels_from_src = len(from_parts) - src_index - 1
    
    if levels_from_src == 0:
        # Файл в корне src
        return './' + to_path
    else:
        # Файл в подпапке - добавляем нужное количество ../
        return '../' * levels_from_src + to_path

def process_file(file_path):
    """Обрабатывает один файл, заменяя алиасы на относительные пути"""
    print(f"Processing: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    
    # Регулярное выражение для поиска импортов
    import_pattern = r'from\s+[\'"](@/[^\'"]+)[\'"]'
    
    def replace_import(match):
        nonlocal modified
        import_path = match.group(1)
        
        # Находим соответствующий алиас
        for alias, replacement in alias_map.items():
            if import_path.startswith(alias):
                # Получаем оставшуюся часть пути
                rest_path = import_path[len(alias):]
                
                # Вычисляем относительный путь
                relative_base = calculate_relative_path(file_path, replacement)
                new_path = relative_base + rest_path
                
                print(f"  Replacing: {import_path} -> {new_path}")
                modified = True
                return f'from \'{new_path}\''
        
        # Если алиас не найден, оставляем как есть
        return match.group(0)
    
    # Заменяем все импорты
    new_content = re.sub(import_pattern, replace_import, content)
    
    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  ✓ Updated {file_path}")

def find_ts_files(directory):
    """Рекурсивно находит все .ts и .tsx файлы"""
    files = []
    for root, dirs, filenames in os.walk(directory):
        # Пропускаем скрытые директории и node_modules
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'node_modules']
        
        for filename in filenames:
            if filename.endswith(('.ts', '.tsx')):
                files.append(os.path.join(root, filename))
    
    return files

def main():
    src_dir = 'client/src'
    
    if not os.path.exists(src_dir):
        print(f"Error: {src_dir} directory not found!")
        return
    
    print("Finding all TypeScript files...")
    files = find_ts_files(src_dir)
    
    print(f"Found {len(files)} files to process")
    
    for file_path in files:
        process_file(file_path)
    
    print("\nImport fixing completed!")

if __name__ == "__main__":
    main()