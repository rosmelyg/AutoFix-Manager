import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = process.env.NODE_ENV || 'development';
const envFile = env === 'qa' ? '.env.qa' : '.env';

dotenv.config({
  path: path.resolve(__dirname, `../${envFile}`)
});