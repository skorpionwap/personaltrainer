// Importuri Firestore și Firebase Storage
import { firestore, auth, db } from './firebase-config.js';
import { doc, getDoc, getDocs, collection, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Converteste timestamp Firebase in obiect Date
function convertFirebaseTimestampToDate(timestamp) {
    return timestamp.toDate(); // Presupunand ca timestamp este un obiect Firebase Timestamp
}

// Functia pentru preluarea datelor de baza ale utilizatorului (gen si data nasterii)
async function getUserBasicData(userId) {
    console.log("Fetching user basic data for:", userId);
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
        console.log("No data found for user.");
        return null;
    }
    const userData = userSnap.data();
    if (userData.birthdate) {
        userData.birthdate = convertFirebaseTimestampToDate(userData.birthdate);
    }
    console.log("User data retrieved:", userData);
    return userData; // Returneaza genul si data nasterii
}

// Functia pentru preluarea ultimelor masuratori de inaltime si greutate
async function getLatestMeasurements(userId) {
    console.log("Fetching latest measurements for:", userId);
    const measurementsRef = collection(db, `users/${userId}/personalCollection/personalData/records`);
    const q = query(measurementsRef, orderBy("date", "desc"), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        console.log("No measurements found for user.");
        return null;
    }
    console.log("Measurements data retrieved:", querySnapshot.docs[0].data());
    return querySnapshot.docs[0].data(); // Returneaza ultimele inaltime si greutate
}


function calculateAge(birthdate) {
    const birthday = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const m = today.getMonth() - birthday.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
        age--;
    }
    return age;
}

function calculateBMR(height, weight, gender, birthdate) {
    const age = calculateAge(birthdate);
    if (gender === "masculin") {
        return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else if (gender === "feminin") {
        return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    } else {
        console.log("Gender not specified correctly.");
        return null; // Asigură-te că gestionezi acest caz în codul tău
    }
}

function calculateTDEE(BMR) {
    const activityLevels = {
        "sedentar": 1.2,
        "usor_activ": 1.375,
        "moderat_activ": 1.55,
        "foarte_activ": 1.725,
        "extrem_activ": 1.9,
    };
    let tdeeEstimates = {};
    for (let level in activityLevels) {
        tdeeEstimates[level] = BMR * activityLevels[level];
    }
    return tdeeEstimates; // Returnează estimări TDEE pentru fiecare nivel de activitate
}


function calculateCaloricBudgets(TDEE) {
    return {
        "slabire": TDEE - 500,
        "mentinere": TDEE,
        "crestere": TDEE + 500,
    };
}


// Functia centralizata pentru actualizarea informatiilor nutritionale
async function updateNutritionalInformation(userId) {
    console.log("Updating nutritional information for:", userId);
    const userData = await getUserBasicData(userId);
    const measurements = await getLatestMeasurements(userId);

    if (!userData || !measurements) {
        console.log("Missing user data or measurements.");
        return;
    }

    const height = Number(measurements.height);
    const weight = Number(measurements.weight);
    if (isNaN(height) || isNaN(weight)) {
        console.log("Height or weight is not a valid number.");
        return;
    }

    const BMR = calculateBMR(height, weight, userData.gender, userData.birthdate);
    const tdeeEstimates = calculateTDEE(BMR);
    const caloricBudgets = {};
    Object.keys(tdeeEstimates).forEach(level => {
        caloricBudgets[level] = calculateCaloricBudgets(tdeeEstimates[level]);
    });

    document.getElementById("bmr-result").textContent = BMR.toFixed(2);
    updateTDEEAndCaloricSuggestions(tdeeEstimates, caloricBudgets);
}

function updateTDEEAndCaloricSuggestions(tdeeEstimates, caloricBudgets) {
    const tdeeResultsEl = document.getElementById("tdee-results");
    const caloricSuggestionsEl = document.getElementById("caloric-suggestions");

    // Clear the existing content
    tdeeResultsEl.innerHTML = '';
    caloricSuggestionsEl.innerHTML = '';

    // Function to calculate macronutrient distribution
    const calculateMacronutrients = (calories) => {
        return {
            proteins: Math.round(calories * 0.30 / 4), // 1g protein = 4 calories
            fats: Math.round(calories * 0.25 / 9),     // 1g fat = 9 calories
            carbs: Math.round(calories * 0.45 / 4)     // 1g carb = 4 calories
        };
    };

    // Iterate through TDEE estimates and display the results and caloric budgets for each activity level
    Object.keys(tdeeEstimates).forEach(level => {
        const tdeeItem = document.createElement("li");
        tdeeItem.classList.add("tdee-item");
        tdeeItem.textContent = `${level.charAt(0).toUpperCase() + level.slice(1).replace("_", " ")}: ${tdeeEstimates[level].toFixed(2)} calorii`;
        tdeeResultsEl.appendChild(tdeeItem);

        const budgetsDiv = document.createElement("div");
        budgetsDiv.classList.add("caloric-suggestion");
        const macronutrients = calculateMacronutrients(tdeeEstimates[level]);

        budgetsDiv.innerHTML = `
            <div class="suggestion-title">${level.charAt(0).toUpperCase() + level.slice(1).replace("_", " ")}</div>
            <div class="suggestion-content">
                <strong>Slăbire:</strong> ${caloricBudgets[level]["slabire"].toFixed(2)} calorii<br>
                <strong>Menținere:</strong> ${caloricBudgets[level]["mentinere"].toFixed(2)} calorii<br>
                <strong>Creștere:</strong> ${caloricBudgets[level]["crestere"].toFixed(2)} calorii<br>
                <div class="macro-nutrient-info">
                    <p>Macronutrienti menținere:</p>
                    <p><strong>Proteine:</strong> ${macronutrients.proteins}g</p>
                    <p><strong>Grăsimi:</strong> ${macronutrients.fats}g</p>
                    <p><strong>Carbohidrați:</strong> ${macronutrients.carbs}g</p>
                </div>
            </div>`;
        caloricSuggestionsEl.appendChild(budgetsDiv);
    });
}

// Verificarea starii de autentificare a utilizatorului si actualizarea informatiilor nutritionale corespunzator
auth.onAuthStateChanged(user => {
    if (user) {
        console.log("User is signed in:", user.uid);
        updateNutritionalInformation(user.uid);
    } else {
        console.log("No user is signed in.");
    }
});