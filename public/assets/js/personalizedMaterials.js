// --- Importuri Firebase și Gemini (Dacă nu sunt deja globale și accesibile) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// --- RE-CONFIGURARE FIREBASE & GEMINI (DOAR DACĂ NU POȚI IMPORTA DIN PSIHOTERAPIE.JS SAU UN MODUL PARTAJAT) ---
// ATENȚIE: Replicarea configurației nu este ideală. Cel mai bine ar fi ca `psihoterapie.js`
// să exporte instanțele `db`, `auth`, `genAI` și funcția `callGeminiAPI` dacă e posibil,
// sau să le pui într-un fișier `config.js` separat din care ambele fișiere importă.

// Presupunem că trebuie să le reinițializăm aici pentru a fi complet independent:
const firebaseConfigMaterials = { // Folosește ACEEAȘI configurație ca în psihoterapie.js
    apiKey: "AIzaSyBn2bojEoV4_icF4fVVKFdJN1YjDhtlG98",
    authDomain: "personaltrainer-74ea4.firebaseapp.com",
    projectId: "personaltrainer-74ea4",
    storageBucket: "personaltrainer-74ea4.appspot.com",
    messagingSenderId: "591778567441",
    appId: "1:591778567441:web:bbaeac19a3fb0f190668b0",
    measurementId: "G-WLWNGNDK5V",
};

const appMaterials = initializeApp(firebaseConfigMaterials, "appMaterials"); // Dă-i un nume unic dacă inițializezi de mai multe ori
const dbMaterials = getFirestore(appMaterials);
const authMaterials = getAuth(appMaterials);

const GEMINI_API_KEY_MATERIALS = "AIzaSyAlm63krfJxBu1QR5ZmvA0rcGUnjm17sng"; // ACEEAȘI cheie
const GEMINI_MODEL_ANALIZA_TEME_MATERIALS = "gemini-2.5-flash-preview-05-20";
const GEMINI_MODEL_GENERARE_MATERIAL_MATERIALS = "gemini-2.5-flash-preview-05-20";

let genAIMaterials, geminiModelAnalizaTemeMaterials, geminiModelGenerareMaterialMaterials;

if (GEMINI_API_KEY_MATERIALS && GEMINI_API_KEY_MATERIALS.trim() !== "") {
    try {
        genAIMaterials = new GoogleGenerativeAI(GEMINI_API_KEY_MATERIALS);
        geminiModelAnalizaTemeMaterials = genAIMaterials.getGenerativeModel({ model: GEMINI_MODEL_ANALIZA_TEME_MATERIALS });
        geminiModelGenerareMaterialMaterials = genAIMaterials.getGenerativeModel({ model: GEMINI_MODEL_GENERARE_MATERIAL_MATERIALS });
        console.log("[MaterialsJS] SDK Gemini inițializat pentru materiale.");
    } catch (e) {
        console.error("[MaterialsJS] Eroare inițializare Gemini:", e);
        genAIMaterials = null; geminiModelAnalizaTemeMaterials = null; geminiModelGenerareMaterialMaterials = null;
    }
} else {
    console.warn("[MaterialsJS] Cheie API Gemini lipsă pentru materiale.");
}


// --- FUNCȚIA CALLGEMINIAPI (REPLICATĂ SAU IMPORTATĂ) ---
// Dacă `psihoterapie.js` nu o exportă, trebuie să o ai și aici.
async function callGeminiAPIForMaterials(promptText, modelToUse, generationConfigOptions = {}) {
    if (!modelToUse) {
        console.error("[MaterialsJS] Model Gemini invalid.");
        return "EROARE: Model AI neinițializat.";
    }
    try {
        // console.log(`[MaterialsJS] Trimitem la Gemini (${modelToUse.model}):`, promptText.substring(0, 200));
        const requestPayload = {
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.6, maxOutputTokens: 8000, ...generationConfigOptions }
        };
        const result = await modelToUse.generateContent(requestPayload);
        const response = result.response;
        if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return response.candidates[0].content.parts[0].text;
        } else if (response?.promptFeedback?.blockReason) {
             return `EROARE Gemini: Prompt blocat (Motiv: ${response.promptFeedback.blockReason}).`;
        } else {
            return "EROARE Gemini: Răspuns invalid.";
        }
    } catch (error) {
        console.error("[MaterialsJS] Eroare callGeminiAPI:", error);
        return `EROARE Gemini: ${error.message || "Necunoscută"}`;
    }
}


