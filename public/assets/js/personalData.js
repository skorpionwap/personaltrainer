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

function updateStatusMessage(message, isSuccess) {
    const messageElement = document.getElementById('statusMessage');
    messageElement.textContent = message;
    
    // Setează clasa în funcție de tipul de mesaj
    if (isSuccess) {
      messageElement.className = 'status-message success';
    } else {
      messageElement.className = 'status-message error';
    }
  
    // Afișează mesajul și îl ascunde după un timp
    messageElement.style.display = 'block';
    setTimeout(() => {
      messageElement.style.display = 'none';
    }, 5000);
  }
  
// Obiect pentru a stoca instanțele graficelor pentru fiecare client
let clientCharts = {};

async function getAllClientsData() {
    const clientsRef = collection(firestore, "users");
    const q = query(clientsRef, where("role", "==", "client"));
    const querySnapshot = await getDocs(q);
    const container = document.getElementById('clientsDataContainer');
    container.innerHTML = ''; // Curăță containerul înainte de a adăuga noi elemente
    
    // Definirea mapării etichetelor prietenoase
    const measurementLabels = {
        weight: 'Greutate',
        shoulders: 'Umeri',
        chest: 'Piept',
        waist: 'Talie',
        hips: 'Șolduri',
        'l-bicep': 'Biceps Stâng',
        'r-bicep': 'Biceps Drept',
        'l-forearm': 'Antebraț Stâng',
        'r-forearm': 'Antebraț Drept',
        'l-thigh': 'Coapsă Stângă',
        'r-thigh': 'Coapsă Dreaptă',
        'l-calf': 'Gambă Stângă',
        'r-calf': 'Gambă Dreaptă',
        fat: 'Procent Grăsime'
    };

    querySnapshot.forEach((doc) => {
        const clientUID = doc.id;
        const clientData = doc.data();
        const clientDiv = document.createElement('div');
        clientDiv.className = 'client-data';
        clientDiv.innerHTML = `
            <h3>${clientData.firstName} ${clientData.lastName} (${clientData.email})</h3>
            <div id="chart-container-${clientUID}" class="chart-container">
                <canvas id="chart-${clientUID}"></canvas>
            </div>
        `;

        // Crearea și adăugarea selectorului de măsurători
        const selectContainer = document.createElement('div');
        selectContainer.className = 'select-container';
        const selectElement = document.createElement('select');
        selectElement.id = `measurement-select-${clientUID}`;
        const measurements = ['weight', 'shoulders', 'chest', 'waist', 'hips', 'l-bicep', 'r-bicep', 'l-forearm', 'r-forearm', 'l-thigh', 'r-thigh', 'l-calf', 'r-calf', 'fat'];
        measurements.forEach(measurement => {
            const option = document.createElement('option');
            option.value = measurement;
            // Convertirea codurilor în etichete prietenoase folosind maparea
            option.textContent = measurementLabels[measurement] || measurement;
            selectElement.appendChild(option);
        });
        selectContainer.appendChild(selectElement);
        clientDiv.appendChild(selectContainer);

        // Event listener pentru schimbarea selecției
        selectElement.addEventListener('change', function() {
            populateChartForClient(`chart-${clientUID}`, clientUID, this.value);
        });

        container.appendChild(clientDiv);

        // Crearea containerului pentru pozele de progres
        const progressPicturesContainer = document.createElement('div');
        progressPicturesContainer.className = 'progress-pictures';
        progressPicturesContainer.id = `progress-pictures-${clientUID}`;
        clientDiv.appendChild(progressPicturesContainer);

        // Apelurile inițiale
        populateChartForClient(`chart-${clientUID}`, clientUID, 'weight');
        displayProgressPictures(clientUID, progressPicturesContainer.id);
    });
}

// Obiect pentru maparea selecției utilizatorului la numele câmpurilor Firestore
const measurementMapping = {
    weight: 'weight',
    fat: 'bodyFat',
    shoulders: 'shoulders',
    chest: 'bust',
    waist: 'waist',
    hips: 'hips',
    'l-bicep': 'lBicep',
    'r-bicep': 'rBicep',
    'l-forearm': 'lForearm',
    'r-forearm': 'rForearm',
    'l-thigh': 'lThigh',
    'r-thigh': 'rThigh',
    'l-calf': 'lCalf',
    'r-calf': 'rCalf',
    fat: 'bodyFat' // Asigură-te că fiecare valoare din selector are un corespondent aici
};


