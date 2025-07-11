/**
 * Database Schema Audit Script for UniFarm
 * Read-only analysis of database structure
 */

import { supabase } from '../core/supabase';
import fs from 'fs';
import path from 'path';

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  ordinal_position: number;
  udt_name?: string;
  character_maximum_length?: number;
  numeric_precision?: number;
  numeric_scale?: number;
}

async function auditDatabaseSchema() {
  console.log('🔍 Starting UniFarm Database Schema Audit...\n');

  try {
    // Get all columns from information_schema
    const { data: columns, error } = await supabase.rpc('get_schema_info', {});
    
    if (error) {
      // If RPC doesn't exist, use direct query
      console.log('📊 Fetching schema information from database...');
      
      const query = `
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default,
          ordinal_position,
          udt_name,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `;

      const { data: schemaData, error: schemaError } = await supabase
        .rpc('execute_sql', { query_text: query });

      if (schemaError) {
        console.error('❌ Error fetching schema:', schemaError);
        return;
      }

      await processSchemaData(schemaData || []);
    } else {
      await processSchemaData(columns || []);
    }

  } catch (error) {
    console.error('❌ Error during audit:', error);
  }
}

async function processSchemaData(columns: ColumnInfo[]) {
  // Group columns by table
  const tableMap: Record<string, ColumnInfo[]> = {};
  
  columns.forEach(col => {
    if (!tableMap[col.table_name]) {
      tableMap[col.table_name] = [];
    }
    tableMap[col.table_name].push(col);
  });

  // Create audit report
  const auditReport: string[] = [];
  auditReport.push('# UniFarm Database Schema Audit Report');
  auditReport.push(`Generated: ${new Date().toISOString()}\n`);
  
  // Summary
  auditReport.push('## Summary');
  auditReport.push(`- Total Tables: ${Object.keys(tableMap).length}`);
  auditReport.push(`- Total Columns: ${columns.length}\n`);

  // Detailed table information
  auditReport.push('## Database Schema Details\n');
  
  for (const [tableName, tableColumns] of Object.entries(tableMap)) {
    auditReport.push(`### Table: ${tableName}`);
    auditReport.push(`Columns: ${tableColumns.length}\n`);
    
    auditReport.push('| Column | Type | Nullable | Default |');
    auditReport.push('|--------|------|----------|---------|');
    
    tableColumns.forEach(col => {
      const type = formatDataType(col);
      const nullable = col.is_nullable === 'YES' ? 'YES' : 'NO';
      const defaultVal = col.column_default || 'NULL';
      
      auditReport.push(`| ${col.column_name} | ${type} | ${nullable} | ${defaultVal} |`);
    });
    
    auditReport.push('');
  }

  // Save raw data as JSON
  const rawDataPath = path.join(process.cwd(), 'docs', 'schema_audit_raw.json');
  fs.writeFileSync(rawDataPath, JSON.stringify(tableMap, null, 2));
  console.log(`✅ Raw schema data saved to: ${rawDataPath}`);

  // Save formatted report
  const reportPath = path.join(process.cwd(), 'docs', 'db_schema_audit_initial.md');
  fs.writeFileSync(reportPath, auditReport.join('\n'));
  console.log(`✅ Initial audit report saved to: ${reportPath}`);

  // Create CSV for easier analysis
  const csvPath = path.join(process.cwd(), 'docs', 'schema_audit_raw.csv');
  const csvContent = createCSV(columns);
  fs.writeFileSync(csvPath, csvContent);
  console.log(`✅ CSV data saved to: ${csvPath}`);
}

function formatDataType(col: ColumnInfo): string {
  let type = col.data_type;
  
  if (col.data_type === 'character varying' && col.character_maximum_length) {
    type = `varchar(${col.character_maximum_length})`;
  } else if (col.data_type === 'numeric' && col.numeric_precision && col.numeric_scale) {
    type = `numeric(${col.numeric_precision},${col.numeric_scale})`;
  } else if (col.udt_name) {
    type = col.udt_name;
  }
  
  return type;
}

function createCSV(columns: ColumnInfo[]): string {
  const headers = ['table_name', 'column_name', 'data_type', 'is_nullable', 'column_default'];
  const rows = [headers.join(',')];
  
  columns.forEach(col => {
    const row = [
      col.table_name,
      col.column_name,
      formatDataType(col),
      col.is_nullable,
      col.column_default || 'NULL'
    ].map(val => `"${val}"`);
    
    rows.push(row.join(','));
  });
  
  return rows.join('\n');
}

// Run the audit
if (require.main === module) {
  auditDatabaseSchema().catch(console.error);
}

export { auditDatabaseSchema };