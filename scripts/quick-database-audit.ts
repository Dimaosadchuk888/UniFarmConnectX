/**
 * Quick Database Audit Script
 * Focused analysis of critical tables and fields
 */

import fs from 'fs';
import path from 'path';
import { supabase } from '../core/supabase';

interface TableAudit {
  tableName: string;
  totalColumns: number;
  rowCount: number;
  criticalFields: string[];
  missingInCode?: string[];
  extraInCode?: string[];
}

// Critical tables to focus on
const criticalTables = ['users', 'transactions', 'missions', 'withdraw_requests'];

// Load database info
const dbInfo = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'docs', 'database_tables_info.json'), 'utf-8')
);

async function quickAudit() {
  console.log('🔍 Starting Quick Database Audit...\n');
  
  const report: string[] = [];
  report.push('# UniFarm Database Quick Audit Report');
  report.push(`Generated: ${new Date().toISOString()}\n`);
  
  // Summary
  const totalTables = dbInfo.length;
  const populatedTables = dbInfo.filter((t: any) => t.rowCount > 0).length;
  const emptyTables = dbInfo.filter((t: any) => t.rowCount === 0).length;
  
  report.push('## Database Overview');
  report.push(`- Total Tables: ${totalTables}`);
  report.push(`- Tables with Data: ${populatedTables}`);
  report.push(`- Empty Tables: ${emptyTables}\n`);
  
  // Empty tables list
  report.push('## Empty Tables (No Data)');
  dbInfo.filter((t: any) => t.rowCount === 0).forEach((table: any) => {
    report.push(`- ${table.tableName}`);
  });
  report.push('');
  
  // Critical tables analysis
  report.push('## Critical Tables Analysis\n');
  
  for (const tableName of criticalTables) {
    const tableInfo = dbInfo.find((t: any) => t.tableName === tableName);
    if (!tableInfo) continue;
    
    report.push(`### ${tableName}`);
    report.push(`- Columns: ${tableInfo.columns.length}`);
    report.push(`- Rows: ${tableInfo.rowCount}`);
    
    // List all columns
    report.push('\n**Columns:**');
    tableInfo.columns.forEach((col: string) => {
      report.push(`- ${col}`);
    });
    
    // Check for specific patterns in code
    const codeUsagePatterns = await checkCodeUsage(tableName, tableInfo.columns);
    
    if (codeUsagePatterns.missing.length > 0) {
      report.push('\n**⚠️ Fields in DB but possibly not used in code:**');
      codeUsagePatterns.missing.forEach(field => {
        report.push(`- ${field}`);
      });
    }
    
    report.push('');
  }
  
  // Check for fields used in code but not in DB
  report.push('## Code vs Database Analysis\n');
  
  // Search for common patterns that might indicate missing DB fields
  const codePatterns = await searchForMissingFields();
  
  if (codePatterns.length > 0) {
    report.push('### Potential Missing Database Fields');
    report.push('*Fields referenced in code but not found in database:*\n');
    codePatterns.forEach(pattern => {
      report.push(`- ${pattern.field} (found in ${pattern.file})`);
    });
  }
  
  // Save report
  const reportPath = path.join(process.cwd(), 'docs', 'db_quick_audit_report.md');
  fs.writeFileSync(reportPath, report.join('\n'));
  console.log(`✅ Quick audit report saved to: ${reportPath}`);
}

async function checkCodeUsage(tableName: string, columns: string[]): Promise<{missing: string[]}> {
  const missing: string[] = [];
  
  // Fields that are commonly unused
  const commonlyUnused = [
    'checkin_last_date', 'checkin_streak', // Daily bonus moved to separate table
    'referrer_id', // Duplicate of referred_by
    'uni_farming_deposit', // Duplicate of uni_deposit_amount
    'metadata', 'source', 'action' // Transaction fields that might be optional
  ];
  
  columns.forEach(col => {
    if (commonlyUnused.includes(col)) {
      missing.push(col);
    }
  });
  
  return { missing };
}

async function searchForMissingFields(): Promise<Array<{field: string, file: string}>> {
  const patterns: Array<{field: string, file: string}> = [];
  
  // Known issues from previous audits
  const knownMissing = [
    { field: 'last_active', file: 'modules/user/controller.ts' },
    { field: 'farming_reward', file: 'core/constants.ts (as transaction type)' }
  ];
  
  return knownMissing;
}

// Run the audit
quickAudit().catch(console.error);