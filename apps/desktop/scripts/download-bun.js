#!/usr/bin/env node
/**
 * Downloads Bun binary for the current platform to src-tauri/binaries/ for Tauri sidecar.
 * Run from apps/desktop: node scripts/download-bun.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUN_VERSION = '1.3.9';
const BINARIES_DIR = path.resolve(__dirname, '../src-tauri/binaries');

const TARGET_TO_BUN_ZIP = {
  'aarch64-apple-darwin': 'bun-darwin-aarch64.zip',
  'x86_64-apple-darwin': 'bun-darwin-x64.zip',
  'x86_64-unknown-linux-gnu': 'bun-linux-x64.zip',
  'aarch64-unknown-linux-gnu': 'bun-linux-aarch64.zip',
  'x86_64-pc-windows-msvc': 'bun-windows-x64.zip',
};

function getTargetTriple() {
  try {
    return execSync('rustc --print host-tuple', { encoding: 'utf-8' }).trim();
  } catch {
    const platform = process.platform;
    const arch = process.arch;
    if (platform === 'darwin') return arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin';
    if (platform === 'win32') return 'x86_64-pc-windows-msvc';
    return arch === 'arm64' ? 'aarch64-unknown-linux-gnu' : 'x86_64-unknown-linux-gnu';
  }
}

async function downloadBun() {
  const target = getTargetTriple();
  const zipName = TARGET_TO_BUN_ZIP[target];
  if (!zipName) {
    console.error(`❌ Unsupported target: ${target}`);
    process.exit(1);
  }

  const ext = process.platform === 'win32' ? '.exe' : '';
  const outputName = `bun-${target}${ext}`;
  const outputPath = path.join(BINARIES_DIR, outputName);

  if (fs.existsSync(outputPath)) {
    console.log(`✓ Bun already exists: ${outputName}`);
    return;
  }

  const url = `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/${zipName}`;
  console.log(`Downloading Bun for ${target}...`);

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`❌ Failed to download: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const tmpZip = path.join(BINARIES_DIR, `bun-tmp-${Date.now()}.zip`);
  const tmpDir = path.join(BINARIES_DIR, `bun-tmp-${Date.now()}`);
  fs.mkdirSync(BINARIES_DIR, { recursive: true });
  fs.writeFileSync(tmpZip, buffer);

  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    if (process.platform === 'win32') {
      execSync(`powershell -Command "Expand-Archive -Path '${tmpZip}' -DestinationPath '${tmpDir}'"`, {
        stdio: 'inherit',
      });
    } else {
      execSync(`unzip -o -q "${tmpZip}" -d "${tmpDir}"`, { stdio: 'inherit' });
    }

    const bunInZip = process.platform === 'win32' ? 'bun.exe' : 'bun';
    const extractedPath = path.join(tmpDir, bunInZip);
    if (!fs.existsSync(extractedPath)) {
      const files = fs.readdirSync(tmpDir, { recursive: true });
      const bunFile = files.find((f) => f.endsWith('bun') || f.endsWith('bun.exe'));
      if (bunFile) {
        fs.renameSync(path.join(tmpDir, bunFile), outputPath);
      } else {
        throw new Error(`Could not find bun in archive. Contents: ${files.join(', ')}`);
      }
    } else {
      fs.renameSync(extractedPath, outputPath);
    }
    if (process.platform !== 'win32') {
      fs.chmodSync(outputPath, 0o755);
    }
  } finally {
    fs.unlinkSync(tmpZip);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log(`✓ Bun downloaded: ${outputName}`);
}

downloadBun().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
