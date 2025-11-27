#!/usr/bin/env node

/**
 * Test FactoryAgent with Google Sheet query
 * Uses the same approach as the web app
 */

import { readFile } from 'fs/promises';

// Set environment variables
process.env.AZURE_API_KEY = process.env.AZURE_API_KEY || '3894e814ba674c0fa20b932c67334c1c';
process.env.AZURE_RESOURCE_NAME = process.env.AZURE_RESOURCE_NAME || 'guepard-agent-rs';
process.env.AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-mini';
process.env.AGENT_PROVIDER = process.env.AGENT_PROVIDER || 'azure';
process.env.WORKSPACE = process.env.WORKING_DIR || process.env.VITE_WORKING_DIR || 'workspace';

console.log('🧪 Testing FactoryAgent with Google Sheet Query...\n');
console.log('Environment:');
console.log(`  AZURE_API_KEY: ${process.env.AZURE_API_KEY ? '✓ Set' : '✗ Missing'}`);
console.log(`  AZURE_RESOURCE_NAME: ${process.env.AZURE_RESOURCE_NAME}`);
console.log(`  AZURE_OPENAI_DEPLOYMENT: ${process.env.AZURE_OPENAI_DEPLOYMENT}`);
console.log(`  WORKSPACE: ${process.env.WORKSPACE}\n`);

const prompt = 'list all data in this sheet https://docs.google.com/spreadsheets/d/1yfjcBF4X8waukFdI5u9ctkagFwAn-BRgM5IUCUK1Ay8/export?fomat=csv';

console.log('📝 Query:', prompt);
console.log('');

// Try to import from the built CLI or use dynamic import
try {
  console.log('⏳ Loading FactoryAgent...\n');
  
  // Use dynamic import to handle the module resolution
  const agentFactoryModule = await import('@qwery/agent-factory-sdk');
  const { FactoryAgent, validateUIMessages } = agentFactoryModule;
  
  console.log('✓ FactoryAgent loaded\n');
  
  const conversationId = `test-${Date.now()}`;
  console.log(`📝 Creating agent with conversation ID: ${conversationId}`);
  const agent = new FactoryAgent({ conversationId });
  console.log(`✓ Agent created: ${agent.id}\n`);
  
  const messages = [
    {
      id: '1',
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
  
} catch (error) {
  console.error('\n❌ Error:');
  console.error(error instanceof Error ? error.message : String(error));
  if (error instanceof Error && error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
}

