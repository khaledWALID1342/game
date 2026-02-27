console.log("security loaded");

import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
getFirestore,
collection,
addDoc
}
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {

apiKey: "AIzaSyDNRQaZQGXP7UE3GskBaC0tbqEXKNq2oQc",

authDomain: "world-rockets.firebaseapp.com",

projectId: "world-rockets",

storageBucket: "world-rockets.firebasestorage.app",

messagingSenderId: "66034492326",

appId: "1:66034492326:web:76649d590a1d2555c92567"

};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

window.checkInput = async function(){

console.log("button clicked");

let input = document.getElementById("input").value;

let result = document.getElementById("result");

let attack = input.toLowerCase().includes("<script");

if(attack){

result.innerHTML = "⚠️ تم اكتشاف محاولة";

}else{

result.innerHTML = "✅ إدخال آمن";

}

try{

await addDoc(collection(db, "logs"), {

text: input,

attack: attack,

time: new Date().toISOString()

});

console.log("saved");

}catch(e){

console.log("error:", e);

}

};
