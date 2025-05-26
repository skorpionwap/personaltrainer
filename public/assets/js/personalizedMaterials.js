// --- IMPORTURI ȘI CONFIGURARE INIȚIALĂ (Firebase, Gemini) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs,getDoc, deleteDoc, doc, query, where, orderBy, Timestamp, limit as firestoreLimit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// --- CONFIGURARE FIREBASE & GEMINI (replicată aici pentru independență) ---
// ATENȚIE: Ideal ar fi să imporți dintr-un modul partajat (config.js)
const firebaseConfigMaterials = {
    apiKey: "AIzaSyBn2bojEoV4_icF4fVVKFdJN1YjDhtlG98", // Înlocuiește cu cheia ta reală
    authDomain: "personaltrainer-74ea4.firebaseapp.com",
    projectId: "personaltrainer-74ea4",
    storageBucket: "personaltrainer-74ea4.appspot.com",
    messagingSenderId: "591778567441",
    appId: "1:591778567441:web:bbaeac19a3fb0f190668b0",
    measurementId: "G-WLWNGNDK5V",
};

const appMaterials = initializeApp(firebaseConfigMaterials, "appMaterials" + Date.now()); // Nume unic pentru a evita conflicte
const dbMaterials = getFirestore(appMaterials);
const authMaterials = getAuth(appMaterials);

const GEMINI_API_KEY_MATERIALS = "AIzaSyAlm63krfJxBu1QR5ZmvA0rcGUnjm17sng"; // Înlocuiește cu cheia ta reală
const GEMINI_MODEL_ANALIZA_TEME_MATERIALS = "gemini-2.5-flash-preview-05-20"; // Model capabil de context mare
const GEMINI_MODEL_GENERARE_MATERIAL_MATERIALS = "gemini-2.5-flash-preview-05-20"; // Model capabil de generare

let genAIMaterials, geminiModelAnalizaTemeMaterials, geminiModelGenerareMaterialMaterials;

if (GEMINI_API_KEY_MATERIALS && GEMINI_API_KEY_MATERIALS.trim() !== "") {
    try {
        genAIMaterials = new GoogleGenerativeAI(GEMINI_API_KEY_MATERIALS);
        geminiModelAnalizaTemeMaterials = genAIMaterials.getGenerativeModel({ model: GEMINI_MODEL_ANALIZA_TEME_MATERIALS });
        geminiModelGenerareMaterialMaterials = genAIMaterials.getGenerativeModel({ model: GEMINI_MODEL_GENERARE_MATERIAL_MATERIALS });
        console.log("[MaterialsJS] SDK Gemini inițializat.");
    } catch (e) {
        console.error("[MaterialsJS] Eroare inițializare Gemini:", e);
        genAIMaterials = null; // Setează la null pentru a putea verifica ulterior
    }
} else {
    console.warn("[MaterialsJS] Cheie API Gemini lipsă. Funcționalitatea AI pentru materiale va fi limitată.");
}

// --- FUNCȚIA CALLGEMINIAPI ---
async function callGeminiAPIForMaterials(promptText, modelToUse, generationConfigOptions = {}) {
    if (!modelToUse) {
        console.error("[MaterialsJS] Model Gemini invalid sau neinițializat.");
        return "EROARE: Model AI neinițializat. Verifică consola pentru detalii.";
    }
    try {
        const requestPayload = {
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 800000, ...generationConfigOptions }
        };
        const result = await modelToUse.generateContent(requestPayload);
        const response = result.response;

        if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return response.candidates[0].content.parts[0].text;
        } else if (response?.promptFeedback?.blockReason) {
            console.warn("[MaterialsJS] Prompt blocat de Gemini:", response.promptFeedback);
            return `EROARE Gemini: Prompt blocat (Motiv: ${response.promptFeedback.blockReason}). Detalii: ${JSON.stringify(response.promptFeedback.safetyRatings || 'N/A')}`;
        } else {
            console.warn("[MaterialsJS] Răspuns Gemini neașteptat sau gol:", JSON.stringify(response, null, 2));
            return "EROARE Gemini: Răspuns invalid sau gol de la API.";
        }
    } catch (error) {
        console.error("[MaterialsJS] Eroare detaliată la callGeminiAPI:", error);
        return `EROARE Gemini: ${error.message || "Eroare API necunoscută"}. Verifică consola.`;
    }
}