async function populateChartForClient(canvasId, clientId, measurementType) {
    if (clientCharts[canvasId]) {
        clientCharts[canvasId].destroy();
    }

    // Utilizează mapping-ul pentru a obține numele corect al câmpului din Firestore
    const firestoreFieldName = measurementMapping[measurementType] || measurementType;

    const dataPoints = [];
    const labels = [];
    const personalDataRef = collection(firestore, `users/${clientId}/personalCollection/personalData/records`);
    const querySnapshot = await getDocs(query(personalDataRef, orderBy("date", "desc")));

    querySnapshot.forEach(doc => {
        const data = doc.data();
        const date = new Date(data.date.seconds * 1000).toLocaleDateString("ro-RO");
        if (data[firestoreFieldName]) { // Folosește numele corect al câmpului aici
            dataPoints.push(data[firestoreFieldName]);
            labels.push(date);
        }
    });

    const ctx = document.getElementById(canvasId).getContext('2d');
    clientCharts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{ label: measurementType, data: dataPoints, borderColor: 'rgb(75, 192, 192)', tension: 0.1 }]
        },
        options: { 
            maintainAspectRatio: false, 
            responsive: true,
            plugins: {
                legend: {
                    display: false // Aici se ascunde legenda
                }
            }
        },
    });
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

    if (!progressPicturesSnapshot.empty) {
        let tableHTML = '<table class="progress-pictures-table"><thead><tr><th>Data</th><th>Imagine Față</th><th>Imagine Spate</th><th>Imagine Laterală</th></tr></thead><tbody>';

        progressPicturesSnapshot.forEach((docSnapshot) => {
            const date = docSnapshot.id; // This is the user-selected date
            const imageSet = docSnapshot.data();

            // Here we directly access the images without iterating through sets
            tableHTML += `
                <tr>
                    <td>${date}</td> <!-- Display the user-selected date -->
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

    document.getElementById('save-measurements').addEventListener('click', async function(event) {
        event.preventDefault();
    
        // Preia data din input-ul de dată
        const dateInput = document.getElementById('date-input').value;
        // Converteste valoarea input-ului de dată într-un Timestamp Firestore dacă este specificată o dată
        const dateToSave = dateInput ? new Date(dateInput) : new Date();
    
        const personalData = {
            date: dateToSave,
            height: parseFloat(document.getElementById('height').value),
            weight: parseFloat(document.getElementById('weight').value),
            waist: parseFloat(document.getElementById('waist-input').value),
            bust: parseFloat(document.getElementById('chest-input').value),
            shoulders: parseFloat(document.getElementById('shoulders-input').value),
            hips: parseFloat(document.getElementById('hips-input').value),
            lBicep: parseFloat(document.getElementById('l-bicep-input').value),
            rBicep: parseFloat(document.getElementById('r-bicep-input').value),
            lForearm: parseFloat(document.getElementById('l-forearm-input').value),
            rForearm: parseFloat(document.getElementById('r-forearm-input').value),
            lThigh: parseFloat(document.getElementById('l-thigh-input').value),
            rThigh: parseFloat(document.getElementById('r-thigh-input').value),
            lCalf: parseFloat(document.getElementById('l-calf-input').value),
            rCalf: parseFloat(document.getElementById('r-calf-input').value),
            bodyFat: parseFloat(document.getElementById('fat').value),
        };
    
        if (auth.currentUser) {
            try {
                await setDoc(doc(firestore, `users/${auth.currentUser.uid}/personalCollection/personalData/records/${dateInput || new Date().toISOString()}`), personalData);
                console.log('Personal data successfully saved.');
                updateStatusMessage('Datele personale au fost salvate cu succes.', true);
    
                // Resetează formularul de date personale după salvare
                document.getElementById('date-input').value = '';
                document.getElementById('height').value = '';
                document.getElementById('weight').value = '';
                document.getElementById('waist-input').value = '';
                document.getElementById('chest-input').value = '';
                document.getElementById('shoulders-input').value = '';
                document.getElementById('hips-input').value = '';
                document.getElementById('l-bicep-input').value = '';
                document.getElementById('r-bicep-input').value = '';
                document.getElementById('l-forearm-input').value = '';
                document.getElementById('r-forearm-input').value = '';
                document.getElementById('l-thigh-input').value = '';
                document.getElementById('r-thigh-input').value = '';
                document.getElementById('l-calf-input').value = '';
                document.getElementById('r-calf-input').value = '';
                document.getElementById('fat').value = '';
            } catch (error) {
                console.error('Error saving personal data:', error);
                updateStatusMessage('Eroare la salvarea datelor personale.', false);
            }
        }
    });
    
    
    document.getElementById('progress-pictures-form').addEventListener('submit', async function(event) {
        event.preventDefault();
    
        const dateInput = document.getElementById('progress-date-input').value;
        if (!dateInput) {
            alert('Vă rugăm să selectați data pentru pozele de progres.');
            return;
        }
    
        const frontImage = document.getElementById('front-image').files[0];
        const sideImage = document.getElementById('side-image').files[0];
        const backImage = document.getElementById('back-image').files[0];
    
        // Utilizăm data selectată pentru numele documentului
        const documentPath = `users/${auth.currentUser.uid}/progressPictures/${dateInput}`;
        const firestoreRef = doc(firestore, documentPath);

        const storagePath = `users/${auth.currentUser.uid}/progressPictures/${dateInput}`;
    
        const imageRefs = [
            { ref: ref(storage, `${storagePath}/frontImage`), file: frontImage },
            { ref: ref(storage, `${storagePath}/sideImage`), file: sideImage },
            { ref: ref(storage, `${storagePath}/backImage`), file: backImage },
        ];
    
        try {
            const urls = await Promise.all(imageRefs.map(async ({ ref, file }) => {
                if (file) {
                    const uploadTaskSnapshot = await uploadBytesResumable(ref, file);
                    return getDownloadURL(uploadTaskSnapshot.ref);
                }
                return null;
            }));
    
            const [frontImageUrl, sideImageUrl, backImageUrl] = urls;
    
            // Pregătim obiectul cu datele pozelor de progres
            const progressData = {
                    frontImage: frontImageUrl,
                    sideImage: sideImageUrl,
                    backImage: backImageUrl,
                    // Setăm uploadDate la data aleasă de utilizator în loc de serverTimestamp
                    uploadDate: dateInput ? new Date(dateInput) : new Date()
            };
            
    
            // Actualizăm sau creăm documentul pentru data selectată cu noile imagini
            await setDoc(firestoreRef, progressData, { merge: true });
    
            console.log("Progress pictures successfully uploaded and metadata saved.");
            updateStatusMessage('Pozele de progres au fost încărcate cu succes și metadatele salvate în Firestore.', true);
    
            // Resetează formularul
            document.getElementById('front-image').value = '';
            document.getElementById('side-image').value = '';
            document.getElementById('back-image').value = '';
            document.getElementById('progress-date-input').value = '';

            // Update the labels to show the selected file names
           updateSelectedImage('Imaginea din față');
           updateSelectedImage('Imaginea laterală');
           updateSelectedImage('Imaginea din spate');
        } catch (error) {
            console.error('Error uploading progress pictures or saving metadata:', error);
            updateStatusMessage('Eroare la încărcarea pozelor de progres sau la salvarea metadatelor.', false);
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
        <td>${data.height || 'N/A'} cm</td>
        <td>${data.weight || 'N/A'} kg</td>
        <td>${data.bodyFat || 'N/A'}%</td>
        <td>${data.shoulders || 'N/A'} cm</td>
        <td>${data.bust || 'N/A'} cm</td>
        <td>${data.lBicep || 'N/A'} cm</td>
        <td>${data.rBicep || 'N/A'} cm</td>
        <td>${data.lForearm || 'N/A'} cm</td>
        <td>${data.rForearm || 'N/A'} cm</td>
        <td>${data.waist || 'N/A'} cm</td>
        <td>${data.hips || 'N/A'} cm</td>
        <td>${data.lThigh || 'N/A'} cm</td>
        <td>${data.rThigh || 'N/A'} cm</td>
        <td>${data.lCalf || 'N/A'} cm</td>
        <td>${data.rCalf || 'N/A'} cm</td>
    </tr>
        `;
    });
}

