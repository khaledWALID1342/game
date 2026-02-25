// ==========================================================================
// 🚀 WORLD ROCKETS GAME - CORE ENGINE V3 ULTRA
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update, get, push, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==========================================================================
// FIREBASE
// ==========================================================================

const firebaseConfig = {

apiKey:"AIzaSyD...",
databaseURL:"https://world-rockets-default-rtdb.firebaseio.com"

};

const app = initializeApp(firebaseConfig);

const db = getDatabase(app);

// ==========================================================================
// SERVER SYSTEM
// ==========================================================================

let currentServer = localStorage.getItem("wr_server") || "global";

function serverPath(path){

return `servers/${currentServer}/${path}`;

}

// ==========================================================================
// AUTO LOGIN
// ==========================================================================

let currentPlayer=null;

const saved = localStorage.getItem("wr_login");

if(saved){

let data = JSON.parse(saved);

get(ref(db, serverPath(`players/${data.id}`)))
.then(snap=>{

if(snap.exists()){

if(snap.val().password === data.password){

currentPlayer = snap.val();

}

}

});

}

// ==========================================================================
// MAP
// ==========================================================================

const map = L.map("map",{zoomControl:false})
.setView([20,0],3);

L.tileLayer(
'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
).addTo(map);

// territory
let territories={};

// ==========================================================================
// PLAYERS
// ==========================================================================

let playersData={};

const playersRef = ref(db, serverPath("players"));

onValue(playersRef,(snap)=>{

if(!snap.exists()) return;

playersData=snap.val();

updateMarkers();

updateLeaderboard();

});

// ==========================================================================
// MARKERS
// ==========================================================================

let markers={};

function getRank(score){

if(score>5000) return "👑 Emperor";
if(score>2000) return "🎖 General";
if(score>1000) return "🔥 Sniper";
return "🎯 Soldier";

}

function updateMarkers(){

for(let id in playersData){

let p=playersData[id];

if(!p.lat) continue;

let icon=L.divIcon({

html:`<div class="base">${p.health}</div>`,
iconSize:[20,20]

});

if(!markers[id]){

markers[id]=L.marker([p.lat,p.lng],{icon})
.addTo(map);

markers[id].on("click",()=>openPlayerMenu(p));

}

markers[id].setLatLng([p.lat,p.lng]);

// territory

let radius=p.score*20;

if(!territories[id]){

territories[id]=L.circle(
[p.lat,p.lng],
{radius,color:"red",fillOpacity:.1}
).addTo(map);

}

territories[id].setRadius(radius);

}

}

// ==========================================================================
// LOGIN
// ==========================================================================

window.login=async function(){

let name=prompt("Name");

let pass=prompt("Password");

let id="player_"+name;

let refp=ref(db, serverPath(`players/${id}`));

let snap=await get(refp);

if(snap.exists()){

if(snap.val().password!==pass){

alert("wrong");

return;

}

currentPlayer=snap.val();

}else{

currentPlayer={

id,
name,
password:pass,
health:100,
coins:50,
rockets:3,
score:0

};

set(refp,currentPlayer);

}

localStorage.setItem("wr_login",JSON.stringify({

id,password:pass

}));

}

// ==========================================================================
// PLAYER MENU
// ==========================================================================

function openPlayerMenu(p){

if(p.id===currentPlayer.id) return;

let choice=prompt(

"1 attack\n2 message\n3 invite clan"

);

if(choice==1) attack(p);

if(choice==2) sendDM(p);

if(choice==3) inviteClan(p);

}

// ==========================================================================
// CLANS
// ==========================================================================

function inviteClan(p){

let clan=currentPlayer.clan;

update(
ref(db,serverPath(`players/${p.id}`)),
{clan}

);

}

// ==========================================================================
// DM SYSTEM
// ==========================================================================

function sendDM(target){

let text=prompt("message");

push(ref(db, serverPath(`dms/${target.id}`)),{

from:currentPlayer.name,

text,

time:Date.now()

});

}

onValue(
ref(db, serverPath(`dms/${currentPlayer?.id}`)),
(snap)=>{

if(!snap.exists()) return;

let box=document.getElementById("dm-inbox");

box.innerHTML="";

Object.values(snap.val())
.forEach(m=>{

box.innerHTML+=`
<div>
${m.from}: ${m.text}
</div>
`;

});

}
);

// ==========================================================================
// ATTACK SYSTEM
// ==========================================================================

function attack(target){

if(currentPlayer.clan &&
target.clan===currentPlayer.clan){

alert("ally");

return;

}

let start=L.latLng(currentPlayer.lat,currentPlayer.lng);

let end=L.latLng(target.lat,target.lng);

realisticRocket(start,end);

}

// ==========================================================================
// ULTRA REALISTIC ROCKET
// ==========================================================================

function realisticRocket(start,end){

let marker=L.marker(start,{

icon:L.divIcon({

html:"🚀",

iconSize:[40,40]

})

}).addTo(map);

let smoke=[];

let startTime=performance.now();

function frame(t){

let progress=(t-startTime)/4000;

if(progress>1){

explode(end);

map.removeLayer(marker);

return;

}

// curve

let lat=start.lat+(end.lat-start.lat)*progress;

let lng=start.lng+(end.lng-start.lng)*progress;

let height=Math.sin(progress*Math.PI)*20;

marker.setLatLng([lat+height,lng]);

// rotate

let angle=Math.atan2(
end.lng-lng,
end.lat-lat
)*180/Math.PI;

marker.getElement().style.transform=

`rotate(${angle}deg)`;

// smoke

let s=L.circle([lat,lng],{

radius:20000,

color:"orange"

}).addTo(map);

smoke.push(s);

requestAnimationFrame(frame);

}

requestAnimationFrame(frame);

}

function explode(pos){

L.circle(pos,{

radius:500000,

color:"red"

}).addTo(map);

}

// ==========================================================================
// LEADERBOARD
// ==========================================================================

function updateLeaderboard(){

let list=document.getElementById("leaderboard-list");

list.innerHTML="";

Object.values(playersData)

.sort((a,b)=>b.score-a.score)

.forEach(p=>{

list.innerHTML+=`

<div>

${p.name} ${getRank(p.score)}

</div>

`;

});

}

// ==========================================================================
// COINS
// ==========================================================================

window.collect=function(){

update(
ref(db,serverPath(`players/${currentPlayer.id}`)),
{

coins:currentPlayer.coins+10

});

}

// ==========================================================================
// DONE
// ==========================================================================

console.log("WORLD ROCKETS V3 ULTRA LOADED");
