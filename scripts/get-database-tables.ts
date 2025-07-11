/**
 * Get Database Tables and Structure from Supabase
 * Read-only script to analyze UniFarm database schema
 */

import { supabase } from '../core/supabase';
import fs from 'fs';
import path from 'path';

interface TableInfo {
  tableName: string;
  columns: any[];
  rowCount?: number;
}

async function getDatabaseTables() {
  console.log('🔍 Getting UniFarm Database Tables...\n');
  
  const tablesInfo: TableInfo[] = [];
  
  // List of expected tables based on the project documentation
  const expectedTables = [
    'users',
    'user_sessions',
    'transactions', 
    'referrals',
    'farming_sessions',
    'boost_purchases',
    'missions',
    'user_missions',
    'airdrops',
    'daily_bonus_logs',
    'withdraw_requests'
  ];

  // Check each table
  for (const tableName of expectedTables) {
    console.log(`📊 Checking table: ${tableName}`);
    
    try {
      // Get a sample row to infer structure
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        console.log(`   ❌ Table not found or error: ${error.message}`);
        continue;
      }
      
      // Get column information from the response
      let columns: string[] = [];
      if (data && data.length > 0) {
        columns = Object.keys(data[0]);
      } else {
        // If no data, try to get columns from an empty query
        const { data: emptyData } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);
        
        if (emptyData) {
          // Even empty result should have column structure
          columns = Object.keys(emptyData);
        }
      }
      
      tablesInfo.push({
        tableName,
        columns,
        rowCount: count || 0
      });
      
      console.log(`   ✅ Found ${columns.length} columns, ${count || 0} rows`);
      
    } catch (err) {
      console.log(`   ❌ Error accessing table: ${err}`);
    }
  }
  
  // Save results
  const reportPath = path.join(process.cwd(), 'docs', 'database_tables_info.json');
  fs.writeFileSync(reportPath, JSON.stringify(tablesInfo, null, 2));
  console.log(`\n✅ Database tables info saved to: ${reportPath}`);
  
  // Create initial report
  createInitialReport(tablesInfo);
}

function createInitialReport(tables: TableInfo[]) {
  const report: string[] = [];
  
  report.push('# UniFarm Database Tables Overview');
  report.push(`Generated: ${new Date().toISOString()}\n`);
  
  report.push('## Summary');
  report.push(`- Tables Found: ${tables.length}`);
  report.push(`- Total Rows: ${tables.reduce((sum, t) => sum + (t.rowCount || 0), 0)}\n`);
  
  report.push('## Tables Structure\n');
  
  tables.forEach(table => {
    report.push(`### ${table.tableName}`);
    report.push(`- Columns: ${table.columns.length}`);
    report.push(`- Rows: ${table.rowCount || 0}`);
    
    if (table.columns.length > 0) {
      report.push('\nColumns:');
      table.columns.forEach(col => {
        report.push(`- ${col}`);
      });
    }
    
    report.push('');
  });
  
  const reportPath = path.join(process.cwd(), 'docs', 'database_tables_overview.md');
  fs.writeFileSync(reportPath, report.join('\n'));
  console.log(`✅ Overview report saved to: ${reportPath}`);
}

// Run the script
getDatabaseTables().catch(console.error);

export { getDatabaseTables };