// Firebase

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

// تقييم مستوى الخطورة

function getSeverity(text){

text = text.toLowerCase();

if(
text.includes("<script") ||
text.includes("onerror") ||
text.includes("onload")
){
return "HIGH";
}

if(
text.includes("select") ||
text.includes("drop") ||
text.includes("delete") ||
text.includes("insert") ||
text.includes("union")
){
return "MEDIUM";
}

if(
text.includes("<") ||
text.includes(">") ||
text.includes("--")
){
return "LOW";
}

return "SAFE";

}

// زر Test

window.checkInput = async function(){

let input = document.getElementById("input").value;

let result = document.getElementById("result");

let severity = getSeverity(input);

if(severity === "HIGH"){

result.innerHTML = "🚨 High Risk Attack";

}

else if(severity === "MEDIUM"){

result.innerHTML = "⚠️ Medium Risk Attack";

}

else if(severity === "LOW"){

result.innerHTML = "🟡 Low Risk";

}

else{

result.innerHTML = "✅ Safe";

}

// تسجيل في Firebase

await addDoc(collection(db, "logs"), {

text: input,

severity: severity,

time: new Date().toISOString(),

userAgent: navigator.userAgent

});

};
