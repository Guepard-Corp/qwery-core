import { copyFile } from 'node:fs/promises';
import path from 'node:path';

const templatePath = path.resolve(import.meta.dirname, '../.env.desktop');
const envPath = path.resolve(import.meta.dirname, '../../web/.env');

await copyFile(templatePath, envPath);
console.log('Copied desktop env file to:', envPath);

