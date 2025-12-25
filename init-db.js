const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.db");

const MONTHS = [
  "gennaio","febbraio","marzo","aprile","maggio","giugno",
  "luglio","agosto","settembre","ottobre","novembre","dicembre"
];

db.serialize(() => {
  // GROUPS
  db.run(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT,
      admin TEXT,
      password TEXT,
      total REAL DEFAULT 0,
      quote_ar TEXT,
      quote_it TEXT
    )
  `);

  // USERS
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT,
      name TEXT,
      quota REAL DEFAULT 0,
      extra REAL DEFAULT 0
    )
  `);

  // MONTHS
  db.run(`
    CREATE TABLE IF NOT EXISTS months (
      user_id INTEGER,
      month TEXT,
      paid INTEGER DEFAULT 0
    )
  `);

  // gruppo iniziale Nuhi (se non esiste)
  db.run(`
    INSERT OR IGNORE INTO groups
    (id, name, admin, password, total, quote_ar, quote_it)
    VALUES
    ('nuhi','Gruppo Nuhi','Nuhi','2005',0,
     'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
     'Con la difficoltà viene la facilità.')
  `);

  const users = [
    "Nuhi","Kemo","Abdullah","Alajdin","Berat","Besnik",
    "Albit","Erhan","Gajur","Mazem","Samir","Sinan","Zumer"
  ];

  users.forEach(name=>{
    db.run(
      `INSERT INTO users (group_id, name) VALUES ('nuhi', ?)`,
      [name],
      function(){
        const uid = this.lastID;
        MONTHS.forEach(m=>{
          db.run(
            `INSERT INTO months (user_id, month, paid) VALUES (?, ?, 0)`,
            [uid, m]
          );
        });
      }
    );
  });
});

db.close();
console.log("✅ Database creato con successo");
