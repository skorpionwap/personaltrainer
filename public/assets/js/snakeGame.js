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
const INITIAL_SNAKE_SPEED = 170;
const BOX_SIZE = 20;
const LEVEL_SCORE_INCREMENT = 25;
const PARTICLE_COUNT = 8;

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

// --- SOUND EFFECTS (Placeholder - decomentează și actualizează căile dacă le folosești) ---
// const sounds = { /* ... */ };
// function playSound(soundName) { /* ... */ }


function initializeSnakeGame() {
    // snakeGameWrapper este acum o variabilă la nivel de modul, setată înainte de apelul acestei funcții.
    // Se așteaptă ca snakeGameWrapper să fie un element DOM valid.
    if (!snakeGameWrapper) {
        console.error("CRITICAL ERROR: #snakeGameWrapper nu a fost găsit în DOM când s-a apelat initializeSnakeGame.");
        return null;
    }
    snakeGameWrapper.innerHTML = gameInterfaceHTMLStructure; // Injectează UI-ul specific jocului

    const canvas = document.getElementById('snakeCanvas');
    if (!canvas) {
        console.error("Elementul canvas #snakeCanvas nu a fost găsit după injectarea gameInterfaceHTMLStructure!");
        return null;
    }
    const ctx = canvas.getContext('2d');
    const box = BOX_SIZE;

// Funcția de redimensionare a canvas-ului
    function resizeCanvas() {
        const parentInterface = canvas.parentElement; // Ar trebui să fie #snakeGameInterface
        const gameModalContent = document.getElementById('snakeGameModalContent'); // Părintele mai larg, care are aspect-ratio

        if (!parentInterface || !gameModalContent) {
            console.warn("Nu s-a putut redimensiona canvas-ul: #snakeGameInterface sau #snakeGameModalContent lipsesc.");
            canvas.width = BOX_SIZE * 10; // Fallback
            canvas.height = BOX_SIZE * 10;
            return;
        }

        console.log("--- resizeCanvas START ---");
        console.log("ModalContent dimensions (W x H):", gameModalContent.clientWidth, "x", gameModalContent.clientHeight);
        console.log("ParentInterface computedStyle (paddingT, paddingB, paddingL, paddingR):",
            getComputedStyle(parentInterface).paddingTop, getComputedStyle(parentInterface).paddingBottom,
            getComputedStyle(parentInterface).paddingLeft, getComputedStyle(parentInterface).paddingRight);

        // Lățimea disponibilă pentru canvas este lățimea interfeței părintelui minus padding-urile sale
        const interfacePaddingLeft = parseInt(getComputedStyle(parentInterface).paddingLeft) || 0;
        const interfacePaddingRight = parseInt(getComputedStyle(parentInterface).paddingRight) || 0;
        const availableWidth = parentInterface.clientWidth - interfacePaddingLeft - interfacePaddingRight - 5; // O mică marjă de siguranță
        
        // Înălțimea disponibilă pentru canvas este mai complexă
        // Luăm înălțimea totală a #snakeGameInterface și scădem înălțimea celorlalte elemente.
        let nonCanvasHeight = 0;
        const uiElementsToMeasure = [
            parentInterface.querySelector('h2'),
            parentInterface.querySelector('.score'),
            parentInterface.querySelector('.values'),
            parentInterface.querySelector('#snakeIntro:not(.hidden)'), // Doar dacă #snakeIntro NU e hidden
            parentInterface.querySelector('#snakeStatus'),
            parentInterface.querySelector('#snakeControls'),
            parentInterface.querySelector('.flex.gap-1.justify-center.mt-auto.flex-wrap'), // Butoanele de jos (selector mai specific)
        ];

        console.log("Elements to measure for nonCanvasHeight:");
        uiElementsToMeasure.forEach((el, index) => {
            if (el) {
                const elHeight = el.offsetHeight;
                const marginTop = parseInt(getComputedStyle(el).marginTop) || 0;
                const marginBottom = parseInt(getComputedStyle(el).marginBottom) || 0;
                nonCanvasHeight += elHeight + marginTop + marginBottom;
                console.log(`  - Element ${index}: height=${elHeight}, marginTop=${marginTop}, marginBottom=${marginBottom}. Current nonCanvasHeight=${nonCanvasHeight}`);
            } else {
                console.log(`  - Element ${index}: not found or not visible.`);
            }
        });

        const interfacePaddingTop = parseInt(getComputedStyle(parentInterface).paddingTop) || 0;
        const interfacePaddingBottom = parseInt(getComputedStyle(parentInterface).paddingBottom) || 0;
        nonCanvasHeight += interfacePaddingTop + interfacePaddingBottom + 5; // Padding-ul containerului canvas-ului + marjă

        console.log("Total nonCanvasHeight (including parentInterface padding):", nonCanvasHeight);
        console.log("ParentInterface clientHeight:", parentInterface.clientHeight);

        const availableHeight = parentInterface.clientHeight - nonCanvasHeight;

        if (availableWidth <= 0 || availableHeight <= 0) {
            console.warn(`Dimensiuni disponibile pentru canvas sunt <= 0. W: ${availableWidth}, H: ${availableHeight}. Verifică structura și CSS-ul.`);
            canvas.width = BOX_SIZE * 10; // Fallback
            canvas.height = BOX_SIZE * 10;
            console.log("--- resizeCanvas END (fallback) ---");
            return;
        }
        
        const newSizeBase = Math.min(availableWidth, availableHeight);
        canvas.width = Math.floor(newSizeBase / box) * box;
        canvas.height = Math.floor(newSizeBase / box) * box;

        console.log(`Canvas resized to: ${canvas.width}x${canvas.height} (based on available W/H: ${availableWidth.toFixed(0)}/${availableHeight.toFixed(0)})`);
        console.log("--- resizeCanvas END ---");
    }
    resizeCanvas(); // Apel inițial la crearea jocului

    // --- Starea jocului, DOM elements, funcții helper, events etc. (codul tău existent) ---
    let snake, dir, food, score, mult, speed, highScore, currentLevel;
    let paused, over, wallPass, magnet, shield;
    let activeColor, special, effects, effectId, particles, obstacles;
    let values, collected, analytics;
    let lastTime, repelCountdown, journalEntries, language;
    let slowMotion, clarityMap, breathingActive;

    const scoreEl = document.getElementById('snakeScore'), highScoreEl = document.getElementById('snakeHighScore');
    const levelDisplayEl = document.getElementById('snakeLevelDisplay'), effectEl = document.getElementById('snakeEffect');
    const statusBar = document.getElementById('snakeStatus'), restartBtn = document.getElementById('snakeRestartBtn');
    const fullResetBtn = document.getElementById('snakeFullResetBtn'), introEl = document.getElementById('snakeIntro');
    const journalBtn = document.getElementById('snakeJournalBtn'), journalModal = document.getElementById('snakeJournalModal');
    const journalEntry = document.getElementById('snakeJournalEntry'), saveJournal = document.getElementById('snakeSaveJournal');
    const exportJournal = document.getElementById('snakeExportJournal'), viewJournal = document.getElementById('snakeViewJournal');
    const closeJournalModalBtn = document.getElementById('snakeCloseJournalModal'), viewJournalContentEl = document.getElementById('snakeViewJournalContent');
    const shopBtn = document.getElementById('snakeShopBtn'), shopModal = document.getElementById('snakeShopModal');
    const shopItemsEl = document.getElementById('snakeShopItems'), closeShopModalBtn = document.getElementById('snakeCloseShopModal');
    const minigameModal = document.getElementById('snakeMinigameModal'), minigameContentEl = document.getElementById('snakeMinigameContent');
    const closeMinigameModalBtn = document.getElementById('snakeCloseMinigameModal'), langBtn = document.getElementById('snakeLangBtn');
    const controlsEl = document.getElementById('snakeControls');
    const valueEls = { empatie: document.getElementById('snakeEmpatie'), curaj: document.getElementById('snakeCuraj'), rabdare: document.getElementById('snakeRabdare') };


    // --- ÎNCĂRCARE STARE JOC ---
    function loadGameState() { /* ... codul tău ... */ 
        highScore = parseInt(localStorage.getItem('snakeGameHighScoreV2')) || 0;
        currentLevel = parseInt(localStorage.getItem('snakeGameCurrentLevelV2')) || 0; // Atenție: Nivelul începe de la 0 intern
        score = parseInt(localStorage.getItem('snakeGameScoreV2')) || 0;
        values = JSON.parse(localStorage.getItem('snakeGameValuesV2')) || { empatie: 0, curaj: 0, rabdare: 0 };
        shield = JSON.parse(localStorage.getItem('snakeGameShieldV2')) || { level: 1, hits: 1 };
        slowMotion = JSON.parse(localStorage.getItem('snakeGameSlowMotionV2')) || false;
        clarityMap = JSON.parse(localStorage.getItem('snakeGameClarityMapV2')) || false;
        journalEntries = JSON.parse(localStorage.getItem('snakeGameJournalV2')) || [];
        analytics = { sessions: JSON.parse(localStorage.getItem('snakeGameAnalyticsV2')) || [], current: {} };
        language = localStorage.getItem('snakeGameLanguageV2') || 'ro';

        if(highScoreEl) highScoreEl.textContent = highScore;
    }
    // --- SALVARE STARE JOC ---
    function saveGameState() { /* ... codul tău ... */ 
        localStorage.setItem('snakeGameHighScoreV2', highScore);
        localStorage.setItem('snakeGameCurrentLevelV2', currentLevel);
        localStorage.setItem('snakeGameScoreV2', score);
        localStorage.setItem('snakeGameValuesV2', JSON.stringify(values));
        localStorage.setItem('snakeGameShieldV2', JSON.stringify(shield));
        localStorage.setItem('snakeGameSlowMotionV2', slowMotion);
        localStorage.setItem('snakeGameClarityMapV2', clarityMap);
        localStorage.setItem('snakeGameJournalV2', JSON.stringify(journalEntries));
        localStorage.setItem('snakeGameAnalyticsV2', JSON.stringify(analytics.sessions));
        localStorage.setItem('snakeGameLanguageV2', language);
        // console.log("Starea jocului Snake a fost salvată.");
    }

    loadGameState();

    // ---------- TRANSLATIONS, LEVELS, SPECIALS, SHOP ITEMS (codul tău) ----------
    const translations = { ro: { score: 'Scor', highScore: 'Maxim', restart: 'Restart Nivel', journal: 'Jurnal', shop: 'Magazin', controls: 'Săgeți/WASD | Space/P: Pauză | J: Jurnal | M: Magazin', save: 'Salvează', export: 'Export PDF', view: 'Vezi Jurnal', journalSaved: 'Jurnal salvat!', journalEmpty: 'Jurnalul este gol.', close: 'Închide', emotionalSummary: 'Rezumat Emoțional', courageFeedback: '🦁 Curajul tău crește! Explorează ce te face puternic.', frustrationFeedback: '🌩️ Ai simțit frustrare. O pauză sau o respirație adâncă pot ajuta.', shieldProtect: '🛡️ Scutul a protejat Copilul Interior', curaj: 'Curaj', rabdare: 'Răbdare', empatie: 'Empatie', acceptare: 'Acceptare', frustrare: 'Frustrare', motivatie: 'Motivație', copil: 'Copil Interior', adult: 'Adult Sănătos', critic: 'Critic Interior', abandon: 'Abandon', izolare: 'Izolare', shopTitle: 'Magazin Interior', dailyQuest: 'Provocarea zilei: Colectează 3 ⭐ Motivație și scrie un gând recunoscător în jurnal.', breathing: 'Exercițiu de Respirație Conștientă', reframe: 'Alege o Afirmație Pozitivă:', stuck: 'Blocaj? Scrie ce te apasă în jurnal.', purchased: 'Cumpărat', InsufficientValues: 'Valori insuficiente!', level: 'Nivel', fullReset: 'Reset Joc Complet', Felicitări: 'Felicitări!', 'Ai finalizat Călătoria Interioară!': 'Ai finalizat Călătoria Interioară!', 'Poți continua explorarea sau reseta jocul.': 'Poți continua explorarea sau reseta jocul.', 'MaxedOut': 'Nivel Maxim', 'achiziționat': 'achiziționat', 'Nivelul': 'Nivelul', 'Ești sigur că vrei să resetezi tot progresul jocului?': 'Ești sigur că vrei să resetezi tot progresul jocului?' }, en: { score: 'Score', highScore: 'High Score', restart: 'Restart Level', journal: 'Journal', shop: 'Shop', controls: 'Arrows/WASD | Space/P: Pause | J: Journal | M: Shop', save: 'Save', export: 'Export PDF', view: 'View Journal', journalSaved: 'Journal saved!', journalEmpty: 'Journal is empty.', close: 'Close', emotionalSummary: 'Emotional Summary', courageFeedback: '🦁 Your courage grows! Explore what makes you strong.', frustrationFeedback: '🌩️ You felt frustration. A break or deep breath can help.', shieldProtect: '🛡️ Shield protected the Inner Child', curaj: 'Courage', rabdare: 'Patience', empatie: 'Empathy', acceptare: 'Acceptance', frustrare: 'Frustration', motivatie: 'Motivation', copil: 'Inner Child', adult: 'Healthy Adult', critic: 'Inner Critic', abandon: 'Abandonment', izolare: 'Isolation', shopTitle: 'Inner Shop', dailyQuest: 'Daily Quest: Collect 3 ⭐ Motivation and write a grateful thought in your journal.', breathing: 'Mindful Breathing Exercise', reframe: 'Choose a Positive Affirmation:', stuck: 'Feeling stuck? Write what troubles you in the journal.', purchased: 'Purchased', InsufficientValues: 'Insufficient values!', level: 'Level', fullReset: 'Full Game Reset', Felicitări: 'Congratulations!', 'Ai finalizat Călătoria Interioară!': 'You have completed the Inner Journey!', 'Poți continua explorarea sau reseta jocul.': 'You can continue exploring or reset the game.', 'MaxedOut': 'Max Level', 'achiziționat': 'purchased', 'Nivelul': 'Level', 'Ești sigur că vrei să resetezi tot progresul jocului?': 'Are you sure you want to reset all game progress?' } };
    const levels = [ 
        { theme: 'Curaj', message: 'Explorează curajul. Ce te motivează?', specials: ['curaj', 'motivatie'], obstacles: 1, bgColor: 'rgba(255, 179, 71, 0.3)', snakeColor: '#ffb347', mechanic: null },
        { theme: 'Răbdare', message: 'Practică răbdarea. Cum te ajută să te calmezi?', specials: ['rabdare', 'acceptare'], obstacles: 2, bgColor: 'rgba(126, 217, 87, 0.3)', snakeColor: '#7ed957', mechanic: 'slowObstacles' },
        { theme: 'Empatie', message: 'Conectează-te. Ce simți când ești empatic?', specials: ['empatie', 'adult'], obstacles: 1, bgColor: 'rgba(89, 165, 224, 0.3)', snakeColor: '#59a5e0', mechanic: 'magnetFood' },
        { theme: 'Acceptare', message: 'Acceptă vulnerabilitățile. Ce te eliberează?', specials: ['acceptare', 'copil', 'rabdare'], obstacles: 2, bgColor: 'rgba(179, 136, 255, 0.3)', snakeColor: '#b388ff', mechanic: 'wallPassTemp' },
        { theme: 'Înfruntarea Criticului', message: 'Înfruntă criticul. Ce îți spui pentru a merge mai departe?', specials: ['critic', 'abandon', 'motivatie', 'adult'], obstacles: 0, bgColor: 'rgba(208, 0, 0, 0.4)', snakeColor: '#d00000', mechanic: 'bossCritique' }
    ];
    const specials = [ /* ... codul tău ... */ 
        { type: 'curaj', symbol: '🦁', color: '#ffb347', valueType: 'curaj', points: 1, effect: () => { boost(1.5, t('curaj')); }, revert: endBoost, duration: 5000 },
        { type: 'rabdare', symbol: '⏳', color: '#7ed957', valueType: 'rabdare', points: 1, effect: () => { slow(t('rabdare')); }, revert: resetSpeed, duration: 7000 },
        { type: 'empatie', symbol: '💙', color: '#59a5e0', valueType: 'empatie', points: 1, effect: () => { magnet = true; flash(t('empatie') + ' Magnet Activ!'); }, revert: () => { magnet = false; }, duration: 8000 },
        { type: 'acceptare', symbol: '🌀', color: '#b388ff', valueType: 'acceptare', points: 1, effect: () => { wallPass = true; flash(t('acceptare') + ' - Treci prin Ziduri!'); }, revert: () => { wallPass = false; }, duration: 6000 },
        { type: 'motivatie', symbol: '⭐', color: '#ffe166', valueType: 'motivatie', points: 1, effect: () => { score += 5 * mult; updateScore(); flash(t('motivatie') + ' +5 Pcte!'); }, revert: null },
        { type: 'copil', symbol: '👶🛡️', color: '#ffd1dc', valueType: 'copil', points: 0, effect: () => { shield.hits = Math.max(shield.hits, shield.level); flash(t('copil') + ' Protejat!'); }, revert: null },
        { type: 'adult', symbol: '🧘', color: '#90e0ef', valueType: 'adult', points: 0, effect: () => { endNegativeEffects(); boost(1.2, t('adult') + ' Prezent!'); }, revert: endBoost, duration: 7000 },
        { type: 'critic', symbol: '🗣️💬', color: '#d00000', negative: true, effect: () => { invertDirection(); flash(t('critic') + ' Interior Activ!'); addActiveEffect(t('critic'), 3000, () => {}); }, revert: null },
        { type: 'abandon', symbol: '💔', color: '#6d6875', negative: true, effect: () => { shrinkSnake(); flash(t('abandon') + ' - Te Simți Mic...'); addActiveEffect(t('abandon'), 4000); }, revert: null },
        { type: 'izolare', symbol: '🧱', color: '#5a189a', negative: true, effect: () => { repelFood(); flash(t('izolare') + ' - Mâncarea Fuge!'); addActiveEffect(t('izolare'), 5000); }, revert: null },
        { type: 'frustrare', symbol: '🤯', color: '#ff686b', negative: true, effect: () => { speedUpTemporary(t('frustrare') + ' Intensă!'); addActiveEffect(t('frustrare'), 3000); }, revert: resetSpeed }
    ];
    const shopItemsList = [ /* ... codul tău ... */ 
        { id: 'shieldUpgrade', name: 'Upgrade Scut Copil', cost: { curaj: 5, rabdare: 3 }, effect: () => { shield.level++; shield.hits = shield.level; flash('Scut Îmbunătățit la Nivelul ' + shield.level); saveGameState(); }, maxLevel: 3, currentLevelFn: () => shield.level-1 },
        { id: 'slowMotionActivate', name: 'Activare Respirație Liniștitoare', cost: { rabdare: 3, empatie: 2 }, effect: () => { slowMotion = true; flash('Respirația Liniștitoare poate fi activată cu R.'); saveGameState(); }, oneTimePurchase: true, purchasedFn: () => slowMotion },
        { id: 'clarityMapActivate', name: 'Activare Hartă Claritate (Obstacole Vizibile)', cost: { empatie: 4, curaj: 2 }, effect: () => { clarityMap = true; flash('Harta Clarității activată!'); saveGameState(); }, oneTimePurchase: true, purchasedFn: () => clarityMap },
        { id: 'valueBoostCuraj', name: 'Focus pe Curaj (Crește șansa 🦁)', cost: { motivatie: 5 }, effect: () => { flash('Focus pe Curaj activat!');}, oneTimePurchase: false}
    ];

    // ---------- HELPERS (codul tău) ----------
    function t(key) { return translations[language]?.[key] || translations['ro']?.[key] || key; }
    function spawnFree(avoidPlayer = true, minDistance = 0) { /* ... codul tău ... */ 
        let p, attempts = 0;
        const maxAttempts = (canvas.width / box) * (canvas.height / box);
        do {
            p = {
                x: Math.floor(Math.random() * (canvas.width / box)) * box,
                y: Math.floor(Math.random() * (canvas.height / box)) * box
            };
            attempts++;
            if (attempts > maxAttempts) {
                console.warn("Nu s-a putut găsi un spațiu liber pentru spawn.");
                return snake.length > 0 ? snake[0] : { x: 0, y: 0}; // Failsafe
            }
        } while (
            (avoidPlayer && snake.some(seg => seg.x === p.x && seg.y === p.y && (minDistance === 0 || Math.abs(seg.x - p.x) < minDistance * box || Math.abs(seg.y - p.y) < minDistance * box))) ||
            obstacles.some(o => o.x === p.x && o.y === p.y) ||
            (food && p.x === food.x && p.y === food.y) ||
            (special && p.x === special.x && p.y === special.y)
        );
        return p;
    }
    function newFood() { food = spawnFree(true, 3); }
    function newSpecial() { /* ... codul tău ... */ 
        if (special) return; 
        const currentLvlData = levels[currentLevel];
        const levelSpecialsTypes = currentLvlData?.specials || specials.map(s => s.type);
        const availableSpecialsPool = specials.filter(s => levelSpecialsTypes.includes(s.type) && !s.isBoss); 

        if (availableSpecialsPool.length === 0) return;
        const randomSpecialTemplate = availableSpecialsPool[Math.floor(Math.random() * availableSpecialsPool.length)];
        special = { ...randomSpecialTemplate, ...spawnFree(true, 4) };
    }
    function spawnObstacle() { obstacles.push(spawnFree()); }
    function updateScore() { /* ... codul tău ... */ 
        if(scoreEl) scoreEl.textContent = score;
        if (score > highScore) {
            highScore = score;
            if(highScoreEl) highScoreEl.textContent = highScore;
        }
        if(analytics && analytics.current) analytics.current.score = score;
    }
    function updateValues() { /* ... codul tău ... */ 
        if(valueEls.empatie) valueEls.empatie.textContent = values.empatie;
        if(valueEls.curaj) valueEls.curaj.textContent = values.curaj;
        if(valueEls.rabdare) valueEls.rabdare.textContent = values.rabdare;
    }
    function updateLevelDisplay() { if(levelDisplayEl) levelDisplayEl.textContent = currentLevel + 1; }
    function flash(text, duration = 1800, type = 'info') { /* ... codul tău ... */ 
      if(!effectEl) return;
      effectEl.innerHTML = text;
      effectEl.className = 'game-effect'; 
      if (type === 'good') effectEl.classList.add('positive');
      else if (type === 'bad') effectEl.classList.add('negative');
      effectEl.style.opacity = 1;
      setTimeout(() => { if(effectEl) effectEl.style.opacity = 0; }, duration);
    }
    function changeSpeed(newSpeed) { speed = Math.max(50, Math.min(350, newSpeed)); }
    function resetSpeed() { /* ... codul tău ... */ 
        speed = INITIAL_SNAKE_SPEED + (currentLevel * 5); 
        activeColor = null;
    }
    function boost(factor, label) { /* ... codul tău ... */ 
        mult = factor;
        activeColor = (levels[currentLevel] && levels[currentLevel].snakeColor) || '#ffb347';
        flash(label, 3000, 'good');
        addActiveEffect(label, 3000, endBoost);
    }
    function endBoost() { mult = 1; activeColor = null; }
    function speedUpTemporary(label) { /* ... codul tău ... */ 
        const originalSpeed = speed;
        changeSpeed(speed * 0.6);
        activeColor = '#ff3030';
        flash(label, 3000, 'bad');
        setTimeout(() => {
            if (speed < originalSpeed) speed = originalSpeed; 
            activeColor = null;
        }, 3000);
    }
    function slow(label) { /* ... codul tău ... */ 
        const originalSpeed = speed;
        changeSpeed(speed * 1.6); 
        activeColor = '#7ed957';
        flash(label, 5000, 'good');
        addActiveEffect(label, 5000, () => {
            if (speed > originalSpeed) speed = originalSpeed;
            activeColor = null;
        });
    }
    function endNegativeEffects() { /* ... codul tău ... */ 
        effects = effects.filter(e => !e.isNegative); 
        if(statusBar) statusBar.querySelectorAll('.neg-effect').forEach(el => el.remove());
        flash("Efecte negative înlăturate!", 2000, 'good');
    }
    function invertDirection() { /* ... codul tău ... */ 
        if (dir === 'LEFT') dir = 'RIGHT';
        else if (dir === 'RIGHT') dir = 'LEFT';
        else if (dir === 'UP') dir = 'DOWN';
        else if (dir === 'DOWN') dir = 'UP';
    }
    function shrinkSnake() { /* ... codul tău ... */ 
        const amountToShrink = Math.min(snake.length -1, 2);
        for(let i=0; i<amountToShrink; i++) if(snake.length > 1) snake.pop();
    }
    function repelFood() { repelCountdown = Math.floor(5000 / (speed || INITIAL_SNAKE_SPEED)); }
    function addActiveEffect(name, durationMs, onEndCallback = null) { /* ... codul tău ... */ 
        if(!statusBar) return 'no-status-bar-' + effectId;
        const id = 'activeEffect' + (++effectId);
        const effectData = { id, name, durationMs, timeLeftMs: durationMs, onEnd: onEndCallback, isNegative: specials.find(s=>s.type === name || t(s.type) === name)?.negative };

        const span = document.createElement('div');
        span.className = 'stat-effect';
        if (effectData.isNegative) span.classList.add('neg-effect');
        span.id = id;

        const textSpan = document.createElement('span');
        textSpan.textContent = name.length > 15 ? name.substring(0,12) + "..." : name;
        textSpan.title = name; 

        const barContainer = document.createElement('div');
        barContainer.className = 'effect-bar-container';
        const bar = document.createElement('div');
        bar.className = 'effect-bar';
        barContainer.appendChild(bar);

        span.appendChild(textSpan);
        span.appendChild(barContainer);
        statusBar.appendChild(span);

        effects.push(effectData);
        return id;
    }
    function tickEffects(deltaTime) { /* ... codul tău ... */ 
        if(!statusBar || effects.length === 0) return;
        for (let i = effects.length - 1; i >= 0; i--) {
            const effect = effects[i];
            effect.timeLeftMs -= deltaTime;

            const s = document.getElementById(effect.id);
            if (s) {
                const barEl = s.querySelector('.effect-bar');
                if (barEl) {
                    barEl.style.width = Math.max(0, (effect.timeLeftMs / effect.durationMs)) * 100 + '%';
                }
            }

            if (effect.timeLeftMs <= 0) {
                if (s) s.remove();
                if (effect.onEnd) effect.onEnd();
                effects.splice(i, 1);
            }
        }
    }
    function spawnParticles(x, y, color, count = PARTICLE_COUNT) { /* ... codul tău ... */ 
      for (let i = 0; i < count; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * box * 0.5, 
            y: y + (Math.random() - 0.5) * box * 0.5,
            vx: (Math.random() - 0.5) * (3 + Math.random() * 2), 
            vy: (Math.random() - 0.5) * (3 + Math.random() * 2),
            alpha: 0.8 + Math.random() * 0.2,
            color,
            size: 2 + Math.random() * 3, 
            decay: 0.02 + Math.random() * 0.02 
        });
      }
    }

    // ---------- LEVEL MECHANICS ----------
    function applyLevelMechanics() { /* ... codul tău ... */ 
        if (currentLevel >= levels.length) return;
        const lvlData = levels[currentLevel];
        if (!lvlData) return;
        canvas.style.backgroundColor = lvlData.bgColor || '#1d2230';
        const mechanic = lvlData.mechanic;
        if (mechanic === 'slowObstacles') { flash("Atenție la obstacolele lente!", 2000); }
        else if (mechanic === 'magnetFood') { magnet = true; flash("Mâncarea este atrasă de tine!", 3000, 'good'); addActiveEffect("Magnet Mâncare", 15000, () => magnet = false); }
        else if (mechanic === 'wallPassTemp') { wallPass = true; flash("Poți trece prin ziduri temporar!", 3000, 'good'); addActiveEffect("Trecere Ziduri", 10000, () => wallPass = false); }
        else if (mechanic === 'bossCritique') {
            obstacles = []; 
            const bossTemplate = specials.find(s => s.type === 'critic');
            if(bossTemplate) {
                 special = {
                    ...bossTemplate, 
                    ...spawnFree(true, 5), 
                    isBoss: true,
                    bossMaxHits: 3 + currentLevel, 
                    bossCurrentHits: 3 + currentLevel,
                    symbol: 'BOSS 🗣️💬'
                };
                flash(`Înfruntă ${t('Critic Interior')} BOSS! Lovește-l de ${special.bossCurrentHits} ori!`, 3500, 'bad');
            }
        }
    }

    // ---------- JOURNAL, SHOP, MINIGAMES (cu modale stilizate) ----------
    function setupModal(modalElement, openBtnElement, closeBtnElement, onOpenCallback = null) { /* ... codul tău ... */ 
        if (openBtnElement && modalElement && closeBtnElement) {
            openBtnElement.onclick = () => {
                if (paused && !modalElement.classList.contains('hidden')) {
                    modalElement.classList.add('hidden');
                } else {
                    paused = true; 
                    [journalModal, shopModal, minigameModal].forEach(m => {
                        if (m && m !== modalElement) m.classList.add('hidden');
                    });
                    modalElement.classList.remove('hidden');
                    if (onOpenCallback) onOpenCallback();
                }
            };
            closeBtnElement.onclick = () => {
                modalElement.classList.add('hidden');
                if (canvas) canvas.focus(); 
            };
        }
    }
    if(journalModal && journalBtn && closeJournalModalBtn) setupModal(journalModal, journalBtn, closeJournalModalBtn, () => { if(journalEntry) journalEntry.focus(); if(viewJournalContentEl) viewJournalContentEl.classList.add('hidden'); });
    if(shopModal && shopBtn && closeShopModalBtn) setupModal(shopModal, shopBtn, closeShopModalBtn, populateShop);
    
    if(saveJournal) saveJournal.onclick = () => { /* ... */ };
    if(exportJournal) exportJournal.onclick = () => { /* ... */ };
    if(viewJournal) viewJournal.onclick = () => { /* ... */ };
    
    function populateShop() { /* ... codul tău ... */ 
        if(!shopItemsEl) return;
        shopItemsEl.innerHTML = '';
        shopItemsList.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'shop-item-btn';
            let currentItemLevel = item.currentLevelFn ? item.currentLevelFn() : 0;
            let purchased = item.purchasedFn ? item.purchasedFn() : false;
            let costString = Object.entries(item.cost).map(([k, v]) => `${v} ${t(k)}`).join(', ');
            let nameString = t(item.name);

            if (item.maxLevel && currentItemLevel >= item.maxLevel) {
                btn.innerHTML = `<div>${nameString} (Max Nivel)</div><div class="shop-item-cost">${t('MaxedOut')}</div>`;
                btn.disabled = true;
            } else if (item.oneTimePurchase && purchased) {
                btn.innerHTML = `<div>${nameString}</div><div class="shop-item-cost">${t('purchased')}</div>`;
                btn.disabled = true;
            } else {
                 btn.innerHTML = `<div>${nameString} ${item.maxLevel ? `(Nv. ${currentItemLevel+1})` : ''}</div><div class="shop-item-cost">Cost: ${costString}</div>`;
            }

            btn.onclick = () => {
                if (btn.disabled) return;
                let canAfford = true;
                for (const [key, val] of Object.entries(item.cost)) {
                    if (!values[key] || values[key] < val) {
                        canAfford = false;
                        break;
                    }
                }

                if (canAfford) {
                    Object.entries(item.cost).forEach(([k, v]) => values[k] -= v);
                    item.effect(); 
                    updateValues();
                    flash(`${t(item.name)} ${t('achiziționat')}!`, 2000, 'good');
                    populateShop(); 
                    saveGameState(); 
                } else {
                    flash(t('InsufficientValues'), 2000, 'bad');
                }
            };
            shopItemsEl.appendChild(btn);
        });
    }
    function startBreathing() { /* ... */ }
    function startReframe() { /* ... */ }
    if(closeMinigameModalBtn && minigameModal) closeMinigameModalBtn.onclick = () => { minigameModal.classList.add('hidden'); canvas.focus(); };


    // ---------- LANGUAGE ----------
    function setLanguage(lang) { /* ... codul tău, adaptat pentru a verifica existența elementelor ... */ 
        language = lang;
        const gameInterfaceEl = document.getElementById('snakeGameInterface');
        if (!gameInterfaceEl) return; // Ieși dacă UI-ul jocului nu e (încă) în DOM

        const titleH2 = gameInterfaceEl.querySelector('h2');
        if (titleH2) titleH2.textContent = t('Snake 🐍 – Călătoria Interioară'); // Titlul e fix, dar poate ai alte titluri
        
        const scoreLabel = scoreEl?.parentNode?.firstChild;
        if (scoreLabel && scoreLabel.nodeType === Node.TEXT_NODE) scoreLabel.textContent = t('score') + ": ";
        
        const highScoreLabel = highScoreEl?.parentNode?.firstChild;
        if (highScoreLabel && highScoreLabel.nodeType === Node.TEXT_NODE) highScoreLabel.textContent = t('highScore') + ": ";

        const levelLabelNodes = levelDisplayEl?.parentElement?.childNodes;
        if (levelLabelNodes) {
            for(let node of levelLabelNodes){
                if(node.nodeType === Node.TEXT_NODE && node.textContent.trim().startsWith("Nivel") || node.textContent.trim().startsWith("Level")){
                    node.textContent = " " + t('level') + ": ";
                    break;
                }
            }
        }
        
        if(controlsEl) controlsEl.textContent = t('controls');
        if(restartBtn) restartBtn.textContent = t('restart');
        if(fullResetBtn) fullResetBtn.textContent = t('fullReset');
        if(journalBtn) journalBtn.textContent = t('journal');
        if(shopBtn) shopBtn.textContent = t('shop');
        if(langBtn) langBtn.textContent = (language === 'ro' ? 'English' : 'Română');

        if(journalModal) journalModal.querySelector('.modal-title').textContent = t('Jurnal Emoțional (Joc)');
        if(journalEntry) journalEntry.placeholder = t('Notează-ți gândurile...');
        if(saveJournal) saveJournal.textContent = t('save');
        if(exportJournal) exportJournal.textContent = t('export');
        if(viewJournal) viewJournal.textContent = t('view');
        if(closeJournalModalBtn) closeJournalModalBtn.textContent = t('close');
        
        if(shopModal) shopModal.querySelector('.modal-title').textContent = t('shopTitle');
        if(closeShopModalBtn) closeShopModalBtn.textContent = t('Închide Magazin'); // Sau t('close') dacă e generic

        if(closeMinigameModalBtn) closeMinigameModalBtn.textContent = t('Închide Minijoc'); // Sau t('close')

        if(langBtn) langBtn.setAttribute('aria-label', language === 'ro' ? 'Switch to English' : 'Schimbă în Română');
        
        if (introEl && !introEl.classList.contains('hidden') && currentLevel < levels.length) {
             introEl.innerHTML = `
                <strong class="text-base sm:text-lg">${t('level')} ${currentLevel + 1}: ${t(levels[currentLevel].theme)}</strong><br>
                <span class="text-xs sm:text-sm">${t(levels[currentLevel].message)}</span><br>
                <em class="text-xs text-gray-400">${t('dailyQuest')}</em>`;
        }
        updateValues(); 
    }
    if(langBtn) langBtn.onclick = () => { setLanguage(language === 'ro' ? 'en' : 'ro'); saveGameState(); };


    // ---------- ANALYTICS ----------
    function saveAnalytics() { /* ... codul tău ... */ 
        if (!analytics || !analytics.current) return;
        analytics.current.timeEnded = Date.now();
        analytics.current.level = currentLevel;
        analytics.current.finalValues = { ...values };
        analytics.sessions.push({ ...analytics.current });
        // localStorage.setItem('snakeGameAnalyticsV2', JSON.stringify(analytics.sessions)); // Salvarea se face în saveGameState
        // console.log("Snake game analytics for session saved.");
    }
    function checkStuck() { /* ... */ }

    // ---------- FULL RESET GAME & NEXT LEVEL SETUP ----------
    function fullResetGameToLevelZero() { /* ... codul tău ... */ 
        currentLevel = 0; // Nivelul începe de la 0 intern
        score = 0;
        values = { empatie: 0, curaj: 0, rabdare: 0 };
        shield = { level: 1, hits: 1 }; 
        slowMotion = false;
        clarityMap = false;
        // highScore nu se resetează
        nextLevelSetup(true); // true pentru reset complet
        saveGameState(); 
    }

    function nextLevelSetup(isInitialOrFullReset = false) { /* ... codul tău ... */ 
        snake = [{ x: Math.floor(canvas.width / box / 2) * box, y: Math.floor(canvas.height / box / 2) * box }];
        dir = ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)];

        if (!isInitialOrFullReset) {
            // Păstrează scor, valori dacă e doar trecere la nivel nou
        } else {
             score = 0; 
             values = { empatie: 0, curaj: 0, rabdare: 0 };
             shield = { level: 1, hits: 1 };
             slowMotion = false;
             clarityMap = false;
        }

        mult = 1;
        speed = INITIAL_SNAKE_SPEED - (currentLevel * 3);
        speed = Math.max(80, speed); 
        wallPass = magnet = false;
        if(shield) shield.hits = shield.level; // Asigură-te că shield e definit

        activeColor = null;
        over = false;
        paused = isInitialOrFullReset ? false : true; 

        special = null;
        effects = [];
        particles = [];
        obstacles = [];
        if (statusBar) statusBar.innerHTML = '';

        collected = { curaj: 0, rabdare: 0, empatie: 0, acceptare: 0, frustrare: 0, motivatie: 0, critic: 0, abandon: 0, izolare: 0, adult: 0, copil: 0 };
        if(analytics && analytics.current) { // Asigură-te că analytics.current e definit
            analytics.current = { scoreAtLevelStart: score, valuesAtLevelStart: { ...values }, obstacles: [], timeLevelStart: Date.now() };
        }


        updateScore();
        updateValues();
        updateLevelDisplay();
        newFood();
        if (Math.random() < 0.2) newSpecial();

        if(restartBtn) restartBtn.classList.add('hidden');

        if (currentLevel < levels.length) {
            const currentLvlData = levels[currentLevel];
            if(introEl && currentLvlData) {
                introEl.innerHTML = `
                    <strong class="text-base sm:text-lg">${t('level')} ${currentLevel + 1}: ${t(currentLvlData.theme)}</strong><br>
                    <span class="text-xs sm:text-sm">${t(currentLvlData.message)}</span><br>
                    <em class="text-xs text-gray-400">${t('dailyQuest')}</em>`;
                introEl.classList.remove('hidden');
            }

            setTimeout(() => {
                if(introEl) introEl.classList.add('hidden');
                paused = false;
                if (currentLvlData) applyLevelMechanics(); // Verifică currentLvlData
                if (gameVisibleAndActive && !over && !paused) {
                     lastTime = performance.now();
                     requestAnimationFrame(gameLoop);
                }
            }, isInitialOrFullReset ? 100 : 3500);

            obstacles = [];
            if (currentLvlData) { // Verifică currentLvlData
                 for (let i = 0; i < (currentLvlData.obstacles || 0); i++) spawnObstacle();
            }
        } else { // Joc finalizat
            if(introEl) {
                introEl.innerHTML = `<strong class="text-lg">${t('Felicitări!')}</strong><br><span class="text-sm">${t('Ai finalizat Călătoria Interioară!')}</span><br><em class="text-xs">${t('Poți continua explorarea sau reseta jocul.')}</em>`;
                introEl.classList.remove('hidden');
                paused = true; 
            }
        }
        if (!isInitialOrFullReset) {
            lastTime = performance.now();
        }
    }


    // ---------- DRAW (cu îmbunătățiri vizuale) ----------
    function draw() { /* ... codul tău, asigură-te că folosești `chroma` în siguranță ... */ 
        if (!ctx || !canvas) return;
        const currentLvlData = levels[currentLevel] || levels[levels.length-1]; 
        const baseBg = (currentLvlData && currentLvlData.bgColor) ? currentLvlData.bgColor : 'rgba(29, 34, 48, 0.5)'; 
        
        let snakeHeadColorToUse = '#36a26b'; // Default
        if (activeColor) snakeHeadColorToUse = activeColor;
        else if (shield && shield.hits > 0) snakeHeadColorToUse = '#FFACE4';
        else if (currentLvlData && currentLvlData.snakeColor) snakeHeadColorToUse = currentLvlData.snakeColor;

        let snakeBodyColorToUse = '#88dab2'; // Default
        if (shield && shield.hits > 0) snakeBodyColorToUse = '#FFD1F0';
        else if (currentLvlData && currentLvlData.snakeColor && typeof chroma !== 'undefined') {
             try { snakeBodyColorToUse = chroma(currentLvlData.snakeColor).darken(0.5).hex(); } catch(e) { /* fallback la default dacă chroma eșuează */ }
        } else if (currentLvlData && currentLvlData.snakeColor) {
            snakeBodyColorToUse = currentLvlData.snakeColor; // Fără darken dacă chroma nu e disponibil
        }


        const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 1.5);
        if (typeof chroma !== 'undefined') {
            try {
                gradient.addColorStop(0, chroma(baseBg).brighten(0.3).alpha(0.8).css());
                gradient.addColorStop(1, chroma(baseBg).alpha(0.9).css());
            } catch (e) { 
                 gradient.addColorStop(0, baseBg); gradient.addColorStop(1, baseBg);
            }
        } else {
             gradient.addColorStop(0, baseBg); gradient.addColorStop(1, baseBg);
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        snake.forEach((seg, i) => {
            ctx.beginPath();
            if (i === 0) { 
                ctx.fillStyle = snakeHeadColorToUse;
                ctx.arc(seg.x + box / 2, seg.y + box / 2, box / 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.fillStyle = 'white';
                let eyeOffsetX = dir === 'LEFT' ? -box/4 : (dir === 'RIGHT' ? box/4 : 0);
                let eyeOffsetY = dir === 'UP' ? -box/4 : (dir === 'DOWN' ? box/4 : 0);
                if (dir === 'LEFT' || dir === 'RIGHT') { 
                    ctx.fillRect(seg.x + box/2 + eyeOffsetX - 1, seg.y + box/4 -1, 2, 2);
                    ctx.fillRect(seg.x + box/2 + eyeOffsetX - 1, seg.y + box*0.75 -1 -1, 2, 2); 
                } else { 
                     ctx.fillRect(seg.x + box/4 -1, seg.y + box/2 + eyeOffsetY -1, 2, 2);
                     ctx.fillRect(seg.x + box*0.75 -1 -1, seg.y + box/2 + eyeOffsetY -1, 2, 2);
                }
            } else { 
                ctx.fillStyle = snakeBodyColorToUse;
                const radius = box / 4;
                ctx.beginPath();
                ctx.moveTo(seg.x + radius, seg.y);
                ctx.lineTo(seg.x + box - radius, seg.y);
                ctx.quadraticCurveTo(seg.x + box, seg.y, seg.x + box, seg.y + radius);
                ctx.lineTo(seg.x + box, seg.y + box - radius);
                ctx.quadraticCurveTo(seg.x + box, seg.y + box, seg.x + box - radius, seg.y + box);
                ctx.lineTo(seg.x + radius, seg.y + box);
                ctx.quadraticCurveTo(seg.x, seg.y + box, seg.x, seg.y + box - radius);
                ctx.lineTo(seg.x, seg.y + radius);
                ctx.quadraticCurveTo(seg.x, seg.y, seg.x + radius, seg.y);
                ctx.closePath();
                ctx.fill();
            }
            if (typeof chroma !== 'undefined') {
                try { ctx.strokeStyle = chroma(ctx.fillStyle).darken(1.5).hex(); } catch(e) { ctx.strokeStyle = '#000';}
            } else {
                 ctx.strokeStyle = '#555'; // Fallback border
            }
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        if(food) { 
            ctx.fillStyle = '#FF6B6B'; // Roșu pentru mâncare
            ctx.beginPath();
            ctx.arc(food.x + box / 2, food.y + box / 2, box / 2.2, 0, 2 * Math.PI); // Puțin mai mic
            ctx.fill();
            ctx.fillStyle = '#FFE66D'; // Galben pentru "sâmbure"
            ctx.beginPath();
            ctx.arc(food.x + box / 2, food.y + box / 2, box / 5, 0, 2 * Math.PI);
            ctx.fill();
        }
        if (special) { 
            ctx.fillStyle = special.color;
            ctx.beginPath();
            ctx.arc(special.x + box/2, special.y + box/2, box/1.8, 0, 2* Math.PI); // Mai mare pentru special
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.8)'; // Text alb cu transparență
            ctx.font = `${box * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(special.symbol, special.x + box / 2, special.y + box / 2 + 1); // +1 pentru aliniere
             if (special.isBoss) {
                ctx.fillStyle = 'white';
                ctx.font = `${box * 0.3}px Arial`;
                ctx.fillText(`${special.bossCurrentHits}/${special.bossMaxHits}`, special.x + box / 2, special.y + box * 0.9);
            }
        }
        obstacles.forEach(o => { 
            ctx.fillStyle = '#6c757d'; // Gri pentru obstacole
            ctx.fillRect(o.x, o.y, box, box);
            ctx.strokeStyle = '#343a40'; // Bordură mai închisă
            ctx.lineWidth = 2;
            ctx.strokeRect(o.x, o.y, box, box);
        });
        particles.forEach(p => { 
            if (typeof chroma !== 'undefined') {
                try { ctx.fillStyle = chroma(p.color).alpha(p.alpha).css(); } catch(e) { ctx.fillStyle = 'rgba(200,200,200,'+p.alpha+')'; }
            } else {
                ctx.fillStyle = `rgba(200,200,200,${p.alpha})`; // Fallback particule
            }
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
        });
        particles = particles.filter(p => p.alpha > 0);
    }


    // ---------- GAME LOOP ----------
    let previousTimestamp = 0;
    function gameLoop(timestamp) { /* ... codul tău ... */ 
        const deltaTime = timestamp - previousTimestamp;
        previousTimestamp = timestamp;

        if (!gameVisibleAndActive || over) { 
             if(gameVisibleAndActive && !over && paused) draw(); 
            return; // Nu mai cere requestAnimationFrame dacă nu e vizibil/activ
        }
        if(paused) { 
            draw();
            if (gameVisibleAndActive) requestAnimationFrame(gameLoop); // Continuă bucla de desenare dacă e vizibil și pe pauză
            return;
        }

        if (timestamp - lastTime >= speed) {
            update();
            lastTime = timestamp;
        }
        tickEffects(deltaTime); 
        draw();
        if (gameVisibleAndActive) requestAnimationFrame(gameLoop); // Doar dacă e încă vizibil/activ
    }

    // ---------- UPDATE ----------
    function update() { /* ... codul tău ... */ 
        if (over || paused || !snake || snake.length === 0) return; // Adaugă verificare pentru snake

        const head = { x: snake[0].x, y: snake[0].y };
        if (dir === 'LEFT') head.x -= box;
        else if (dir === 'RIGHT') head.x += box;
        else if (dir === 'UP') head.y -= box;
        else if (dir === 'DOWN') head.y += box;

        if (repelCountdown > 0 && food) {
            const dx = food.x - head.x;
            const dy = food.y - head.y;
            if (Math.abs(dx) < box * 3 && Math.abs(dy) < box * 3) { // Dacă e aproape
                let newFoodX = food.x + Math.sign(dx) * box;
                let newFoodY = food.y + Math.sign(dy) * box;
                // Asigură că nu iese din canvas
                newFoodX = Math.max(0, Math.min(canvas.width - box, newFoodX));
                newFoodY = Math.max(0, Math.min(canvas.height - box, newFoodY));
                food.x = newFoodX;
                food.y = newFoodY;
            }
            repelCountdown--;
        } else if (magnet && food) {
            const dx = food.x - head.x;
            const dy = food.y - head.y;
            if (Math.abs(dx) > box/2 || Math.abs(dy) > box/2) { // Nu e exact pe cap
                if (Math.abs(dx) > Math.abs(dy)) {
                    head.x += Math.sign(dx) * box;
                } else {
                    head.y += Math.sign(dy) * box;
                }
            }
        }


        if (wallPass) { 
            if (head.x < 0) head.x = canvas.width - box;
            else if (head.x >= canvas.width) head.x = 0;
            if (head.y < 0) head.y = canvas.height - box;
            else if (head.y >= canvas.height) head.y = 0;
        }
        else if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) return gameOver('wall');


        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) return gameOver('self');
        }
        for (let o of obstacles) {
            if (head.x === o.x && head.y === o.y) return gameOver('obstacle');
        }

        if (food && head.x === food.x && head.y === food.y) {
            score += mult;
            updateScore();
            newFood();
            spawnParticles(food.x + box / 2, food.y + box / 2, '#34D399');
            navigator.vibrate?.(50);
            if (!special && Math.random() < (0.25 + currentLevel * 0.03) ) newSpecial();
        } else {
            snake.pop();
        }

        if (special && head.x === special.x && head.y === special.y) {
            const sp = { ...special }; 
            special = null; 

            if (sp.isBoss) {
                sp.bossCurrentHits--;
                flash(`Lovitură Critic BOSS! Rămase: ${sp.bossCurrentHits}`, 2000, sp.bossCurrentHits > 0 ? 'bad' : 'good');
                if (sp.bossCurrentHits <= 0) {
                    flash(`${t('CRITICUL INTERIOR')} ÎNVINS!`, 3000, 'good');
                    score += 50 + currentLevel * 10; 
                    updateScore();
                    currentLevel++;
                    saveGameState();
                    setTimeout(() => nextLevelSetup(false), 2500);
                } else {
                    special = { ...sp, ...spawnFree(true, 6) }; 
                }
            } else if (sp.negative && shield && shield.hits > 0) {
                shield.hits--;
                flash(t('shieldProtect') + ` (${shield.hits} ${shield.hits === 1 ? 'lovitură' : 'lovituri'})`, 2000, 'good');
                spawnParticles(sp.x + box/2, sp.y + box/2, '#FFFFFF', 15);
            } else {
                if (sp.type) collected[sp.type] = (collected[sp.type] || 0) + 1;
                if (analytics && analytics.current && analytics.current.obstacles) analytics.current.obstacles.push(sp.type);
                if (sp.valueType && values.hasOwnProperty(sp.valueType)) {
                    values[sp.valueType] += sp.points || 1;
                }
                if (sp.effect) sp.effect(); 

                spawnParticles(sp.x + box / 2, sp.y + box / 2, sp.color, 12);
                navigator.vibrate?.(100);

                if (sp.type === 'critic' && !sp.isBoss) {
                    startReframe();
                }
            }
            updateValues();
            checkStuck();
        }
        snake.unshift(head);

        const levelData = levels[currentLevel];
        if (levelData && !levelData.mechanic?.includes('boss')) { 
            const scoreNeededForNextLevel = (currentLevel + 1) * LEVEL_SCORE_INCREMENT + (currentLevel * 5); 
            if (currentLevel < levels.length - 1 && score >= scoreNeededForNextLevel) {
                currentLevel++;
                flash(`${t('Nivelul')} ${currentLevel + 1}: ${t(levels[currentLevel].theme)} atins!`, 3000, 'good');
                saveGameState(); 
                setTimeout(() => nextLevelSetup(false), 2500);
            }
        }
    }

    // ---------- GAME OVER ----------
    function gameOver(reason = 'unknown') { /* ... codul tău ... */ 
        if (over) return;
        over = true;
        paused = true;
        saveGameState(); 
        saveAnalytics(); 

        let reasonText = '';
        if (reason === 'wall') reasonText = 'Ai lovit un perete.';
        else if (reason === 'self') reasonText = 'Te-ai auto-colizionat.';
        else if (reason === 'obstacle') reasonText = 'Ai lovit un obstacol.';
        
        let raport = `<strong class="text-lg">${t('emotionalSummary')} (${reasonText})</strong><br>`;
        // Adaugă aici mai multe detalii dacă vrei
        flash(raport, 7000, 'bad');

        if(restartBtn) restartBtn.classList.remove('hidden');
        if(fullResetBtn) fullResetBtn.classList.remove('hidden');
    }


    // ---------- CONTROLS ----------
    function handleKeyDown(e) { /* ... codul tău ... */ 
        const isInputFocused = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
        if (isInputFocused && (e.key !== 'Escape')) return; 

        const relevantKeysForPrevent = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'p', 'j', 'm', 'r'];
        if (gameVisibleAndActive && !over && relevantKeysForPrevent.includes(e.key.toLowerCase())) {
            const isActionModalOpen = (journalModal && !journalModal.classList.contains('hidden')) ||
                                     (shopModal && !shopModal.classList.contains('hidden')) ||
                                     (minigameModal && !minigameModal.classList.contains('hidden'));
            if (!isInputFocused || !isActionModalOpen) { 
                e.preventDefault();
            }
        }
         if (e.key === 'Escape') { 
            if (journalModal && !journalModal.classList.contains('hidden')) { if(closeJournalModalBtn) closeJournalModalBtn.click(); return; }
            if (shopModal && !shopModal.classList.contains('hidden')) { if(closeShopModalBtn) closeShopModalBtn.click(); return; }
            if (minigameModal && !minigameModal.classList.contains('hidden')) { if(closeMinigameModalBtn) closeMinigameModalBtn.click(); return; }
            else if (gameVisibleAndActive && !over) {
                paused = !paused;
                flash(paused ? "Joc în Pauză" : "Joc Reluat", 1500);
                if(!paused) { lastTime = performance.now(); if(gameVisibleAndActive) requestAnimationFrame(gameLoop); }
                return;
            }
        }

        if (!gameVisibleAndActive || over || breathingActive) return;
        const k = e.key.toLowerCase();

        if (k === ' ' || k === 'p') { 
            paused = !paused;
            flash(paused ? "Joc în Pauză" : "Joc Reluat", 1500);
            if (!paused) { lastTime = performance.now(); if(gameVisibleAndActive) requestAnimationFrame(gameLoop); }
            return;
        }
        if (k === 'j' && journalBtn) { journalBtn.click(); return; }
        if (k === 'm' && shopBtn) { shopBtn.click(); return; }
        if (k === 'r' && slowMotion && !breathingActive) { startBreathing(); return; }

        if (paused && !(k === ' ' || k === 'p')) return;

        if ((k === 'arrowleft' || k === 'a') && dir !== 'RIGHT') dir = 'LEFT';
        else if ((k === 'arrowup' || k === 'w') && dir !== 'DOWN') dir = 'UP';
        else if ((k === 'arrowright' || k === 'd') && dir !== 'LEFT') dir = 'RIGHT';
        else if ((k === 'arrowdown' || k === 's') && dir !== 'UP') dir = 'DOWN';
    }
    document.addEventListener('keydown', handleKeyDown);
    
    if(restartBtn) restartBtn.onclick = () => { nextLevelSetup(false); saveGameState(); };
    if(fullResetBtn) fullResetBtn.onclick = () => {
        if (confirm(t('Ești sigur că vrei să resetezi tot progresul jocului?'))) {
            fullResetGameToLevelZero();
        }
    };

    // ---------- INITIALIZE SCRIPT & RETURN GAME INSTANCE ----------
    setLanguage(language);
    nextLevelSetup(true); // Inițializează jocul (va seta `paused` la true pentru intro dacă nu e reset)

    gameInitialized = true;
    console.log("Instanța jocului Snake a fost inițializată.");

    return { // Obiectul gameInstance
        pause: () => { if (!paused) { paused = true; flash("Joc în Pauză", 1500); } },
        resume: () => { if (paused && !over) { paused = false; flash("Joc Reluat", 1500); lastTime = performance.now(); if(gameVisibleAndActive) requestAnimationFrame(gameLoop); canvas.focus();} },
        resetCurrentLevel: () => nextLevelSetup(false),
        fullReset: fullResetGameToLevelZero,
        isPaused: () => paused,
        isOver: () => over,
        setGameVisibility: (isVisible) => {
            const oldVisibility = gameVisibleAndActive;
            gameVisibleAndActive = isVisible;
            if (isVisible && !oldVisibility && !over) {
                console.log("SnakeGame: Vizibilitate ON, pornește/reia game loop.");
                // paused = false; // Reluarea e gestionată de resume() sau de nextLevelSetup
                lastTime = performance.now();
                requestAnimationFrame(gameLoop); // Asigură pornirea buclei
                if(canvas) canvas.focus();
            } else if (!isVisible && oldVisibility && !paused) {
                console.log("SnakeGame: Vizibilitate OFF, pune jocul pe pauză.");
                paused = true;
            }
        },
        triggerResize: resizeCanvas, // Expune funcția de resize
        cleanup: () => {
            document.removeEventListener('keydown', handleKeyDown);
            // Aici poți adăuga și alte operațiuni de curățare, ex: oprire sunete, intervale
            gameInitialized = false;
            gameInstance = null; // Distruge instanța
            console.log("Snake game instance cleaned up.");
        }
    };
}

// --- GESTIONARE MODAL PRINCIPAL ȘI PORNIRE JOC ---
document.addEventListener('DOMContentLoaded', () => {
    const launchModalBtn = document.getElementById('launchGameModalButton');
    snakeGameModalContainer = document.getElementById('snakeGameModalContainer'); // Obținut din psihoterapie.html

    if (!launchModalBtn) {
        console.error("Butonul #launchGameModalButton nu a fost găsit!");
        return;
    }
    if (!snakeGameModalContainer) {
        console.error("Containerul #snakeGameModalContainer nu a fost găsit în HTML!");
        return;
    }

    launchModalBtn.addEventListener('click', () => {
        console.log("Butonul 'Începe Călătoria Interioară' a fost apăsat.");

        // 1. Injectează structura HTML a modalului (gameModalHTMLStructure) DOAR DACĂ nu există deja.
        //    Aceasta creează #snakeGameModalContent și #snakeGameWrapper în interior.
        if (!snakeGameModalContainer.querySelector('#snakeGameModalContent')) {
            snakeGameModalContainer.innerHTML = gameModalHTMLStructure;

            // 2. Obține referințele la wrapper-ul jocului și butonul de închidere DUPĂ injectare.
            snakeGameWrapper = document.getElementById('snakeGameWrapper');
            closeSnakeGameModalButton = document.getElementById('closeSnakeGameModal');

            if (!snakeGameWrapper) {
                console.error("CRITICAL: #snakeGameWrapper nu a fost găsit după injectarea gameModalHTMLStructure!");
                return;
            }

            // 3. Atașează event listener pentru butonul de închidere al modalului.
            if (closeSnakeGameModalButton) {
                closeSnakeGameModalButton.addEventListener('click', () => {
                    if (snakeGameModalContainer) snakeGameModalContainer.style.display = 'none';
                    if (gameInstance) {
                        gameInstance.setGameVisibility(false); // Oprește logica jocului
                    }
                });
            } else {
                console.warn("#closeSnakeGameModal button not found after modal structure injection.");
            }
        }
        // La click-uri ulterioare, snakeGameWrapper și closeSnakeGameModalButton ar trebui să fie deja definite din prima rulare.

        // 4. Inițializează logica și UI-ul intern al jocului (dacă nu e deja inițializat).
        //    initializeSnakeGame() va injecta gameInterfaceHTMLStructure în snakeGameWrapper.
        if (!gameInitialized) {
            if (!snakeGameWrapper) { // Verificare suplimentară, deși ar trebui să fie setat mai sus
                console.error("CRITICAL: snakeGameWrapper este null înainte de a apela initializeSnakeGame!");
                return;
            }
            gameInstance = initializeSnakeGame(); // Acum initializeSnakeGame folosește snakeGameWrapper corect.
        }

        // 5. Afișează modalul și gestionează starea jocului.
        if (gameInstance) {
            snakeGameModalContainer.style.display = 'flex';

            // Apelează triggerResize după ce modalul e vizibil și instanța e creată.
            // Folosește setTimeout pentru a permite DOM-ului să se actualizeze complet.
            if (typeof gameInstance.triggerResize === 'function') {
                setTimeout(() => gameInstance.triggerResize(), 50); // Un mic delay
            }

            gameInstance.setGameVisibility(true); // Pornește/reia logica jocului

            if (gameInstance.isOver()) { // Dacă jocul era terminat, resetează nivelul curent
                gameInstance.resetCurrentLevel();
            } else if (gameInstance.isPaused()) { // Dacă era doar pe pauză, reia
                gameInstance.resume();
            }
            // else: jocul va porni de la sine prin nextLevelSetup și gameLoop activat de setGameVisibility

            const activeCanvas = document.getElementById('snakeCanvas');
            if (activeCanvas) {
                setTimeout(() => activeCanvas.focus(), 100); // Dă focus pe canvas pentru controale
            }
        } else {
            console.error("Inițializarea jocului a eșuat, gameInstance este null.");
            // Poți afișa un mesaj de eroare utilizatorului aici dacă e cazul.
        }
    });
});

// Adaugă Chroma.js dacă vrei culori mai avansate (opțional) - asigură-te că scriptul e inclus în HTML
// <script src="https://cdnjs.cloudflare.com/ajax/libs/chroma-js/2.1.2/chroma.min.js"></script>
// Verifică dacă Chroma este disponibil înainte de a-l folosi: if (typeof chroma !== 'undefined') { ... }

// Funcție apelată din psihoterapie.js când tab-ul "materiale" este activat sau dezactivat
export function handleGameVisibility(isVisible) {
    // Verifică dacă modalul jocului este efectiv deschis
    const modalIsOpen = snakeGameModalContainer && snakeGameModalContainer.style.display === 'flex';

    if (gameInstance && typeof gameInstance.setGameVisibility === 'function') {
        // Jocul trebuie să fie vizibil doar dacă și tab-ul este activ ȘI modalul este deschis
        gameInstance.setGameVisibility(isVisible && modalIsOpen);

        if (isVisible && modalIsOpen && (gameInstance.isOver() || gameInstance.isPaused())) {
            const gameCanvas = document.getElementById('snakeCanvas');
            if (gameCanvas) setTimeout(() => gameCanvas.focus(), 50);
        }
    } else if (isVisible && modalIsOpen && !gameInitialized) {
        // Cazul în care tab-ul devine vizibil, modalul e deschis, dar jocul nu fusese inițializat
        // Acest scenariu e acoperit de `launchModalBtn` click, dar e o verificare suplimentară.
        console.log("Tab materiale activ, modal joc deschis. Se va inițializa la click pe 'Începe Călătoria'.");
        // Nu inițializa automat aici; lasă click-ul pe buton să o facă.
    }
}

// Salvare stare la părăsirea paginii
window.addEventListener('beforeunload', () => {
    if (gameInstance && gameInitialized && gameVisibleAndActive && !gameInstance.isOver()) {
        // Doar dacă jocul e activ și nu e game over
        saveGameState(); // Funcția saveGameState e definită în initializeSnakeGame
        console.log("Progresul jocului Snake a fost salvat la părăsirea paginii.");
    }
    // `gameInstance.cleanup()` ar putea fi apelat aici dacă e necesar,
    // dar închidearea tab-ului eliberează oricum resursele JS.
});