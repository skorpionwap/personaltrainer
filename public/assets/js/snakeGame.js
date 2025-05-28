// --- assets/js/snakeGame.js ---

// Variabile la nivel de modul pentru a gestiona starea jocului
let gameInstance = null;
let gameInitialized = false;
let gameVisibleAndActive = false;

// DOM Elements
let snakeGameModalContainer; // Containerul principal al modalului (din psihoterapie.html)
let snakeGameWrapper;        // Wrapper-ul intern injectat în modal, unde se randează jocul
let closeSnakeGameModalButton; // Butonul de închidere din interiorul modalului jocului

// --- Variabile de configurare ---
const INITIAL_SNAKE_SPEED = 170; // Viteza inițială, scade cu nivelul
const BOX_SIZE = 20;
const LEVEL_SCORE_INCREMENT = 25; // Puncte necesare per nivel (aproximativ)
const PARTICLE_COUNT = 10; // Număr de particule la colectare

// --- HTML STRUCTURE FOR THE GAME MODAL (injectat o singură dată) ---
const gameModalHTMLStructure = `
    <div id="snakeGameModalContent" class="bg-gray-900 p-1 sm:p-2 rounded-lg shadow-xl relative w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto" style="aspect-ratio: 4/3.5; display: flex; flex-direction: column;">
        <button id="closeSnakeGameModal" class="absolute top-1 right-1 text-white bg-red-600 hover:bg-red-700 rounded-full p-0 w-7 h-7 flex items-center justify-center text-sm z-50" title="Închide Jocul">×</button>
        <div id="snakeGameWrapper" class="game-wrapper h-full w-full flex-grow" style="display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #222c36; border-radius: 0.5rem;">
            <!-- Conținutul efectiv al jocului (gameInterfaceHTMLStructure) va fi injectat aici de initializeSnakeGame -->
        </div>
    </div>
`;

// --- HTML STRUCTURE FOR THE GAME INTERFACE (injectat în snakeGameWrapper) ---
const gameInterfaceHTMLStructure = `
    <div id="snakeGameInterface" class="text-gray-200 text-center w-full h-full flex flex-col p-2" style="background: #293446;">
      <h2 class="text-xl sm:text-2xl text-yellow-300 mb-1 font-semibold">Snake 🐍 – Călătoria Interioară</h2>
      <div class="score text-xs sm:text-sm mb-1" aria-live="polite">
        Scor: <span id="snakeScore" class="font-bold text-green-400">0</span> |
        Maxim: <span id="snakeHighScore" class="font-bold text-yellow-400">0</span> |
        Nivel: <span id="snakeLevelDisplay" class="font-bold text-blue-400">1</span>
      </div>
      <div class="values text-xs sm:text-sm mb-1 flex justify-center gap-2 sm:gap-3" aria-live="polite">
        <span>💙 Emp: <span id="snakeEmpatie" class="font-semibold">0</span></span>
        <span>🦁 Cur: <span id="snakeCuraj" class="font-semibold">0</span></span>
        <span>⏳ Răb: <span id="snakeRabdare" class="font-semibold">0</span></span>
      </div>
      <div id="snakeIntro" class="hidden bg-gray-700 p-2 sm:p-3 rounded-lg my-1 text-sm text-center" role="dialog"></div>
      <canvas id="snakeCanvas" width="320" height="320" tabindex="0" aria-label="Joc Snake" class="focus:outline-none focus:ring-2 focus:ring-green-500 rounded-md shadow-lg block mx-auto mb-1 flex-shrink-0" style="background: #1d2230; max-width: 100%; height: auto;"></canvas>
      <div id="snakeStatus" class="flex gap-1 sm:gap-2 justify-center my-1 text-xs sm:text-sm" aria-live="polite"></div>
      <div id="snakeControls" class="controls text-gray-400 text-xs sm:text-sm mb-1">Săgeți/WASD | Space/P: Pauză | J: Jurnal | M: Magazin</div>
      <div class="flex gap-1 sm:gap-2 justify-center mt-auto flex-wrap">
        <button id="snakeRestartBtn" class="hidden px-2 py-1 sm:px-3 sm:py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm rounded-md shadow">Restart Nivel</button>
        <button id="snakeFullResetBtn" class="px-2 py-1 sm:px-3 sm:py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs sm:text-sm rounded-md shadow">Reset Joc</button>
        <button id="snakeJournalBtn" class="px-2 py-1 sm:px-3 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded-md shadow">Jurnal</button>
        <button id="snakeShopBtn" class="px-2 py-1 sm:px-3 sm:py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs sm:text-sm rounded-md shadow">Magazin</button>
        <button id="snakeLangBtn" class="px-2 py-1 sm:px-3 sm:py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm rounded-md shadow">English</button>
      </div>

      <!-- Modals (ascunse inițial) -->
      <div id="snakeJournalModal" class="modal-overlay hidden"><div class="modal-content"><h3 class="modal-title">Jurnal Emoțional (Joc)</h3><textarea id="snakeJournalEntry" class="modal-textarea" rows="5" placeholder="Notează-ți gândurile..."></textarea><div id="snakeViewJournalContent" class="modal-scroll-content hidden"></div><div class="modal-actions"><button id="snakeSaveJournal" class="modal-btn-primary">Salvează</button><button id="snakeExportJournal" class="modal-btn-secondary">Export PDF</button><button id="snakeViewJournal" class="modal-btn-neutral">Vezi Intrări</button><button id="snakeCloseJournalModal" class="modal-btn-danger">Închide</button></div></div></div>
      <div id="snakeShopModal" class="modal-overlay hidden"><div class="modal-content"><h3 class="modal-title">Magazin Interior (Joc)</h3><div id="snakeShopItems" class="grid gap-2"></div><div class="modal-actions"><button id="snakeCloseShopModal" class="modal-btn-danger w-full">Închide Magazin</button></div></div></div>
      <div id="snakeMinigameModal" class="modal-overlay hidden"><div class="modal-content text-center"><div id="snakeMinigameContent"></div><div class="modal-actions"><button id="snakeCloseMinigameModal" class="modal-btn-danger w-full">Închide Minijoc</button></div></div></div>
      <div id="snakeEffect" class="game-effect" aria-live="assertive"></div>
    </div>
`;

// --- SOUND EFFECTS (Placeholder) ---
// const sounds = { eat: new Audio('path/to/eat.mp3'), /* ... */ };
// function playSound(soundName) { if (sounds[soundName]) sounds[soundName].play(); }


