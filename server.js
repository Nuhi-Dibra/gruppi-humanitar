const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cron = require("node-cron");
const fs = require("fs");
const app = express();

const PORT = process.env.PORT || 3000;
const db = new sqlite3.Database("./database.db");

app.use(express.json());
app.use(express.static("public"));

const MONTHS = [
  "gennaio","febbraio","marzo","aprile","maggio","giugno",
  "luglio","agosto","settembre","ottobre","novembre","dicembre"
];

/* ===== HELPERS ===== */
function getGroup(groupId, cb){
  db.get(`SELECT * FROM groups WHERE id=?`, [groupId], (err, g)=>{
    if(err || !g) return cb(null);

    db.all(
      `SELECT * FROM users WHERE group_id=?`,
      [groupId],
      (e, users)=>{
        if(e) return cb(null);

        let done = 0;
        users.forEach(u=>{
          u.months = {};
          db.all(
            `SELECT month, paid FROM months WHERE user_id=?`,
            [u.id],
            (ee, ms)=>{
              ms.forEach(m=>u.months[m.month]=!!m.paid);
              done++;
              if(done===users.length){
                g.users = users;
                cb(g);
              }
            }
          );
        });
        if(users.length===0){
          g.users=[];
          cb(g);
        }
      }
    );
  });
}

/* ===== API ===== */
app.get("/groups",(req,res)=>{
  db.all(`SELECT id,name FROM groups`, (e,rows)=>res.json(rows));
});

app.post("/login",(req,res)=>{
  const { groupId, name, password } = req.body;
  db.get(`SELECT * FROM groups WHERE id=?`, [groupId], (e,g)=>{
    if(!g) return res.json({ok:false});
    const isAdmin = name===g.admin && password===g.password;
    db.get(
      `SELECT * FROM users WHERE group_id=? AND name=?`,
      [groupId,name],
      (ee,u)=>{
        if(!u && !isAdmin) return res.json({ok:false});
        if(name===g.admin && !isAdmin) return res.json({ok:false});
        res.json({ok:true,isAdmin});
      }
    );
  });
});

app.get("/group/:id",(req,res)=>{
  getGroup(req.params.id, g=>res.json(g));
});

/* ===== ADMIN ===== */
app.post("/admin/toggle-month",(req,res)=>{
  const { groupId, admin, password, userId, month, amount } = req.body;
  db.get(`SELECT * FROM groups WHERE id=?`, [groupId], (e,g)=>{
    if(!g || g.admin!==admin || g.password!==password)
      return res.status(403).end();

    db.get(
      `SELECT paid FROM months WHERE user_id=? AND month=?`,
      [userId,month],
      (ee,row)=>{
        const val = Number(amount||10);
        const newPaid = row.paid ? 0 : 1;

        db.run(
          `UPDATE months SET paid=? WHERE user_id=? AND month=?`,
          [newPaid,userId,month]
        );

        db.run(
          `UPDATE users
           SET quota = quota + ?
           WHERE id=?`,
          [ newPaid ? val : -val, userId ]
        );

        db.run(
          `UPDATE groups
           SET total = total + ?
           WHERE id=?`,
          [ newPaid ? val : -val, groupId ],
          ()=>getGroup(groupId, g2=>res.json(g2))
        );
      }
    );
  });
});

/* ===== BACKUP AUTOMATICO ===== */
if(!fs.existsSync("./backups")) fs.mkdirSync("./backups");

cron.schedule("0 3 * * *", ()=>{
  const ts = new Date().toISOString().split("T")[0];
  fs.copyFileSync(
    "./database.db",
    `./backups/database-${ts}.db`
  );
  console.log("🛡 Backup creato:", ts);
});

app.listen(PORT,()=>console.log("✅ Online su porta",PORT));
