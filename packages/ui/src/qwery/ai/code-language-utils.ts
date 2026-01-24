type Language = 
  | 'sql'
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'swift'
  | 'kotlin'
  | 'html'
  | 'css'
  | 'json'
  | 'yaml'
  | 'xml'
  | 'markdown'
  | 'bash'
  | 'shell'
  | 'powershell'
  | 'dockerfile'
  | 'graphql'
  | 'text';

const LANGUAGE_KEYWORDS: Record<Language, string[]> = {
  sql: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'FROM', 'WHERE', 'JOIN', 'INNER', 'OUTER', 'LEFT', 'RIGHT', 'GROUP BY', 'ORDER BY', 'HAVING', 'UNION', 'EXCEPT', 'INTERSECT'],
  javascript: ['function', 'const', 'let', 'var', '=>', 'async', 'await', 'import', 'export', 'class', 'extends', 'this'],
  typescript: ['interface', 'type', 'enum', 'namespace', 'declare', 'as', ':', '?', 'readonly', 'public', 'private', 'protected'],
  python: ['def', 'class', 'import', 'from', 'if __name__', 'lambda', 'yield', 'async', 'await', 'try', 'except', 'finally'],
  java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'package', 'import', 'static', 'void', 'main'],
  cpp: ['#include', 'using namespace', 'std::', 'cout', 'cin', 'int main', 'class', 'public:', 'private:', 'protected:'],
  csharp: ['using', 'namespace', 'class', 'public', 'private', 'protected', 'static', 'void', 'Main', 'Console.WriteLine'],
  go: ['package', 'import', 'func', 'var', 'const', 'type', 'struct', 'interface', 'if err != nil', 'fmt.Println'],
  rust: ['fn', 'let', 'mut', 'struct', 'enum', 'impl', 'trait', 'use', 'mod', 'pub', 'match', 'unwrap'],
  php: ['<?php', '<?=', 'function', 'class', 'namespace', 'use', 'public', 'private', 'protected', 'static', '$'],
  ruby: ['def', 'class', 'module', 'end', 'require', 'include', 'attr_accessor', 'attr_reader', 'attr_writer', 'do', 'end'],
  swift: ['func', 'class', 'struct', 'enum', 'protocol', 'extension', 'import', 'let', 'var', 'guard', 'if let'],
  kotlin: ['fun', 'class', 'data class', 'object', 'interface', 'enum class', 'import', 'val', 'var', 'when'],
  html: ['<!DOCTYPE', '<html', '<head', '<body', '<div', '<span', '<script', '<style', '<meta', '<link'],
  css: ['@media', '@keyframes', '@import', '@font-face', '{', '}', ':', ';', 'margin', 'padding', 'display', 'flex'],
  json: ['{', '}', '[', ']', '"', ':', ',', 'true', 'false', 'null'],
  yaml: ['---', ':', '- ', '|', '>', '&', '*', '!!'],
  xml: ['<?xml', '<', '>', '</', '/>', '<!DOCTYPE', '<![CDATA['],
  markdown: ['#', '##', '###', '**', '*', '_', '`', '```', '---', '>'],
  bash: ['#!/bin/bash', '#!/bin/sh', 'if [', 'then', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'echo', '$'],
  shell: ['#!/bin/bash', '#!/bin/sh', 'if [', 'then', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'echo', '$'],
  powershell: ['$', 'function', 'param', 'Write-Host', 'Get-', 'Set-', 'Import-Module', 'foreach', 'if', 'else'],
  dockerfile: ['FROM', 'RUN', 'CMD', 'ENTRYPOINT', 'COPY', 'ADD', 'ENV', 'EXPOSE', 'WORKDIR', 'USER'],
  graphql: ['query', 'mutation', 'subscription', 'type', 'interface', 'enum', 'input', 'schema', '{', '}'],
  text: [],
};

const LANGUAGE_LABELS: Record<Language, string> = {
  sql: 'SQL',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  ruby: 'Ruby',
  swift: 'Swift',
  kotlin: 'Kotlin',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  yaml: 'YAML',
  xml: 'XML',
  markdown: 'Markdown',
  bash: 'Bash',
  shell: 'Shell',
  powershell: 'PowerShell',
  dockerfile: 'Dockerfile',
  graphql: 'GraphQL',
  text: 'Code',
};

const LANGUAGE_EXTENSIONS: Record<Language, string> = {
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
  css: 'css',
  json: 'json',
  yaml: 'yaml',
  xml: 'xml',
  markdown: 'md',
  bash: 'sh',
  shell: 'sh',
  powershell: 'ps1',
  dockerfile: 'Dockerfile',
  graphql: 'graphql',
  text: 'txt',
};

export function detectCodeLanguage(
  code: string,
  className?: string,
): Language {
  if (!code || typeof code !== 'string') {
    return 'text';
  }

  const trimmedCode = code.trim();
  if (!trimmedCode) {
    return 'text';
  }

  if (className) {
    const languageMatch = className.match(/language-(\w+)/);
    if (languageMatch && languageMatch[1]) {
      const lang = languageMatch[1].toLowerCase() as Language;
      if (lang in LANGUAGE_LABELS) {
        return lang;
      }
    }
  }

  const upperCode = trimmedCode.toUpperCase();
  const codeLines = trimmedCode.split('\n').slice(0, 10);

  for (const [lang, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
    if (lang === 'text') continue;

    let matchCount = 0;
    for (const keyword of keywords) {
      if (upperCode.includes(keyword.toUpperCase())) {
        matchCount++;
      }
    }

    if (matchCount >= 2) {
      return lang as Language;
    }

    if (lang === 'sql' && matchCount >= 1) {
      return 'sql';
    }

    if (lang === 'html' && (upperCode.includes('<HTML') || upperCode.includes('<!DOCTYPE'))) {
      return 'html';
    }

    if (lang === 'json' && trimmedCode.trim().startsWith('{') && trimmedCode.trim().endsWith('}')) {
      try {
        JSON.parse(trimmedCode);
        return 'json';
      } catch {
      }
    }

    if (lang === 'yaml' && (codeLines[0]?.startsWith('---') || codeLines.some(line => line.includes(':') && !line.includes('{')))) {
      return 'yaml';
    }

    if (lang === 'xml' && (upperCode.includes('<?XML') || upperCode.includes('<!DOCTYPE'))) {
      return 'xml';
    }

    if (lang === 'dockerfile' && codeLines[0]?.toUpperCase().startsWith('FROM')) {
      return 'dockerfile';
    }

    if (lang === 'graphql' && (upperCode.includes('QUERY') || upperCode.includes('MUTATION') || upperCode.includes('TYPE '))) {
      return 'graphql';
    }
  }

  return 'text';
}

export function getLanguageLabel(language: Language): string {
  return LANGUAGE_LABELS[language] || 'Code';
}

export function getLanguageExtension(language: Language): string {
  return LANGUAGE_EXTENSIONS[language] || 'txt';
}

export function isSQL(language: Language): boolean {
  return language === 'sql';
}

