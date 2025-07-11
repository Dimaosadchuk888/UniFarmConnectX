/**
 * Simple Field Search Script
 * Basic search for database field usage
 */

import fs from 'fs';
import path from 'path';

interface SearchResult {
  table: string;
  field: string;
  found: boolean;
  files: string[];
}

// Key fields to search
const searchTargets = [
  // Critical issues from initial audit
  { table: 'users', field: 'last_active' },
  { table: 'users', field: 'referrer_id' },
  { table: 'users', field: 'uni_farming_deposit' },
  { table: 'users', field: 'checkin_last_date' },
  { table: 'users', field: 'checkin_streak' },
  
  // Transaction fields
  { table: 'transactions', field: 'metadata' },
  { table: 'transactions', field: 'source' },
  { table: 'transactions', field: 'action' },
  { table: 'transactions', field: 'tx_hash' },
  
  // Empty table fields to check
  { table: 'referrals', field: 'inviter_id' },
  { table: 'referrals', field: 'user_id' },
  { table: 'farming_sessions', field: 'user_id' },
  { table: 'boost_purchases', field: 'user_id' },
];

function searchInFile(filePath: string, field: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Simple search patterns
    const patterns = [
      `.${field}`,
      `'${field}'`,
      `"${field}"`,
      `${field}:`,
      `${field} =`,
    ];
    
    return patterns.some(pattern => content.includes(pattern));
  } catch (error) {
    return false;
  }
}

function searchDirectory(dir: string, field: string): string[] {
  const results: string[] = [];
  
  function walk(currentPath: string) {
    try {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip certain directories
          if (!item.includes('node_modules') && !item.startsWith('.')) {
            walk(fullPath);
          }
        } else if (stat.isFile()) {
          // Check TypeScript/JavaScript files
          if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js')) {
            if (searchInFile(fullPath, field)) {
              results.push(fullPath.replace(process.cwd() + '/', ''));
            }
          }
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
  }
  
  walk(dir);
  return results;
}

async function performSimpleSearch() {
  console.log('🔍 Starting simple field search...\n');
  
  const results: SearchResult[] = [];
  const searchDirs = ['modules', 'core', 'client/src', 'shared'];
  
  for (const { table, field } of searchTargets) {
    process.stdout.write(`Searching ${table}.${field}... `);
    
    const files: string[] = [];
    
    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        const found = searchDirectory(dir, field);
        files.push(...found);
      }
    }
    
    const result: SearchResult = {
      table,
      field,
      found: files.length > 0,
      files: [...new Set(files)] // Deduplicate
    };
    
    results.push(result);
    console.log(result.found ? `✅ Found in ${result.files.length} files` : '❌ Not found');
  }
  
  // Generate report
  generateSimpleReport(results);
}

function generateSimpleReport(results: SearchResult[]) {
  const report: string[] = [];
  
  report.push('# UniFarm Database Field Usage - Simple Search Report');
  report.push(`Generated: ${new Date().toISOString()}\n`);
  
  // Summary
  const found = results.filter(r => r.found).length;
  const notFound = results.filter(r => !r.found).length;
  
  report.push('## Summary');
  report.push(`- Fields Searched: ${results.length}`);
  report.push(`- Fields Found: ${found}`);
  report.push(`- Fields Not Found: ${notFound}\n`);
  
  // Fields not found in code
  report.push('## Fields Not Found in Code\n');
  const notFoundResults = results.filter(r => !r.found);
  
  if (notFoundResults.length > 0) {
    report.push('| Table | Field | Status |');
    report.push('|-------|-------|--------|');
    
    notFoundResults.forEach(result => {
      report.push(`| ${result.table} | ${result.field} | ❌ Not used |`);
    });
  } else {
    report.push('*All searched fields are used in the code.*');
  }
  
  report.push('\n## Fields Found in Code\n');
  const foundResults = results.filter(r => r.found);
  
  if (foundResults.length > 0) {
    report.push('| Table | Field | Files Count | Example Files |');
    report.push('|-------|-------|-------------|---------------|');
    
    foundResults.forEach(result => {
      const exampleFiles = result.files.slice(0, 2).join(', ');
      const moreFiles = result.files.length > 2 ? ` (+${result.files.length - 2} more)` : '';
      
      report.push(`| ${result.table} | ${result.field} | ${result.files.length} | ${exampleFiles}${moreFiles} |`);
    });
  }
  
  // Recommendations
  report.push('\n## Recommendations\n');
  
  if (notFoundResults.length > 0) {
    report.push('### Unused Database Fields');
    report.push('The following fields exist in the database but are not used in the code:\n');
    
    const byTable: Record<string, string[]> = {};
    notFoundResults.forEach(result => {
      if (!byTable[result.table]) byTable[result.table] = [];
      byTable[result.table].push(result.field);
    });
    
    Object.entries(byTable).forEach(([table, fields]) => {
      report.push(`**${table}** table:`);
      fields.forEach(field => {
        report.push(`- ${field}`);
      });
      report.push('');
    });
  }
  
  // Save report
  const reportPath = path.join(process.cwd(), 'docs', 'db_field_simple_search_report.md');
  fs.writeFileSync(reportPath, report.join('\n'));
  console.log(`\n✅ Simple search report saved to: ${reportPath}`);
}

// Run the search
performSimpleSearch().catch(console.error);