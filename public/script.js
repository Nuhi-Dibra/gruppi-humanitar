let currentGroup = null;
let me = {};
let payType = "normal";

const MONTHS = [
  "gennaio","febbraio","marzo","aprile","maggio","giugno",
  "luglio","agosto","settembre","ottobre","novembre","dicembre"
];

/* ===== NAV ===== */
function showCreate(){
  entry.classList.add("hidden");
  createBox.classList.remove("hidden");
}
function showLogin(){
  entry.classList.add("hidden");
  loginBox.classList.remove("hidden");
}
function back(){
  createBox.classList.add("hidden");
  loginBox.classList.add("hidden");
  entry.classList.remove("hidden");
}

/* ===== TOGGLE PAYMENT TYPE ===== */
function setType(type){
  payType = type;
  btnNormal.classList.toggle("active", type==="normal");
  btnExtra.classList.toggle("active", type==="extra");
}

/* ===== LOAD GROUPS ===== */
fetch("/groups")
  .then(r=>r.json())
  .then(gs=>{
    groupList.innerHTML="";
    gs.forEach(g=>{
      const card=document.createElement("div");
      card.className="entry-card";
      card.innerHTML=`<h4>${g.name}</h4>`;
      card.onclick=()=>{ currentGroup=g.id; };
      groupList.appendChild(card);
    });
  });

/* ===== CREATE GROUP ===== */
function createGroup(){
  fetch("/groups/create",{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      name:ngName.value,
      admin:ngAdmin.value,
      password:ngPass.value
    })
  }).then(()=>location.reload());
}

/* ===== LOGIN ===== */
function login(){
  if(!currentGroup) return alert("Seleziona un gruppo");

  fetch("/login",{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      groupId:currentGroup,
      name:lName.value,
      password:lPass.value
    })
  })
  .then(r=>r.json())
  .then(j=>{
    if(!j.ok) return alert("Login fallito");

    me={name:lName.value,password:lPass.value,isAdmin:j.isAdmin};

    loginBox.classList.add("hidden");
    app.classList.remove("hidden");
    if(me.isAdmin) adminPanel.classList.remove("hidden");

    loadGroup();
  });
}

/* ===== LOAD GROUP ===== */
function loadGroup(){
  fetch("/group/"+currentGroup, { cache: "no-store" })
    .then(r=>r.json())
    .then(renderGroup);
}

/* ===== RENDER GROUP ===== */
function renderGroup(g){
  qAr.textContent=g.quote.ar;
  qIt.textContent=g.quote.it;
  total.textContent=g.total+"€";

  rows.innerHTML="";
  g.users.forEach(u=>{
    let tr=`<tr>
      <td>${u.name}</td>
      <td>${u.quota} €</td>
      <td>${u.extra>0 ? u.extra+' € <span class="badge-extra">EXTRA</span>' : '—'}</td>`;

    MONTHS.forEach(m=>{
      if(me.isAdmin){
        tr+=`
          <td class="month-cell"
              onclick="toggleMonth(this, ${u.id}, '${m}')">
            <span class="month-pill ${u.months[m]?'green':'red'}">
              ${m}
            </span>
          </td>`;
      } else {
        tr+=`
          <td>
            <span class="month-pill ${u.months[m]?'green':'red'}">
              ${m}
            </span>
          </td>`;
      }
    });

    tr+="</tr>";
    rows.innerHTML+=tr;
  });

  if(me.isAdmin){
    payUser.innerHTML="";
    payMonth.innerHTML="";
    removeUser.innerHTML="";

    g.users.forEach(u=>{
      payUser.innerHTML+=`<option value="${u.id}">${u.name}</option>`;
      removeUser.innerHTML+=`<option value="${u.name}">${u.name}</option>`;
    });

    MONTHS.forEach(m=>{
      payMonth.innerHTML+=`<option value="${m}">${m}</option>`;
    });
  }
}

/* ===== ✅ TOGGLE MESE (CAMBIO COLORE IMMEDIATO) ===== */
function toggleMonth(td, userId, month){
  if(!confirm(`Vuoi cambiare lo stato di ${month}?`)) return;

  const pill = td.querySelector(".month-pill");
  const isGreen = pill.classList.contains("green");

  // 🔥 CAMBIO VISIVO IMMEDIATO
  pill.classList.toggle("green", !isGreen);
  pill.classList.toggle("red", isGreen);

  // 🔥 CHIAMATA SERVER
  fetch("/admin/toggle-month",{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      groupId:currentGroup,
      admin:me.name,
      password:me.password,
      userId,
      month,
      amount:Number(payAmount.value || 10)
    })
  });
}

/* ===== ADMIN CLASSIC ===== */
function pay(){
  const endpoint = payType==="extra" ? "/admin/extra" : "/admin/pay";

  fetch(endpoint,{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      groupId:currentGroup,
      admin:me.name,
      password:me.password,
      userId:Number(payUser.value),
      amount:Number(payAmount.value),
      month:payMonth.value
    })
  }).then(()=>loadGroup());
}

function addUser(){
  fetch("/admin/add-user",{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      groupId:currentGroup,
      admin:me.name,
      password:me.password,
      userName:newUserName.value
    })
  }).then(()=>loadGroup());
}

function removeUserFn(){
  fetch("/admin/remove-user",{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      groupId:currentGroup,
      admin:me.name,
      password:me.password,
      userName:removeUser.value
    })
  }).then(()=>loadGroup());
}

function setTotal(){
  fetch("/admin/set-total",{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      groupId:currentGroup,
      admin:me.name,
      password:me.password,
      total:Number(totalFix.value)
    })
  }).then(()=>loadGroup());
}
