#!/usr/bin/env node

/**
 * Test script for Google Sheet query
 * Tests the FactoryAgent with the Google Sheet prompt
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

// Ensure WORKSPACE is set
if (!process.env.VITE_WORKING_DIR && !process.env.WORKSPACE) {
  process.env.VITE_WORKING_DIR = process.env.WORKING_DIR || 'workspace';
}
if (!process.env.WORKSPACE) {
  process.env.WORKSPACE = process.env.VITE_WORKING_DIR || 'workspace';
}

console.log('🧪 Testing Google Sheet Query with FactoryAgent\n');
console.log('Environment:');
console.log(`  AZURE_API_KEY: ${process.env.AZURE_API_KEY ? '✓ Set' : '✗ Missing'}`);
console.log(`  AZURE_RESOURCE_NAME: ${process.env.AZURE_RESOURCE_NAME || 'Not set'}`);
console.log(`  AZURE_OPENAI_DEPLOYMENT: ${process.env.AZURE_OPENAI_DEPLOYMENT || 'Not set'}`);
console.log(`  WORKSPACE: ${process.env.WORKSPACE || 'Not set'}\n`);

const prompt = 'list all data in this sheet https://docs.google.com/spreadsheets/d/1yfjcBF4X8waukFdI5u9ctkagFwAn-BRgM5IUCUK1Ay8/export?fomat=csv';

console.log('📝 Query:', prompt);
console.log('');

try {
  // Import FactoryAgent
  const { FactoryAgent, validateUIMessages } = await import('@qwery/agent-factory-sdk');
  const { nanoid } = await import('nanoid');
  
  console.log('✓ FactoryAgent loaded\n');
  
  const conversationId = `test-${Date.now()}`;
  console.log(`📝 Creating agent with conversation ID: ${conversationId}`);
  const agent = new FactoryAgent({ conversationId });
  console.log(`✓ Agent created: ${agent.id}\n`);
  
  const messages = [
    {
      id: nanoid(),
      role: 'user',
      content: prompt,
    },
  ];
  
  console.log('💬 Sending query to agent...\n');
  console.log('─'.repeat(60));
  console.log('');
  
  const response = await agent.respond({
    messages: await validateUIMessages({ messages }),
  });
  
  if (!response.body) {
    console.log('⚠️  Response has no body');
    process.exit(1);
  }
  
  console.log('✅ Agent responded! Streaming results...\n');
  
  // Stream the response
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';
  let chunkCount = 0;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      
      chunkCount++;
      const chunk = decoder.decode(value, { stream: true });
      process.stdout.write(chunk);
      fullResponse += chunk;
    }
  } finally {
    reader.releaseLock();
  }
  
  console.log('\n');
  console.log('─'.repeat(60));
  console.log(`\n✅ Test completed!`);
  console.log(`   Received ${chunkCount} chunks`);
  console.log(`   Total response length: ${fullResponse.length} characters\n`);
  
  if (fullResponse.trim().length === 0) {
    console.log('⚠️  Warning: Response was empty');
    process.exit(1);
  }
  
  // Check if response contains data
  if (fullResponse.includes('result') || fullResponse.includes('rows') || fullResponse.includes('data')) {
    console.log('✓ Response appears to contain data/results\n');
  }
  
} catch (error) {
  console.error('\n❌ Error:');
  console.error(error instanceof Error ? error.message : String(error));
  if (error instanceof Error && error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
}

