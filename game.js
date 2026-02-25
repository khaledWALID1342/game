// ======================================================================
// 🌍 WORLD ROCKETS — V5 ULTRA MMO ENGINE
// ======================================================================

import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
getDatabase,
ref,
onValue,
update,
get,
push
}
from
"https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";


// ======================================================================
// FIREBASE
// ======================================================================

const firebaseConfig = {

databaseURL:
"https://world-rockets-default-rtdb.firebaseio.com"

};

const app = initializeApp(firebaseConfig);

const db = getDatabase(app);


// ======================================================================
// LOGIN SYSTEM
// ======================================================================

const login =
JSON.parse(
localStorage.getItem("wr_login")
);

if(!login){

location.href="index.html";

}

const server = login.server;

const myID = "player_"+login.name;

let me=null;


// ======================================================================
// MAP SYSTEM
// ======================================================================

const map=L.map("map",{

zoomControl:false,

minZoom:3,

maxZoom:8,

maxBounds:[
[-85,-180],
[85,180]
],

maxBoundsViscosity:1

}).setView([25,30],4);


L.tileLayer(

"https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"

).addTo(map);


// ======================================================================
// DATABASE PATH
// ======================================================================

function path(p){

return
`servers/${server}/${p}`;

}


// ======================================================================
// GAME DATA
// ======================================================================

let players={};

let markers={};

let territories={};


// ======================================================================
// LOAD PLAYERS
// ======================================================================

onValue(

ref(db,path("players")),

snap=>{

if(!snap.exists()) return;

players=snap.val();

me=players[myID];

updateHUD();

drawPlayers();

});


// ======================================================================
// DRAW PLAYERS
// ======================================================================

function drawPlayers(){

for(let id in players){

let p=players[id];

if(!p.lat) continue;


// marker

if(!markers[id]){

markers[id]=L.marker(

[p.lat,p.lng],

{

icon:L.divIcon({

html:

`<div style="

width:18px;

height:18px;

background:${p.color};

border-radius:50%;

box-shadow:0 0 15px ${p.color};

"></div>`

})

}).addTo(map);


markers[id].onclick=()=>{

playerMenu(p);

};

}

markers[id].setLatLng([p.lat,p.lng]);


// territory

let radius=p.score*20;

if(!territories[id]){

territories[id]=L.circle(

[p.lat,p.lng],

{

radius,

color:p.color,

fillOpacity:.1

}

).addTo(map);

}

territories[id].setRadius(radius);

}

}


// ======================================================================
// PLAYER MENU
// ======================================================================

function playerMenu(p){

if(p.id===myID) return;

Swal.fire({

title:p.name,

text:"اختر العملية",

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
clanInvite(p);

});

}


// ======================================================================
// ATTACK SYSTEM
// ======================================================================

function attack(target){

if(me.rockets<=0){

alert("لا يوجد صواريخ");

return;

}


// consume rocket

update(

ref(db,path("players/"+myID)),

{

rockets:me.rockets-1

}

);


// launch

rocketAnimation(

[me.lat,me.lng],

[target.lat,target.lng]

);


// damage

setTimeout(()=>{

let damage=25;

update(

ref(db,path("players/"+target.id)),

{

health:target.health-damage

}

);

},4000);

}


// ======================================================================
// ROCKET ANIMATION
// ======================================================================

function rocketAnimation(start,end){

let rocket=L.marker(start,{

icon:L.divIcon({

html:"🚀",

iconSize:[40,40]

})

}).addTo(map);


let startTime=performance.now();


function animate(t){

let progress=(t-startTime)/4000;


if(progress>=1){

explode(end);

map.removeLayer(rocket);

return;

}


// curved path

let lat=

start[0]+

(end[0]-start[0])*progress;

let lng=

start[1]+

(end[1]-start[1])*progress;


// arc

lat+=
Math.sin(progress*Math.PI)*15;


rocket.setLatLng([lat,lng]);


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

radius:15000,

color:"orange",

opacity:.3

}

).addTo(map);


requestAnimationFrame(animate);

}

requestAnimationFrame(animate);

}


// ======================================================================
// EXPLOSION
// ======================================================================

function explode(pos){

let boom=L.circle(pos,{

radius:80000,

color:"red",

fillOpacity:.5

}).addTo(map);


setTimeout(
()=>map.removeLayer(boom),
2000
);

}


// ======================================================================
// DM SYSTEM
// ======================================================================

function sendDM(target){

Swal.fire({

title:"اكتب الرسالة",

input:"text"

})

.then(res=>{

if(!res.value) return;


push(

ref(db,path("dm/"+target.id)),

{

from:login.name,

text:res.value,

time:Date.now()

}

);

});

}


// inbox listener

onValue(

ref(db,path("dm/"+myID)),

snap=>{

if(!snap.exists()) return;

let count=
Object.keys(snap.val()).length;

let el=
document.getElementById("msg-count");

if(el) el.innerText=count;

});


// ======================================================================
// CLAN SYSTEM
// ======================================================================

function clanInvite(target){

update(

ref(db,path("players/"+target.id)),

{

clan:me.clan||myID

}

);

}


// ======================================================================
// HUD
// ======================================================================

function updateHUD(){

if(!me) return;

setText("hud-health",me.health);

setText("hud-coins",me.coins);

setText("hud-rockets",me.rockets);

}


function setText(id,value){

let el=
document.getElementById(id);

if(el) el.innerText=value;

}


// ======================================================================
// BASE LOCATION
// ======================================================================

document

.getElementById("btn-locate")

.onclick=()=>{

map.once("click",e=>{

update(

ref(db,path("players/"+myID)),

{

lat:e.latlng.lat,

lng:e.latlng.lng

}

);

});

};


// ======================================================================
// READY
// ======================================================================

console.log("🌍 WORLD ROCKETS V5 ULTRA READY");
