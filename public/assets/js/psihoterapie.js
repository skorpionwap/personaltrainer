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
    let messagesDivGlobalRef = null; // Inițializează cu null

    const IS_MOBILE_DEVICE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    console.log("[DEVICE_CHECK] Este dispozitiv mobil:", IS_MOBILE_DEVICE);

    const MAX_CHAT_HISTORY_FOR_API = 10; // Numărul de mesaje user/model din istoric de trimis la API
    const MAX_MESSAGES_TO_DISPLAY_ON_LOAD = 30; // Numărul de mesaje din istoric de afișat în UI la încărcare

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
Empatie, validare, ghidare reflexivă, adaptabilitate.`;

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

    // -----------------------------------------------------------------
    // DEFINIȚIILE FUNCȚIILOR
    // -----------------------------------------------------------------

    function showTab(tabName) {
        document.getElementById('jurnalFormContainer').style.display = (tabName === 'jurnal' ? 'block' : 'none');
        document.getElementById('fisaFormContainer').style.display = (tabName === 'fisa' ? 'block' : 'none');
        document.getElementById('tabButtonJurnal').classList.toggle('active', tabName === 'jurnal');
        document.getElementById('tabButtonFisa').classList.toggle('active', tabName === 'fisa');
        document.getElementById('jurnalConfirmationMessage').style.display = 'none';
        document.getElementById('fisaConfirmationMessage').style.display = 'none';
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
        const formSteps = document.querySelectorAll('form#fisaExercitiuForm div.question-card.form-step');
        if (formSteps.length > 0) {
            totalFisaSteps = formSteps.length;
            formSteps.forEach((step, index) => {
                step.classList.toggle('form-step-active', index === 0);
            });
            currentFisaStep = 1;
            updateFisaProgressBar();
        } else {
            totalFisaSteps = 0;
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
            if(titleEl) titleEl.textContent = `Ghid activ: ${promptData.label}`;
            if(contentEl) contentEl.textContent = promptData.text;
            if(box) box.style.display = 'block';
            if (contentEl) contentEl.scrollTop = 0;
            
            if (journalTextarea && journalTextarea.value.trim() !== "" && promptData.id !== (selectedJurnalPrompt?.previousIdForClearCheck)) {
                if (confirm("Dorești să ștergi conținutul actual al jurnalului pentru a începe cu acest nou ghid?")) {
                   journalTextarea.value = "";
                }
            }
            if(selectedJurnalPrompt) selectedJurnalPrompt.previousIdForClearCheck = promptData.id;
        } else {
            selectedJurnalPrompt = null;
            if(box) box.style.display = 'none';
        }
    }

    window.hideActiveJurnalPromptManual = function() { // Rămâne globală pentru onclick din HTML
        const box = document.getElementById('activeJurnalPromptBox');
        if(box) box.style.display = 'none';
    }

       async function salveazaIntrospectieFisa() {
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
            console.error("Formularul 'fisaExercitiuForm' nu a fost găsit.");
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
            const docRef = await addDoc(collection(db, "introspectii"), introspectieData);
            introspectieData.id = docRef.id; // Adaugă ID-ul pentru generarea feedback-ului
            if (addButton) addButton.textContent = "Se generează AI...";

            const feedbackGenerat = await genereazaFeedbackPentruIntrospectie(introspectieData);
            
            const docSnapshot = await getDoc(docRef); // Re-fetch pentru a avea și feedback-ul salvat
            if (docSnapshot.exists()) {
                afiseazaCardIntrospectie({ id: docSnapshot.id, ...docSnapshot.data() });
            } else {
                // Fallback dacă doc-ul nu e imediat vizibil (puțin probabil)
                introspectieData.feedbackAI_history = feedbackGenerat && !feedbackGenerat.error ? [feedbackGenerat] : [];
                afiseazaCardIntrospectie(introspectieData);
            }

            if (form) {
                form.reset(); currentFisaStep = 1;
                form.querySelectorAll('.form-step').forEach(step => step.classList.remove('form-step-active'));
                const firstStepEl = document.getElementById('fisa-step-1');
                if (firstStepEl) firstStepEl.classList.add('form-step-active');
                updateFisaProgressBar();
            }

            if (confirmationMessage) {
                if (feedbackGenerat && !feedbackGenerat.error && !feedbackGenerat.error_parsing) {
                    confirmationMessage.textContent = 'Fișa a fost salvată și feedback-ul AI generat cu succes!';
                    confirmationMessage.className = 'confirmation-message success';
                } else if (feedbackGenerat && (feedbackGenerat.error || feedbackGenerat.error_parsing)) {
                    confirmationMessage.textContent = `Fișa salvată. Feedback AI: ${feedbackGenerat.rawText || 'Problemă la generare/parsare.'}`;
                    confirmationMessage.className = (feedbackGenerat.rawText && feedbackGenerat.rawText.toLowerCase().includes("limit")) ? 'confirmation-message warning' : 'confirmation-message error';
                } else {
                    confirmationMessage.textContent = 'Fișa salvată, dar feedback-ul AI nu a putut fi generat/procesat.';
                    confirmationMessage.className = 'confirmation-message error';
                }
                confirmationMessage.style.display = 'block';
                setTimeout(() => { if (confirmationMessage) confirmationMessage.style.display = 'none'; }, 9000);
            }
        } catch (error) {
            console.error("Eroare la salvarea fișei sau generare feedback:", error);
            if (confirmationMessage) {
                confirmationMessage.textContent = 'Eroare la salvarea fișei. Încercați din nou.';
                confirmationMessage.className = 'confirmation-message error';
                confirmationMessage.style.display = 'block';
            }
        } finally {
            if (addButton) {
                addButton.textContent = originalAddButtonText;
                addButton.disabled = false;
            }
        }
    }

    function initializeJurnalFormFunctionality() {
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
        const journalTextarea = document.getElementById("journalContent");
        const journalTitleInput = document.getElementById("journalTitle");
        const confirmationMessage = document.getElementById('jurnalConfirmationMessage');

        if (!journalTextarea || journalTextarea.value.trim() === "") {
            alert("Vă rugăm să scrieți ceva în jurnal înainte de a salva.");
            return;
        }

        const tipPromptFolosit = selectedJurnalPrompt ? selectedJurnalPrompt.id : "prompt_personalizat";

        const continutJurnal = {
            titluJurnal: (journalTitleInput?.value.trim() !== "") ? journalTitleInput.value.trim() : `Intrare din ${new Date().toLocaleDateString("ro-RO")}`,
            textJurnal: journalTextarea.value,
            promptUtilizatJurnal: tipPromptFolosit
        };

        const introspectieData = {
            ownerUid: currentUserId,
            type: 'jurnal',
            timestampCreare: Timestamp.fromDate(new Date()),
            dateAfisare: new Date().toLocaleDateString("ro-RO", { day: '2-digit', month: '2-digit', year: 'numeric' }),
            continut: continutJurnal
        };

        if (!introspectieData.ownerUid) {
            alert("Trebuie să fiți autentificat pentru a salva datele.");
            window.location.href = "login.html"; return;
        }

        const saveButton = document.getElementById("saveJournalEntryButton");
        const originalButtonText = saveButton.textContent;
        saveButton.textContent = "Se salvează..."; saveButton.disabled = true;
        if(confirmationMessage) confirmationMessage.style.display = 'none';

        try {
            const docRef = await addDoc(collection(db, "introspectii"), introspectieData);
            introspectieData.id = docRef.id;
            saveButton.textContent = "Se generează AI...";

            const parsedFeedback = await genereazaFeedbackPentruIntrospectie(introspectieData);

            const docSnapshot = await getDoc(docRef);
            if (docSnapshot.exists()) {
                afiseazaCardIntrospectie({ id: docSnapshot.id, ...docSnapshot.data() });
            } else {
                introspectieData.feedbackAI_history = parsedFeedback && !parsedFeedback.error ? [parsedFeedback] : [];
                afiseazaCardIntrospectie(introspectieData);
            }

            journalTextarea.value = "";
            if (journalTitleInput) journalTitleInput.value = "";
            toggleActiveJurnalPrompt(false); // Ascunde ghidul activ
            if(selectedJurnalPrompt) selectedJurnalPrompt.previousIdForClearCheck = null;

            if(confirmationMessage) {
                confirmationMessage.textContent = parsedFeedback.error ? `Intrare salvată. Feedback AI: ${parsedFeedback.rawText}` : 'Intrare salvată și feedback AI generat!';
                confirmationMessage.className = `confirmation-message ${parsedFeedback.error ? 'error' : 'success'}`;
                confirmationMessage.style.display = 'block';
                setTimeout(() => { if(confirmationMessage) confirmationMessage.style.display = 'none'; }, 9000);
            }
        } catch (error) {
            console.error("Eroare la salvarea intrării de jurnal sau generare feedback:", error);
            if(confirmationMessage){
                confirmationMessage.textContent = 'Eroare la salvare sau la generarea feedback-ului AI.';
                confirmationMessage.className = 'confirmation-message error';
                confirmationMessage.style.display = 'block';
            }
        } finally {
            saveButton.textContent = originalButtonText;
            saveButton.disabled = false;
        }
    }

    async function callGeminiAPI(promptText, modelToUse, generationConfigOptions = {}) {
        if (!modelToUse) {
            console.error("Modelul Gemini specificat este invalid sau neinițializat.");
            return "EROARE: Model AI neinițializat. Verifică cheia API.";
        }
        try {
            console.log(`Trimitem la Gemini (${modelToUse === geminiModelChat ? "Chat" : (modelToUse === geminiModelFisaFeedback ? "Fișă" : "Jurnal") }, primele 200 caractere):`, promptText.substring(0, 20000));
            const requestPayload = {
                contents: [{ role: "user", parts: [{ text: promptText }] }],
                generationConfig: { temperature: 0.6, maxOutputTokens: 80000, ...generationConfigOptions }
            };
            const result = await modelToUse.generateContent(requestPayload);
            const response = result.response;

            if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
                if (response.candidates[0].finishReason && !["STOP", "MAX_TOKENS"].includes(response.candidates[0].finishReason)) {
                    console.warn("Gemini a oprit generarea prematur:", response.candidates[0].finishReason, response.candidates[0].safetyRatings);
                    return `EROARE Gemini: Generare oprită (Motiv: ${response.candidates[0].finishReason}). Detalii: ${JSON.stringify(response.candidates[0].safetyRatings || 'N/A')}`;
                }
                return response.candidates[0].content.parts[0].text;
            } else if (response?.promptFeedback?.blockReason) {
                console.error("Prompt blocat de Gemini:", response.promptFeedback.blockReasonDetail || response.promptFeedback.blockReason);
                 return `EROARE Gemini: Prompt blocat (Motiv: ${response.promptFeedback.blockReason}). Detalii: ${JSON.stringify(response.promptFeedback.blockReasonDetail || response.promptFeedback.safetyRatings || 'N/A')}`;
            } else {
                console.error("Răspuns Gemini neașteptat sau gol:", JSON.stringify(response, null, 2));
                return "EROARE Gemini: Răspuns invalid sau gol de la API.";
            }
        } catch (error) {
            console.error("Eroare detaliată la callGeminiAPI:", error, error.stack);
            let errorMessage = `EROARE Gemini: ${error.message || "Eroare API necunoscută"}`;
             if (error.toString().toLowerCase().includes("api key not valid") ||
                (error.message && error.message.toLowerCase().includes("permission denied")) ||
                (error.message && error.message.toLowerCase().includes("api_key_invalid")) ||
                (error.status && error.status === 403)) {
                 errorMessage = "EROARE: Cheia API Gemini nu este validă sau nu are permisiuni.";
            } else if (error.message && (error.message.toLowerCase().includes("quota") || (error.status && error.status === 429) || (error.toString().toLowerCase().includes("resource has been exhausted")) )) {
                errorMessage = "EROARE: Limita de utilizare API Gemini a fost depășită.";
            } else if (error.message && (error.message.toLowerCase().includes("candidate.finish_reason") || error.message.toLowerCase().includes("safety") || error.message.toLowerCase().includes("blocked due to safety_settings"))) {
                errorMessage = "EROARE Gemini: Generarea oprită (motive de siguranță/conținut).";
            }  else if (error.toString().toLowerCase().includes("404") && error.toString().toLowerCase().includes("model not found")) {
                 let modelName = "necunoscut";
                 if (modelToUse === geminiModelFisaFeedback) modelName = GEMINI_MODEL_NAME_FEEDBACK_FISA;
                 else if (modelToUse === geminiModelJurnalFeedback) modelName = GEMINI_MODEL_NAME_FEEDBACK_JURNAL;
                 else if (modelToUse === geminiModelChat) modelName = GEMINI_MODEL_NAME_CHAT;
                 errorMessage = `EROARE Gemini: Modelul ${modelName} nu a fost găsit.`;
            }
            return errorMessage;
         }
    }

    function buildAdaptiveAIPromptFisa(introspectieData) {
        const rowData = introspectieData.continut;
        return `