async function displayMeasurementsForSelectedDate(selectedDate) {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const measurementsRef = collection(firestore, `users/${auth.currentUser.uid}/personalCollection/personalData/records`);
    const q = query(measurementsRef, where("date", ">=", startOfDay), where("date", "<=", endOfDay));

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data(); // Presupunem că există o singură înregistrare pe zi

        // Actualizați etichetele cu datele respective
    document.querySelector('.measurement-label.fat').textContent = `Fat: ${data.bodyFat || 'N/A'}%`;
    document.querySelector('.measurement-label.waist').textContent = `Waist: ${data.waist || 'N/A'} cm`;
    document.querySelector('.measurement-label.hips').textContent = `Hips: ${data.hips || 'N/A'} cm`;
    document.querySelector('.measurement-label.l-bicep').textContent = `L Bicep: ${data.lBicep || 'N/A'} cm`;
    document.querySelector('.measurement-label.r-bicep').textContent = `R Bicep: ${data.rBicep || 'N/A'} cm`;
    document.querySelector('.measurement-label.l-forearm').textContent = `L Forearm: ${data.lForearm || 'N/A'} cm`;
    document.querySelector('.measurement-label.r-forearm').textContent = `R Forearm: ${data.rForearm || 'N/A'} cm`;
    document.querySelector('.measurement-label.l-thigh').textContent = `L Thigh: ${data.lThigh || 'N/A'} cm`;
    document.querySelector('.measurement-label.r-thigh').textContent = `R Thigh: ${data.rThigh || 'N/A'} cm`;
    document.querySelector('.measurement-label.l-calf').textContent = `L Calf: ${data.lCalf || 'N/A'} cm`;
    document.querySelector('.measurement-label.r-calf').textContent = `R Calf: ${data.rCalf || 'N/A'} cm`;
    document.querySelector('.measurement-label.shoulders').textContent = `Shoulders: ${data.shoulders || 'N/A'} cm`;
    document.querySelector('.measurement-label.chest').textContent = `Chest: ${data.chest || 'N/A'} cm`;
    document.querySelector('.measurement-label.weight').textContent = `Weight: ${data.weight || 'N/A'} kg`;
    document.querySelector('.measurement-label.height').textContent = `Height: ${data.height || 'N/A'} cm`;

    } else {
        alert('Nu există măsurători pentru data selectată.');
        // Opțional, puteți curăța etichetele dacă doriți
        document.querySelectorAll('.measurement-label').forEach(label => {
            label.textContent = `${label.classList[1]}: N/A`;
        });
    }
}