// --- CONSTANTE ȘI VARIABILE SPECIFICE ACESTUI MODUL ---
let currentUserIdMaterials = null;
const materialeListContainer = document.getElementById('materialeListContainer');
const generateNewMaterialButton = document.getElementById('generateNewMaterialButton');
const materialeInfoMessageDiv = document.getElementById('materialeInfoMessage');


// --- FUNCȚIILE PENTRU GENERAREA MATERIALELOR (SIMILARE CU EXEMPLUL ANTERIOR) ---
async function identifyKeyThemesFromRecentActivityInternal(userId, numberOfEntries = 5) {
    if (!geminiModelAnalizaTemeMaterials) return { success: false, themes: [], message: "[MaterialsJS] Serviciu AI analiză indisponibil." };
    // ... aceeași logică ca înainte, dar folosind `dbMaterials` și `callGeminiAPIForMaterials`
    let contextForAI = "Analizează... (vezi implementarea anterioară)\n\n--- EXTRAS ACTIVITATE UTILIZATOR ---\n";
    let entriesFound = 0;
    try {
        const introspectiiQuery = query(
            collection(dbMaterials, "introspectii"), // Folosește dbMaterials
            where("ownerUid", "==", userId),
            orderBy("timestampCreare", "desc"),
            limit(numberOfEntries)
        );
        const querySnapshot = await getDocs(introspectiiQuery);
        // ... restul logicii de extragere context ...
         if (querySnapshot.empty) {
            return { success: false, themes: [], message: "Nu există activitate recentă suficientă pentru analiză." };
        }
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data().continut;
            let entryText = "";
            if (data.textJurnal) {
                entryText = `Jurnal (Titlu: ${data.titluJurnal || 'N/A'}): ${data.textJurnal}`;
            } else if (data.situatie) {
                entryText = `Fișă (Situație: ${data.situatie}): Gânduri: ${data.ganduri}, Emoții: ${data.emotii}, Nevoi: ${data.nevoi_profunde}`;
            }
            if (entryText) {
                contextForAI += entryText.substring(0, 1000) + "\n---\n";
                entriesFound++;
            }
        });
        if (entriesFound === 0) {
             return { success: false, themes: [], message: "Nu s-a putut extrage text relevant." };
        }
        contextForAI += "--- SFÂRȘIT EXTRAS ACTIVITATE UTILIZATOR ---";

        const themesRaw = await callGeminiAPIForMaterials(contextForAI, geminiModelAnalizaTemeMaterials, { temperature: 0.3, maxOutputTokens: 100 });
        if (themesRaw.toUpperCase().startsWith("EROARE:")) return { success: false, themes: [], message: `Analiza AI a eșuat: ${themesRaw}` };
        const themesList = themesRaw.split('\n').map(theme => theme.replace(/^- /,'').trim()).filter(theme => theme.length > 2);
        return { success: true, themes: themesList, message: "Teme identificate." };

    } catch (error) {
        console.error("[MaterialsJS] Eroare în identifyKeyThemes:", error);
        return { success: false, themes: [], message: `Eroare sistem: ${error.message}` };
    }
}

