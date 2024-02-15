// myaccount.js

// Importuri Firestore
import { firestore, auth } from './firebase-config.js';
import { doc, setDoc, deleteDoc, getDoc, serverTimestamp, collection, query, orderBy, getDocs, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// Importuri Firebase Storage
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const storage = getStorage();

auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log("Current user detected:", user.uid);
        const userRole = await getUserRole(user.uid);
        console.log("User role is:", userRole);
        
        if (userRole === 'client') {
            console.log("Executing client data functions");
            getAndDisplayAllProfileData();
            getAndDisplayProgressPictures();
        } else if (userRole === 'trainer') {
            console.log("Executing trainer data functions");
            getAllClientsData();
        } else {
            console.log("User role not recognized");
        }

        // Adaugă aici cod pentru a afișa/ascunde elementele HTML sau pentru a activa/dezactiva funcționalitățile în funcție de rolul utilizatorului
        if (userRole === 'trainer') {
            // Ascunde formularele și butoanele de ștergere pentru antrenor
            document.getElementById('profile-info').style.display = 'none';
            
        }
    } else {
        console.log("No current user detected");
    }
});

async function getUserRole(userId) {
    console.log("Getting user role for userID:", userId);
    const userRef = doc(firestore, `users/${userId}`);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        console.log("User document found:", userSnap.data());
        return userSnap.data().role; // presupunând că există un câmp `role`
    } else {
        console.log("No such document for userID:", userId);
        return null;
    }
}

