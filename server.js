const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// =======================
// RENDER PERSISTENT DISK
// =======================
const DATA_DIR = process.env.RENDER ? "/data" : __dirname;
const DB_PATH = path.join(DATA_DIR, "database.db");

// =======================
// MIDDLEWARE
// =======================
app.use(express.json());
app.use(express.static("public"));

// =======================
// DATABASE
// =======================
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("DB error:", err);
  } else {
    console.log("Database aperto:", DB_PATH);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      group_id INTEGER,
      quota INTEGER DEFAULT 0,
      extra INTEGER DEFAULT 0,
      FOREIGN KEY(group_id) REFERENCES groups(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS months (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      month TEXT,
      paid INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
});

// =======================
// API
// =======================

// GET gruppi
app.get("/groups", (req, res) => {
  db.all("SELECT * FROM groups", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

// CREA gruppo
app.post("/groups", (req, res) => {
  const { name } = req.body;
  db.run("INSERT INTO groups (name) VALUES (?)", [name], function (err) {
    if (err) return res.status(400).json(err);
    res.json({ id: this.lastID, name });
  });
});

// GET gruppo completo
app.get("/group/:id", (req, res) => {
  const groupId = req.params.id;

  db.get("SELECT * FROM groups WHERE id = ?", [groupId], (err, group) => {
    if (err || !group) return res.status(404).json({ error: "Group not found" });

    db.all("SELECT * FROM users WHERE group_id = ?", [groupId], (err, users) => {
      if (err) return res.status(500).json(err);

      let pending = users.length;
      if (pending === 0) return res.json({ ...group, users: [] });

      users.forEach((u) => {
        db.all(
          "SELECT month, paid FROM months WHERE user_id = ?",
          [u.id],
          (err, months) => {
            u.months = {};
            months.forEach((m) => (u.months[m.month] = !!m.paid));
            pending--;
            if (pending === 0) res.json({ ...group, users });
          }
        );
      });
    });
  });
});

// CREA utente
app.post("/user", (req, res) => {
  const { name, group_id } = req.body;
  db.run(
    "INSERT INTO users (name, group_id) VALUES (?, ?)",
    [name, group_id],
    function (err) {
      if (err) return res.status(400).json(err);
      res.json({ id: this.lastID });
    }
  );
});

// TOGGLE MESE
app.post("/month", (req, res) => {
  const { user_id, month } = req.body;

  db.get(
    "SELECT * FROM months WHERE user_id = ? AND month = ?",
    [user_id, month],
    (err, row) => {
      if (row) {
        db.run(
          "UPDATE months SET paid = NOT paid WHERE id = ?",
          [row.id],
          () => res.json({ ok: true })
        );
      } else {
        db.run(
          "INSERT INTO months (user_id, month, paid) VALUES (?, ?, 1)",
          [user_id, month],
          () => res.json({ ok: true })
        );
      }
    }
  );
});

// =======================
// START SERVER
// =======================
app.listen(PORT, "0.0.0.0", () => {
  console.log("Online su porta", PORT);
});
