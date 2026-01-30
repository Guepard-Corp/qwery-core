import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import php from 'highlight.js/lib/languages/php';
import ruby from 'highlight.js/lib/languages/ruby';
import swift from 'highlight.js/lib/languages/swift';
import kotlin from 'highlight.js/lib/languages/kotlin';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import bash from 'highlight.js/lib/languages/bash';
import powershell from 'highlight.js/lib/languages/powershell';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import graphql from 'highlight.js/lib/languages/graphql';

hljs.registerLanguage('sql', sql);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('php', php);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('powershell', powershell);
hljs.registerLanguage('dockerfile', dockerfile);
hljs.registerLanguage('graphql', graphql);

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  sql: 'sql',
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  java: 'java',
  cpp: 'cpp',
  csharp: 'cs',
  go: 'go',
  rust: 'rs',
  php: 'php',
  ruby: 'rb',
  swift: 'swift',
  kotlin: 'kt',
  html: 'html',
  xml: 'xml',
  css: 'css',
  json: 'json',
  yaml: 'yaml',
  markdown: 'md',
  bash: 'sh',
  shell: 'sh',
  powershell: 'ps1',
  dockerfile: 'Dockerfile',
  graphql: 'graphql',
  text: 'txt',
};

export function detectCodeLanguage(code: string, className?: string): string {
  if (!code?.trim()) return 'text';

  if (className) {
    const match = className.match(/language-(\w+)/);
    if (match?.[1]) {
      const lang = match[1].toLowerCase();
      if (hljs.getLanguage(lang)) return lang;
    }
  }

  const result = hljs.highlightAuto(code);
  return result.language || 'text';
}

export function getLanguageLabel(language: string): string {
  const lang = hljs.getLanguage(language);
  return lang?.name || 'Code';
}

export function getLanguageExtension(language: string): string {
  return LANGUAGE_EXTENSIONS[language] || 'txt';
}

export function isSQL(language: string): boolean {
  return language === 'sql';
}
