#!/usr/bin/env node

/**
 * Simple test to verify agent factory is working
 * This tests if the model can be resolved from environment variables
 */

async function testAgentFactory() {
  console.log('🧪 Testing Agent Factory Setup...\n');

  // Check environment variables
  const provider = process.env.VITE_AGENT_PROVIDER || process.env.AGENT_PROVIDER || 'azure';
  const hasAzureKey = !!process.env.AZURE_API_KEY;
  const hasAzureResource = !!process.env.AZURE_RESOURCE_NAME;
  const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-mini';

  console.log('Environment Variables:');
  console.log(`  Provider: ${provider}`);
  console.log(`  AZURE_API_KEY: ${hasAzureKey ? '✓ Set' : '✗ Missing'}`);
  console.log(`  AZURE_RESOURCE_NAME: ${hasAzureResource ? '✓ Set' : '✗ Missing'}`);
  console.log(`  AZURE_OPENAI_DEPLOYMENT: ${azureDeployment}\n`);

  if (!hasAzureKey || !hasAzureResource) {
    console.log('⚠️  Warning: Azure credentials not fully configured.');
    console.log('   Set these environment variables:');
    console.log('   export AZURE_API_KEY="your-key"');
    console.log('   export AZURE_RESOURCE_NAME="your-resource"');
    console.log('   export AZURE_OPENAI_DEPLOYMENT="gpt-5-mini"\n');
  }

  try {
    // Import the agent factory SDK
    const { AgentFactory } = await import('@qwery/agent-factory-sdk');
    console.log('✓ Agent Factory SDK imported successfully\n');

    // Try to create an instance
    console.log('📝 Creating AgentFactory instance...');
    const factory = new AgentFactory();
    console.log('✓ AgentFactory created\n');

    // Try to resolve the model
    console.log('🔍 Testing model resolution...');
    try {
      const model = factory.resolveModel(provider);
      console.log('✓ Model resolved successfully!');
      console.log(`   Model type: ${typeof model}`);
      console.log(`   Model exists: ${model ? 'Yes' : 'No'}\n`);
      
      if (model) {
        console.log('✅ SUCCESS: Agent Factory is working correctly!');
        console.log('\nThe agent should work when you:');
        console.log('1. Create a datasource in the CLI');
        console.log('2. Use /use <datasource-id> to select it');
        console.log('3. Type a natural language query (e.g., "show me all users")\n');
        return true;
      } else {
        console.log('⚠️  Model resolved but is null/undefined');
        return false;
      }
    } catch (error) {
      console.log('✗ Model resolution failed:');
      console.log(`   ${error instanceof Error ? error.message : String(error)}\n`);
      
      if (error instanceof Error && error.message.includes('Missing required environment variable')) {
        console.log('💡 This means the environment variables are not set correctly.');
        console.log('   Make sure AZURE_API_KEY and AZURE_RESOURCE_NAME are set.\n');
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed:');
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    return false;
  }
}

testAgentFactory()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

