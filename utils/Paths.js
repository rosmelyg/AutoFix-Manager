import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, '../');
export const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
export const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
