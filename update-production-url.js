/**
 * Script to update all URLs to the new production URL
 */

import fs from 'fs';
import path from 'path';

const OLD_URL = 'https://uni-farm-connect-xo-osadchukdmitro2.replit.app';
const NEW_URL = 'https://uni-farm-connect-xo-osadchukdmitro2.replit.app';

const FILE_EXTENSIONS = ['.js', '.mjs', '.ts', '.tsx', '.json', '.md', '.txt', '.log'];
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build'];

function getAllFiles(dir, allFiles = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        getAllFiles(fullPath, allFiles);
      }
    } else {
      const ext = path.extname(file);
      if (FILE_EXTENSIONS.includes(ext)) {
        allFiles.push(fullPath);
      }
    }
  }
  
  return allFiles;
}

function updateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes(OLD_URL)) {
      const newContent = content.replace(new RegExp(OLD_URL, 'g'), NEW_URL);
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`Error updating ${filePath}: ${error.message}`);
    return false;
  }
}

async function updateAllUrls() {
  console.log('Updating production URL...');
  console.log(`From: ${OLD_URL}`);
  console.log(`To: ${NEW_URL}`);
  console.log('');
  
  const allFiles = getAllFiles('.');
  let updatedCount = 0;
  
  for (const file of allFiles) {
    if (updateFile(file)) {
      updatedCount++;
    }
  }
  
  console.log(`\nUpdated ${updatedCount} files`);
}

updateAllUrls();