// --- ELEMENTE DOM ȘI VARIABILE DE STARE ---
const materialeListContainer = document.getElementById('materialeListContainer');
const themeManagementContainer = document.getElementById('themeManagementContainer'); // Nou container pentru managementul temelor
const materialGenerationControlsContainer = document.getElementById('materialGenerationControlsContainer'); // Container pentru butoane de generare material
const materialeInfoMessageDiv = document.getElementById('materialeInfoMessage');

const CHAT_HISTORY_DOC_ID_PREFIX_MATERIALS = "chatHistory_";
const MAX_CHAT_MESSAGES_FOR_CONTEXT = 1000;
const USER_THEMES_DOC_PREFIX = "userThemes_"; // Prefix pentru documentul cu temele utilizatorului

let currentUserIdMaterials = null;
let currentUserThemes = { themes: [], timestamp: null }; // Cache pentru temele utilizatorului
let selectedThemeForGeneration = null;

// --- FUNCȚII UTILITARE UI ---
function showUIMessageMaterials(message, type = "info", autoHide = true) {
    if (!materialeInfoMessageDiv) return;
    materialeInfoMessageDiv.textContent = message;
    materialeInfoMessageDiv.className = `info-message ${type}`;
    materialeInfoMessageDiv.style.display = 'block';
    if (autoHide) {
        setTimeout(() => { if (materialeInfoMessageDiv) materialeInfoMessageDiv.style.display = 'none'; }, 7000);
    }
}

function clearMaterialTypeSelectionUI() {
    if (materialGenerationControlsContainer) materialGenerationControlsContainer.innerHTML = '';
}

function clearAllActionUIs() {
    if (themeManagementContainer) themeManagementContainer.innerHTML = '';
    clearMaterialTypeSelectionUI();
    selectedThemeForGeneration = null;
    // Nu goli currentUserThemes aici, pentru că vrem să le păstrăm
}

// --- LOGICA PENTRU TEME ȘI DATE UTILIZATOR ---

async function gatherUserDataForThemeAnalysis(userId) {
    let fullContextText = "";
    // 1. Preluare Jurnale (ultimele 10)
    try {
        const jurnalQuery = query(
            collection(dbMaterials, "introspectii"),
            where("ownerUid", "==", userId),
            where("type", "==", "jurnal"),
            orderBy("timestampCreare", "desc"),
            firestoreLimit(10)
        );
        const jurnalSnapshot = await getDocs(jurnalQuery);
        if (!jurnalSnapshot.empty) {
            fullContextText += "\n\n--- EXTRAS DIN JURNALELE RECENTE ---\n";
            jurnalSnapshot.forEach(doc => {
                const data = doc.data().continut;
                fullContextText += `Jurnal (Titlu: ${data.titluJurnal || 'N/A'}, Data: ${doc.data().dateAfisare || 'N/A'}):\n${data.textJurnal}\n---\n`;
            });
        }
    } catch (e) { console.error("[MaterialsJS] Eroare preluare jurnale:", e); }

    // 2. Preluare Fișe (ultimele 10)
    try {
        const fisaQuery = query(
            collection(dbMaterials, "introspectii"),
            where("ownerUid", "==", userId),
            where("type", "==", "fisa"),
            orderBy("timestampCreare", "desc"),
            firestoreLimit(10)
        );
        const fisaSnapshot = await getDocs(fisaQuery);
        if (!fisaSnapshot.empty) {
            fullContextText += "\n\n--- EXTRAS DIN FIȘELE DE REFLECȚIE RECENTE ---\n";
            fisaSnapshot.forEach(doc => {
                const c = doc.data().continut;
                fullContextText += `Fișă (Data: ${doc.data().dateAfisare || 'N/A'}):\nSituație: ${c.situatie || 'N/A'}\nGânduri: ${c.ganduri || 'N/A'}\nEmoții: ${c.emotii || 'N/A'}\nMod activ: ${c.mod_activ || 'N/A'}\nComportament: ${c.comportament || 'N/A'}\nNevoile profunde: ${c.nevoi_profunde || 'N/A'}\nAdultul Sănătos: ${c.adult_sanatos || 'N/A'}\n---\n`;
            });
        }
    } catch (e) { console.error("[MaterialsJS] Eroare preluare fișe:", e); }

    // 3. Preluare Chat (ultimele MAX_CHAT_MESSAGES_FOR_CONTEXT mesaje)
    try {
        const chatDocRef = doc(dbMaterials, "chatHistories", CHAT_HISTORY_DOC_ID_PREFIX_MATERIALS + userId);
        const chatDocSnap = await getDoc(chatDocRef);
        if (chatDocSnap.exists() && chatDocSnap.data().messages) {
            fullContextText += "\n\n--- EXTRAS DIN CONVERSAȚIILE DE CHAT RECENTE ---\n";
            const allMessages = chatDocSnap.data().messages;
            const recentMessages = allMessages.slice(-MAX_CHAT_MESSAGES_FOR_CONTEXT);
            recentMessages.forEach(msg => {
                const role = msg.role === 'user' ? 'Utilizator' : 'PsihoGPT';
                fullContextText += `${role}: ${msg.content}\n`;
            });
            fullContextText += "---\n";
        }
    } catch (e) { console.error("[MaterialsJS] Eroare preluare chat:", e); }

    if (fullContextText.length < 100) {
        return null;
    }
    return fullContextText;
}

