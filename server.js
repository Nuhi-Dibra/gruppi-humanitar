const express = require("express");
const app = express();

/* 🔥 FIX ONLINE: porta corretta per Render / hosting */
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const MONTHS = [
  "gennaio","febbraio","marzo","aprile","maggio","giugno",
  "luglio","agosto","settembre","ottobre","novembre","dicembre"
];

const QUOTES = [
  { ar:"إِنَّ مَعَ الْعُسْرِ يُسْرًا", it:"Con la difficoltà viene la facilità." },
  { ar:"إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", it:"Allah è con i pazienti." },
  { ar:"حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", it:"Allah ci basta ed è il miglior protettore." }
];

const dailyQuote = () => QUOTES[new Date().getDate() % QUOTES.length];

/* ===== DATI ===== */
let groups = {
  "nuhi": {
    id: "nuhi",
    name: "Gruppo Nuhi",
    admin: "Nuhi",
    password: "2005",
    quote: dailyQuote(),
    total: 0,
    users: [
      "Nuhi","Kemo","Abdullah","Alajdin","Berat","Besnik",
      "Albit","Erhan","Gajur","Mazem","Samir","Sinan","Zumer"
    ].map((n,i)=>({
      id:i+1,
      name:n,
      quota:0,
      extra:0,
      months:Object.fromEntries(MONTHS.map(m=>[m,false]))
    }))
  }
};

/* ===== API PUBBLICHE ===== */
app.get("/groups",(req,res)=>{
  res.json(Object.values(groups).map(g=>({id:g.id,name:g.name})));
});

app.post("/groups/create",(req,res)=>{
  const { name, admin, password } = req.body;
  const id = name.toLowerCase().replace(/\s+/g,"-");
  if(groups[id]) return res.status(400).end();

  groups[id] = {
    id,
    name,
    admin,
    password,
    quote: dailyQuote(),
    total: 0,
    users: [{
      id:1,
      name:admin,
      quota:0,
      extra:0,
      months:Object.fromEntries(MONTHS.map(m=>[m,false]))
    }]
  };
  res.json({ok:true});
});

app.post("/login",(req,res)=>{
  const { groupId, name, password } = req.body;
  const g = groups[groupId];
  if(!g) return res.json({ok:false});

  const isAdmin = name===g.admin && password===g.password;
  const exists = g.users.find(u=>u.name===name);

  if(!exists && !isAdmin) return res.json({ok:false});
  if(name===g.admin && !isAdmin) return res.json({ok:false});

  res.json({ok:true,isAdmin});
});

app.get("/group/:id",(req,res)=>{
  res.json(groups[req.params.id]);
});

/* ===== ADMIN: AGGIUNGI ===== */
app.post("/admin/pay",(req,res)=>{
  const { groupId, admin, password, userId, amount, month } = req.body;
  const g = groups[groupId];
  if(admin!==g.admin || password!==g.password) return res.status(403).end();

  const u = g.users.find(x=>x.id===userId);
  u.quota += amount;
  g.total += amount;
  u.months[month] = true;

  res.json(g);
});

app.post("/admin/extra",(req,res)=>{
  const { groupId, admin, password, userId, amount } = req.body;
  const g = groups[groupId];
  if(admin!==g.admin || password!==g.password) return res.status(403).end();

  const u = g.users.find(x=>x.id===userId);
  u.extra += amount;
  g.total += amount;

  res.json(g);
});

/* ===== ADMIN: CORREZIONI (ULTIMA MODIFICA) ===== */

// ➖ togli quota
app.post("/admin/remove-pay",(req,res)=>{
  const { groupId, admin, password, userId, amount, month } = req.body;
  const g = groups[groupId];
  if(admin!==g.admin || password!==g.password) return res.status(403).end();

  const u = g.users.find(x=>x.id===userId);
  u.quota = Math.max(0, u.quota - amount);
  g.total = Math.max(0, g.total - amount);
  u.months[month] = false;

  res.json(g);
});

// ➖ togli extra
app.post("/admin/remove-extra",(req,res)=>{
  const { groupId, admin, password, userId, amount } = req.body;
  const g = groups[groupId];
  if(admin!==g.admin || password!==g.password) return res.status(403).end();

  const u = g.users.find(x=>x.id===userId);
  u.extra = Math.max(0, u.extra - amount);
  g.total = Math.max(0, g.total - amount);

  res.json(g);
});

// ✏️ imposta quota esatta
app.post("/admin/set-quota",(req,res)=>{
  const { groupId, admin, password, userId, quota } = req.body;
  const g = groups[groupId];
  if(admin!==g.admin || password!==g.password) return res.status(403).end();

  const u = g.users.find(x=>x.id===userId);
  g.total -= u.quota;
  u.quota = Number(quota);
  g.total += u.quota;

  res.json(g);
});

/* ===== ADMIN EXTRA ===== */
app.post("/admin/add-user",(req,res)=>{
  const { groupId, admin, password, userName } = req.body;
  const g = groups[groupId];
  if(admin!==g.admin || password!==g.password) return res.status(403).end();

  g.users.push({
    id:g.users.length+1,
    name:userName,
    quota:0,
    extra:0,
    months:Object.fromEntries(MONTHS.map(m=>[m,false]))
  });

  res.json(g);
});

app.post("/admin/remove-user",(req,res)=>{
  const { groupId, admin, password, userName } = req.body;
  const g = groups[groupId];
  if(admin!==g.admin || password!==g.password) return res.status(403).end();

  g.users = g.users.filter(u=>u.name!==userName);
  res.json(g);
});

app.post("/admin/set-total",(req,res)=>{
  const { groupId, admin, password, total } = req.body;
  const g = groups[groupId];
  if(admin!==g.admin || password!==g.password) return res.status(403).end();

  g.total = Number(total);
  res.json(g);
});

/* ===== AVVIO SERVER (ONLINE + LOCALE) ===== */
app.listen(PORT, () => {
  console.log("Server avviato sulla porta " + PORT);
});