async function generatePersonalizedMaterialContentInternal(type, theme, userContextSummary) {
    if (!geminiModelGenerareMaterialMaterials) return "EROARE: [MaterialsJS] Serviciu AI generare indisponibil.";
    // ... aceeași logică de prompt ca înainte, folosind `callGeminiAPIForMaterials`
    let materialPrompt = "";
    if (type === 'articol') {
        materialPrompt = `Rol: Ești PsihoGPT... (vezi promptul anterior pentru articol, asigură-te că e complet)\nTema: "${theme}"\nContext: ${userContextSummary.substring(0,1500)}\n...`;
    } else if (type === 'fisa_lucru') {
        materialPrompt = `Rol: Ești PsihoGPT... (vezi promptul anterior pentru fișă)\nTema: "${theme}"\nContext: ${userContextSummary.substring(0,1500)}\n...`;
    } else { return "EROARE: Tip material necunoscut."; }

    const materialContent = await callGeminiAPIForMaterials(materialPrompt, geminiModelGenerareMaterialMaterials, { temperature: 0.6, maxOutputTokens: 2000 });
    return materialContent;
}

async function handleTriggerGenerateMaterial() {
    if (!currentUserIdMaterials) {
        showUIMessageMaterials("Trebuie să fiți autentificat.", "error");
        return;
    }
    if (generateNewMaterialButton) {
        generateNewMaterialButton.disabled = true;
        generateNewMaterialButton.innerHTML = "⏳ Se analizează...";
    }
    showUIMessageMaterials("Se analizează activitatea recentă...", "info", false);

    try {
        const themesResult = await identifyKeyThemesFromRecentActivityInternal(currentUserIdMaterials);
        if (!themesResult.success || themesResult.themes.length === 0) {
            showUIMessageMaterials(themesResult.message || "Nu s-au identificat teme.", "warning", false);
            if (generateNewMaterialButton) { generateNewMaterialButton.disabled = false; generateNewMaterialButton.innerHTML = "🚀 Generează Material Nou"; }
            return;
        }
        const primaryTheme = themesResult.themes[0];
        showUIMessageMaterials(`Temă identificată: "${primaryTheme}". Se generează materiale...`, "info", false);

        let userContextSummary = `Utilizatorul a reflectat recent pe teme precum: ${themesResult.themes.join(', ')}.`;
        // Aici ai putea adăuga mai multe detalii la userContextSummary dacă e necesar

        // Generează Articol
        const articleContent = await generatePersonalizedMaterialContentInternal('articol', primaryTheme, userContextSummary);
        if (!articleContent.toUpperCase().startsWith("EROARE:")) {
            await addDoc(collection(dbMaterials, "materialeGenerate"), {
                ownerUid: currentUserIdMaterials,
                tema: primaryTheme, tipMaterial: "articol", continutGenerat: articleContent,
                timestampCreare: Timestamp.fromDate(new Date()),
                dateAfisare: new Date().toLocaleDateString("ro-RO", { day: '2-digit', month: '2-digit', year: 'numeric' })
            });
            showUIMessageMaterials(`Articol despre "${primaryTheme}" generat!`, "success");
        } else {
            showUIMessageMaterials(`Eroare generare articol: ${articleContent}`, "error", false);
        }

        // Generează Fișă de Lucru
        const worksheetContent = await generatePersonalizedMaterialContentInternal('fisa_lucru', primaryTheme, userContextSummary);
        if (!worksheetContent.toUpperCase().startsWith("EROARE:")) {
            await addDoc(collection(dbMaterials, "materialeGenerate"), {
                ownerUid: currentUserIdMaterials,
                tema: primaryTheme, tipMaterial: "fisa_lucru", continutGenerat: worksheetContent,
                timestampCreare: Timestamp.fromDate(new Date()),
                dateAfisare: new Date().toLocaleDateString("ro-RO", { day: '2-digit', month: '2-digit', year: 'numeric' })
            });
            showUIMessageMaterials(`Fișă de lucru despre "${primaryTheme}" generată!`, "success");
        } else {
            showUIMessageMaterials(`Eroare generare fișă: ${worksheetContent}`, "error", false);
        }

        await displayGeneratedMaterialsInternal(currentUserIdMaterials);

    } catch (error) {
        console.error("[MaterialsJS] Eroare în handleTriggerGenerateMaterial:", error);
        showUIMessageMaterials(`Eroare majoră: ${error.message}`, "error", false);
    } finally {
        if (generateNewMaterialButton) {
            generateNewMaterialButton.disabled = false;
            generateNewMaterialButton.innerHTML = "🚀 Generează Material Nou";
        }
    }
}

