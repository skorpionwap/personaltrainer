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
    let messagesDivGlobalRef; // Va fi setată în window.onload

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
        console.log("[INIT_FISA] Inițializare funcționalitate formular fișă.");
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
            console.warn("[INIT_FISA] Nu s-au găsit pași pentru formularul fișă.");
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

        if (!form) {
            console.error("[FISA_SAVE] Formularul 'fisaExercitiuForm' nu a fost găsit.");
            return;
        }
        if (!form.checkValidity()) {
            form.reportValidity();
            const currentStepElement = form.querySelector('.form-step-active');
            const firstInvalidField = currentStepElement?.querySelector(':invalid:not(fieldset)');
            if (firstInvalidField) {
                firstInvalidField.focus();
                alert("Vă rugăm completați toate câmpurile obligatorii din pasul curent înainte de a salva.");
            } else {
                alert("Vă rugăm completați toate câmpurile obligatorii din pasul curent.");
            }
            return;
        }

        const continutFisa = {};
        const formData = new FormData(form);
        formData.forEach((value, key) => { continutFisa[key] = value.trim(); });

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
        let originalAddButtonText = addButton ? addButton.textContent : "Salvează Fișa și Generează Feedback AI";
        if (addButton) {
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
                introspectieData.feedbackAI_history = feedbackGenerat && !feedbackGenerat.error && !feedbackGenerat.error_parsing ? [feedbackGenerat] : [];
                afiseazaCardIntrospectie(introspectieData);
            }

            form.reset();
            currentFisaStep = 1;
            document.querySelectorAll('form#fisaExercitiuForm .form-step').forEach(step => step.classList.remove('form-step-active'));
            document.getElementById('fisa-step-1')?.classList.add('form-step-active');
            updateFisaProgressBar();
            console.log("[FISA_SAVE] Formular fișă resetat.");

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
            console.error("[FISA_SAVE] Eroare la salvarea fișei sau generare feedback:", error);
            if (confirmationMessage) {
                confirmationMessage.textContent = 'Eroare la salvarea fișei. Încercați din nou.';
                confirmationMessage.className = 'confirmation-message error';
                confirmationMessage.style.display = 'block';
                 setTimeout(() => { if (confirmationMessage) confirmationMessage.style.display = 'none'; }, 7000);
            }
        } finally {
            if (addButton) {
                addButton.textContent = originalAddButtonText;
                addButton.disabled = false;
            }
        }
    }

    function initializeJurnalFormFunctionality() {
        console.log("[INIT_JURNAL] Inițializare funcționalitate formular jurnal.");
        const promptsContainerEl = document.getElementById("reflectionPrompts");
        const journalTextarea = document.getElementById("journalContent");
        if (!promptsContainerEl || !journalTextarea) {
             console.warn("[INIT_JURNAL] Elemente DOM lipsă pentru formularul jurnal.");
             return;
        }

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
        const journalTextarea = document.getElementById("journalContent");
        const journalTitleInput = document.getElementById("journalTitle");
        const confirmationMessage = document.getElementById('jurnalConfirmationMessage');

        if (!journalTextarea || !journalTitleInput || !confirmationMessage) {
            console.error("[JURNAL_SAVE] Elemente DOM lipsă pentru salvarea jurnalului.");
            return;
        }

        if (journalTextarea.value.trim() === "") {
            alert("Vă rugăm să scrieți ceva în jurnal înainte de a salva.");
            return;
        }

        const tipPromptFolosit = selectedJurnalPrompt ? selectedJurnalPrompt.id : "prompt_personalizat";
        const continutJurnal = {
            titluJurnal: (journalTitleInput.value.trim() !== "") ? journalTitleInput.value.trim() : `Intrare din ${new Date().toLocaleDateString("ro-RO")}`,
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
        const originalButtonText = saveButton ? saveButton.textContent : "Salvează Jurnal și Cere Feedback AI";
        if (saveButton) {
            saveButton.textContent = "Se salvează...";
            saveButton.disabled = true;
        }
        confirmationMessage.style.display = 'none';

        try {
            console.log("[JURNAL_SAVE] Salvare date jurnal în Firestore...");
            const docRef = await addDoc(collection(db, "introspectii"), introspectieData);
            introspectieData.id = docRef.id;
            console.log("[JURNAL_SAVE] Jurnal salvat cu ID:", docRef.id, ". Se generează feedback AI...");
            if (saveButton) saveButton.textContent = "Se generează AI...";

            const parsedFeedback = await genereazaFeedbackPentruIntrospectie(introspectieData);
            console.log("[JURNAL_SAVE] Feedback AI generat:", parsedFeedback ? 'DA' : 'NU', parsedFeedback?.error ? 'CU EROARE' : 'FĂRĂ EROARE');


            const docSnapshot = await getDoc(docRef);
            if (docSnapshot.exists()) {
                afiseazaCardIntrospectie({ id: docSnapshot.id, ...docSnapshot.data() });
            } else {
                 console.warn("[JURNAL_SAVE] Documentul nu a fost găsit imediat după salvare. Folosim date locale.");
                introspectieData.feedbackAI_history = parsedFeedback && !parsedFeedback.error && !parsedFeedback.error_parsing ? [parsedFeedback] : [];
                afiseazaCardIntrospectie(introspectieData);
            }

            journalTextarea.value = "";
            journalTitleInput.value = "";
            toggleActiveJurnalPrompt(false);
            if(selectedJurnalPrompt) selectedJurnalPrompt.previousIdForClearCheck = null;
            console.log("[JURNAL_SAVE] Formular jurnal resetat.");

            confirmationMessage.textContent = parsedFeedback.error ? `Intrare salvată. Feedback AI: ${parsedFeedback.rawText || 'Eroare necunoscută la generare.'}` : 'Intrare salvată și feedback AI generat!';
            confirmationMessage.className = `confirmation-message ${parsedFeedback.error ? 'error' : 'success'}`;
            confirmationMessage.style.display = 'block';
            setTimeout(() => { confirmationMessage.style.display = 'none'; }, 9000);

        } catch (error) {
            console.error("[JURNAL_SAVE] Eroare la salvarea intrării de jurnal sau generare feedback:", error);
            confirmationMessage.textContent = 'Eroare la salvare sau la generarea feedback-ului AI.';
            confirmationMessage.className = 'confirmation-message error';
            confirmationMessage.style.display = 'block';
             setTimeout(() => { confirmationMessage.style.display = 'none'; }, 7000);
        } finally {
            if (saveButton) {
                saveButton.textContent = originalButtonText;
                saveButton.disabled = false;
            }
        }
    }

    async function callGeminiAPI(promptText, modelToUse, generationConfigOptions = {}) {
        if (!modelToUse) {
            console.error("[GEMINI_API] Modelul Gemini specificat este invalid sau neinițializat.");
            return "EROARE: Model AI neinițializat.";
        }
        try {
            const modelIdentifier = modelToUse === geminiModelChat ? "Chat" : (modelToUse === geminiModelFisaFeedback ? "Fișă" : "Jurnal");
            console.log(`[GEMINI_API] Trimitere la Gemini. Model: ${modelIdentifier}, Config: ${JSON.stringify(generationConfigOptions)}, Prompt (primele 100): ${promptText.substring(0, 100)}...`);
            const requestPayload = {
                contents: [{ role: "user", parts: [{ text: promptText }] }],
                generationConfig: { temperature: 0.6, maxOutputTokens: 8192, ...generationConfigOptions }
            };
            const result = await modelToUse.generateContent(requestPayload);
            const response = result.response;

            if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
                if (response.candidates[0].finishReason && !["STOP", "MAX_TOKENS"].includes(response.candidates[0].finishReason)) {
                    console.warn("[GEMINI_API] Generare oprită prematur:", response.candidates[0].finishReason, response.candidates[0].safetyRatings);
                    return `EROARE Gemini: Generare oprită (Motiv: ${response.candidates[0].finishReason}).`;
                }
                console.log("[GEMINI_API] Răspuns primit cu succes.");
                return response.candidates[0].content.parts[0].text;
            } else if (response?.promptFeedback?.blockReason) {
                console.error("[GEMINI_API] Prompt blocat de Gemini:", response.promptFeedback);
                return `EROARE Gemini: Prompt blocat (Motiv: ${response.promptFeedback.blockReason}).`;
            } else {
                console.error("[GEMINI_API] Răspuns Gemini neașteptat sau gol:", JSON.stringify(response, null, 2));
                return "EROARE Gemini: Răspuns invalid/gol.";
            }
        } catch (error) {
            console.error("[GEMINI_API] Eroare detaliată la callGeminiAPI:", error, error.message, error.stack);
            let errorMessage = `EROARE Gemini: ${error.message || "Eroare API necunoscută"}`;
            if (error.toString().toLowerCase().includes("api key not valid") ||
                (error.message && error.message.toLowerCase().includes("permission denied")) ||
                (error.message && error.message.toLowerCase().includes("api_key_invalid")) ||
                (error.status && error.status === 403) ||
                (error.message && error.message.toLowerCase().includes("api_key_not_valid")) ) {
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
        return `Analizează în profunzime această fișă completă de auto-reflecție. Utilizatorul a parcurs un exercițiu detaliat pentru a-și înțelege o situație specifică. Oferă feedback psihologic structurat, empatic și acționabil. Respectă cu strictețe formatul și ordinea secțiunilor de mai jos, folosind exact prefixele indicate (ex: \`EmpatieInițială:\`, \`PuncteForteObservate:\`). Folosește Markdown pentru formatarea textului în interiorul fiecărei secțiuni (ex: \`**Text bold**\`, \`*Text italic*\`, liste cu \`* Element\`).
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
        let guideText = jurnalPromptsList.find(p => p.id === promptUtilizatJurnal)?.text || null;

        let basePrompt = `Ești PsihoGPT ... (promptul tău complet pentru jurnal) ... Mulțumesc!`;
        // ... (logica switch pentru specificInstructions ca înainte) ...
        // ... (construirea promptului final cu ghidReferintaText etc.)
        return `${basePrompt} ... (restul promptului tău) ... Mulțumesc!`;
    }

    async function genereazaFeedbackPentruIntrospectie(introspectieData) {
        console.log(`[FEEDBACK_GEN] Generare feedback pentru ID: ${introspectieData.id}, Tip: ${introspectieData.type}`);
        if (!introspectieData || !introspectieData.id || !introspectieData.type || !introspectieData.continut) {
            return { rawText: "EROARE: Date incomplete pentru feedback.", error: true, timestamp: new Date().toISOString() };
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
            return { rawText: "EROARE: Tip introspecție necunoscut pentru feedback.", error: true, timestamp: new Date().toISOString() };
        }

        const feedbackRawText = await callGeminiAPI(promptText, modelToUse);
        const parsedFeedback = {
            rawText: feedbackRawText,
            model: `Gemini (${modelNameForLog})`,
            timestamp: new Date().toISOString(),
            error: typeof feedbackRawText === 'string' && feedbackRawText.toUpperCase().startsWith("EROARE:"),
            error_parsing: false // Va fi setat la true dacă parsarea eșuează pentru fișe
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
                    console.warn(`[FEEDBACK_PARSE] Secțiunea '${key}' nu a putut fi extrasă din feedback-ul fișei.`);
                    parsedFeedback[key] = `(Secțiune neextrasă: ${key})`;
                    allParsingOk = false;
                }
            }
            if (!allParsingOk) {
                parsedFeedback.error_parsing = true;
                console.warn("[FEEDBACK_PARSE] Parsarea feedback-ului pentru fișă a eșuat parțial.");
            } else {
                 console.log("[FEEDBACK_PARSE] Feedback fișă parsat cu succes.");
            }
        } else if (introspectieData.type === 'jurnal' && !parsedFeedback.error) {
            parsedFeedback.promptTypeAtGeneration = introspectieData.continut.promptUtilizatJurnal || "necunoscut";
        }

        const docRef = doc(db, "introspectii", introspectieData.id);
        try {
            await updateDoc(docRef, { feedbackAI_history: arrayUnion(parsedFeedback) });
            console.log(`[FEEDBACK_SAVE] Feedback AI (tip: ${introspectieData.type}) salvat pentru introspecție ID: ${introspectieData.id}`);
        } catch (updateError) {
            console.error(`[FEEDBACK_SAVE] Eroare la actualizarea feedback-ului în Firestore pentru ID ${introspectieData.id}:`, updateError);
        }
        return parsedFeedback;
    }

    async function incarcaToateIntrospectiile(userId) {
        console.log(`[LOAD_INTROSPECTIONS] Încărcare toate introspecțiile pentru user ID: ${userId}`);
        const container = document.getElementById("introspectiiCardContainer");
        if (!container || !userId) {
            console.warn("[LOAD_INTROSPECTIONS] Container sau User ID lipsă.");
            return;
        }
        let loadingMsg = container.querySelector(".loading-message");
        if (!container.querySelector('.introspectie-card') && !loadingMsg) {
            loadingMsg = document.createElement("p");
            loadingMsg.className = "loading-message";
            loadingMsg.textContent = "Se încarcă introspecțiile...";
            container.appendChild(loadingMsg);
        }

        try {
            const q = query(collection(db, "introspectii"), where("ownerUid", "==", userId), orderBy("timestampCreare", "desc"));
            console.log("[LOAD_INTROSPECTIONS] Query Firestore construit. Se așteaptă getDocs...");
            const querySnapshotFromFirestore = await getDocs(q);
            console.log("[LOAD_INTROSPECTIONS] Rezultat getDocs primit. Definit?", typeof querySnapshotFromFirestore !== 'undefined');

            if (loadingMsg) loadingMsg.remove();
            container.innerHTML = '';

            if (!querySnapshotFromFirestore) {
                console.error("[LOAD_INTROSPECTIONS] FATAL: querySnapshotFromFirestore este undefined după await!");
                container.innerHTML = "<p class='error-loading-message'>Eroare internă la preluarea datelor introspecțiilor.</p>";
                return;
            }

            if (querySnapshotFromFirestore.empty) {
                console.log("[LOAD_INTROSPECTIONS] Nicio introspecție găsită în Firestore.");
                container.innerHTML = "<p class='no-entries-message'>Nicio introspecție salvată.</p>";
            } else {
                console.log(`[LOAD_INTROSPECTIONS] Găsit ${querySnapshotFromFirestore.docs.length} introspecții.`);
                querySnapshotFromFirestore.forEach((docSnap) => {
                    afiseazaCardIntrospectie({ id: docSnap.id, ...docSnap.data() });
                });
            }
        } catch (error) {
            console.error("[LOAD_INTROSPECTIONS] Eroare în blocul try/catch:", error, error.stack);
            if (loadingMsg) loadingMsg.remove();
            if (container && !container.querySelector('.introspectie-card')) {
                 container.innerHTML = "<p class='error-loading-message'>Eroare la încărcarea introspecțiilor.</p>";
            }
        }
    }

    function afiseazaIstoricFeedbackIntrospectie(containerEl, feedbackHistory) {
        // ... (codul tău existent, nemodificat) ...
    }
    function afiseazaCardIntrospectie(docData) {
        // ... (codul tău existent, nemodificat) ...
    }
    async function regenereazaFeedbackPentruIntrospectieCard(introspectieId) {
        // ... (codul tău existent, nemodificat) ...
    }
    async function stergeUltimulFeedbackIntrospectie(introspectieId) {
        // ... (codul tău existent, nemodificat) ...
    }
    async function stergeTotIstoriculFeedbackIntrospectie(introspectieId) {
        // ... (codul tău existent, nemodificat) ...
    }
    async function stergeIntrospectie(id, cardElement) {
        // ... (codul tău existent, nemodificat) ...
    }

    // --- FUNCȚII PENTRU CHAT ---
    // (formatStreamingMessage, displayChatMessage, loadChatHistory, saveChatMessage, getInitialContextSummary - definite mai sus)
    // (initializeAndStartChatSession, handleSendChatMessage - definite mai sus)

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
        console.log("[DISCUSS_FISA] Se încearcă discutarea fișei:", fisaData?.continut?.situatie?.substring(0,30) + "...");
        const user = auth.currentUser;
        if (!user) { alert("Autentificare necesară."); window.location.href = "login.html"; return; }

        const chatContainer = document.getElementById("chatContainer");
        if (!chatContainer) {
            console.error("[DISCUSS_FISA] Containerul de chat nu a fost găsit.");
            return;
        }
        // Deschide și inițializează chat-ul dacă nu e deja activ
        if (chatContainer.style.display === "none" || chatContainer.style.display === "" || !isChatInitialized || !chatSession) {
            console.log("[DISCUSS_FISA] Chat-ul nu este activ/inițializat, se deschide și se inițializează...");
            // Asigură-te că handleToggleChat va apela initializeAndStartChatSession corect
            // Forțăm o stare care să ducă la inițializare dacă e nevoie
            if (chatContainer.style.display === "none" || chatContainer.style.display === "") {
                // Simulează că e închis pentru ca handleToggleChat să-l deschidă și inițializeze
                 chatContainer.style.display = "none"; // Asigură că isChatCurrentlyOpen e false în toggle
            }
            isChatInitialized = false; // Forțează re-inițializarea în handleToggleChat
            chatSession = null;
            await handleToggleChat();
        }

        if (!chatSession || !isChatInitialized) { // Verifică din nou după posibilul await
            console.log("[DISCUSS_FISA] Așteptare scurtă pentru inițializarea chat-ului post-toggle...");
            await new Promise(resolve => setTimeout(resolve, 700)); // Mărit puțin delay-ul
        }

        if (!chatSession || !isChatInitialized) {
            console.error("[DISCUSS_FISA] EROARE: Sesiunea de chat nu este pregătită nici după așteptare pentru a discuta fișa.");
            displayChatMessage("Eroare: Sesiunea de chat nu e pregătită. Reîncearcă deschiderea chat-ului manual.", "AI-error", null);
            return;
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
        if (chatInput) {
            chatInput.value = message;
            console.log("[DISCUSS_FISA] Se trimite fișa la chat...");
            await handleSendChatMessage(); // Asigură-te că acesta așteaptă dacă e async
        } else {
            console.error("[DISCUSS_FISA] Elementul chatInput nu a fost găsit.");
        }
    }


    // --- FUNCȚIA PRINCIPALĂ DE INTRARE (ONLOAD) ---
    window.onload = function () {
        console.log("DOM complet încărcat. Se inițializează aplicația...");
        messagesDivGlobalRef = document.getElementById("chatMessages");
        if (!messagesDivGlobalRef) {
            console.error("CRITICAL_ONLOAD: Elementul #chatMessages nu a fost găsit!");
        } else {
            console.log("[ONLOAD] messagesDivGlobalRef setat cu succes.");
        }

        document.getElementById('tabButtonJurnal')?.addEventListener('click', () => showTab('jurnal'));
        document.getElementById('tabButtonFisa')?.addEventListener('click', () => showTab('fisa'));
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
                    console.log("[AUTH_CHANGE] Se încarcă datele inițiale (introspecții) pentru prima dată.");
                    await incarcaToateIntrospectiile(user.uid);
                    dataAlreadyLoaded = true;
                }
            } else {
                console.log("[AUTH_CHANGE] Utilizator NEAUTENTIFICAT. Redirecționare către login.html...");
                if (mainContentArea) mainContentArea.style.display = 'none';
                if (cardsContainerArea) cardsContainerArea.style.display = 'none';
                if (toggleChatBtn) toggleChatBtn.style.display = 'none';
                if (chatContainer) chatContainer.style.display = 'none';
                if (chatStatus) chatStatus.textContent = "Chatul AI nu este activ.";

                isChatInitialized = false;
                chatSession = null;
                if (messagesDivGlobalRef) messagesDivGlobalRef.innerHTML = "";

                // Oprește redirecționarea dacă suntem deja pe login.html pentru a evita bucla
                if (!window.location.pathname.endsWith("login.html") && !window.location.pathname.endsWith("login")) {
                    window.location.href = "login.html";
                } else {
                    console.log("[AUTH_CHANGE] Deja pe pagina de login sau cale similară, nu se redirecționează.");
                }
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