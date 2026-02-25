// ==========================================================================
// 🚀 WORLD ROCKETS GAME - FINAL MMO ENGINE V4
// ==========================================================================

import { initializeApp } from
"https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
getDatabase,
ref,
onValue,
set,
update,
get,
push,
remove
}
from
"https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";


// ==========================================================================
// FIREBASE CONFIG
// ==========================================================================

const firebaseConfig = {

apiKey:"AIzaSyDNRQa...",
databaseURL:
"https://world-rockets-default-rtdb.firebaseio.com"

};

const app = initializeApp(firebaseConfig);

const db = getDatabase(app);


// ==========================================================================
// SERVER SYSTEM (FIXED)
// ==========================================================================

// ✅ قراءة السيرفر من auth.js
let loginData =
JSON.parse(localStorage.getItem("wr_login"));

// لو مش مسجل دخول رجع للصفحة الأولى
if(!loginData){

window.location.href="index.html";

}

// تحديد السيرفر
let currentServer =
loginData.server || "server_1";

function path(p){

return `servers/${currentServer}/${p}`;

}


// ==========================================================================
// AUTO LOGIN (FIXED)
// ==========================================================================

let currentPlayer=null;

async function login(){

let id =
"player_"+loginData.name;

let snap =
await get(
ref(db,path("players/"+id))
);

if(snap.exists()){

currentPlayer=snap.val();

startGame();

}
else{

alert("Session انتهت");

window.location.href="index.html";

}

}

// تشغيل login مباشرة
login();


// ==========================================================================
// MAP (FIXED)
// ==========================================================================

const map=L.map("map",{

zoomControl:false,

minZoom:3,

maxZoom:7,

maxBounds:[
[-85,-180],
[85,180]
],

maxBoundsViscosity:1

})

.setView([20,0],3);


L.tileLayer(

"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"

).addTo(map);


// ==========================================================================
// GAME START
// ==========================================================================

let players={};

let markers={};

let territories={};


function startGame(){

listenPlayers();

listenDM();

updateHUD();

}


// ==========================================================================
// PLAYERS LISTENER
// ==========================================================================

function listenPlayers(){

onValue(

ref(db,path("players")),

snap=>{

if(!snap.exists())return;

players=snap.val();

updateMarkers();

updateLeaderboard();

// حماية لو العنصر مش موجود
let onlineEl =
document.getElementById("online-count");

if(onlineEl){

onlineEl.innerText=
Object.keys(players).length;

}

}

);

}


// ==========================================================================
// MARKERS
// ==========================================================================

function updateMarkers(){

for(let id in players){

let p=players[id];

if(!p.lat)continue;

let icon=L.divIcon({

html:
`<div style="
background:${p.color};
width:18px;
height:18px;
border-radius:50%;
box-shadow:0 0 15px ${p.color}
"></div>`

});

if(!markers[id]){

markers[id]=L.marker(
[p.lat,p.lng],
{icon}
).addTo(map);

markers[id].onclick=()=>{
playerMenu(p);
};

}

markers[id].setLatLng(
[p.lat,p.lng]
);


// territory

let radius=p.score*15;

if(!territories[id]){

territories[id]=L.circle(
[p.lat,p.lng],
{
radius,
color:p.color,
fillOpacity:.15
}
).addTo(map);

}

territories[id].setRadius(radius);

}

}


// ==========================================================================
// PLAYER MENU
// ==========================================================================

function playerMenu(p){

if(p.id===currentPlayer.id)return;

Swal.fire({

title:p.name,

showDenyButton:true,

showCancelButton:true,

confirmButtonText:"🚀 هجوم",

denyButtonText:"✉️ رسالة",

cancelButtonText:"🤝 تحالف"

})

.then(res=>{

if(res.isConfirmed)
attack(p);

if(res.isDenied)
sendDM(p);

if(res.dismiss==="cancel")
inviteClan(p);

});

}


// ==========================================================================
// ATTACK
// ==========================================================================

function attack(target){

if(
currentPlayer.clan &&
currentPlayer.clan===target.clan
){

alert("حليفك");

return;

}

realisticRocket(
[currentPlayer.lat,currentPlayer.lng],
[target.lat,target.lng]
);

}


// ==========================================================================
// REALISTIC ROCKET
// ==========================================================================

function realisticRocket(start,end){

let rocket=L.marker(start,{
icon:L.divIcon({
html:"🚀",
iconSize:[40,40]
})
}).addTo(map);


let startTime=performance.now();


function animate(t){

let p=(t-startTime)/5000;

if(p>=1){

explode(end);

map.removeLayer(rocket);

return;

}


// curve

let lat=
start[0]+(end[0]-start[0])*p;

let lng=
start[1]+(end[1]-start[1])*p;

let arc=
Math.sin(p*Math.PI)*10;

rocket.setLatLng(
[lat+arc,lng]
);


// rotate

let angle=
Math.atan2(
end[1]-lng,
end[0]-lat
)*180/Math.PI;

rocket.getElement()
.style.transform=
`rotate(${angle}deg)`;


// smoke

L.circle(
[lat,lng],
{
radius:20000,
color:"orange",
opacity:.4
}
).addTo(map);


requestAnimationFrame(animate);

}

requestAnimationFrame(animate);

}


// ==========================================================================
// EXPLOSION
// ==========================================================================

function explode(pos){

let boom=L.circle(pos,{
radius:100000,
color:"red",
fillOpacity:.5
}).addTo(map);

setTimeout(
()=>map.removeLayer(boom),
2000
);

}


// ==========================================================================
// DM SYSTEM
// ==========================================================================

function sendDM(target){

Swal.fire({
title:"رسالة",
input:"text"
})
.then(res=>{

if(!res.value)return;

push(
ref(db,path("dm/"+target.id)),
{
from:currentPlayer.name,
text:res.value
}
);

});

}


function listenDM(){

onValue(

ref(db,path("dm/"+currentPlayer.id)),

snap=>{

if(!snap.exists())return;

let msgs=snap.val();

let msgEl =
document.getElementById("msg-count");

if(msgEl){

msgEl.innerText=
Object.keys(msgs).length;

}

}

);

}


// ==========================================================================
// CLAN
// ==========================================================================

function inviteClan(p){

update(
ref(db,path("players/"+p.id)),
{
clan:currentPlayer.clan||
currentPlayer.id
}
);

}


// ==========================================================================
// HUD
// ==========================================================================

function updateHUD(){

let coinsEl =
document.getElementById("hud-coins");

let healthEl =
document.getElementById("hud-health");

if(coinsEl)
coinsEl.innerText=currentPlayer.coins;

if(healthEl)
healthEl.innerText=currentPlayer.health+"%";

}


// ==========================================================================
// LEADERBOARD
// ==========================================================================

function updateLeaderboard(){

let list=
document.getElementById("leaderboard-list");

if(!list)return;

list.innerHTML="";

Object.values(players)
.sort((a,b)=>b.score-a.score)
.forEach(p=>{

list.innerHTML+=`
<div class="leaderboard-item">
${p.name}
</div>
`;

});

}


// ==========================================================================
// LOCATE
// ==========================================================================

let locateBtn =
document.getElementById("btn-locate");

if(locateBtn){

locateBtn.onclick=()=>{

map.once("click",e=>{

update(
ref(db,path("players/"+currentPlayer.id)),
{
lat:e.latlng.lat,
lng:e.latlng.lng
}
);

});

};

}


// ==========================================================================
// DONE
// ==========================================================================

console.log("WORLD ROCKETS V4 READY");