function initializeSnakeGame() {
    if (!snakeGameWrapper) {
        console.error("CRITICAL ERROR: #snakeGameWrapper nu a fost găsit în DOM când s-a apelat initializeSnakeGame.");
        return null;
    }
    snakeGameWrapper.innerHTML = gameInterfaceHTMLStructure;

    const canvas = document.getElementById('snakeCanvas');
    if (!canvas) {
        console.error("Elementul canvas #snakeCanvas nu a fost găsit după injectarea gameInterfaceHTMLStructure!");
        return null;
    }
    const ctx = canvas.getContext('2d');
    const box = BOX_SIZE; // Renamed from 'box' in standalone to avoid conflict with local 'box' var

    function resizeCanvas() {
        const parentInterface = canvas.parentElement;
        const gameModalContent = document.getElementById('snakeGameModalContent');

        if (!parentInterface || !gameModalContent) {
            console.warn("Nu s-a putut redimensiona canvas-ul: #snakeGameInterface sau #snakeGameModalContent lipsesc.");
            canvas.width = BOX_SIZE * 15; canvas.height = BOX_SIZE * 15; // Fallback decent
            return;
        }
        console.log("--- resizeCanvas START ---");
        
        const interfacePaddingLeft = parseInt(getComputedStyle(parentInterface).paddingLeft) || 0;
        const interfacePaddingRight = parseInt(getComputedStyle(parentInterface).paddingRight) || 0;
        const availableWidth = parentInterface.clientWidth - interfacePaddingLeft - interfacePaddingRight - 5;
        
        let nonCanvasHeight = 0;
        const uiElementsToMeasure = [
            parentInterface.querySelector('h2'), parentInterface.querySelector('.score'),
            parentInterface.querySelector('.values'), parentInterface.querySelector('#snakeIntro:not(.hidden)'),
            parentInterface.querySelector('#snakeStatus'), parentInterface.querySelector('#snakeControls'),
            parentInterface.querySelector('.flex.gap-1.justify-center.mt-auto.flex-wrap'),
        ];
        
        console.log("Elements to measure for nonCanvasHeight:");
        uiElementsToMeasure.forEach((el, index) => {
            if (el) {
                const elHeight = el.offsetHeight;
                let marginTop = parseInt(getComputedStyle(el).marginTop) || 0;
                const marginBottom = parseInt(getComputedStyle(el).marginBottom) || 0;
                
                const elClasses = el.className || ""; const elId = el.id || "";
                if (elClasses.includes("values")) {
                    const intendedMarginTop = 0; // .values has mb-1, no explicit top margin
                    if (marginTop !== intendedMarginTop && marginTop > 10) { // Check for suspicious large margin
                        console.log(`  - Correcting marginTop for '.values' from ${marginTop} to ${intendedMarginTop}`);
                        marginTop = intendedMarginTop;
                    }
                } else if (elId === "snakeStatus") {
                    const intendedMarginTop = 4; // my-1 -> 0.25rem -> 4px
                     if (marginTop !== intendedMarginTop && marginTop > 10) {
                        console.log(`  - Correcting marginTop for '#snakeStatus' from ${marginTop} to ${intendedMarginTop}`);
                        marginTop = intendedMarginTop;
                    }
                }
                nonCanvasHeight += elHeight + marginTop + marginBottom;
                let elIdentifier = elId ? `#${elId}` : (elClasses ? `.${elClasses.split(" ")[0]}` : el.tagName);
                console.log(`  - Element ${index} (${elIdentifier}): height=${elHeight}, marginTop=${marginTop}(used), marginBottom=${marginBottom}. Current nonCanvasHeight=${nonCanvasHeight}`);
            } else { console.log(`  - Element ${index}: not found or not visible.`); }
        });

        const interfacePaddingTop = parseInt(getComputedStyle(parentInterface).paddingTop) || 0;
        const interfacePaddingBottom = parseInt(getComputedStyle(parentInterface).paddingBottom) || 0;
        nonCanvasHeight += interfacePaddingTop + interfacePaddingBottom + 5; // Padding-ul containerului + marjă
        
        console.log("Total nonCanvasHeight (incl. parentInterface padding):", nonCanvasHeight);
        console.log("ParentInterface clientHeight:", parentInterface.clientHeight);

        const availableHeight = parentInterface.clientHeight - nonCanvasHeight;

        if (availableWidth <= BOX_SIZE * 5 || availableHeight <= BOX_SIZE * 5) { // Min 5 boxes
            console.warn(`Dimensiuni disponibile pentru canvas sunt prea mici. W: ${availableWidth}, H: ${availableHeight}. Fallback.`);
            canvas.width = BOX_SIZE * 15; canvas.height = BOX_SIZE * 15;
            console.log("--- resizeCanvas END (fallback to 15x15 boxes) ---");
            return;
        }
        
        const newSizeBase = Math.min(availableWidth, availableHeight);
        canvas.width = Math.floor(newSizeBase / box) * box;
        canvas.height = Math.floor(newSizeBase / box) * box;

        console.log(`Canvas resized to: ${canvas.width}x${canvas.height} (based on available W/H: ${availableWidth.toFixed(0)}/${availableHeight.toFixed(0)})`);
        console.log("--- resizeCanvas END ---");
    }
    // resizeCanvas(); // Apel inițial la crearea jocului - se va face după ce modalul e vizibil

    // --- Starea jocului, DOM elements ---
    let snake, dir, food, score, currentSpeed, highScore, currentLevel;
    let paused, over, wallPass, magnet, shield;
    let activeColor, specialItem, effects, effectIdCounter, particles, obstacles;
    let values, collectedAnalytics, analytics; // collectedAnalytics for per-session, values for persistent
    let lastFrameTime, repelFoodCountdown, journalEntries, language;
    let slowMotionActive, clarityMapActive, breathingMinigameActive;

    const scoreEl = document.getElementById('snakeScore'), highScoreEl = document.getElementById('snakeHighScore');
    const levelDisplayEl = document.getElementById('snakeLevelDisplay'), effectEl = document.getElementById('snakeEffect');
    const statusBar = document.getElementById('snakeStatus'), restartBtn = document.getElementById('snakeRestartBtn');
    const fullResetBtn = document.getElementById('snakeFullResetBtn'), introEl = document.getElementById('snakeIntro');
    const journalBtn = document.getElementById('snakeJournalBtn'), journalModal = document.getElementById('snakeJournalModal');
    const journalEntry = document.getElementById('snakeJournalEntry'), saveJournalBtn = document.getElementById('snakeSaveJournal');
    const exportJournalBtn = document.getElementById('snakeExportJournal'), viewJournalBtn = document.getElementById('snakeViewJournal');
    const closeJournalModalBtn = document.getElementById('snakeCloseJournalModal'), viewJournalContentEl = document.getElementById('snakeViewJournalContent');
    const shopBtn = document.getElementById('snakeShopBtn'), shopModal = document.getElementById('snakeShopModal');
    const shopItemsEl = document.getElementById('snakeShopItems'), closeShopModalBtn = document.getElementById('snakeCloseShopModal');
    const minigameModal = document.getElementById('snakeMinigameModal'), minigameContentEl = document.getElementById('snakeMinigameContent');
    const closeMinigameModalBtn = document.getElementById('snakeCloseMinigameModal'), langBtn = document.getElementById('snakeLangBtn');
    const controlsEl = document.getElementById('snakeControls');
    const valueEls = { empatie: document.getElementById('snakeEmpatie'), curaj: document.getElementById('snakeCuraj'), rabdare: document.getElementById('snakeRabdare') };

    // --- ÎNCĂRCARE/SALVARE STARE JOC ---
    function loadGameState() {
        highScore = parseInt(localStorage.getItem('snakeGameHighScoreV3')) || 0;
        currentLevel = parseInt(localStorage.getItem('snakeGameCurrentLevelV3')) || 0;
        score = parseInt(localStorage.getItem('snakeGameScoreV3')) || 0; // Score might reset per level, or be persistent based on design
        values = JSON.parse(localStorage.getItem('snakeGameValuesV3')) || { empatie: 0, curaj: 0, rabdare: 0 };
        shield = JSON.parse(localStorage.getItem('snakeGameShieldV3')) || { level: 1, hits: 1 };
        slowMotionActive = JSON.parse(localStorage.getItem('snakeGameSlowMotionV3')) || false;
        clarityMapActive = JSON.parse(localStorage.getItem('snakeGameClarityMapV3')) || false;
        journalEntries = JSON.parse(localStorage.getItem('snakeGameJournalV3')) || [];
        analytics = { sessions: JSON.parse(localStorage.getItem('snakeGameAnalyticsV3')) || [], currentSession: {} };
        language = localStorage.getItem('snakeGameLanguageV3') || 'ro';
        if(highScoreEl) highScoreEl.textContent = highScore;
    }
    function saveGameState() {
        localStorage.setItem('snakeGameHighScoreV3', highScore);
        localStorage.setItem('snakeGameCurrentLevelV3', currentLevel);
        localStorage.setItem('snakeGameScoreV3', score);
        localStorage.setItem('snakeGameValuesV3', JSON.stringify(values));
        localStorage.setItem('snakeGameShieldV3', JSON.stringify(shield));
        localStorage.setItem('snakeGameSlowMotionV3', slowMotionActive);
        localStorage.setItem('snakeGameClarityMapV3', clarityMapActive);
        localStorage.setItem('snakeGameJournalV3', JSON.stringify(journalEntries));
        localStorage.setItem('snakeGameAnalyticsV3', JSON.stringify(analytics.sessions));
        localStorage.setItem('snakeGameLanguageV3', language);
    }
    loadGameState();

    // ---------- TRANSLATIONS, LEVELS, SPECIALS, SHOP ITEMS (din snakeGame.js original, adaptat) ----------
    const translations = { ro: { score: 'Scor', highScore: 'Maxim', restart: 'Restart Nivel', journal: 'Jurnal', shop: 'Magazin', controls: 'Săgeți/WASD | Space/P: Pauză | J: Jurnal | M: Magazin', save: 'Salvează', export: 'Export PDF', view: 'Vezi Intrări', journalSaved: 'Jurnal salvat!', journalEmpty: 'Jurnalul este gol.', close: 'Închide', emotionalSummary: 'Rezumat Emoțional', courageFeedback: '🦁 Curajul tău crește! Explorează ce te face puternic.', frustrationFeedback: '🌩️ Ai simțit frustrare. O pauză sau o respirație adâncă pot ajuta.', shieldProtect: '🛡️ Scutul a protejat Copilul Interior', curaj: 'Curaj', rabdare: 'Răbdare', empatie: 'Empatie', acceptare: 'Acceptare', frustrare: 'Frustrare', motivatie: 'Motivație', copil: 'Copil Interior', adult: 'Adult Sănătos', critic: 'Critic Interior', abandon: 'Abandon', izolare: 'Izolare', shopTitle: 'Magazin Interior', dailyQuest: 'Provocarea zilei: Colectează 3 ⭐ Motivație și scrie un gând recunoscător în jurnal.', breathing: 'Exercițiu de Respirație Conștientă', reframe: 'Alege o Afirmație Pozitivă:', stuck: 'Blocaj? Scrie ce te apasă în jurnal.', purchased: 'Cumpărat', InsufficientValues: 'Valori insuficiente!', level: 'Nivel', fullReset: 'Reset Joc Complet', Felicitări: 'Felicitări!', 'Ai finalizat Călătoria Interioară!': 'Ai finalizat Călătoria Interioară!', 'Poți continua explorarea sau reseta jocul.': 'Poți continua explorarea sau reseta jocul.', 'MaxedOut': 'Nivel Maxim', 'achiziționat': 'achiziționat', 'Nivelul': 'Nivelul', 'Ești sigur că vrei să resetezi tot progresul jocului?': 'Ești sigur că vrei să resetezi tot progresul jocului?' }, en: { score: 'Score', highScore: 'High Score', restart: 'Restart Level', journal: 'Journal', shop: 'Shop', controls: 'Arrows/WASD | Space/P: Pause | J: Journal | M: Shop', save: 'Save', export: 'Export PDF', view: 'View Entries', journalSaved: 'Journal saved!', journalEmpty: 'Journal is empty.', close: 'Close', emotionalSummary: 'Emotional Summary', courageFeedback: '🦁 Your courage grows! Explore what makes you strong.', frustrationFeedback: '🌩️ You felt frustration. A break or deep breath can help.', shieldProtect: '🛡️ Shield protected the Inner Child', curaj: 'Courage', rabdare: 'Patience', empatie: 'Empathy', acceptare: 'Acceptance', frustrare: 'Frustration', motivatie: 'Motivation', copil: 'Inner Child', adult: 'Healthy Adult', critic: 'Inner Critic', abandon: 'Abandonment', izolare: 'Isolation', shopTitle: 'Inner Shop', dailyQuest: 'Daily Quest: Collect 3 ⭐ Motivation and write a grateful thought in your journal.', breathing: 'Mindful Breathing Exercise', reframe: 'Choose a Positive Affirmation:', stuck: 'Feeling stuck? Write what troubles you in the journal.', purchased: 'Purchased', InsufficientValues: 'Insufficient values!', level: 'Level', fullReset: 'Full Game Reset', Felicitări: 'Congratulations!', 'Ai finalizat Călătoria Interioară!': 'You have completed the Inner Journey!', 'Poți continua explorarea sau reseta jocul.': 'You can continue exploring or reset the game.', 'MaxedOut': 'Max Level', 'achiziționat': 'purchased', 'Nivelul': 'Level', 'Ești sigur că vrei să resetezi tot progresul jocului?': 'Are you sure you want to reset all game progress?' } };
    const gameLevels = [ // Renamed from 'levels' to avoid conflict
        { theme: 'Curaj', message: 'Explorează curajul. Ce te motivează?', specialTypes: ['curaj', 'motivatie'], obstacles: 1, bgColor: 'rgba(255, 179, 71, 0.3)', snakeColor: '#ffb347', mechanic: null, speedFactor: 1 },
        { theme: 'Răbdare', message: 'Practică răbdarea. Cum te ajută să te calmezi?', specialTypes: ['rabdare', 'acceptare'], obstacles: 2, bgColor: 'rgba(126, 217, 87, 0.3)', snakeColor: '#7ed957', mechanic: 'slowObstacles', speedFactor: 1.05 },
        { theme: 'Empatie', message: 'Conectează-te. Ce simți când ești empatic?', specialTypes: ['empatie', 'adult'], obstacles: 1, bgColor: 'rgba(89, 165, 224, 0.3)', snakeColor: '#59a5e0', mechanic: 'magnetFood', speedFactor: 1.1 },
        { theme: 'Acceptare', message: 'Acceptă vulnerabilitățile. Ce te eliberează?', specialTypes: ['acceptare', 'copil', 'rabdare'], obstacles: 2, bgColor: 'rgba(179, 136, 255, 0.3)', snakeColor: '#b388ff', mechanic: 'wallPassTemp', speedFactor: 1.15 },
        { theme: 'Înfruntarea Criticului', message: 'Înfruntă criticul. Ce îți spui pentru a merge mai departe?', specialTypes: ['critic', 'abandon', 'motivatie', 'adult'], obstacles: 0, bgColor: 'rgba(208, 0, 0, 0.4)', snakeColor: '#d00000', mechanic: 'bossCritique', speedFactor: 1.2 }
    ];
    const specialTemplates = [
        { type: 'curaj', symbol: '🦁', color: '#ffb347', valueType: 'curaj', points: 1, duration: 5000, effect: () => { multScoreFactor = 1.5; activeColor = '#ffb347'; flash(t('curaj') + ' Boost!', 3000, 'good'); addActiveEffect(t('curaj') + ' Boost', 5000, () => multScoreFactor = 1); } },
        { type: 'rabdare', symbol: '⏳', color: '#7ed957', valueType: 'rabdare', points: 1, duration: 7000, effect: () => { const oldSpeed = currentSpeed; currentSpeed *= 1.5; activeColor = '#7ed957'; flash(t('rabdare') + ' Slow!', 5000, 'good'); addActiveEffect(t('rabdare') + ' Slow', 7000, () => currentSpeed = oldSpeed); } },
        { type: 'empatie', symbol: '💙', color: '#59a5e0', valueType: 'empatie', points: 1, duration: 8000, effect: () => { magnet = true; flash(t('empatie') + ' Magnet Activ!', 3000, 'good'); addActiveEffect(t('empatie') + ' Magnet', 8000, () => magnet = false); } },
        { type: 'acceptare', symbol: '🌀', color: '#b388ff', valueType: 'acceptare', points: 1, duration: 6000, effect: () => { wallPass = true; flash(t('acceptare') + ' - Treci prin Ziduri!', 3000, 'good'); addActiveEffect(t('acceptare') + ' Ziduri', 6000, () => wallPass = false); } },
        { type: 'motivatie', symbol: '⭐', color: '#ffe166', valueType: 'motivatie', points: 1, effect: () => { score += 5 * multScoreFactor; updateScoreDisplay(); flash(t('motivatie') + ' +5 Pcte!', 2000, 'good'); } },
        { type: 'copil', symbol: '👶🛡️', color: '#ffd1dc', valueType: 'copil', points: 0, effect: () => { if(shield) shield.hits = Math.max(shield.hits, shield.level); flash(t('copil') + ' Protejat!', 2000, 'good'); } },
        { type: 'adult', symbol: '🧘', color: '#90e0ef', valueType: 'adult', points: 0, duration: 7000, effect: () => { endNegativeEffects(); multScoreFactor = 1.2; activeColor = '#90e0ef'; flash(t('adult') + ' Prezent!', 3000, 'good'); addActiveEffect(t('adult') + ' Prezent', 7000, () => multScoreFactor = 1); } },
        { type: 'critic', symbol: '🗣️💬', color: '#d00000', negative: true, duration: 3000, effect: () => { invertDirection(); flash(t('critic') + ' Interior Activ!', 3000, 'bad'); addActiveEffect(t('critic') + ' Inversat', 3000, null, true); } },
        { type: 'abandon', symbol: '💔', color: '#6d6875', negative: true, duration: 4000, effect: () => { shrinkSnake(); flash(t('abandon') + ' - Te Simți Mic...', 3000, 'bad'); addActiveEffect(t('abandon') + ' Micșorat', 4000, null, true); } },
        { type: 'izolare', symbol: '🧱', color: '#5a189a', negative: true, duration: 5000, effect: () => { repelFoodCountdown = Math.floor(5000 / (currentSpeed || INITIAL_SNAKE_SPEED)); flash(t('izolare') + ' - Mâncarea Fuge!', 3000, 'bad'); addActiveEffect(t('izolare') + ' Repulsie', 5000, null, true); } },
        { type: 'frustrare', symbol: '🤯', color: '#ff686b', negative: true, duration: 3000, effect: () => { const oldSpeed = currentSpeed; currentSpeed *= 0.6; activeColor = '#ff3030'; flash(t('frustrare') + ' Intensă!', 3000, 'bad'); addActiveEffect(t('frustrare') + ' Viteză↑', 3000, () => currentSpeed = oldSpeed, true); } }
    ];
    let multScoreFactor = 1; // Replaces 'mult' for clarity
    const shopItemsList = [
        { id: 'shieldUpgrade', name: 'Upgrade Scut Copil', cost: { curaj: 5, rabdare: 3 }, effect: () => { shield.level++; shield.hits = shield.level; flash('Scut Îmbunătățit la Nivelul ' + shield.level); saveGameState(); }, maxLevel: 3, currentLevelFn: () => shield.level-1 },
        { id: 'slowMotionActivate', name: 'Activare Respirație Liniștitoare (Tasta R)', cost: { rabdare: 3, empatie: 2 }, effect: () => { slowMotionActive = true; flash('Respirația Liniștitoare poate fi activată cu R.'); saveGameState(); }, oneTimePurchase: true, purchasedFn: () => slowMotionActive },
        { id: 'clarityMapActivate', name: 'Activare Hartă Claritate (Obstacole Vizibile)', cost: { empatie: 4, curaj: 2 }, effect: () => { clarityMapActive = true; flash('Harta Clarității activată!'); saveGameState(); }, oneTimePurchase: true, purchasedFn: () => clarityMapActive },
    ];

    // ---------- HELPERS (adaptat) ----------
    function t(key) { return translations[language]?.[key] || translations['ro']?.[key] || key; }
    function spawnFreePosition(avoidPlayer = true, minDistance = 0) {
        let p, attempts = 0;
        const maxAttempts = (canvas.width / box) * (canvas.height / box);
        if (maxAttempts <=0 || !snake) return {x:0, y:0}; // Safety for uninitialized canvas/snake
        do {
            p = {
                x: Math.floor(Math.random() * (canvas.width / box)) * box,
                y: Math.floor(Math.random() * (canvas.height / box)) * box
            };
            attempts++;
            if (attempts > maxAttempts * 2) { // Increased attempts margin
                console.warn("Nu s-a putut găsi un spațiu liber pentru spawn. Returning first snake segment or 0,0.");
                return snake.length > 0 ? {x: snake[0].x, y: snake[0].y} : { x: 0, y: 0};
            }
        } while (
            (avoidPlayer && snake.some(seg => seg.x === p.x && seg.y === p.y && (minDistance === 0 || Math.abs(seg.x - p.x) < minDistance * box || Math.abs(seg.y - p.y) < minDistance * box))) ||
            obstacles.some(o => o.x === p.x && o.y === p.y) ||
            (food && p.x === food.x && p.y === food.y) ||
            (specialItem && p.x === specialItem.x && p.y === specialItem.y)
        );
        return p;
    }
    function createNewFood() { food = spawnFreePosition(true, 3); }
    function createNewSpecialItem() {
        if (specialItem || currentLevel >= gameLevels.length) return;
        const currentLvlData = gameLevels[currentLevel];
        const levelSpecialTypes = currentLvlData?.specialTypes || specialTemplates.map(s => s.type);
        const availableSpecialsPool = specialTemplates.filter(s => levelSpecialTypes.includes(s.type) && !s.isBoss);
        if (availableSpecialsPool.length === 0) return;
        const randomSpecialTemplate = availableSpecialsPool[Math.floor(Math.random() * availableSpecialsPool.length)];
        specialItem = { ...randomSpecialTemplate, ...spawnFreePosition(true, 4) };
    }
    function spawnNewObstacle() { obstacles.push(spawnFreePosition()); }
    function updateScoreDisplay() {
        if(scoreEl) scoreEl.textContent = score;
        if (score > highScore) { highScore = score; if(highScoreEl) highScoreEl.textContent = highScore; }
        if(analytics && analytics.currentSession) analytics.currentSession.score = score;
    }
    function updateValuesDisplay() {
        if(valueEls.empatie) valueEls.empatie.textContent = values.empatie;
        if(valueEls.curaj) valueEls.curaj.textContent = values.curaj;
        if(valueEls.rabdare) valueEls.rabdare.textContent = values.rabdare;
    }
    function updateLevelDisplay() { if(levelDisplayEl) levelDisplayEl.textContent = currentLevel + 1; }
    function flash(text, duration = 1800, type = 'info') {
      if(!effectEl) return;
      effectEl.innerHTML = text; effectEl.className = 'game-effect';
      if (type === 'good') effectEl.classList.add('positive'); else if (type === 'bad') effectEl.classList.add('negative');
      effectEl.style.opacity = 1; setTimeout(() => { if(effectEl) effectEl.style.opacity = 0; }, duration);
    }
    function endNegativeEffects() {
        effects = effects.filter(e => !e.isNegative);
        if(statusBar) statusBar.querySelectorAll('.neg-effect').forEach(el => el.remove());
        flash("Efecte negative înlăturate!", 2000, 'good');
    }
    function invertDirection() {
        if (dir === 'LEFT') dir = 'RIGHT'; else if (dir === 'RIGHT') dir = 'LEFT';
        else if (dir === 'UP') dir = 'DOWN'; else if (dir === 'DOWN') dir = 'UP';
    }
    function shrinkSnake() {
        const amountToShrink = Math.min(snake.length -1, 2); // Shrink by 2 or down to 1 segment
        for(let i=0; i<amountToShrink; i++) if(snake.length > 1) snake.pop();
    }
    function addActiveEffect(name, durationMs, onEndCallback = null, isNegative = false) {
        if(!statusBar) return 'no-status-bar-' + effectIdCounter;
        const id = 'activeEffect' + (++effectIdCounter);
        const effectData = { id, name, durationMs, timeLeftMs: durationMs, onEnd: onEndCallback, isNegative };
        const span = document.createElement('div'); span.className = 'stat-effect';
        if (effectData.isNegative) span.classList.add('neg-effect');
        span.id = id;
        const textSpan = document.createElement('span'); textSpan.textContent = name.length > 15 ? name.substring(0,12) + "..." : name; textSpan.title = name;
        const barContainer = document.createElement('div'); barContainer.className = 'effect-bar-container';
        const bar = document.createElement('div'); bar.className = 'effect-bar'; barContainer.appendChild(bar);
        span.appendChild(textSpan); span.appendChild(barContainer); statusBar.appendChild(span);
        effects.push(effectData); return id;
    }
    function tickEffects(deltaTime) {
        if(!statusBar || effects.length === 0) return;
        for (let i = effects.length - 1; i >= 0; i--) {
            const effect = effects[i]; effect.timeLeftMs -= deltaTime;
            const s = document.getElementById(effect.id);
            if (s) { const barEl = s.querySelector('.effect-bar'); if (barEl) barEl.style.width = Math.max(0, (effect.timeLeftMs / effect.durationMs)) * 100 + '%';}
            if (effect.timeLeftMs <= 0) { if (s) s.remove(); if (effect.onEnd) effect.onEnd(); effects.splice(i, 1); }
        }
    }
    function spawnParticles(x, y, color, count = PARTICLE_COUNT) {
      for (let i = 0; i < count; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * box * 0.5, y: y + (Math.random() - 0.5) * box * 0.5,
            vx: (Math.random() - 0.5) * (3 + Math.random() * 2), vy: (Math.random() - 0.5) * (3 + Math.random() * 2),
            alpha: 0.8 + Math.random() * 0.2, color, size: 2 + Math.random() * 3, decay: 0.02 + Math.random() * 0.02
        });
      }
    }

    // ---------- LEVEL MECHANICS ----------
    function applyCurrentLevelMechanics() {
        if (currentLevel >= gameLevels.length) return;
        const lvlData = gameLevels[currentLevel];
        if (!lvlData) return;
        if(canvas) canvas.style.backgroundColor = lvlData.bgColor || '#1d2230';
        currentSpeed = Math.max(50, INITIAL_SNAKE_SPEED / (lvlData.speedFactor || 1)); // Adjust speed based on level factor

        const mechanic = lvlData.mechanic;
        if (mechanic === 'slowObstacles') { flash("Atenție la obstacolele lente!", 2000); }
        else if (mechanic === 'magnetFood') { magnet = true; flash("Mâncarea este atrasă de tine!", 3000, 'good'); addActiveEffect("Magnet Mâncare", 15000, () => magnet = false); }
        else if (mechanic === 'wallPassTemp') { wallPass = true; flash("Poți trece prin ziduri temporar!", 3000, 'good'); addActiveEffect("Trecere Ziduri", 10000, () => wallPass = false); }
        else if (mechanic === 'bossCritique') {
            obstacles = [];
            const bossTemplate = specialTemplates.find(s => s.type === 'critic');
            if(bossTemplate) {
                 specialItem = {
                    ...bossTemplate, ...spawnFreePosition(true, 5), isBoss: true,
                    bossMaxHits: 3 + currentLevel, bossCurrentHits: 3 + currentLevel,
                    symbol: 'BOSS 🗣️💬'
                };
                flash(`Înfruntă ${t('Critic Interior')} BOSS! Lovește-l de ${specialItem.bossCurrentHits} ori!`, 3500, 'bad');
            }
        }
    }

    // ---------- JOURNAL, SHOP, MINIGAMES (cu modale stilizate) ----------
    function setupModal(modalElement, openBtnElement, closeBtnElement, onOpenCallback = null) {
        if (openBtnElement && modalElement && closeBtnElement) {
            openBtnElement.onclick = () => {
                if (!paused && modalElement.classList.contains('hidden')) { // Only pause if opening a new modal
                    paused = true; flash("Joc în Pauză (Modal)", 1500);
                } else if (paused && !modalElement.classList.contains('hidden')) { // Closing current modal
                     modalElement.classList.add('hidden');
                     // Do not unpause here, let Escape or P handle it, or resume()
                     if(canvas) canvas.focus();
                     return; // Exit early
                }
                [journalModal, shopModal, minigameModal].forEach(m => { if (m && m !== modalElement) m.classList.add('hidden');});
                modalElement.classList.remove('hidden');
                if (onOpenCallback) onOpenCallback();
            };
            closeBtnElement.onclick = () => {
                modalElement.classList.add('hidden');
                // paused = false; // Do not unpause automatically, let user do it
                if(canvas) canvas.focus();
            };
        }
    }
    if(journalModal && journalBtn && closeJournalModalBtn) setupModal(journalModal, journalBtn, closeJournalModalBtn, () => { if(journalEntry) journalEntry.focus(); if(viewJournalContentEl) viewJournalContentEl.classList.add('hidden'); });
    if(shopModal && shopBtn && closeShopModalBtn) setupModal(shopModal, shopBtn, closeShopModalBtn, populateShop);
    
    if(saveJournalBtn) saveJournalBtn.onclick = () => {
        const entryText = journalEntry.value.trim();
        if (entryText) {
            journalEntries.push({ date: new Date().toISOString(), text: entryText });
            saveGameState(); journalEntry.value = ''; flash(t('journalSaved'), 1500, 'good');
        } else { flash(t('journalEmpty'), 1500, 'bad'); }
    };
    if(exportJournalBtn) exportJournalBtn.onclick = () => {
        if (typeof jsPDF === 'undefined') { flash("Eroare: Librăria PDF nu e încărcată.", 2000, "bad"); return; }
        if (journalEntries.length === 0) { flash(t('journalEmpty'), 1500, 'bad'); return; }
        const { jsPDF: JSPDF_LOCAL } = window.jspdf; // Ensure it's the one from window
        const doc = new JSPDF_LOCAL();
        doc.text(t('Jurnal Emoțional (Joc)'), 10, 10); let y = 20;
        journalEntries.forEach(entry => {
            const lines = doc.splitTextToSize(`[${new Date(entry.date).toLocaleString('ro-RO')}]: ${entry.text}`, 180);
            if (y + lines.length * 7 > 280) { doc.addPage(); y = 15; } // Simple pagination
            doc.text(lines, 10, y); y += lines.length * 7 + 5;
        });
        doc.save('jurnal_snake_game.pdf'); flash("Jurnal exportat ca PDF!", 2000, 'good');
    };
    if(viewJournalBtn) viewJournalBtn.onclick = () => {
        if(viewJournalContentEl) {
            if (journalEntries.length === 0) { viewJournalContentEl.innerHTML = `<p>${t('journalEmpty')}</p>`; }
            else {
                viewJournalContentEl.innerHTML = journalEntries.slice().reverse().map(entry =>
                    `<div class="journal-history-item"><strong>${new Date(entry.date).toLocaleString('ro-RO')}:</strong><p>${entry.text.replace(/\n/g, '<br>')}</p></div>`
                ).join('');
            }
            viewJournalContentEl.classList.toggle('hidden');
        }
    };
    
    function populateShop() {
        if(!shopItemsEl) return; shopItemsEl.innerHTML = '';
        shopItemsList.forEach(item => {
            const btn = document.createElement('button'); btn.className = 'shop-item-btn';
            let currentItemLevel = item.currentLevelFn ? item.currentLevelFn() : 0;
            let purchased = item.purchasedFn ? item.purchasedFn() : false;
            let costString = Object.entries(item.cost).map(([k, v]) => `${v} ${t(k)}`).join(', ');
            let nameString = t(item.name);
            if (item.maxLevel && currentItemLevel >= item.maxLevel) { btn.innerHTML = `<div>${nameString} (Max Nivel)</div><div class="shop-item-cost">${t('MaxedOut')}</div>`; btn.disabled = true; }
            else if (item.oneTimePurchase && purchased) { btn.innerHTML = `<div>${nameString}</div><div class="shop-item-cost">${t('purchased')}</div>`; btn.disabled = true; }
            else { btn.innerHTML = `<div>${nameString} ${item.maxLevel ? `(Nv. ${currentItemLevel+1})` : ''}</div><div class="shop-item-cost">Cost: ${costString}</div>`;}
            btn.onclick = () => { /* ... (logic from original snakeGame.js) ... */
                if (btn.disabled) return; let canAfford = true;
                for (const [key, val] of Object.entries(item.cost)) { if (!values[key] || values[key] < val) { canAfford = false; break;}}
                if (canAfford) { Object.entries(item.cost).forEach(([k, v]) => values[k] -= v); item.effect(); updateValuesDisplay(); flash(`${t(item.name)} ${t('achiziționat')}!`, 2000, 'good'); populateShop(); saveGameState(); }
                else { flash(t('InsufficientValues'), 2000, 'bad'); }
            };
            shopItemsEl.appendChild(btn);
        });
    }
    function startBreathingMinigame() {
        breathingMinigameActive = true; paused = true;
        [journalModal, shopModal].forEach(m => m?.classList.add('hidden'));
        minigameModal.classList.remove('hidden');
        minigameContentEl.innerHTML = `<p class="text-lg mb-2">${t('breathing')}</p>
            <div class="breathing-circle-container"><div id="breathingCircle" class="breathing-circle">Inspiră</div></div>
            <p class="text-sm mt-2">Apasă Escape sau Închide pentru a opri.</p>`;
        
        const circle = document.getElementById('breathingCircle');
        let phase = 0; // 0: inhale, 1: hold, 2: exhale, 3: hold
        let phaseTimer = 0; const phaseDuration = 4; // seconds per phase
        
        function animateBreath() {
            if (!breathingMinigameActive || !circle) return;
            phaseTimer += (currentSpeed / 1000); // Adjust timing based on game speed, roughly
            
            if (phaseTimer >= phaseDuration) {
                phaseTimer = 0; phase = (phase + 1) % 4;
                if (phase === 0) circle.textContent = "Inspiră";
                else if (phase === 1) circle.textContent = "Ține";
                else if (phase === 2) circle.textContent = "Expiră";
                else if (phase === 3) circle.textContent = "Ține";
            }
            
            let scale = 1;
            if (phase === 0) scale = 1 + (phaseTimer / phaseDuration) * 0.5; // Inhale: grow
            else if (phase === 1) scale = 1.5; // Hold full
            else if (phase === 2) scale = 1.5 - (phaseTimer / phaseDuration) * 0.5; // Exhale: shrink
            else if (phase === 3) scale = 1; // Hold empty
            circle.style.transform = `scale(${scale})`;
            
            requestAnimationFrame(animateBreath);
        }
        animateBreath();
    }
    function startReframeMinigame() { /* ... (similar to original snakeGame.js, simplified) ... */
        paused = true; [journalModal, shopModal].forEach(m => m?.classList.add('hidden'));
        minigameModal.classList.remove('hidden');
        const affirmations = ['Sunt capabil.', 'Mă accept.', 'Pot depăși asta.'];
        minigameContentEl.innerHTML = `<p class="text-lg mb-2">${t('reframe')}</p>` +
            affirmations.map(a => `<button class="modal-btn-neutral m-1">${a}</button>`).join('');
        minigameContentEl.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                flash(btn.textContent, 2000, 'good');
                minigameModal.classList.add('hidden'); paused = false; if(canvas) canvas.focus();
            };
        });
    }
    if(closeMinigameModalBtn && minigameModal) closeMinigameModalBtn.onclick = () => {
        minigameModal.classList.add('hidden'); breathingMinigameActive = false;
        // paused = false; // Let user unpause explicitly
        if(canvas) canvas.focus();
    };

    // ---------- LANGUAGE ----------
    function setLanguage(lang) {
        language = lang;
        const gameInterfaceEl = document.getElementById('snakeGameInterface');
        if (!gameInterfaceEl) return;
        const titleH2 = gameInterfaceEl.querySelector('h2'); if (titleH2) titleH2.textContent = t('Snake 🐍 – Călătoria Interioară');
        const scoreLabel = scoreEl?.parentNode?.firstChild; if (scoreLabel && scoreLabel.nodeType === Node.TEXT_NODE) scoreLabel.textContent = t('score') + ": ";
        const highScoreLabel = highScoreEl?.parentNode?.firstChild; if (highScoreLabel && highScoreLabel.nodeType === Node.TEXT_NODE) highScoreLabel.textContent = t('highScore') + ": ";
        const levelLabelNodes = levelDisplayEl?.parentElement?.childNodes;
        if (levelLabelNodes) { for(let node of levelLabelNodes){ if(node.nodeType === Node.TEXT_NODE && (node.textContent.trim().startsWith("Nivel") || node.textContent.trim().startsWith("Level"))){ node.textContent = " " + t('level') + ": "; break;}}}
        if(controlsEl) controlsEl.textContent = t('controls'); if(restartBtn) restartBtn.textContent = t('restart');
        if(fullResetBtn) fullResetBtn.textContent = t('fullReset'); if(journalBtn) journalBtn.textContent = t('journal');
        if(shopBtn) shopBtn.textContent = t('shop'); if(langBtn) langBtn.textContent = (language === 'ro' ? 'English' : 'Română');
        if(journalModal) journalModal.querySelector('.modal-title').textContent = t('Jurnal Emoțional (Joc)');
        if(journalEntry) journalEntry.placeholder = t('Notează-ți gândurile...'); if(saveJournalBtn) saveJournalBtn.textContent = t('save');
        if(exportJournalBtn) exportJournalBtn.textContent = t('export'); if(viewJournalBtn) viewJournalBtn.textContent = t('view');
        if(closeJournalModalBtn) closeJournalModalBtn.textContent = t('close');
        if(shopModal) shopModal.querySelector('.modal-title').textContent = t('shopTitle');
        if(closeShopModalBtn) closeShopModalBtn.textContent = t('Închide Magazin');
        if(closeMinigameModalBtn) closeMinigameModalBtn.textContent = t('Închide Minijoc');
        if(langBtn) langBtn.setAttribute('aria-label', language === 'ro' ? 'Switch to English' : 'Schimbă în Română');
        if (introEl && !introEl.classList.contains('hidden') && currentLevel < gameLevels.length) {
             const lvlData = gameLevels[currentLevel];
             introEl.innerHTML = `<strong class="text-base sm:text-lg">${t('level')} ${currentLevel + 1}: ${t(lvlData.theme)}</strong><br><span class="text-xs sm:text-sm">${t(lvlData.message)}</span><br><em class="text-xs text-gray-400">${t('dailyQuest')}</em>`;
        }
        updateValuesDisplay();
    }
    if(langBtn) langBtn.onclick = () => { setLanguage(language === 'ro' ? 'en' : 'ro'); saveGameState(); };

    // ---------- ANALYTICS ----------
    function recordGameSessionAnalytics() {
        if (!analytics || !analytics.currentSession) return;
        analytics.currentSession.timeEnded = Date.now();
        analytics.currentSession.levelReached = currentLevel;
        analytics.currentSession.finalValues = { ...values };
        analytics.currentSession.finalScore = score;
        analytics.sessions.push({ ...analytics.currentSession });
        saveGameState(); // Analytics are saved as part of game state
    }
    function checkStuckCondition() { /* ... (din snakeGame.js original) ... */
        if (collectedAnalytics && collectedAnalytics.abandon >= 3 && currentLevel < 2) { // Example condition
            flash(t('stuck'), 3000, 'bad');
            if(journalBtn) journalBtn.click(); // Open journal
        }
    }

    // ---------- FULL RESET & NEXT LEVEL SETUP ----------
    function fullResetGameToLevelZero() {
        currentLevel = 0; score = 0;
        values = { empatie: 0, curaj: 0, rabdare: 0 };
        shield = { level: 1, hits: 1 };
        slowMotionActive = false; clarityMapActive = false;
        // highScore is not reset
        setupNextLevel(true); // true for full reset
        saveGameState();
        flash("Joc resetat complet!", 2000, "good");
    }

    function setupNextLevel(isInitialOrFullReset = false) {
        snake = [{ x: Math.floor(canvas.width / box / 2) * box, y: Math.floor(canvas.height / box / 2) * box }];
        dir = ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)];

        if (isInitialOrFullReset) {
             score = 0;
             // values are reset by fullResetGameToLevelZero or kept if just next level
        }
        if (isInitialOrFullReset && !currentLevel) { // Only reset values if it's a true fresh start at level 0
            values = { empatie: 0, curaj: 0, rabdare: 0 };
            shield = { level: 1, hits: 1 };
        }


        multScoreFactor = 1;
        wallPass = magnet = false;
        if(shield) shield.hits = shield.level;

        activeColor = null; over = false;
        paused = isInitialOrFullReset ? false : true; // Pause for intro message on new levels

        specialItem = null; effects = []; particles = []; obstacles = [];
        if (statusBar) statusBar.innerHTML = '';
        effectIdCounter = 0;

        collectedAnalytics = { curaj: 0, rabdare: 0, empatie: 0, acceptare: 0, frustrare: 0, motivatie: 0, critic: 0, abandon: 0, izolare: 0, adult: 0, copil: 0 };
        if(analytics && analytics.currentSession) {
            analytics.currentSession = { scoreAtLevelStart: score, valuesAtLevelStart: { ...values }, collectedSpecials: [], timeLevelStart: Date.now() };
        }

        updateScoreDisplay(); updateValuesDisplay(); updateLevelDisplay();
        createNewFood();
        if (Math.random() < 0.2) createNewSpecialItem(); // Initial chance for a special

        if(restartBtn) restartBtn.classList.add('hidden');
        if(fullResetBtn && !isInitialOrFullReset) fullResetBtn.classList.remove('hidden'); // Show on game over
        else if (fullResetBtn) fullResetBtn.classList.add('hidden');


        if (currentLevel < gameLevels.length) {
            const currentLvlData = gameLevels[currentLevel];
            if(introEl && currentLvlData) {
                introEl.innerHTML = `<strong class="text-base sm:text-lg">${t('level')} ${currentLevel + 1}: ${t(currentLvlData.theme)}</strong><br><span class="text-xs sm:text-sm">${t(currentLvlData.message)}</span><br><em class="text-xs text-gray-400">${t('dailyQuest')}</em>`;
                introEl.classList.remove('hidden');
            }
            applyCurrentLevelMechanics(); // Apply mechanics like speed, bg color
            obstacles = []; for (let i = 0; i < (currentLvlData.obstacles || 0); i++) spawnNewObstacle();

            // Unpause after intro delay, but only if it's not a full reset (which starts unpaused)
            if (!isInitialOrFullReset) {
                setTimeout(() => {
                    if(introEl) introEl.classList.add('hidden');
                    paused = false;
                    if (gameVisibleAndActive && !over && !paused) {
                         lastFrameTime = performance.now(); requestAnimationFrame(gameLoop);
                    }
                }, 3500);
            } else { // Full reset, no intro delay for pause
                 if(introEl) introEl.classList.add('hidden'); // Ensure intro is hidden
                 paused = false;
            }

        } else { // Game completed all levels
            if(introEl) {
                introEl.innerHTML = `<strong class="text-lg">${t('Felicitări!')}</strong><br><span class="text-sm">${t('Ai finalizat Călătoria Interioară!')}</span><br><em class="text-xs">${t('Poți continua explorarea sau reseta jocul.')}</em>`;
                introEl.classList.remove('hidden'); paused = true;
            }
             if(fullResetBtn) fullResetBtn.classList.remove('hidden');
        }
        if (!isInitialOrFullReset || currentLevel > 0) { // Ensure lastFrameTime is set unless it's the very first game start
            lastFrameTime = performance.now();
        }
    }

    // ---------- DRAW (cu îmbunătățiri vizuale din snakeGame.js) ----------
    function drawGame() {
        if (!ctx || !canvas) return;
        const currentLvlData = gameLevels[currentLevel] || gameLevels[gameLevels.length-1];
        const baseBg = (currentLvlData && currentLvlData.bgColor) ? currentLvlData.bgColor : 'rgba(29, 34, 48, 0.5)';
        
        let snakeHeadColorToUse = '#36a26b';
        if (activeColor) snakeHeadColorToUse = activeColor;
        else if (shield && shield.hits > 0) snakeHeadColorToUse = '#FFACE4'; // Pinkish for shield
        else if (currentLvlData && currentLvlData.snakeColor) snakeHeadColorToUse = currentLvlData.snakeColor;

        let snakeBodyColorToUse = '#88dab2';
        if (shield && shield.hits > 0) snakeBodyColorToUse = '#FFD1F0';
        else if (currentLvlData && currentLvlData.snakeColor && typeof chroma !== 'undefined') { try { snakeBodyColorToUse = chroma(currentLvlData.snakeColor).darken(0.5).hex(); } catch(e) { /* fallback */ } }
        else if (currentLvlData && currentLvlData.snakeColor) snakeBodyColorToUse = currentLvlData.snakeColor;

        // Background Gradient
        const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 1.5);
        if (typeof chroma !== 'undefined') { try { gradient.addColorStop(0, chroma(baseBg).brighten(0.3).alpha(0.8).css()); gradient.addColorStop(1, chroma(baseBg).alpha(0.9).css()); } catch (e) { gradient.addColorStop(0, baseBg); gradient.addColorStop(1, baseBg);}}
        else { gradient.addColorStop(0, baseBg); gradient.addColorStop(1, baseBg); }
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Snake
        snake.forEach((seg, i) => {
            ctx.beginPath();
            if (i === 0) { // Head
                ctx.fillStyle = snakeHeadColorToUse;
                ctx.arc(seg.x + box / 2, seg.y + box / 2, box / 2, 0, 2 * Math.PI); ctx.fill();
                ctx.fillStyle = 'white'; // Eyes
                let eyeOffsetX = dir === 'LEFT' ? -box/4 : (dir === 'RIGHT' ? box/4 : 0);
                let eyeOffsetY = dir === 'UP' ? -box/4 : (dir === 'DOWN' ? box/4 : 0);
                if (dir === 'LEFT' || dir === 'RIGHT') { ctx.fillRect(seg.x + box/2 + eyeOffsetX - 1, seg.y + box/4 -1, 2, 2); ctx.fillRect(seg.x + box/2 + eyeOffsetX - 1, seg.y + box*0.75 -1 -1, 2, 2); }
                else { ctx.fillRect(seg.x + box/4 -1, seg.y + box/2 + eyeOffsetY -1, 2, 2); ctx.fillRect(seg.x + box*0.75 -1 -1, seg.y + box/2 + eyeOffsetY -1, 2, 2); }
            } else { // Body
                ctx.fillStyle = snakeBodyColorToUse;
                // Rounded rectangle for body segments
                const radius = box / 3;
                ctx.beginPath(); ctx.moveTo(seg.x + radius, seg.y); ctx.lineTo(seg.x + box - radius, seg.y); ctx.quadraticCurveTo(seg.x + box, seg.y, seg.x + box, seg.y + radius);
                ctx.lineTo(seg.x + box, seg.y + box - radius); ctx.quadraticCurveTo(seg.x + box, seg.y + box, seg.x + box - radius, seg.y + box);
                ctx.lineTo(seg.x + radius, seg.y + box); ctx.quadraticCurveTo(seg.x, seg.y + box, seg.x, seg.y + box - radius);
                ctx.lineTo(seg.x, seg.y + radius); ctx.quadraticCurveTo(seg.x, seg.y, seg.x + radius, seg.y);
                ctx.closePath(); ctx.fill();
            }
            if (typeof chroma !== 'undefined') { try { ctx.strokeStyle = chroma(ctx.fillStyle).darken(1.5).hex(); } catch(e) { ctx.strokeStyle = '#000';}} else { ctx.strokeStyle = '#555'; }
            ctx.lineWidth = 1; ctx.stroke();
        });

        // Food
        if(food) {
            ctx.fillStyle = '#FF6B6B'; ctx.beginPath(); ctx.arc(food.x + box / 2, food.y + box / 2, box / 2.2, 0, 2 * Math.PI); ctx.fill();
            ctx.fillStyle = '#FFE66D'; ctx.beginPath(); ctx.arc(food.x + box / 2, food.y + box / 2, box / 5, 0, 2 * Math.PI); ctx.fill();
        }
        // Special Item
        if (specialItem) {
            ctx.fillStyle = specialItem.color; ctx.beginPath(); ctx.arc(specialItem.x + box/2, specialItem.y + box/2, box/1.8, 0, 2* Math.PI); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = `${box * 0.65}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(specialItem.symbol, specialItem.x + box / 2, specialItem.y + box / 2 + 1);
            if (specialItem.isBoss) { ctx.fillStyle = 'white'; ctx.font = `${box * 0.3}px Arial`; ctx.fillText(`${specialItem.bossCurrentHits}/${specialItem.bossMaxHits}`, specialItem.x + box / 2, specialItem.y + box * 0.9); }
        }
        // Obstacles
        obstacles.forEach(o => {
            ctx.fillStyle = clarityMapActive ? 'rgba(108, 117, 125, 0.5)' : '#6c757d'; // Semi-transparent if map active
            ctx.fillRect(o.x, o.y, box, box);
            ctx.strokeStyle = '#343a40'; ctx.lineWidth = 2; ctx.strokeRect(o.x, o.y, box, box);
        });
        // Particles
        particles.forEach(p => {
            if (typeof chroma !== 'undefined') { try { ctx.fillStyle = chroma(p.color).alpha(p.alpha).css(); } catch(e) { ctx.fillStyle = `rgba(200,200,200,${p.alpha})`; }}
            else { ctx.fillStyle = `rgba(200,200,200,${p.alpha})`; }
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
            p.x += p.vx; p.y += p.vy; p.alpha -= p.decay;
        });
        particles = particles.filter(p => p.alpha > 0);
    }

    // ---------- GAME LOOP ----------
    let previousTimestamp = 0;
    function gameLoop(timestamp) {
        const deltaTime = timestamp - previousTimestamp;
        previousTimestamp = timestamp;

        if (!gameVisibleAndActive || over) { if(gameVisibleAndActive && !over && paused) drawGame(); return; }
        if(paused) { drawGame(); if (gameVisibleAndActive) requestAnimationFrame(gameLoop); return; }

        if (timestamp - lastFrameTime >= currentSpeed) {
            updateGame(); lastFrameTime = timestamp;
        }
        tickEffects(deltaTime); drawGame();
        if (gameVisibleAndActive) requestAnimationFrame(gameLoop);
    }

    // ---------- UPDATE GAME LOGIC ----------
    function updateGame() {
        if (over || paused || !snake || snake.length === 0) return;
        const head = { x: snake[0].x, y: snake[0].y };
        if (dir === 'LEFT') head.x -= box; else if (dir === 'RIGHT') head.x += box;
        else if (dir === 'UP') head.y -= box; else if (dir === 'DOWN') head.y += box;

        // Repel/Magnet Food Logic (from snakeGame.js)
        if (repelFoodCountdown > 0 && food) { /* ... (same as original snakeGame.js) ... */
            const dx = food.x - head.x; const dy = food.y - head.y;
            if (Math.abs(dx) < box * 3 && Math.abs(dy) < box * 3) {
                let newFoodX = food.x + Math.sign(dx) * box; let newFoodY = food.y + Math.sign(dy) * box;
                newFoodX = Math.max(0, Math.min(canvas.width - box, newFoodX)); newFoodY = Math.max(0, Math.min(canvas.height - box, newFoodY));
                food.x = newFoodX; food.y = newFoodY;
            } repelFoodCountdown--;
        } else if (magnet && food) { /* ... (same as original snakeGame.js) ... */
            const dx = food.x - head.x; const dy = food.y - head.y;
            if (Math.abs(dx) > box/2 || Math.abs(dy) > box/2) {
                if (Math.abs(dx) > Math.abs(dy)) head.x += Math.sign(dx) * box; else head.y += Math.sign(dy) * box;
            }
        }

        // Wall Pass / Collision
        if (wallPass) {
            if (head.x < 0) head.x = canvas.width - box; else if (head.x >= canvas.width) head.x = 0;
            if (head.y < 0) head.y = canvas.height - box; else if (head.y >= canvas.height) head.y = 0;
        } else if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) return triggerGameOver('wall');

        // Self & Obstacle Collision
        for (let i = 1; i < snake.length; i++) { if (head.x === snake[i].x && head.y === snake[i].y) return triggerGameOver('self'); }
        for (let o of obstacles) { if (head.x === o.x && head.y === o.y) return triggerGameOver('obstacle'); }

        // Eat Food
        if (food && head.x === food.x && head.y === food.y) {
            score += Math.round(1 * multScoreFactor); updateScoreDisplay(); createNewFood();
            spawnParticles(food.x + box / 2, food.y + box / 2, '#34D399');
            navigator.vibrate?.(50);
            if (!specialItem && Math.random() < (0.25 + currentLevel * 0.03) ) createNewSpecialItem();
        } else { snake.pop(); }

        // Collect Special Item
        if (specialItem && head.x === specialItem.x && head.y === specialItem.y) {
            const spData = { ...specialItem }; specialItem = null; // Consume it
            if (spData.isBoss) { /* ... (Boss logic from original snakeGame.js) ... */
                spData.bossCurrentHits--; flash(`Lovitură Critic BOSS! Rămase: ${spData.bossCurrentHits}`, 2000, spData.bossCurrentHits > 0 ? 'bad' : 'good');
                if (spData.bossCurrentHits <= 0) { flash(`${t('CRITICUL INTERIOR')} ÎNVINS!`, 3000, 'good'); score += 50 + currentLevel * 10; updateScoreDisplay(); currentLevel++; saveGameState(); setTimeout(() => setupNextLevel(false), 2500); }
                else { specialItem = { ...spData, ...spawnFreePosition(true, 6) }; }
            } else if (spData.negative && shield && shield.hits > 0) {
                shield.hits--; flash(t('shieldProtect') + ` (${shield.hits} ${shield.hits === 1 ? 'lovitură' : 'lovituri'})`, 2000, 'good');
                spawnParticles(spData.x + box/2, spData.y + box/2, '#FFFFFF', 15);
            } else {
                if (spData.type) collectedAnalytics[spData.type] = (collectedAnalytics[spData.type] || 0) + 1;
                if (analytics && analytics.currentSession && analytics.currentSession.collectedSpecials) analytics.currentSession.collectedSpecials.push(spData.type);
                if (spData.valueType && values.hasOwnProperty(spData.valueType)) values[spData.valueType] += (spData.points || 1);
                if (spData.effect) spData.effect();
                spawnParticles(spData.x + box / 2, spData.y + box / 2, spData.color, 12);
                navigator.vibrate?.(100);
                if (spData.type === 'critic' && !spData.isBoss) startReframeMinigame();
            }
            updateValuesDisplay(); checkStuckCondition();
        }
        snake.unshift(head);

        // Level Progression
        const levelData = gameLevels[currentLevel];
        if (levelData && !levelData.mechanic?.includes('boss')) {
            const scoreNeededForNextLevel = (currentLevel + 1) * LEVEL_SCORE_INCREMENT + (currentLevel * 5);
            if (currentLevel < gameLevels.length - 1 && score >= scoreNeededForNextLevel) {
                currentLevel++; flash(`${t('Nivelul')} ${currentLevel + 1}: ${t(gameLevels[currentLevel].theme)} atins!`, 3000, 'good');
                saveGameState(); setTimeout(() => setupNextLevel(false), 2500);
            }
        }
    }

    // ---------- GAME OVER ----------
    function triggerGameOver(reason = 'unknown') {
        if (over) return; over = true; paused = true;
        saveGameState(); recordGameSessionAnalytics();
        let reasonText = '';
        if (reason === 'wall') reasonText = 'Ai lovit un perete.';
        else if (reason === 'self') reasonText = 'Te-ai auto-colizionat.';
        else if (reason === 'obstacle') reasonText = 'Ai lovit un obstacol.';
        let raport = `<strong class="text-lg">${t('emotionalSummary')} (${reasonText})</strong><br>`;
        // Add more details to raport based on collectedAnalytics if desired
        flash(raport, 7000, 'bad');
        if(restartBtn) restartBtn.classList.remove('hidden');
        if(fullResetBtn) fullResetBtn.classList.remove('hidden');
    }

    // ---------- CONTROLS ----------
    function handleKeyDown(e) {
        const isInputFocused = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
        if (isInputFocused && (e.key !== 'Escape')) return;

        const isActionModalOpen = (journalModal && !journalModal.classList.contains('hidden')) ||
                                 (shopModal && !shopModal.classList.contains('hidden')) ||
                                 (minigameModal && !minigameModal.classList.contains('hidden'));

        const relevantKeysForPrevent = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'p', 'j', 'm', 'r'];
        if (gameVisibleAndActive && !over && relevantKeysForPrevent.includes(e.key.toLowerCase())) {
            if (!isInputFocused || !isActionModalOpen) e.preventDefault();
        }

         if (e.key === 'Escape') {
            if (isActionModalOpen) { // Close any open action modal first
                if (journalModal && !journalModal.classList.contains('hidden')) { if(closeJournalModalBtn) closeJournalModalBtn.click(); }
                else if (shopModal && !shopModal.classList.contains('hidden')) { if(closeShopModalBtn) closeShopModalBtn.click(); }
                else if (minigameModal && !minigameModal.classList.contains('hidden')) { if(closeMinigameModalBtn) closeMinigameModalBtn.click(); }
                // Do not unpause here, modals handle focus back to canvas, user can unpause with P/Space
                return;
            } else if (gameVisibleAndActive && !over) { // If no modal is open, toggle game pause
                paused = !paused; flash(paused ? "Joc în Pauză" : "Joc Reluat", 1500);
                if(!paused) { lastFrameTime = performance.now(); if(gameVisibleAndActive) requestAnimationFrame(gameLoop); }
            }
            return;
        }

        if (!gameVisibleAndActive || over || breathingMinigameActive) return; // breathingMinigameActive might be redundant if modals pause
        const k = e.key.toLowerCase();

        if (k === ' ' || k === 'p') {
            if (isActionModalOpen) return; // Don't toggle game pause if a modal is open
            paused = !paused; flash(paused ? "Joc în Pauză" : "Joc Reluat", 1500);
            if (!paused) { lastFrameTime = performance.now(); if(gameVisibleAndActive) requestAnimationFrame(gameLoop); }
            return;
        }
        if (k === 'j' && journalBtn) { journalBtn.click(); return; }
        if (k === 'm' && shopBtn) { shopBtn.click(); return; }
        if (k === 'r' && slowMotionActive && !isActionModalOpen) { startBreathingMinigame(); return; }

        if (paused && !(k === ' ' || k === 'p')) return; // If paused and not unpausing, ignore other game keys

        if ((k === 'arrowleft' || k === 'a') && dir !== 'RIGHT') dir = 'LEFT';
        else if ((k === 'arrowup' || k === 'w') && dir !== 'DOWN') dir = 'UP';
        else if ((k === 'arrowright' || k === 'd') && dir !== 'LEFT') dir = 'RIGHT';
        else if ((k === 'arrowdown' || k === 's') && dir !== 'UP') dir = 'DOWN';
    }
    document.addEventListener('keydown', handleKeyDown);
    
    if(restartBtn) restartBtn.onclick = () => { setupNextLevel(false); saveGameState(); };
    if(fullResetBtn) fullResetBtn.onclick = () => { if (confirm(t('Ești sigur că vrei să resetezi tot progresul jocului?'))) fullResetGameToLevelZero(); };

    // ---------- INITIALIZE SCRIPT & RETURN GAME INSTANCE ----------
    setLanguage(language);
    // setupNextLevel(true); // Initial setup is deferred until modal is shown and resized.
    
    gameInitialized = true;
    console.log("Instanța jocului Snake a fost inițializată (dar nu pornită încă).");

    return {
        pause: () => { if (!paused) { paused = true; flash("Joc în Pauză", 1500); } },
        resume: () => { if (paused && !over && !isAnyModalOpen()) { paused = false; flash("Joc Reluat", 1500); lastFrameTime = performance.now(); if(gameVisibleAndActive) requestAnimationFrame(gameLoop); if(canvas) canvas.focus();} },
        resetCurrentLevel: () => setupNextLevel(false),
        fullReset: fullResetGameToLevelZero,
        isPaused: () => paused,
        isOver: () => over,
        setGameVisibility: (isVisible) => {
            const oldVisibility = gameVisibleAndActive;
            gameVisibleAndActive = isVisible;
            if (isVisible && !oldVisibility) { // First time becoming visible or re-becoming visible
                console.log("SnakeGame: Vizibilitate ON. Se va apela triggerResize și se va porni/relua jocul.");
                if (typeof resizeCanvas === 'function') resizeCanvas(); // Resize now that it's visible

                if (over) { // If game was over, reset the current level to allow replay
                    setupNextLevel(false); // This will set paused=true for intro
                } else if (!snake) { // If snake is not initialized (first ever run)
                    setupNextLevel(true); // Full initial setup
                } else if (paused && !isAnyModalOpen()) { // If it was just paused (and no modal is open)
                    // resume(); // Let resume() handle unpausing if appropriate
                }
                // The gameLoop will be started by setupNextLevel or resume if needed
                if (!paused && !over) { // If not paused and not over, ensure loop starts
                    lastFrameTime = performance.now();
                    requestAnimationFrame(gameLoop);
                }
                if(canvas) canvas.focus();

            } else if (!isVisible && oldVisibility && !paused) {
                console.log("SnakeGame: Vizibilitate OFF, pune jocul pe pauză.");
                paused = true;
            }
        },
        triggerResize: resizeCanvas,
        cleanup: () => {
            document.removeEventListener('keydown', handleKeyDown);
            gameInitialized = false; gameInstance = null;
            console.log("Snake game instance cleaned up.");
        }
    };
}

function isAnyModalOpen() {
    const journalModal = document.getElementById('snakeJournalModal');
    const shopModal = document.getElementById('snakeShopModal');
    const minigameModal = document.getElementById('snakeMinigameModal');
    return (journalModal && !journalModal.classList.contains('hidden')) ||
           (shopModal && !shopModal.classList.contains('hidden')) ||
           (minigameModal && !minigameModal.classList.contains('hidden'));
}


// --- GESTIONARE MODAL PRINCIPAL ȘI PORNIRE JOC ---
document.addEventListener('DOMContentLoaded', () => {
    const launchModalBtn = document.getElementById('launchGameModalButton');
    snakeGameModalContainer = document.getElementById('snakeGameModalContainer');

    if (!launchModalBtn || !snakeGameModalContainer) {
        console.error("Butonul #launchGameModalButton sau #snakeGameModalContainer nu a fost găsit!");
        return;
    }

    launchModalBtn.addEventListener('click', () => {
        console.log("Butonul 'Începe Călătoria Interioară' a fost apăsat.");
        if (!snakeGameModalContainer.querySelector('#snakeGameModalContent')) {
            snakeGameModalContainer.innerHTML = gameModalHTMLStructure;
            snakeGameWrapper = document.getElementById('snakeGameWrapper');
            closeSnakeGameModalButton = document.getElementById('closeSnakeGameModal');
            if (!snakeGameWrapper) { console.error("CRITICAL: #snakeGameWrapper negăsit post-injectare!"); return; }
            if (closeSnakeGameModalButton) {
                closeSnakeGameModalButton.addEventListener('click', () => {
                    if (snakeGameModalContainer) snakeGameModalContainer.style.display = 'none';
                    if (gameInstance) gameInstance.setGameVisibility(false);
                });
            }
        }

        if (!gameInitialized) {
            if (!snakeGameWrapper) { console.error("CRITICAL: snakeGameWrapper null înainte de initializeSnakeGame!"); return; }
            gameInstance = initializeSnakeGame();
        }

        if (gameInstance) {
            snakeGameModalContainer.style.display = 'flex';
            // setTimeout for resize is crucial for computed styles to be correct after display:flex
            setTimeout(() => {
                if (typeof gameInstance.triggerResize === 'function') {
                    gameInstance.triggerResize();
                }
                // Now that it's resized, set visibility which might start/resume the game
                gameInstance.setGameVisibility(true);

                // Focus canvas after everything is set up
                const activeCanvas = document.getElementById('snakeCanvas');
                if (activeCanvas) setTimeout(() => activeCanvas.focus(), 50);

            }, 100); // Increased delay for layout to settle before resize

        } else {
            console.error("Inițializarea jocului a eșuat, gameInstance este null.");
        }
    });
});

export function handleGameVisibility(isVisible) {
    const modalIsOpen = snakeGameModalContainer && snakeGameModalContainer.style.display === 'flex';
    if (gameInstance && typeof gameInstance.setGameVisibility === 'function') {
        gameInstance.setGameVisibility(isVisible && modalIsOpen);
        if (isVisible && modalIsOpen && (gameInstance.isOver() || gameInstance.isPaused())) {
            const gameCanvas = document.getElementById('snakeCanvas');
            if (gameCanvas) setTimeout(() => gameCanvas.focus(), 50);
        }
    }
}

window.addEventListener('beforeunload', () => {
    if (gameInstance && gameInitialized && gameVisibleAndActive && !gameInstance.isOver()) {
        saveGameState(); // saveGameState is defined within initializeSnakeGame's scope
        console.log("Progresul jocului Snake a fost salvat la părăsirea paginii.");
    }
});

// Optional: Include Chroma.js if you have it for advanced color manipulation
// <script src="https://cdnjs.cloudflare.com/ajax/libs/chroma-js/2.1.2/chroma.min.js"></script>
// And then check `typeof chroma !== 'undefined'` before using chroma functions.