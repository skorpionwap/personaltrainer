import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Configurați Firebase cu datele proiectului dvs.
const firebaseConfig = {
    apiKey: "AIzaSyBn2bojEoV4_icF4fVVKFdJN1YjDhtlG98",
    authDomain: "personaltrainer-74ea4.firebaseapp.com",
    projectId: "personaltrainer-74ea4",
    storageBucket: "personaltrainer-74ea4.appspot.com",
    messagingSenderId: "591778567441",
    appId: "1:591778567441:web:bbaeac19a3fb0f190668b0",
    measurementId: "G-WLWNGNDK5V",
};

// Initializează Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);


async function saveImageToStorage(file) {
    // Adaugă un timestamp sau un identificator unic la numele fișierului pentru a preveni suprascrierea
    const uniqueName = `articole/${Date.now()}-${file.name}`;
    const fileRef = ref(storage, uniqueName); // Actualizează calea pentru a include folderul comun `articole`
    await uploadBytes(fileRef, file); // Încarcă fișierul în Firebase Storage
    const url = await getDownloadURL(fileRef); // Obține URL-ul public al imaginii încărcate
    return url; // Returnează URL-ul pentru utilizare ulterioară
}


export { firestore, auth, storage, db, saveImageToStorage, initializeApp, firebaseConfig };
