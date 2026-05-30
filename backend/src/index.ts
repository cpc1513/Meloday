import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import app from './app.js';
import { initDb } from './db.js';
import { initApiKey } from './services/apikey.js';

const PORT = process.env.PORT || 3000;

initDb().then(async () => {
  await initApiKey();
  app.listen(Number(PORT), '127.0.0.1', () => {
    console.log(`Meloday backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to init database:', err);
  process.exit(1);
});