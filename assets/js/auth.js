// auth.js
import { auth } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Inițializarea Firestore
const db = getFirestore();

// Funcția de validare a parolei
function validatePassword(password) {
    // Verifică lungimea parolei, prezența unei litere mari, a unui număr și a unui caracter special
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
}

// Înregistrarea formularului
const registrationForm = document.getElementById("registration-form");

registrationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("registration-email").value;
    const password = document.getElementById("registration-password").value;
     // Validează parola înainte de a continua
     if (!validatePassword(password)) {
      document.getElementById("registration-error-message").textContent = "Parola trebuie să aibă minim 8 caractere, inclusiv o literă mare, un număr și un caracter special.";
      return; // Oprește executarea ulterioară a codului
  }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid; // ID-ul utilizatorului

      // Datele suplimentare din formular
      const firstName = document.getElementById("registration-first-name").value;
      const lastName = document.getElementById("registration-last-name").value;
      const gender = document.getElementById("registration-gender").value;
      const role = document.getElementById("registration-role").value;

      // Salvarea datelor în Firestore
      await setDoc(doc(db, "users", userId), {
        firstName,
        lastName,
        gender,
        email, // Opțional
        role
      });
      
      window.location.href = './myaccount.html'; // Redirecționare
    } catch (error) {
      document.getElementById("registration-error-message").textContent = "Eroare la înregistrare: " + error.message;
    }
});

// Formularul de autentificare
const loginForm = document.getElementById("login-form");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      window.location.href = './myaccount.html'; // Redirecționare
    } catch (error) {
      document.getElementById("login-error-message").textContent = "Eroare la autentificare: " + error.message;
    }
  });

  // Ascultător pentru link-ul de resetare a parolei
document.getElementById('reset-password').addEventListener('click', function(e) {
  e.preventDefault();

  const email = prompt("Te rog să introduci adresa de email pentru resetarea parolei:");
  if (email) { // Verifică dacă email-ul a fost introdus
      sendPasswordResetEmail(auth, email).then(() => {
          alert("Email-ul de resetare a parolei a fost trimis. Verifică-ți inbox-ul.");
      }).catch((error) => {
          console.error("Eroare la trimiterea email-ului de resetare a parolei: ", error);
          alert("Eroare la trimiterea email-ului de resetare a parolei: " + error.message);
      });
  } else {
      alert("Email-ul este necesar pentru resetarea parolei.");
  }
});