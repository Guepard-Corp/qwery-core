/// <reference types="vitest/globals" />

import { afterEach, vi } from 'vitest';
import { createLangGraphAgent } from '../src/langgraph-agent';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

const azureConfig = {
  provider: 'azure' as const,
  apiKey: 'test-key',
  endpoint: 'https://azure.test',
  deployment: 'mock-deployment',
  apiVersion: '2024-04-01-preview',
  temperature: 0.1,
};

function mockAzureResponses(responses: string[]) {
  let callIndex = 0;
  const fetchMock = vi.fn().mockImplementation(async () => {
    const content = responses[Math.min(callIndex, responses.length - 1)];
    callIndex += 1;
    return new Response(
      JSON.stringify({
        choices: [
          {
            index: callIndex - 1,
            message: {
              content,
            },
          },
        ],
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('LangGraph Agent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should call the LLM and get a response', async () => {
    mockAzureResponses(['Hello, this is a test response']);

    // Create agent without tools to test basic LLM response
    const { app, llm } = createLangGraphAgent({
      llm: azureConfig,
    });

    // Verify the graph is compiled and ready
    expect(app).toBeDefined();
    expect(typeof app.invoke).toBe('function');
    expect(llm).toBeDefined();

    // Wait for the model to initialize
    // WebLLMChatModel uses MLCEngine directly and explicitly loads the model
    // The model download and initialization happens when we first invoke
    console.log(
      'Initializing model (this may take several minutes on first run - downloading and loading model)...',
    );
    console.log(
      'Please wait - model download and initialization can take 5-10 minutes on first run...',
    );

    // Use initProgressCallback to track model loading progress
    const { app: appWithProgress, llm: llmWithProgress } = createLangGraphAgent(
      {
        llm: azureConfig,
        initProgressCallback: (progress) => {
          if (progress.progress < 1) {
            console.log(
              `Model loading: ${Math.round(progress.progress * 100)}% - ${progress.text}`,
            );
          } else {
            console.log('Model loading complete!');
          }
        },
      },
    );

    // The first invoke will trigger model download and loading
    // WebLLMChatModel explicitly calls engine.reload() so it should work reliably
    console.log('Starting first invoke to trigger model loading...');
    await llmWithProgress.invoke([new HumanMessage('Hi')]);
    console.log('Model initialized successfully!');

    // Invoke the agent with a simple message
    const initialState = {
      messages: [new HumanMessage('Say "Hello, this is a test"')],
    };

    // Call the LLM through the agent
    // This will also trigger model loading if not already loaded
    console.log(
      'Invoking agent (this will load the model if not already loaded)...',
    );
    const result = await appWithProgress.invoke(initialState);
    console.log('Agent response received');

    // Verify we got a result with messages
    expect(result).toBeDefined();
    expect(result.messages).toBeDefined();
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages.length).toBeGreaterThan(0);

    // Check if we got an AI response
    const lastMessage = result.messages[result.messages.length - 1];
    expect(lastMessage).toBeDefined();
    expect(lastMessage instanceof AIMessage).toBe(true);

    // Verify the AI message has content
    const aiMessage = lastMessage as AIMessage;
    expect(aiMessage.content).toBeDefined();

    // Content can be string or array, both are valid
    const hasContent =
      (typeof aiMessage.content === 'string' && aiMessage.content.length > 0) ||
      (Array.isArray(aiMessage.content) && aiMessage.content.length > 0);

    expect(hasContent).toBe(true);

    // If content is a string, verify it's not empty
    if (typeof aiMessage.content === 'string') {
      expect(aiMessage.content.trim().length).toBeGreaterThan(0);
    }
  }, 600000); // 10 minutes timeout for model download and initialization on first run

  it('should not duplicate assistant messages in multi-turn conversations', async () => {
    mockAzureResponses([
      'First azure response for hello',
      'Completely different azure response for hi',
    ]);

    // Create agent without tools to test basic LLM response
    const { app } = createLangGraphAgent({
      llm: azureConfig,
      initProgressCallback: (progress) => {
        if (progress.progress < 1) {
          console.log(
            `Model loading: ${Math.round(progress.progress * 100)}% - ${progress.text}`,
          );
        } else {
          console.log('Model loading complete!');
        }
      },
    });

    // First turn: Send initial message
    const firstState = {
      messages: [new HumanMessage('hello')],
    };

    console.log('First turn: Sending "hello"...');
    const firstResult = await app.invoke(firstState);

    // Verify first response
    expect(firstResult).toBeDefined();
    expect(firstResult.messages).toBeDefined();
    expect(firstResult.messages.length).toBeGreaterThan(0);

    const firstAIMessage = firstResult.messages[
      firstResult.messages.length - 1
    ] as AIMessage;
    expect(firstAIMessage instanceof AIMessage).toBe(true);
    expect(firstAIMessage.content).toBeDefined();

    const firstResponseText =
      typeof firstAIMessage.content === 'string'
        ? firstAIMessage.content
        : Array.isArray(firstAIMessage.content)
          ? firstAIMessage.content
              .map((c) => (typeof c === 'string' ? c : ''))
              .join('')
          : '';

    expect(firstResponseText.trim().length).toBeGreaterThan(0);
    console.log(`First response: "${firstResponseText}"`);

    // Second turn: Send follow-up message with conversation history
    // This simulates a multi-turn conversation where the agent should NOT duplicate the first response
    const secondState = {
      messages: [
        new HumanMessage('hello'),
        firstAIMessage, // Include the first assistant response
        new HumanMessage('hi'), // New user message
      ],
    };

    console.log('Second turn: Sending "hi" after first response...');
    const secondResult = await app.invoke(secondState);

    // Verify second response
    expect(secondResult).toBeDefined();
    expect(secondResult.messages).toBeDefined();

    // Find the last AI message (should be the new response)
    const secondAIMessage = secondResult.messages[
      secondResult.messages.length - 1
    ] as AIMessage;
    expect(secondAIMessage instanceof AIMessage).toBe(true);
    expect(secondAIMessage.content).toBeDefined();

    const secondResponseText =
      typeof secondAIMessage.content === 'string'
        ? secondAIMessage.content
        : Array.isArray(secondAIMessage.content)
          ? secondAIMessage.content
              .map((c) => (typeof c === 'string' ? c : ''))
              .join('')
          : '';

    expect(secondResponseText.trim().length).toBeGreaterThan(0);
    console.log(`Second response: "${secondResponseText}"`);

    // CRITICAL: Verify the second response does NOT contain the first response text
    // The bug is that the assistant message is being duplicated, so we check that
    // the second response doesn't start with or contain the exact first response
    const firstResponseTrimmed = firstResponseText.trim();
    const secondResponseTrimmed = secondResponseText.trim();

    // The second response should NOT be identical to the first
    expect(secondResponseTrimmed).not.toBe(firstResponseTrimmed);

    // The second response should NOT start with the first response
    expect(secondResponseTrimmed.startsWith(firstResponseTrimmed)).toBe(false);

    // The second response should NOT contain the first response as a substring
    // (unless it's a very short common phrase, but we'll check for exact match)
    // We check if the first response appears as a complete phrase in the second
    const firstResponseWords = firstResponseTrimmed
      .split(/\s+/)
      .filter((w) => w.length > 0);
    if (firstResponseWords.length > 2) {
      // Only check if first response is substantial enough (more than 2 words)
      // to avoid false positives with common phrases
      expect(secondResponseTrimmed).not.toContain(firstResponseTrimmed);
    }

    // Additional check: Count occurrences of the first response in the second
    // If it appears more than once (or at all for substantial responses), that's a bug
    const occurrences = (
      secondResponseTrimmed.match(
        new RegExp(
          firstResponseTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          'g',
        ),
      ) || []
    ).length;
    if (firstResponseWords.length > 2) {
      expect(occurrences).toBe(0);
    }

    console.log('✓ Multi-turn test passed: No message duplication detected');
  }, 600000); // 10 minutes timeout for model download and initialization on first run
});
