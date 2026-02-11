/**
 * Add .js to relative imports in dist so Node ESM can resolve them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

for (const name of fs.readdirSync(distDir)) {
  if (!name.endsWith('.js')) continue;
  const filePath = path.join(distDir, name);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(
    /(from\s+['"])(\.\/[^'"]+?)(['"])/g,
    (_, prefix, spec, suffix) =>
      spec.endsWith('.js') ? `${prefix}${spec}${suffix}` : `${prefix}${spec}.js${suffix}`,
  );
  content = content.replace(
    /(from\s+['"][^'"]+\.json['"])(\s*;)/g,
    (_, importSpec, semi) => `${importSpec} with { type: "json" }${semi}`,
  );
  fs.writeFileSync(filePath, content);
}
