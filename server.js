import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

let mysql = null;

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'u437839910_TCA_Test_Maker',
  password: process.env.DB_PASS || 'TCATest786@',
  database: process.env.DB_NAME || 'u437839910_Test_Maker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000
};

let pool = null;
let dbConnected = false;

async function initDatabase() {
  if (!mysql) {
    try {
      const mysqlModule = await import('mysql2/promise');
      mysql = mysqlModule.default || mysqlModule;
    } catch (err) {
      console.warn(`[Database] Notice: mysql2 package not loaded (${err.message}). API will run in resilient fallback mode.`);
      dbConnected = false;
      return;
    }
  }
  try {
    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    await connection.ping();
    dbConnected = true;
    console.log(`[Database] ✅ Connected to MySQL Database: ${dbConfig.database} at ${dbConfig.host}`);

    // Create questions table if not exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        class VARCHAR(20) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        chapter_no INT NOT NULL,
        chapter_name_en VARCHAR(255) NOT NULL,
        chapter_name_ur VARCHAR(255) DEFAULT NULL,
        exercise VARCHAR(100) DEFAULT NULL,
        type ENUM('mcq', 'short_question', 'long_question') NOT NULL,
        marks INT DEFAULT 1,
        difficulty VARCHAR(30) DEFAULT 'medium',
        question_en TEXT NOT NULL,
        question_ur TEXT DEFAULT NULL,
        options_json JSON DEFAULT NULL,
        correct_option_index INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_filter (class, subject, chapter_no, type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    connection.release();
  } catch (err) {
    dbConnected = false;
    console.warn(`[Database] Notice: Live MySQL is offline or initializing (${err.message}). API will operate in fallback mode.`);
  }
}

// Initialize database asynchronously without blocking web server startup
initDatabase().catch(err => {
  console.warn('[Database] Async init notice:', err.message);
});

// Serve compiled static assets: dist, public, and root directory
const distPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}
app.use(express.static(__dirname));

// Direct root route to immediately serve index.html
app.get('/', (req, res) => {
  const candidates = [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'dist', 'index.html'),
    path.join(__dirname, 'public', 'index.html')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return res.sendFile(p);
    }
  }
  res.status(200).send('<!DOCTYPE html><html><body><h1>The Century Academy</h1><p>Test Maker portal loading...</p></body></html>');
});

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
    database: isConnected ? 'connected' : 'offline',
    mode: 'dynamic_database_driven',
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
        connected: true,
        total_questions: rows[0].count
      });
    }
  } catch (e) {
    return res.json({
      status: 'offline',
      database: dbConfig.database,
      connected: false,
      error: e.message,
      total_questions: 0
    });
  }

  res.json({
    status: 'offline',
    connected: false,
    total_questions: 0
  });
});

// Dynamic distinct metadata (Classes, Subjects, Chapters in DB)
app.get('/api/metadata', async (req, res) => {
  try {
    if (pool) {
      const [classRows] = await pool.query('SELECT DISTINCT class FROM questions ORDER BY class ASC');
      const [subjectRows] = await pool.query('SELECT DISTINCT class, subject FROM questions ORDER BY class, subject ASC');
      const [chapterRows] = await pool.query('SELECT DISTINCT class, subject, chapter_no, chapter_name_en, chapter_name_ur FROM questions ORDER BY chapter_no ASC');

      return res.json({
        success: true,
        classes: classRows.map(r => r.class),
        subjects: subjectRows,
        chapters: chapterRows
      });
    }
  } catch (err) {
    console.error('Metadata query error:', err.message);
  }

  res.json({ success: false, classes: [], subjects: [], chapters: [] });
});

// Get Questions endpoint (Filtered dynamically by Class, Subject, Chapter, Type)
app.get('/api/questions', async (req, res) => {
  const { className, subject, chapter, type, search } = req.query;

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
      if (search) {
        query += ' AND (question_en LIKE ? OR question_ur LIKE ? OR exercise LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
    console.error('MySQL query error:', err.message);
    return res.status(500).json({ success: false, error: err.message, data: [] });
  }

  res.json({ success: true, source: 'offline', count: 0, data: [] });
});

// Insert / Update Single Question
app.post('/api/questions', async (req, res) => {
  const q = req.body;
  try {
    if (pool) {
      await pool.query(`
        INSERT INTO questions 
          (id, class, subject, chapter_no, chapter_name_en, chapter_name_ur, exercise, type, marks, difficulty, question_en, question_ur, options_json, correct_option_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          class = VALUES(class),
          subject = VALUES(subject),
          chapter_no = VALUES(chapter_no),
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
        q.subject || 'General',
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
      return res.json({ success: true, message: 'Saved dynamically to MySQL database' });
    }
  } catch (err) {
    console.error('Failed to save to MySQL:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }

  res.json({ success: false, message: 'Database not connected' });
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
            class = VALUES(class),
            subject = VALUES(subject),
            chapter_no = VALUES(chapter_no),
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
          q.subject || 'General',
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

  res.json({ success: false, message: 'Database not connected' });
});

// Delete Single Question
app.delete('/api/questions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (pool) {
      await pool.query('DELETE FROM questions WHERE id = ?', [id]);
      return res.json({ success: true, message: `Question ${id} deleted` });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
  res.json({ success: false, message: 'Database not connected' });
});

// Single Page Application Fallback for Hostinger Web App
app.use((req, res) => {
  const candidates = [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'dist', 'index.html'),
    path.join(__dirname, 'public', 'index.html')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return res.sendFile(p);
    }
  }
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
});

// Global process safety handlers to prevent Hostinger 503 crash on unhandled errors
process.on('uncaughtException', (err) => {
  console.error('[Hostinger Process] uncaughtException caught:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Hostinger Process] unhandledRejection caught:', reason);
});

// Flexible listening for Hostinger (supports both Passenger socket and TCP port)
const serverPort = process.env.PORT || 3000;
app.listen(serverPort, () => {
  console.log(`[Hostinger Web App] The Century Academy Test Maker Server running on ${serverPort}`);
});