async function getAllClientsData() {
    console.log("Fetching all clients data");
    const clientsRef = collection(firestore, "users");
    const q = query(clientsRef, where("role", "==", "client"));
    const querySnapshot = await getDocs(q);
    const container = document.getElementById('clientsDataContainer');
    container.innerHTML = ''; // Curăță containerul înainte de a adăuga noi elemente

    for (let doc of querySnapshot.docs) {
        const clientUID = doc.id;
        const clientData = doc.data();
        console.log("Processing client data for:", clientData.email);

        // Inițializare HTML pentru datele clientului
        let clientHTML = `
            <div class="client-data">
                <h3>${clientData.firstName} ${clientData.lastName} (${clientData.email})</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Înălțime</th>
                            <th>Greutate</th>
                            <th>Talie</th>
                            <th>Bust</th>
                            <th>Brațe</th>
                            <th>Coapse</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Preluare și adăugare date personale în tabel
        const personalDataRef = collection(firestore, `users/${clientUID}/personalCollection/personalData/records`);
        const personalDataSnapshot = await getDocs(query(personalDataRef, orderBy("date", "desc")));

        personalDataSnapshot.forEach(record => {
            const data = record.data();
            const date = new Date(data.date.seconds * 1000).toLocaleDateString("ro-RO");
            clientHTML += `
                <tr>
                    <td>${date}</td>
                    <td>${data.height || 'N/A'} cm</td>
                    <td>${data.weight || 'N/A'} kg</td>
                    <td>${data.waist || 'N/A'} cm</td>
                    <td>${data.bust || 'N/A'} cm</td>
                    <td>${data.arms || 'N/A'} cm</td>
                    <td>${data.thighs || 'N/A'} cm</td>
                </tr>
            `;
        });

        clientHTML += `</tbody></table>`;

        // Container pentru pozele de progres
        clientHTML += `<div class="progress-pictures" id="progress-pictures-${clientUID}"></div>`;
        container.innerHTML += clientHTML;

        // Încărcare și afișare poze de progres
        await displayProgressPictures(clientUID, `progress-pictures-${clientUID}`);
    }
    console.log("Finished processing all client data");
}

async function displayProgressPictures(clientUID, containerId) {
    const progressPicturesRef = collection(firestore, `users/${clientUID}/progressPictures`);
    const progressPicturesSnapshot = await getDocs(query(progressPicturesRef, orderBy("uploadDate", "desc")));
    const progressContainer = document.getElementById(containerId);
    // Inițializăm tabelul pentru imagini
    let tableHTML = `
        <table class="progress-pictures-table">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Imagine Față</th>
                    <th>Imagine Spate</th>
                    <th>Imagine Laterală</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (!progressPicturesSnapshot.empty) {
        progressPicturesSnapshot.forEach(progressDoc => {
            const progressData = progressDoc.data();
            const uploadDate = progressData.uploadDate ? new Date(progressData.uploadDate.seconds * 1000).toLocaleDateString("ro-RO") : "Necunoscut";

            // Construim rândul tabelului pentru fiecare set de imagini de progres
            tableHTML += `
                <tr>
                    <td>${uploadDate}</td>
                    <td><img src="${progressData.frontImage || '#'}" alt="Față" style="width: 100px;"></td>
                    <td><img src="${progressData.backImage || '#'}" alt="Spate" style="width: 100px;"></td>
                    <td><img src="${progressData.sideImage || '#'}" alt="Lateral" style="width: 100px;"></td>
                </tr>
            `;
        });
        tableHTML += `</tbody></table>`;
        progressContainer.innerHTML = tableHTML;
    } else {
        progressContainer.innerHTML = 'Nicio poză de progres disponibilă';
    }
}





// Continuarea codului pentru gestionarea evenimentelor formularului și alte funcționalități





document.addEventListener('DOMContentLoaded', function() {
    if (auth.currentUser) {
        getAndDisplayAllProfileData();
        getAndDisplayProgressPictures();
    }

    // Listener pentru formularul de date personale
    document.getElementById('personal-data-form').addEventListener('submit', async function(event) {
        event.preventDefault();
    
        const personalData = {
            date: serverTimestamp(), // Folosim serverTimestamp pentru consistență
            height: document.getElementById('height').value,
            weight: document.getElementById('weight').value,
            waist: document.getElementById('waist').value,
            bust: document.getElementById('bust').value,
            arms: document.getElementById('arms').value,
            thighs: document.getElementById('thighs').value,
        };
    
        if (auth.currentUser) {
            try {
                await setDoc(doc(firestore, `users/${auth.currentUser.uid}/personalCollection/personalData/records/${new Date().toISOString()}`), personalData);
                console.log('Personal data successfully saved.');
                alert('Datele personale au fost salvate cu succes.'); // Înlocuiește console.log cu alert pentru feedback vizibil utilizatorului
                // Resetează formularul de date personale
            document.getElementById('height').value = '';
            document.getElementById('weight').value = '';
            document.getElementById('waist').value = '';
            document.getElementById('bust').value = '';
            document.getElementById('arms').value = '';
            document.getElementById('thighs').value = '';
            } catch (error) {
                console.error('Error saving personal data:', error);
                alert('Eroare la salvarea datelor personale.'); // Feedback vizibil pentru erori
            }
        }
    });
    
    // Listener pentru formularul de încărcare a pozelor de progres
    document.getElementById('progress-pictures-form').addEventListener('submit', async function(event) {
        event.preventDefault();

        const frontImage = document.getElementById('front-image').files[0];
        const sideImage = document.getElementById('side-image').files[0];
        const backImage = document.getElementById('back-image').files[0];

        // Referințe pentru stocarea imaginilor
        const imageRefs = [
            {ref: ref(storage, `users/${auth.currentUser.uid}/progressPictures/frontImage`), file: frontImage},
            {ref: ref(storage, `users/${auth.currentUser.uid}/progressPictures/sideImage`), file: sideImage},
            {ref: ref(storage, `users/${auth.currentUser.uid}/progressPictures/backImage`), file: backImage},
        ];

        try {
            const uploadPromises = imageRefs.map(({ref, file}) => uploadBytesResumable(ref, file).then(() => getDownloadURL(ref)));
            const [frontImageUrl, sideImageUrl, backImageUrl] = await Promise.all(uploadPromises);

            const progressPicturesRef = doc(collection(firestore, `users/${auth.currentUser.uid}/progressPictures`));
            await setDoc(progressPicturesRef, {
                frontImage: frontImageUrl,
                sideImage: sideImageUrl,
                backImage: backImageUrl,
                uploadDate: serverTimestamp()
            });

            console.log("Progress pictures successfully uploaded.");
            alert('Pozele de progres au fost încărcate cu succes.'); // Feedback vizibil pentru utilizator
            // Resetează formularul de încărcare a pozelor de progres
        document.getElementById('front-image').value = '';
        document.getElementById('side-image').value = '';
        document.getElementById('back-image').value = '';
        } catch (error) {
            console.error('Error uploading progress pictures:', error);
            alert('Eroare la încărcarea pozelor de progres.'); // Feedback vizibil pentru erori
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    if (auth.currentUser) {
        getAndDisplayAllProfileData();
        getAndDisplayProgressPictures();
    }

    document.getElementById('deletePersonalDataButton').addEventListener('click', async () => {
        const dateToDelete = document.getElementById('deletePersonalDataDate').value;
        await deleteDataByDate(dateToDelete, 'personalCollection/personalData/records');
    });

    document.getElementById('deleteProgressPicturesButton').addEventListener('click', async () => {
        const dateToDelete = document.getElementById('deleteProgressPicturesDate').value;
        await deleteDataByDate(dateToDelete, 'progressPictures');
    });
});

async function getAndDisplayAllProfileData() {
    const tbody = document.querySelector('#profileDataContainer tbody');
    tbody.innerHTML = ''; // Clear tbody before adding new rows
    const q = query(collection(firestore, `users/${auth.currentUser.uid}/personalCollection/personalData/records`), orderBy("date", "desc"));
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(doc => {
        const data = doc.data();
        const date = new Date(data.date.seconds * 1000).toLocaleDateString("ro-RO");
        tbody.innerHTML += `
            <tr>
                <td>${date}</td>
                <td>${data.height || ''} cm</td>
                <td>${data.weight || ''} kg</td>
                <td>${data.waist || ''} cm</td>
                <td>${data.bust || ''} cm</td>
                <td>${data.arms || ''} cm</td>
                <td>${data.thighs || ''} cm</td>
            </tr>
        `;
    });
}

async function getAndDisplayProgressPictures() {
    const container = document.getElementById('progressPicturesContainer');
    container.innerHTML = ''; // Clear the container before adding new images
    const q = query(collection(firestore, `users/${auth.currentUser.uid}/progressPictures`), orderBy("uploadDate", "desc"));
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(doc => {
        const data = doc.data();
        const uploadDate = data.uploadDate ? new Date(data.uploadDate.seconds * 1000).toLocaleDateString("ro-RO") : "Necunoscut";
        
        // Crează un div pentru a grupa imaginile și data încărcării
        const imageGroup = document.createElement('div');
        imageGroup.className = 'progress-image-group';
        imageGroup.innerHTML = `<h4>Data încărcării: ${uploadDate}</h4>`;

        // Definește ordinea dorită a imaginilor
        const imageOrder = ['frontImage', 'sideImage', 'backImage'];
        
        // Sortează și afișează imaginile în ordinea definită
        imageOrder.forEach(key => {
            if (data[key]) { // Verifică dacă cheia există în date
                const img = document.createElement('img');
                img.src = data[key];
                img.alt = `${key}`;
                imageGroup.appendChild(img);
            }
        });

        container.appendChild(imageGroup);
    });
}


async function deleteDataByDate(dateToDelete, collectionPath) {
    const startOfDay = new Date(dateToDelete);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateToDelete);
    endOfDay.setHours(23, 59, 59, 999);

    // Determină tipul de câmp folosit pentru filtrare în funcție de calea colecției
    const dateField = collectionPath.includes('personalCollection/personalData/records') ? "date" : "uploadDate";

    const q = query(collection(firestore, `users/${auth.currentUser.uid}/${collectionPath}`), where(dateField, ">=", startOfDay), where(dateField, "<=", endOfDay));
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        // Verifică dacă documentul include referințe la imagini (pentru colecția de poze de progres)
        if (collectionPath.includes('progressPictures')) {
            for (const key of Object.keys(data)) {
                if (key.includes('Image')) {
                    const fileRef = ref(storage, data[key]); // Presupunând că `data[key]` este URL-ul imaginii în Storage
                    await deleteObject(fileRef); // Șterge fișierul din Storage
                }
            }
        }
        // Șterge documentul din Firestore
        return deleteDoc(doc.ref);
    });

    try {
        await Promise.all(deletePromises);
        alert(`Datele din ${dateToDelete} au fost șterse cu succes.`);
    } catch (error) {
        console.error(`Eroare la ștergerea datelor din ${dateToDelete}:`, error);
        alert(`Eroare la ștergerea datelor din ${dateToDelete}.`);
    }
}

