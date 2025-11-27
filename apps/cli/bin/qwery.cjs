#!/usr/bin/env node

const path = require('node:path');

if (!process.env.VITE_WORKING_DIR && !process.env.WORKSPACE) {
  process.env.VITE_WORKING_DIR = process.env.WORKING_DIR || 'workspace';
}

if (!process.env.WORKSPACE) {
  process.env.WORKSPACE = process.env.VITE_WORKING_DIR || 'workspace';
}

const distPath = path.resolve(__dirname, '../dist/index.js');
import(distPath)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