async function identifyAndSaveKeyThemes(userId, forceRefresh = false) {
    if (!geminiModelAnalizaTemeMaterials) {
        showUIMessageMaterials("[MaterialsJS] Serviciu AI analiză indisponibil.", "error");
        return false;
    }

    showUIMessageMaterials("PsihoGPT analizează activitatea ta recentă pentru a identifica teme...", "info", false);
    const combinedUserData = await gatherUserDataForThemeAnalysis(userId);

    if (!combinedUserData) {
        showUIMessageMaterials("Nu există suficientă activitate recentă (jurnale, fișe, chat) pentru o analiză relevantă.", "warning", false);
        return false;
    }

    const themeAnalysisPrompt = `
Rol: Ești un psihoterapeut AI experimentat, capabil să analizezi texte diverse (jurnale, fișe de reflecție, conversații de chat) pentru a identifica teme psihologice centrale, tipare de gândire sau probleme recurente.
Sarcină: Analizează textul combinat de mai jos, care provine din activitatea recentă a unui utilizator. Identifică aproximativ 10 teme principale sau probleme cheie (minim 7, maxim 12).
Pentru fiecare temă, oferă o etichetă scurtă și descriptivă (maxim 5-7 cuvinte). Asigură-te că temele sunt distincte.
Formatare Răspuns: Listează fiecare temă pe o linie nouă, fără numere sau alte prefixe. Nu adăuga introduceri, explicații sau concluzii. Doar lista de teme.

--- TEXT COMBINAT UTILIZATOR (JURNALE, FIȘE, CHAT) ---
${combinedUserData}
--- SFÂRȘIT TEXT COMBINAT ---

Teme Identificate:
`;

    const themesRaw = await callGeminiAPIForMaterials(themeAnalysisPrompt, geminiModelAnalizaTemeMaterials, { temperature: 0.3 });

    if (themesRaw.toUpperCase().startsWith("EROARE:")) {
        console.error("[MaterialsJS] Eroare API la identificarea temelor:", themesRaw);
        showUIMessageMaterials(`Analiza AI a eșuat: ${themesRaw}`, "error", false);
        return false;
    }

    const themesList = themesRaw.split('\n').map(theme => theme.trim()).filter(theme => theme.length > 3 && theme.length < 100);

    if (themesList.length === 0) {
        showUIMessageMaterials("Nu s-au putut identifica teme clare.", "warning", false);
        return false;
    }

    currentUserThemes = { themes: themesList, timestamp: Timestamp.now() };
    try {
        await setDoc(doc(dbMaterials, "userThemes", USER_THEMES_DOC_PREFIX + userId), currentUserThemes);
        showUIMessageMaterials(`Au fost identificate ${themesList.length} teme. Poți selecta una pentru a genera materiale.`, "success");
        renderThemeManagementUI(userId); // Re-randează UI-ul cu noile teme
        return true;
    } catch (error) {
        console.error("[MaterialsJS] Eroare salvare teme în Firestore:", error);
        showUIMessageMaterials("Eroare la salvarea temelor identificate.", "error");
        return false;
    }
}

