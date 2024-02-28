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
            // Ascunde secțiunea "articole" pentru clienți
            document.getElementById('articole').style.display = 'none';
            
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

// Funcția pentru a converti un timestamp Firestore la o dată citibilă
function firestoreTimestampToString(timestamp) {
    // Verificăm dacă timestamp-ul este un obiect cu proprietatea 'seconds'
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString("ro-RO") + 
               " " + 
               timestamp.toDate().toLocaleTimeString("ro-RO");
    } else {
        // Dacă timestamp-ul nu este valid, returnăm un placeholder sau aruncăm o eroare
        return "Data necunoscută";
    }
}

async function displayProgressPictures(clientUID, containerId) {
    const progressPicturesRef = collection(firestore, `users/${clientUID}/progressPictures`);
    const progressPicturesSnapshot = await getDocs(progressPicturesRef);
    const progressContainer = document.getElementById(containerId);

    let allImageSets = [];

    if (!progressPicturesSnapshot.empty) {
        progressPicturesSnapshot.forEach((dateDoc) => {
            const date = dateDoc.id; // Data este ID-ul documentului
            const imagesSets = dateDoc.data(); // Obținem seturile de imagini pentru acea dată
            Object.entries(imagesSets).forEach(([setId, imageSet]) => {
                // Convertim timestamp-ul Firestore la Date și apoi la string
                const uploadDate = imageSet.uploadDate.toDate().toLocaleDateString("ro-RO") + ' ' + imageSet.uploadDate.toDate().toLocaleTimeString("ro-RO");
                allImageSets.push({
                    setId,
                    date,
                    uploadDate, // Folosim data formatată
                    ...imageSet
                });
            });
        });

        // Sortăm toate seturile de imagini după setId în ordine descrescătoare
        allImageSets.sort((a, b) => parseInt(b.setId) - parseInt(a.setId));

        let tableHTML = '<table class="progress-pictures-table"><thead><tr><th>Data</th><th>Imagine Față</th><th>Imagine Spate</th><th>Imagine Laterală</th></tr></thead><tbody>';

        allImageSets.forEach((imageSet) => {
            const uploadDateStr = firestoreTimestampToString(imageSet.uploadDate);
            tableHTML += `
                <tr>
                    <td>${uploadDateStr}</td>
                    <td><img src="${imageSet.frontImage || '#'}" alt="Față" style="width: 100px;"></td>
                    <td><img src="${imageSet.backImage || '#'}" alt="Spate" style="width: 100px;"></td>
                    <td><img src="${imageSet.sideImage || '#'}" alt="Lateral" style="width: 100px;"></td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
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
    
        const today = new Date().toISOString().split('T')[0];
        const uniqueId = new Date().getTime();
    
        const basePath = `users/${auth.currentUser.uid}/progressPictures/${today}/${uniqueId}`;
        const imageRefs = [
            { ref: ref(storage, `${basePath}/frontImage`), file: frontImage },
            { ref: ref(storage, `${basePath}/sideImage`), file: sideImage },
            { ref: ref(storage, `${basePath}/backImage`), file: backImage },
        ];
    
        try {
            // Încărcați imaginile și obțineți URL-urile de descărcare
            const urls = await Promise.all(imageRefs.map(async ({ ref, file }) => {
                const uploadTaskSnapshot = await uploadBytesResumable(ref, file);
                return getDownloadURL(uploadTaskSnapshot.ref);
            }));
    
            // După ce toate URL-urile au fost obținute, salvați metadatele în Firestore
            const [frontImageUrl, sideImageUrl, backImageUrl] = urls;
            const progressPicturesRef = doc(firestore, `users/${auth.currentUser.uid}/progressPictures`, today);
            const dataToSave = {
                [uniqueId]: {
                    frontImage: frontImageUrl,
                    sideImage: sideImageUrl,
                    backImage: backImageUrl,
                    uploadDate: serverTimestamp()
                }
            };
    
            // Actualizează documentul cu noile imagini fără a suprascrie datele existente
            await setDoc(progressPicturesRef, dataToSave, { merge: true });
    
            console.log("Progress pictures successfully uploaded and metadata saved.");
            alert('Pozele de progres au fost încărcate cu succes și metadatele salvate în Firestore.');
            
            // Resetează formularul
            document.getElementById('front-image').value = '';
            document.getElementById('side-image').value = '';
            document.getElementById('back-image').value = '';
        } catch (error) {
            console.error('Error uploading progress pictures or saving metadata:', error);
            alert('Eroare la încărcarea pozelor de progres sau la salvarea metadatelor.');
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


// Variabilele globale
let progressImageSets = [];
let currentSetIndex = 0;
let compareSetIndex = 1; // Indexul pentru imaginea de comparație
let currentAngle = 'front';

// Funcții ajutătoare
function createImageElement(src, alt) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.className = 'progress-image-modal';
    return img;
}

function updateModalImages() {
    const modal = document.getElementById('myModal');
    const comparisonContainer = document.getElementById('comparisonContainer');
    const currentImageSet = progressImageSets[currentSetIndex];
    const compareImageSet = progressImageSets[compareSetIndex];

    comparisonContainer.innerHTML = ''; // Golim conținutul anterior

    if (!currentImageSet || !compareImageSet) {
        console.error('Seturile de imagini nu au fost găsite.');
        return;
    }
    
    const currentImg = createImageElement(currentImageSet[currentAngle + 'Image'], `Imaginea curentă pentru ${currentAngle}`);
    const compareImg = createImageElement(compareImageSet[currentAngle + 'Image'], `Imaginea pentru comparație pentru ${currentAngle}`);

    comparisonContainer.appendChild(currentImg);
    comparisonContainer.appendChild(compareImg);
    
    modal.style.display = "block";
    document.body.classList.add('modal-open'); // Adăugăm clasa când deschidem modalul
}

function showModal(date, setId, imageKey) {
    const captionText = document.getElementById('modalCaption'); // Asigurați-vă că acest ID există în HTML

    const angle = imageKey.replace('Image', ''); // Asigurați-vă că imageKey este unul dintre 'frontImage', 'sideImage', 'backImage'
    const currentImageSet = progressImageSets.find(set => set.setId === setId && set.date === date);
    
    if (!currentImageSet) {
        console.error('Setul de imagini nu a fost găsit.');
        return;
    }
    
    // Actualizăm indexul curent și unghiul bazat pe setul găsit
    currentSetIndex = progressImageSets.indexOf(currentImageSet);
    compareSetIndex = currentSetIndex === 0 ? 1 : 0; // Setăm un index diferit pentru comparație
    currentAngle = angle;

    updateModalImages();
}

function navigateImageSet(direction) {
    currentSetIndex = (currentSetIndex + direction + progressImageSets.length) % progressImageSets.length;
    updateModalImages();
}

function navigateCompareSet(direction) {
    // Asigurați-vă că nu comparăm același set cu sine însuși
    do {
        compareSetIndex = (compareSetIndex + direction + progressImageSets.length) % progressImageSets.length;
    } while (compareSetIndex === currentSetIndex);
    updateModalImages();
}

function changeAngle(angle) {
    currentAngle = angle;
    updateModalImages();
}



// Funcția async pentru a obține și afișa pozele de progres
async function getAndDisplayProgressPictures() {
    const container = document.getElementById('progressPicturesContainer');
    container.innerHTML = '';

    const titles = document.createElement('div');
    titles.className = 'progress-image-titles';
    titles.innerHTML = '<div class="title">Front</div><div class="title">Side</div><div class="title">Back</div>';
    container.appendChild(titles);

    const progressPicturesRef = collection(firestore, `users/${auth.currentUser.uid}/progressPictures`);
    const querySnapshot = await getDocs(progressPicturesRef);

    progressImageSets = []; // Resetăm array-ul pentru a evita duplicarea

    for (const doc of querySnapshot.docs) {
        const date = doc.id;
        const sets = doc.data(); // Obținem seturile de imagini pentru acea dată

        for (const setId of Object.keys(sets)) {
            const imageData = sets[setId];
            if (imageData && imageData.uploadDate) {
                const uploadDate = imageData.uploadDate.toDate(); // Convertim timestamp-ul Firestore într-o dată JavaScript
                progressImageSets.push({ setId, date, ...imageData, uploadDate }); // Asigurați-vă că setId este atribuit aici
            }
        }
    }

    // Sortăm array-ul de seturi de imagini după uploadDate în ordine descrescătoare
    progressImageSets.sort((a, b) => b.uploadDate - a.uploadDate);

    // Afișăm fiecare set de imagini
    progressImageSets.forEach((imageSet) => {
        const formattedDate = imageSet.uploadDate.toLocaleDateString("ro-RO") + ' ' + imageSet.uploadDate.toLocaleTimeString("ro-RO");
        displayImageRow(imageSet, formattedDate, container);
    });
}

function displayImageRow(imageSet, uploadDate, container) {
    const imageRow = document.createElement('div');
    imageRow.className = 'progress-image-row';

    ['frontImage', 'sideImage', 'backImage'].forEach((imageKey) => {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';

        if (imageSet[imageKey]) {
            const img = document.createElement('img');
            img.src = imageSet[imageKey];
            img.alt = `Imagine ${imageKey} din data ${uploadDate}`;
            img.className = 'progress-image';
            
            img.addEventListener('click', () => {
                // Accesăm date și setId direct din obiectul imageSet
                const date = imageSet.date;
                const setId = imageSet.setId;
                const imageKeyCorrected = imageKey; // Nu este nevoie să modificăm imageKey, funcția showModal va gestiona asta intern
            
                // Apelăm showModal cu parametrii corecți
                showModal(date, setId, imageKeyCorrected);
            });
            
            
            
            imageContainer.appendChild(img);

            const dateLabel = document.createElement('div');
            dateLabel.className = 'date-label';
            dateLabel.innerText = uploadDate;
            imageContainer.appendChild(dateLabel);
        } else {
            imageContainer.textContent = `Nu există imagine pentru ${imageKey.replace('Image', '').toLowerCase()}`;
            imageContainer.className += ' no-image';
        }

        imageRow.appendChild(imageContainer);
    });

    container.appendChild(imageRow);
}

// Event listener pentru DOMContentLoaded pentru a asigura că DOM-ul este încărcat
document.addEventListener('DOMContentLoaded', function () {
    // Adaugă event listener pentru butoanele de navigare și unghi
    document.getElementById('prev').addEventListener('click', () => navigateImageSet(-1));
    document.getElementById('next').addEventListener('click', () => navigateImageSet(1));
    document.querySelectorAll('.angle-selector button').forEach(button => {
        button.addEventListener('click', () => changeAngle(button.getAttribute('data-angle')));
    });

    // Adaugă event listener pentru închiderea modalului
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('myModal').style.display = "none";
        document.body.classList.remove('modal-open'); // Eliminăm clasa când închidem modalul
    });

    // Apelul funcției de încărcare și afișare a pozelor de progres
    getAndDisplayProgressPictures();
});






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

document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleFormButton');
    const formContainer = document.querySelector('.form-container'); // Presupunând că formularul este într-un container cu această clasă

    toggleButton.addEventListener('click', function() {
        formContainer.classList.toggle('hidden-form');
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleArticlesFormButton');
    const container = document.querySelector('.adm-articole'); // Asigură-te că acesta selectează containerul corect

    toggleButton.addEventListener('click', function() {
        container.classList.toggle('hidden-form'); // Utilizează clasa 'hidden-form' pentru a controla vizibilitatea
    });
});
