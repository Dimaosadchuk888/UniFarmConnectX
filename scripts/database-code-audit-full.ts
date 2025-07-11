/**
 * Database Code Audit Script
 * Searches for database field usage across the codebase
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface FieldUsage {
  tableName: string;
  columnName: string;
  usages: Array<{
    file: string;
    line: number;
    context: string;
    codeType?: string;
  }>;
}

interface AuditResult {
  tableName: string;
  columnName: string;
  dbType?: string;
  nullable?: string;
  defaultValue?: string;
  usedInCode: boolean;
  codeType?: string;
  files: string[];
  issues: string[];
}

// Load the database schema info
const databaseInfo = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'docs', 'database_tables_info.json'), 'utf-8')
);

async function searchFieldUsage(tableName: string, columnName: string): Promise<FieldUsage> {
  const usage: FieldUsage = {
    tableName,
    columnName,
    usages: []
  };

  try {
    // Search patterns for different contexts
    const patterns = [
      `\\.${columnName}\\b`,              // Object property access
      `['"]${columnName}['"]`,            // String property access
      `${columnName}:`,                   // Object literal
      `\`.*\\$\\{.*${columnName}.*\\}.*\``, // Template literals
      `${columnName}\\s*=`,              // Assignment
      `${columnName}\\?`,                // Optional chaining
    ];

    // Search in TypeScript/JavaScript files
    for (const pattern of patterns) {
      try {
        const { stdout } = await execAsync(
          `grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -E "${pattern}" . | grep -v node_modules | grep -v ".git" | head -50`
        );
        
        const lines = stdout.trim().split('\n').filter(line => line);
        
        for (const line of lines) {
          const match = line.match(/^\.\/(.+?):(\d+):(.*)$/);
          if (match) {
            const [, file, lineNum, context] = match;
            
            // Skip test files and scripts unless they contain important patterns
            if ((file.includes('test') || file.includes('script')) && 
                !context.includes('supabase') && 
                !context.includes('drizzle')) {
              continue;
            }
            
            usage.usages.push({
              file,
              line: parseInt(lineNum),
              context: context.trim(),
              codeType: detectCodeType(context)
            });
          }
        }
      } catch (error) {
        // Grep returns non-zero if no matches found, which is fine
      }
    }

    // Also search for SQL-like usage
    try {
      const { stdout } = await execAsync(
        `grep -rn --include="*.ts" --include="*.tsx" -E "from\\s+['\"]${tableName}['\"]|table\\s*:\\s*['\"]${tableName}['\"]" . | grep -v node_modules | head -20`
      );
      
      const lines = stdout.trim().split('\n').filter(line => line);
      for (const line of lines) {
        const match = line.match(/^\.\/(.+?):(\d+):(.*)$/);
        if (match) {
          usage.usages.push({
            file: match[1],
            line: parseInt(match[2]),
            context: `Table reference: ${match[3].trim()}`,
            codeType: 'table_reference'
          });
        }
      }
    } catch (error) {
      // No matches found
    }

  } catch (error) {
    console.error(`Error searching for ${tableName}.${columnName}:`, error);
  }

  return usage;
}

function detectCodeType(context: string): string {
  if (context.includes('interface') || context.includes('type')) return 'type_definition';
  if (context.includes('supabase') || context.includes('.from(')) return 'supabase_query';
  if (context.includes('drizzle') || context.includes('db.')) return 'drizzle_query';
  if (context.includes('INSERT') || context.includes('UPDATE') || context.includes('SELECT')) return 'sql_query';
  if (context.includes('schema')) return 'schema_definition';
  return 'general_usage';
}

async function performFullAudit() {
  console.log('🔍 Starting comprehensive database code audit...\n');
  
  const auditResults: AuditResult[] = [];
  
  for (const table of databaseInfo) {
    console.log(`\n📊 Auditing table: ${table.tableName}`);
    
    for (const column of table.columns) {
      process.stdout.write(`   Checking ${column}... `);
      
      const usage = await searchFieldUsage(table.tableName, column);
      
      const result: AuditResult = {
        tableName: table.tableName,
        columnName: column,
        usedInCode: usage.usages.length > 0,
        files: [...new Set(usage.usages.map(u => u.file))],
        issues: []
      };
      
      // Determine code type based on most common usage
      if (usage.usages.length > 0) {
        const codeTypes = usage.usages.map(u => u.codeType).filter(Boolean);
        const typeCount: Record<string, number> = {};
        codeTypes.forEach(type => {
          typeCount[type!] = (typeCount[type!] || 0) + 1;
        });
        result.codeType = Object.entries(typeCount)
          .sort(([,a], [,b]) => b - a)[0]?.[0];
      }
      
      // Check for issues
      if (!result.usedInCode && table.rowCount > 0) {
        result.issues.push('Field exists in database with data but not used in code');
      }
      
      auditResults.push(result);
      
      console.log(result.usedInCode ? '✅ Used' : '❌ Not used');
    }
  }
  
  // Generate comprehensive report
  await generateDetailedReport(auditResults);
}

async function generateDetailedReport(results: AuditResult[]) {
  const report: string[] = [];
  
  report.push('# UniFarm Database Schema vs Code Audit Report');
  report.push(`Generated: ${new Date().toISOString()}\n`);
  
  // Summary statistics
  const totalFields = results.length;
  const usedFields = results.filter(r => r.usedInCode).length;
  const unusedFields = results.filter(r => !r.usedInCode).length;
  const issueCount = results.filter(r => r.issues.length > 0).length;
  
  report.push('## Summary');
  report.push(`- Total Database Fields: ${totalFields}`);
  report.push(`- Used in Code: ${usedFields} (${((usedFields/totalFields)*100).toFixed(1)}%)`);
  report.push(`- Not Used in Code: ${unusedFields} (${((unusedFields/totalFields)*100).toFixed(1)}%)`);
  report.push(`- Fields with Issues: ${issueCount}\n`);
  
  // Detailed table
  report.push('## Detailed Field Analysis\n');
  report.push('| Table | Column | Used in Code | Code Type | Files | Issues |');
  report.push('|-------|--------|--------------|-----------|-------|--------|');
  
  for (const result of results) {
    const usedIcon = result.usedInCode ? '✅' : '❌';
    const fileCount = result.files.length;
    const fileInfo = fileCount > 0 ? `${fileCount} files` : '—';
    const issueInfo = result.issues.length > 0 ? result.issues.join('; ') : '—';
    
    report.push(
      `| ${result.tableName} | ${result.columnName} | ${usedIcon} | ${result.codeType || '—'} | ${fileInfo} | ${issueInfo} |`
    );
  }
  
  // Issues section
  report.push('\n## Issues Found\n');
  
  const groupedIssues: Record<string, AuditResult[]> = {};
  results.forEach(result => {
    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        if (!groupedIssues[issue]) {
          groupedIssues[issue] = [];
        }
        groupedIssues[issue].push(result);
      });
    }
  });
  
  Object.entries(groupedIssues).forEach(([issue, fields]) => {
    report.push(`### ${issue}`);
    fields.forEach(field => {
      report.push(`- ${field.tableName}.${field.columnName}`);
    });
    report.push('');
  });
  
  // Unused fields by table
  report.push('## Unused Fields by Table\n');
  const unusedByTable: Record<string, string[]> = {};
  
  results.filter(r => !r.usedInCode).forEach(result => {
    if (!unusedByTable[result.tableName]) {
      unusedByTable[result.tableName] = [];
    }
    unusedByTable[result.tableName].push(result.columnName);
  });
  
  Object.entries(unusedByTable).forEach(([table, columns]) => {
    if (columns.length > 0) {
      report.push(`### ${table}`);
      columns.forEach(col => report.push(`- ${col}`));
      report.push('');
    }
  });
  
  // Save report
  const reportPath = path.join(process.cwd(), 'docs', 'db_schema_code_audit_report.md');
  fs.writeFileSync(reportPath, report.join('\n'));
  console.log(`\n✅ Comprehensive audit report saved to: ${reportPath}`);
  
  // Save detailed JSON data
  const jsonPath = path.join(process.cwd(), 'docs', 'db_schema_code_audit_data.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`✅ Detailed audit data saved to: ${jsonPath}`);
}

// Run the audit
performFullAudit().catch(console.error);