// myaccount.js

// Importuri Firestore
import { firestore, auth } from './firebase-config.js';
import { doc, setDoc, deleteDoc, serverTimestamp, collection, query, orderBy, getDocs, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Importuri Firebase Storage
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const storage = getStorage();

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

auth.onAuthStateChanged(user => {
    if (user) {
        getAndDisplayAllProfileData();
        getAndDisplayProgressPictures();
    }
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
                img.style.width = "100px"; // Adjust as needed
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

