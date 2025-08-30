import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, '..', '..', 'database.sqlite'));

const initDatabase = async () => {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        semester INTEGER NOT NULL CHECK(semester BETWEEN 1 AND 6),
        code TEXT NOT NULL,
        title TEXT,
        credits INTEGER,
        season TEXT,
        comment TEXT,
        grade INTEGER,
        type TEXT
      )
    `);
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export { db, initDatabase };