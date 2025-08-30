import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, '..', '..', 'BACHLOG.db'));

const initDatabase = async () => {
  try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS COURSES (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        SEMESTER INTEGER NOT NULL CHECK(SEMESTER BETWEEN 1 AND 6),
        CODE TEXT NOT NULL,
        TITLE TEXT,
        CREDITS INTEGER,
        IS_AUTUMN_COURSE DEFAULT 0,
        IS_SPRING_COURSE DEFAULT 0,
        COMMENT TEXT,
        GRADE INTEGER,
        TYPE TEXT
      )
    `);
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export { db, initDatabase };