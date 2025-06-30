const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TypeScript files
const files = glob.sync('src/**/*.{ts,tsx}', { cwd: __dirname });

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Calculate relative path depth
  const depth = file.split('/').length - 2; // -2 for 'src' and filename
  const prefix = depth > 0 ? '../'.repeat(depth) : './';
  
  // Replace @/ imports with relative paths
  content = content.replace(
    /from ['"]@\/([^'"]+)['"]/g,
    (match, importPath) => {
      // Special handling for paths that need to go up directories
      if (importPath.startsWith('components/') || 
          importPath.startsWith('contexts/') || 
          importPath.startsWith('hooks/') || 
          importPath.startsWith('services/') || 
          importPath.startsWith('utils/') ||
          importPath.startsWith('lib/') ||
          importPath.startsWith('pages/') ||
          importPath.startsWith('layouts/')) {
        return `from '${prefix}${importPath}'`;
      }
      return match; // Keep unchanged if not matching pattern
    }
  );
  
  // Write back the file
  fs.writeFileSync(filePath, content);
});

console.log(`Fixed imports in ${files.length} files`);