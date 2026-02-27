import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
getFirestore,
collection,
addDoc
}
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase config (بياناتك)

const firebaseConfig = {

apiKey: "AIzaSyDNRQaZQGXP7UE3GskBaC0tbqEXKNq2oQc",

authDomain: "world-rockets.firebaseapp.com",

projectId: "world-rockets",

storageBucket: "world-rockets.firebasestorage.app",

messagingSenderId: "66034492326",

appId: "1:66034492326:web:76649d590a1d2555c92567",

measurementId: "G-XSYTG0J31P"

};

// تشغيل Firebase

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

// اكتشاف الهجوم

function detectAttack(text){

const patterns = [

"<script",

"alert(",

"SELECT",

"DROP",

"INSERT",

"DELETE",

"--",

"<img",

"<iframe",

"onerror"

];

return patterns.some(p =>
text.toLowerCase().includes(p.toLowerCase())
);

}

// عند الضغط على الزر

window.checkInput = async function(){

let input = document.getElementById("input").value;

let result = document.getElementById("result");

let attack = detectAttack(input);

if(attack){

result.innerHTML = "⚠️ تم اكتشاف محاولة";

}else{

result.innerHTML = "✅ إدخال آمن";

}

// تسجيل في Firebase

await addDoc(collection(db, "logs"), {

text: input,

attack: attack,

time: new Date().toISOString(),

userAgent: navigator.userAgent

});

}
