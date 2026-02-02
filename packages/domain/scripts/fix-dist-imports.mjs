/**
 * Add .js to relative imports in dist so Node ESM can resolve them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

function fixDir(dir) {
  for (const name of fs.readdirSync(dir)) {
    const filePath = path.join(dir, name);
    if (fs.statSync(filePath).isDirectory()) {
      fixDir(filePath);
      continue;
    }
    if (!name.endsWith('.js')) continue;
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(
      /(from\s+['"])(\.\.[^'"]+?|\.\/[^'"]+?)(['"])/g,
      (_, prefix, spec, suffix) =>
        spec.endsWith('.js') ? `${prefix}${spec}${suffix}` : `${prefix}${spec}.js${suffix}`,
    );
    fs.writeFileSync(filePath, content);
  }
}

fixDir(distDir);
