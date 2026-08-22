const $=s=>document.querySelector(s);
let currentUser=null, cases=[];

async function api(url,opts={}){const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opts});const d=await r.json();if(!r.ok)throw Error(d.error||"Помилка");return d}

async function refresh(){
  const d=await api("/api/me"); currentUser=d.user;
  $("#userLabel").textContent=currentUser?currentUser.username:"Гість";
  $("#balance").textContent=(currentUser?.balance||0)+" ₴";
  $("#authBtn").textContent=currentUser?"Вийти":"Увійти";
}
async function loadCases(){
 cases=await api("/api/cases");
 $("#cases").innerHTML=cases.map((c,i)=>`<article class="card">
 <div class="case-art">${["🔴","🟣","🟡"][i]}</div><h3>${c.name}</h3>
 <div class="price">${c.price} ₴</div><button onclick="openCase('${c.id}')">Відкрити кейс</button></article>`).join("");
}
async function openCase(id){
 if(!currentUser){return auth()}
 const c=cases.find(x=>x.id===id);
 $("#modal").classList.remove("hidden");
 $("#modalContent").innerHTML=`<h2>${c.name}</h2><p class="muted">Крутимо барабан...</p><div class="reel" id="reel"></div>`;
 const reel=$("#reel");
 const fake=["Nova | Red Quartz","Glock-18 | Vogue","AK-47 | Elite Build","M4A1-S | Printstream","AWP | Asiimov","★ Karambit | Doppler"];
 for(let i=0;i<22;i++){const s=document.createElement("div");s.className="slot";s.textContent=fake[Math.floor(Math.random()*fake.length)];reel.appendChild(s)}
 let result;
 try{result=await api("/api/open/"+id,{method:"POST"})}catch(e){$("#modalContent").innerHTML+=`<h3>${e.message}</h3>`;return}
 const win=document.createElement("div");win.className="slot win";win.textContent=result.item.name;
 reel.appendChild(win);
 setTimeout(()=>{$("#modalContent").innerHTML=`<h2>🎉 Вітаємо!</h2><div class="slot win" style="margin:25px auto;max-width:300px">${result.item.name}<br><small>${result.item.rarity} · ${result.item.value} ₴</small></div><button onclick="location.reload()">Забрати</button>`;},900);
 currentUser.balance=result.balance; refresh();
}
async function auth(){
 $("#modal").classList.remove("hidden");
 $("#modalContent").innerHTML=`<h2>Вхід / реєстрація</h2><input id="u" placeholder="Логін" style="padding:12px;margin:7px;border-radius:8px"><input id="p" type="password" placeholder="Пароль" style="padding:12px;margin:7px;border-radius:8px"><br><button onclick="login()">Увійти</button> <button class="ghost" onclick="register()">Створити</button>`;
}
async function login(){try{await api("/api/login",{method:"POST",body:JSON.stringify({username:$("#u").value,password:$("#p").value})});$("#modal").classList.add("hidden");await refresh()}catch(e){alert(e.message)}}
async function register(){try{await api("/api/register",{method:"POST",body:JSON.stringify({username:$("#u").value,password:$("#p").value})});$("#modal").classList.add("hidden");await refresh()}catch(e){alert(e.message)}}
async function sellItem(id){
  try{
    const result = await api("/api/inventory/" + id + "/sell", {method:"POST"});
    currentUser.balance = result.balance;
    await refresh();
    await showInventory();
  }catch(e){
    alert(e.message);
  }
}
async function showInventory(){
 if(!currentUser)return auth();
 const items=await api("/api/inventory");$("#inventory").classList.remove("hidden");
$("#items").innerHTML=items.length?items.map(x=>`<div class="item"><strong>${x.item_name}</strong><span class="muted">${x.rarity} · ${x.value} ₴</span><button onclick="sellItem(${x.id})">Продати за ${x.value} ₴</button></div>`).join(""):"<p class='muted'>Інвентар порожній.</p>";
 } 
$("#authBtn").onclick=async()=>{if(currentUser){await api("/api/logout",{method:"POST"});location.reload()}else auth()};
$("#inventoryBtn").onclick=showInventory;$("#closeInv").onclick=()=>$("#inventory").classList.add("hidden");$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");
refresh();loadCases();
