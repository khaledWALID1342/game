import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {

getFirestore,

collection,

addDoc

}

from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {

apiKey: "YOUR KEY",

authDomain: "YOUR DOMAIN",

projectId: "YOUR PROJECT ID",

};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

function detectAttack(input){

const patterns = [

"<script>",

"SELECT",

"DROP",

"UNION",

"--",

"alert("

];

return patterns.some(p => input.includes(p));

}

window.check = async function(){

let input = document.getElementById("input").value;

let result = document.getElementById("result");

if(detectAttack(input)){

result.innerHTML = "⚠️ Attack Detected and Logged";

await addDoc(collection(db, "attacks"), {

input: input,

time: new Date().toString(),

userAgent: navigator.userAgent

});

}else{

result.innerHTML = "✅ Safe";

}

}
