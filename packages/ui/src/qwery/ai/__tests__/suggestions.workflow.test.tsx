import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React, { useEffect, useRef, useState } from 'react';
import { useSuggestionDetection } from '../hooks/use-suggestion-detection';
import { useSuggestionEnhancement } from '../hooks/use-suggestion-enhancement';

function DetectionTestComponent({
  html,
  isReady,
  contentKey,
}: {
  html: string;
  isReady: boolean;
  contentKey: unknown;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      setContainerEl(containerRef.current);
    }
  }, [html]);

  const detected = useSuggestionDetection({
    containerElement: containerEl,
    isReady,
    contentKey,
  });

  return (
    <div>
      <div
        ref={containerRef}
        data-testid="container"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <div data-testid="detected-count">{detected.length}</div>
      {detected.map((d, index) => (
        <div key={index} data-testid={`detected-${index}`}>
          {d.suggestionText}
        </div>
      ))}
    </div>
  );
}

function EnhancementPipelineTest({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      setContainerEl(containerRef.current);
    }
  }, [html]);

  const detected = useSuggestionDetection({
    containerElement: containerEl,
    isReady: true,
    contentKey: html,
  });

  useSuggestionEnhancement({
    detectedSuggestions: detected,
    containerElement: containerEl,
    sendMessage: () => Promise.resolve(),
    contextMessages: {},
    scrollToBottom: () => {},
    disabled: false,
    isLastAgentResponse: true,
    onBeforeSuggestionSend: undefined,
  });

  return (
    <div
      ref={containerRef}
      data-testid="root"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

describe('useSuggestionDetection', () => {
  it('returns empty list when container is null or not ready', async () => {
    render(
      <DetectionTestComponent
        html="<p>{{suggestion: Run a query}}</p>"
        isReady={false}
        contentKey="initial"
      />,
    );

    const count = await screen.findByTestId('detected-count');
    expect(count.textContent).toBe('0');
  });

  it('detects suggestions in rendered markdown once ready', async () => {
    render(
      <DetectionTestComponent
        html="<p>{{suggestion: Run a query}}</p>"
        isReady
        contentKey="ready-1"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('detected-count').textContent).toBe('1');
    });

    expect(screen.getByTestId('detected-0').textContent).toBe('Run a query');
  });

  it('updates detection when contentKey changes with new DOM content', async () => {
    const { rerender } = render(
      <DetectionTestComponent
        html="<p>No suggestions</p>"
        isReady
        contentKey="v1"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('detected-count').textContent).toBe('0');
    });

    rerender(
      <DetectionTestComponent
        html="<p>{{suggestion: New follow-up}}</p>"
        isReady
        contentKey="v2"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('detected-count').textContent).toBe('1');
    });
    expect(screen.getByTestId('detected-0').textContent).toBe('New follow-up');
  });
});

describe('useSuggestionEnhancement pipeline', () => {
  it('injects suggestion button into DOM for detected suggestion', async () => {
    render(
      <EnhancementPipelineTest html="<p>{{suggestion: Click here}}</p>" />,
    );

    await waitFor(() => {
      const root = screen.getByTestId('root');
      const button = root.querySelector('[data-suggestion-button]');
      expect(button).not.toBeNull();
    });
  });

  it('does not accumulate duplicate suggestion buttons on re-render', async () => {
    const html = '<p>{{suggestion: Click here}}</p>';
    const { rerender } = render(<EnhancementPipelineTest html={html} />);

    await waitFor(() => {
      const root = screen.getByTestId('root');
      const buttons = root.querySelectorAll('[data-suggestion-button]');
      expect(buttons.length).toBe(1);
    });

    rerender(<EnhancementPipelineTest html={html} />);

    await waitFor(() => {
      const root = screen.getByTestId('root');
      const buttons = root.querySelectorAll('[data-suggestion-button]');
      expect(buttons.length).toBe(1);
    });
  });
});