async function loadUserThemes(userId) {
    try {
        const themesDocRef = doc(dbMaterials, "userThemes", USER_THEMES_DOC_PREFIX + userId);
        const docSnap = await getDoc(themesDocRef);
        if (docSnap.exists()) {
            currentUserThemes = docSnap.data();
            // Verificăm dacă themes este array, pentru compatibilitate cu structuri vechi
            if (!Array.isArray(currentUserThemes.themes)) {
                 currentUserThemes = { themes: [], timestamp: null }; // Resetăm dacă structura e invalidă
            }
            console.log("[MaterialsJS] Teme încărcate din Firestore:", currentUserThemes.themes.length);
        } else {
            console.log("[MaterialsJS] Nicio listă de teme preexistentă găsită pentru utilizator.");
            currentUserThemes = { themes: [], timestamp: null };
        }
    } catch (error) {
        console.error("[MaterialsJS] Eroare la încărcarea temelor din Firestore:", error);
        currentUserThemes = { themes: [], timestamp: null };
    }
    renderThemeManagementUI(userId);
}

function renderThemeManagementUI(userId) {
    if (!themeManagementContainer || !materialGenerationControlsContainer) return;
    themeManagementContainer.innerHTML = ''; // Golește containerul de teme
    materialGenerationControlsContainer.innerHTML = ''; // Golește și containerul de controale generare

    let html = `<h4>Teme Personalizate Identificate</h4>`;
    if (currentUserThemes && currentUserThemes.themes && currentUserThemes.themes.length > 0) {
        const themesLastUpdated = currentUserThemes.timestamp ? `Ultima actualizare: ${currentUserThemes.timestamp.toDate().toLocaleDateString("ro-RO")}` : "Niciodată actualizate";
        html += `<p class="themes-timestamp">${themesLastUpdated}</p>`;
        html += `<p>Selectează o temă de mai jos pentru a genera materiale de suport sau actualizează lista de teme.</p>`;
        html += `<div class="theme-buttons-container">`;
        currentUserThemes.themes.forEach((theme, index) => {
            html += `<button class="theme-select-button button-outline" data-theme="${encodeURIComponent(theme)}">${theme}</button>`;
        });
        html += `</div>`;
        selectedThemeForGeneration = null; // Deselectează orice temă anterioară
    } else {
        html += `<p>Nicio temă personalizată identificată încă. Apasă butonul de mai jos pentru a începe analiza.</p>`;
    }
    themeManagementContainer.innerHTML = html;

    // Butonul de actualizare/generare teme
    const refreshThemesButton = document.createElement('button');
    refreshThemesButton.id = 'refreshThemesButton';
    refreshThemesButton.className = 'button-primary';
    refreshThemesButton.textContent = (currentUserThemes && currentUserThemes.themes && currentUserThemes.themes.length > 0) ? '🔄 Actualizează Lista de Teme' : '🔍 Analizează și Identifică Teme';
    refreshThemesButton.disabled = !genAIMaterials;
    refreshThemesButton.addEventListener('click', () => {
        if (confirm("Aceasta va re-analiza activitatea ta și poate suprascrie lista curentă de teme. Ești sigur?")) {
            identifyAndSaveKeyThemes(userId, true);
        }
    });
    themeManagementContainer.appendChild(refreshThemesButton);

    // Adaugă event listeners pentru noile butoane de temă
    document.querySelectorAll('.theme-select-button').forEach(button => {
        button.addEventListener('click', handleThemeSelectedFromList);
    });
}

function handleThemeSelectedFromList(event) {
    document.querySelectorAll('.theme-select-button').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');

    selectedThemeForGeneration = decodeURIComponent(event.target.dataset.theme);
    if (selectedThemeForGeneration) {
        displayMaterialTypeSelectionUI(selectedThemeForGeneration);
        showUIMessageMaterials(`Tema selectată: "${selectedThemeForGeneration}". Alege tipul de material.`, "info", false);
    }
}

function displayMaterialTypeSelectionUI(theme) {
    if (!materialGenerationControlsContainer) return;
    materialGenerationControlsContainer.innerHTML = ''; // Golește orice controale anterioare

    let materialTypeHTML = `<h4>Generează Material pentru Tema: "${theme}"</h4>`;
    materialTypeHTML += `<div class="material-type-buttons-container">`;
    materialTypeHTML += `<button class="material-type-button button-primary" data-material-type="articol" data-theme-for-gen="${encodeURIComponent(theme)}">📚 Articol Teoretic</button>`;
    materialTypeHTML += `<button class="material-type-button button-primary" data-material-type="fisa_lucru" data-theme-for-gen="${encodeURIComponent(theme)}">📝 Fișă de Lucru Practică</button>`;
    materialTypeHTML += `<button class="material-type-button button-cancel" data-material-type="cancel_type">Anulează Selecția</button>`;
    materialTypeHTML += `</div>`;

    materialGenerationControlsContainer.innerHTML = materialTypeHTML;

    document.querySelectorAll('.material-type-button').forEach(button => {
        button.addEventListener('click', handleMaterialTypeSelectedAndGenerate);
    });
}