document.getElementById('measurement-date').addEventListener('change', (event) => {
    const selectedDate = new Date(event.target.value);
    displayMeasurementsForSelectedDate(selectedDate);
});



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

function showModal(date, imageKey) {
    const captionText = document.getElementById('modalCaption'); // Asigurați-vă că acest ID există în HTML

    const angle = imageKey.replace('Image', ''); // Transformă 'frontImage' în 'front', de exemplu
    const currentImageSet = progressImageSets.find(set => set.date === date);
    
    if (!currentImageSet) {
        console.error('Setul de imagini nu a fost găsit.');
        return;
    }
    
    // Actualizăm indexul curent și unghiul bazat pe setul găsit
    currentSetIndex = progressImageSets.indexOf(currentImageSet);
    compareSetIndex = currentSetIndex === 0 ? 1 : 0; // Setăm un index diferit pentru comparație, dacă este posibil
    currentAngle = angle; // Setăm unghiul curent

    updateModalImages(); // Actualizăm imaginile în modal
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

    // Resetăm array-ul pentru a evita duplicarea
    progressImageSets = [];

    // Parcurgem fiecare document din colecția de poze de progres
    querySnapshot.forEach((doc) => {
        const imageData = doc.data();
        // Asigurăm că avem datele imaginilor și data de încărcare
        if (imageData && imageData.uploadDate) {
            const uploadDate = imageData.uploadDate.toDate(); // Convertim timestamp-ul Firestore într-o dată JavaScript
            // Adăugăm setul de imagini în array
            progressImageSets.push({
                date: doc.id,
                frontImage: imageData.frontImage,
                sideImage: imageData.sideImage,
                backImage: imageData.backImage,
                uploadDate
            });
        }
    });

    // Sortăm array-ul de seturi de imagini după uploadDate în ordine descrescătoare
    progressImageSets.sort((a, b) => b.uploadDate - a.uploadDate);

    // Afișăm fiecare set de imagini
    progressImageSets.forEach((imageSet) => {
        const formattedDate = imageSet.uploadDate.toLocaleDateString("ro-RO");
        displayImageRow(imageSet, formattedDate, container);
    });
}

