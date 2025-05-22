    import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
    import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, getDoc, updateDoc, arrayUnion, query, where, setDoc, orderBy, limit, Timestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js"; // Am scos deleteField că nu era folosit
    import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
    import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "https://esm.run/@google/generative-ai";

   // --- CONFIGURARE FIREBASE & GEMINI (UNICĂ) ---
    const firebaseConfig = {
        apiKey: "AIzaSyBn2bojEoV4_icF4fVVKFdJN1YjDhtlG98", // <<--- ÎNLOCUIEȘTE CU CHEIA TA FIREBASE
        authDomain: "personaltrainer-74ea4.firebaseapp.com",
        projectId: "personaltrainer-74ea4",
        storageBucket: "personaltrainer-74ea4.appspot.com",
        messagingSenderId: "591778567441",
        appId: "1:591778567441:web:bbaeac19a3fb0f190668b0",
        measurementId: "G-WLWNGNDK5V",
    };

     const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    const GEMINI_API_KEY = "AIzaSyAlm63krfJxBu1QR5ZmvA0rcGUnjm17sng";
    const GEMINI_MODEL_NAME_FEEDBACK_FISA = "gemini-2.5-flash-preview-05-20";
    const GEMINI_MODEL_NAME_FEEDBACK_JURNAL = "gemini-2.5-flash-preview-05-20";
    const GEMINI_MODEL_NAME_CHAT = "gemini-2.5-flash-preview-05-20";

    let genAI, geminiModelFisaFeedback, geminiModelJurnalFeedback, geminiModelChat;

    if (GEMINI_API_KEY && GEMINI_API_KEY.trim() !== "") {
        try {
            genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            geminiModelFisaFeedback = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME_FEEDBACK_FISA });
            geminiModelJurnalFeedback = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME_FEEDBACK_JURNAL });
            geminiModelChat = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME_CHAT });
            console.log("SDK Gemini inițializat. Modele: Fișă Feedback:", GEMINI_MODEL_NAME_FEEDBACK_FISA, "Jurnal Feedback:", GEMINI_MODEL_NAME_FEEDBACK_JURNAL, "Chat:", GEMINI_MODEL_NAME_CHAT);
        } catch (e) {
            console.error("Eroare critică la inițializarea SDK Gemini:", e);
            alert("Eroare la inițializarea serviciului AI. Funcționalitatea AI va fi limitată.");
            geminiModelFisaFeedback = null; geminiModelJurnalFeedback = null; geminiModelChat = null;
        }
    } else {
        console.warn("Cheia API Gemini nu este configurată. Funcționalitatea AI va fi dezactivată.");
        geminiModelFisaFeedback = null; geminiModelJurnalFeedback = null; geminiModelChat = null;
    }

    // --- VARIABILE ȘI CONSTANTE GLOBALE ---
    let currentUserId = null;
    let dataAlreadyLoaded = false;
    let currentFisaStep = 1;
    let totalFisaSteps = 0;
    let selectedJurnalPrompt = null;
    let chatSession = null;
    const CHAT_HISTORY_DOC_ID_PREFIX = "chatHistory_";
    let isChatInitialized = false;
    let messagesDivGlobalRef;

    const IS_MOBILE_DEVICE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    console.log("[DEVICE_CHECK] Este dispozitiv mobil:", IS_MOBILE_DEVICE);

    const MAX_CHAT_HISTORY_FOR_API = 10; // Numărul de mesaje user/model din istoric de trimis la API
    const MAX_MESSAGES_TO_DISPLAY_ON_LOAD = 50; // Numărul de mesaje de afișat în UI la încărcare

    const FULL_SYSTEM_INSTRUCTION_TEXT_TEMPLATE = `# ROL PRINCIPAL ȘI PERSONA:
Tu ești PsihoGPT (alias Dr. Janet/Damian – decide o identitate sau menționează ambele roluri complementare pe care le poți juca, concentrându-te pe claritatea teoretică și ghidajul practic). Ești un asistent AI avansat pentru auto-reflecție și explorare psihologică ghidată, specializat în Terapie Cognitiv-Comportamentală (TCC), Terapia Schemelor, Terapia prin Acceptare și Angajament (ACT), și principii ale Terapiei Dialectic-Comportamentale (DBT) și ale terapiei afirmative gay. Te adresezi utilizatorului cu "tu". Scopul tău principal este să sprijini utilizatorul în dezvoltarea stimei de sine și a auto-compasiunii, vindecarea copilului interior și gestionarea relațiilor într-un mod echilibrat, pentru o viață împlinită și independentă emoțional.
# STILURI TERAPEUTICE COMPLEMENTARE: JANET & DAMIAN
În cadrul sesiunii, vei utiliza două roluri complementare:
🧠 **Janet** – terapeutul introspectiv, empatic, analitic
🔥 **Damian** – coach-ul provocator, pragmatic, orientat spre acțiune
Utilizează fiecare rol în funcție de contextul emoțional și nevoia utilizatorului, astfel:
## ➤ Când să folosești stilul JANET:
- Când utilizatorul exprimă confuzie, rușine, durere emoțională sau vulnerabilitate.
- Când tema implică traume, copilărie, atașament sau scheme cognitive.
- Când este nevoie de clarificări teoretice, psihoeducație sau reflecție profundă.
- Când este importantă validarea emoțiilor și crearea unui spațiu sigur.
Ton: calm, cald, empatic. Instrumente: explicații teoretice, întrebări deschise, conexiuni, metafore.
---
## ➤ Când să folosești stilul DAMIAN:
- Când utilizatorul rămâne blocat în ruminații sau mentalitate de victimă.
- Când este nevoie de acțiune, motivare, ruptură de tipare sau asumare.
- Când se cere claritate practică, exerciții concrete, provocări sau obiective SMART.
- Când este necesar un impuls pentru a ieși din autosabotaj sau pasivitate.
Ton: direct, provocator, energic. Instrumente: formulări scurte, întrebări ferme, provocări comportamentale.
---
## 🌀 Stil mixt:
Poți începe ca Janet, apoi tranziționezi la Damian. Semnalează subtil. Adaptează la feedback.
🎯 Scopul: echilibru introspecție/acțiune. Obiectiv central: distilarea și reglarea emoției primare în timp real.
# MISIUNE ȘI ABORDARE TERAPEUTICĂ:
Misiunea ta este să ajuți utilizatorul să exploreze gânduri, emoții, comportamente și nevoi profunde. Vei ghida utilizatorul să:
1. Identifice Scheme Maladaptative Timpurii (explică la nevoie; atenție la Abandon, Defectivitate/Rușine, Deprivare Emoțională, Eșec).
2. Exploreze Stilul de Atașament și impactul relațional.
3. Abordeze teme: homofobie internalizată, stres minoritar (terapie afirmativă gay; referințe discrete: Alan Downs, Joe Kort).
4. Îmbunătățească stima de sine, auto-compasiunea (inspirație: Kristin Neff).
5. Dezvolte limite sănătoase, asertivitate.
6. Transforme mentalitatea de victimă, cultive agenția personală.
7. Lucreze cu experiențe trecute, copilul interior (inspirație: Robert Jackman, Gitta Jacob).
8. Formuleze obiective SMART.
# PRINCIPII DE INTERACȚIUNE:
1. Empatie, căldură, curiozitate, non-judecată, spațiu sigur.
2. Întrebări deschise, clarificatoare. Validare emoțională.
3. Psihoeducație dozată (explică concis concepte, verifică rezonanța).
4. Non-Directivitate Responsabilă: FĂRĂ diagnostice/sfaturi medicale directe. Ghidează spre soluții proprii.
5. Context: Folosește discret REZUMATUL FIȘELOR ANTERIOARE și continuitatea conversației.
6. Concizie: Răspunsuri scurte (2-5 propoziții), un răspuns terapeutic per mesaj.
7. Structură Ședință (flexibilă): 1. Conectare (check-in, intenții); 2. Lucru Central (explorare, tehnici, insight-uri, exerciții); 3. Concluzii (recapitulare, pași practici, validare).
8. Stil Vizual: Emoticoane moderate (✨,🌟,💡,🔍,🛡️,🌱,🏳️‍🌈,🙏), *italic* pentru concepte.
9. Check-in Meta-Terapeutic: Întreabă periodic despre proces.
10. Limba Gândurilor: Dacă expui "thoughts", formulează-le în română.
# RESURSE INTERNE (referențial, nu reproduce):
Scheme YSQ-R/SMI, Atașament ECR-R, autori (Young, Linehan, Harris, Brown, Neff, Downs, Kort, Jackman), tehnici (CFT, Somatic Experiencing, narativă).
# PRIORITATE:
Empatie, validare, ghidare reflexivă, adaptabilitate.
Context din ultimele introspecții (fișe/jurnal) completate de utilizator:
{{INITIAL_CONTEXT_SUMMARY_PLACEHOLDER}}---`;

    const CONDENSED_SYSTEM_INSTRUCTION_TEXT = `# ROL RECAPITULARE: PsihoGPT (Janet/Damian)
Continuă conversația ca ghid AI pentru introspecție, alternând stilurile Janet (empatic) și Damian (provocator) conform nevoii utilizatorului. Menține empatia, întrebările deschise, validarea și ghidează reflexiv. Obiectiv central: stima de sine, auto-compasiune, autonomie emoțională, reglarea emoției primare în timp real. Folosește istoricul recent de chat pentru context.
---`;

    const jurnalPromptsList = [
            {
                label: "🌡️ Explorează o emoție", id: "explorare_emotie",
                text: "🌡️ *Astăzi simt...*\nNumește emoția dominantă: ________________\n\n🔍 *Unde o simt în corp?*\nDescrie senzațiile (tensiune, greutate, pulsație etc.): ________________\n\n💭 *Ce gânduri vin cu această emoție?*\nNotează gândurile automate, chiar dacă par „exagerate”: ________________\n\n📚 *În ce context a apărut?*\nCe s-a întâmplat exact? Ce a declanșat-o? ________________\n\n💧 *Ce nevoie ar putea semnala?*\nDe ce are nevoie această parte din tine? Ce lipsește? ________________\n\n💌 *Dacă aș avea compasiune pentru mine acum...*\nCe mi-aș spune? Ce gest aș face pentru mine? ________________\n"
            },
            {
                label: "📝 Analizează o situație", id: "analiza_situatie",
                text: "Situația care mă preocupă este: ________________\n\nCe s-a întâmplat exact? (Fapte): ________________\nInterpretarea mea inițială (Gânduri automate): ________________\nEmoțiile principale: ________________\nO altă perspectivă (Reframing): ________________\nCe am învățat/pot învăța? (Lecții): ________________\n"
            },
            {
                label: "🗣️ Dialog Voce Critică", id: "dialog_voce_critica",
                text: "🗣️ *Vocea mea interioară îmi spune...*\n(\"Ești slab\", \"Nu faci destul\", \"O să fii respins\"...): ________________\n\n😔 *Când aud acest mesaj, mă simt...*\n(emoții și senzații fizice): ________________\n\n🧒 *Această voce seamănă cu...*\n(E o voce veche? un părinte? un profesor? un fost partener?): ________________\n\n🧠 *Ce nevoie neîmplinită e în spatele acestui mesaj?*\n(Poate recunoaștere, protecție, control, apartenență?): ________________\n\n🧘 *Răspunsul meu ca Adult Sănătos ar fi...*\n(\"Apreciez că vrei să mă protejezi, dar acum aleg altceva.\"): ________________\n"
            },
            {
                label: "💖 Recunoștință & Resurse", id: "recunostinta_resurse",
                text: "💖 *Astăzi aleg să văd ce e bun...*\nSunt recunoscător/oare pentru:\n1. ________________\n2. ________________\n3. ________________\n\n🌱 *O resursă interioară pe care mă pot baza astăzi este...*\n(ex: curaj, blândețe, claritate, capacitatea de a simți): ________________\n\n🛁 *Un gest de auto-îngrijire pe care îl pot face azi...*\n(chiar dacă e mic): ________________\n"
            },
            {
                label: "🌀 Ritual Reconstrucție Interioară", id: "ritual_reconstructie",
                text: `🧭 MASTER TEMPLATE – Scriere Terapeutică de Integrare și Vindecare\nDenumire: „Ritual de reconstrucție interioară”\nScop: Eliberare, Clarificare, Conținere, Înțelepciune, Direcție\n\nI. 🔍 INVITAȚIE LA AUTENTICITATE\n„Ce parte din mine cere atenție acum?”\n   * Ce trăiesc cu adevărat, fără filtru, fără poveste cosmetizată?\n   * Ce mi-e rușine să simt sau să recunosc chiar și în scris?\n   * Ce parte din mine se simte exclusă, neauzită, ignorată?\nRăspuns: ________________\n\nII. 🌊 CONTAINERE EMOȚIONALE\n„Ce simte corpul meu? Unde locuiește durerea?”\n   * Unde simt emoția în corp? Cum se manifestă? (Tensiune, înțepături, etc.)\n   * Dacă ar avea o culoare, formă, textură – cum ar arăta?\n   * Pot respira în acea zonă 3 minute, fără să fug?\nRăspuns: ________________\n\nIII. 🧠 DECODIFICARE NARATIVĂ\n„Ce poveste îmi spun? Este întreagă?”\n   * Ce narațiune inconștientă guvernează trăirea mea? (ex: „Nu sunt dorit.”)\n   * De unde vine această narațiune? Când am mai trăit ceva similar?\n   * Ce parte din mine (copil rănit, etc.) scrie această poveste?\nRăspuns: ________________\n\nIV. 🧩 INTEGRARE EXPLICATIVĂ\n„Ce înțeleg nou despre mine din această durere?”\n   * Ce nevoi profunde au fost ignorate sau negate?\n   * Ce am protejat, de fapt, prin reacția mea?\n   * Ce emoții contradictorii coexistă în mine și ce spun ele?\nRăspuns: ________________\n\nV. 🪞 COMPASIUNE ȘI BLÂNDEȚE\n„Cum pot fi părinte pentru mine acum?”\n   * Dacă mi-aș ține partea rănită în brațe, ce i-aș spune?\n   * Ce aș vrea să aud din partea unei figuri ideale de susținere?\n   * Pot lăsa iubirea, nu logica, să conducă acest moment?\nRăspuns: ________________\n\nVI. 🔮 RECONFIGURARE IDENTITARĂ\n„Cine sunt eu dincolo de această rană?”\n   * Ce adevăr despre mine rămâne valabil, chiar și în durere?\n   * Cine devin dacă învăț să stau cu mine în acest spațiu?\n   * Dacă aș fi un personaj simbolic acum, cine aș fi?\nRăspuns: ________________\n\nVII. ✍️ ACTUL SACRU DE ALEGERE\n„Ce aleg de azi, pentru mine?”\n   * Ce merită să las să plece?\n   * Ce îmi iau ca învățătură de încredere în viață?\n   * Ce ritual zilnic/mic obicei pot începe pentru a onora această transformare?\nRăspuns: ________________\n\nVIII. (Opțional) 📜 SCRISOARE-RITUAL\nScrie o scrisoare către... (persoana, partea din tine, situația):\nRăspuns: ________________\n`
            }
    ];


    // --- FUNCȚII UTILITARE ȘI DE UI ---
    function showTab(tabName) {
        console.log("[UI] Afișare tab:", tabName);
        document.getElementById('jurnalFormContainer').style.display = (tabName === 'jurnal' ? 'block' : 'none');
        document.getElementById('fisaFormContainer').style.display = (tabName === 'fisa' ? 'block' : 'none');
        document.getElementById('tabButtonJurnal').classList.toggle('active', tabName === 'jurnal');
        document.getElementById('tabButtonFisa').classList.toggle('active', tabName === 'fisa');
        const jurnalConfirm = document.getElementById('jurnalConfirmationMessage');
        const fisaConfirm = document.getElementById('fisaConfirmationMessage');
        if (jurnalConfirm) jurnalConfirm.style.display = 'none';
        if (fisaConfirm) fisaConfirm.style.display = 'none';
    }

    function updateFisaProgressBar() {
        const progress = document.getElementById('fisaProgress');
        if (progress && totalFisaSteps > 0) {
            progress.style.width = (currentFisaStep / totalFisaSteps) * 100 + '%';
        }
    }

    function fisaNextStep() {
        if (currentFisaStep < totalFisaSteps) {
            document.getElementById(`fisa-step-${currentFisaStep}`)?.classList.remove('form-step-active');
            currentFisaStep++;
            document.getElementById(`fisa-step-${currentFisaStep}`)?.classList.add('form-step-active');
            updateFisaProgressBar();
        }
    }

    function fisaPreviousStep() {
        if (currentFisaStep > 1) {
            document.getElementById(`fisa-step-${currentFisaStep}`)?.classList.remove('form-step-active');
            currentFisaStep--;
            document.getElementById(`fisa-step-${currentFisaStep}`)?.classList.add('form-step-active');
            updateFisaProgressBar();
        }
    }

    function initializeFisaFormFunctionality() {
        console.log("[INIT] Inițializare funcționalitate formular fișă.");
        const formSteps = document.querySelectorAll('form#fisaExercitiuForm div.question-card.form-step');
        if (formSteps.length > 0) {
            totalFisaSteps = formSteps.length;
            formSteps.forEach((step, index) => {
                step.classList.toggle('form-step-active', index === 0);
            });
            currentFisaStep = 1; // Asigură că începe de la primul pas
            updateFisaProgressBar();
        } else {
            totalFisaSteps = 0;
            console.warn("[INIT] Nu s-au găsit pași pentru formularul fișă.");
        }
        document.getElementById("fisaNextButton")?.addEventListener("click", fisaNextStep);
        document.getElementById("fisaPrevButton")?.addEventListener("click", fisaPreviousStep);
        document.getElementById("fisaAddButton")?.addEventListener("click", salveazaIntrospectieFisa);
    }

    function toggleActiveJurnalPrompt(show, promptData = null) {
        const box = document.getElementById('activeJurnalPromptBox');
        const titleEl = document.getElementById('activeJurnalPromptTitle');
        const contentEl = document.getElementById('activeJurnalPromptContent');
        const journalTextarea = document.getElementById("journalContent");

        if (show && promptData) {
            selectedJurnalPrompt = promptData;
            if (titleEl) titleEl.textContent = `Ghid activ: ${promptData.label}`;
            if (contentEl) contentEl.textContent = promptData.text;
            if (box) box.style.display = 'block';
            if (contentEl) contentEl.scrollTop = 0;

            if (journalTextarea && journalTextarea.value.trim() !== "" && promptData.id !== (selectedJurnalPrompt?.previousIdForClearCheck)) {
                if (confirm("Dorești să ștergi conținutul actual al jurnalului pentru a începe cu acest nou ghid?")) {
                   journalTextarea.value = "";
                }
            }
            if (selectedJurnalPrompt) selectedJurnalPrompt.previousIdForClearCheck = promptData.id;
        } else {
            selectedJurnalPrompt = null;
            if (box) box.style.display = 'none';
        }
    }

    window.hideActiveJurnalPromptManual = function() {
        const box = document.getElementById('activeJurnalPromptBox');
        if (box) box.style.display = 'none';
    }

    async function salveazaIntrospectieFisa() {
        console.log("[FISA_SAVE] Încercare salvare fișă.");
        const form = document.getElementById("fisaExercitiuForm");
        const confirmationMessage = document.getElementById('fisaConfirmationMessage');

        if (form && !form.checkValidity()) {
            form.reportValidity();
            const currentStepElement = form.querySelector('.form-step-active');
            const firstInvalidField = currentStepElement?.querySelector(':invalid:not(fieldset)');
            if (firstInvalidField) {
                firstInvalidField.focus();
                alert("Vă rugăm completați toate câmpurile obligatorii din pasul curent înainte de a salva.");
            } else {
                alert("Vă rugăm completați toate câmpurile obligatorii.");
            }
            return;
        }

        const continutFisa = {};
        if (form) {
            const formData = new FormData(form);
            formData.forEach((value, key) => { continutFisa[key] = value.trim(); });
        } else {
            console.error("[FISA_SAVE] Formularul 'fisaExercitiuForm' nu a fost găsit.");
            return;
        }

        const introspectieData = {
            ownerUid: currentUserId,
            type: 'fisa',
            timestampCreare: Timestamp.fromDate(new Date()),
            dateAfisare: new Date().toLocaleDateString("ro-RO", { day: '2-digit', month: '2-digit', year: 'numeric' }),
            continut: continutFisa
        };

        if (!introspectieData.ownerUid) {
            alert("Trebuie să fiți autentificat pentru a salva datele.");
            window.location.href = "login.html"; return;
        }

        const addButton = document.getElementById("fisaAddButton");
        let originalAddButtonText = "";
        if (addButton) {
            originalAddButtonText = addButton.textContent;
            addButton.textContent = "Se salvează și se generează...";
            addButton.disabled = true;
        }
        if (confirmationMessage) confirmationMessage.style.display = 'none';

        try {
            console.log("[FISA_SAVE] Salvare date fișă în Firestore...");
            const docRef = await addDoc(collection(db, "introspectii"), introspectieData);
            introspectieData.id = docRef.id;
            console.log("[FISA_SAVE] Fișă salvată cu ID:", docRef.id, ". Se generează feedback AI...");
            if (addButton) addButton.textContent = "Se generează AI...";

            const feedbackGenerat = await genereazaFeedbackPentruIntrospectie(introspectieData);
            console.log("[FISA_SAVE] Feedback AI generat:", feedbackGenerat ? 'DA' : 'NU', feedbackGenerat?.error ? 'CU EROARE' : 'FĂRĂ EROARE');

            const docSnapshot = await getDoc(docRef);
            if (docSnapshot.exists()) {
                afiseazaCardIntrospectie({ id: docSnapshot.id, ...docSnapshot.data() });
            } else {
                console.warn("[FISA_SAVE] Documentul nu a fost găsit imediat după salvare. Folosim date locale pentru afișare.");
                introspectieData.feedbackAI_history = feedbackGenerat && !feedbackGenerat.error ? [feedbackGenerat] : [];
                afiseazaCardIntrospectie(introspectieData);
            }

            if (form) {
                form.reset();
                currentFisaStep = 1;
                document.querySelectorAll('form#fisaExercitiuForm .form-step').forEach(step => step.classList.remove('form-step-active'));
                document.getElementById('fisa-step-1')?.classList.add('form-step-active');
                updateFisaProgressBar();
                console.log("[FISA_SAVE] Formular fișă resetat.");
            }

            if (confirmationMessage) {
                // ... (logica mesaj confirmare ca înainte) ...
            }
        } catch (error) {
            console.error("[FISA_SAVE] Eroare la salvarea fișei sau generare feedback:", error);
            // ... (logica mesaj eroare ca înainte) ...
        } finally {
            if (addButton) { /* ... */ }
        }
    }

    function initializeJurnalFormFunctionality() {
        console.log("[INIT] Inițializare funcționalitate formular jurnal.");
        // ... (codul tău existent, nemodificat)
        const promptsContainerEl = document.getElementById("reflectionPrompts");
        const journalTextarea = document.getElementById("journalContent");
        if (!promptsContainerEl || !journalTextarea) return;

        promptsContainerEl.innerHTML = '';
        jurnalPromptsList.forEach(prompt => {
            const button = document.createElement("button");
            button.textContent = prompt.label;
            button.className = "prompt-button";
            button.type = "button";
            button.title = "Afișează acest ghid și folosește-l ca referință";
            button.onclick = () => {
                toggleActiveJurnalPrompt(true, prompt);
                journalTextarea.focus();
            };
            promptsContainerEl.appendChild(button);
        });
        document.getElementById("saveJournalEntryButton")?.addEventListener("click", salveazaIntrospectieJurnal);
    }

    async function salveazaIntrospectieJurnal() {
        console.log("[JURNAL_SAVE] Încercare salvare jurnal.");
        // ... (codul tău existent, nemodificat, dar poți adăuga log-uri similare cu salveazaIntrospectieFisa)
        const journalTextarea = document.getElementById("journalContent");
        const journalTitleInput = document.getElementById("journalTitle");
        const confirmationMessage = document.getElementById('jurnalConfirmationMessage');

        if (!journalTextarea || journalTextarea.value.trim() === "") { /* ... */ return; }
        const tipPromptFolosit = selectedJurnalPrompt ? selectedJurnalPrompt.id : "prompt_personalizat";
        const continutJurnal = { /* ... */ };
        const introspectieData = { /* ... */ };
        if (!introspectieData.ownerUid) { /* ... */ return; }

        const saveButton = document.getElementById("saveJournalEntryButton"); /* ... */
        try {
            const docRef = await addDoc(collection(db, "introspectii"), introspectieData); /* ... */
            const parsedFeedback = await genereazaFeedbackPentruIntrospectie(introspectieData); /* ... */
            // ... (restul logicii de afișare și confirmare)
        } catch (error) { /* ... */ }
        finally { /* ... */ }
    }

    async function callGeminiAPI(promptText, modelToUse, generationConfigOptions = {}) {
        // ... (codul tău existent, nemodificat)
        if (!modelToUse) { /* ... */ return "EROARE: Model AI neinițializat."; }
        try { /* ... */ } catch (error) { /* ... */ }
    }
    function buildAdaptiveAIPromptFisa(introspectieData) { /* ... la fel ... */ return `...`;}
    function buildAdaptiveAIPromptJurnal(introspectieData) { /* ... la fel ... */ return `...`;}
    async function genereazaFeedbackPentruIntrospectie(introspectieData) { /* ... la fel ... */ }
    async function incarcaToateIntrospectiile(userId) { /* ... la fel, dar poate adaugi log dacă querySnapshot.empty ... */
        console.log(`[LOAD_DATA] Încărcare toate introspecțiile pentru user ID: ${userId}`);
        const container = document.getElementById("introspectiiCardContainer");
        if (!container || !userId) return;
        // ... (restul)
        if (querySnapshot.empty) {
            console.log("[LOAD_DATA] Nicio introspecție găsită.");
            container.innerHTML = "<p class='no-entries-message'>Nicio introspecție salvată.</p>";
        } else { /* ... */ }
    }
    function afiseazaIstoricFeedbackIntrospectie(containerEl, feedbackHistory) { /* ... la fel ... */ }
    function afiseazaCardIntrospectie(docData) { /* ... la fel ... */ }
    async function regenereazaFeedbackPentruIntrospectieCard(introspectieId) { /* ... la fel ... */ }
    async function stergeUltimulFeedbackIntrospectie(introspectieId) { /* ... la fel ... */ }
    async function stergeTotIstoriculFeedbackIntrospectie(introspectieId) { /* ... la fel ... */ }
    async function stergeIntrospectie(id, cardElement) { /* ... la fel ... */ }


    // --- FUNCȚII PENTRU CHAT ---
    function formatStreamingMessage(message) { /* ... la fel ... */ }
    function displayChatMessage(messageContent, role, thoughtsContent = null) { /* ... la fel ... */ }
    async function loadChatHistory(userId) { /* ... la fel ... */ }
    async function saveChatMessage(userId, messageObject) { /* ... la fel ... */ }

    async function getInitialContextSummary(userIdForContext) {
        let contextSummary = "REZUMAT DIN INTROSPECȚIILE ANTERIOARE (ULTIMELE 3):\n";
        if (!userIdForContext) {
            contextSummary += "Niciun utilizator specificat pentru context.\n";
            console.warn("[CONTEXT_SUMMARY] User ID lipsă pentru getInitialContextSummary.");
            return contextSummary;
        }
        try {
            console.log(`[CONTEXT_SUMMARY] Se încarcă introspecțiile pentru context pentru user: ${userIdForContext}`);
            const q = query(collection(db, "introspectii"), where("ownerUid", "==", userIdForContext), orderBy("timestampCreare", "desc"), limit(3));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                querySnapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    const entryDate = data.dateAfisare || (data.timestampCreare ? new Date(data.timestampCreare.toDate()).toLocaleDateString("ro-RO") : 'N/A');
                    if (data.type === 'fisa') {
                        contextSummary += ` - Fișă (${entryDate}): Situatia - ${(data.continut.situatie || "N/A").substring(0, 50)}... Ganduri - ${(data.continut.ganduri || "N/A").substring(0,50)}...\n`;
                    } else if (data.type === 'jurnal') {
                        contextSummary += ` - Jurnal (${entryDate}): Titlu - ${(data.continut.titluJurnal || "Fără titlu").substring(0,50)}... Text (primele cuvinte) - ${(data.continut.textJurnal || "N/A").substring(0,50)}...\n`;
                    }
                });
                 console.log(`[CONTEXT_SUMMARY] Context introspecții încărcat. Lungime sumar: ${contextSummary.length}`);
            } else {
                contextSummary += "Nicio introspecție recentă găsită.\n";
                console.log("[CONTEXT_SUMMARY] Nicio introspecție găsită pentru context.");
            }
        } catch (e) {
            console.error("[CONTEXT_SUMMARY] Eroare încărcare context introspecții:", e);
            contextSummary += "Eroare la încărcarea contextului introspecțiilor.\n";
        }
        return contextSummary;
    }


    async function initializeAndStartChatSession(userId, isInitialPageLoad = false) {
        console.log(`[CHAT_INIT] Inițializare sesiune chat. User ID: ${userId}, Este încărcare pagină UI: ${isInitialPageLoad}`);
        const chatStatus = document.getElementById("chatStatus");
        const sendButton = document.getElementById("sendChatMessageButton");

        if (sendButton) sendButton.disabled = true;
        if (chatStatus) chatStatus.textContent = "Inițializare chat AI...";
        if (!geminiModelChat) {
            console.error("[CHAT_INIT] Modelul AI Chat (geminiModelChat) nu este disponibil!");
            if (chatStatus) chatStatus.textContent = "EROARE: Model AI Chat indisponibil.";
            displayChatMessage("Serviciul de chat AI nu este disponibil (model neinițializat).", "AI-error", null);
            return null;
        }

        isChatInitialized = false;
        chatSession = null;

        const dynamicContextSummary = await getInitialContextSummary(userId);
        const systemInstructionForSession = FULL_SYSTEM_INSTRUCTION_TEXT_TEMPLATE.replace(
            "{{INITIAL_CONTEXT_SUMMARY_PLACEHOLDER}}",
            dynamicContextSummary
        );
        console.log("[CHAT_INIT] Prompt sistem COMPLET generat pentru această sesiune de inițializare.");

        let historyForGeminiAPI = [];
        if (messagesDivGlobalRef && isInitialPageLoad) {
            messagesDivGlobalRef.innerHTML = ''; // Golește UI doar la prima deschidere a chat-ului
            console.log("[CHAT_INIT] UI-ul mesajelor a fost golit pentru încărcare proaspătă.");
        }

        let fullLoadedHistoryFromDB = await loadChatHistory(userId);

        if (isInitialPageLoad) { // Afișează istoricul în UI doar la prima deschidere/refresh al chat-ului
            const displayHistory = fullLoadedHistoryFromDB.slice(-MAX_MESSAGES_TO_DISPLAY_ON_LOAD);
            displayHistory.forEach(msg => {
                const roleForDisplay = (msg.role === "AI" || msg.role === "model") ? "model" : "user";
                displayChatMessage(msg.content, roleForDisplay, msg.thoughts);
            });
            console.log(`[CHAT_INIT] Afișat în UI ${displayHistory.length} din ${fullLoadedHistoryFromDB.length} mesaje.`);
        }

        // Construiește istoricul pentru API (prompt sistem + istoric trunchiat din DB)
        const apiHistoryStartIndex = Math.max(0, fullLoadedHistoryFromDB.length - MAX_CHAT_HISTORY_FOR_API);
        const truncatedApiHistory = fullLoadedHistoryFromDB.slice(apiHistoryStartIndex);

        truncatedApiHistory.forEach(msg => {
            if (msg.content && msg.content.trim() !== "") {
                 historyForGeminiAPI.push({
                    role: (msg.role === "AI" || msg.role === "model") ? "model" : "user",
                    parts: [{ text: msg.content }]
                });
            }
        });
        console.log("[CHAT_INIT] Istoric formatat pentru API la inițializare (după system prompt):", historyForGeminiAPI.length, "mesaje.");

        try {
            const chatConfig = {
                history: [
                    { role: "user", parts: [{ text: systemInstructionForSession }] },
                    ...historyForGeminiAPI
                ],
                generationConfig: {
                    temperature: 0.75,
                    thinking_config: { include_thoughts: true }
                }
            };
            chatSession = geminiModelChat.startChat(chatConfig);
            console.log("[CHAT_INIT] Sesiune chat Gemini inițializată CU prompt sistem COMPLET și istoric DB trunchiat. Model:", GEMINI_MODEL_NAME_CHAT);

            if (chatStatus) chatStatus.textContent = "Janet - Psihoterapeut Cognitiv-Comportamental Integrativ";

            if (fullLoadedHistoryFromDB.length === 0) { // Doar dacă NU există istoric în DB, trimite salutul
                console.log("[CHAT_INIT_GREETING] Niciun istoric în DB, se trimite salutul AI.");
                const aiGreeting = "Salut! Eu sunt PsihoGPT. Bine ai venit! Cum te simți astăzi? ✨";
                const firstAiResponseResult = await chatSession.sendMessageStream(aiGreeting);
                const firstAiResponseStream = firstAiResponseResult.stream;
                let firstAiText = ""; let firstAiThoughts = "";

                const firstAiMessageElement = document.createElement("div");
                firstAiMessageElement.classList.add("chat-message", "ai-message");
                firstAiMessageElement.style.whiteSpace = "pre-wrap";
                // Adaugă span-ul pentru textul principal aici, înainte de a-l popula
                const mainGreetingSpan = document.createElement('span');
                mainGreetingSpan.className = 'main-answer-text';
                firstAiMessageElement.appendChild(mainGreetingSpan);
                if (messagesDivGlobalRef) messagesDivGlobalRef.appendChild(firstAiMessageElement);


                for await (const chunk of firstAiResponseStream) {
                    console.log("[CHAT_INIT_GREETING] CHUNK SALUT:", JSON.stringify(chunk, null, 2).substring(0, 200) + "...");
                    const candidate = chunk.candidates?.[0];
                    if (candidate?.content?.parts) {
                        for (const part of candidate.content.parts) {
                            if (part && typeof part.text === 'string') {
                                if (part.thought === true) {
                                    firstAiThoughts += part.text + "\n";
                                } else {
                                    firstAiText += part.text;
                                    // Afișare simplă, fără typewriter pentru salut, direct în span
                                    mainGreetingSpan.innerHTML = formatStreamingMessage(firstAiText);
                                }
                            }
                        }
                    }
                    if (messagesDivGlobalRef) messagesDivGlobalRef.scrollTop = messagesDivGlobalRef.scrollHeight;
                    if (candidate?.finishReason) {
                        console.log("[CHAT_INIT_GREETING] FinishReason salut:", candidate.finishReason);
                        break;
                    }
                }

                if (firstAiText.trim() === "") { // Dacă din diverse motive nu s-a primit text
                    firstAiText = aiGreeting.split("✨")[0].trim(); // Folosește o parte din salutul default
                    mainGreetingSpan.innerHTML = formatStreamingMessage(firstAiText);
                }


                if (firstAiThoughts.trim() !== "") {
                    console.log("[CHAT_INIT_GREETING] Adăugare thoughts la salut în UI.");
                    const thoughtsDetails = document.createElement("details");
                    thoughtsDetails.className = "ai-thoughts-details";
                    thoughtsDetails.innerHTML = `
                        <summary>Proces de gândire (Salut)</summary>
                        <pre class="ai-thoughts-content">${firstAiThoughts.trim().replace(/</g,"<").replace(/>/g,">")}</pre>
                    `;
                    firstAiMessageElement.insertBefore(thoughtsDetails, mainGreetingSpan);
                }
                if (messagesDivGlobalRef) messagesDivGlobalRef.scrollTop = messagesDivGlobalRef.scrollHeight;

                await saveChatMessage(userId, { role: "model", content: firstAiText, thoughts: firstAiThoughts.trim() || null, error: false, timestamp: new Date().toISOString() });
                console.log("[CHAT_INIT_GREETING] Salut AI salvat.");
            }
            isChatInitialized = true;
            if (sendButton) sendButton.disabled = false;
            console.log("[CHAT_INIT] Sesiune chat AI inițializată și gata.");

        } catch (initError) {
            console.error("[CHAT_INIT] Eroare MAJORĂ la inițializarea sesiunii de chat Gemini:", initError, initError.stack);
            if (chatStatus) chatStatus.textContent = "Eroare critică AI Chat.";
            displayChatMessage(`Problemă tehnică gravă la pornirea chat-ului: ${initError.message}. Verificați consola.`, "AI-error", null);
            isChatInitialized = false; chatSession = null;
            if (sendButton) sendButton.disabled = true;
            return null;
        }
        return chatSession;
    }


    async function handleSendChatMessage() {
        console.log("handleSendChatMessage: Funcție apelată.");
        const chatInput = document.getElementById("chatInput");
        const sendButton = document.getElementById("sendChatMessageButton");
        const chatStatus = document.getElementById("chatStatus");
        const messagesDiv = messagesDivGlobalRef;

        if (!chatInput || !sendButton || !chatStatus || !messagesDiv) {
            console.error("[HANDLE_SEND] Eroare critică - Elementele HTML esențiale lipsesc.");
            return;
        }

        const messageText = chatInput.value.trim();
        console.log("→ [USER_MSG_SEND] Mesaj utilizator pentru trimitere:", JSON.stringify(messageText));
        if (!messageText) {
            console.log("→ [USER_MSG_SEND] Mesaj utilizator gol, nu se procesează.");
            return;
        }

        displayChatMessage(messageText, "user", null);

        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error("‼️ [AUTH_ERROR] Utilizatorul nu este autentificat în handleSendChatMessage.");
            if (chatStatus) chatStatus.textContent = "Eroare: utilizator neautentificat.";
            return;
        }

        try {
            await saveChatMessage(currentUser.uid, { role: "user", content: messageText, timestamp: new Date().toISOString() });
            console.log("→ [DB_SAVE_USER] Mesajul utilizatorului a fost salvat în Firestore.");
        } catch (firestoreErr) {
            console.error("‼️ [DB_ERROR] Eroare la salvarea mesajului utilizatorului în Firestore:", firestoreErr);
            if (chatStatus) chatStatus.textContent = "Eroare salvare mesaj utilizator.";
        }

        chatInput.value = "";
        sendButton.disabled = true;
        if (chatStatus) chatStatus.textContent = "PsihoGPT analizează și tastează...";

        const aiMessageElement = document.createElement("div");
        aiMessageElement.classList.add("chat-message", "ai-message");
        aiMessageElement.style.whiteSpace = "pre-wrap";
        messagesDiv.appendChild(aiMessageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        let fullAiResponseText = "";
        let collectedThoughtsThisTurn = "";
        let anErrorOccurredInStream = false;
        let apiErrorMessageFromStream = "";

        const TYPING_CHUNK_SIZE = IS_MOBILE_DEVICE ? 50 : 30;
        const TYPING_CHUNK_DELAY_MS = IS_MOBILE_DEVICE ? 30 : 20;
        console.log(`[TYPEWRITER_CONFIG] Mobil: ${IS_MOBILE_DEVICE}, ChunkSize: ${TYPING_CHUNK_SIZE}, Delay: ${TYPING_CHUNK_DELAY_MS}`);

        try {
            console.log("[CHAT_SESSION_REINIT_HSM] Se pregătește re-inițializarea sesiunii (cu prompt condensat).");

            let currentFullHistoryFromDB = await loadChatHistory(currentUser.uid);
            let historyForNewApiSession = [];
            if (currentFullHistoryFromDB.length > 0) {
                const historyBeforeCurrentMessage = currentFullHistoryFromDB.slice(0, -1); // Exclude ultimul mesaj (cel trimis acum de user)
                const startIndex = Math.max(0, historyBeforeCurrentMessage.length - MAX_CHAT_HISTORY_FOR_API);
                const truncatedHistory = historyBeforeCurrentMessage.slice(startIndex);
                truncatedHistory.forEach(msg => {
                    if (msg.content && msg.content.trim() !== "") {
                        historyForNewApiSession.push({
                            role: (msg.role === "AI" || msg.role === "model") ? "model" : "user",
                            parts: [{ text: msg.content }]
                        });
                    }
                });
            }
            console.log(`[CHAT_SESSION_REINIT_HSM] Istoric trunchiat pentru API: ${historyForNewApiSession.length} mesaje.`);

            // Folosim promptul condensat pentru reinițializările din handleSendChatMessage
            const systemPromptObject = { role: "user", parts: [{ text: CONDENSED_SYSTEM_INSTRUCTION_TEXT }] };

            const newChatConfig = {
                history: [systemPromptObject, ...historyForNewApiSession],
                generationConfig: {
                    temperature: 0.75,
                    thinking_config: { include_thoughts: true }
                }
            };

            if (!geminiModelChat) throw new Error("geminiModelChat nu este definit pentru re-inițializare în handleSendChatMessage.");
            chatSession = geminiModelChat.startChat(newChatConfig);
            isChatInitialized = true;
            console.log("[CHAT_SESSION_REINIT_HSM] Sesiune chat re-inițializată cu prompt CONDENSAT și istoric trunchiat.");

            console.log("→ [AI_STREAM_HSM] Trimitere la sendMessageStream:", JSON.stringify(messageText));
            const result = await chatSession.sendMessageStream(messageText);
            const stream = result.stream;
            console.log("→ [AI_STREAM_HSM] Stream primit. Începe procesarea chunk-urilor.");

            for await (const chunk of stream) {
                console.log("╔══════════ CHUNK (handleSend) ══════════╗");
                console.log(JSON.stringify(chunk, null, 2).substring(0, 500) + "...");
                console.log("╚══════════════════════════════════════╝");

                if (chunk.promptFeedback?.blockReason) {
                    apiErrorMessageFromStream = `Mesaj/Răspuns blocat (Motiv Prompt: ${chunk.promptFeedback.blockReason}). Detalii: ${JSON.stringify(chunk.promptFeedback.blockReasonDetail || 'N/A')}`;
                    anErrorOccurredInStream = true;
                    console.warn("[AI_STREAM] Stream blocat (promptFeedback):", apiErrorMessageFromStream);
                    break;
                }
                const candidate = chunk.candidates?.[0];
                if (!candidate) {
                    console.warn("  [AI_STREAM_CHUNK] Candidate inexistent.");
                    continue;
                }

                if (candidate.content?.parts && Array.isArray(candidate.content.parts)) {
                    for (const part of candidate.content.parts) {
                        if (part && typeof part.text === "string") {
                            if (part.thought === true) {
                                console.log("      THOUGHT Part:", JSON.stringify(part.text.substring(0, 50) + "..."));
                                collectedThoughtsThisTurn += part.text + "\n";
                            } else {
                                console.log("      MAIN ANSWER Part:", JSON.stringify(part.text.substring(0, 50) + "..."));
                                fullAiResponseText += part.text; // Acumulăm tot textul principal întâi
                            }
                        }
                    }
                }
                if (candidate.finishReason) {
                    console.log("  [AI_STREAM_CHUNK] finishReason:", candidate.finishReason);
                    const errorReasons = ["SAFETY", "RECITATION", "OTHER"];
                    if (errorReasons.includes(candidate.finishReason)) {
                        apiErrorMessageFromStream = `Generare oprită (API Motiv: ${candidate.finishReason}). Detalii: ${JSON.stringify(candidate.safetyRatings || 'N/A')}`;
                        anErrorOccurredInStream = true;
                    }
                    break;
                }
                if (anErrorOccurredInStream) break;
            }
            console.log("[AI_STREAM] Bucla principală a stream-ului s-a încheiat.");

            aiMessageElement.innerHTML = '';
            let mainAnswerSpan = document.createElement('span');
            mainAnswerSpan.className = 'main-answer-text';

            if (anErrorOccurredInStream) {
                const finalErrorMessage = apiErrorMessageFromStream || "Eroare generare răspuns.";
                aiMessageElement.innerHTML = formatStreamingMessage(finalErrorMessage);
                aiMessageElement.classList.add("ai-error");
                fullAiResponseText = finalErrorMessage;
                console.warn("[AI_DISPLAY] Eroare din stream afișată:", finalErrorMessage);
            } else {
                if (collectedThoughtsThisTurn.trim() !== "") {
                    const thoughtsDetails = document.createElement("details");
                    thoughtsDetails.className = "ai-thoughts-details";
                    thoughtsDetails.innerHTML = `<summary>Procesul de gândire al PsihoGPT</summary><pre class="ai-thoughts-content">${collectedThoughtsThisTurn.trim().replace(/</g,"<").replace(/>/g,">")}</pre>`;
                    aiMessageElement.appendChild(thoughtsDetails);
                    console.log("[AI_DISPLAY] Gândurile AI adăugate în DOM.");
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                    await new Promise(resolve => setTimeout(resolve, IS_MOBILE_DEVICE ? 50 : 20));
                }
                aiMessageElement.appendChild(mainAnswerSpan);

                if (fullAiResponseText.trim() !== "") {
                    console.log("[AI_DISPLAY] Începe efectul typewriter pentru răspunsul principal...");
                    let formattedHTML = formatStreamingMessage(fullAiResponseText);
                    let currentIndex = 0;
                    console.log("[AI_DISPLAY] Text principal pre-formatat pentru typewriter (primele 100 char):", formattedHTML.substring(0,100));
                    while (currentIndex < formattedHTML.length) {
                        const nextChunkEnd = Math.min(currentIndex + TYPING_CHUNK_SIZE, formattedHTML.length);
                        mainAnswerSpan.innerHTML = formattedHTML.substring(0, nextChunkEnd);
                        messagesDiv.scrollTop = messagesDiv.scrollHeight;
                        await new Promise(resolve => setTimeout(resolve, TYPING_CHUNK_DELAY_MS));
                        currentIndex = nextChunkEnd;
                    }
                    mainAnswerSpan.innerHTML = formattedHTML; // Asigură afișarea completă
                    console.log("[AI_DISPLAY] Efectul typewriter pentru răspuns finalizat.");
                } else if (!collectedThoughtsThisTurn.trim()) {
                    const fallbackMsg = "Nu am putut genera un răspuns sau răspunsul a fost gol.";
                    mainAnswerSpan.innerHTML = formatStreamingMessage(fallbackMsg);
                    fullAiResponseText = fallbackMsg;
                    console.log("[AI_DISPLAY] AFIȘAT FALLBACK (text principal gol, fără gânduri).");
                } else {
                     console.log("[AI_DISPLAY] Text principal gol, dar există gânduri. Nu se afișează fallback pentru textul principal.");
                }
            }
        } catch (err) {
            const criticalErrorMsg = `Eroare CRITICĂ în handleSendChatMessage: ${err.message}`;
            console.error("‼️ [CRITICAL_ERROR_HSM] Catch principal:", err, criticalErrorMsg);
            aiMessageElement.innerHTML = formatStreamingMessage(criticalErrorMsg);
            aiMessageElement.classList.add("ai-error");
            fullAiResponseText = criticalErrorMsg;
            anErrorOccurredInStream = true;
        } finally {
            console.log("------------------------------------------------------");
            console.log("[FINALLY_HSM] Bloc finally atins.");
            console.log("  Final fullAiResponseText:", JSON.stringify(fullAiResponseText.substring(0,100) + "..."));
            console.log("  Final collectedThoughtsThisTurn:", JSON.stringify(collectedThoughtsThisTurn.substring(0,100) + "..."));
            console.log("  Final anErrorOccurredInStream:", anErrorOccurredInStream);

            messagesDiv.scrollTop = messagesDiv.scrollHeight;

            if (currentUser) {
                try {
                    await saveChatMessage(currentUser.uid, {
                        role: "model",
                        content: fullAiResponseText.trim(),
                        thoughts: collectedThoughtsThisTurn.trim() || null,
                        error: anErrorOccurredInStream || (fullAiResponseText.toLowerCase().includes("eroare") && !apiErrorMessageFromStream && !collectedThoughtsThisTurn.trim()),
                        timestamp: new Date().toISOString()
                    });
                    console.log("→ [DB_SAVE_MODEL_HSM] Răspuns/Eroare AI (cu thoughts) salvat(ă).");
                } catch (firestoreSaveErr) {
                     console.error("‼️ [DB_ERROR_HSM] Salvare răspuns model eșuată:", firestoreSaveErr);
                    if (chatStatus) chatStatus.textContent = "Eroare salvare răspuns AI.";
                }
            }

            if (chatStatus) {
                 if (anErrorOccurredInStream || fullAiResponseText.toLowerCase().includes("eroare critică")) {
                    chatStatus.textContent = "Eroare comunicare AI.";
                } else if (fullAiResponseText.trim() === "" && collectedThoughtsThisTurn.trim() === "") {
                    chatStatus.textContent = "Problemă generare răspuns.";
                } else {
                    chatStatus.textContent = "Janet - Psihoterapeut Cognitiv-Comportamental Integrativ";
                }
            }

            if (geminiModelChat && isChatInitialized && sendButton) {
                sendButton.disabled = false;
            } else if (sendButton) {
                sendButton.disabled = true;
                if (chatStatus && (!isChatInitialized || !geminiModelChat)) {
                     chatStatus.textContent = "Chat AI indisponibil.";
                }
            }
            if (chatInput) chatInput.focus();
            console.log("[FINALLY_HSM] Execuție handleSendChatMessage completă.");
        }
    }

    async function handleToggleChat() {
        console.log("[UI_CHAT_TOGGLE] Apel handleToggleChat.");
        const user = auth.currentUser;
        if (!user) {
            alert("Autentificare necesară pentru a folosi chat-ul.");
            window.location.href = "login.html";
            return;
        }

        const chatContainer = document.getElementById("chatContainer");
        const originalToggleButton = document.getElementById("toggleChatButton");
        const minimizeButtonInHeader = document.getElementById("minimizeChatButton");
        const sendButton = document.getElementById("sendChatMessageButton");
        const chatInput = document.getElementById("chatInput");

        if (!chatContainer || !originalToggleButton || !minimizeButtonInHeader || !sendButton || !chatInput) {
            console.error("[UI_CHAT_TOGGLE] Eroare: Unul sau mai multe elemente HTML esențiale pentru chat nu au fost găsite!");
            return;
        }

        const isChatCurrentlyOpen = chatContainer.style.display === "flex";
        console.log("[UI_CHAT_TOGGLE] Stare chat curentă (deschis):", isChatCurrentlyOpen);

        if (isChatCurrentlyOpen) {
            chatContainer.style.display = "none";
            originalToggleButton.style.display = 'flex';
            // originalToggleButton.innerHTML = "💬"; // Nu mai schimbăm iconița aici
            console.log("[UI_CHAT_TOGGLE] Chat închis.");
        } else {
            chatContainer.style.display = "flex";
            originalToggleButton.style.display = 'none';
            console.log("[UI_CHAT_TOGGLE] Chat deschis. Verificare inițializare sesiune...");

            // Inițializează sesiunea doar dacă nu este deja inițializată SAU dacă sesiunea a fost resetată (chatSession e null)
            // Flag-ul isInitialPageLoad va fi true doar la prima deschidere efectivă a chatului per încărcare de pagină
            if (!isChatInitialized || !chatSession) {
                console.log("[UI_CHAT_TOGGLE] Sesiune neinițializată sau resetată, se apelează initializeAndStartChatSession CU isInitialPageLoad = true.");
                const sessionOK = await initializeAndStartChatSession(user.uid, true); // Aici trimitem true
                if (sendButton) sendButton.disabled = !sessionOK;
                console.log("[UI_CHAT_TOGGLE] Rezultat inițializare sesiune:", sessionOK ? "OK" : "EȘUAT");
            } else if (geminiModelChat) { // Sesiunea e deja inițializată și modelul e disponibil
                sendButton.disabled = false;
                console.log("[UI_CHAT_TOGGLE] Sesiune deja inițializată, buton send activat.");
            } else { // Model AI indisponibil
                sendButton.disabled = true;
                console.warn("[UI_CHAT_TOGGLE] Model AI indisponibil, buton send dezactivat.");
            }

            if (chatInput) {
                chatInput.focus();
            }
        }
    }

    async function discussFisaWithChat(fisaData) {
        // ... (La fel ca înainte, dar asigură-te că initializeAndStartChatSession e apelat cu isInitialPageLoad = true
        //      dacă chat-ul nu este deja deschis și inițializat)
        console.log("[DISCUSS_FISA] Se încearcă discutarea fișei:", fisaData?.continut?.situatie.substring(0,30) + "...");
        const user = auth.currentUser;
        if (!user) { alert("Autentificare necesară."); window.location.href = "login.html"; return; }
        const chatContainer = document.getElementById("chatContainer");
        if (!chatContainer || chatContainer.style.display === "none" || chatContainer.style.display === "") {
            console.log("[DISCUSS_FISA] Chat-ul nu este deschis, se deschide și se inițializează...");
            await handleToggleChat(); // Acesta va apela initializeAndStartChatSession cu isInitialPageLoad = true dacă e cazul
        }

        // O mică pauză pentru a permite inițializării (dacă a fost cazul) să se finalizeze
        if (!chatSession || !isChatInitialized) {
            console.log("[DISCUSS_FISA] Așteptare scurtă pentru inițializarea chat-ului...");
            await new Promise(resolve => setTimeout(resolve, 600));
        }

        if (!chatSession || !isChatInitialized) {
            console.error("[DISCUSS_FISA] EROARE: Sesiunea de chat nu este pregătită nici după așteptare.");
            displayChatMessage("Eroare: Sesiunea de chat nu e pregătită pentru a discuta fișa. Încearcă din nou.", "AI-error", null);
            return;
        }
        // ... (restul logicii de construire a mesajului din fișă și apel handleSendChatMessage)
        const c = fisaData.continut;
        let message = `Salut PsihoGPT,\n\nAș dori să discutăm despre următoarea fișă de monitorizare (datată ${fisaData.dateAfisare || 'N/A'}):\n\n`;
        message += `**Situația:** ${c.situatie || 'N/A'}\n**Gânduri automate:** ${c.ganduri || 'N/A'}\n**Emoții:** ${c.emotii || 'N/A'}\n\n`;
        // ... (adaugă restul câmpurilor din fișă în `message`)
        message += "Ce întrebări sau reflecții ai pentru mine pe baza acestei fișe?";

        const chatInput = document.getElementById("chatInput");
        if(chatInput) {
            chatInput.value = message;
            console.log("[DISCUSS_FISA] Se trimite fișa la chat...");
            handleSendChatMessage(); // Va folosi sesiunea (posibil proaspăt reinițializată de handleToggleChat)
        } else {
            console.error("[DISCUSS_FISA] Elementul chatInput nu a fost găsit.");
        }
    }


    // --- FUNCȚIA PRINCIPALĂ DE INTRARE (ONLOAD) ---
    window.onload = function () {
        console.log("DOM complet încărcat. Se inițializează aplicația...");
        messagesDivGlobalRef = document.getElementById("chatMessages");
        if (!messagesDivGlobalRef) console.error("CRITICAL: #chatMessages negăsit la onload!");

        document.getElementById('tabButtonJurnal').addEventListener('click', () => showTab('jurnal'));
        document.getElementById('tabButtonFisa').addEventListener('click', () => showTab('fisa'));
        showTab('jurnal');

        onAuthStateChanged(auth, async (user) => {
            console.log("[AUTH_CHANGE] Starea de autentificare s-a schimbat. User:", user ? user.uid : "NULL");
            currentUserId = user ? user.uid : null;
            const mainContentArea = document.getElementById('mainContentArea');
            const cardsContainerArea = document.getElementById('cardsContainerArea');
            const toggleChatBtn = document.getElementById("toggleChatButton");
            const chatContainer = document.getElementById("chatContainer");
            const chatStatus = document.getElementById("chatStatus");

            if (user) {
                console.log(`[AUTH_CHANGE] Utilizator AUTENTIFICAT: ${user.uid}.`);
                if (mainContentArea) mainContentArea.style.display = '';
                if (cardsContainerArea) cardsContainerArea.style.display = '';
                if (toggleChatBtn) toggleChatBtn.style.display = 'flex';

                initializeFisaFormFunctionality();
                initializeJurnalFormFunctionality();

                if (!dataAlreadyLoaded) {
                    console.log("[AUTH_CHANGE] Se încarcă datele inițiale (introspecții).");
                    await incarcaToateIntrospectiile(user.uid);
                    dataAlreadyLoaded = true;
                }
                // Chat-ul se va inițializa la primul click pe toggleChatButton sau la 'Discută Fișa'
            } else {
                console.log("[AUTH_CHANGE] Utilizator NEAUTENTIFICAT. Redirecționare...");
                if (mainContentArea) mainContentArea.style.display = 'none';
                if (cardsContainerArea) cardsContainerArea.style.display = 'none';
                if (toggleChatBtn) toggleChatBtn.style.display = 'none';
                if (chatContainer) chatContainer.style.display = 'none';
                if (chatStatus) chatStatus.textContent = "Chatul AI nu este activ.";

                isChatInitialized = false;
                chatSession = null;
                if (messagesDivGlobalRef) messagesDivGlobalRef.innerHTML = "";

                window.location.href = "login.html";
            }
        });

        document.getElementById("minimizeChatButton")?.addEventListener("click", handleToggleChat);
        document.getElementById("toggleChatButton")?.addEventListener("click", handleToggleChat);
        document.getElementById("sendChatMessageButton")?.addEventListener("click", () => {
            console.log("[UI_EVENT] Buton Send apăsat.");
            handleSendChatMessage();
        });
        document.getElementById("chatInput")?.addEventListener("keypress", function(event) {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                console.log("[UI_EVENT] Enter apăsat în chatInput, se trimite mesajul.");
                handleSendChatMessage();
            }
        });
        console.log("Aplicație inițializată și event listeners atașați.");
    };
