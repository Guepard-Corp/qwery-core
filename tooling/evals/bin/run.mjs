#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const runnerPath = pathToFileURL(join(__dirname, '../src/runner.ts')).href;
await import(runnerPath);
