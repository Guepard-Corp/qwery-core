#!/usr/bin/env node

const [, , cmd, pathArg] = process.argv;

if (cmd === 'run') {
  const { execSync } = await import('node:child_process');
  const { config } = await import('dotenv');
  const { resolve, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  const projectCwd = process.cwd();

  // Load .env.test or .env.evals
  config({ path: resolve(projectCwd, '.env.test') });
  config({ path: resolve(projectCwd, '.env.evals') });

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const evalsDir = resolve(__dirname, '..');
  const runScript = resolve(evalsDir, 'bin/run.mjs');
  const target = pathArg ?? '__evals__';

  execSync(
    `npx tsx "${runScript}"`,
    {
      stdio: 'inherit',
      cwd: projectCwd,
      env: { ...process.env, EVALS_CWD: projectCwd, EVALS_PATH: target },
    },
  );
} else if (cmd === 'report') {
  const { execSync } = await import('node:child_process');
  const { config } = await import('dotenv');
  const { resolve, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  const projectCwd = process.cwd();

  config({ path: resolve(projectCwd, '.env.test') });
  config({ path: resolve(projectCwd, '.env.evals') });

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const evalsDir = resolve(__dirname, '..');
  const runScript = resolve(evalsDir, 'bin/run.mjs');
  const target = pathArg ?? '__evals__';

  execSync(
    `node --import tsx "${runScript}"`,
    {
      stdio: 'inherit',
      cwd: evalsDir,
      env: { ...process.env, EVALS_CWD: projectCwd, EVALS_PATH: target, ONLY_REPORT: 'true' },
    },
  );
} else if (cmd === 'preview') {
  const { createServer } = await import('node:http');
  const { readFile, stat } = await import('node:fs/promises');
  const { join, extname, resolve } = await import('node:path');

  const projectCwd = process.cwd();
  const evalsDir = resolve(projectCwd, 'evals');

  const PORT = 3000;
  const MIME_TYPES = {
    '.html': 'text/html',
    '.json': 'application/json',
    '.js': 'text/javascript',
    '.css': 'text/css',
  };

  const server = createServer(async (req, res) => {
    let filePath = join(evalsDir, req.url === '/' ? 'index.html' : req.url);

    // Prevent directory traversal
    if (!filePath.startsWith(evalsDir)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    try {
      const content = await readFile(filePath);
      const ext = extname(filePath).toLowerCase();
      res.setHeader('Content-Type', MIME_TYPES[ext] || 'text/plain');
      res.end(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.end('Not Found');
      } else {
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    }
  });

  server.listen(PORT, () => {
    console.log(`\n🚀 Preview server running at http://localhost:${PORT}`);
    console.log(`Serving reports from: ${evalsDir}`);
    console.log('Press Ctrl+C to stop.\n');
  });
} else {
  console.error('Usage: evals run [path] | evals preview');
  process.exit(1);
}
