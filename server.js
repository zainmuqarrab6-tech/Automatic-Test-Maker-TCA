import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure production dist exists before serving
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'))) {
  try {
    console.log('[Server] Production dist not found. Triggering automated build: npm run build...');
    execSync('npm run build', { stdio: 'pipe' });
    console.log('[Server] ✅ Automated build completed successfully!');
  } catch (err) {
    console.warn('[Server] Automated build notice:', err.message);
  }
}

// Serve static assets from both public and dist directories
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(distPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    academy: 'The Century Academy of Science, Commerce & Arts',
    mode: 'clean_standalone_web_app',
    timestamp: new Date().toISOString()
  });
});

// Single Page Application Fallback for Hostinger Web App
app.use((req, res) => {
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  const distIndex = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(publicIndex)) {
    res.sendFile(publicIndex);
  } else if (fs.existsSync(distIndex)) {
    res.sendFile(distIndex);
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>The Century Academy Test Maker</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f2744; color: white; text-align: center; }
          .card { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); padding: 2.5rem; border-radius: 14px; max-width: 480px; }
          h2 { margin: 0 0 0.5rem 0; color: #38bdf8; font-size: 1.5rem; }
          p { color: #cbd5e1; font-size: 0.95rem; line-height: 1.5; margin: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>The Century Academy</h2>
          <p>Test Maker portal is currently building and initializing. Please refresh in a few moments.</p>
        </div>
      </body>
      </html>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`[Hostinger Web App] The Century Academy Test Maker Server running on port ${PORT}`);
});
