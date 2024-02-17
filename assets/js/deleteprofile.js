import { auth } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser, getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, listAll, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const db = getFirestore();


function showReauthForm() {
    const reauthHtml = `
        <div id="reauth-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;">
            <form id="reauth-form" style="background: white; padding: 20px; border-radius: 5px;">
                <h2>Confirmare ștergere cont</h2>
                <p>Pentru a confirma ștergerea contului, reintroduceți parola:</p>
                <input type="password" id="user-password" placeholder="Parola" required>
                <button type="submit">Confirmă Ștergerea</button>
                <button type="button" id="cancel-button">Anulează</button>
            </form>
        </div>
    `;
  
    document.body.insertAdjacentHTML('beforeend', reauthHtml);
    document.getElementById('reauth-form').addEventListener('submit', handleReauthSubmit);
    
    // Adaugă un listener pentru butonul de Anulează pentru a închide modalul
    document.getElementById('cancel-button').addEventListener('click', closeReauthModal);
  }
  
  
  function closeReauthModal() {
    const modal = document.getElementById('reauth-modal');
    if (modal) {
        modal.remove();
    }
  }
  
  function handleReauthSubmit(event) {
    event.preventDefault();
    const userProvidedPassword = document.getElementById('user-password').value;
    reauthenticateAndDeleteUser(userProvidedPassword); // Folosește noua funcție pentru a combina reautentificarea cu ștergerea
  }
  
  function reauthenticateUser(userProvidedPassword) {
    const user = firebase.auth().currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, userProvidedPassword);
  
    user.reauthenticateWithCredential(credential).then(() => {
        deleteUserProfile(); // Continuă cu ștergerea profilului
    }).catch((error) => {
        console.error("Eroare de reautentificare: ", error);
        alert("Reautentificare eșuată: " + error.message);
        closeReauthModal(); // Închide modalul în caz de eroare
    });
  }
  
  async function deleteUserData(userId) {
    // Șterge date din personalCollection/personalData/records
    await deleteDocumentsInSubcollection(db, `users/${userId}/personalCollection/personalData/records`);
    
    // Șterge imagini din progressPictures
    await deleteDocumentsInSubcollection(db, `users/${userId}/progressPictures`);
  
    // Șterge utilizatorul principal
    await deleteDoc(doc(db, `users/${userId}`));
  }
  
  
  async function deleteDocumentsInSubcollection(db, collectionPath) {
    const collectionRef = collection(db, collectionPath);
    const querySnapshot = await getDocs(collectionRef);
  
    // Iterează prin fiecare document din colecție și le șterge
    for (const docSnapshot of querySnapshot.docs) {
      await deleteDoc(docSnapshot.ref);
    }
  }
  
  
  const storage = getStorage();
  
  async function deleteUserFiles(userId) {
    try {
        // Căile specifice către fișierele care trebuie șterse
        const filePaths = [
            `users/${userId}/progressPictures/backImage`,
            `users/${userId}/progressPictures/frontImage`,
            `users/${userId}/progressPictures/sideImage`,
        ];

        // Crearea și executarea promisiunilor de ștergere pentru fiecare fișier
        const deletionPromises = filePaths.map(path => {
            const fileRef = ref(storage, path);
            return deleteObject(fileRef);
        });
        await Promise.all(deletionPromises);

        console.log("Imaginile specificate au fost șterse cu succes.");
    } catch (error) {
        console.error("Eroare la ștergerea fișierelor din Firebase Storage: ", error);
    }
}

  
  // Presupunând că toate funcțiile necesare pentru reautentificare și afișarea formularului sunt deja definite
  
  async function deleteUserProfile() {
    // Inițial nu mai avem nevoie de event.preventDefault(), deoarece nu apelăm această funcție dintr-un handler de eveniment
  
    const user = auth.currentUser;
    if (!user) {
        alert("Trebuie să fii autentificat pentru a șterge profilul.");
        return;
    }
  
    // În loc de confirm(), afișăm formularul de reautentificare
    showReauthForm();
  }
  
  // Acest cod presupune că reauthenticateAndDeleteUser va reautentifica utilizatorul și va șterge profilul acestuia
  async function reauthenticateAndDeleteUser(userProvidedPassword) {
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, userProvidedPassword);
  
      // Reautentificare utilizator
      await reauthenticateWithCredential(user, credential);
      console.log("Utilizatorul a fost reautentificat cu succes.");

      const userId = user.uid;
      // Șterge fișierele utilizatorului din Firebase Storage
      await deleteUserFiles(userId); 
      console.log("Fișierele utilizatorului din Storage au fost șterse.");

      // Șterge datele utilizatorului din Firestore
      await deleteUserData(userId); 
      console.log("Datele utilizatorului din Firestore au fost șterse.");

      // Șterge contul utilizatorului din Firebase Auth
      await deleteUser(user); 
      console.log("Contul utilizatorului din Firebase Auth a fost șters.");

      alert("Profilul tău a fost șters cu succes.");
      window.location.href = './index.html';
    } catch (error) {
      console.error("Eroare la procesarea cererii: ", error);
      alert("Eroare la procesare: " + error.message);
      closeReauthModal(); // Închide modalul de reautentificare în caz de eroare
    }
}

  
  
  // Asigură-te că acest cod este executat după încărcarea completă a documentului
  document.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById("delete-profile").addEventListener("click", deleteUserProfile);
  });
  