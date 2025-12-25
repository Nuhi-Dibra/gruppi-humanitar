const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

const DB_PATH = "./data/database.db";

// crea cartella data se non esiste
if (!fs.existsSync("./data")) {
  fs.mkdirSync("./data");
}

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT,
      admin TEXT,
      password TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      group_id TEXT,
      quota INTEGER DEFAULT 0,
      extra INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS months (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      month TEXT,
      paid INTEGER DEFAULT 0
    )
  `);
});

db.close(err => {
  if (err) {
    console.error("Errore chiusura DB:", err);
    process.exit(1);
  }
  console.log("✅ Database creato con successo");
  process.exit(0); // <<< QUESTO È FONDAMENTALE
});
