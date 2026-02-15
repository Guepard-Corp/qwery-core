#!/usr/bin/env node
/**
 * Validates that the Tauri extensions bundle configuration is correct.
 * Run from apps/desktop: node scripts/validate-extensions-bundle.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcTauriDir = path.resolve(__dirname, '../src-tauri');
const extensionsPath = path.resolve(srcTauriDir, '../../../packages/extensions');

function validate() {
  let hasErrors = false;

  if (!fs.existsSync(extensionsPath)) {
    console.error(`❌ Extensions path does not exist: ${extensionsPath}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(extensionsPath, { withFileTypes: true });
  const extensionDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));

  if (extensionDirs.length === 0) {
    console.error(`❌ No extension packages found in ${extensionsPath}`);
    process.exit(1);
  }

  const missingPackageJson = extensionDirs.filter((d) => {
    const pkgPath = path.join(extensionsPath, d.name, 'package.json');
    return !fs.existsSync(pkgPath);
  });

  if (missingPackageJson.length > 0) {
    console.error(
      `❌ Extension dirs missing package.json: ${missingPackageJson.map((d) => d.name).join(', ')}`,
    );
    hasErrors = true;
  }

  console.log(`✓ Extensions path exists: ${extensionsPath}`);
  console.log(`✓ Found ${extensionDirs.length} extension packages`);
  extensionDirs.forEach((d) => {
    const hasPkg = fs.existsSync(path.join(extensionsPath, d.name, 'package.json'));
    console.log(`  - ${d.name}${hasPkg ? '' : ' (missing package.json)'}`);
  });

  if (hasErrors) {
    process.exit(1);
  }

  console.log('\n✓ Tauri extensions bundle configuration is valid');
}

validate();
