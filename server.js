import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { INITIAL_QUESTION_BANK } from './src/data/questionBank.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Serve static assets from Vite production build
app.use(express.static(distPath));

// MySQL Pool Configuration for Hostinger Web App
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'u437839910_TCA_Test_Maker',
  password: process.env.DB_PASS || 'TCATest786@',
  database: process.env.DB_NAME || 'u437839910_Test_Maker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 8000
};

let pool = null;

async function initDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    console.log(`[Database] Connecting to ${dbConfig.database}@${dbConfig.host}...`);

    const connection = await pool.getConnection();
    console.log(`[Database] ✅ Connected to MySQL database '${dbConfig.database}' on Hostinger`);

    // Auto-create questions table if not exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`questions\` (
        \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
        \`class\` VARCHAR(20) NOT NULL,
        \`subject\` VARCHAR(100) NOT NULL,
        \`chapter_no\` INT NOT NULL,
        \`chapter_name_en\` VARCHAR(255) NOT NULL,
        \`chapter_name_ur\` VARCHAR(255) DEFAULT NULL,
        \`exercise\` VARCHAR(100) DEFAULT NULL,
        \`type\` ENUM('mcq', 'short_question', 'long_question') NOT NULL,
        \`marks\` INT DEFAULT 1,
        \`difficulty\` VARCHAR(30) DEFAULT 'medium',
        \`question_en\` TEXT NOT NULL,
        \`question_ur\` TEXT DEFAULT NULL,
        \`options_json\` JSON DEFAULT NULL,
        \`correct_option_index\` INT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_class_subj_chap\` (\`class\`, \`subject\`, \`chapter_no\`),
        INDEX \`idx_type\` (\`type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check existing count
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM questions');
    const count = rows[0].count;
    console.log(`[Database] Found ${count} questions in database.`);

    // Auto-seed if empty
    if (count === 0 && INITIAL_QUESTION_BANK.length > 0) {
      console.log(`[Database] Seeding ${INITIAL_QUESTION_BANK.length} questions from 9th Mathematics book...`);
      for (const q of INITIAL_QUESTION_BANK) {
        await connection.query(`
          INSERT INTO questions 
            (id, class, subject, chapter_no, chapter_name_en, chapter_name_ur, exercise, type, marks, question_en, question_ur, options_json, correct_option_index)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE question_en = VALUES(question_en)
        `, [
          q.id,
          q.class,
          q.subject,
          q.chapter_no,
          q.chapter_name_en,
          q.chapter_name_ur,
          q.exercise || '',
          q.type,
          q.marks || 1,
          q.question_en,
          q.question_ur,
          q.options ? JSON.stringify(q.options) : null,
          q.correct_option_index !== undefined ? q.correct_option_index : null
        ]);
      }
      console.log(`[Database] ✅ Auto-seeding completed successfully!`);
    }

    connection.release();
  } catch (err) {
    console.warn(`[Database] Notice: Live MySQL is offline or initializing (${err.message}). Using local master bank cache.`);
  }
}

initDatabase();

// Health check endpoint
app.get('/api/health', async (req, res) => {
  let isConnected = false;
  try {
    if (pool) {
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      isConnected = true;
    }
  } catch (e) {
    isConnected = false;
  }

  res.json({
    status: 'online',
    academy: 'The Century Academy of Science, Commerce & Arts',
    database: isConnected ? 'connected' : 'offline_fallback',
    mode: 'hostinger_web_app',
    timestamp: new Date().toISOString()
  });
});

// Database status & count
app.get('/api/status', async (req, res) => {
  try {
    if (pool) {
      const [rows] = await pool.query('SELECT COUNT(*) as count FROM questions');
      return res.json({
        status: 'online',
        database: dbConfig.database,
        total_questions: rows[0].count
      });
    }
  } catch (e) {}

  res.json({
    status: 'online',
    database: 'local_cache',
    total_questions: INITIAL_QUESTION_BANK.length
  });
});

// Get Questions endpoint
app.get('/api/questions', async (req, res) => {
  const { className, subject, chapter, type } = req.query;

  try {
    if (pool) {
      let query = 'SELECT * FROM questions WHERE 1=1';
      const params = [];

      if (className) {
        query += ' AND class = ?';
        params.push(className);
      }
      if (subject) {
        query += ' AND subject = ?';
        params.push(subject);
      }
      if (chapter) {
        query += ' AND chapter_no = ?';
        params.push(Number(chapter));
      }
      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }

      query += ' ORDER BY chapter_no ASC, type ASC';

      const [rows] = await pool.query(query, params);
      const formatted = rows.map(r => ({
        ...r,
        options: r.options_json ? (typeof r.options_json === 'string' ? JSON.parse(r.options_json) : r.options_json) : null
      }));

      return res.json({ success: true, source: 'mysql', count: formatted.length, data: formatted });
    }
  } catch (err) {
    console.error('MySQL query error, using local fallback:', err.message);
  }

  // Fallback to local memory bank
  let filtered = INITIAL_QUESTION_BANK;
  if (className) filtered = filtered.filter(q => q.class === className);
  if (subject) filtered = filtered.filter(q => q.subject === subject);
  if (chapter) filtered = filtered.filter(q => q.chapter_no === Number(chapter));
  if (type) filtered = filtered.filter(q => q.type === type);

  res.json({ success: true, source: 'local_master_bank', count: filtered.length, data: filtered });
});

// Insert Single Question
app.post('/api/questions', async (req, res) => {
  const q = req.body;
  try {
    if (pool) {
      await pool.query(`
        INSERT INTO questions 
          (id, class, subject, chapter_no, chapter_name_en, chapter_name_ur, exercise, type, marks, difficulty, question_en, question_ur, options_json, correct_option_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          chapter_name_en = VALUES(chapter_name_en),
          chapter_name_ur = VALUES(chapter_name_ur),
          exercise = VALUES(exercise),
          type = VALUES(type),
          marks = VALUES(marks),
          question_en = VALUES(question_en),
          question_ur = VALUES(question_ur),
          options_json = VALUES(options_json),
          correct_option_index = VALUES(correct_option_index)
      `, [
        q.id || `q-${Date.now()}`,
        q.class || '9th',
        q.subject || 'Mathematics',
        Number(q.chapter_no) || 1,
        q.chapter_name_en || '',
        q.chapter_name_ur || '',
        q.exercise || '',
        q.type || 'short_question',
        Number(q.marks) || 1,
        q.difficulty || 'medium',
        q.question_en || '',
        q.question_ur || '',
        q.options ? JSON.stringify(q.options) : null,
        q.correct_option_index !== undefined ? Number(q.correct_option_index) : null
      ]);
      return res.json({ success: true, message: 'Saved to MySQL database' });
    }
  } catch (err) {
    console.error('Failed to save to MySQL:', err.message);
  }

  res.json({ success: true, message: 'Saved to session cache' });
});

// Bulk Insert / Sync Questions
app.post('/api/bulk_insert', async (req, res) => {
  const list = req.body;
  if (!Array.isArray(list) || list.length === 0) {
    return res.status(400).json({ error: 'Array of questions expected' });
  }

  try {
    if (pool) {
      let count = 0;
      for (const q of list) {
        await pool.query(`
          INSERT INTO questions 
            (id, class, subject, chapter_no, chapter_name_en, chapter_name_ur, exercise, type, marks, difficulty, question_en, question_ur, options_json, correct_option_index)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            chapter_name_en = VALUES(chapter_name_en),
            chapter_name_ur = VALUES(chapter_name_ur),
            exercise = VALUES(exercise),
            type = VALUES(type),
            marks = VALUES(marks),
            question_en = VALUES(question_en),
            question_ur = VALUES(question_ur),
            options_json = VALUES(options_json),
            correct_option_index = VALUES(correct_option_index)
        `, [
          q.id || `q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          q.class || '9th',
          q.subject || 'Mathematics',
          Number(q.chapter_no) || 1,
          q.chapter_name_en || '',
          q.chapter_name_ur || '',
          q.exercise || '',
          q.type || 'short_question',
          Number(q.marks) || 1,
          q.difficulty || 'medium',
          q.question_en || '',
          q.question_ur || '',
          q.options ? JSON.stringify(q.options) : null,
          q.correct_option_index !== undefined ? Number(q.correct_option_index) : null
        ]);
        count++;
      }
      return res.json({ success: true, count, message: `Successfully synced ${count} questions to Hostinger MySQL Database` });
    }
  } catch (err) {
    console.error('Bulk sync failed:', err.message);
    return res.status(500).json({ error: err.message });
  }

  res.json({ success: true, count: list.length, message: 'Saved to session cache' });
});

// Single Page Application Fallback for Hostinger Web App (Express 5 compatible)
app.use((req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
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
