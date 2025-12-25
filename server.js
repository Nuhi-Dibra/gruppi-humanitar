const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();

/* =====================
   CONFIG
===================== */

const PORT = process.env.PORT || 3000;

// Render persistent disk
const DATA_DIR = process.env.RENDER
  ? "/data"
  : __dirname;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "database.db");

/* =====================
   DB INIT
===================== */

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("DB error:", err);
  } else {
    console.log("Database aperto:", DB_PATH);
  }
});

db.serialize(() => {
  // GROUPS
  db.run(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `);

  // USERS
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      group_id INTEGER,
      FOREIGN KEY (group_id) REFERENCES groups(id)
    )
  `);

  // MONTHS
  db.run(`
    CREATE TABLE IF NOT EXISTS months (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      month TEXT,
      paid INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // SEED GROUP (IMPORTANTISSIMO)
  db.run(`
    INSERT OR IGNORE INTO groups (id, name)
    VALUES (1, 'Gruppo Principale')
  `);
});

/* =====================
   MIDDLEWARE
===================== */

app.use(express.json());
app.use(express.static("public"));

/* =====================
   ROUTES
===================== */

// Health
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

// GET GROUPS
app.get("/groups", (req, res) => {
  db.all("SELECT * FROM groups", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// CREATE GROUP
app.post("/groups", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Nome richiesto" });

  db.run(
    "INSERT INTO groups (name) VALUES (?)",
    [name],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID, name });
    }
  );
});

// GET GROUP DETAIL
app.get("/group/:id", (req, res) => {
  const groupId = req.params.id;

  db.get("SELECT * FROM groups WHERE id = ?", [groupId], (err, group) => {
    if (err || !group) return res.status(404).json(null);

    db.all(
      "SELECT * FROM users WHERE group_id = ?",
      [groupId],
      (e, users) => {
        if (e) return res.status(500).json(null);

        let pending = users.length;
        if (pending === 0) {
          group.users = [];
          return res.json(group);
        }

        users.forEach((u) => {
          db.all(
            "SELECT month, paid FROM months WHERE user_id = ?",
            [u.id],
            (ee, ms) => {
              u.months = {};
              ms.forEach((m) => (u.months[m.month] = !!m.paid));
              pending--;
              if (pending === 0) {
                group.users = users;
                res.json(group);
              }
            }
          );
        });
      }
    );
  });
});

/* =====================
   START SERVER
===================== */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Online su porta ${PORT}`);
});
