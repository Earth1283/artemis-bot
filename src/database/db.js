const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'bot.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        access_token TEXT,
        refresh_token TEXT,
        expires_at INTEGER,
        permissions TEXT
    );

    CREATE TABLE IF NOT EXISTS ai_quotas (
        user_id TEXT PRIMARY KEY,
        usage_count INTEGER DEFAULT 0,
        last_reset INTEGER
    );
`);

module.exports = db;