function showUIMessageMaterials(message, type = "info", autoHide = true) {
    if (!materialeInfoMessageDiv) return;
    materialeInfoMessageDiv.textContent = message;
    materialeInfoMessageDiv.className = `info-message ${type}`;
    materialeInfoMessageDiv.style.display = 'block';
    if (autoHide) {
        setTimeout(() => { if (materialeInfoMessageDiv) materialeInfoMessageDiv.style.display = 'none'; }, 7000);
    }
}

async function displayGeneratedMaterialsInternal(userId) {
    if (!materialeListContainer || !userId) return;
    materialeListContainer.innerHTML = '<p class="loading-message">Se încarcă...</p>';
    try {
        const q = query(
            collection(dbMaterials, "materialeGenerate"),
            where("ownerUid", "==", userId),
            orderBy("timestampCreare", "desc")
        );
        const querySnapshot = await getDocs(q);
        materialeListContainer.innerHTML = '';
        if (querySnapshot.empty) {
            showUIMessageMaterials("Niciun material generat încă.", "info", false);
            return;
        } else {
             if (materialeInfoMessageDiv && materialeInfoMessageDiv.textContent === "Niciun material generat încă.") materialeInfoMessageDiv.style.display = 'none';
        }
        querySnapshot.forEach(docSnap => {
            const material = { id: docSnap.id, ...docSnap.data() };
            const card = createMaterialCardElementInternal(material);
            materialeListContainer.appendChild(card);
        });
    } catch (error) {
        console.error("[MaterialsJS] Eroare afișare materiale:", error);
        materialeListContainer.innerHTML = '<p class="error-loading-message">Eroare încărcare.</p>';
    }
}

function createMaterialCardElementInternal(material) {
    // ... aceeași logică de creare card ca înainte, folosind `marked.parse` dacă e disponibil ...
    const card = document.createElement('div');
    card.className = 'response-card material-card';
    card.dataset.id = material.id;

    const typeLabel = material.tipMaterial === 'articol' ? 'Articol' : 'Fișă de Lucru';
    const title = material.tema || 'Fără Titlu';
    const entryDate = material.dateAfisare || (material.timestampCreare?.toDate ? new Date(material.timestampCreare.toDate()).toLocaleDateString("ro-RO") : 'N/A');

    let htmlContent = "(Conținut indisponibil)";
    if (typeof marked !== 'undefined' && material.continutGenerat) {
        try { htmlContent = marked.parse(material.continutGenerat); }
        catch (e) { htmlContent = "<p><i>Eroare afișare.</i></p>" + material.continutGenerat.replace(/</g, "<"); }
    } else if (material.continutGenerat) {
        htmlContent = material.continutGenerat.replace(/\n/g, "<br>");
    }

    card.innerHTML = `
        <div class="card-header">
            <span>${typeLabel}: ${title}</span>
            <span class="card-date">Generat: ${entryDate}</span>
        </div>
        <div class="card-content">
            <div class="material-content-display">${htmlContent}</div>
            <div class="card-actions">
                <button class="delete-material-button button-small" data-id="${material.id}" type="button" title="Șterge">🗑️ Șterge</button>
            </div>
        </div>
    `;
    card.querySelector('.card-header')?.addEventListener('click', (e) => {
        if (!e.target.closest('button')) card.classList.toggle('open');
    });
    return card;
}

