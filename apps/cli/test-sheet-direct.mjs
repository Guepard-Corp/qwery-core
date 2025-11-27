#!/usr/bin/env node

/**
 * Direct test of the CLI's NotebookRunner with Google Sheet query
 * This bypasses the import issues by using the built CLI code
 */

// Load environment
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

// Set workspace
if (!process.env.VITE_WORKING_DIR && !process.env.WORKSPACE) {
  process.env.VITE_WORKING_DIR = process.env.WORKING_DIR || 'workspace';
}
if (!process.env.WORKSPACE) {
  process.env.WORKSPACE = process.env.VITE_WORKING_DIR || 'workspace';
}

console.log('🧪 Testing CLI NotebookRunner with Google Sheet Query\n');
console.log('Environment:');
console.log(`  AZURE_API_KEY: ${process.env.AZURE_API_KEY ? '✓ Set' : '✗ Missing'}`);
console.log(`  AZURE_RESOURCE_NAME: ${process.env.AZURE_RESOURCE_NAME || 'Not set'}`);
console.log(`  WORKSPACE: ${process.env.WORKSPACE || 'Not set'}\n`);

const query = 'list all data in this sheet https://docs.google.com/spreadsheets/d/1yfjcBF4X8waukFdI5u9ctkagFwAn-BRgM5IUCUK1Ay8/export?fomat=csv';

console.log('📝 Query:', query);
console.log('');

// Import from built CLI
try {
  console.log('⏳ Loading NotebookRunner from built CLI...\n');
  
  // Import the built CLI module
  const cliModule = await import('../dist/services/notebook-runner.js');
  const { NotebookRunner } = cliModule;
  
  if (!NotebookRunner) {
    throw new Error('NotebookRunner not found in built CLI');
  }
  
  console.log('✓ NotebookRunner loaded\n');
  
  // Create a mock datasource (for Google Sheets, we don't need a real datasource)
  // The FactoryAgent will handle Google Sheets directly
  const mockDatasource = {
    id: 'google-sheet-test',
    name: 'Google Sheet',
    datasource_provider: 'google-sheets',
    config: {},
    project_id: 'test-project',
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const runner = new NotebookRunner();
  
  console.log('💬 Running query through NotebookRunner...\n');
  console.log('─'.repeat(60));
  console.log('');
  
  const result = await runner.runCell({
    datasource: mockDatasource,
    query: query,
    mode: 'natural',
  });
  
  console.log('─'.repeat(60));
  console.log('\n✅ Query completed!\n');
  console.log('Results:');
  console.log(`  SQL: ${result.sql}`);
  console.log(`  Rows: ${result.rowCount}`);
  console.log(`  Data:`, JSON.stringify(result.rows, null, 2));
  
} catch (error) {
  console.error('\n❌ Error:');
  console.error(error instanceof Error ? error.message : String(error));
  if (error instanceof Error && error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
}

