
    // Importă referințele necesare din Firestore
    import { firestore } from './firebase-config.js';
    import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
     
    document.addEventListener('DOMContentLoaded', () => {
    const db = getFirestore(); // Inițializează instanța Firestore

    // Funcție pentru a obține valoarea unui input după ID
    function getInputVal(id) {
        return document.getElementById(id).value;
    }

    // Funcție pentru a salva mesajul în Firestore
    async function saveMessage(name, email, subject, message) {
        try {
            const docRef = await addDoc(collection(firestore, "messages"), {
                name: name,
                email: email,
                subject: subject,
                message: message,
                timestamp: serverTimestamp()
            });
            console.log("Document written with ID: ", docRef.id);
            alert("Mesajul a fost trimis cu succes!");
            document.getElementById('contact').reset();
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("A apărut o eroare la trimiterea mesajului.");
        }
    }

    // Adaugă event listener la formularul de contact
    const contactForm = document.getElementById('contact');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Obține valorile din formular
            var name = getInputVal('name');
            var email = getInputVal('email');
            var subject = getInputVal('subject');
            var message = getInputVal('message');

            // Salvare mesaj în Firestore
            await saveMessage(name, email, subject, message);
        });
    }

    async function displayMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            // Înlocuiește conținutul containerului cu un tabel nou
            messagesContainer.innerHTML = `
            <div class="client-messages">
            <table id="messagesTable" class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Subject</th>
                        <th>Message</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>`;
    
            const tableBody = messagesContainer.querySelector('#messagesTable tbody');
    
            const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
    
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const row = tableBody.insertRow(); // Creează un nou rând în tbody
                
                // Adaugă celule pentru fiecare coloană
                const nameCell = row.insertCell();
                nameCell.textContent = data.name;
    
                const emailCell = row.insertCell();
                emailCell.textContent = data.email;
    
                const subjectCell = row.insertCell();
                subjectCell.textContent = data.subject;
    
                const messageCell = row.insertCell();
                messageCell.textContent = data.message;
    
                const dateCell = row.insertCell();
                // Presupunând că timestamp este un obiect Timestamp Firebase, îl convertim într-un format de dată citibil
                // Verifică dacă există o valoare de timestamp înainte de a încerca să o convertești
                dateCell.textContent = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : 'N/A';
            });
        }
    }
    

    // Apelarea funcției pentru a afișa mesajele
    displayMessages();
});