function displayImageRow(imageSet, formattedDate, container) {
    const imageRow = document.createElement('div');
    imageRow.className = 'progress-image-row';

    ['frontImage', 'sideImage', 'backImage'].forEach((imageKey) => {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';

        if (imageSet[imageKey]) {
            const img = document.createElement('img');
            img.src = imageSet[imageKey];
            img.alt = `Imagine ${imageKey.replace('Image', '').toLowerCase()} din data ${formattedDate}`;
            img.className = 'progress-image';

            // Nu este nevoie să modificăm event listener-ul, funcția showModal va gestiona asta intern
            img.addEventListener('click', () => showModal(imageSet.date, imageKey));

            imageContainer.appendChild(img);

            const dateLabel = document.createElement('div');
            dateLabel.className = 'date-label';
            dateLabel.innerText = formattedDate;
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

    // Adaugă event listener pentru butonul de închidere
document.querySelector('.close').addEventListener('click', function() {
    closeModal();
  });
  
  // Funcția pentru închiderea modalului
  function closeModal() {
    document.getElementById('myModal').style.display = "none";
    document.body.classList.remove('modal-open');
  }
  
  // Adaugă event listener pe overlay-ul modalului pentru a închide modalul la clic în afara conținutului
  document.querySelector('.modal').addEventListener('click', function(event) {
    // Verifică dacă clicul a fost în afara conținutului modalului
    if (event.target === this) {
      closeModal();
    }
  });
  
  // Previne închiderea modalului când se face clic pe conținutul său
  document.querySelector('.modal-content').addEventListener('click', function(event) {
    event.stopPropagation(); // Previne propagarea evenimentului la părinte
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
        document.getElementById('deletionStatusMessage').style.display = 'block';
        document.getElementById('deletionStatusMessage').innerHTML = `Datele din ${dateToDelete} au fost șterse cu succes.`;
        document.getElementById('deletionStatusMessage').className = 'success-message'; 
    } catch (error) {
        console.error(`Eroare la ștergerea datelor din ${dateToDelete}:`, error);
        document.getElementById('deletionStatusMessage').style.display = 'block';
        document.getElementById('deletionStatusMessage').innerHTML = `Eroare la ștergerea datelor din ${dateToDelete}.`;
        document.getElementById('deletionStatusMessage').className = 'error-message';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const toggleFormButton = document.getElementById('toggleFormButton');
    const formContainer = document.querySelector('.data-container'); // Presupunând că formularul este într-un container cu această clasă

    const toggleArticlesFormButton = document.getElementById('toggleArticlesFormButton');
    const articlesContainer = document.querySelector('.adm-articole'); // Containerul pentru articole

    const closeButton = document.getElementById('closeButton');

    toggleFormButton.addEventListener('click', function() {
        toggleSection(formContainer);
    });

    toggleArticlesFormButton.addEventListener('click', function() {
        toggleSection(articlesContainer);
    });

    closeButton.addEventListener('click', function() {
        formContainer.style.display = 'none';
        articlesContainer.style.display = 'none';
    });

    function toggleSection(section) {
        if (section.style.display === 'none') {
            section.style.display = 'block'; // Schimbă display-ul la "block" pentru a afișa secțiunea
        } else {
            section.style.display = 'none'; // Schimbă display-ul la "none" pentru a ascunde secțiunea
        }
    }
});

