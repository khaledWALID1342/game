// ======================================================================
// WORLD ROCKETS AUTH SYSTEM
// ======================================================================

import {
initializeApp
}
from
"https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
getDatabase,
ref,
get,
set
}
from
"https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";


// ======================================================================
// FIREBASE CONFIG
// ======================================================================

const firebaseConfig = {

databaseURL:
"https://world-rockets-default-rtdb.firebaseio.com"

};

const app = initializeApp(firebaseConfig);

const db = getDatabase(app);


// ======================================================================
// ELEMENTS
// ======================================================================

const nameInput =
document.getElementById("name");

const passInput =
document.getElementById("password");

const serverInput =
document.getElementById("server");

const status =
document.getElementById("status");


// ======================================================================
// REGISTER
// ======================================================================

window.register = async function(){

const name =
nameInput.value.trim();

const pass =
passInput.value.trim();

const server =
serverInput.value;


if(!name || !pass){

status.innerText =
"⚠️ اكتب الاسم وكلمة السر";

return;

}


const id =
"player_"+name;


const playerRef =
ref(db,
`servers/${server}/players/${id}`
);


const snap =
await get(playerRef);


if(snap.exists()){

status.innerText =
"❌ الاسم مستخدم";

return;

}


// create account

await set(playerRef,{

id,

name,

password:pass,

health:100,

coins:50,

rockets:3,

score:0

});


// save login

saveLogin(name,pass,server);

};



// ======================================================================
// LOGIN
// ======================================================================

window.login = async function(){

const name =
nameInput.value.trim();

const pass =
passInput.value.trim();

const server =
serverInput.value;


if(!name || !pass){

status.innerText =
"⚠️ اكتب البيانات";

return;

}


const id =
"player_"+name;


const snap =
await get(

ref(db,
`servers/${server}/players/${id}`
)

);


if(!snap.exists()){

status.innerText =
"❌ الحساب غير موجود";

return;

}


if(snap.val().password !== pass){

status.innerText =
"❌ كلمة المرور غلط";

return;

}


// success

saveLogin(name,pass,server);

};



// ======================================================================
// SAVE LOGIN
// ======================================================================

function saveLogin(name,pass,server){

localStorage.setItem(

"wr_login",

JSON.stringify({

name,

pass,

server

})

);


status.innerText =
"✅ جاري الدخول...";


setTimeout(()=>{

window.location.href =
"game.html";

},800);

}
