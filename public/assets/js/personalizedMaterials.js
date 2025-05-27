// --- IMPORTURI ȘI CONFIGURARE INIȚIALĂ (Firebase, Gemini) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, setDoc, getDocs, getDoc, deleteDoc, doc, query, where, orderBy, Timestamp, limit as firestoreLimit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "https://esm.run/@google/generative-ai";

// --- CONFIGURARE FIREBASE & GEMINI (replicată aici pentru independență) ---
const firebaseConfigMaterials = {
    apiKey: "AIzaSyBn2bojEoV4_icF4fVVKFdJN1YjDhtlG98", // Înlocuiește cu cheia ta reală
    authDomain: "personaltrainer-74ea4.firebaseapp.com",
    projectId: "personaltrainer-74ea4",
    storageBucket: "personaltrainer-74ea4.appspot.com",
    messagingSenderId: "591778567441",
    appId: "1:591778567441:web:bbaeac19a3fb0f190668b0",
    measurementId: "G-WLWNGNDK5V",
};

const appMaterials = initializeApp(firebaseConfigMaterials, "appMaterials" + Date.now());
const dbMaterials = getFirestore(appMaterials);
const authMaterials = getAuth(appMaterials);

const GEMINI_API_KEY_MATERIALS = "AIzaSyAlm63krfJxBu1QR5ZmvA0rcGUnjm17sng"; // Înlocuiește cu cheia ta reală
const GEMINI_MODEL_ANALIZA_TEME_MATERIALS = "gemini-2.0-flash"; // Model capabil de context mare și JSON
const GEMINI_MODEL_GENERARE_MATERIAL_MATERIALS = "gemini-2.5-flash-preview-05-20"; // Model capabil de generare

let genAIMaterials, geminiModelAnalizaTemeMaterials, geminiModelGenerareMaterialMaterials;