// --- LOGICA PENTRU GENERARE ȘI SALVARE MATERIALE ---
async function generatePersonalizedMaterialContentInternal(materialType, theme, userId) {
    if (!geminiModelGenerareMaterialMaterials) return "EROARE: [MaterialsJS] Serviciu AI generare indisponibil.";

    const specificContextForMaterial = await gatherUserDataForThemeAnalysis(userId); // Reutilizăm funcția
    let userContextSummary = "Datele recente ale utilizatorului indică o preocupare sau explorare a temei: " + theme + ".";
    if (specificContextForMaterial) {
        userContextSummary += "\nExtrase relevante din activitatea sa (jurnale, fișe, chat) arată diverse fațete ale acestei teme.";
    }

    let materialPrompt = "";
    if (materialType === 'articol') {
        materialPrompt = `
Rol: Ești PsihoGPT, un terapeut AI avansat, specializat în TCC, Terapia Schemelor și ACT.
Sarcină: Generează un articol teoretic detaliat, explicativ și empatic pe tema centrală "${theme}".
Context Utilizator: Acest articol este pentru un utilizator care explorează activ această temă. ${userContextSummary.substring(0,1000)}
Articolul trebuie să:
1.  Definească clar conceptul "${theme}" într-un mod accesibil și nuanțat.
2.  Explice posibilele origini sau factori care contribuie la "${theme}" (ex. experiențe timpurii, tipare de gândire).
3.  Descrie cum se poate manifesta "${theme}" în diferite arii ale vieții (relații, muncă, imagine de sine), oferind exemple ilustrative generale.
4.  Prezinte 3-4 strategii concrete sau perspective de abordare/înțelegere/gestionare a temei "${theme}", bazate pe principii TCC, Schema Therapy, ACT sau alte abordări validate. Include exemple practice pentru fiecare strategie.
5.  Să se încheie cu o notă de încurajare, auto-compasiune și speranță, subliniind că schimbarea este posibilă.
Formatare: Folosește Markdown (titluri principale cu ##, subtitluri cu ###, liste cu *, text **bold** sau *italic*). Structurează bine conținutul.
Restricții: Răspunde DOAR cu conținutul articolului. Nu adăuga introduceri de genul "Iată articolul:" sau concluzii suplimentare în afara celor specificate.
Lungime: Aproximativ 600-1000 cuvinte.
Ton: Empatic, suportiv, profund informativ, dar ușor de înțeles.`;
    } else if (materialType === 'fisa_lucru') {
        materialPrompt = `
Rol: Ești PsihoGPT, un terapeut AI avansat.
Sarcină: Generează o fișă de lucru practică, detaliată și interactivă pe tema centrală "${theme}".
Context Utilizator: Această fișă este pentru un utilizator care explorează activ această temă. ${userContextSummary.substring(0,1000)}
Fișa de lucru trebuie să includă URMĂTOARELE SECȚIUNI, în această ordine:
1.  **Titlu Clar:** Ex: "Fișă de Lucru: Explorarea și Gestionarea [${theme}]".
2.  **Introducere Scurtă (2-3 propoziții):** Scopul fișei și cum poate ajuta.
3.  **Secțiunea 1: Conștientizarea Manifestărilor (minim 3 întrebări de reflecție):** Întrebări care ajută utilizatorul să identifice cum se manifestă "${theme}" specific în viața sa. (Ex: "În ce situații recente ai observat că [aspect al temei] a fost cel mai intens? Descrie pe scurt.") Lasă spațiu pentru răspuns (ex: "Răspuns: ____________________").
4.  **Secțiunea 2: Explorarea Gândurilor și Emoțiilor Asociate (minim 3 întrebări):** Întrebări despre gândurile automate, emoțiile și senzațiile fizice legate de "${theme}".
5.  **Secțiunea 3: Identificarea Nevoilor Neîmplinite (minim 2 întrebări):** Ce nevoi ar putea fi în spatele manifestărilor "${theme}"?
6.  **Secțiunea 4: Strategii și Acțiuni Practice (minim 2-3 sugestii concrete și acționabile):** Propune exerciții specifice, tehnici de coping sau pași mici pe care utilizatorul îi poate face pentru a aborda "${theme}". Include exemple clare.
7.  **Secțiunea 5: Reflecții Finale și Angajament (1-2 întrebări):** Pentru consolidarea învățării și planificarea pașilor următori.
Formatare: Folosește Markdown. Titluri de secțiune cu ###.
Restricții: Răspunde DOAR cu conținutul fișei.
Ton: Ghidant, practic, încurajator, structurat.`;
    } else { return "EROARE: Tip de material necunoscut."; }

    const materialContent = await callGeminiAPIForMaterials(materialPrompt, geminiModelGenerareMaterialMaterials, { temperature: 0.6 });
    return materialContent;
}

