// --- IMPORTURI ȘI CONFIGURARE INIȚIALĂ (Firebase, Gemini) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, setDoc, getDocs, getDoc, deleteDoc, doc, query, where, orderBy, Timestamp, limit as firestoreLimit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
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
const MAX_CHAT_MESSAGES_FOR_CONTEXT = 100;
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
            firestoreLimit(5)
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
            firestoreLimit(3)
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
Sarcină: Analizează textul combinat de mai jos, care provine din activitatea recentă a unui utilizator. Identifică aproximativ 20 teme principale sau probleme cheie.
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
    if (!geminiModelGenerareMaterialMaterials) {
        console.error("[MaterialsJS] Serviciu AI generare indisponibil (model neinițializat).");
        return "EROARE: [MaterialsJS] Serviciu AI generare indisponibil. Verifică consola.";
    }
    if (!theme || theme.trim() === "") {
        console.error("[MaterialsJS] Temă invalidă pentru generare:", theme);
        return "EROARE: Temă invalidă furnizată pentru generarea materialului.";
    }
    if (!userId) {
        console.error("[MaterialsJS] ID utilizator lipsă pentru generarea materialului.");
        return "EROARE: Utilizator neidentificat pentru personalizare.";
    }

    // 1. Adună contextul complet al utilizatorului
    const fullRawUserContext = await gatherUserDataForThemeAnalysis(userId);

    // 2. Construiește userContextForPrompt cu o limită superioară absolută
    let userContextForPrompt = "";
    // Setează o limită maximă absolută de caractere pentru contextul inclus în prompt.
    // Aceasta este o măsură de siguranță. Modelele au limite de tokeni, nu de caractere,
    // dar caracterele oferă o estimare. 150.000 caractere ~ 30.000-50.000 cuvinte.
    // Ajustează în funcție de teste și de limitele specifice ale modelului (ex: gemini-1.5-flash are 1M tokens,
    // dar promptul întreg, incluzând instrucțiunile, trebuie să încapă).
    const ABSOLUTE_MAX_CONTEXT_CHARS = 3500000; // Limită generoasă, dar prudentă

    if (fullRawUserContext && fullRawUserContext.trim() !== "") {
        userContextForPrompt = `Context general: Utilizatorul explorează activ tema "${theme}".\n\n`;
        userContextForPrompt += "--- INCEPUT CONTEXT EXTINS DIN ACTIVITATEA RECENTĂ A UTILIZATORULUI (JURNALE, FIȘE, CONVERSAȚII) ---\n";

        if (fullRawUserContext.length <= ABSOLUTE_MAX_CONTEXT_CHARS) {
            userContextForPrompt += fullRawUserContext;
        } else {
            userContextForPrompt += fullRawUserContext.substring(0, ABSOLUTE_MAX_CONTEXT_CHARS);
            userContextForPrompt += "\n... (Contextul utilizatorului a fost trunchiat la " + ABSOLUTE_MAX_CONTEXT_CHARS + " caractere din cauza lungimii excesive. Au fost incluse cele mai recente date.)";
            console.warn(`[MaterialsJS] Contextul utilizatorului pentru tema "${theme}" a fost trunchiat la ${ABSOLUTE_MAX_CONTEXT_CHARS} caractere.`);
        }
        userContextForPrompt += "\n--- SFÂRȘIT CONTEXT EXTINS DIN ACTIVITATEA UTILIZATORULUI ---\n";
    } else {
        userContextForPrompt = `Context general: Utilizatorul explorează activ tema "${theme}". (Notă: Nu a fost găsită activitate recentă detaliată (jurnale, fișe, chat) pentru a oferi un context specific suplimentar pentru personalizare în acest moment).`;
        console.log(`[MaterialsJS] Nu a fost găsit context detaliat pentru tema "${theme}" și utilizatorul ${userId}.`);
    }

    let materialPrompt = "";

    // 3. Construiește promptul specific pentru tipul de material
    if (materialType === 'articol') {
        materialPrompt = `
Rol: Ești PsihoGPT, un terapeut AI avansat, cu expertiză profundă în Terapie Cognitiv-Comportamentală (TCC), Terapia Schemelor (TS), Terapia Acceptării și Angajamentului (ACT), și psihologie clinică generală.
Sarcină: Generează un articol teoretic detaliat, explicativ și empatic pe tema centrală "${theme}".
Context Utilizator:  ${userContextForPrompt}. Articolul trebuie să fie profund, dar accesibil, personalizat pe situatia utilizatorului, incluzand date din contextul sau, oferind atât înțelegere teoretică, cât și perspective practice validate.
**Analiză Contextuală:** Examinează cu atenție "CONTEXTUL EXTINS DIN ACTIVITATEA RECENTĂ A UTILIZATORULUI" furnizat mai sus. Identifică principalele moduri în care tema "${theme}" pare să se manifeste pentru acest utilizator (ex: tipuri de situații, gânduri recurente, emoții predominante, dificultăți specifice menționate).
Articolul trebuie să:
1.  **Definiție Nuanțată și Contextualizare:**
    *   Definească clar conceptul "${theme}" într-un mod accesibil.
    *   Explice relevanța sa în contextul bunăstării psihologice și al provocărilor comune de viață.
    *   Atinge, dacă este cazul, legături cu concepte psihologice mai largi (ex: atașament, mecanisme de coping, etc.).
2.  **Origini și Factori Contributivi:**
    *   Exploreze posibilele origini (ex. experiențe timpurii, modele învățate, factori biologici/temperamentali, influențe socio-culturale).
    *   Descrie tipare de gândire, emoționale și comportamentale care mențin sau exacerbează "${theme}".
    *   Integreze perspective din TCC (ex: gânduri automate, distorsiuni cognitive) și Terapia Schemelor (ex: scheme dezadaptative timpurii, moduri schematice relevante), dacă este pertinent pentru temă.
3.  **Manifestări și Impact:**
    *   Descrie cum se poate manifesta "${theme}" în diferite arii ale vieții (relații, muncă, imagine de sine, sănătate fizică), oferind exemple ilustrative generale, dar relevante.
    *   Sublinieze impactul pe termen scurt și lung asupra funcționării și calității vieții.
4.  **Perspective Terapeutice și Strategii de Gestionare (bazate pe dovezi):**
    *   Prezinte 3-5 strategii concrete, tehnici sau perspective de abordare/înțelegere/gestionare a temei "${theme}".
    *   Pentru fiecare strategie:
        *   Explică principiul din spatele ei, ancorând-o în abordări terapeutice validate (TCC, TS, ACT, DBT, mindfulness etc.).
        *   Oferă un exemplu practic clar despre cum ar putea fi aplicată de utilizator.
        *   Subliniază potențialele beneficii.
5.  **Încurajare, Auto-compasiune și Pași Următori:**
    *   Să se încheie cu o notă de încurajare autentică, validare și auto-compasiune.
    *   Sublinieze că înțelegerea și schimbarea sunt procese graduale și că solicitarea de sprijin (inclusiv profesional) este un semn de putere.
    *   Poate sugera reflecții suplimentare sau direcții de explorare pentru utilizator.

Formatare: Folosește Markdown (titluri principale cu ##, subtitluri cu ###, liste cu *, text **bold** sau *italic*). Structurează logic și clar conținutul. Folosește un limbaj care echilibrează profunzimea profesională cu accesibilitatea.
Restricții: Răspunde DOAR cu conținutul articolului. Nu adăuga introduceri de genul "Iată articolul:" sau concluzii suplimentare în afara celor specificate.
Lungime: Aproximativ 7000-12000 cuvinte (permite o explorare mai detaliată).
Ton: Empatic, suportiv, profund informativ, validant, non-judicativ și încurajator.`;
    } else if (materialType === 'fisa_lucru') {
        materialPrompt = `
Rol: Ești PsihoGPT, un terapeut AI experimentat, specializat în crearea de materiale terapeutice practice. Ai cunoștințe solide despre tehnici validate din Terapie Cognitiv-Comportamentală (TCC), Terapia Schemelor (TS), Terapia Acceptării și Angajamentului (ACT), Terapia Dialectic-Comportamentală (DBT), tehnici de mindfulness și reglare emoțională.
Sarcină: Generează o fișă de lucru practică, detaliată, interactivă și orientată spre acțiune pe tema centrală "${theme}".
Context Utilizator:  ${userContextForPrompt}. Fișa trebuie să ofere instrumente concrete pe care utilizatorul le poate aplica. Personalizata pe situatia utilizatorului, incluzand date din contextul sau.
INSTRUCȚIUNI ESENȚIALE PENTRU PERSONALIZAREA FIȘEI DE LUCRU CU DATE DIN CONTEXT:
1.  **Utilizare Activă a Contextului:** Examinează cu atenție "CONTEXTUL EXTINS DIN ACTIVITATEA RECENTĂ A UTILIZATORULUI". Folosește aceste informații ca sursă principală de inspirație pentru:
    *   A formula întrebări de reflecție în Secțiunea 1 care sunt direct relevante pentru experiențele specifice ale utilizatorului cu tema "${theme}".
    *   A crea exemple ilustrative VIVIDE și RELEVANTE pentru tehnicile practice din Secțiunea 3, care să reflecte tipul de situații, gânduri sau emoții menționate de utilizator.
2.  **Personalizare Echilibrată a Exemplelor:**
    *   **Obiectiv:** Ca utilizatorul să simtă că fișa "îi vorbește direct" și că exemplele sunt despre "situații ca ale lui".
    *   **Metodă:** Când oferi exemple (pentru situații, gânduri automate, aplicarea unei tehnici etc.), parafrazează, combină idei sau generalizează ușor informațiile din context pentru a crea scenarii plauzibile și personalizate. De exemplu, dacă utilizatorul a scris despre o ceartă specifică cu un prieten legată de "${theme}", exemplul tău ar putea fi despre "o neînțelegere cu o persoană apropiată" care surprinde esența, fără a copia textul.
    *   **Confidențialitate CRUCIALĂ:** NU reproduce direct citate, nume proprii (dacă apar accidental), sau detalii extrem de specifice și identificabile din contextul utilizatorului în textul fișei generate. Protejează intimitatea utilizatorului. Contextul este pentru inspirație și adaptare inteligentă, NU pentru copiere directă.
3.  **Adaptarea Întrebărilor de Reflecție (Secțiunea 1):**
    *   Pe baza tiparelor identificate în context (ex: un anumit gând negativ recurent, o emoție predominantă, o situație tipică unde "${theme}" apare), formulează întrebări care încurajează utilizatorul să exploreze aceste aspecte specifice în propria viață.
    *   Exemplu: Dacă contextul arată că utilizatorul evită anumite situații din cauza temei "${theme}", o întrebare ar putea fi: "Ce situații specifice ai observat că tinzi să eviți din cauza modului în care te simți legat de '${theme}'? Descrie una dintre ele."
4.  **Ancorarea Tehnicilor Practice (Secțiunea 3):**
    *   Pentru fiecare tehnică, după descrierea pașilor generali, oferă un exemplu de aplicare care este croit (conform punctului 2) pe tipul de provocări ale utilizatorului.
    *   În spațiile de practică, ghidează utilizatorul să aplice tehnica la propriile sale situații, eventual făcând o referire subtilă la tipurile de experiențe din context (ex: "Acum, aplică acești pași la o situație recentă legată de '${theme}', poate una similară celor pe care le-ai explorat în jurnal.").
5.  **Validare și Normalizare:** Folosește un ton profund empatic. Validează dificultățile și emoțiile care pot fi deduse din context. Normalizează experiența utilizatorului, arătând că nu este singur în aceste provocări.
Fișa de lucru trebuie să includă URMĂTOARELE SECȚIUNI, în această ordine și cu conținutul specificat:

1.  **Titlu Clar și Atractiv:**
    *   Ex: "Fișă de Lucru Interactivă: Navigând și Transformând [${theme}] cu Tehnici Practice".
    *   Include tema centrală.

2.  **Introducere Scurtă și Motivantă (3-4 propoziții):**
    *   Scopul fișei: cum îl va ajuta pe utilizator să înțeleagă și să gestioneze "${theme}".
    *   Menționează pe scurt că fișa va include tehnici practice inspirate din abordări terapeutice validate.
    *   O notă de încurajare pentru implicare.

3.  **Secțiunea 1: Explorarea Personală a Temei "${theme}"**
    *   **1.1. Conștientizarea Manifestărilor (minim 3 întrebări de reflecție detaliate):**
        *   Ajută utilizatorul să identifice cum se manifestă "${theme}" *specific* în viața sa (situații, frecvență, intensitate).
        *   Ex: "Amintește-ți o situație recentă (sau recurentă) în care "${theme}" a fost prezent(ă) sau intens(ă). Descrie situația în detaliu: ce s-a întâmplat, cine a fost implicat, unde erai?"
        *   Lasă spațiu amplu pentru răspuns (ex: "Situația: ____________________________________________________").
    *   **1.2. Gânduri Automate și Convingeri Asociate (minim 3 întrebări specifice):**
        *   Întrebări pentru a identifica gândurile care apar în legătură cu "${theme}".
        *   Ex: "Ce gânduri îți trec prin minte chiar înainte, în timpul și după ce te confrunți cu "${theme}" sau cu situațiile asociate? Notează-le cât mai exact."
        *   Ex: "Există anumite 'reguli' sau convingeri personale pe care le ai despre tine, despre alții sau despre lume, care par să fie activate de "${theme}"? (ex. 'Trebuie să...', 'Nu ar trebui să...', 'Dacă X, atunci Y')."
    *   **1.3. Emoții și Senzații Fizice (minim 2-3 întrebări):**
        *   Identificarea paletei emoționale și a reacțiilor corporale.
        *   Ex: "Ce emoții (ex: anxietate, tristețe, furie, rușine, vinovăție, gol interior) simți cel mai des în legătură cu "${theme}"? Evaluează intensitatea lor pe o scală de la 0 la 10."
        *   Ex: "Observi vreo senzație fizică specifică în corpul tău când "${theme}" este activ(ă)? (ex: tensiune musculară, nod în gât, palpitații, greutate în piept). Unde o simți?"

4.  **Secțiunea 2: Înțelegerea Rădăcinilor și Nevoilor (Opțional, dacă tema se pretează)**
    *   **2.1. Posibile Origini și Influențe (1-2 întrebări reflective, cu blândețe):**
        *   Ex: "Reflectând la experiențele tale de viață (copilărie, adolescență, relații importante), crezi că există evenimente sau tipare care ar fi putut contribui la dezvoltarea "${theme}"?" (Fără a forța auto-analiza excesivă).
    *   **2.2. Nevoi Emoționale Neîmplinite (minim 2 întrebări):**
        *   Ce nevoi fundamentale (ex: siguranță, conectare, validare, autonomie, competență) ar putea fi nesatisfăcute și semnalate prin "${theme}"?
        *   Ex: "Când "${theme}" este prezent(ă), ce nevoie profundă simți că nu este îndeplinită în acel moment sau în viața ta în general?"

5.  **Secțiunea 3: TEHNICI PRACTICE DE LUCRU ȘI STRATEGII DE SCHIMBARE (MINIM 2-3 TEHNICI DISTINCTE):**
    *   Pentru fiecare tehnică propusă:
        *   **Numele Tehnicii:** Clar și sugestiv (ex: "Restructurare Cognitivă ABCDE", "Exercițiu de Defuziune Cognitivă: Frunze pe Râu", "Tehnica Respirației Diafragmatice", "Activare Comportamentală: Pași Mici").
        *   **Scurtă Descriere și Scop:** Explică pe scurt în ce constă tehnica și ce urmărește să realizeze în raport cu "${theme}". Menționează abordarea terapeutică din care provine (ex: TCC, ACT, DBT).
        *   **Instrucțiuni Pas cu Pas:** Ghid detaliat, clar și acționabil despre cum să aplice utilizatorul tehnica. Folosește un limbaj simplu.
            *   *Pentru tehnici TCC (ex: restructurare cognitivă):* poate include identificarea gândului disfuncțional, dovezile pro/contra, generarea unui gând alternativ echilibrat.
            *   *Pentru tehnici ACT (ex: defuziune):* instrucțiuni pentru a observa gândurile fără a fuziona cu ele, metafore.
            *   *Pentru tehnici de mindfulness/relaxare:* ghidaj pentru respirație, scanare corporală simplă.
            *   *Pentru tehnici comportamentale:* planificarea unor pași mici, graduali.
        *   **Exemplu Concret (dacă este posibil):** Un scurt exemplu despre cum ar arăta aplicarea tehnicii pentru o situație legată de "${theme}".
        *   **Spațiu de Practică/Reflecție:** Lasă spațiu utilizatorului să noteze experiența sa cu tehnica sau să completeze pașii (ex: "Gândul meu automat: _________", "Gândul alternativ: _________").
    *   **Exemplu de structură pentru o tehnică:**
        
        ### Tehnica X: [Numele Tehnicii] (inspirată din [TCC/ACT/etc.])
        **Scop:** Această tehnică te ajută să [scopul specific legat de tema].
        **Instrucțiuni:**
        1. Pasul 1...
        2. Pasul 2...
           * Detaliu pentru pasul 2...
        3. Pasul 3...
        **Exemplu:** [Scurt exemplu]
        **Practica Ta:**
        * [Întrebare/Spațiu pentru pasul 1] __________________
        * [Întrebare/Spațiu pentru pasul 2] __________________
        * Cum te-ai simțit după ce ai aplicat această tehnică? ______________
        

6.  **Secțiunea 4: Plan de Acțiune Personalizat și Angajament**
    *   **4.1. Alegerea Strategiilor (1 întrebare):**
        *   Ex: "Din tehnicile prezentate mai sus, care 1-2 par cele mai potrivite sau rezonabile pentru tine să le încerci în perioada următoare în legătură cu "${theme}"?"
    *   **4.2. Primul Pas Concret (1-2 întrebări):**
        *   Ex: "Care este cel mai mic și mai realizabil pas pe care îl poți face săptămâna aceasta pentru a începe să aplici una dintre tehnicile alese sau pentru a aborda "${theme}"?"
        *   Ex: "Când și cum anume vei face acest prim pas?"
    *   **4.3. Anticiparea Obstacolelor și Resurse (Opțional, 1 întrebare):**
        *   Ex: "Ce obstacole ai putea întâmpina și cum le-ai putea depăși? Ce resurse interne sau externe te-ar putea sprijini?"
    *   **4.4. Angajament și Auto-Încurajare:**
        *   O scurtă notă despre importanța practicii regulate și a răbdării cu sine.
        *   Ex: "Felicitări pentru că ai parcurs această fișă! Amintește-ți că fiecare pas mic contează."

7.  **Resurse Suplimentare (Opțional, dar recomandat):**
    *   Sugestii scurte de unde ar putea afla mai multe, dacă este cazul (ex: "Pentru mai multe despre mindfulness, poți explora aplicații precum Headspace sau Calm." - Fii neutru și general).
    *   Recomandarea de a discuta dificultățile cu un terapeut, dacă este cazul.

Formatare: Folosește Markdown extensiv. Titluri de secțiune principale cu ##, sub-secțiuni cu ###, sub-sub-secțiuni (ex: pentru fiecare tehnică) cu ####. Folosește liste numerotate pentru pași, bullet points pentru idei. Lasă spații generoase pentru răspunsuri (folosind multiple linii de '__________________' sau indicând clar "Răspunsul tău aici:").
Restricții: Răspunde DOAR cu conținutul fișei. Fără introduceri sau concluzii externe fișei.
Ton: Ghidant, practic, încurajator, structurat, empatic și validant. Limbajul să fie clar și direct.
Lungime: Fișa trebuie să fie suficient de detaliată pentru a fi utilă, dar nu copleșitoare. Calitatea și caracterul acționabil primează.`;

    } else {
        console.error("[MaterialsJS] Tip de material necunoscut:", materialType);
        return `EROARE: Tip de material necunoscut: ${materialType}.`;
    }

    // Log pentru depanare - poate fi util să vezi lungimile
    // console.log(`[MaterialsJS] Prompt pentru ${materialType} despre "${theme}". Lungime userContextForPrompt: ${userContextForPrompt.length} caractere.`);
    // console.log(`[MaterialsJS] Lungime totală aproximativă a promptului trimis (fără instrucțiunile fixe ale promptului): ${userContextForPrompt.length + materialPrompt.length - "${userContextForPrompt}".length} caractere.`);

    // 4. Apelează API-ul Gemini
    const materialContent = await callGeminiAPIForMaterials(materialPrompt, geminiModelGenerareMaterialMaterials, {
        temperature: 0.6, // Poate ușor mai mare pentru creativitate în personalizare
        // maxOutputTokens: lasă default sau ajustează dacă e nevoie pentru răspunsuri lungi
    });
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