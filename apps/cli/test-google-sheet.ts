#!/usr/bin/env node

/**
 * Test script for Google Sheet query with FactoryAgent
 * This tests the same agent that the web app uses
 */

import { FactoryAgent, validateUIMessages } from '@qwery/agent-factory-sdk';
import type { UIMessage } from 'ai';

async function testGoogleSheetQuery() {
  console.log('🧪 Testing FactoryAgent with Google Sheet Query...\n');

  // Check environment variables
  const provider = process.env.VITE_AGENT_PROVIDER || process.env.AGENT_PROVIDER || 'azure';
  const hasAzureKey = !!process.env.AZURE_API_KEY;
  const hasAzureResource = !!process.env.AZURE_RESOURCE_NAME;
  const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-mini';
  const workspace = process.env.VITE_WORKING_DIR || process.env.WORKING_DIR || 'workspace';

  console.log('Environment Variables:');
  console.log(`  Provider: ${provider}`);
  console.log(`  AZURE_API_KEY: ${hasAzureKey ? '✓ Set' : '✗ Missing'}`);
  console.log(`  AZURE_RESOURCE_NAME: ${hasAzureResource ? '✓ Set' : '✗ Missing'}`);
  console.log(`  AZURE_OPENAI_DEPLOYMENT: ${azureDeployment}`);
  console.log(`  WORKING_DIR: ${workspace}\n`);

  if (!hasAzureKey || !hasAzureResource) {
    console.log('❌ Error: Azure credentials not configured.');
    console.log('   Set these environment variables:');
    console.log('   export AZURE_API_KEY="your-key"');
    console.log('   export AZURE_RESOURCE_NAME="your-resource"');
    console.log('   export AZURE_OPENAI_DEPLOYMENT="gpt-5-mini"');
    console.log('   export WORKING_DIR="workspace"\n');
    process.exit(1);
  }

  // Set WORKING_DIR for the agent
  process.env.WORKSPACE = workspace;

  const prompt = 'list all data in this sheet https://docs.google.com/spreadsheets/d/1yfjcBF4X8waukFdI5u9ctkagFwAn-BRgM5IUCUK1Ay8/export?fomat=csv';

  console.log('📝 Creating FactoryAgent...');
  const conversationId = `test-${Date.now()}`;
  const agent = new FactoryAgent({ conversationId });
  console.log(`✓ Agent created with ID: ${agent.id}\n`);

  console.log('💬 Sending query to agent...');
  console.log(`   Query: "${prompt}"\n`);

  const messages: UIMessage[] = [
    {
      id: '1',
      role: 'user',
      content: prompt,
    },
  ];

  try {
    console.log('⏳ Waiting for agent response...\n');
    const response = await agent.respond({
      messages: await validateUIMessages({ messages }),
    });

    if (!response.body) {
      console.log('⚠️  Response has no body');
      process.exit(1);
    }

    console.log('✅ Agent responded! Streaming results...\n');
    console.log('─'.repeat(60));
    console.log('');

    // Stream the response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        process.stdout.write(chunk);
        fullResponse += chunk;
      }
    } finally {
      reader.releaseLock();
    }

    console.log('\n');
    console.log('─'.repeat(60));
    console.log('\n✅ Test completed successfully!\n');

    if (fullResponse.trim().length === 0) {
      console.log('⚠️  Warning: Response was empty');
    } else {
      console.log(`✓ Received ${fullResponse.length} characters of response`);
    }

  } catch (error) {
    console.error('\n❌ Error during agent response:');
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testGoogleSheetQuery().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