async function handleMaterialTypeSelectedAndGenerate(event) {
    const materialType = event.target.dataset.materialType;
    const themeForGen = decodeURIComponent(event.target.dataset.themeForGen); // Preluăm tema din butonul apăsat

    if (materialType === "cancel_type") {
        showUIMessageMaterials("Selecția tipului de material a fost anulată.", "info");
        clearMaterialTypeSelectionUI();
        // Nu deselecta tema globală aici, utilizatorul ar putea dori să aleagă alt tip de material pentru aceeași temă
        // Doar dacă nu mai există `selectedThemeForGeneration` din context global, atunci da.
        // if (!selectedThemeForGeneration) renderThemeManagementUI(currentUserIdMaterials); // Reafișează temele dacă nu e context specific
        return;
    }

    if (!themeForGen || !currentUserIdMaterials) {
        showUIMessageMaterials("Eroare: Tema sau utilizatorul nu sunt definiți. Reîncearcă.", "error", false);
        return;
    }

    const typeLabel = materialType === 'articol' ? 'articolului' : 'fișei de lucru';
    showUIMessageMaterials(`Se generează conținutul pentru ${typeLabel} despre "${themeForGen}"... Acest proces poate dura.`, "info", false);
    // Blochează butoanele de generare pe durata procesului
    document.querySelectorAll('.material-type-button, .theme-select-button, #refreshThemesButton').forEach(btn => btn.disabled = true);


    const content = await generatePersonalizedMaterialContentInternal(materialType, themeForGen, currentUserIdMaterials);

    if (content.toUpperCase().startsWith("EROARE:")) {
        showUIMessageMaterials(`Eroare la generarea ${typeLabel}: ${content}`, "error", false);
    } else {
        try {
            await addDoc(collection(dbMaterials, "materialeGenerate"), {
                ownerUid: currentUserIdMaterials,
                tema: themeForGen, // Folosim tema specifică pasată
                tipMaterial: materialType,
                continutGenerat: content,
                timestampCreare: Timestamp.fromDate(new Date()),
                dateAfisare: new Date().toLocaleDateString("ro-RO", { day: '2-digit', month: '2-digit', year: 'numeric' })
            });
            showUIMessageMaterials(`${materialType === 'articol' ? 'Articolul' : 'Fișa de lucru'} despre "${themeForGen}" a fost generat și salvat cu succes!`, "success");
            await displayGeneratedMaterialsInternal(currentUserIdMaterials);
            clearMaterialTypeSelectionUI(); // Curăță selecția de tip după succes
            // selectedThemeForGeneration = null; // Comentat pentru a permite generarea mai multor materiale pe aceeași temă selectată
        } catch (dbError) {
            console.error("[MaterialsJS] Eroare salvare material în Firestore:", dbError);
            showUIMessageMaterials(`Eroare la salvarea materialului: ${dbError.message}`, "error", false);
        }
    }
    // Reactivează butoanele după finalizarea procesului
    document.querySelectorAll('.material-type-button, .theme-select-button, #refreshThemesButton').forEach(btn => btn.disabled = !(genAIMaterials && currentUserIdMaterials));
    // Asigură-te că refreshThemesButton e corect (dez)activat
    const refreshBtn = document.getElementById('refreshThemesButton');
    if (refreshBtn) refreshBtn.disabled = !(genAIMaterials && currentUserIdMaterials);
}


