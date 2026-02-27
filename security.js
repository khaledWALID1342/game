console.log("security loaded");

window.checkInput = function(){

console.log("button clicked");

let input = document.getElementById("input").value;

let result = document.getElementById("result");

if(input.includes("<script")){

result.innerHTML = "⚠️ تم اكتشاف محاولة";

}else{

result.innerHTML = "✅ إدخال آمن";

}

};
