/**
 * Utility functions for smooth scrolling within scrollable containers
 */

// Track if styles have been injected
let stylesInjected = false;

/**
 * Injects CSS styles for suggestion highlighting
 * Only injects once to avoid duplicate styles
 */
function injectHighlightStyles(): void {
  if (stylesInjected || typeof document === 'undefined') return;

  const styleId = 'qwery-suggestion-highlight-styles';
  if (document.getElementById(styleId)) {
    stylesInjected = true;
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* High specificity selector to override markdown styles */
    /* Yellow highlighter pen effect with white stroke - using notebook unsaved color #ffcb51 */
    /* Fade out suggestion button when highlighted */
    [data-suggestion-id].suggestion-highlight [data-suggestion-button],
    li[data-suggestion-id].suggestion-highlight [data-suggestion-button],
    p[data-suggestion-id].suggestion-highlight [data-suggestion-button] {
      opacity: 0 !important;
      transform: scale(0.8) !important;
      pointer-events: none !important;
      transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    /* Default state for suggestion button */
    [data-suggestion-id] [data-suggestion-button],
    li[data-suggestion-id] [data-suggestion-button],
    p[data-suggestion-id] [data-suggestion-button] {
      opacity: 1 !important;
      transform: scale(1) !important;
      transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    [data-suggestion-id].suggestion-highlight,
    li[data-suggestion-id].suggestion-highlight,
    p[data-suggestion-id].suggestion-highlight {
      position: relative !important;
      background: linear-gradient(
        to bottom,
        rgba(255, 203, 81, 0.25) 0%,
        rgba(255, 203, 81, 0.35) 50%,
        rgba(255, 203, 81, 0.25) 100%
      ) !important;
      border: 1.5px solid rgba(255, 255, 255, 0.9) !important;
      border-style: solid !important;
      border-width: 1.5px !important;
      border-color: rgba(255, 255, 255, 0.9) !important;
      border-radius: 3px !important;
      padding: 2px 4px 2px 4px !important;
      padding-right: 24px !important;
      margin: -2px -4px -2px -4px !important;
      margin-right: 20px !important;
      box-shadow: 
        0 1px 2px rgba(0, 0, 0, 0.1),
        inset 0 0 2px rgba(255, 203, 81, 0.2) !important;
      transition: background 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                  border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                  box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
      z-index: 10 !important;
      overflow: visible !important;
    }

    [data-suggestion-id].suggestion-highlight-fade-in,
    li[data-suggestion-id].suggestion-highlight-fade-in,
    p[data-suggestion-id].suggestion-highlight-fade-in {
      animation: suggestion-highlight-fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
    }

    @keyframes suggestion-highlight-fade-in {
      0% {
        background: transparent;
        border-width: 0px !important;
        border-color: transparent !important;
        box-shadow: none;
      }
      100% {
        background: linear-gradient(
          to bottom,
          rgba(255, 203, 81, 0.25) 0%,
          rgba(255, 203, 81, 0.35) 50%,
          rgba(255, 203, 81, 0.25) 100%
        );
        border-width: 1.5px !important;
        border-color: rgba(255, 255, 255, 0.9) !important;
        box-shadow: 
          0 1px 2px rgba(0, 0, 0, 0.1),
          inset 0 0 2px rgba(255, 203, 81, 0.2);
      }
    }

    /* Dark mode adjustment for yellow highlighter */
    .dark [data-suggestion-id].suggestion-highlight,
    .dark li[data-suggestion-id].suggestion-highlight,
    .dark p[data-suggestion-id].suggestion-highlight {
      background: linear-gradient(
        to bottom,
        rgba(255, 203, 81, 0.2) 0%,
        rgba(255, 203, 81, 0.3) 50%,
        rgba(255, 203, 81, 0.2) 100%
      ) !important;
      border-color: rgba(255, 255, 255, 0.7) !important;
    }

    .dark [data-suggestion-id].suggestion-highlight-fade-in,
    .dark li[data-suggestion-id].suggestion-highlight-fade-in,
    .dark p[data-suggestion-id].suggestion-highlight-fade-in {
      animation: suggestion-highlight-fade-in-dark 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
    }

    @keyframes suggestion-highlight-fade-in-dark {
      0% {
        background: transparent;
        border-width: 0px !important;
        border-color: transparent !important;
        box-shadow: none;
      }
      100% {
        background: linear-gradient(
          to bottom,
          rgba(255, 203, 81, 0.2) 0%,
          rgba(255, 203, 81, 0.3) 50%,
          rgba(255, 203, 81, 0.2) 100%
        );
        border-width: 1.5px !important;
        border-color: rgba(255, 255, 255, 0.7) !important;
        box-shadow: 
          0 1px 2px rgba(0, 0, 0, 0.1),
          inset 0 0 2px rgba(255, 203, 81, 0.2);
      }
    }

    [data-suggestion-id].suggestion-highlight-fade-out,
    li[data-suggestion-id].suggestion-highlight-fade-out,
    p[data-suggestion-id].suggestion-highlight-fade-out {
      animation: suggestion-highlight-fade-out 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
    }

    @keyframes suggestion-highlight-fade-out {
      0% {
        background: linear-gradient(
          to bottom,
          rgba(255, 203, 81, 0.25) 0%,
          rgba(255, 203, 81, 0.35) 50%,
          rgba(255, 203, 81, 0.25) 100%
        );
        border-width: 1.5px !important;
        border-color: rgba(255, 255, 255, 0.9) !important;
        box-shadow: 
          0 1px 2px rgba(0, 0, 0, 0.1),
          inset 0 0 2px rgba(255, 203, 81, 0.2);
      }
      100% {
        background: transparent;
        border-width: 0px !important;
        border-color: transparent !important;
        box-shadow: none;
      }
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

// Track active highlight timeout for cleanup
let activeHighlightTimeout: ReturnType<typeof setTimeout> | null = null;
let activeHighlightElement: HTMLElement | null = null;

/**
 * Removes highlight from all elements
 */
function removeAllHighlights(): void {
  if (activeHighlightTimeout) {
    clearTimeout(activeHighlightTimeout);
    activeHighlightTimeout = null;
  }

  if (activeHighlightElement) {
    activeHighlightElement.classList.remove(
      'suggestion-highlight',
      'suggestion-highlight-fade-out',
      'suggestion-highlight-fade-in',
    );
    activeHighlightElement = null;
  }

  // Also remove from any other elements that might have the class
  document
    .querySelectorAll(
      '[data-suggestion-id].suggestion-highlight, [data-suggestion-id].suggestion-highlight-fade-out, [data-suggestion-id].suggestion-highlight-fade-in',
    )
    .forEach((el) => {
      el.classList.remove(
        'suggestion-highlight',
        'suggestion-highlight-fade-out',
        'suggestion-highlight-fade-in',
      );
    });
}

/**
 * Adds highlight to an element and schedules its removal
 */
function addHighlight(element: HTMLElement, duration: number = 2500): void {
  // Remove previous highlights
  removeAllHighlights();

  // Ensure styles are injected
  injectHighlightStyles();

  // Verify element has data-suggestion-id attribute
  if (!element.hasAttribute('data-suggestion-id')) {
    console.warn(
      '[ScrollHighlight] Element missing data-suggestion-id attribute:',
      element,
    );
    return;
  }

  // Add fade-in class first, then highlight class
  element.classList.add('suggestion-highlight-fade-in', 'suggestion-highlight');
  activeHighlightElement = element;

  // Force a reflow to ensure styles are applied
  void element.offsetHeight;

  // Debug log
  console.log('[ScrollHighlight] Added highlight to element:', {
    selector: `[data-suggestion-id="${element.getAttribute('data-suggestion-id')}"]`,
    hasClass: element.classList.contains('suggestion-highlight'),
    computedStyle: window.getComputedStyle(element).border,
  });

  // Remove fade-in class after animation completes
  setTimeout(() => {
    if (element && element.classList.contains('suggestion-highlight-fade-in')) {
      element.classList.remove('suggestion-highlight-fade-in');
    }
  }, 500); // Match fade-in animation duration

  // Schedule fade-out and removal
  activeHighlightTimeout = setTimeout(() => {
    if (element && element.classList.contains('suggestion-highlight')) {
      element.classList.add('suggestion-highlight-fade-out');
      element.classList.remove('suggestion-highlight');

      // Remove fade-out class after animation completes
      setTimeout(() => {
        if (element) {
          element.classList.remove('suggestion-highlight-fade-out');
        }
        if (activeHighlightElement === element) {
          activeHighlightElement = null;
        }
      }, 600); // Match fade-out animation duration
    }
    activeHighlightTimeout = null;
  }, duration);
}

/**
 * Finds the scrollable parent container of an element
 */
function findScrollableParent(element: HTMLElement | null): HTMLElement | null {
  if (!element) return null;

  let parent = element.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const overflow = style.overflow;

    // Check if this element is scrollable
    if (
      (overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflow === 'auto' ||
        overflow === 'scroll') &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }

    parent = parent.parentElement;
  }

  // Fallback to window if no scrollable parent found
  return null;
}

/**
 * Smoothly scrolls to an element within a scrollable container
 * Handles nested scrollable containers correctly
 */
export function scrollToElement(
  element: HTMLElement,
  options: {
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
    inline?: ScrollLogicalPosition;
    offset?: number;
  } = {},
): void {
  const {
    behavior = 'smooth',
    block = 'center',
    inline = 'nearest',
    offset = 0,
  } = options;

  // Find the scrollable parent container
  const scrollContainer = findScrollableParent(element);

  if (!scrollContainer) {
    // Fallback to native scrollIntoView
    element.scrollIntoView({ behavior, block, inline });
    return;
  }

  // Calculate the position of the element relative to the scroll container
  const containerRect = scrollContainer.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  // Calculate the scroll position needed
  const scrollTop = scrollContainer.scrollTop;
  const elementTop = elementRect.top - containerRect.top + scrollTop;
  const containerHeight = scrollContainer.clientHeight;
  const elementHeight = elementRect.height;

  // Calculate target scroll position based on block option
  let targetScrollTop: number;

  if (block === 'center') {
    targetScrollTop =
      elementTop - containerHeight / 2 + elementHeight / 2 + offset;
  } else if (block === 'start') {
    targetScrollTop = elementTop + offset;
  } else if (block === 'end') {
    targetScrollTop = elementTop - containerHeight + elementHeight + offset;
  } else {
    targetScrollTop = elementTop + offset;
  }

  // Ensure we don't scroll beyond bounds
  targetScrollTop = Math.max(
    0,
    Math.min(targetScrollTop, scrollContainer.scrollHeight - containerHeight),
  );

  // Perform smooth scroll
  scrollContainer.scrollTo({
    top: targetScrollTop,
    behavior,
  });
}

/**
 * Scrolls to an element by selector
 * Includes retry logic for elements that may not be rendered yet
 * Automatically highlights the element after scrolling
 */
export function scrollToElementBySelector(
  selector: string,
  options: {
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
    inline?: ScrollLogicalPosition;
    offset?: number;
    maxRetries?: number;
    highlightDuration?: number; // Duration in ms for highlight (default: 2500)
    enableHighlight?: boolean; // Whether to enable highlighting (default: true)
  } = {},
): boolean {
  const maxRetries = options.maxRetries ?? 3;
  const enableHighlight = options.enableHighlight !== false; // Default to true
  const highlightDuration = options.highlightDuration ?? 2500;
  let retryCount = 0;

  const attemptScroll = (): boolean => {
    const element = document.querySelector(selector) as HTMLElement | null;

    if (!element) {
      if (retryCount < maxRetries) {
        retryCount++;
        // Retry after a short delay (element might not be rendered yet)
        setTimeout(attemptScroll, 200);
        return false;
      }
      console.warn('Element not found after retries:', selector);
      return false;
    }

    // Scroll to element
    scrollToElement(element, {
      behavior: options.behavior,
      block: options.block,
      inline: options.inline,
      offset: options.offset,
    });

    // Add highlight after scroll completes (wait for smooth scroll animation)
    if (enableHighlight) {
      const scrollContainer = findScrollableParent(element);
      const isSmoothScroll = options.behavior === 'smooth';

      const triggerHighlight = () => {
        // Small delay after scroll ends to ensure element is fully visible and animation can start smoothly
        setTimeout(() => {
          const currentElement = document.querySelector(
            selector,
          ) as HTMLElement | null;
          if (currentElement) {
            addHighlight(currentElement, highlightDuration);
          } else {
            console.warn(
              '[ScrollHighlight] Element not found for highlighting:',
              selector,
            );
          }
        }, 150);
      };

      if (isSmoothScroll && scrollContainer) {
        // Try to use scrollend event if available (modern browsers)
        if ('onscrollend' in scrollContainer) {
          scrollContainer.addEventListener('scrollend', triggerHighlight, {
            once: true,
          });
          // Fallback timeout in case scrollend doesn't fire (max 1.2s wait)
          setTimeout(triggerHighlight, 1200);
        } else {
          // Fallback: monitor scroll position to detect when scrolling stops
          let lastScrollTop = (scrollContainer as HTMLElement).scrollTop;
          let scrollCheckInterval: ReturnType<typeof setInterval> | null = null;
          let hasTriggered = false;

          const checkScrollStop = () => {
            if (hasTriggered) return;

            const currentScrollTop = (scrollContainer as HTMLElement).scrollTop;

            if (Math.abs(currentScrollTop - lastScrollTop) < 1) {
              // Scrolling has stopped (within 1px tolerance)
              if (scrollCheckInterval) {
                clearInterval(scrollCheckInterval);
                scrollCheckInterval = null;
              }
              hasTriggered = true;
              triggerHighlight();
            } else {
              lastScrollTop = currentScrollTop;
            }
          };

          // Start checking after scroll begins (100ms delay)
          setTimeout(() => {
            if (!hasTriggered) {
              scrollCheckInterval = setInterval(checkScrollStop, 50);
              // Maximum wait time fallback (1.2s total)
              setTimeout(() => {
                if (scrollCheckInterval) {
                  clearInterval(scrollCheckInterval);
                  scrollCheckInterval = null;
                }
                if (!hasTriggered) {
                  hasTriggered = true;
                  triggerHighlight();
                }
              }, 1100);
            }
          }, 100);
        }
      } else {
        // Instant scroll or no container - highlight with small delay
        triggerHighlight();
      }
    }

    return true;
  };

  return attemptScroll();
}
