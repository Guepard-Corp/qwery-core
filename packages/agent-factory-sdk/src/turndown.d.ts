declare module 'turndown' {
  interface TurndownOptions {
    headingStyle?: string;
    hr?: string;
    bulletListMarker?: string;
    codeBlockStyle?: string;
    emDelimiter?: string;
  }
  class TurndownService {
    constructor(options?: TurndownOptions);
    remove(selectors: string[]): void;
    turndown(html: string): string;
  }
  export = TurndownService;
}