// --- AFIȘARE ȘI ȘTERGERE MATERIALE (EXISTENTE) ---
async function displayGeneratedMaterialsInternal(userId) {
    if (!materialeListContainer || !userId) return;
    currentUserIdMaterials = userId;
    materialeListContainer.innerHTML = '<p class="loading-message">Se încarcă materialele tale personalizate...</p>';

    try {
        const q = query(
            collection(dbMaterials, "materialeGenerate"),
            where("ownerUid", "==", userId),
            orderBy("timestampCreare", "desc")
        );
        const querySnapshot = await getDocs(q);
        materialeListContainer.innerHTML = '';

        if (querySnapshot.empty) {
            if (materialeInfoMessageDiv && materialeInfoMessageDiv.style.display !== 'block') {
                 showUIMessageMaterials("Niciun material personalizat generat încă. Selectează o temă și un tip de material pentru a crea unul!", "info", false);
            } else if (!materialeInfoMessageDiv) {
                 materialeListContainer.innerHTML = '<p class="info-message">Niciun material personalizat generat încă.</p>';
            }
            return;
        } else {
             if (materialeInfoMessageDiv && materialeInfoMessageDiv.textContent.includes("Niciun material")) {
                materialeInfoMessageDiv.style.display = 'none';
            }
        }

        querySnapshot.forEach(docSnap => {
            const material = { id: docSnap.id, ...docSnap.data() };
            const card = createMaterialCardElementInternal(material);
            materialeListContainer.appendChild(card);
        });
    } catch (error) {
        console.error("[MaterialsJS] Eroare la afișarea materialelor generate:", error);
        materialeListContainer.innerHTML = '<p class="error-loading-message">Eroare la încărcarea materialelor.</p>';
    }
}

function createMaterialCardElementInternal(material) {
    const card = document.createElement('div');
    card.className = 'response-card material-card';
    card.dataset.id = material.id;

    const typeLabel = material.tipMaterial === 'articol' ? 'Articol Teoretic' : 'Fișă de Lucru';
    const title = material.tema || 'Material Fără Titlu';
    const entryDate = material.dateAfisare || (material.timestampCreare?.toDate ? new Date(material.timestampCreare.toDate()).toLocaleDateString("ro-RO") : 'Dată necunoscută');

    let htmlContent = "(Conținut indisponibil)";
    if (typeof marked !== 'undefined' && material.continutGenerat) {
        try { htmlContent = marked.parse(material.continutGenerat); }
        catch (e) {
            console.warn("[MaterialsJS] Eroare parsare Markdown:", e);
            htmlContent = "<p><em>Eroare la afișarea conținutului formatat.</em></p><pre>" + material.continutGenerat.replace(/</g, "<").replace(/>/g, ">") + "</pre>";
        }
    } else if (material.continutGenerat) {
        htmlContent = material.continutGenerat.replace(/\n/g, "<br>");
    }

    let actionsHTML = `<button class="delete-material-button button-small" data-id="${material.id}" type="button" title="Șterge acest material">🗑️ Șterge</button>`;
    if (material.tipMaterial === 'articol') {
        actionsHTML += `<button class="add-worksheet-button button-small" data-theme-for-worksheet="${encodeURIComponent(material.tema)}" type="button" title="Generează Fișă de Lucru pentru această temă">➕📝 Fișă de Lucru</button>`;
    }

    card.innerHTML = `
        <div class="card-header">
            <span>${typeLabel}: ${title}</span>
            <span class="card-date">Generat: ${entryDate}</span>
        </div>
        <div class="card-content">
            <div class="material-content-display">${htmlContent}</div>
            <div class="card-actions">${actionsHTML}</div>
        </div>
    `;
    card.querySelector('.card-header')?.addEventListener('click', (e) => {
        if (!e.target.closest('button')) card.classList.toggle('open');
    });
    return card;
}

async function handleAddWorksheetForArticle(themeForWorksheet) {
    if (!currentUserIdMaterials || !themeForWorksheet) {
        showUIMessageMaterials("Eroare: Informații insuficiente pentru a genera fișa de lucru.", "error");
        return;
    }

    showUIMessageMaterials(`Se pregătește generarea fișei de lucru pentru tema "${themeForWorksheet}"...`, "info", false);
    const fakeEvent = {
        target: {
            dataset: {
                materialType: 'fisa_lucru',
                themeForGen: encodeURIComponent(themeForWorksheet) // Asigură-te că tema e corect encodată
            }
        }
    };
    await handleMaterialTypeSelectedAndGenerate(fakeEvent);
}


