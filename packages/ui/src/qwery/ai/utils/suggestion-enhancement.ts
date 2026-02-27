import {
  parseSuggestionWithMetadata,
  type SuggestionMatch,
  type SuggestionMetadata,
} from './suggestion-pattern';

const STREAMDOWN_RENDER_DELAY = 100;

export function generateSuggestionId(suggestionText: string): string {
  const cleanText = suggestionText.trim().replace(/^[•\-*\d+.)]\s*/, '');
  const textHash = cleanText.split('').reduce((acc: number, char: string) => {
    const hash = (acc << 5) - acc + char.charCodeAt(0);
    return hash & hash;
  }, 0);
  const hashString = Math.abs(textHash).toString(36);
  const slug = cleanText
    .substring(0, 20)
    .replace(/\s+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  return `suggestion-${hashString}-${slug}`;
}

export function generateParentConversationId(): string {
  return `parent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function cleanSuggestionPatterns(container: HTMLElement): void {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
  );
  const textNodes: Text[] = [];
  let node: Node | null = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      textNodes.push(node as Text);
    }
    node = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const text = textNode.textContent || '';
    if (text.includes('{{suggestion:')) {
      const cleaned = text.replace(
        /\{\{suggestion:\s*((?:(?!\}\})[\s\S])+)\}\}/g,
        (_, content: string) => parseSuggestionWithMetadata(content).text,
      );
      textNode.textContent = cleaned;
    }
  });
}

export interface SuggestionButtonHandlers {
  onClick: (
    suggestionText: string,
    sourceSuggestionId: string | undefined,
    metadata?: SuggestionMetadata,
  ) => void;
}

export interface SuggestionButtonConfig {
  suggestionText: string;
  suggestionId: string;
  handlers: SuggestionButtonHandlers;
  metadata?: SuggestionMetadata;
}

function createSuggestionButtonElement(
  suggestionText: string,
  suggestionId: string,
  handlers: SuggestionButtonHandlers,
): { container: HTMLSpanElement; cleanup: () => void } {
  const buttonContainer = document.createElement('span');
  buttonContainer.setAttribute('data-suggestion-button', 'true');
  buttonContainer.style.cssText =
    'display: inline-flex; align-items: center; margin-left: 8px; vertical-align: middle;';

  const button = document.createElement('button');
  button.setAttribute('data-suggestion-btn', 'true');
  button.setAttribute('type', 'button');
  button.setAttribute(
    'aria-label',
    `Send suggestion: ${suggestionText.substring(0, 50)}${suggestionText.length > 50 ? '...' : ''}`,
  );
  button.setAttribute('title', 'Send this suggestion');
  button.style.cssText =
    'transition: background-color 0.2s ease-in-out; height: 18px; width: 18px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; background: transparent; border: none; cursor: pointer; padding: 0; flex-shrink: 0;';

  const handleButtonHover = () => {
    button.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  };

  const handleButtonLeave = () => {
    button.style.backgroundColor = 'transparent';
  };

  button.addEventListener('mouseenter', handleButtonHover);
  button.addEventListener('mouseleave', handleButtonLeave);

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('width', '12');
  icon.setAttribute('height', '12');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '2');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  icon.setAttribute('class', 'text-muted-foreground');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z');
  icon.appendChild(path);
  button.appendChild(icon);

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    let cleanSuggestionText = suggestionText.trim();
    cleanSuggestionText = cleanSuggestionText.replace(/^[•\-*\d+.)]\s*/, '');

    const suggestionElement = (e.target as HTMLElement).closest(
      '[data-suggestion-id]',
    );
    const sourceSuggestionId =
      suggestionElement?.getAttribute('data-suggestion-id') || undefined;
    const metadata: SuggestionMetadata | undefined =
      suggestionElement?.getAttribute('data-requires-datasource') === 'true'
        ? { requiresDatasource: true }
        : undefined;

    console.log('[SuggestionFlow] button click', {
      text: cleanSuggestionText?.slice(0, 50),
      sourceSuggestionId,
      metadata,
      dataRequires: suggestionElement?.getAttribute('data-requires-datasource'),
    });
    handlers.onClick(cleanSuggestionText, sourceSuggestionId, metadata);
  });

  buttonContainer.appendChild(button);

  return {
    container: buttonContainer,
    cleanup: () => {
      button.removeEventListener('mouseenter', handleButtonHover);
      button.removeEventListener('mouseleave', handleButtonLeave);
    },
  };
}

export interface CreateSuggestionButtonOptions {
  omitText?: boolean;
}

export function createSuggestionButton(
  element: Element,
  config: SuggestionButtonConfig,
  options?: CreateSuggestionButtonOptions,
): { cleanup: () => void } {
  const { suggestionText, suggestionId, handlers, metadata } = config;

  if (element.querySelector('[data-suggestion-button]')) {
    return { cleanup: () => {} };
  }

  element.setAttribute('data-suggestion-id', suggestionId);
  if (metadata?.requiresDatasource) {
    element.setAttribute('data-requires-datasource', 'true');
  }

  if (options?.omitText) {
    element.textContent = '';
  }

  const { container, cleanup } = createSuggestionButtonElement(
    suggestionText,
    suggestionId,
    handlers,
  );
  element.appendChild(container);

  return { cleanup };
}

export interface InjectMultipleSuggestionButtonsOptions {
  omitText?: boolean;
}

export function injectMultipleSuggestionButtons(
  element: Element,
  matches: SuggestionMatch[],
  handlers: SuggestionButtonHandlers,
  generateSuggestionId: (text: string) => string,
  options?: InjectMultipleSuggestionButtonsOptions,
): { cleanup: () => void } {
  if (
    matches.length === 0 ||
    element.querySelector('[data-suggestion-button]')
  ) {
    return { cleanup: () => {} };
  }

  const omitText = options?.omitText ?? false;
  const fullText = element.textContent || '';
  const fragment = document.createDocumentFragment();
  const cleanups: Array<() => void> = [];

  if (omitText) {
    const wrapper = document.createElement('span');
    wrapper.setAttribute('data-suggestion-buttons-only', 'true');
    wrapper.style.display = 'inline-flex';
    wrapper.style.flexWrap = 'wrap';
    wrapper.style.gap = '0.5rem';
    wrapper.style.alignItems = 'center';

    for (const match of matches) {
      const span = document.createElement('span');
      span.setAttribute('data-suggestion-id', generateSuggestionId(match.text));
      if (match.metadata?.requiresDatasource) {
        span.setAttribute('data-requires-datasource', 'true');
      }
      span.style.display = 'inline-flex';
      span.style.alignItems = 'center';

      const { container, cleanup } = createSuggestionButtonElement(
        match.text,
        generateSuggestionId(match.text),
        handlers,
      );
      span.appendChild(container);
      cleanups.push(cleanup);
      wrapper.appendChild(span);
    }

    element.textContent = '';
    element.appendChild(wrapper);
  } else {
    let prevEnd = 0;

    for (const match of matches) {
      if (prevEnd < match.startIndex) {
        const between = fullText.slice(prevEnd, match.startIndex);
        if (prevEnd === 0) {
          fragment.appendChild(document.createTextNode(between));
        } else {
          fragment.appendChild(document.createTextNode(', '));
        }
      }

      const span = document.createElement('span');
      span.setAttribute('data-suggestion-id', generateSuggestionId(match.text));
      if (match.metadata?.requiresDatasource) {
        span.setAttribute('data-requires-datasource', 'true');
      }
      span.style.display = 'inline';

      span.appendChild(document.createTextNode(match.text));
      span.style.cursor = 'pointer';
      span.style.textDecoration = 'underline';
      span.title = 'Send suggestion';
      span.setAttribute('aria-label', 'Send suggestion');

      const handleClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        let cleanSuggestionText = match.text.trim();
        cleanSuggestionText = cleanSuggestionText.replace(
          /^[•\-*\d+.)]\s*/,
          '',
        );

        const suggestionElement = (e.target as HTMLElement).closest(
          '[data-suggestion-id]',
        );
        const sourceSuggestionId =
          suggestionElement?.getAttribute('data-suggestion-id') || undefined;
        const metadata: SuggestionMetadata | undefined =
          suggestionElement?.getAttribute('data-requires-datasource') === 'true'
            ? { requiresDatasource: true }
            : undefined;

        handlers.onClick(cleanSuggestionText, sourceSuggestionId, metadata);
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick(e as unknown as MouseEvent);
        }
      };

      span.addEventListener('click', handleClick);
      span.addEventListener('keydown', handleKeyDown);

      cleanups.push(() => {
        span.removeEventListener('click', handleClick);
        span.removeEventListener('keydown', handleKeyDown);
      });

      fragment.appendChild(span);
      prevEnd = match.endIndex;
    }

    if (prevEnd < fullText.length) {
      fragment.appendChild(document.createTextNode(fullText.slice(prevEnd)));
    }

    element.textContent = '';
    element.appendChild(fragment);
  }

  return {
    cleanup: () => {
      cleanups.forEach((c) => c());
    },
  };
}

export { STREAMDOWN_RENDER_DELAY };
