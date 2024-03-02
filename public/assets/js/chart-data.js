import { firestore } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth } from './firebase-config.js';

let currentChart; // Declararea currentChart la nivel global

// Definirea corespondenței între butoane și câmpurile din Firestore
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
};
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('Utilizator autentificat:', user);
        // Utilizatorul este autentificat, poți extrage datele
        fetchDataAndUpdateChart(measurementMapping['weight']);
    } else {
        console.log('Niciun utilizator autentificat.');
        // Niciun utilizator nu este autentificat, arată un mesaj sau redirecționează
        // De exemplu, poți redirecționa utilizatorul către o pagină de login
    }
});
// Asigură-te că DOM-ul este complet încărcat înainte de a adăuga event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Setează valoarea implicită pentru dropdown
    const selectElement = document.getElementById('measurement-select');
    selectElement.value = 'weight'; // Asumând că 'weight' este valoarea opțiunii pentru greutate

    // Apel implicit pentru greutate
    fetchDataAndUpdateChart(measurementMapping['weight']);

    selectElement.addEventListener('change', (event) => {
        const measurement = event.target.value;
        const measurementField = measurementMapping[measurement] || measurement;
        if (measurementField) {
            fetchDataAndUpdateChart(measurementField);
        }
    });
});


// Funcția pentru extragerea și afișarea datelor
async function fetchDataAndUpdateChart(measurementType) {
    if (!auth.currentUser) {
        console.log('Niciun utilizator autentificat.');
        return;
    }

    const uid = auth.currentUser.uid;
    const dataPoints = [];
    const labels = [];

    const querySnapshot = await getDocs(collection(firestore, `users/${uid}/personalCollection/personalData/records`));

    querySnapshot.forEach((doc) => {
        const docData = doc.data();
        console.log(`Data for document ${doc.id}:`, docData);
        // Convertim Timestamp într-o dată lizibilă
        const date = docData.date ? docData.date.toDate().toLocaleDateString() : 'Unknown Date';

        if (docData[measurementType] && date) {
            dataPoints.push(docData[measurementType]);
            labels.push(date);
        }
    });
    console.log(`Data points for ${measurementType}:`, dataPoints);
    console.log(`Labels for ${measurementType}:`, labels);

    updateChart(dataPoints, labels, measurementType);
}

function updateChart(dataPoints, labels, measurementType) {
    // O mapare între valorile tehnice și etichetele pe care dorești să le afișezi
    const friendlyLabels = {
        'weight': 'Greutate',
        'bodyFat': 'Procent Grăsime',
        'shoulders': 'Umeri',
        'bust': 'Piept',
        'waist': 'Talie',
        'hips': 'Șolduri',
        'lBicep': 'Biceps Stâng',
        'rBicep': 'Biceps Drept',
        'lForearm': 'Antebraț Stâng',
        'rForearm': 'Antebraț Drept',
        'lThigh': 'Coapsă Stângă',
        'rThigh': 'Coapsă Dreaptă',
        'lCalf': 'Gambă Stângă',
        'rCalf': 'Gambă Dreaptă',
        // Adaugă alte măsurători aici dacă este necesar
    };

    console.log(`Fetching data for ${measurementType}:`, measurementMapping[measurementType] || measurementType);

    if (currentChart) {
        currentChart.destroy();
    }

    const ctx = document.getElementById('chart_container').getContext('2d');
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: friendlyLabels[measurementMapping[measurementType]] || measurementType,
                data: dataPoints,
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false // Adaugă această opțiune dacă dorești să începi scala Y de la o valoare diferită de zero
                }
            
            },
            plugins: {
                legend: {
                    display: false, // Setează această opțiune pe `true` dacă dorești să afișezi legenda
                    labels: {
                        // Aici poți adăuga alte opțiuni pentru stilizarea legendei
                    }
                }
            }
        }
    });
}