if (GEMINI_API_KEY_MATERIALS && GEMINI_API_KEY_MATERIALS.trim() !== "") {
    try {
        genAIMaterials = new GoogleGenerativeAI(GEMINI_API_KEY_MATERIALS);
        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        geminiModelAnalizaTemeMaterials = genAIMaterials.getGenerativeModel({ model: GEMINI_MODEL_ANALIZA_TEME_MATERIALS, safetySettings });
        geminiModelGenerareMaterialMaterials = genAIMaterials.getGenerativeModel({ model: GEMINI_MODEL_GENERARE_MATERIAL_MATERIALS, safetySettings });
        console.log("[MaterialsJS] SDK Gemini inițializat.");
    } catch (e) {
        console.error("[MaterialsJS] Eroare inițializare Gemini:", e);
        genAIMaterials = null;
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
            generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 100000, // Valoare default pentru flash, ajustează dacă e necesar
                // responseMimeType: "application/json", // Adaugă asta aici dacă modelul o suportă consistent
                ...generationConfigOptions
            }
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
const themeManagementContainer = document.getElementById('themeManagementContainer');
const materialGenerationControlsContainer = document.getElementById('materialGenerationControlsContainer');
const materialeInfoMessageDiv = document.getElementById('materialeInfoMessage');

const CHAT_HISTORY_DOC_ID_PREFIX_MATERIALS = "chatHistory_";
const MAX_CHAT_MESSAGES_FOR_CONTEXT = 500;
const USER_THEMES_DOC_PREFIX = "userThemes_";

let currentUserIdMaterials = null;
let currentUserThemes = { themes: [], timestamp: null }; // themes va fi array de {title, relevantContext}
let selectedThemeTitleForGeneration = null;
let selectedThemeContextForGeneration = null;


// --- FUNCȚII UTILITARE UI ---
function showUIMessageMaterials(message, type = "info", autoHide = true) {
    if (!materialeInfoMessageDiv) return;
    materialeInfoMessageDiv.textContent = message;
    materialeInfoMessageDiv.className = `info-message ${type}`;
    materialeInfoMessageDiv.style.display = 'block';
    if (autoHide) {
        setTimeout(() => { if (materialeInfoMessageDiv && materialeInfoMessageDiv.style.display === 'block' && materialeInfoMessageDiv.textContent === message) materialeInfoMessageDiv.style.display = 'none'; }, 7000);
    }
}

function clearMaterialTypeSelectionUI() {
    if (materialGenerationControlsContainer) materialGenerationControlsContainer.innerHTML = '';
}

function clearAllActionUIs() {
    if (themeManagementContainer) themeManagementContainer.innerHTML = '';
    clearMaterialTypeSelectionUI();
    selectedThemeTitleForGeneration = null;
    selectedThemeContextForGeneration = null;
}

// --- LOGICA PENTRU TEME ȘI DATE UTILIZATOR ---

async function gatherUserDataForThemeAnalysis(userId) {
    let fullContextText = "";
    const MAX_CONTENT_LENGTH_PER_SOURCE = 1500000; // Limită de caractere per sursă pentru a nu face contextul prea mare

    // 1. Preluare Jurnale
    try {
        const jurnalQuery = query(
            collection(dbMaterials, "introspectii"),
            where("ownerUid", "==", userId),
            where("type", "==", "jurnal"),
            orderBy("timestampCreare", "desc"),
            firestoreLimit(10) // Mai puține jurnale, dar mai detaliate
        );
        const jurnalSnapshot = await getDocs(jurnalQuery);
        if (!jurnalSnapshot.empty) {
            let jurnalText = "\n\n--- EXTRAS DIN JURNALELE RECENTE ---\n";
            jurnalSnapshot.forEach(doc => {
                const data = doc.data().continut;
                let entry = `Jurnal (Titlu: ${data.titluJurnal || 'N/A'}, Data: ${doc.data().dateAfisare || 'N/A'}):\n${data.textJurnal}\n---\n`;
                if (jurnalText.length + entry.length < MAX_CONTENT_LENGTH_PER_SOURCE) {
                    jurnalText += entry;
                } else {
                    jurnalText += entry.substring(0, MAX_CONTENT_LENGTH_PER_SOURCE - jurnalText.length) + "... (trunchiat)\n---\n";
                    return; // Ieșim din forEach dacă am atins limita
                }
            });
            fullContextText += jurnalText;
        }
    } catch (e) { console.error("[MaterialsJS] Eroare preluare jurnale:", e); }

    // 2. Preluare Fișe
    try {
        const fisaQuery = query(
            collection(dbMaterials, "introspectii"),
            where("ownerUid", "==", userId),
            where("type", "==", "fisa"),
            orderBy("timestampCreare", "desc"),
            firestoreLimit(10) // Mai puține fișe
        );
        const fisaSnapshot = await getDocs(fisaQuery);
        if (!fisaSnapshot.empty) {
            let fisaText = "\n\n--- EXTRAS DIN FIȘELE DE REFLECȚIE RECENTE ---\n";
            fisaSnapshot.forEach(doc => {
                const c = doc.data().continut;
                let entry = `Fișă (Data: ${doc.data().dateAfisare || 'N/A'}):\nSituație: ${c.situatie || 'N/A'}\nGânduri: ${c.ganduri || 'N/A'}\nEmoții: ${c.emotii || 'N/A'}\nMod activ: ${c.mod_activ || 'N/A'}\nComportament: ${c.comportament || 'N/A'}\nNevoile profunde: ${c.nevoi_profunde || 'N/A'}\nAdultul Sănătos: ${c.adult_sanatos || 'N/A'}\n---\n`;
                 if (fisaText.length + entry.length < MAX_CONTENT_LENGTH_PER_SOURCE) {
                    fisaText += entry;
                } else {
                    fisaText += entry.substring(0, MAX_CONTENT_LENGTH_PER_SOURCE - fisaText.length) + "... (trunchiat)\n---\n";
                    return;
                }
            });
             fullContextText += fisaText;
        }
    } catch (e) { console.error("[MaterialsJS] Eroare preluare fișe:", e); }

    // 3. Preluare Chat
    try {
        const chatDocRef = doc(dbMaterials, "chatHistories", CHAT_HISTORY_DOC_ID_PREFIX_MATERIALS + userId);
        const chatDocSnap = await getDoc(chatDocRef);
        if (chatDocSnap.exists() && chatDocSnap.data().messages) {
            let chatText = "\n\n--- EXTRAS DIN CONVERSAȚIILE DE CHAT RECENTE ---\n";
            const allMessages = chatDocSnap.data().messages;
            const recentMessages = allMessages.slice(-MAX_CHAT_MESSAGES_FOR_CONTEXT); // Păstrăm un număr rezonabil de mesaje
            recentMessages.forEach(msg => {
                const role = msg.role === 'user' ? 'Utilizator' : 'PsihoGPT';
                let entry = `${role}: ${msg.content}\n`;
                if (chatText.length + entry.length < MAX_CONTENT_LENGTH_PER_SOURCE) {
                    chatText += entry;
                } else {
                    chatText += entry.substring(0, MAX_CONTENT_LENGTH_PER_SOURCE - chatText.length) + "... (trunchiat)\n";
                    return;
                }
            });
            chatText += "---\n";
            fullContextText += chatText;
        }
    } catch (e) { console.error("[MaterialsJS] Eroare preluare chat:", e); }

    if (fullContextText.trim().length < 100) { // Verificăm dacă există conținut relevant
        return null;
    }
    return fullContextText;
}

async function identifyAndSaveKeyThemes(userId, forceRefresh = false) {
    if (!geminiModelAnalizaTemeMaterials) {
        showUIMessageMaterials("Serviciu AI analiză indisponibil.", "error");
        return false;
    }

    showUIMessageMaterials("PsihoGPT analizează activitatea ta recentă pentru a identifica teme și contexte relevante...", "info", false);
    const combinedUserData = await gatherUserDataForThemeAnalysis(userId);

     // --- ADAUGĂ CONSOLE.LOG AICI ---
    if (combinedUserData) {
        console.log("[MaterialsJS - identifyAndSaveKeyThemes] Context combinat trimis către AI pentru analiza temelor:", combinedUserData);
        // Poți adăuga și lungimea pentru a avea o idee despre dimensiune
        console.log(`[MaterialsJS - identifyAndSaveKeyThemes] Lungimea contextului combinat: ${combinedUserData.length} caractere.`);
    } else {
        console.log("[MaterialsJS - identifyAndSaveKeyThemes] Nu s-a putut genera context combinat pentru analiza temelor (combinedUserData este null sau gol).");
    }
    // --- SFÂRȘIT CONSOLE.LOG ---


    if (!combinedUserData) {
        showUIMessageMaterials("Nu există suficientă activitate recentă (jurnale, fișe, chat) pentru o analiză relevantă.", "warning", true);
        return false;
    }

    const themeAnalysisPrompt = `
Rol: Ești un psihoterapeut AI experimentat, capabil să analizezi texte diverse (jurnale, fișe de reflecție, conversații de chat) pentru a identifica teme psihologice centrale și contextul relevant pentru fiecare.
Sarcină: Analizează textul combinat de mai jos, care provine din activitatea recentă a unui utilizator. Identifică aproximativ 10 teme principale sau probleme cheie.
Pentru fiecare temă identificată:
1.  Oferă un titlu scurt și descriptiv pentru temă (maxim 5-8 cuvinte). Titlul trebuie să fie concis și relevant psihologic.
2.  Extrage și furnizează un rezumat concis si citatele cheie din textul utilizatorului care ilustrează cel mai bine sau susțin această temă. Acest context trebuie să fie direct relevant și extras din textul furnizat, oferind substanță pentru înțelegerea temei.

Formatare Răspuns OBLIGATORIU: Răspunde cu un array JSON valid. Fiecare element al array-ului trebuie să fie un obiect cu două proprietăți: "title" (string) și "relevantContext" (string).
Exemplu de format JSON așteptat:
[
  {
    "title": "Anxietate socială și evitare",
    "relevantContext": "Utilizatorul menționează: 'Am evitat petrecerea pentru că mă simt judecat.' De asemenea, în jurnal apare: 'Gândul că ceilalți mă vor critica mă paralizează. Prefer să stau singur acasă decât să risc.'"
  },
  {
    "title": "Autocritică și perfecționism",
    "relevantContext": "Din fișă: 'Gând automat: Nu sunt suficient de bun, orice aș face.' Chat: 'Îmi stabilesc standarde imposibile și apoi mă învinovățesc când nu le ating.'"
  }
]

NU adăuga introduceri, comentarii, explicații sau concluzii în afara array-ului JSON. Răspunsul trebuie să fie DOAR array-ul JSON.
IMPORTANT:Asigura-te ca oferi suficient context relevant incat pe baza lui sa poata fi scris un studiu de caz, articol. Citeaza si parafrazeaza utilizatorul. Extinde pana la 3000 cuvinte contextul.
--- TEXT COMBINAT UTILIZATOR (JURNALE, FIȘE, CHAT) ---
${combinedUserData}
--- SFÂRȘIT TEXT COMBINAT ---

JSON cu Teme și Context Relevant:
`;

    let themesResponseRaw = await callGeminiAPIForMaterials(themeAnalysisPrompt, geminiModelAnalizaTemeMaterials, { temperature: 0.3, responseMimeType: "application/json" });

    let themesWithContext = [];
    try {
        const jsonMatch = themesResponseRaw.match(/(\[[\s\S]*\])/);
        if (jsonMatch && jsonMatch[0]) {
            themesResponseRaw = jsonMatch[0];
        }
        const parsedResponse = JSON.parse(themesResponseRaw);
        if (Array.isArray(parsedResponse)) {
            themesWithContext = parsedResponse.filter(item =>
                item && typeof item.title === 'string' && item.title.trim() !== '' &&
                typeof item.relevantContext === 'string' && item.relevantContext.trim() !== '' &&
                item.title.length < 100 && item.relevantContext.length > 10 // Contextul trebuie să aibă o minimă substanță
            );
        } else {
            throw new Error("Răspunsul JSON nu este un array.");
        }
    } catch (e) {
        console.error("[MaterialsJS] Eroare la parsarea JSON-ului cu teme:", e, "Răspuns brut:", themesResponseRaw);
        // Fallback mai simplu: extrage doar linii care par a fi titluri
        const fallbackTitles = themesResponseRaw.split('\n')
            .map(line => line.replace(/- /g, '').replace(/"/g, '').trim())
            .filter(line => line.length > 3 && line.length < 100 && !line.toLowerCase().includes("relevantcontext") && !line.toLowerCase().startsWith("[") && !line.toLowerCase().startsWith("{"));

        if (fallbackTitles.length > 0) {
            themesWithContext = fallbackTitles.map(title => ({ title, relevantContext: "Contextul nu a putut fi extras automat din cauza unei erori de formatare a răspunsului AI." }));
            showUIMessageMaterials(`Atenție: Contextul specific pentru teme nu a putut fi extras complet (${themesWithContext.length} teme fără context detaliat). Se va folosi un context generic. Eroare: ${e.message}`, "warning", false);
        } else {
             showUIMessageMaterials(`Analiza AI a eșuat la interpretarea temelor: ${e.message}. Răspuns AI: ${themesResponseRaw.substring(0,100)}...`, "error", false);
            return false;
        }
    }

    if (themesWithContext.length === 0) {
        showUIMessageMaterials("Nu s-au putut identifica teme clare sau context relevant din activitatea ta.", "warning", true);
        return false;
    }

    currentUserThemes = { themes: themesWithContext, timestamp: Timestamp.now() };
    try {
        await setDoc(doc(dbMaterials, "userThemes", USER_THEMES_DOC_PREFIX + userId), currentUserThemes);
        showUIMessageMaterials(`Au fost identificate ${themesWithContext.length} teme cu context relevant. Poți selecta una pentru a genera materiale.`, "success", true);
        renderThemeManagementUI(userId);
        return true;
    } catch (error) {
        console.error("[MaterialsJS] Eroare salvare teme (cu context) în Firestore:", error);
        showUIMessageMaterials("Eroare la salvarea temelor identificate.", "error", true);
        return false;
    }
}

async function loadUserThemes(userId) {
    try {
        const themesDocRef = doc(dbMaterials, "userThemes", USER_THEMES_DOC_PREFIX + userId);
        const docSnap = await getDoc(themesDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && Array.isArray(data.themes) &&
                data.themes.every(theme => typeof theme === 'object' && theme !== null && 'title' in theme && 'relevantContext' in theme)) {
                currentUserThemes = data;
            } else {
                console.warn("[MaterialsJS] Structura temelor din Firestore este invalidă sau veche. Se resetează.");
                currentUserThemes = { themes: [], timestamp: null };
            }
            console.log("[MaterialsJS] Teme (cu context) încărcate din Firestore:", currentUserThemes.themes.length);
        } else {
            console.log("[MaterialsJS] Nicio listă de teme preexistentă găsită pentru utilizator.");
            currentUserThemes = { themes: [], timestamp: null };
        }
    } catch (error) {
        console.error("[MaterialsJS] Eroare la încărcarea temelor (cu context) din Firestore:", error);
        currentUserThemes = { themes: [], timestamp: null };
    }
    renderThemeManagementUI(userId);
}

function renderThemeManagementUI(userId) {
    if (!themeManagementContainer || !materialGenerationControlsContainer) return;
    themeManagementContainer.innerHTML = '';
    materialGenerationControlsContainer.innerHTML = '';

    let html = `<h4>Teme Personalizate Identificate</h4>`;
    if (currentUserThemes && currentUserThemes.themes && currentUserThemes.themes.length > 0) {
        const themesLastUpdated = currentUserThemes.timestamp ? `Ultima actualizare: ${new Date(currentUserThemes.timestamp.seconds * 1000).toLocaleDateString("ro-RO")}` : "Niciodată actualizate";
        html += `<p class="themes-timestamp">${themesLastUpdated}</p>`;
        html += `<p>Selectează o temă de mai jos pentru a genera materiale de suport sau actualizează lista de teme.</p>`;
        html += `<div class="theme-buttons-container">`;
        currentUserThemes.themes.forEach((themeObj) => {
            html += `<button class="theme-select-button button-outline" data-theme-title="${encodeURIComponent(themeObj.title)}">${themeObj.title}</button>`;
        });
        html += `</div>`;
        selectedThemeTitleForGeneration = null;
        selectedThemeContextForGeneration = null;
    } else {
        html += `<p>Nicio temă personalizată identificată încă. Apasă butonul de mai jos pentru a începe analiza.</p>`;
    }
    themeManagementContainer.innerHTML = html;

    const refreshThemesButton = document.createElement('button');
    refreshThemesButton.id = 'refreshThemesButton';
    refreshThemesButton.className = 'button-primary'; // Stil principal
    refreshThemesButton.textContent = (currentUserThemes && currentUserThemes.themes && currentUserThemes.themes.length > 0) ? '🔄 Actualizează Lista de Teme și Context' : '🔍 Analizează și Identifică Teme + Context';
    refreshThemesButton.disabled = !(genAIMaterials && currentUserIdMaterials);
    refreshThemesButton.addEventListener('click', () => {
        if (confirm("Aceasta va re-analiza activitatea ta și poate suprascrie lista curentă de teme și contexte. Ești sigur?")) {
             document.querySelectorAll('.theme-select-button, #refreshThemesButton, .material-type-button').forEach(btn => btn.disabled = true);
            identifyAndSaveKeyThemes(userId, true).finally(() => {
                 document.querySelectorAll('.theme-select-button, #refreshThemesButton, .material-type-button').forEach(btn => btn.disabled = !(genAIMaterials && currentUserIdMaterials));
                 // Reactivăm corect refresh button
                 const refreshBtn = document.getElementById('refreshThemesButton');
                 if(refreshBtn) refreshBtn.disabled = !(genAIMaterials && currentUserIdMaterials);

            });
        }
    });
    themeManagementContainer.appendChild(refreshThemesButton);

    document.querySelectorAll('.theme-select-button').forEach(button => {
        button.addEventListener('click', handleThemeSelectedFromList);
    });
}

function handleThemeSelectedFromList(event) {
    document.querySelectorAll('.theme-select-button').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');

    const themeTitle = decodeURIComponent(event.target.dataset.themeTitle);
    const selectedThemeObject = currentUserThemes.themes.find(t => t.title === themeTitle);

    if (selectedThemeObject) {
        selectedThemeTitleForGeneration = selectedThemeObject.title;
        selectedThemeContextForGeneration = selectedThemeObject.relevantContext;
        displayMaterialTypeSelectionUI(selectedThemeTitleForGeneration);
        showUIMessageMaterials(`Tema selectată: "${selectedThemeTitleForGeneration}". Context relevant încărcat. Alege tipul de material.`, "info", false);
    } else {
        showUIMessageMaterials("Eroare: Tema selectată nu a fost găsită cu context. Încearcă o reîmprospătare a temelor.", "error", true);
        selectedThemeTitleForGeneration = null;
        selectedThemeContextForGeneration = null;
        clearMaterialTypeSelectionUI();
    }
}

function displayMaterialTypeSelectionUI(themeTitle) {
    if (!materialGenerationControlsContainer) return;
    materialGenerationControlsContainer.innerHTML = '';

    let materialTypeHTML = `<h4>Generează Material pentru Tema: "${themeTitle}"</h4>`;
    materialTypeHTML += `<div class="material-type-buttons-container">`;
    materialTypeHTML += `<button class="material-type-button button-primary" data-material-type="articol" data-theme-for-gen="${encodeURIComponent(themeTitle)}">📚 Articol Teoretic</button>`;
    materialTypeHTML += `<button class="material-type-button button-primary" data-material-type="fisa_lucru" data-theme-for-gen="${encodeURIComponent(themeTitle)}">📝 Fișă de Lucru Practică</button>`;
    materialTypeHTML += `<button class="material-type-button button-cancel" data-material-type="cancel_type">Anulează Selecția</button>`;
    materialTypeHTML += `</div>`;

    materialGenerationControlsContainer.innerHTML = materialTypeHTML;

    document.querySelectorAll('.material-type-button').forEach(button => {
        button.addEventListener('click', handleMaterialTypeSelectedAndGenerate);
        button.disabled = !(genAIMaterials && currentUserIdMaterials); // Se activează doar dacă AI e disponibil
    });
}

// --- LOGICA PENTRU GENERARE ȘI SALVARE MATERIALE ---
async function generatePersonalizedMaterialContentInternal(materialType, themeTitle, userId) {
    if (!geminiModelGenerareMaterialMaterials) {
        return "EROARE: Serviciu AI generare indisponibil (model neinițializat).";
    }
    if (!themeTitle || themeTitle.trim() === "") {
        return "EROARE: Titlu temă invalid furnizat pentru generarea materialului.";
    }
    // userId este încă util pentru a ști CUI aparține materialul.

    let userContextForPromptSegment = "";
    if (selectedThemeContextForGeneration && selectedThemeContextForGeneration.trim() !== "") {
        userContextForPromptSegment = `\n\n--- CONTEXT SPECIFIC EXTRAS ANTERIOR PENTRU TEMA "${themeTitle}" ---\n${selectedThemeContextForGeneration}\n--- SFÂRȘIT CONTEXT SPECIFIC ---\n`;
    } else {
        userContextForPromptSegment = `\n\n(Notă: Nu a fost găsit un context specific pre-extras detaliat pentru această temă. Generarea se va baza pe înțelegerea generală a temei "${themeTitle}".)\n`;
        console.warn(`[MaterialsJS] Nu a fost găsit context pre-extras pentru tema "${themeTitle}" și utilizatorul ${userId}. Se va genera material mai general.`);
    }

    let materialPrompt = "";
    const commonInstructions = `
Rol: Ești PsihoGPT, un terapeut AI avansat, cu expertiză profundă în Terapie Cognitiv-Comportamentală (TCC), Terapia Schemelor (TS), Terapia Acceptării și Angajamentului (ACT), și psihologie clinică generală.
Tema Centrală: "${themeTitle}"
Context Utilizator Specific Temei: ${userContextForPromptSegment}
Instrucțiuni Generale pentru Răspuns:
- Folosește Markdown extensiv pentru formatare (## Titluri Mari, ### Subtitluri, *liste*, **bold**, *italic*).
- Structurează logic și clar conținutul.
- Limbajul trebuie să echilibreze profunzimea profesională cu accesibilitatea și empatia.
- Răspunde DOAR cu conținutul materialului solicitat. Nu adăuga introduceri de genul "Iată articolul:" sau concluzii suplimentare în afara celor specificate în structura cerută.
- Ton: Empatic, suportiv, profund informativ, validant, non-judicativ și încurajator.
- Personalizare: Integrează subtil și relevant informațiile din "Context Utilizator Specific Temei" în explicații și exemple. FĂRĂ a reproduce direct citate lungi sau detalii prea personale. Scopul este ca utilizatorul să simtă relevanța, nu să-i fie expus textul. Generalizează și parafrazează inteligent.
`;

    if (materialType === 'articol') {
        materialPrompt = `${commonInstructions}
Sarcină: Generează un articol teoretic detaliat, explicativ și empatic pe tema centrală.
Articolul trebuie să fie profund, dar accesibil, oferind atât înțelegere teoretică, cât și perspective practice validate.
Articolul trebuie să:
1.  **Definiție Nuanțată și Contextualizare:**
    *   Definească clar conceptul "${themeTitle}" într-un mod accesibil.
    *   Explice relevanța sa în contextul bunăstării psihologice și al provocărilor comune de viață.
    *   Atinge, dacă este cazul, legături cu concepte psihologice mai largi (ex: atașament, mecanisme de coping, etc.).
2.  **Origini și Factori Contributivi:**
    *   Exploreze posibilele origini (ex. experiențe timpurii, modele învățate, factori biologici/temperamentali, influențe socio-culturale).
    *   Descrie tipare de gândire, emoționale și comportamentale care mențin sau exacerbează "${themeTitle}".
    *   Integreze perspective din TCC (ex: gânduri automate, distorsiuni cognitive) și Terapia Schemelor (ex: scheme dezadaptative timpurii, moduri schematice relevante), dacă este pertinent pentru temă.
3.  **Manifestări și Impact:**
    *   Descrie cum se poate manifesta "${themeTitle}" în diferite arii ale vieții (relații, muncă, imagine de sine, sănătate fizică), oferind exemple ilustrative generale, dar relevante.
    *   Sublinieze impactul pe termen scurt și lung asupra funcționării și calității vieții.
4.  **Perspective Terapeutice și Strategii de Gestionare (bazate pe dovezi):**
    *   Prezinte 3-5 strategii concrete, tehnici sau perspective de abordare/înțelegere/gestionare a temei "${themeTitle}".
    *   Pentru fiecare strategie:
        *   Explică principiul din spatele ei, ancorând-o în abordări terapeutice validate (TCC, TS, ACT, DBT, mindfulness etc.).
        *   Oferă un exemplu practic clar despre cum ar putea fi aplicată de utilizator.
        *   Subliniază potențialele beneficii.
5.  **Încurajare, Auto-compasiune și Pași Următori:**
    *   Să se încheie cu o notă de încurajare autentică, validare și auto-compasiune.
    *   Sublinieze că înțelegerea și schimbarea sunt procese graduale și că solicitarea de sprijin (inclusiv profesional) este un semn de putere.
    *   Poate sugera reflecții suplimentare sau direcții de explorare pentru utilizator.
Lungime Articol: Aproximativ 5000-10000 cuvinte.
`;
    } else if (materialType === 'fisa_lucru') {
        materialPrompt = `${commonInstructions}
Sarcină: Generează o fișă de lucru practică, detaliată, interactivă și orientată spre acțiune pe tema centrală.
Fișa de lucru trebuie să includă URMĂTOARELE SECȚIUNI, în această ordine și cu conținutul specificat:

1.  **Titlu Clar și Atractiv:**
    *   Ex: "Fișă de Lucru Interactivă: Navigând și Transformând [${themeTitle}] cu Tehnici Practice".
    *   Include tema centrală.

2.  **Introducere Scurtă și Motivantă (3-4 propoziții):**
    *   Scopul fișei: cum îl va ajuta pe utilizator să înțeleagă și să gestioneze "${themeTitle}".
    *   Menționează pe scurt că fișa va include tehnici practice inspirate din abordări terapeutice validate.
    *   O notă de încurajare pentru implicare.

3.  **Secțiunea 1: Explorarea Personală a Temei "${themeTitle}"**
    *   **1.1. Conștientizarea Manifestărilor (minim 3 întrebări de reflecție detaliate):**
        *   Ajută utilizatorul să identifice cum se manifestă "${themeTitle}" *specific* în viața sa (situații, frecvență, intensitate).
        *   Ex: "Amintește-ți o situație recentă (sau recurentă) în care "${themeTitle}" a fost prezent(ă) sau intens(ă). Descrie situația în detaliu: ce s-a întâmplat, cine a fost implicat, unde erai?"
        *   Lasă spațiu amplu pentru răspuns (ex: "Situația: ____________________________________________________").
    *   **1.2. Gânduri Automate și Convingeri Asociate (minim 3 întrebări specifice):**
        *   Întrebări pentru a identifica gândurile care apar în legătură cu "${themeTitle}".
        *   Ex: "Ce gânduri îți trec prin minte chiar înainte, în timpul și după ce te confrunți cu "${themeTitle}" sau cu situațiile asociate? Notează-le cât mai exact."
        *   Ex: "Există anumite 'reguli' sau convingeri personale pe care le ai despre tine, despre alții sau despre lume, care par să fie activate de "${themeTitle}"? (ex. 'Trebuie să...', 'Nu ar trebui să...', 'Dacă X, atunci Y')."
    *   **1.3. Emoții și Senzații Fizice (minim 2-3 întrebări):**
        *   Identificarea paletei emoționale și a reacțiilor corporale.
        *   Ex: "Ce emoții (ex: anxietate, tristețe, furie, rușine, vinovăție, gol interior) simți cel mai des în legătură cu "${themeTitle}"? Evaluează intensitatea lor pe o scală de la 0 la 10."
        *   Ex: "Observi vreo senzație fizică specifică în corpul tău când "${themeTitle}" este activ(ă)? (ex: tensiune musculară, nod în gât, palpitații, greutate în piept). Unde o simți?"

4.  **Secțiunea 2: Înțelegerea Rădăcinilor și Nevoilor (Opțional, dacă tema se pretează)**
    *   **2.1. Posibile Origini și Influențe (1-2 întrebări reflective, cu blândețe):**
        *   Ex: "Reflectând la experiențele tale de viață (copilărie, adolescență, relații importante), crezi că există evenimente sau tipare care ar fi putut contribui la dezvoltarea "${themeTitle}"?" (Fără a forța auto-analiza excesivă).
    *   **2.2. Nevoi Emoționale Neîmplinite (minim 2 întrebări):**
        *   Ce nevoi fundamentale (ex: siguranță, conectare, validare, autonomie, competență) ar putea fi nesatisfăcute și semnalate prin "${themeTitle}"?
        *   Ex: "Când "${themeTitle}" este prezent(ă), ce nevoie profundă simți că nu este îndeplinită în acel moment sau în viața ta în general?"

5.  **Secțiunea 3: TEHNICI PRACTICE DE LUCRU ȘI STRATEGII DE SCHIMBARE (MINIM 2-3 TEHNICI DISTINCTE):**
    *   Pentru fiecare tehnică propusă:
        *   **Numele Tehnicii:** Clar și sugestiv (ex: "Restructurare Cognitivă ABCDE", "Exercițiu de Defuziune Cognitivă: Frunze pe Râu", "Tehnica Respirației Diafragmatice", "Activare Comportamentală: Pași Mici").
        *   **Scurtă Descriere și Scop:** Explică pe scurt în ce constă tehnica și ce urmărește să realizeze în raport cu "${themeTitle}". Menționează abordarea terapeutică din care provine (ex: TCC, ACT, DBT).
        *   **Instrucțiuni Pas cu Pas:** Ghid detaliat, clar și acționabil despre cum să aplice utilizatorul tehnica. Folosește un limbaj simplu.
            *   *Pentru tehnici TCC (ex: restructurare cognitivă):* poate include identificarea gândului disfuncțional, dovezile pro/contra, generarea unui gând alternativ echilibrat.
            *   *Pentru tehnici ACT (ex: defuziune):* instrucțiuni pentru a observa gândurile fără a fuziona cu ele, metafore.
            *   *Pentru tehnici de mindfulness/relaxare:* ghidaj pentru respirație, scanare corporală simplă.
            *   *Pentru tehnici comportamentale:* planificarea unor pași mici, graduali.
        *   **Exemplu Concret (dacă este posibil):** Un scurt exemplu despre cum ar arăta aplicarea tehnicii pentru o situație legată de "${themeTitle}".
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
        *   Ex: "Din tehnicile prezentate mai sus, care 1-2 par cele mai potrivite sau rezonabile pentru tine să le încerci în perioada următoare în legătură cu "${themeTitle}"?"
    *   **4.2. Primul Pas Concret (1-2 întrebări):**
        *   Ex: "Care este cel mai mic și mai realizabil pas pe care îl poți face săptămâna aceasta pentru a începe să aplici una dintre tehnicile alese sau pentru a aborda "${themeTitle}"?"
        *   Ex: "Când și cum anume vei face acest prim pas?"
    *   **4.3. Anticiparea Obstacolelor și Resurse (Opțional, 1 întrebare):**
        *   Ex: "Ce obstacole ai putea întâmpina și cum le-ai putea depăși? Ce resurse interne sau externe te-ar putea sprijini?"
    *   **4.4. Angajament și Auto-Încurajare:**
        *   O scurtă notă despre importanța practicii regulate și a răbdării cu sine.
        *   Ex: "Felicitări pentru că ai parcurs această fișă! Amintește-ți că fiecare pas mic contează."

7.  **Resurse Suplimentare (Opțional, dar recomandat):**
    *   Sugestii scurte de unde ar putea afla mai multe, dacă este cazul (ex: "Pentru mai multe despre mindfulness, poți explora aplicații precum Headspace sau Calm." - Fii neutru și general).
    *   Recomandarea de a discuta dificultățile cu un terapeut, dacă este cazul.

Lungime Fișă: Suficient de detaliată pentru a fi utilă, dar nu copleșitoare. Calitatea și caracterul acționabil primează.`;
    } else {
        return `EROARE: Tip de material necunoscut: ${materialType}.`;
    }

    const materialContent = await callGeminiAPIForMaterials(materialPrompt, geminiModelGenerareMaterialMaterials, {
        temperature: 0.65, // Ușor mai creativ pentru personalizare
        // responseMimeType: "text/plain", // Pentru Markdown
    });
    return materialContent;
}

async function handleMaterialTypeSelectedAndGenerate(event) {
    const materialType = event.target.dataset.materialType;
    const themeTitleForGen = decodeURIComponent(event.target.dataset.themeForGen);

    if (materialType === "cancel_type") {
        showUIMessageMaterials("Selecția tipului de material a fost anulată.", "info", true);
        clearMaterialTypeSelectionUI();
        // Păstrăm tema selectată pentru a putea alege alt tip de material
        return;
    }

    if (!selectedThemeTitleForGeneration || !selectedThemeContextForGeneration || selectedThemeTitleForGeneration !== themeTitleForGen) {
        showUIMessageMaterials("Eroare: Tema selectată sau contextul asociat lipsesc. Reîncarcă temele sau selectează din nou.", "error", false);
        // Reactivează butoanele
        document.querySelectorAll('.material-type-button, .theme-select-button, #refreshThemesButton').forEach(btn => btn.disabled = !(genAIMaterials && currentUserIdMaterials));
        const refreshBtn = document.getElementById('refreshThemesButton');
        if (refreshBtn) refreshBtn.disabled = !(genAIMaterials && currentUserIdMaterials);
        return;
    }
    if (!currentUserIdMaterials) {
        showUIMessageMaterials("Eroare: Utilizatorul nu este definit. Reautentifică-te.", "error", false);
        return;
    }

    const typeLabel = materialType === 'articol' ? 'articolului' : 'fișei de lucru';
    showUIMessageMaterials(`Se generează conținutul pentru ${typeLabel} despre "${themeTitleForGen}" folosind contextul relevant... Acest proces poate dura.`, "info", false);
    document.querySelectorAll('.material-type-button, .theme-select-button, #refreshThemesButton').forEach(btn => btn.disabled = true);

    const content = await generatePersonalizedMaterialContentInternal(materialType, themeTitleForGen, currentUserIdMaterials);

    if (content.toUpperCase().startsWith("EROARE:")) {
        showUIMessageMaterials(`Eroare la generarea ${typeLabel}: ${content.substring(0,200)}... Verifică consola.`, "error", false);
    } else {
        try {
            await addDoc(collection(dbMaterials, "materialeGenerate"), {
                ownerUid: currentUserIdMaterials,
                tema: themeTitleForGen,
                tipMaterial: materialType,
                continutGenerat: content,
                // relevantContextUsed: selectedThemeContextForGeneration, // Opțional pentru debug
                timestampCreare: Timestamp.fromDate(new Date()),
                dateAfisare: new Date().toLocaleDateString("ro-RO", { day: '2-digit', month: '2-digit', year: 'numeric' })
            });
            showUIMessageMaterials(`${materialType === 'articol' ? 'Articolul' : 'Fișa de lucru'} despre "${themeTitleForGen}" a fost generat și salvat cu succes!`, "success", true);
            await displayGeneratedMaterialsInternal(currentUserIdMaterials);
            // Nu curățăm selecția de tip pentru a permite generarea și celuilalt tip de material pentru aceeași temă
            // clearMaterialTypeSelectionUI(); 
        } catch (dbError) {
            console.error("[MaterialsJS] Eroare salvare material în Firestore:", dbError);
            showUIMessageMaterials(`Eroare la salvarea materialului: ${dbError.message}`, "error", false);
        }
    }
    document.querySelectorAll('.material-type-button, .theme-select-button, #refreshThemesButton').forEach(btn => btn.disabled = !(genAIMaterials && currentUserIdMaterials));
     const refreshBtn = document.getElementById('refreshThemesButton');
     if (refreshBtn) refreshBtn.disabled = !(genAIMaterials && currentUserIdMaterials);
      // Menține butoanele de tip material active dacă AI-ul e disponibil
    document.querySelectorAll('.material-type-button').forEach(btn => {
        if (btn.dataset.materialType !== "cancel_type") {
            btn.disabled = !(genAIMaterials && currentUserIdMaterials);
        }
    });
}

// --- AFIȘARE ȘI ȘTERGERE MATERIALE (EXISTENTE) ---
async function displayGeneratedMaterialsInternal(userId) {
    if (!materialeListContainer || !userId) return;
    currentUserIdMaterials = userId; // Asigură-te că e setat
    materialeListContainer.innerHTML = '<p class="loading-message">Se încarcă materialele tale personalizate...</p>';

    try {
        const q = query(
            collection(dbMaterials, "materialeGenerate"),
            where("ownerUid", "==", userId),
            orderBy("timestampCreare", "desc")
        );
        const querySnapshot = await getDocs(q);
        materialeListContainer.innerHTML = ''; // Golește înainte de a adăuga

        if (querySnapshot.empty) {
            // Afișează mesaj doar dacă nu există deja un mesaj informativ de la generarea temelor
            if (!materialeInfoMessageDiv || materialeInfoMessageDiv.style.display === 'none' || 
                (materialeInfoMessageDiv.style.display === 'block' && !materialeInfoMessageDiv.textContent.includes("identificate"))) {
                showUIMessageMaterials("Niciun material personalizat generat încă. Selectează o temă și un tip de material pentru a crea unul!", "info", false);
            }
            return;
        } else {
             // Ascunde mesajul "Niciun material" dacă acum avem materiale
            if (materialeInfoMessageDiv && materialeInfoMessageDiv.textContent.includes("Niciun material personalizat generat încă")) {
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

    let htmlContent = "(Conținut indisponibil sau eroare la formatare)";
    if (typeof marked !== 'undefined' && material.continutGenerat) {
        try {
            // Pre-procesare pentru a asigura spații corecte înainte de liste neordonate
            let processedMarkdown = material.continutGenerat.replace(/(\n|^)([ \t]*)([*\-+]) /g, '$1\n$2$3 ');
            htmlContent = marked.parse(processedMarkdown);
        }
        catch (e) {
            console.warn("[MaterialsJS] Eroare parsare Markdown:", e, "Material ID:", material.id);
            htmlContent = "<p><em>Eroare la afișarea conținutului formatat. Se afișează textul brut.</em></p><pre style='white-space: pre-wrap; word-wrap: break-word;'>" + escapeHtml(material.continutGenerat) + "</pre>";
        }
    } else if (material.continutGenerat) {
        htmlContent = "<pre style='white-space: pre-wrap; word-wrap: break-word;'>" + escapeHtml(material.continutGenerat) + "</pre>";
    }
    
    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&")
             .replace(/</g, "<")
             .replace(/>/g, ">")
             .replace(/'/g, "'");
    }


    let actionsHTML = `<button class="delete-material-button button-small" data-id="${material.id}" type="button" title="Șterge acest material">🗑️ Șterge</button>`;
    if (material.tipMaterial === 'articol') { // Permite generarea unei fișe de lucru din tema unui articol existent
        actionsHTML += `<button class="add-worksheet-button button-small" data-theme-for-worksheet="${encodeURIComponent(material.tema)}" type="button" title="Generează Fișă de Lucru pentru tema '${material.tema}'">➕📝 Fișă de Lucru</button>`;
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
        showUIMessageMaterials("Eroare: Informații insuficiente pentru a genera fișa de lucru.", "error", true);
        return;
    }
     if (!genAIMaterials) {
        showUIMessageMaterials("Serviciul AI nu este disponibil. Nu se poate genera fișa de lucru.", "error", true);
        return;
    }

    // Căutăm tema în currentUserThemes pentru a obține contextul relevant
    const themeObject = currentUserThemes.themes.find(t => t.title === themeForWorksheet);
    if (themeObject) {
        selectedThemeTitleForGeneration = themeObject.title;
        selectedThemeContextForGeneration = themeObject.relevantContext; // Setăm contextul global
    } else {
        // Dacă tema nu e în lista curentă (ex. listă veche de materiale, teme neactualizate)
        // vom genera fără context specific pre-extras, AI-ul va fi informat
        selectedThemeTitleForGeneration = themeForWorksheet;
        selectedThemeContextForGeneration = null; // Semnalăm că nu avem context pre-extras
        showUIMessageMaterials(`Atenție: Nu s-a găsit context pre-extras pentru tema "${themeForWorksheet}". Fișa de lucru va fi mai generală. Se recomandă actualizarea listei de teme.`, "warning", false);
    }


    showUIMessageMaterials(`Se pregătește generarea fișei de lucru pentru tema "${themeForWorksheet}"...`, "info", false);
    const fakeEvent = { // Simulăm un eveniment ca și cum s-ar fi apăsat pe butonul de tip material
        target: {
            dataset: {
                materialType: 'fisa_lucru',
                themeForGen: encodeURIComponent(themeForWorksheet)
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
            showUIMessageMaterials("Materialul a fost șters cu succes.", "success", true);
            const cardToRemove = materialeListContainer.querySelector(`.material-card[data-id="${materialId}"]`);
            if (cardToRemove) cardToRemove.remove();
            if (materialeListContainer.children.length === 0) {
                showUIMessageMaterials("Niciun material personalizat generat încă.", "info", false);
            }
        } catch (err) {
            console.error("[MaterialsJS] Eroare la ștergerea materialului:", err);
            showUIMessageMaterials(`Eroare la ștergerea materialului: ${err.message}`, "error", true);
        }
    }
}

// --- INIȚIALIZARE ȘI EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    if (materialeListContainer) {
        materialeListContainer.addEventListener('click', (event) => {
            const deleteButton = event.target.closest('.delete-material-button');
            const addWorksheetButton = event.target.closest('.add-worksheet-button');

            if (deleteButton) {
                const materialId = deleteButton.dataset.id;
                handleDeleteMaterial(materialId);
            } else if (addWorksheetButton) {
                const theme = decodeURIComponent(addWorksheetButton.dataset.themeForWorksheet);
                handleAddWorksheetForArticle(theme);
            }
        });
    }
});

onAuthStateChanged(authMaterials, (user) => {
    const materialeTab = document.getElementById('materialeFormContainer');
    const isMaterialeTabVisible = materialeTab && (materialeTab.style.display === 'block' || materialeTab.classList.contains('active'));


    if (user) {
        currentUserIdMaterials = user.uid;
        if (isMaterialeTabVisible) {
            clearAllActionUIs();
            loadUserThemes(currentUserIdMaterials); // Încarcă și afișează temele și UI-ul asociat
            displayGeneratedMaterialsInternal(currentUserIdMaterials);
        }
         // Activează butoanele dacă AI-ul e disponibil, chiar dacă tab-ul nu e vizibil inițial
        // Acest lucru va fi gestionat mai specific la afișarea UI-ului.
    } else {
        currentUserIdMaterials = null;
        currentUserThemes = { themes: [], timestamp: null };
        clearAllActionUIs();
        if (materialeListContainer) materialeListContainer.innerHTML = '';
        if (materialeInfoMessageDiv) materialeInfoMessageDiv.style.display = 'none';
        if (themeManagementContainer) themeManagementContainer.innerHTML = '<p class="info-message">Autentifică-te pentru a accesa materialele personalizate.</p>';
        if (materialGenerationControlsContainer) materialGenerationControlsContainer.innerHTML = '';
    }
});

window.handleMaterialeTabActivated = function(userIdFromMainApp) {
    console.log("[MaterialsJS] Funcția window.handleMaterialeTabActivated a fost apelată cu userId:", userIdFromMainApp);
    
    if (materialeInfoMessageDiv && materialeInfoMessageDiv.style.display === 'block' && materialeInfoMessageDiv.textContent.includes("Se generează")) {
        console.log("[MaterialsJS] Generare în curs, nu se reîncarcă tab-ul de materiale.");
        return; 
    }

    const userIdToUse = userIdFromMainApp || currentUserIdMaterials; // Folosește ID-ul din aplicația principală sau cel curent dacă e null

    if (userIdToUse) {
        currentUserIdMaterials = userIdToUse; // Actualizează ID-ul curent
        // Nu este nevoie să reinițializăm Gemini aici
        clearAllActionUIs();
        loadUserThemes(userIdToUse);
        displayGeneratedMaterialsInternal(userIdToUse);
         // Asigură-te că butoanele sunt în starea corectă
        document.querySelectorAll('.theme-select-button, #refreshThemesButton, .material-type-button').forEach(btn => btn.disabled = !(genAIMaterials && currentUserIdMaterials));
    } else {
        clearAllActionUIs();
        if (materialeListContainer) materialeListContainer.innerHTML = '';
        if (themeManagementContainer) themeManagementContainer.innerHTML = '<p class="info-message">Pentru a vedea sau genera materiale personalizate, te rugăm să te autentifici.</p>';
        if (materialGenerationControlsContainer) materialGenerationControlsContainer.innerHTML = '';
        showUIMessageMaterials("Pentru a vedea sau genera materiale personalizate, te rugăm să te autentifici.", "warning", false);
         document.querySelectorAll('.theme-select-button, #refreshThemesButton, .material-type-button').forEach(btn => btn.disabled = true);
    }
}