Analizează în profunzime această fișă completă de auto-reflecție. Utilizatorul a parcurs un exercițiu detaliat pentru a-și înțelege o situație specifică. Oferă feedback psihologic structurat, empatic și acționabil. Respectă cu strictețe formatul și ordinea secțiunilor de mai jos, folosind exact prefixele indicate (ex: \`EmpatieInițială:\`, \`PuncteForteObservate:\`). Folosește Markdown pentru formatarea textului în interiorul fiecărei secțiuni (ex: \`**Text bold**\`, \`*Text italic*\`, liste cu \`* Element\`).

**Datele Complete din Fișa de Reflecție a Utilizatorului:**

**Secțiunea 1: Explorarea Situației și a Nevoilor**
*   Care este situația?: ${rowData.situatie || 'N/A'}
*   Ce îmi trece prin minte (gânduri automate)?: ${rowData.ganduri || 'N/A'}
*   Cum mă face acel gând să mă simt (emoții)?: ${rowData.emotii || 'N/A'}
*   Ce mod este activ?: ${rowData.mod_activ || 'N/A'}
*   Ce comportament simți că adopți?: ${rowData.comportament || 'N/A'}
*   Care sunt nevoile tale mai profunde?: ${rowData.nevoi_profunde || 'N/A'}
*   Mă ajută comportamentul meu să îndeplinesc aceste nevoi?: ${rowData.ajutor_comportament || 'N/A'}
*   Cum ar gândi și cum s-ar comporta Adultul Sănătos (perspectiva utilizatorului)?: ${rowData.adult_sanatos || 'N/A'}

**Secțiunea 2: Analiza Gândurilor și a Percepțiilor**
*   Ce mă face să cred că gândul automat este adevărat?: ${rowData.dovezi_adevar || 'N/A'}
*   Ce mă face să cred că nu este adevărat?: ${rowData.dovezi_fals || 'N/A'}
*   Există o explicație alternativă?: ${rowData.explicatie_alternativa || 'N/A'}
*   Care este cel mai rău lucru care s-ar putea întâmpla?: ${rowData.scenariu_negativ || 'N/A'}
*   Care este cel mai bun lucru care s-ar putea întâmpla?: ${rowData.scenariu_optimist || 'N/A'}
*   Care este cel mai realist rezultat?: ${rowData.rezultat_realist || 'N/A'}
*   Ce s-ar întâmpla dacă mi-aș schimba modul de gândire?: ${rowData.schimbare_gandire || 'N/A'}
*   Ce i-aș spune unui prieten dacă ar fi în aceeași situație?: ${rowData.sfat_prieten || 'N/A'}

**Secțiunea 3: Întrebări pentru Claritate și Reflecție Suplimentară**
*   Văd doar partea rea a lucrurilor?: ${rowData.partea_rea || 'N/A'}
*   Îmi asum responsabilitatea pentru lucruri care nu au stat în puterea mea?: ${rowData.responsabilitate || 'N/A'}
*   Mă condamn în baza unui singur eveniment?: ${rowData.condamnare || 'N/A'}
*   Privesc situația în termeni extremi (alb/negru)?: ${rowData.termeni_extremi || 'N/A'}
*   Exagerez situația?: ${rowData.exagerare || 'N/A'}
*   Există și alți factori responsabili?: ${rowData.factori_responsabili || 'N/A'}
*   Am sărit direct la concluzii?: ${rowData.concluzii || 'N/A'}
*   Îmi pun întrebări fără răspuns?: ${rowData.intrebari_fara_raspuns || 'N/A'}
*   Mă concentrez doar asupra slăbiciunilor mele?: ${rowData.slabiciuni || 'N/A'}
*   Mă zbat prea mult gândind la cum ar trebui să fie lucrurile?: ${rowData.cum_ar_trebui || 'N/A'}
*   Mă aștept să fiu perfect?: ${rowData.perfectiune || 'N/A'}

**CERINȚE PENTRU FEEDBACK-UL AI (folosește prefixele EXACT așa cum sunt scrise și formatarea Markdown în interiorul răspunsurilor):**

EmpatieInițială: (1-2 propoziții empatice scurte, recunoscând efortul utilizatorului.)
PuncteForteObservate: (Identifică 1-2 aspecte pozitive sau de auto-conștientizare observate în răspunsurile utilizatorului.)
TiparePrincipale: (Descrie succint 1-3 tipare de gândire/emoționale/comportamentale centrale care reies din fișă.)
ConexiuniCheie: (Sintetizează legătura S-G-E-C-N (Situație-Gând-Emoție-Comportament-Nevoie) specifică acestei fișe, bazându-te pe răspunsurile la '${rowData.ganduri}', '${rowData.emotii}', '${rowData.comportament}', '${rowData.nevoi_profunde}'.)
DistorsiuniIdentificate: (Identifică 2-3 distorsiuni cognitive principale din răspunsuri. Pentru fiecare:
*   Numele Distorsiunii (ex: \`**Catastrofizare**\`)
*   O scurtă explicație a distorsiunii (1 propoziție).
*   Un exemplu specific din răspunsurile utilizatorului care ilustrează distorsiunea.
*   O întrebare de contestare sau reflecție pentru acea distorsiune (ex: "*Cum ar arăta o perspectivă mai echilibrată asupra X?*").
Listează fiecare distorsiune ca un sub-punct separat.)
SchemeActivate: (Sugerează 1-2 scheme cognitive maladaptative timpurii care par a fi activate de situația descrisă (ex: Defectivitate/Rușine, Abandon, Deprivare Emoțională etc.). Pentru fiecare:
*   Numele Schemei (ex: \`**Schema de Eșec**\`)
*   O scurtă descriere a cum se manifestă în general acea schemă (1-2 propoziții).
*   Cum ar putea răspunsurile utilizatorului din această fișă (gânduri, emoții, comportamente) să reflecte activarea acestei scheme?
Fii speculativ și empatic, nu conclusiv. Prezintă ca sub-puncte.)
ModuriImplicate: (Sugerează pe scurt ce moduri din Terapia Schemelor ar putea fi active sau implicate, pe lângă cel menționat de utilizator, dacă este cazul. Ex: Copil Vulnerabil, Părinte Punitiv, Protector Detașat. Fii concis.)
PerspectivaAdultSănătos: (Comentează răspunsul utilizatorului despre cum ar acționa Adultul Sănătos ('${rowData.adult_sanatos}'). Este realist? Compasional? Oferă sugestii pentru a întări și mai mult această perspectivă, incluzând:
    *   Cum ar putea Adultul Sănătos să interpreteze situația diferit?
    *   Ce gânduri alternative ar putea cultiva?
    *   Cum ar gestiona emoțiile într-un mod adaptativ?
    *   Ce comportamente constructive ar adopta pentru a-și împlini nevoile?
    *   Cum ar putea contracara activ schemele sau modurile disfuncționale?)
ÎntrebareFinalăReflecție: (O întrebare generală, puternică și deschisă, care să încurajeze utilizatorul să integreze învățămintele din această fișă în viața sa de zi cu zi sau să reflecteze la un aspect mai larg.)
SugestieMicPas: (O sugestie concretă, mică și realizabilă, pentru un pas pe care utilizatorul l-ar putea face în următoarele zile pentru a exersa o abilitate nouă, a contesta un gând, sau a acționa din perspectiva Adultului Sănătos, bazat pe analiza fișei.)
ÎncurajareFinală: (1-2 propoziții de încurajare, validare și speranță.)

Răspunde doar cu textul cerut conform structurii, fără introduceri ("Iată feedback-ul...") sau concluzii suplimentare ("Sper că acest feedback..."), în afara celor specificate. Asigură-te că fiecare secțiune începe exact cu prefixul dat (ex: \`EmpatieInițială:\`).`;
    }

    function buildAdaptiveAIPromptJurnal(introspectieData) {
        const { titluJurnal, textJurnal, promptUtilizatJurnal } = introspectieData.continut;
        let specificInstructions = "";
        let modelFocus = "feedback general și reflecție";
        let guideText = null;

        const ghidGasit = jurnalPromptsList.find(p => p.id === promptUtilizatJurnal);
        if (ghidGasit) {
            guideText = ghidGasit.text;
        }

        let basePrompt = `Ești PsihoGPT – un terapeut AI avansat, extrem de empatic, cu o profundă înțelegere a psihologiei umane, antrenat în Terapie Cognitiv-Comportamentală (TCC), Terapia Schemelor, Terapia prin Acceptare și Angajament (ACT), Scrierea Expresivă și principii de mindfulness. Comunică într-un limbaj cald, validant și ușor de înțeles, dar păstrează profunzimea analitică. Folosește formatare Markdown pentru structurare (titluri principale cu \`**Titlu Principal**\`, subtitluri dacă e cazul cu \`### Subtitlu\`, liste cu \`* Element listă\`, text bold cu \`**text bold**\` și italic cu \`*text italic*\` unde e cazul). Evită citatele direct din literatură dacă nu sunt absolut esențiale, concentrează-te pe limbajul tău.

Obiectivul tău este să oferi un feedback personalizat, constructiv și profund pentru următoarea intrare în jurnal. Nu oferi sfaturi medicale sau diagnostice. Concentrează-te pe facilitarea auto-înțelegerii și a creșterii personale. Utilizatorul a avut la dispoziție un ghid vizual (tipul: "${promptUtilizatJurnal}") pentru a-și structura gândurile, iar textul de mai jos reprezintă răspunsurile sale la acel ghid sau o reflecție liberă inspirată de el.`;

        switch (promptUtilizatJurnal) {
            case "ritual_reconstructie":
                specificInstructions = `Utilizatorul a folosit ghidul "Ritual de Reconstrucție Interioară", care are 7 secțiuni principale (I. Invitație la Autenticitate, II. Containere Emoționale, III. Decodificare Narativă, IV. Integrare Explicativă, V. Compasiune și Blândețe, VI. Reconfigurare Identitară, VII. Actul Sacru de Alegere) și poate o secțiune VIII (Scrisoare-Ritual). Feedback-ul tău AR TREBUI SĂ URMEZE ACEASTĂ STRUCTURĂ. Pentru FIECARE secțiune a ritualului (I-VII și opțional VIII):
1.  **Numește secțiunea clar** (ex: \`**I. Invitație la Autenticitate:**\`).
2.  Pe baza textului utilizatorului (\`Text Complet Jurnal Utilizator\` de mai jos), **extrage și reflectă** ce a scris sau ce pare să fi explorat pentru ACEASTĂ secțiune specifică. Fii concis și la obiect. Dacă utilizatorul nu pare să fi adresat o secțiune, menționează scurt sau sari peste ea.
3.  **Oferă o scurtă validare empatică** dacă a completat ceva relevant pentru secțiune.
4.  **Pune 1-2 întrebări de aprofundare SPECIFICE** pentru acea secțiune.
După ce ai parcurs secțiunile individuale, adaugă o secțiune de \`**### Concluzii și Reflecții Finale:**\`
*   **Sinteza Conexiunilor:** Identifică 1-2 conexiuni sau teme generale.
*   **Încurajare și Pași Următori:** Încurajează procesul de transformare.`;
                modelFocus = "analiză structurată a ritualului de reconstrucție.";
                break;
            case "dialog_voce_critica":
                specificInstructions = `Utilizatorul a folosit ghidul "Dialog Voce Critică". Analizează răspunsurile și structurează feedback-ul:
1.  **\`**Validare Empatică Inițială:\`**
2.  **\`**Analiza Mesajului Critic:\`**
3.  **\`**Impactul Emoțional și Corporal:\`**
4.  **\`**Originea Vocii (dacă e explorată):\`**
5.  **\`**Nevoia Neîmplinită:\`**
6.  **\`**Forța Adultului Sănătos:\`**
7.  **\`**### Întrebări de Aprofundare și Direcții:\`** (1-2 întrebări)
8.  **\`**Notă despre Scheme (opțional):\`**`;
                modelFocus = "analiză dialog voce critică, cultivarea Adultului Sănătos.";
                break;
            case "explorare_emotie":
                specificInstructions = `Utilizatorul a folosit ghidul "Explorează o emoție". Feedback-ul parcurge pașii:
1.  **\`**Validarea Emoției Denumite:\`**
2.  **\`**Conexiunea Corp-Emoție:\`**
3.  **\`**Relația Gânduri-Emoție:\`**
4.  **\`**Contextul și Declanșatorul:\`**
5.  **\`**Nevoia Fundamentală Semnalată:\`**
6.  **\`**Gestul de Auto-Compasiune:\`**
7.  **\`**### Reflecții Suplimentare și Întrebări:\`** (1-2 întrebări)`;
                modelFocus = "analiză explorare emoție, înțelegere profundă.";
                break;
            case "recunostinta_resurse":
                specificInstructions = `Utilizatorul a folosit "Recunoștință & Resurse". Structurează:
1.  **\`**Aprecierea Practicii Recunoștinței:\`**
2.  **\`**Observații asupra Elementelor de Recunoștință:\`**
3.  **\`**Explorarea Resursei Interioare:\`**
4.  **\`**Impactul Gestului de Auto-Îngrijire:\`**
5.  **\`**### Întrebări pentru Consolidare:\`** (1-2 întrebări)`;
                modelFocus = "încurajare recunoștință, conectare resurse.";
                break;
            case "analiza_situatie":
                specificInstructions = `Utilizatorul a folosit "Analizează o situație". Reflectă structura:
1.  **\`**Recunoașterea Efortului Analitic:\`**
2.  **\`**Situația și Faptele:\`**
3.  **\`**Interpretarea Inițială și Emoțiile:\`**
4.  **\`**Puterea Reîncadrării (Reframing):\`**
5.  **\`**Lecții Învățate:\`**
6.  **\`**### Întrebări pentru Acțiune și Integrare:\`** (1-2 întrebări)`;
                modelFocus = "susținere analiză situație, reîncadrare, acțiuni.";
                break;
            default: // prompt_personalizat
                specificInstructions = `Utilizatorul a scris o intrare liberă. Feedback empatic:
1.  **\`**Validare Empatică Generală:\`**
2.  **\`**Identificarea Temelor Centrale (1-2):\`**
3.  **\`**Reflecție Oglindă:\`**
4.  **\`**### Întrebări Deschise și Evocatoare (2-3):\`**
5.  **\`**Încurajare Finală:\`**`;
                modelFocus = "reflecție empatică text liber, identificare teme, întrebări deschise.";
                break;
        }

        const ghidReferintaText = guideText ? `\n\n--- TEXTUL GHIDULUI DE REFERINȚĂ (NU RĂSPUNSURILE UTILIZATORULUI) ---\n\`\`\`\n${guideText}\n\`\`\`\nUtilizatorul a avut acest ghid afișat și a scris răspunsurile în secțiunea "Text Complet Jurnal Utilizator" de mai jos.` : "\n\nUtilizatorul a scris liber sau detaliile specifice ale ghidului nu sunt furnizate aici; concentrează-te pe răspunsurile utilizatorului și tipul de ghid general.";

        return `${basePrompt}
${ghidReferintaText}

**Focusul specific pentru această intrare de jurnal (bazat pe ghidul "${promptUtilizatJurnal}") este: ${modelFocus}.**

**Instrucțiuni specifice pentru feedback bazat pe tipul de ghid ("${promptUtilizatJurnal}"):**
${specificInstructions}
---
**INFORMAȚII DESPRE INTRAREA UTILIZATORULUI:**
Titlu Jurnal: ${titluJurnal || "Fără titlu"}
Tipul de Ghid Utilizat (selectat de utilizator / detectat): ${promptUtilizatJurnal}

**TEXT COMPLET JURNAL UTILIZATOR (RĂSPUNSURILE SALE):**
\`\`\`
${textJurnal}
\`\`\`
---
Te rog să generezi un feedback AI detaliat, empatic și structurat conform instrucțiunilor de mai sus, personalizat pe baza textului furnizat de utilizator. Asigură-te că respecți formatarea Markdown cerută pentru lizibilitate. Mulțumesc!`;
    }

    async function genereazaFeedbackPentruIntrospectie(introspectieData) {
        if (!introspectieData || !introspectieData.id || !introspectieData.type || !introspectieData.continut) {
            return { rawText: "EROARE: Date incomplete.", error: true, timestamp: new Date().toISOString() };
        }
        let promptText = "";
        let modelToUse = null;
        let modelNameForLog = "";

        if (introspectieData.type === 'fisa') {
            if (!geminiModelFisaFeedback) return { rawText: "EROARE: Model AI fișe indisponibil.", error: true, timestamp: new Date().toISOString() };
            promptText = buildAdaptiveAIPromptFisa(introspectieData);
            modelToUse = geminiModelFisaFeedback;
            modelNameForLog = GEMINI_MODEL_NAME_FEEDBACK_FISA;
        } else if (introspectieData.type === 'jurnal') {
            if (!geminiModelJurnalFeedback) return { rawText: "EROARE: Model AI jurnal indisponibil.", error: true, timestamp: new Date().toISOString() };
            promptText = buildAdaptiveAIPromptJurnal(introspectieData);
            modelToUse = geminiModelJurnalFeedback;
            modelNameForLog = GEMINI_MODEL_NAME_FEEDBACK_JURNAL;
        } else {
            return { rawText: "EROARE: Tip introspecție necunoscut.", error: true, timestamp: new Date().toISOString() };
        }

        const feedbackRawText = await callGeminiAPI(promptText, modelToUse);
        const parsedFeedback = {
            rawText: feedbackRawText,
            model: `Gemini (${modelNameForLog})`,
            timestamp: new Date().toISOString(),
            error: typeof feedbackRawText === 'string' && feedbackRawText.toUpperCase().startsWith("EROARE:"),
            error_parsing: false
        };
        
        if (introspectieData.type === 'fisa' && !parsedFeedback.error) {
            const feedbackStructure = {
                empatie_initiala: /^EmpatieInițială:\s*([\s\S]*?)(?=\n\S*?:|$)/im,
                puncte_forte: /^PuncteForteObservate:\s*([\s\S]*?)(?=\n\S*?:|$)/im,
                tipare_principale: /^TiparePrincipale:\s*([\s\S]*?)(?=\n\S*?:|$)/im,
                conexiuni_cheie: /^ConexiuniCheie:\s*([\s\S]*?)(?=\n\S*?:|$)/im,
                distorsiuni_identificate: /^DistorsiuniIdentificate:\s*([\s\S]*?)(?=\n\S*?:|$)/im,
                scheme_activate: /^SchemeActivate:\s*([\s\S]*?)(?=\n\S*?:|$)/im,
                moduri_implicate: /^ModuriImplicate:\s*([\s\S]*?)(?=\n\S*?:|$)/im,
                perspectiva_adult_sanatos: /^PerspectivaAdultSănătos:\s*([\s\S]*?)(?=\n\S*?:|$)/im,
                intrebare_finala_reflectie: /^ÎntrebareFinalăReflecție:\s*([\s\S]*?)(?=\n\S*?:|$)/im,
                sugestie_mic_pas: /^SugestieMicPas:\s*([\s\S]*?)(?=\n\S*?:|$)/im,
                incurajare_finala: /^ÎncurajareFinală:\s*([\s\S]*?$)/im,
            };
            let allParsingOk = true;
            for (const key in feedbackStructure) {
                const match = feedbackRawText.match(feedbackStructure[key]);
                if (match && match[1] && match[1].trim() !== "") {
                     parsedFeedback[key] = match[1].trim();
                } else {
                    parsedFeedback[key] = `(Secțiune neextrasă: ${key})`; allParsingOk = false;
                }
            }
            if (!allParsingOk) parsedFeedback.error_parsing = true;
        } else if (introspectieData.type === 'jurnal' && !parsedFeedback.error) {
            parsedFeedback.promptTypeAtGeneration = introspectieData.continut.promptUtilizatJurnal || "necunoscut";
        }

        const docRef = doc(db, "introspectii", introspectieData.id);
        try {
            await updateDoc(docRef, { feedbackAI_history: arrayUnion(parsedFeedback) });
            console.log(`Feedback AI (tip: ${introspectieData.type}) salvat pentru ${introspectieData.id}`);
        } catch (updateError) {
            console.error(`Eroare update feedback pentru ${introspectieData.id}:`, updateError);
        }
        return parsedFeedback;
    }

    async function incarcaToateIntrospectiile(userId) {
        const container = document.getElementById("introspectiiCardContainer");
        if (!container || !userId) return;
        let loadingMsg = container.querySelector(".loading-message");
        if (!container.querySelector('.introspectie-card') && !loadingMsg) {
            loadingMsg = document.createElement("p");
            loadingMsg.className = "loading-message";
            loadingMsg.textContent = "Se încarcă introspecțiile...";
            container.appendChild(loadingMsg);
        }
        try {
            const q = query(collection(db, "introspectii"), where("ownerUid", "==", userId), orderBy("timestampCreare", "desc"));
            const querySnapshot = await getDocs(q);
            if (loadingMsg) loadingMsg.remove();
            container.innerHTML = ''; 
            if (querySnapshot.empty) {
                container.innerHTML = "<p class='no-entries-message'>Nicio introspecție salvată.</p>";
            } else {
                querySnapshot.forEach((docSnap) => {
                    afiseazaCardIntrospectie({ id: docSnap.id, ...docSnap.data() });
                });
            }
        } catch (error) {
            console.error("Eroare încărcare introspecții:", error);
            if (loadingMsg) loadingMsg.remove();
            if (!container.querySelector('.introspectie-card')) {
                 container.innerHTML = "<p class='error-loading-message'>Eroare la încărcarea introspecțiilor.</p>";
            }
        }
    }
    
    function afiseazaIstoricFeedbackIntrospectie(containerEl, feedbackHistory) {
        containerEl.innerHTML = '';
        if (!feedbackHistory || !Array.isArray(feedbackHistory) || feedbackHistory.length === 0) {
            containerEl.innerHTML = "<p class='no-feedback-message'>Niciun feedback AI generat.</p>"; return;
        }
        feedbackHistory.slice().reverse().forEach((entry, index) => {
            const itemContainer = document.createElement("div");
            itemContainer.className = "feedback-entry-card";
            const modelInfo = entry.model || 'N/A';
            let promptTypeInfo = '';
            if (entry.promptTypeAtGeneration && entry.promptTypeAtGeneration !== "necunoscut" && entry.promptTypeAtGeneration !== "prompt_personalizat") {
                 const promptLabelFound = jurnalPromptsList.find(p => p.id === entry.promptTypeAtGeneration)?.label || entry.promptTypeAtGeneration.replace(/_/g, ' ');
                 promptTypeInfo = ` (Ghid: ${promptLabelFound})`;
            } else if (entry.promptTypeAtGeneration === "prompt_personalizat") {
                 promptTypeInfo = ` (Scriere liberă)`;
            }

            itemContainer.innerHTML = `<p class="feedback-timestamp"><strong>Feedback #${feedbackHistory.length - index}</strong> (${new Date(entry.timestamp).toLocaleString("ro-RO")}) - ${modelInfo}${promptTypeInfo}</p>`;
            
            const contentWrapper = document.createElement("div");
            contentWrapper.className = "content-ai";

            if (entry.error) {
                contentWrapper.innerHTML = `<p class="ai-text-error">${(entry.rawText || "Eroare generare.").replace(/\n/g, '<br>')}</p>`;
            } else if (entry.error_parsing && entry.rawText) { // Afișăm textul brut dacă parsarea a eșuat (pt fișe)
                contentWrapper.innerHTML = `<p style="color:orange;font-style:italic;">Atenție: Unele secțiuni din acest feedback (pentru fișă) nu au putut fi parsate corect. Se afișează textul brut:</p><div class="raw-feedback-display">${entry.rawText.replace(/\n/g, '<br>')}</div>`;
            } else if (typeof entry.empatie_initiala === 'string') { // Format nou fișă, parsat corect
                 const newFormatSections = [
                    { title: "💬 Empatie Inițială", key: "empatie_initiala" }, { title: "🌟 Puncte Forte", key: "puncte_forte" },
                    { title: "🔄 Tipare Principale", key: "tipare_principale" }, { title: "🔗 Conexiuni Cheie", key: "conexiuni_cheie" },
                    { title: "🔍 Distorsiuni", key: "distorsiuni_identificate", isList: true }, { title: "🧠 Scheme", key: "scheme_activate", isList: true },
                    { title: "🎭 Moduri Implicate", key: "moduri_implicate" }, { title: "💪 Adult Sănătos", key: "perspectiva_adult_sanatos" },
                    { title: "❓ Reflecție Finală", key: "intrebare_finala_reflectie" }, { title: "👟 Mic Pas", key: "sugestie_mic_pas" },
                    { title: "💖 Încurajare", key: "incurajare_finala" }
                ];
                newFormatSections.forEach(sc => {
                    let contentText = entry[sc.key];
                    if (typeof contentText === 'string' && contentText.trim() !== "" && !contentText.startsWith("(Secțiune neextrasă")) {
                        const titleNoEmoji = sc.title.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+\s*/gu, '').trim();
                        contentText = contentText.replace(new RegExp(`^${titleNoEmoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:?\\s*`, "im"), "").trim();
                        let html = contentText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
                        
                        const sectionDiv = document.createElement('div');
                        sectionDiv.className = 'feedback-section-item';
                        const titleH5 = document.createElement('h5');
                        titleH5.innerHTML = sc.title + ":"; // Adăugăm : aici
                        sectionDiv.appendChild(titleH5);

                        if (sc.isList) {
                            const list = document.createElement('ul');
                            // O încercare mai robustă de a parsa listele Markdown
                            const items = contentText.split('\n').map(line => line.trim()).filter(line => line.startsWith('* ') || line.startsWith('- '));
                            if (items.length > 0) {
                                items.forEach(item => {
                                    const li = document.createElement('li');
                                    li.innerHTML = item.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
                                    list.appendChild(li);
                                });
                                sectionDiv.appendChild(list);
                            } else if (contentText.trim()) { // Fallback dacă nu e format de listă dar are conținut
                                const p = document.createElement('p');
                                p.innerHTML = html.replace(/\n/g, '<br>');
                                sectionDiv.appendChild(p);
                            }
                        } else {
                            const p = document.createElement('p');
                            p.innerHTML = html.replace(/\n/g, '<br>');
                            sectionDiv.appendChild(p);
                        }
                        contentWrapper.appendChild(sectionDiv);

                    } else if (contentText && contentText.startsWith("(Secțiune neextrasă")) {
                         contentWrapper.innerHTML += `<h5>${sc.title}:</h5><p style="font-style:italic;">${contentText}</p>`;
                    }
                });
            } else { // Jurnal sau format vechi/neparsat, afișăm rawText formatat cu Markdown simplu
                let html = entry.rawText || 'Conținut indisponibil.';
                // Aplică formatare Markdown pentru titluri Hx, liste, bold, italic
                html = html.replace(/^#{1,6}\s+(.*)/gm, (match, p1) => `<h6>${p1.trim()}</h6>`); // Simplificat la h6 pentru consistență
                html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/__(.*?)__/g, '<strong>$1</strong>');
                html = html.replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/_(.*?)_/g, '<em>$1</em>');
                
                const lines = html.split('\n');
                let inList = false;
                let listHtml = "";
                lines.forEach(line => {
                    if (line.match(/^\s*[\*\-\+]\s+/)) {
                        if (!inList) { listHtml += '<ul>'; inList = true; }
                        listHtml += `<li>${line.replace(/^\s*[\*\-\+]\s+/, '')}</li>`;
                    } else {
                        if (inList) { listHtml += '</ul>'; inList = false; }
                        listHtml += `<p>${line}</p>`; // Fiecare linie devine un paragraf dacă nu e listă
                    }
                });
                if (inList) listHtml += '</ul>'; // Închide lista dacă e ultima
                contentWrapper.innerHTML = listHtml.replace(/<p><\/p>/g, ''); // Elimină paragrafele goale

            }
            itemContainer.appendChild(contentWrapper);
            containerEl.appendChild(itemContainer);
        });
    }

    function afiseazaCardIntrospectie(docData) {
        const container = document.getElementById("introspectiiCardContainer");
        const entryDate = docData.dateAfisare || (docData.timestampCreare?.toDate ? new Date(docData.timestampCreare.toDate()).toLocaleDateString("ro-RO") : 'Dată necunoscută');
        let cardTitle = "";
        let detailsContentHtml = "";

        if (docData.type === 'fisa') {
            cardTitle = `Fișă ${entryDate} - ${(docData.continut.situatie || 'Situație nedefinită').substring(0, 35)}...`;
            const c = docData.continut;
            detailsContentHtml = `
                <h4>Explorarea situației și a nevoilor</h4>
                <p><strong>Situația:</strong> ${c.situatie || 'N/A'}</p>
                <p><strong>Gânduri:</strong> ${c.ganduri || 'N/A'}</p>
                <p><strong>Emoții:</strong> ${c.emotii || 'N/A'}</p>
                <p><strong>Mod activ:</strong> ${c.mod_activ || 'N/A'}</p>
                <p><strong>Comportament:</strong> ${c.comportament || 'N/A'}</p>
                <p><strong>Nevoile profunde:</strong> ${c.nevoi_profunde || 'N/A'}</p>
                <p><strong>Ajutor comportament:</strong> ${c.ajutor_comportament || 'N/A'}</p>
                <p><strong>Adultul Sănătos:</strong> ${c.adult_sanatos || 'N/A'}</p>
                <hr>
                <h4>Analiza gândurilor și a percepțiilor</h4>
                <p><strong>Dovezi adevăr:</strong> ${c.dovezi_adevar || 'N/A'}</p>
                <p><strong>Dovezi fals:</strong> ${c.dovezi_fals || 'N/A'}</p>
                <p><strong>Explicație alternativă:</strong> ${c.explicatie_alternativa || 'N/A'}</p>
                <p><strong>Scenariu negativ:</strong> ${c.scenariu_negativ || 'N/A'}</p>
                <p><strong>Scenariu optimist:</strong> ${c.scenariu_optimist || 'N/A'}</p>
                <p><strong>Rezultat realist:</strong> ${c.rezultat_realist || 'N/A'}</p>
                <p><strong>Schimbare gândire:</strong> ${c.schimbare_gandire || 'N/A'}</p>
                <p><strong>Sfat prieten:</strong> ${c.sfat_prieten || 'N/A'}</p>
                <hr>
                <h4>Întrebări pentru claritate</h4>
                <p><strong>Partea rea:</strong> ${c.partea_rea || 'N/A'}</p>
                <p><strong>Responsabilitate:</strong> ${c.responsabilitate || 'N/A'}</p>
                <p><strong>Condamnare:</strong> ${c.condamnare || 'N/A'}</p>
                <p><strong>Termeni extremi:</strong> ${c.termeni_extremi || 'N/A'}</p>
                <p><strong>Exagerare:</strong> ${c.exagerare || 'N/A'}</p>
                <p><strong>Factori responsabili:</strong> ${c.factori_responsabili || 'N/A'}</p>
                <p><strong>Concluzii:</strong> ${c.concluzii || 'N/A'}</p>
                <p><strong>Întrebări fără răspuns:</strong> ${c.intrebari_fara_raspuns || 'N/A'}</p>
                <p><strong>Slăbiciuni:</strong> ${c.slabiciuni || 'N/A'}</p>
                <p><strong>Cum ar trebui:</strong> ${c.cum_ar_trebui || 'N/A'}</p>
                <p><strong>Perfecțiune:</strong> ${c.perfectiune || 'N/A'}</p>`;
        } else if (docData.type === 'jurnal') {
            let promptLabel = '(Scriere liberă)';
            if (docData.continut.promptUtilizatJurnal && docData.continut.promptUtilizatJurnal !== 'prompt_personalizat') {
                 const foundPrompt = jurnalPromptsList.find(p => p.id === docData.continut.promptUtilizatJurnal);
                 if (foundPrompt) promptLabel = `(${foundPrompt.label.substring(0, foundPrompt.label.indexOf(" "))}...)`; // Prescurtăm eticheta
                 else promptLabel = `(${docData.continut.promptUtilizatJurnal.replace(/_/g, ' ')})`;
            }
            cardTitle = `${docData.continut.titluJurnal || `Jurnal ${entryDate}`} ${promptLabel}`;
            detailsContentHtml = `<p class="journal-entry-content-text-unified">${(docData.continut.textJurnal || 'Conținut indisponibil.').replace(/\n/g, '<br>')}</p>`;
        }

        const card = document.createElement("div");
        card.className = "response-card introspectie-card";
        card.setAttribute("data-id", docData.id);
        card.setAttribute("data-type", docData.type);

        const discussButtonHtml = docData.type === 'fisa' ?
            `<button class="discuss-entry-with-chat-button" title="Discută această fișă cu PsihoGPT">Discută cu AI</button>` : '';

        card.innerHTML = `
            <div class="card-header">
                <span>${cardTitle}</span>
                <span class="card-date">${entryDate}</span>
            </div>
            <div class="card-content">
                <details class="introspectie-entry-details">
                    <summary>Vezi/Ascunde detaliile intrării</summary>
                    <div class="introspectie-entry-content-text">${detailsContentHtml}</div>
                </details>
                <h4 class="ai-feedback-title">Feedback AI <span style="font-weight:300; font-style:italic; font-size:0.85em;">(PsihoGPT)</span></h4>
                <div class="ai-feedback-history-container"></div>
                <div class="card-actions">
                    <button class="regenerate-feedback-button" title="Regenerează Feedback AI">Regenerează</button>
                    ${discussButtonHtml}
                    <button class="delete-last-feedback-button" title="Șterge Ultimul Feedback AI">Șterge Ultimul</button>
                    <button class="delete-all-feedback-button" title="Șterge Tot Istoricul Feedback AI">Șterge Istoric AI</button>
                    <button class="delete-introspectie-button" title="Șterge Această Intrare">Șterge Intrarea</button>
                </div>
            </div>`;

        card.querySelector('.card-header').addEventListener('click', (e) => {
            if (!e.target.closest('button') && !e.target.closest('details')) card.classList.toggle('open');
        });
        card.querySelector('.regenerate-feedback-button').addEventListener('click', (e) => { e.stopPropagation(); regenereazaFeedbackPentruIntrospectieCard(docData.id); });
        if (docData.type === 'fisa') {
            card.querySelector('.discuss-entry-with-chat-button')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                const fullEntryDataSnap = await getDoc(doc(db, "introspectii", docData.id));
                if (fullEntryDataSnap.exists()) {
                     await discussFisaWithChat(fullEntryDataSnap.data());
                } else { alert("Nu s-au putut încărca detaliile fișei."); }
            });
        }
        card.querySelector('.delete-last-feedback-button').addEventListener('click', (e) => { e.stopPropagation(); stergeUltimulFeedbackIntrospectie(docData.id); });
        card.querySelector('.delete-all-feedback-button').addEventListener('click', (e) => { e.stopPropagation(); stergeTotIstoriculFeedbackIntrospectie(docData.id); });
        card.querySelector('.delete-introspectie-button').addEventListener('click', (e) => { e.stopPropagation(); stergeIntrospectie(docData.id, card); });
        
        const noEntriesMsg = container.querySelector('.no-entries-message');
        if (noEntriesMsg) noEntriesMsg.remove();

        if (container.firstChild && container.firstChild.nodeName !== 'P') {
            container.insertBefore(card, container.firstChild);
        } else {
            if (container.firstChild && container.firstChild.nodeName === 'P') container.innerHTML = '';
            container.appendChild(card);
        }
        const feedbackContainer = card.querySelector('.ai-feedback-history-container');
        if (feedbackContainer) {
            afiseazaIstoricFeedbackIntrospectie(feedbackContainer, docData.feedbackAI_history || []);
        }
    }
    
    async function regenereazaFeedbackPentruIntrospectieCard(introspectieId) {
        const card = document.querySelector(`.introspectie-card[data-id="${introspectieId}"]`);
        const btn = card?.querySelector('.regenerate-feedback-button');
        const originalText = btn ? btn.textContent : "";
        if (btn) { btn.textContent = "Se generează..."; btn.disabled = true; }
        
        const type = card?.dataset.type;
        const confirmationElementId = type === 'fisa' ? 'fisaConfirmationMessage' : (type === 'jurnal' ? 'jurnalConfirmationMessage' : null);
        const confirmationMsg = confirmationElementId ? document.getElementById(confirmationElementId) : null;

        if(confirmationMsg) confirmationMsg.style.display = 'none';

        try {
            const entryDocSnap = await getDoc(doc(db, "introspectii", introspectieId));
            if (!entryDocSnap.exists()) {
                if(confirmationMsg) { confirmationMsg.textContent = 'Eroare: Intrarea nu mai există.'; confirmationMsg.className = 'confirmation-message error'; confirmationMsg.style.display = 'block';}
                return;
            }
            const entryData = { id: entryDocSnap.id, ...entryDocSnap.data() };
            const newFeedback = await genereazaFeedbackPentruIntrospectie(entryData);

            const updatedDoc = await getDoc(doc(db, "introspectii", introspectieId));
            if (updatedDoc.exists() && card) {
                afiseazaIstoricFeedbackIntrospectie(card.querySelector('.ai-feedback-history-container'), updatedDoc.data().feedbackAI_history || []);
            }
             const message = newFeedback && !newFeedback.error && !newFeedback.error_parsing ? "Noul feedback AI a fost generat!" : `Feedback AI: ${newFeedback.rawText || 'Problemă.'}`;
             if(confirmationMsg) { confirmationMsg.textContent = message; confirmationMsg.className = `confirmation-message ${newFeedback && !newFeedback.error && !newFeedback.error_parsing ? 'success' : 'error'}`; confirmationMsg.style.display = 'block'; setTimeout(() => { if(confirmationMsg) confirmationMsg.style.display = 'none'; }, 7000);}
        } catch (error) {
            console.error("Eroare regenerare feedback:", error);
             if(confirmationMsg) { confirmationMsg.textContent = 'Eroare la regenerare.'; confirmationMsg.className = 'confirmation-message error'; confirmationMsg.style.display = 'block';}
        } finally {
            if (btn) { btn.textContent = originalText; btn.disabled = false; }
        }
    }

    async function stergeUltimulFeedbackIntrospectie(introspectieId) {
        if (!confirm("Ștergeți ultimul feedback AI?")) return;
        const card = document.querySelector(`.introspectie-card[data-id="${introspectieId}"]`);
        const btn = card?.querySelector('.delete-last-feedback-button');
        const originalText = btn ? btn.textContent : "";
        if (btn) { btn.textContent = "Se șterge..."; btn.disabled = true; }

        const type = card?.dataset.type;
        const confirmationElementId = type === 'fisa' ? 'fisaConfirmationMessage' : (type === 'jurnal' ? 'jurnalConfirmationMessage' : null);
        const confirmationMsg = confirmationElementId ? document.getElementById(confirmationElementId) : null;
        if(confirmationMsg) confirmationMsg.style.display = 'none';

        try {
            const entryDocRef = doc(db, "introspectii", introspectieId);
            const entrySnap = await getDoc(entryDocRef);
            if (!entrySnap.exists() || !entrySnap.data().feedbackAI_history?.length) {
                if(confirmationMsg) {confirmationMsg.textContent = "Nu există feedback."; confirmationMsg.className = 'confirmation-message warning'; confirmationMsg.style.display = 'block';}
                return;
            }
            const history = entrySnap.data().feedbackAI_history;
            history.pop();
            await updateDoc(entryDocRef, { feedbackAI_history: history });
            if(card) afiseazaIstoricFeedbackIntrospectie(card.querySelector('.ai-feedback-history-container'), history);
            if(confirmationMsg) {confirmationMsg.textContent = "Ultimul feedback șters."; confirmationMsg.className = 'confirmation-message success'; confirmationMsg.style.display = 'block';}
        } catch (err) {
            if(confirmationMsg) {confirmationMsg.textContent = "Eroare ștergere."; confirmationMsg.className = 'confirmation-message error'; confirmationMsg.style.display = 'block';}
        } finally {
            if (btn) { btn.textContent = originalText; btn.disabled = false; }
            if(confirmationMsg) setTimeout(() => { if(confirmationMsg) confirmationMsg.style.display = 'none'; }, 7000);
        }
    }

    async function stergeTotIstoriculFeedbackIntrospectie(introspectieId) {
        if (!confirm("Sigur ștergeți TOT istoricul feedback AI?")) return;
        const card = document.querySelector(`.introspectie-card[data-id="${introspectieId}"]`);
        const btn = card?.querySelector('.delete-all-feedback-button');
        const originalText = btn ? btn.textContent : "";
        if (btn) { btn.textContent = "Se șterge..."; btn.disabled = true; }

        const type = card?.dataset.type;
        const confirmationElementId = type === 'fisa' ? 'fisaConfirmationMessage' : (type === 'jurnal' ? 'jurnalConfirmationMessage' : null);
        const confirmationMsg = confirmationElementId ? document.getElementById(confirmationElementId) : null;
        if(confirmationMsg) confirmationMsg.style.display = 'none';
        
        try {
            const docRef = doc(db, "introspectii", introspectieId);
            await updateDoc(docRef, { feedbackAI_history: [] });
            if(card) afiseazaIstoricFeedbackIntrospectie(card.querySelector('.ai-feedback-history-container'), []);
            if(confirmationMsg) {confirmationMsg.textContent = "Istoric feedback AI șters!"; confirmationMsg.className = 'confirmation-message success'; confirmationMsg.style.display = 'block';}
        } catch (error) {
            if(confirmationMsg) {confirmationMsg.textContent = "Eroare ștergere istoric."; confirmationMsg.className = 'confirmation-message error'; confirmationMsg.style.display = 'block';}
        } finally {
            if (btn) { btn.textContent = originalText; btn.disabled = false; }
             if(confirmationMsg) setTimeout(() => { if(confirmationMsg) confirmationMsg.style.display = 'none'; }, 7000);
        }
    }

    async function stergeIntrospectie(id, cardElement) {
        if (confirm("Ștergeți această intrare și tot feedback-ul asociat?")) {
            const type = cardElement?.dataset.type;
            const confirmationElementId = type === 'fisa' ? 'fisaConfirmationMessage' : (type === 'jurnal' ? 'jurnalConfirmationMessage' : null);
            const confirmationMsg = confirmationElementId ? document.getElementById(confirmationElementId) : null;
            if(confirmationMsg) confirmationMsg.style.display = 'none';

            try {
                await deleteDoc(doc(db, "introspectii", id));
                cardElement.remove();
                const container = document.getElementById("introspectiiCardContainer");
                if (container && !container.querySelector('.introspectie-card') && !container.querySelector('.no-entries-message')) {
                    const noEntriesMsgElement = document.createElement("p");
                    noEntriesMsgElement.className = "no-entries-message";
                    noEntriesMsgElement.textContent = "Nicio introspecție.";
                    container.appendChild(noEntriesMsgElement);
                }
                 if(confirmationMsg) {confirmationMsg.textContent = "Intrarea a fost ștearsă!"; confirmationMsg.className = 'confirmation-message success'; confirmationMsg.style.display = 'block'; setTimeout(() => { if(confirmationMsg) confirmationMsg.style.display = 'none'; }, 5000);}
            } catch (error) {
                if(confirmationMsg) {confirmationMsg.textContent = "Eroare ștergere intrare."; confirmationMsg.className = 'confirmation-message error'; confirmationMsg.style.display = 'block'; setTimeout(() => { if(confirmationMsg) confirmationMsg.style.display = 'none'; }, 5000);}
            }
        }
    }

   function formatStreamingMessage(message) {
        console.log("[FORMAT_STREAM] Formatare mesaj (primele 50 char):", message?.substring(0, 50));
        if (message === null || typeof message === 'undefined') return "";

        // Asigură-te că escape-ezi caracterele HTML ÎNAINTE de a aplica formatarea Markdown
        // Secvența corectă de escapare:
        let escapedMessage = String(message)
            .replace(/&/g, "&")  // Întâi &
            .replace(/</g, "<")
            .replace(/>/g, ">")
            .replace(/'/g, "'"); // Asigură-te că aceasta este corectă

        let htmlContent = escapedMessage
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            .replace(/```([\s\S]*?)```/g, (match, p1) => `<pre class="code-block-chat">${p1.trim()}</pre>`) // textul din p1 e deja escapat
            .replace(/`([^`]+)`/g, '<code class="inline-code-chat">$1</code>'); // textul din $1 e deja escapat

        htmlContent = htmlContent.replace(/^#{1,6}\s+(.*)/gm, (match, p1) => `<h6>${p1.trim()}</h6>`);

        const lines = htmlContent.split('\n');
        let inList = false;
        let listType = '';
        let processedHtml = "";

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const trimmedLine = line.trim();
            let currentListType = '';
            let listItemContent = '';

            // Verifică dacă linia este deja un tag HTML block pentru a nu o încadra în <p>
            // Am simplificat regex-ul și l-am făcut case-insensitive
            const isBlock = /^\s*<\/?(p|pre|h[1-6]|ul|ol|li|blockquote|div|table|hr|details|summary)/i.test(line);

            // Detectare și procesare pentru tag-uri de listă HTML (dacă AI-ul le generează ca text escapat)
            if (trimmedLine.toLowerCase().startsWith('<ul>') || trimmedLine.toLowerCase().startsWith('<ol>')) {
                if (inList) processedHtml += `</${listType}>\n`;
                listType = trimmedLine.includes('ul') ? 'ul' : 'ol';
                processedHtml += `<${listType}>\n`;
                inList = true;
                continue;
            }
            if (trimmedLine.toLowerCase().startsWith('</ul>') || trimmedLine.toLowerCase().startsWith('</ol>')) {
                if (inList) processedHtml += `</${listType}>\n`;
                inList = false;
                listType = '';
                continue;
            }
            if (trimmedLine.toLowerCase().startsWith('<li>')) {
                // Extrage conținutul dintre <li> și </li>
                const matchLi = trimmedLine.match(/^<li>([\s\S]*)<\/li>$/i);
                if (matchLi && matchLi[1]) {
                    listItemContent = matchLi[1]; // Conținutul e deja escapat
                    if (!inList) {
                        console.warn("[FORMAT_STREAM] Element <li> găsit fără tag de listă părinte. Se încadrează implicit în <ul>.");
                        processedHtml += `<ul>\n`;
                        inList = true;
                        listType = 'ul';
                    }
                    processedHtml += `  <li>${listItemContent}</li>\n`;
                } else {
                    // Dacă formatul e neașteptat, tratează ca text normal
                    if (inList) { processedHtml += `</${listType}>\n`; inList = false; listType = ''; }
                    if (line.trim() !== "" && !isBlock) processedHtml += `<p>${line}</p>\n`;
                    else if (line.trim() !== "") processedHtml += line + '\n';
                }
                continue;
            }

            // Detectare manuală pentru Markdown lists
            if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ') || trimmedLine.startsWith('+ ')) {
                currentListType = 'ul';
                listItemContent = trimmedLine.substring(trimmedLine.indexOf(' ') + 1).trim();
            } else {
                const markdownOlMatch = trimmedLine.match(/^(\d+)\.\s+(.*)/);
                if (markdownOlMatch) {
                    currentListType = 'ol';
                    listItemContent = markdownOlMatch[2].trim();
                }
            }

            if (currentListType) {
                if (!inList || listType !== currentListType) {
                    if (inList) processedHtml += `</${listType}>\n`;
                    processedHtml += `<${currentListType}>\n`;
                    inList = true;
                    listType = currentListType;
                }
                processedHtml += `  <li>${listItemContent}</li>\n`; // listItemContent e deja escapat
            } else {
                if (inList) {
                    processedHtml += `</${listType}>\n`;
                    inList = false;
                    listType = '';
                }
                if (line.trim() !== "" && !isBlock) {
                    processedHtml += `<p>${line}</p>\n`;
                } else if (line.trim() !== "") {
                    // Păstrează liniile care sunt deja block-uri HTML sau au conținut și nu sunt goale
                    processedHtml += line + (line.endsWith('\n') ? '' : '\n');
                }
            }
        }
        if (inList) { processedHtml += `</${listType}>\n`; }
        return processedHtml.replace(/<p><\/p>\s*\n?/g, ''); // Elimină paragrafele goale, inclusiv newline-ul asociat
    }

    function displayChatMessage(messageContent, role, thoughtsContent = null) {
        console.log(`[DISPLAY_CHAT] Afișare mesaj. Rol: ${role}, Conținut (primele 50): '${messageContent?.substring(0, 50)}...', Thoughts: ${thoughtsContent ? 'DA' : 'NU'}`);
        const messagesDiv = messagesDivGlobalRef;
        if (!messagesDiv) {
            console.error("[DISPLAY_CHAT] EROARE: messagesDivGlobalRef nu este definit!");
            return;
        }

        const messageElement = document.createElement("div");
        messageElement.classList.add("chat-message");
        messageElement.style.whiteSpace = "pre-wrap"; // Important pentru <pre> și \n

        let messageClass = "";
        if (role === "user") {
            messageClass = "user-message";
        } else if (role === "AI-error" || (typeof messageContent === 'string' && messageContent.toUpperCase().startsWith("EROARE"))) {
            messageClass = "ai-message ai-error";
        } else {
            messageClass = "ai-message";
        }
        messageClass.split(' ').forEach(cls => messageElement.classList.add(cls));

        // Adaugă "thoughts" PRIMELE dacă există
        if ((role === "AI" || role === "model") && thoughtsContent && thoughtsContent.trim() !== "") {
            console.log("[DISPLAY_CHAT] Adăugare 'thoughts' la elementul mesajului pentru rol:", role);
            const thoughtsDetails = document.createElement("details");
            thoughtsDetails.className = "ai-thoughts-details";
            // Folosim textContent pentru a seta sumarul pentru a evita interpretarea HTML dacă `role` ar conține ceva neașteptat
            const summary = document.createElement("summary");
            summary.textContent = `Procesul de gândire al PsihoGPT ${role === "model" ? "(live)" : "(istoric)"}`;
            thoughtsDetails.appendChild(summary);

            const pre = document.createElement("pre");
            pre.className = "ai-thoughts-content";
            pre.textContent = thoughtsContent.trim(); // textContent va escape-a automat HTML-ul
            thoughtsDetails.appendChild(pre);

            messageElement.appendChild(thoughtsDetails);
        }

        // Adaugă conținutul principal al mesajului
        const mainContentContainer = document.createElement('div');
        mainContentContainer.className = 'main-answer-text'; // Pentru a-l putea stiliza/manipula separat
        if (role === "user") {
            mainContentContainer.textContent = messageContent; // Mesajele user nu ar trebui formatate ca HTML
        } else {
            mainContentContainer.innerHTML = formatStreamingMessage(messageContent);
        }
        messageElement.appendChild(mainContentContainer);

        messagesDiv.appendChild(messageElement);
    }

    async function loadChatHistory(userId) {
        console.log("[CHAT_HISTORY] Încărcare istoric chat pentru user ID:", userId);
        if (!userId) {
            console.warn("[CHAT_HISTORY] User ID lipsă, nu se poate încărca istoricul.");
            return []; // Returnează array gol pentru a evita erori ulterioare
        }
        const historyDocRef = doc(db, "chatHistories", CHAT_HISTORY_DOC_ID_PREFIX + userId);
        try {
            const docSnap = await getDoc(historyDocRef);
            if (docSnap.exists() && docSnap.data().messages && Array.isArray(docSnap.data().messages)) {
                const messages = docSnap.data().messages.sort((a, b) =>
                    (a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime() || 0) -
                    (b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime() || 0)
                );
                console.log(`[CHAT_HISTORY] Istoric chat încărcat: ${messages.length} mesaje.`);
                return messages;
            }
            console.log("[CHAT_HISTORY] Niciun istoric chat găsit sau format invalid.");
            return [];
        } catch (error) {
            console.error("[CHAT_HISTORY] Eroare la încărcarea istoricului de chat:", error);
            return []; // Returnează array gol în caz de eroare
        }
    }

    async function saveChatMessage(userId, messageObject) {
        console.log(`[SAVE_CHAT] Salvare mesaj chat. Rol: ${messageObject.role}, Conținut (primele 30): '${messageObject.content?.substring(0, 30)}...', Thoughts: ${messageObject.thoughts ? 'DA' : 'NU'}, Error: ${messageObject.error}`);
        if (!userId || !messageObject) {
            console.warn("[SAVE_CHAT] Date incomplete pentru salvarea mesajului.", { userId, messageObject });
            return;
        }

        const historyDocRef = doc(db, "chatHistories", CHAT_HISTORY_DOC_ID_PREFIX + userId);
        const saveData = { ...messageObject };

        if (saveData.timestamp && !(saveData.timestamp instanceof Timestamp)) {
            saveData.timestamp = Timestamp.fromDate(new Date(saveData.timestamp));
        }
        if (typeof saveData.thoughts === 'string' && saveData.thoughts.trim() === "") {
            saveData.thoughts = null;
        } else if (typeof saveData.thoughts === 'undefined') {
            saveData.thoughts = null;
        }
        // Asigură-te că 'error' este boolean
        saveData.error = !!saveData.error;

        try {
            const docSnap = await getDoc(historyDocRef);
            if (docSnap.exists()) {
                await updateDoc(historyDocRef, { messages: arrayUnion(saveData) });
            } else {
                await setDoc(historyDocRef, { messages: [saveData] });
            }
            console.log("[SAVE_CHAT] Mesaj chat salvat cu succes în Firestore.");
        } catch (error) {
            console.error("[SAVE_CHAT] Eroare salvare mesaj chat în Firestore:", error);
        }
    }

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
    console.log(`[CHAT_INIT] Inițializare sesiune chat. User ID: ${userId}, Este încărcare UI inițială: ${isInitialPageLoad}`);
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

    // Resetăm starea
    isChatInitialized = false;
    chatSession = null;

    // 1. Construim promptul de sistem complet – cu „gândurile în română” etc.
    const dynamicContextSummary = await getInitialContextSummary(userId);
    const systemInstructionForSession = FULL_SYSTEM_INSTRUCTION_TEXT_TEMPLATE.replace(
        "{{INITIAL_CONTEXT_SUMMARY_PLACEHOLDER}}",
        dynamicContextSummary
    );
    console.log("[CHAT_INIT] Prompt sistem COMPLET generat pentru această sesiune de inițializare.");

    // 2. Dacă e prima încărcare de UI, golim zona de mesaje
    if (messagesDivGlobalRef && isInitialPageLoad) {
        messagesDivGlobalRef.innerHTML = '';
        console.log("[CHAT_INIT] UI-ul mesajelor a fost golit pentru încărcare proaspătă.");
    }

    // 3. Încărcăm întreg istoricul din Firestore (pentru afișarea locală și trimiterea către API)
    let fullLoadedHistoryFromDB = await loadChatHistory(userId);

    // 3a. Dacă e prima încărcare, afișăm numai ultimele X mesaje pe UI
    if (isInitialPageLoad) {
        const displayHistory = fullLoadedHistoryFromDB.slice(-MAX_MESSAGES_TO_DISPLAY_ON_LOAD);
        displayHistory.forEach(msg => {
            const roleForDisplay = (msg.role === "AI" || msg.role === "model") ? "model" : "user";
            displayChatMessage(msg.content, roleForDisplay, msg.thoughts);
        });
        console.log(`[CHAT_INIT] Afișat în UI ${displayHistory.length} din ${fullLoadedHistoryFromDB.length} mesaje.`);
    }

    // 3b. Pregătim istoricul trunchiat pe care îl trimitem la API (maxim MAX_CHAT_HISTORY_FOR_API mesaje)
    const apiHistoryStartIndex = Math.max(0, fullLoadedHistoryFromDB.length - MAX_CHAT_HISTORY_FOR_API);
    const truncatedApiHistory = fullLoadedHistoryFromDB.slice(apiHistoryStartIndex);
    const historyForGeminiAPI = [];

    truncatedApiHistory.forEach(msg => {
        if (msg.content && msg.content.trim() !== "") {
            historyForGeminiAPI.push({
                role: (msg.role === "AI" || msg.role === "model") ? "model" : "user",
                parts: [{ text: msg.content }]
            });
        }
    });
    console.log(
        "[CHAT_INIT] Istoric formatat pentru API la inițializare (după system prompt):",
        historyForGeminiAPI.length,
        "mesaje."
    );

    // 4. Pornim sesiunea de chat cu promptul de sistem + istoricul trunchiat
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

        // Aceasta este singura apelare a startChat pentru această sesiune
        chatSession = geminiModelChat.startChat(chatConfig);
        console.log(
            "[CHAT_INIT] Sesiune chat Gemini inițializată CU prompt sistem COMPLET și istoric DB trunchiat. Model:",
            GEMINI_MODEL_NAME_CHAT
        );

        if (chatStatus) chatStatus.textContent = "Janet - Psihoterapeut Cognitiv-Comportamental Integrativ";

        // 5. Dacă nu există niciun istoric în DB, trimitem un salut
        if (fullLoadedHistoryFromDB.length === 0) {
            console.log("[CHAT_INIT_GREETING] Niciun istoric în DB, se trimite salutul AI.");
            const aiGreeting = "Salut! Eu sunt PsihoGPT. Bine ai venit! Cum te simți astăzi? ✨";
            const firstAiResponseResult = await chatSession.sendMessageStream(aiGreeting);
            const firstAiResponseStream = firstAiResponseResult.stream;
            let firstAiText = "";
            let firstAiThoughts = "";

            const firstAiMessageElement = document.createElement("div");
            firstAiMessageElement.classList.add("chat-message", "ai-message");
            firstAiMessageElement.style.whiteSpace = "pre-wrap";

            const mainGreetingSpan = document.createElement("span");
            mainGreetingSpan.className = "main-answer-text";

            if (messagesDivGlobalRef) messagesDivGlobalRef.appendChild(firstAiMessageElement);

            for await (const chunk of firstAiResponseStream) {
                const candidate = chunk.candidates?.[0];
                if (candidate?.content?.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.thought) {
                            firstAiThoughts += part.text + "\n";
                        } else {
                            firstAiText += part.text;
                        }
                    }
                }
                // Dorim ca salutul să apară „instant” (fără effect typewriter), așa că nu mai facem scroll lento– lento
                if (messagesDivGlobalRef) {
                    messagesDivGlobalRef.scrollTop = messagesDivGlobalRef.scrollHeight;
                }
                if (candidate?.finishReason) {
                    console.log("[CHAT_INIT_GREETING] FinishReason salut:", candidate.finishReason);
                    break;
                }
            }

            if (!firstAiText.trim()) {
                firstAiText = aiGreeting.split("✨")[0].trim();
            }

            if (firstAiThoughts.trim()) {
                console.log("[CHAT_INIT_GREETING] Adăugare thoughts la salut în UI.");
                const thoughtsDetails = document.createElement("details");
                thoughtsDetails.className = "ai-thoughts-details";
                thoughtsDetails.innerHTML = `
                    <summary>Proces de gândire (Salut)</summary>
                    <pre class="ai-thoughts-content">${firstAiThoughts.trim()}</pre>
                `;
                firstAiMessageElement.appendChild(thoughtsDetails);
            }

            mainGreetingSpan.innerHTML = formatStreamingMessage(firstAiText);
            firstAiMessageElement.appendChild(mainGreetingSpan);

            if (messagesDivGlobalRef) {
                messagesDivGlobalRef.scrollTop = messagesDivGlobalRef.scrollHeight;
            }

            await saveChatMessage(userId, {
                role: "model",
                content: firstAiText,
                thoughts: firstAiThoughts.trim() || null,
                error: false,
                timestamp: new Date().toISOString()
            });
            console.log("[CHAT_INIT_GREETING] Salut AI salvat.");
        }

        isChatInitialized = true;
        if (sendButton) sendButton.disabled = false;
        console.log("[CHAT_INIT] Sesiune chat AI inițializată și gata.");
    } catch (initError) {
        console.error("[CHAT_INIT] Eroare MAJORĂ la inițializarea sesiunii de chat Gemini:", initError, initError.stack);
        if (chatStatus) chatStatus.textContent = "Eroare critică AI Chat.";
        displayChatMessage(
            `Problemă tehnică gravă la pornirea chat-ului: ${initError.message}. Verificați consola.`,
            "AI-error",
            null
        );
        isChatInitialized = false;
        chatSession = null;
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
        console.error("[HANDLE_SEND] Eroare critică - Elemente HTML esențiale lipsesc.");
        return;
    }

    const messageText = chatInput.value.trim();
    console.log("→ [USER_MSG_SEND] Mesaj utilizator:", JSON.stringify(messageText));
    if (!messageText) return;

    // 1. Afișăm mesajul utilizator pe UI
    displayChatMessage(messageText, "user", null);

    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.error("[AUTH_ERROR] Utilizator neautentificat.");
        chatStatus.textContent = "Eroare: utilizator neautentificat.";
        return;
    }

    // 2. Salvăm mesajul utilizatorului în Firestore
    try {
        await saveChatMessage(currentUser.uid, {
            role: "user",
            content: messageText,
            timestamp: new Date().toISOString()
        });
        console.log("→ [DB_SAVE_USER] Mesajul utilizatorului a fost salvat în Firestore.");
    } catch (e) {
        console.error("[DB_ERROR] Salvare mesaj user eșuată:", e);
        chatStatus.textContent = "Eroare salvare mesaj.";
    }

    // 3. Reset input și UI
    chatInput.value = "";
    sendButton.disabled = true;
    chatStatus.textContent = "PsihoGPT analizează și tastează...";

    // 4. Pregătim containerul pentru răspunsul AI
    const aiMessageElement = document.createElement("div");
    aiMessageElement.classList.add("chat-message", "ai-message");
    aiMessageElement.style.whiteSpace = "pre-wrap";
    messagesDiv.appendChild(aiMessageElement);

    let fullAiResponseText = "";
    let collectedThoughts = "";
    let anErrorOccurred = false;
    let apiErrorMessage = "";

    const CHUNK_SIZE = IS_MOBILE_DEVICE ? 50 : 30;
    const CHUNK_DELAY = IS_MOBILE_DEVICE ? 30 : 20;

    // Helper pentru scroll condiționat
    const isScrolledToBottom = el => {
        const tolerance = 30;
        return el.scrollHeight - el.scrollTop - el.clientHeight < tolerance;
    };

    try {
        // 5. Dacă sesiunea nu e inițializată, apelăm initializeAndStartChatSession
        if (!chatSession || !isChatInitialized) {
            console.log("[CHAT_SESSION] Sesiunea nu e inițializată. Inițializare...");
            const newSession = await initializeAndStartChatSession(currentUser.uid, false);
            if (!newSession) throw new Error("Re-inițializarea sesiunii a eșuat.");
            console.log("[CHAT_SESSION] Sesiune re-inițializată cu succes.");
        }

        // 6. Trimitem mesajul utilizatorului la chatSession deja deschis
        console.log("→ [AI_STREAM] Trimitere către sendMessageStream:", JSON.stringify(messageText));
        const result = await chatSession.sendMessageStream(messageText);
        const stream = result.stream;

        // Procesăm fiecare chunk din stream
        for await (const chunk of stream) {
            console.log("╔══════════ CHUNK (handleSend) ══════════╗");
            console.log(JSON.stringify(chunk, null, 2).substring(0, 500) + "...");
            console.log("╚══════════════════════════════════════╝");

            if (chunk.promptFeedback?.blockReason) {
                apiErrorMessage = `Mesaj blocat (Motiv: ${chunk.promptFeedback.blockReason}).`;
                anErrorOccurred = true;
                console.warn("[AI_STREAM] Stream blocat:", apiErrorMessage);
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
                            collectedThoughts += part.text;
                        } else {
                            fullAiResponseText += part.text;
                        }
                    }
                }
            }

            if (candidate.finishReason) {
                console.log("  [AI_STREAM_CHUNK] finishReason:", candidate.finishReason);
                const errorReasons = ["SAFETY", "RECITATION", "OTHER"];
                if (errorReasons.includes(candidate.finishReason)) {
                    apiErrorMessage = `Generare oprită (Motiv: ${candidate.finishReason}).`;
                    anErrorOccurred = true;
                }
                break;
            }
            if (anErrorOccurred) break;
        }
    } catch (err) {
        console.error("[CRITICAL_ERROR]", err);
        fullAiResponseText = `Eroare critică: ${err.message}`;
        anErrorOccurred = true;
    }

    // 7. Afișăm răspunsul AI şi „gândurile” dacă există
    aiMessageElement.innerHTML = "";
    const mainAnswerSpan = document.createElement("span");
    mainAnswerSpan.className = "main-answer-text";

    if (collectedThoughts.trim()) {
        const thoughtsDetails = document.createElement("details");
        thoughtsDetails.className = "ai-thoughts-details";
        thoughtsDetails.innerHTML = `
            <summary>Procesul de gândire al PsihoGPT</summary>
            <pre class="ai-thoughts-content">${collectedThoughts.trim()}</pre>
        `;
        aiMessageElement.appendChild(thoughtsDetails);
        // Pauză minimală pentru a vedea <details> în UI
        await new Promise(r => setTimeout(r, IS_MOBILE_DEVICE ? 50 : 20));
    }

    aiMessageElement.appendChild(mainAnswerSpan);

    if (anErrorOccurred) {
        // Dacă a fost o eroare în stream, afișăm mesajul de eroare
        mainAnswerSpan.innerHTML = formatStreamingMessage(apiErrorMessage || fullAiResponseText);
        aiMessageElement.classList.add("ai-error");
    } else if (!fullAiResponseText.trim()) {
        // Dacă textul principal e gol și nu există gânduri, afișăm fallback
        const fallbackMsg = "Nu am putut genera un răspuns.";
        mainAnswerSpan.innerHTML = formatStreamingMessage(fallbackMsg);
        fullAiResponseText = fallbackMsg;
        // Dacă e fallback, scroll la final
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } else {
        // 8. Efect typewriter cu scroll condiționat
        const formattedHTML = formatStreamingMessage(fullAiResponseText);
        let currentIndex = 0;

        // Scroll inițial doar dacă utilizatorul era deja jos
        if (isScrolledToBottom(messagesDiv)) {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        while (currentIndex < formattedHTML.length) {
            const wasAtBottom = isScrolledToBottom(messagesDiv);
            const nextChunkEnd = Math.min(currentIndex + CHUNK_SIZE, formattedHTML.length);
            mainAnswerSpan.innerHTML = formattedHTML.substring(0, nextChunkEnd);
            currentIndex = nextChunkEnd;

            if (wasAtBottom) {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            // Pauză pentru efect
            // eslint-disable-next-line no-await-in-loop
            await new Promise(r => setTimeout(r, CHUNK_DELAY));
        }

        // Afișăm tot textul la final și scroll dacă era jos
        mainAnswerSpan.innerHTML = formattedHTML;
        if (isScrolledToBottom(messagesDiv)) {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }

    // 9. Salvăm răspunsul AI în Firestore
    try {
        await saveChatMessage(currentUser.uid, {
            role: "model",
            content: fullAiResponseText.trim(),
            thoughts: collectedThoughts.trim() || null,
            error: anErrorOccurred || fullAiResponseText.toLowerCase().includes("eroare"),
            timestamp: new Date().toISOString()
        });
        console.log("→ [DB_SAVE_MODEL] Răspuns/Eroare AI salvat(ă).");
    } catch (e) {
        console.error("[DB_SAVE_MODEL] Eroare salvare răspuns AI:", e);
        chatStatus.textContent = "Eroare salvare răspuns AI.";
    }

    // 10. Reactivare UI finală
    chatStatus.textContent = anErrorOccurred
        ? "Eroare comunicare AI."
        : "Janet - Psihoterapeut Cognitiv-Comportamental Integrativ";

    sendButton.disabled = !(geminiModelChat && isChatInitialized);
    if (chatInput) chatInput.focus();

    console.log("handleSendChatMessage: Finalizat.");
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
            console.log("[UI_CHAT_TOGGLE] Chat închis.");
        } else {
            chatContainer.style.display = "flex";
            originalToggleButton.style.display = 'none';
            console.log("[UI_CHAT_TOGGLE] Chat deschis. Verificare inițializare sesiune...");

            if (!isChatInitialized || !chatSession) {
                console.log("[UI_CHAT_TOGGLE] Sesiune neinițializată sau resetată, se apelează initializeAndStartChatSession CU isInitialPageLoad = true.");
                const sessionOK = await initializeAndStartChatSession(user.uid, true);
                if (sendButton) sendButton.disabled = !sessionOK;
                console.log("[UI_CHAT_TOGGLE] Rezultat inițializare sesiune:", sessionOK ? "OK" : "EȘUAT");
            } else if (geminiModelChat) {
                sendButton.disabled = false;
                console.log("[UI_CHAT_TOGGLE] Sesiune deja inițializată, buton send activat.");
            } else {
                sendButton.disabled = true;
                console.warn("[UI_CHAT_TOGGLE] Model AI indisponibil, buton send dezactivat.");
            }

            if (chatInput) {
                chatInput.focus();
            }
        }
    }















    async function discussFisaWithChat(fisaData) {
        const user = auth.currentUser;
        if (!user) { alert("Autentificare necesară."); window.location.href = "login.html"; return; }
        const chatContainer = document.getElementById("chatContainer");
        if (chatContainer.style.display === "none" || chatContainer.style.display === "") {
            await handleToggleChat();
        }
        if (!chatSession || !isChatInitialized) {
            displayChatMessage("Eroare: Sesiunea de chat nu e pregătită.", "AI-error"); return;
        }
        const c = fisaData.continut;
        let message = `Salut PsihoGPT,\n\nAș dori să discutăm despre următoarea fișă de monitorizare (datată ${fisaData.dateAfisare || 'N/A'}):\n\n`;
        message += `**Situația:** ${c.situatie || 'N/A'}\n**Gânduri automate:** ${c.ganduri || 'N/A'}\n**Emoții:** ${c.emotii || 'N/A'}\n`;
        message += `**Mod activ:** ${c.mod_activ || 'N/A'}\n**Comportament:** ${c.comportament || 'N/A'}\n**Nevoile profunde:** ${c.nevoi_profunde || 'N/A'}\n`;
        message += `**Ajută comportamentul?:** ${c.ajutor_comportament || 'N/A'}\n**Adult Sănătos (perspectivă):** ${c.adult_sanatos || 'N/A'}\n\n`;
        message += "**Analiza gândurilor:**\n";
        message += `  *Dovezi adevăr:* ${c.dovezi_adevar || 'N/A'}\n  *Dovezi fals:* ${c.dovezi_fals || 'N/A'}\n`;
        message += `  *Expl. alt.:* ${c.explicatie_alternativa || 'N/A'}\n  *Cel mai rău:* ${c.scenariu_negativ || 'N/A'}\n`;
        message += `  *Cel mai bun:* ${c.scenariu_optimist || 'N/A'}\n  *Realist:* ${c.rezultat_realist || 'N/A'}\n`;
        message += `  *Schimbare gândire:* ${c.schimbare_gandire || 'N/A'}\n  *Sfat prieten:* ${c.sfat_prieten || 'N/A'}\n\n`;
        message += "**Clarificări:**\n";
        message += `  *Partea rea?:* ${c.partea_rea || 'N/A'}\n  *Responsabilitate excesivă?:* ${c.responsabilitate || 'N/A'}\n`;
        message += `  *Condamnare eveniment unic?:* ${c.condamnare || 'N/A'}\n  *Termeni extremi?:* ${c.termeni_extremi || 'N/A'}\n`;
        message += `  *Exagerare?:* ${c.exagerare || 'N/A'}\n  *Alți factori?:* ${c.factori_responsabili || 'N/A'}\n`;
        message += `  *Concluzii pripite?:* ${c.concluzii || 'N/A'}\n  *Întrebări fără răspuns?:* ${c.intrebari_fara_raspuns || 'N/A'}\n`;
        message += `  *Focus pe slăbiciuni?:* ${c.slabiciuni || 'N/A'}\n  *Cum ar trebui?:* ${c.cum_ar_trebui || 'N/A'}\n`;
        message += `  *Perfecționism?:* ${c.perfectiune || 'N/A'}\n\n`;
        message += "Ce întrebări sau reflecții ai pentru mine pe baza acestei fișe?";
        const chatInput = document.getElementById("chatInput");
        if(chatInput) {
            chatInput.value = message;
            handleSendChatMessage();
        }
    }

    // --- FUNCȚIA PRINCIPALĂ DE INTRARE (ONLOAD) ---
    // Este definită mai jos, după ce toate funcțiile pe care le apelează sunt definite.
    // Acest lucru asigură că nu vor exista ReferenceError pentru funcțiile apelate din onload.

       // La sfârșitul scriptului, sau într-un loc adecvat
    document.addEventListener('DOMContentLoaded', () => {
        console.log("[DOM_LOADED] DOM complet parsat. Se inițializează referințe UI și event listeners principali...");
        messagesDivGlobalRef = document.getElementById("chatMessages");
        if (!messagesDivGlobalRef) {
            console.error("CRITICAL_DOM_LOAD: Elementul #chatMessages NU a fost găsit!");
        } else {
            console.log("[DOM_LOAD] messagesDivGlobalRef setat cu succes din DOMContentLoaded.");
        }

        // Atașează aici event listener-ii care depind de existența elementelor DOM
        document.getElementById('tabButtonJurnal')?.addEventListener('click', () => showTab('jurnal'));
        document.getElementById('tabButtonFisa')?.addEventListener('click', () => showTab('fisa'));
        // showTab('jurnal'); // Poți apela showTab aici dacă nu depinde de user state încă

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
        console.log("[DOM_LOADED] Event listeners principali atașați.");
    });

    window.onload = function () {
        console.log("[WINDOW_LOAD] Toate resursele paginii încărcate (imagini etc.).");
        // onAuthStateChanged poate rămâne aici, deoarece se ocupă de starea Firebase
        // care este independentă de încărcarea completă a *tuturor* resurselor vizuale.

        onAuthStateChanged(auth, async (user) => {
            console.log("[AUTH_CHANGE] Starea de autentificare s-a schimbat. User:", user ? user.uid : "NULL");
            currentUserId = user ? user.uid : null;
            const mainContentArea = document.getElementById('mainContentArea');
            const cardsContainerArea = document.getElementById('cardsContainerArea');
            const toggleChatBtn = document.getElementById("toggleChatButton");
            const chatContainer = document.getElementById("chatContainer");
            const chatStatus = document.getElementById("chatStatus"); // Pentru a reseta statusul

            if (user) {
                console.log(`[AUTH_CHANGE] Utilizator AUTENTIFICAT: ${user.uid}.`);
                if (mainContentArea) mainContentArea.style.display = '';
                if (cardsContainerArea) cardsContainerArea.style.display = '';
                if (toggleChatBtn) toggleChatBtn.style.display = 'flex';

                // Aceste funcții manipulează DOM-ul, deci e bine să fie apelate după ce DOM-ul e gata.
                // DOMContentLoaded ar trebui să se fi declanșat deja.
                initializeFisaFormFunctionality();
                initializeJurnalFormFunctionality();
                showTab('jurnal'); // Setează tab-ul implicit după ce și DOM-ul e gata și userul e logat

                if (!dataAlreadyLoaded) {
                    console.log("[AUTH_CHANGE] Se încarcă datele inițiale (introspecții) pentru prima dată.");
                    await incarcaToateIntrospectiile(user.uid); // Aceasta manipulează și ea DOM-ul
                    dataAlreadyLoaded = true;
                }
            } else {
                console.log("[AUTH_CHANGE] Utilizator NEAUTENTIFICAT. Redirecționare...");
                if (mainContentArea) mainContentArea.style.display = 'none';
                if (cardsContainerArea) cardsContainerArea.style.display = 'none';
                if (toggleChatBtn) toggleChatBtn.style.display = 'none';
                if (chatContainer) chatContainer.style.display = 'none';
                if (chatStatus) chatStatus.textContent = "Chatul AI nu este activ.";

                isChatInitialized = false;
                chatSession = null;
                if (messagesDivGlobalRef) { // Verifică dacă messagesDivGlobalRef a fost setat
                    messagesDivGlobalRef.innerHTML = "";
                } else {
                    // Dacă DOMContentLoaded nu a rulat încă, încercăm să-l găsim direct
                    const messagesDiv = document.getElementById("chatMessages");
                    if (messagesDiv) messagesDiv.innerHTML = "";
                }


                const loginPath = "login.html";
                if (!window.location.pathname.endsWith(loginPath) && !window.location.pathname.includes("login")) { // Verificare mai robustă
                    console.log(`[AUTH_CHANGE] Redirecționare către ${loginPath}`);
                    window.location.href = loginPath;
                } else {
                    console.log("[AUTH_CHANGE] Deja pe pagina de login sau cale similară, nu se redirecționează.");
                }
            }
        });
        console.log("[WINDOW_LOAD] Listener onAuthStateChanged atașat.");
    };