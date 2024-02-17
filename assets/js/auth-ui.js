// Importul necesar pentru utilizarea `onAuthStateChanged`
// Presupunem că `auth` este deja definit în altă parte a aplicației tale.
import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Definește funcția `showElement` pentru a afișa un element pe baza ID-ului său
function showElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = 'block';
  } else {
    console.error('Elementul nu a fost găsit:', elementId);
  }
}

// Definește funcția `hideElement` pentru a ascunde un element pe baza ID-ului său
function hideElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = 'none';
  } else {
    console.error('Elementul nu a fost găsit:', elementId);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  onAuthStateChanged(auth, (user) => {
    if (!user && window.location.pathname.includes('myaccount.html')) {
      // Afișează un mesaj de alertă și redirecționează către pagina index.html
      // fără a depinde de prezența oricărui element UI
      alert('Te rugăm să te autentifici pentru a accesa această pagină.');
      window.location.href = 'index.html';
    } else if (user) {
      // Utilizatorul este autentificat, actualizează UI-ul corespunzător
      updateUIForAuthenticatedUser();
    } else {
      // Niciun utilizator autentificat, dar pagina nu necesită autentificare
      updateUIForUnauthenticatedUser();
    }
  });

  const authButton = document.getElementById('authButton'); // Presupunem că există în HTML
  const accountButton = document.getElementById('accountButton'); // Presupunem că există în HTML
  const registerButton = document.getElementById('registerButton'); // Presupunem că există în HTML

  // Functia pentru actualizarea UI-ului pentru un utilizator autentificat
  function updateUIForAuthenticatedUser() {
    authButton.textContent = 'Delogare';
    authButton.onclick = () => {
      signOut(auth).then(() => {
        window.location.href = 'index.html'; // Redirecționează utilizatorul după delogare
      }).catch((error) => {
        console.error('Eroare la delogare:', error);
      });
    };
    if (accountButton) showElement(accountButton.id);
    if (registerButton) hideElement(registerButton.id);

  }

  // Functia pentru actualizarea UI-ului pentru vizitatori (utilizatori neautentificati)
  function updateUIForUnauthenticatedUser() {
    authButton.textContent = 'Autentificare';
    authButton.onclick = showLoginModal; // Presupunem că există o funcție pentru afișarea modalului de login
    hideElement(accountButton.id);
    showElement(registerButton.id);
    registerButton.textContent = 'Inregistrare';
    registerButton.onclick = showRegisterModal; // Presupunem că există o funcție pentru afișarea modalului de înregistrare
  }
});

function showLoginModal() {
  // Arată modalul de autentificare folosind utilitarele showElement și hideElement definite mai sus
  showElement('loginModal');
}

function showRegisterModal() {
  // Arată modalul de înregistrare folosind utilitarele showElement și hideElement definite mai sus
  showElement('registerModal');
}

function closeModal(modalId) {
  // Ascunde modalele folosind utilitarele showElement și hideElement definite mai sus
  hideElement(modalId);
}

document.addEventListener('DOMContentLoaded', function() {
  const closeButtons = document.querySelectorAll('.close-button');
  closeButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Aici `closest('.modal')` găsește elementul modal părinte al butonului
      const modal = this.closest('.modal');
      if (modal) {
        hideElement(modal.id); // Folosește `hideElement` pentru a ascunde modalul
      }
    });
  });



  // Ascunde modalele când utilizatorul face clic în afara lor pe zona de fundal
  window.addEventListener('click', function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(function(modal) {
      if (event.target === modal) {
        closeModal(modal.id);
      }
    });
  });
});
