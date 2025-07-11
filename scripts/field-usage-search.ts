/**
 * Field Usage Search Script
 * Searches for specific database field usage patterns
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface FieldUsageResult {
  table: string;
  field: string;
  usages: Array<{
    file: string;
    line: number;
    context: string;
    type: 'query' | 'type' | 'interface' | 'assignment' | 'other';
  }>;
}

// Focus on most important fields
const criticalFields = [
  // Users table fields
  { table: 'users', fields: ['id', 'telegram_id', 'balance_uni', 'balance_ton', 'last_active', 'uni_farming_active', 'referred_by', 'referrer_id'] },
  // Transactions table fields  
  { table: 'transactions', fields: ['type', 'amount', 'amount_uni', 'amount_ton', 'tx_hash', 'metadata'] },
  // Missions table fields
  { table: 'missions', fields: ['reward_uni', 'reward_ton', 'reward_amount', 'mission_type'] },
  // Referrals/farming fields that might be missing
  { table: 'referrals', fields: ['inviter_id', 'user_id', 'reward_uni', 'reward_ton'] },
  { table: 'farming_sessions', fields: ['user_id', 'amount', 'rate', 'status'] }
];

function searchFieldUsage(table: string, field: string): FieldUsageResult {
  const result: FieldUsageResult = {
    table,
    field,
    usages: []
  };

  try {
    // Search for field usage in various contexts
    const searchPatterns = [
      // Direct property access
      `\\.${field}[^a-zA-Z0-9_]`,
      // Quoted property access
      `['"]${field}['"]`,
      // Supabase queries
      `select\\([^)]*${field}`,
      `\\.eq\\(['"]${field}['"]`,
      `\\.update\\([^)]*${field}`,
      // Type definitions
      `${field}\\s*:`,
      `${field}\\?\\s*:`,
    ];

    // Search directories
    const searchDirs = ['modules', 'core', 'client/src', 'shared'];
    
    searchPatterns.forEach(pattern => {
      searchDirs.forEach(dir => {
        if (!fs.existsSync(dir)) return;
        
        try {
          const cmd = `grep -rn --include="*.ts" --include="*.tsx" -E "${pattern}" ${dir} | head -30`;
          const output = execSync(cmd, { encoding: 'utf-8' });
          
          const lines = output.trim().split('\n').filter(line => line);
          
          lines.forEach(line => {
            const match = line.match(/^(.+?):(\d+):(.*)$/);
            if (match) {
              const [, file, lineNum, context] = match;
              
              // Skip if it's a different field with similar name
              if (context.includes(`${field}_`) || context.includes(`_${field}`)) {
                return;
              }
              
              result.usages.push({
                file,
                line: parseInt(lineNum),
                context: context.trim().substring(0, 100),
                type: detectUsageType(context)
              });
            }
          });
        } catch (error) {
          // No matches found
        }
      });
    });
    
    // Deduplicate
    const seen = new Set<string>();
    result.usages = result.usages.filter(usage => {
      const key = `${usage.file}:${usage.line}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
  } catch (error) {
    console.error(`Error searching ${table}.${field}:`, error);
  }

  return result;
}

function detectUsageType(context: string): 'query' | 'type' | 'interface' | 'assignment' | 'other' {
  if (context.includes('supabase') || context.includes('select') || context.includes('from(')) return 'query';
  if (context.includes('interface') || context.includes('type ') || context.includes(':')) return 'type';
  if (context.includes('=')) return 'assignment';
  return 'other';
}

async function performFieldUsageSearch() {
  console.log('🔍 Searching for database field usage patterns...\n');
  
  const allResults: FieldUsageResult[] = [];
  
  // Search for each critical field
  criticalFields.forEach(({ table, fields }) => {
    console.log(`\n📊 Searching ${table} fields...`);
    
    fields.forEach(field => {
      process.stdout.write(`   ${field}... `);
      const result = searchFieldUsage(table, field);
      allResults.push(result);
      console.log(result.usages.length > 0 ? `✅ ${result.usages.length} usages` : '❌ Not found');
    });
  });
  
  // Generate comprehensive report
  generateFieldUsageReport(allResults);
}

function generateFieldUsageReport(results: FieldUsageResult[]) {
  const report: string[] = [];
  
  report.push('# UniFarm Database Field Usage Report');
  report.push(`Generated: ${new Date().toISOString()}\n`);
  
  // Summary
  const totalFields = results.length;
  const usedFields = results.filter(r => r.usages.length > 0).length;
  const unusedFields = results.filter(r => r.usages.length === 0).length;
  
  report.push('## Summary');
  report.push(`- Total Fields Analyzed: ${totalFields}`);
  report.push(`- Fields Used in Code: ${usedFields}`);
  report.push(`- Fields Not Found: ${unusedFields}\n`);
  
  // Detailed usage by table
  criticalFields.forEach(({ table, fields }) => {
    report.push(`## ${table} Table\n`);
    
    fields.forEach(field => {
      const result = results.find(r => r.table === table && r.field === field);
      if (!result) return;
      
      report.push(`### ${field}`);
      
      if (result.usages.length === 0) {
        report.push('❌ **Not found in code**\n');
      } else {
        report.push(`✅ **Found ${result.usages.length} usages**\n`);
        
        // Group by type
        const byType = result.usages.reduce((acc, usage) => {
          if (!acc[usage.type]) acc[usage.type] = [];
          acc[usage.type].push(usage);
          return acc;
        }, {} as Record<string, typeof result.usages>);
        
        Object.entries(byType).forEach(([type, usages]) => {
          report.push(`**${type} (${usages.length}):**`);
          usages.slice(0, 3).forEach(usage => {
            report.push(`- \`${usage.file}:${usage.line}\``);
            report.push(`  \`\`\`${usage.context}\`\`\``);
          });
          if (usages.length > 3) {
            report.push(`  ...and ${usages.length - 3} more\n`);
          }
        });
      }
      report.push('');
    });
  });
  
  // Issues section
  report.push('## Critical Issues\n');
  
  // Fields not found
  const notFound = results.filter(r => r.usages.length === 0);
  if (notFound.length > 0) {
    report.push('### Fields Not Found in Code');
    notFound.forEach(result => {
      report.push(`- **${result.table}.${result.field}**`);
    });
    report.push('');
  }
  
  // Save report
  const reportPath = path.join(process.cwd(), 'docs', 'db_field_usage_report.md');
  fs.writeFileSync(reportPath, report.join('\n'));
  console.log(`\n✅ Field usage report saved to: ${reportPath}`);
  
  // Save JSON data
  const jsonPath = path.join(process.cwd(), 'docs', 'db_field_usage_data.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`✅ Usage data saved to: ${jsonPath}`);
}

// Run the search
performFieldUsageSearch().catch(console.error);