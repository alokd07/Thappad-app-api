// database.js

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// Create table if it doesn't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      price REAL NOT NULL,
      date TEXT NOT NULL
    )
  `);
});

module.exports = db;
