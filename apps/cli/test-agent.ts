#!/usr/bin/env node

/**
 * Simple test script to verify the agent is working
 * Usage: node test-agent.ts
 */

import { TextToSqlAgent } from './dist/services/text-to-sql-agent.js';
import type { Datasource } from '@qwery/domain/entities';

// Mock datasource for testing
const testDatasource: Datasource = {
  id: 'test-datasource',
  name: 'test-db',
  datasource_provider: 'postgresql',
  config: {
    connectionUrl: 'postgresql://test:test@localhost:5432/test',
  },
  project_id: 'test-project',
  createdBy: 'test-user',
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function testAgent() {
  console.log('🧪 Testing TextToSqlAgent...\n');

  // Check environment variables
  const provider = process.env.VITE_AGENT_PROVIDER || process.env.AGENT_PROVIDER || 'azure';
  const hasAzureKey = !!process.env.AZURE_API_KEY;
  const hasAzureResource = !!process.env.AZURE_RESOURCE_NAME;

  console.log('Environment check:');
  console.log(`  Provider: ${provider}`);
  console.log(`  AZURE_API_KEY: ${hasAzureKey ? '✓ Set' : '✗ Missing'}`);
  console.log(`  AZURE_RESOURCE_NAME: ${hasAzureResource ? '✓ Set' : '✗ Missing'}`);
  console.log(`  AZURE_OPENAI_DEPLOYMENT: ${process.env.AZURE_OPENAI_DEPLOYMENT || 'Not set (will use default)'}\n`);

  if (!hasAzureKey || !hasAzureResource) {
    console.log('⚠️  Warning: Azure credentials not fully configured. Agent may fail.\n');
  }

  try {
    const agent = new TextToSqlAgent();
    
    console.log('📝 Initializing agent with test datasource...');
    // Note: This will fail if we can't connect to the DB, but that's okay for testing
    // We just want to see if the agent factory resolves the model correctly
    try {
      await agent.initialize(testDatasource);
      console.log('✓ Agent initialized successfully\n');
    } catch (error) {
      console.log('⚠️  Agent initialization failed (expected if DB not available):');
      console.log(`   ${error instanceof Error ? error.message : String(error)}\n`);
      console.log('   This is okay - we can still test model resolution.\n');
    }

    // Test model resolution directly
    console.log('🔍 Testing model resolution...');
    const { AgentFactory } = await import('@qwery/agent-factory-sdk');
    const factory = new AgentFactory();
    
    try {
      const model = factory.resolveModel(provider);
      console.log('✓ Model resolved successfully');
      console.log(`   Model type: ${typeof model}`);
      console.log(`   Model: ${model ? 'Resolved' : 'Null'}\n`);
    } catch (error) {
      console.log('✗ Model resolution failed:');
      console.log(`   ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    }

    // If we got here, the agent factory is working
    console.log('✅ Agent Factory is working correctly!');
    console.log('\nTo test with a real query:');
    console.log('1. Set up environment variables:');
    console.log('   export AZURE_API_KEY="your-key"');
    console.log('   export AZURE_RESOURCE_NAME="your-resource"');
    console.log('   export AZURE_OPENAI_DEPLOYMENT="gpt-5-mini"');
    console.log('2. Create a real datasource in the CLI');
    console.log('3. Use a natural language query in interactive mode\n');

  } catch (error) {
    console.error('❌ Test failed:');
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testAgent().catch(console.error);