async function handleDeleteMaterial(materialId) {
    if (!materialId || !currentUserIdMaterials) return;
    if (confirm("Sigur dorești să ștergi acest material? Această acțiune este ireversibilă.")) {
        showUIMessageMaterials("Se șterge materialul...", "info", false);
        try {
            await deleteDoc(doc(dbMaterials, "materialeGenerate", materialId));
            showUIMessageMaterials("Materialul a fost șters cu succes.", "success");
            const cardToRemove = materialeListContainer.querySelector(`.material-card[data-id="${materialId}"]`);
            if (cardToRemove) cardToRemove.remove();
            if (materialeListContainer.children.length === 0) {
                showUIMessageMaterials("Niciun material personalizat generat încă.", "info", false);
            }
        } catch (err) {
            console.error("[MaterialsJS] Eroare la ștergerea materialului:", err);
            showUIMessageMaterials(`Eroare la ștergerea materialului: ${err.message}`, "error");
        }
    }
}

// --- INIȚIALIZARE ȘI EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Delegare evenimente pentru butoanele din lista de materiale (ștergere, adaugă fișă)
    if (materialeListContainer) {
        materialeListContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('delete-material-button')) {
                const materialId = event.target.dataset.id;
                handleDeleteMaterial(materialId);
            } else if (event.target.classList.contains('add-worksheet-button')) {
                const theme = decodeURIComponent(event.target.dataset.themeForWorksheet);
                handleAddWorksheetForArticle(theme);
            }
        });
    }
    // Event listeners pentru butoanele din themeManagementContainer și materialGenerationControlsContainer
    // sunt adăugați dinamic în funcțiile renderThemeManagementUI și displayMaterialTypeSelectionUI
});

onAuthStateChanged(authMaterials, (user) => {
    const materialeTab = document.getElementById('materialeFormContainer');

    if (user) {
        currentUserIdMaterials = user.uid;
        // Inițializarea Gemini este deja făcută global.
        // Verificăm dacă tab-ul este activ și încărcăm datele.
        if (materialeTab && materialeTab.style.display === 'block') {
            clearAllActionUIs();
            loadUserThemes(currentUserIdMaterials);
            displayGeneratedMaterialsInternal(currentUserIdMaterials);
        } else {
            // Chiar dacă tab-ul nu e activ, putem preîncărca temele în cache, dar nu UI-ul.
            // Sau lăsăm încărcarea doar la activarea tab-ului.
            // Pentru simplitate, încărcăm doar la activare.
        }
    } else {
        currentUserIdMaterials = null;
        currentUserThemes = { themes: [], timestamp: null };
        clearAllActionUIs();
        if (materialeListContainer) materialeListContainer.innerHTML = '';
        if (materialeInfoMessageDiv) materialeInfoMessageDiv.style.display = 'none';
        if (themeManagementContainer) themeManagementContainer.innerHTML = '<p>Autentifică-te pentru a accesa materialele personalizate.</p>';
        if (materialGenerationControlsContainer) materialGenerationControlsContainer.innerHTML = '';

    }
});

window.handleMaterialeTabActivated = function(userId) {
    console.log("[personalizedMaterials.js] Funcția window.handleMaterialeTabActivated a fost apelată cu userId:", userId);
    if (materialeInfoMessageDiv && materialeInfoMessageDiv.style.display === 'block' && materialeInfoMessageDiv.textContent.includes("Se generează")) {
        return; // Nu întrerupe un proces de generare în curs
    }

    if (userId) {
        currentUserIdMaterials = userId;
        // Nu este nevoie să reinițializăm Gemini aici
        clearAllActionUIs(); // Curăță UI-ul anterior
        loadUserThemes(userId); // Încarcă/afișează temele
        displayGeneratedMaterialsInternal(userId); // Afișează materialele existente
    } else if (currentUserIdMaterials) { // Dacă avem un utilizator logat anterior, dar userId e null (improbabil în fluxul normal)
        clearAllActionUIs();
        loadUserThemes(currentUserIdMaterials);
        displayGeneratedMaterialsInternal(currentUserIdMaterials);
    } else {
        if (materialeListContainer) materialeListContainer.innerHTML = '';
        if (themeManagementContainer) themeManagementContainer.innerHTML = '<p>Pentru a vedea sau genera materiale personalizate, te rugăm să te autentifici.</p>';
        if (materialGenerationControlsContainer) materialGenerationControlsContainer.innerHTML = '';
        showUIMessageMaterials("Pentru a vedea sau genera materiale personalizate, te rugăm să te autentifici.", "warning", false);
    }
}