await addDoc(collection(db, "logs"), {

text: input,

time: new Date().toISOString()

});
