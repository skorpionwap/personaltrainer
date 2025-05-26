// --- IMPORTURI ȘI CONFIGURARE INIȚIALĂ (Firebase, Gemini) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, Timestamp, limit as firestoreLimit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
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
const GEMINI_MODEL_ANALIZA_TEME_MATERIALS = "gemini-1.5-flash-latest"; // Model capabil de context mare
const GEMINI_MODEL_GENERARE_MATERIAL_MATERIALS = "gemini-1.5-flash-latest"; // Model capabil de generare

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

// --- FUNCȚIA CALLGEMINIAPI (replicată sau importată) ---
async function callGeminiAPIForMaterials(promptText, modelToUse, generationConfigOptions = {}) {
    if (!modelToUse) {
        console.error("[MaterialsJS] Model Gemini invalid sau neinițializat.");
        return "EROARE: Model AI neinițializat. Verifică consola pentru detalii.";
    }
    try {
        // console.log(`[MaterialsJS] Trimitere către Gemini. Lungime prompt: ${promptText.length} chars.`);
        const requestPayload = {
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 4096, ...generationConfigOptions } // maxOutputTokens poate fi ajustat
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
const generateNewMaterialButton = document.getElementById('generateNewMaterialButton');
const materialeInfoMessageDiv = document.getElementById('materialeInfoMessage');
const CHAT_HISTORY_DOC_ID_PREFIX_MATERIALS = "chatHistory_"; // Consistent cu psihoterapie.js
const MAX_CHAT_MESSAGES_FOR_CONTEXT = 75; // LIMITĂ PENTRU CHAT - ajustează cu grijă!

let currentUserIdMaterials = null;
let identifiedThemesCache = []; // Cache pentru temele identificate
let selectedThemeForGeneration = null;

// --- FUNCȚII UTILITARE UI ---
function showUIMessageMaterials(message, type = "info", autoHide = true) {
    if (!materialeInfoMessageDiv) return;
    materialeInfoMessageDiv.textContent = message;
    materialeInfoMessageDiv.className = `info-message ${type}`; // Asigură-te că ai stiluri CSS
    materialeInfoMessageDiv.style.display = 'block';
    if (autoHide) {
        setTimeout(() => { if (materialeInfoMessageDiv) materialeInfoMessageDiv.style.display = 'none'; }, 7000);
    }
}

function clearThemeAndMaterialSelectionUI() {
    const themeSelectionDiv = document.getElementById('themeSelectionContainer');
    if (themeSelectionDiv) themeSelectionDiv.innerHTML = ''; // Golește opțiunile de teme
    const materialTypeSelectionDiv = document.getElementById('materialTypeSelectionContainer');
    if (materialTypeSelectionDiv) materialTypeSelectionDiv.innerHTML = ''; // Golește opțiunile de tip material
    identifiedThemesCache = [];
    selectedThemeForGeneration = null;
}

// --- LOGICA PRINCIPALĂ PENTRU MATERIALE ---

async function gatherUserDataForThemeAnalysis(userId) {
    let fullContextText = "";

    // 1. Preluare Jurnale (ultimele 5-10)
    try {
        const jurnalQuery = query(
            collection(dbMaterials, "introspectii"),
            where("ownerUid", "==", userId),
            where("type", "==", "jurnal"),
            orderBy("timestampCreare", "desc"),
            firestoreLimit(7) // Ultimele 7 jurnale
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
            firestoreLimit(10) // Ultimele 10 fișe
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
    // ATENȚIE: Preluarea întregului chat poate fi problematică.
    try {
        const chatDocRef = doc(dbMaterials, "chatHistories", CHAT_HISTORY_DOC_ID_PREFIX_MATERIALS + userId);
        const chatDocSnap = await getDoc(chatDocRef);
        if (chatDocSnap.exists() && chatDocSnap.data().messages) {
            fullContextText += "\n\n--- EXTRAS DIN CONVERSAȚIILE DE CHAT RECENTE ---\n";
            const allMessages = chatDocSnap.data().messages;
            const recentMessages = allMessages.slice(-MAX_CHAT_MESSAGES_FOR_CONTEXT); // Ia doar ultimele X
            recentMessages.forEach(msg => {
                const role = msg.role === 'user' ? 'Utilizator' : 'PsihoGPT';
                fullContextText += `${role}: ${msg.content}\n`;
            });
            fullContextText += "---\n";
        }
    } catch (e) { console.error("[MaterialsJS] Eroare preluare chat:", e); }

    if (fullContextText.length < 100) { // Prag minim de conținut
        return null; // Nu suficient conținut
    }
    // console.log("[MaterialsJS] Lungimea totală a contextului pentru analiza temelor:", fullContextText.length);
    return fullContextText;
}

async function identifyKeyThemesFromCombinedActivity(userId) {
    if (!geminiModelAnalizaTemeMaterials) return { success: false, themes: [], message: "[MaterialsJS] Serviciu AI analiză indisponibil." };

    const combinedUserData = await gatherUserDataForThemeAnalysis(userId);

    if (!combinedUserData) {
        return { success: false, themes: [], message: "Nu există suficientă activitate recentă (jurnale, fișe, chat) pentru o analiză relevantă." };
    }

    const themeAnalysisPrompt = `
Rol: Ești un psihoterapeut AI experimentat, capabil să analizezi texte diverse (jurnale, fișe de reflecție, conversații de chat) pentru a identifica teme psihologice centrale, tipare de gândire sau probleme recurente.
Sarcină: Analizează textul combinat de mai jos, care provine din activitatea recentă a unui utilizator. Identifică între 3 și 5 teme principale sau probleme cheie.
Pentru fiecare temă, oferă o etichetă scurtă și descriptivă (maxim 5-7 cuvinte).
Formatare Răspuns: Listează fiecare temă pe o linie nouă, fără numere sau alte prefixe. Nu adăuga introduceri, explicații sau concluzii. Doar lista de teme.

--- TEXT COMBINAT UTILIZATOR (JURNALE, FIȘE, CHAT) ---
${combinedUserData.substring(0, 150000)}
--- SFÂRȘIT TEXT COMBINAT ---

Teme Identificate:
`; // Limitez inputul pentru siguranță, Gemini 1.5 Flash ar trebui să suporte mai mult. Ajustează cu grijă.

    // console.log("[MaterialsJS] Prompt pentru analiza temelor trimis la Gemini.");
    const themesRaw = await callGeminiAPIForMaterials(themeAnalysisPrompt, geminiModelAnalizaTemeMaterials, { temperature: 0.3 });

    if (themesRaw.toUpperCase().startsWith("EROARE:")) {
        console.error("[MaterialsJS] Eroare API la identificarea temelor:", themesRaw);
        return { success: false, themes: [], message: `Analiza AI a eșuat: ${themesRaw}` };
    }
    const themesList = themesRaw.split('\n').map(theme => theme.trim()).filter(theme => theme.length > 3 && theme.length < 100);
    return { success: true, themes: themesList, message: "Teme identificate." };
}

async function generatePersonalizedMaterialContentInternal(materialType, theme, userId) {
    if (!geminiModelGenerareMaterialMaterials) return "EROARE: [MaterialsJS] Serviciu AI generare indisponibil.";

    // Adunăm un context mai specific pentru generarea materialului, focusat pe tema aleasă
    const specificContextForMaterial = await gatherUserDataForThemeAnalysis(userId); // Reutilizăm funcția
    let userContextSummary = "Datele recente ale utilizatorului indică o preocupare sau explorare a temei: " + theme + ".";
    if (specificContextForMaterial) {
        // Poți încerca să filtrezi/sumarizezi `specificContextForMaterial` pentru a extrage doar ce e relevant pentru `theme`
        // Dar pentru început, un sumar generic plus tema e suficient.
        userContextSummary += "\nExtrase relevante din activitatea sa (jurnale, fișe, chat) arată diverse fațete ale acestei teme.";
        // Nu trimitem tot `specificContextForMaterial` aici pentru a nu face promptul de generare prea masiv,
        // ci ne bazăm pe faptul că tema a fost deja bine identificată.
    }


    let materialPrompt = "";
    if (materialType === 'articol') {
        materialPrompt = `
Rol: Ești PsihoGPT, un terapeut AI avansat, specializat în TCC, Terapia Schemelor și ACT.
Sarcină: Generează un articol teoretic detaliat, explicativ și empatic pe tema centrală "${theme}".
Context Utilizator: Acest articol este pentru un utilizator care explorează activ această temă. ${userContextSummary.substring(0,800)}
Articolul trebuie să:
1.  Definească clar conceptul "${theme}" într-un mod accesibil și nuanțat.
2.  Explice posibilele origini sau factori care contribuie la "${theme}" (ex. experiențe timpurii, tipare de gândire).
3.  Descrie cum se poate manifesta "${theme}" în diferite arii ale vieții (relații, muncă, imagine de sine), oferind exemple ilustrative generale.
4.  Prezinte 3-4 strategii concrete sau perspective de abordare/înțelegere/gestionare a temei "${theme}", bazate pe principii TCC, Schema Therapy, ACT sau alte abordări validate. Include exemple practice pentru fiecare strategie.
5.  Să se încheie cu o notă de încurajare, auto-compasiune și speranță, subliniind că schimbarea este posibilă.
Formatare: Folosește Markdown (titluri principale cu ##, subtitluri cu ###, liste cu *, text **bold** sau *italic*). Structurează bine conținutul.
Restricții: Răspunde DOAR cu conținutul articolului. Nu adăuga introduceri de genul "Iată articolul:" sau concluzii suplimentare în afara celor specificate.
Lungime: Aproximativ 500-800 cuvinte.
Ton: Empatic, suportiv, profund informativ, dar ușor de înțeles.`;
    } else if (materialType === 'fisa_lucru') {
        materialPrompt = `
Rol: Ești PsihoGPT... (similar cu cel de articol)
Sarcină: Generează o fișă de lucru practică, detaliată și interactivă pe tema centrală "${theme}".
Context Utilizator: Această fișă este pentru un utilizator care explorează activ această temă. ${userContextSummary.substring(0,800)}
Fișa de lucru trebuie să includă URMĂTOARELE SECȚIUNI, în această ordine:
1.  **Titlu Clar:** Ex: "Fișă de Lucru: Explorarea și Gestionarea [${theme}]".
2.  **Introducere Scurtă (2-3 propoziții):** Scopul fișei și cum poate ajuta.
3.  **Secțiunea 1: Conștientizarea Manifestărilor (minim 3 întrebări de reflecție):** Întrebări care ajută utilizatorul să identifice cum se manifestă "${theme}" specific în viața sa. (Ex: "În ce situații recente ai observat că [aspect al temei] a fost cel mai intens? Descrie pe scurt.") Lasă spațiu pentru răspuns (ex: "Răspuns: ____________________").
4.  **Secțiunea 2: Explorarea Gândurilor și Emoțiilor Asociate (minim 3 întrebări):** Întrebări despre gândurile automate, emoțiile și senzațiile fizice legate de "${theme}".
5.  **Secțiunea 3: Identificarea Nevoilor Neîmplinite (minim 2 întrebări):** Ce nevoi ar putea fi în spatele manifestărilor "${theme}"?
6.  **Secțiunea 4: Strategii și Acțiuni Practice (minim 2-3 sugestii concrete):** Propune exerciții specifice, tehnici de coping sau pași mici pe care utilizatorul îi poate face pentru a aborda "${theme}". Acestea trebuie să fie acționabile.
7.  **Secțiunea 5: Reflecții Finale și Angajament (1-2 întrebări):** Pentru consolidarea învățării și planificarea pașilor următori.
Formatare: Folosește Markdown. Titluri de secțiune cu ###.
Restricții: Răspunde DOAR cu conținutul fișei.
Ton: Ghidant, practic, încurajator, structurat.`;
    } else { return "EROARE: Tip de material necunoscut."; }

    const materialContent = await callGeminiAPIForMaterials(materialPrompt, geminiModelGenerareMaterialMaterials, { temperature: 0.6 });
    return materialContent;
}

// --- HANDLERS PENTRU ACȚIUNI UI ---
async function handleInitialGenerateButtonClick() {
    if (!currentUserIdMaterials) {
        showUIMessageMaterials("Trebuie să fiți autentificat.", "error"); return;
    }
    if (generateNewMaterialButton) {
        generateNewMaterialButton.disabled = true;
        generateNewMaterialButton.innerHTML = "⏳ Se analizează activitatea...";
    }
    clearThemeAndMaterialSelectionUI();
    showUIMessageMaterials("PsihoGPT analizează activitatea ta recentă (jurnale, fișe, chat) pentru a identifica teme...", "info", false);

    const themesResult = await identifyKeyThemesFromCombinedActivity(currentUserIdMaterials);

    if (generateNewMaterialButton) { // Butonul ar trebui să rămână dezactivat până la finalizarea întregului flux
        generateNewMaterialButton.innerHTML = "🚀 Generează Material Nou"; // Textul poate fi ajustat ulterior
    }

    if (!themesResult.success || themesResult.themes.length === 0) {
        showUIMessageMaterials(themesResult.message || "Nu s-au putut identifica teme clare din activitatea recentă. Încearcă să mai adaugi intrări în jurnal sau fișe.", "warning", false);
        if (generateNewMaterialButton) generateNewMaterialButton.disabled = false;
        return;
    }

    identifiedThemesCache = themesResult.themes;
    displayThemeSelectionUI(identifiedThemesCache);
}

function displayThemeSelectionUI(themes) {
    if (generateNewMaterialButton) generateNewMaterialButton.style.display = 'none'; // Ascunde butonul principal
    showUIMessageMaterials("Am identificat următoarele teme din activitatea ta. Alege una pentru care dorești materiale de suport:", "info", false);

    let themeSelectionHTML = '<div id="themeSelectionContainer" class="theme-selection-container">';
    themes.forEach((theme, index) => {
        themeSelectionHTML += `<button class="theme-select-button button-outline" data-theme-index="${index}">${theme}</button>`;
    });
    themeSelectionHTML += `<button class="theme-select-button button-cancel" data-theme-index="-1">Anulează</button>`;
    themeSelectionHTML += '</div>';

    // Adaugă acest HTML sub `materialeInfoMessageDiv` sau într-un loc dedicat
    if (materialeInfoMessageDiv) {
        materialeInfoMessageDiv.insertAdjacentHTML('afterend', themeSelectionHTML);
    }

    document.querySelectorAll('.theme-select-button').forEach(button => {
        button.addEventListener('click', handleThemeSelected);
    });
}

function handleThemeSelected(event) {
    const themeIndex = parseInt(event.target.dataset.themeIndex, 10);
    const themeSelectionContainer = document.getElementById('themeSelectionContainer');
    if (themeSelectionContainer) themeSelectionContainer.remove(); // Înlătură opțiunile de temă

    if (themeIndex === -1) { // Anulare
        showUIMessageMaterials("Generare anulată.", "info");
        if (generateNewMaterialButton) {
            generateNewMaterialButton.style.display = 'block';
            generateNewMaterialButton.disabled = false;
        }
        return;
    }

    selectedThemeForGeneration = identifiedThemesCache[themeIndex];
    if (selectedThemeForGeneration) {
        displayMaterialTypeSelectionUI(selectedThemeForGeneration);
    } else {
        showUIMessageMaterials("Eroare la selectarea temei. Încearcă din nou.", "error");
        if (generateNewMaterialButton) {
            generateNewMaterialButton.style.display = 'block';
            generateNewMaterialButton.disabled = false;
        }
    }
}

function displayMaterialTypeSelectionUI(theme) {
    showUIMessageMaterials(`Ai selectat tema: "${theme}". Ce tip de material dorești să generezi?`, "info", false);

    let materialTypeHTML = '<div id="materialTypeSelectionContainer" class="material-type-selection-container">';
    materialTypeHTML += `<button class="material-type-button button-primary" data-material-type="articol">📚 Articol Teoretic</button>`;
    materialTypeHTML += `<button class="material-type-button button-primary" data-material-type="fisa_lucru">📝 Fișă de Lucru Practică</button>`;
    materialTypeHTML += `<button class="material-type-button button-cancel" data-material-type="cancel_type">Anulează</button>`;
    materialTypeHTML += '</div>';

    if (materialeInfoMessageDiv) {
        materialeInfoMessageDiv.insertAdjacentHTML('afterend', materialTypeHTML);
    }

    document.querySelectorAll('.material-type-button').forEach(button => {
        button.addEventListener('click', handleMaterialTypeSelectedAndGenerate);
    });
}

async function handleMaterialTypeSelectedAndGenerate(event) {
    const materialType = event.target.dataset.materialType;
    const materialTypeContainer = document.getElementById('materialTypeSelectionContainer');
    if (materialTypeContainer) materialTypeContainer.remove();

    if (materialType === "cancel_type") {
        showUIMessageMaterials("Generare anulată.", "info");
        if (generateNewMaterialButton) {
            generateNewMaterialButton.style.display = 'block';
            generateNewMaterialButton.disabled = false;
        }
        selectedThemeForGeneration = null; // Resetează tema selectată
        return;
    }

    if (!selectedThemeForGeneration || !currentUserIdMaterials) {
        showUIMessageMaterials("Eroare: Tema sau utilizatorul nu sunt definiți. Reîncearcă.", "error", false);
        if (generateNewMaterialButton) {
            generateNewMaterialButton.style.display = 'block';
            generateNewMaterialButton.disabled = false;
        }
        return;
    }

    const typeLabel = materialType === 'articol' ? 'articolului' : 'fișei de lucru';
    showUIMessageMaterials(`Se generează conținutul pentru ${typeLabel} despre "${selectedThemeForGeneration}"... Acest proces poate dura.`, "info", false);
    if (generateNewMaterialButton) { // Ține butonul principal ascuns și dezactivat
         generateNewMaterialButton.style.display = 'none';
         generateNewMaterialButton.disabled = true;
    }

    const content = await generatePersonalizedMaterialContentInternal(materialType, selectedThemeForGeneration, currentUserIdMaterials);

    if (content.toUpperCase().startsWith("EROARE:")) {
        showUIMessageMaterials(`Eroare la generarea ${typeLabel}: ${content}`, "error", false);
    } else {
        try {
            await addDoc(collection(dbMaterials, "materialeGenerate"), {
                ownerUid: currentUserIdMaterials,
                tema: selectedThemeForGeneration,
                tipMaterial: materialType,
                continutGenerat: content,
                timestampCreare: Timestamp.fromDate(new Date()),
                dateAfisare: new Date().toLocaleDateString("ro-RO", { day: '2-digit', month: '2-digit', year: 'numeric' })
            });
            showUIMessageMaterials(`${materialType === 'articol' ? 'Articolul' : 'Fișa de lucru'} despre "${selectedThemeForGeneration}" a fost generat și salvat cu succes!`, "success");
            await displayGeneratedMaterialsInternal(currentUserIdMaterials); // Reîncarcă lista
        } catch (dbError) {
            console.error("[MaterialsJS] Eroare salvare material în Firestore:", dbError);
            showUIMessageMaterials(`Eroare la salvarea materialului: ${dbError.message}`, "error", false);
        }
    }
    // Reactivează butonul principal după finalizarea întregului flux
    if (generateNewMaterialButton) {
        generateNewMaterialButton.style.display = 'block';
        generateNewMaterialButton.disabled = false;
    }
    selectedThemeForGeneration = null; // Resetează tema
}


// --- AFIȘARE ȘI ȘTERGERE MATERIALE (EXISTENTE) ---
async function displayGeneratedMaterialsInternal(userId) {
    if (!materialeListContainer || !userId) return;
    currentUserIdMaterials = userId; // Asigură-te că e actualizat
    materialeListContainer.innerHTML = '<p class="loading-message">Se încarcă materialele tale personalizate...</p>';

    try {
        const q = query(
            collection(dbMaterials, "materialeGenerate"),
            where("ownerUid", "==", userId),
            orderBy("timestampCreare", "desc")
        );
        const querySnapshot = await getDocs(q);
        materialeListContainer.innerHTML = ''; // Golește mesajul de încărcare

        if (querySnapshot.empty) {
            if (materialeInfoMessageDiv && materialeInfoMessageDiv.style.display !== 'block') { // Nu suprascrie mesaje active
                 showUIMessageMaterials("Niciun material personalizat generat încă. Apasă butonul de mai sus pentru a crea unul!", "info", false);
            } else if (!materialeInfoMessageDiv) { // Dacă nu există div-ul de mesaje
                 materialeListContainer.innerHTML = '<p class="info-message">Niciun material personalizat generat încă.</p>';
            }
            return;
        } else {
            // Ascunde mesajul "niciun material" dacă există materiale și niciun alt mesaj activ
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

    card.innerHTML = `
        <div class="card-header">
            <span>${typeLabel}: ${title}</span>
            <span class="card-date">Generat: ${entryDate}</span>
        </div>
        <div class="card-content">
            <div class="material-content-display">${htmlContent}</div>
            <div class="card-actions">
                <button class="delete-material-button button-small" data-id="${material.id}" type="button" title="Șterge acest material">🗑️ Șterge</button>
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
    if (generateNewMaterialButton) {
        generateNewMaterialButton.addEventListener('click', handleInitialGenerateButtonClick);
    }

    if (materialeListContainer) {
        materialeListContainer.addEventListener('click', (event) => { // Delegare eveniment pentru butoanele de ștergere
            if (event.target.classList.contains('delete-material-button')) {
                const materialId = event.target.dataset.id;
                handleDeleteMaterial(materialId);
            }
        });
    }
});

onAuthStateChanged(authMaterials, (user) => {
    const materialeTab = document.getElementById('materialeFormContainer'); // Referință la containerul tab-ului

    if (user) {
        currentUserIdMaterials = user.uid;
        if (generateNewMaterialButton) generateNewMaterialButton.disabled = !genAIMaterials; // Activează doar dacă Gemini e gata

        // Verifică dacă tab-ul de materiale este cel afișat de `psihoterapie.js`
        // Aceasta este o verificare simplă; o comunicare mai robustă ar fi mai bună.
        if (materialeTab && materialeTab.style.display === 'block') {
            clearThemeAndMaterialSelectionUI(); // Curăță orice selecții anterioare dacă userul revine
            displayGeneratedMaterialsInternal(currentUserIdMaterials);
        }
    } else {
        currentUserIdMaterials = null;
        if (generateNewMaterialButton) generateNewMaterialButton.disabled = true;
        if (materialeListContainer) materialeListContainer.innerHTML = '';
        clearThemeAndMaterialSelectionUI();
        if (materialeInfoMessageDiv) materialeInfoMessageDiv.style.display = 'none';
    }
});

// Funcție expusă pentru a fi apelată de `psihoterapie.js`
window.handleMaterialeTabActivated = function(userId) {
    // console.log("[MaterialsJS] Tab materiale activat prin window func, user:", userId);
    if (!materialeInfoMessageDiv || (materialeInfoMessageDiv.style.display === 'block' && materialeInfoMessageDiv.textContent.includes("Se generează"))) {
        // Nu face nimic dacă un proces de generare este deja în curs (indicat de mesaj)
        return;
    }
    clearThemeAndMaterialSelectionUI(); // Curăță UI-ul de selecție teme/tipuri
    if (generateNewMaterialButton) { // Asigură-te că butonul principal e vizibil
        generateNewMaterialButton.style.display = 'block';
        generateNewMaterialButton.disabled = !(currentUserIdMaterials && genAIMaterials);
    }

    if (userId) {
        currentUserIdMaterials = userId; // Sincronizează userId
        displayGeneratedMaterialsInternal(userId);
    } else if (currentUserIdMaterials) { // Dacă userId e null dar avem un user logat anterior
        displayGeneratedMaterialsInternal(currentUserIdMaterials);
    } else {
        if (materialeListContainer) materialeListContainer.innerHTML = '';
        showUIMessageMaterials("Pentru a vedea sau genera materiale personalizate, te rugăm să te autentifici.", "warning", false);
    }
}