async function handleDeleteMaterial(materialId) {
    if (!materialId || !currentUserIdMaterials) return;
    if (confirm("Sigur ștergeți acest material?")) {
        showUIMessageMaterials("Se șterge...", "info", false);
        try {
            await deleteDoc(doc(dbMaterials, "materialeGenerate", materialId));
            showUIMessageMaterials("Material șters.", "success");
            const cardToRemove = materialeListContainer.querySelector(`.material-card[data-id="${materialId}"]`);
            if (cardToRemove) cardToRemove.remove();
            if (materialeListContainer.children.length === 0) {
                showUIMessageMaterials("Niciun material generat încă.", "info", false);
            }
        } catch (err) {
            showUIMessageMaterials(`Eroare ștergere: ${err.message}`, "error");
        }
    }
}


// --- GESTIONAREA EVENIMENTELOR ȘI STĂRII PENTRU ACEST MODUL ---
document.addEventListener('DOMContentLoaded', () => {
    const tabButtonMateriale = document.getElementById('tabButtonMateriale');
    const materialeFormContainer = document.getElementById('materialeFormContainer');

    // Listener pentru butonul de tab "Resurse Personale"
    // Acesta va fi gestionat de `psihoterapie.js` prin funcția `showTab`
    // Dar trebuie să ne asigurăm că `displayGeneratedMaterialsInternal` este apelat când tab-ul devine vizibil.
    // Acest lucru se poate face prin observarea schimbării de display style sau printr-un mic "event bus" custom.
    // Sau, mai simplu, `psihoterapie.js` ar putea apela o funcție exportată de aici.

    // Deocamdată, vom lega acțiunile direct și vom gestiona vizibilitatea prin `psihoterapie.js`.
    if (generateNewMaterialButton) {
        generateNewMaterialButton.addEventListener('click', handleTriggerGenerateMaterial);
    }

    if (materialeListContainer) {
        materialeListContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('delete-material-button')) {
                const materialId = event.target.dataset.id;
                handleDeleteMaterial(materialId);
            }
        });
    }
});

// Ascultă schimbările de autentificare pentru a seta `currentUserIdMaterials`
// și pentru a încărca datele dacă tab-ul este vizibil.
onAuthStateChanged(authMaterials, (user) => {
    if (user) {
        currentUserIdMaterials = user.uid;
        if (generateNewMaterialButton) generateNewMaterialButton.disabled = false;
        // Verifică dacă tab-ul de materiale este cel curent afișat
        // Aceasta este partea mai dificilă, deoarece `psihoterapie.js` controlează `display`
        const materialeTab = document.getElementById('materialeFormContainer');
        if (materialeTab && materialeTab.style.display === 'block') {
             displayGeneratedMaterialsInternal(currentUserIdMaterials);
        }
    } else {
        currentUserIdMaterials = null;
        if (generateNewMaterialButton) generateNewMaterialButton.disabled = true;
        if (materialeListContainer) materialeListContainer.innerHTML = '';
        if (materialeInfoMessageDiv) materialeInfoMessageDiv.style.display = 'none';
    }
});

// Funcție care poate fi apelată de `psihoterapie.js` când se schimbă tab-ul
// (Aceasta este o modalitate de a lega cele două fișiere fără dependențe ciclice)
// În `psihoterapie.js`, în `showTab`:
// if (tabName === 'materiale' && currentUserId) {
//    if (window.handleMaterialeTabActivated) { // Verifică dacă funcția există
//        window.handleMaterialeTabActivated(currentUserId);
//    }
// }
window.handleMaterialeTabActivated = function(userId) {
    console.log("[MaterialsJS] Tab materiale activat pentru user:", userId);
    currentUserIdMaterials = userId; // Asigură-te că e setat corect
    if (userId) {
        displayGeneratedMaterialsInternal(userId);
    }
}