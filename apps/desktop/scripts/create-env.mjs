import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const envContent = `VITE_DESKTOP_APP=true
ELECTRON=true
VITE_PRODUCT_NAME=Qwery Studio
VITE_SITE_TITLE=Qwery Studio
VITE_SITE_DESCRIPTION=Qwery Studio Desktop
VITE_SITE_URL=http://localhost:3000
VITE_DEFAULT_LOCALE=en
VITE_DEFAULT_THEME_MODE=light
VITE_THEME_COLOR=#0ea5e9
VITE_THEME_COLOR_DARK=#0f172a
VITE_CI=false
`;

const envPath = path.resolve(import.meta.dirname, '../../web/.env');
await writeFile(envPath, envContent, 'utf-8');
console.log('Created .env file at:', envPath);

