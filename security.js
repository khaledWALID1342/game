import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
getFirestore,
collection,
addDoc
}
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {

apiKey: "YOUR_KEY",
authDomain: "YOUR_DOMAIN",
projectId: "world-rockets"

};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Rate Limit

let lastRequest = 0;

// Severity detection

function getSeverity(text){

text = text.toLowerCase();

if(text.includes("<script") || text.includes("onerror"))
return "HIGH";

if(text.includes("drop") || text.includes("select"))
return "MEDIUM";

if(text.includes("<") || text.includes(">"))
return "LOW";

return "SAFE";

}

window.checkInput = async function(){

let now = Date.now();

// Rate limit (3 seconds)

if(now - lastRequest < 3000){

result.innerHTML = "⛔ انتظر 3 ثواني";
return;

}

lastRequest = now;

let input = document.getElementById("input").value;

let severity = getSeverity(input);

document.getElementById("result").innerHTML =
"Severity: " + severity;

// save to firebase

await addDoc(collection(db, "logs"), {

text: input,
severity: severity,
time: new Date().toISOString()

});

}
