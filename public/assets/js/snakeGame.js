// --- assets/js/snakeGame.js ---

// Variabile la nivel de modul pentru a gestiona starea jocului
let gameInstance = null;
let gameInitialized = false;
let gameVisibleAndActive = false;
let isCanvasReadyForGame = false; // Flag pentru a indica dacă canvas-ul are dimensiuni valide

// DOM Elements
let snakeGameModalContainer;
let snakeGameWrapper;
let closeSnakeGameModalButton;

// Canvas și context, definite global în modul pentru acces facil
let canvas;
let ctx;
const box = 20; // BOX_SIZE

// --- Variabile de configurare ---
const INITIAL_SNAKE_SPEED = 170;
const LEVEL_SCORE_INCREMENT = 25;
const PARTICLE_COUNT = 8;

// --- HTML STRUCTURE FOR THE GAME MODAL ---
const gameModalHTMLStructure = `
    <div id="snakeGameModalContent" class="bg-gray-900 p-1 sm:p-2 rounded-lg shadow-xl relative w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto" style="aspect-ratio: 4/3.5; display: flex; flex-direction: column;">
        <button id="closeSnakeGameModal" class="absolute top-1 right-1 text-white bg-red-600 hover:bg-red-700 rounded-full p-0 w-7 h-7 flex items-center justify-center text-sm z-50" title="Închide Jocul">×</button>
        <div id="snakeGameWrapper" class="game-wrapper h-full w-full flex-grow" style="display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #222c36; border-radius: 0.5rem;">
        </div>
    </div>
`;

// --- HTML STRUCTURE FOR THE GAME INTERFACE ---
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
      <div id="snakeJournalModal" class="modal-overlay hidden"><div class="modal-content"><h3 class="modal-title">Jurnal Emoțional (Joc)</h3><textarea id="snakeJournalEntry" class="modal-textarea" rows="5" placeholder="Notează-ți gândurile..."></textarea><div id="snakeViewJournalContent" class="modal-scroll-content hidden"></div><div class="modal-actions"><button id="snakeSaveJournal" class="modal-btn-primary">Salvează</button><button id="snakeExportJournal" class="modal-btn-secondary">Export PDF</button><button id="snakeViewJournal" class="modal-btn-neutral">Vezi Intrări</button><button id="snakeCloseJournalModal" class="modal-btn-danger">Închide</button></div></div></div>
      <div id="snakeShopModal" class="modal-overlay hidden"><div class="modal-content"><h3 class="modal-title">Magazin Interior (Joc)</h3><div id="snakeShopItems" class="grid gap-2"></div><div class="modal-actions"><button id="snakeCloseShopModal" class="modal-btn-danger w-full">Închide Magazin</button></div></div></div>
      <div id="snakeMinigameModal" class="modal-overlay hidden"><div class="modal-content text-center"><div id="snakeMinigameContent"></div><div class="modal-actions"><button id="snakeCloseMinigameModal" class="modal-btn-danger w-full">Închide Minijoc</button></div></div></div>
      <div id="snakeEffect" class="game-effect" aria-live="assertive"></div>
    </div>
`;

// --- Variabile de stare a jocului (vor fi inițializate în initializeSnakeGame) ---
let snake, dir, food, score, mult, speed, highScore, currentLevel;
let paused, over, wallPass, magnet, shield;
let activeColor, special, effects, effectId, particles, obstacles;
let values, collected, analytics;
let lastTime, repelCountdown, journalEntries, language;
let slowMotion, clarityMap, breathingActive;

// --- DOM Elements specifice interfeței jocului (vor fi inițializate DUPĂ injectarea gameInterfaceHTMLStructure) ---
let scoreEl, highScoreEl, levelDisplayEl, effectEl, statusBar, restartBtn, fullResetBtn, introEl;
let journalBtn, journalModal, journalEntry, saveJournal, exportJournal, viewJournal, closeJournalModalBtn, viewJournalContentEl;
let shopBtn, shopModal, shopItemsEl, closeShopModalBtn;
let minigameModal, minigameContentEl, closeMinigameModalBtn, langBtn, controlsEl;
let valueEls = {};

// --- Funcția de redimensionare a canvas-ului (cea cu log-uri detaliate) ---
function resizeCanvas() {
    const parentInterface = canvas.parentElement;
    const gameModalContent = document.getElementById('snakeGameModalContent');

    if (!parentInterface || !gameModalContent) {
        console.warn("Nu s-a putut redimensiona canvas-ul: #snakeGameInterface sau #snakeGameModalContent lipsesc.");
        canvas.width = box * 10; canvas.height = box * 10; return;
    }
    console.log("--- resizeCanvas START ---");
    console.log("ModalContent dimensions (W x H):", gameModalContent.clientWidth, "x", gameModalContent.clientHeight);
    console.log("ParentInterface clientWidth/Height:", parentInterface.clientWidth, parentInterface.clientHeight);
    console.log("ParentInterface computedStyle (paddingT,B,L,R):", getComputedStyle(parentInterface).paddingTop, getComputedStyle(parentInterface).paddingBottom, getComputedStyle(parentInterface).paddingLeft, getComputedStyle(parentInterface).paddingRight);

    const interfacePaddingLeft = parseInt(getComputedStyle(parentInterface).paddingLeft) || 0;
    const interfacePaddingRight = parseInt(getComputedStyle(parentInterface).paddingRight) || 0;
    const availableWidth = parentInterface.clientWidth - interfacePaddingLeft - interfacePaddingRight - 5;
    
    let nonCanvasHeight = 0;
    const uiElementsToMeasure = [
        parentInterface.querySelector('h2'), parentInterface.querySelector('.score'), parentInterface.querySelector('.values'),
        parentInterface.querySelector('#snakeIntro:not(.hidden)'), parentInterface.querySelector('#snakeStatus'),
        parentInterface.querySelector('#snakeControls'), parentInterface.querySelector('.flex.gap-1.justify-center.mt-auto.flex-wrap'),
    ];
    console.log("Elements to measure for nonCanvasHeight:");
    uiElementsToMeasure.forEach((el, index) => {
        if (el) {
            const elHeight = el.offsetHeight;
            const marginTop = parseInt(getComputedStyle(el).marginTop) || 0;
            const marginBottom = parseInt(getComputedStyle(el).marginBottom) || 0;
            nonCanvasHeight += elHeight + marginTop + marginBottom;
            console.log(`  - Element ${index} (${el.id || el.className.split(' ')[0]}): height=${elHeight}, MarginT=${marginTop}, MarginB=${marginBottom}. Current nonCanvasHeight=${nonCanvasHeight}`);
        } else { console.log(`  - Element ${index}: not found or not visible.`); }
    });
    const interfacePaddingTop = parseInt(getComputedStyle(parentInterface).paddingTop) || 0;
    const interfacePaddingBottom = parseInt(getComputedStyle(parentInterface).paddingBottom) || 0;
    nonCanvasHeight += interfacePaddingTop + interfacePaddingBottom + 5;
    console.log("Total nonCanvasHeight (incl. parentInterface padding):", nonCanvasHeight);
    
    const availableHeight = parentInterface.clientHeight - nonCanvasHeight;

    if (availableWidth <= 0 || availableHeight <= 0) {
        console.warn(`Dimensiuni disponibile pentru canvas <= 0. W: ${availableWidth}, H: ${availableHeight}.`);
        canvas.width = box * 10; canvas.height = box * 10;
        console.log("--- resizeCanvas END (fallback) ---"); return;
    }
    const newSizeBase = Math.min(availableWidth, availableHeight);
    canvas.width = Math.floor(newSizeBase / box) * box;
    canvas.height = Math.floor(newSizeBase / box) * box;
    console.log(`Canvas resized to: ${canvas.width}x${canvas.height} (based on available W/H: ${availableWidth.toFixed(0)}/${availableHeight.toFixed(0)})`);
    console.log("--- resizeCanvas END ---");
}


function initializeSnakeGame() {
    if (!snakeGameWrapper) {
        console.error("CRITICAL: #snakeGameWrapper nu a fost găsit la initializeSnakeGame.");
        return null;
    }
    snakeGameWrapper.innerHTML = gameInterfaceHTMLStructure;

    canvas = document.getElementById('snakeCanvas');
    if (!canvas) {
        console.error("CRITICAL: #snakeCanvas nu a fost găsit după injectare.");
        return null;
    }
    ctx = canvas.getContext('2d');
    canvas.width = box * 10; // Placeholder inițial
    canvas.height = box * 10;
    isCanvasReadyForGame = false;

    // Inițializează referințele DOM pentru elementele UI ale jocului
    scoreEl = document.getElementById('snakeScore'); highScoreEl = document.getElementById('snakeHighScore');
    levelDisplayEl = document.getElementById('snakeLevelDisplay'); effectEl = document.getElementById('snakeEffect');
    statusBar = document.getElementById('snakeStatus'); restartBtn = document.getElementById('snakeRestartBtn');
    fullResetBtn = document.getElementById('snakeFullResetBtn'); introEl = document.getElementById('snakeIntro');
    journalBtn = document.getElementById('snakeJournalBtn'); journalModal = document.getElementById('snakeJournalModal');
    journalEntry = document.getElementById('snakeJournalEntry'); saveJournal = document.getElementById('snakeSaveJournal');
    exportJournal = document.getElementById('snakeExportJournal'); viewJournal = document.getElementById('snakeViewJournal');
    closeJournalModalBtn = document.getElementById('snakeCloseJournalModal'); viewJournalContentEl = document.getElementById('snakeViewJournalContent');
    shopBtn = document.getElementById('snakeShopBtn'); shopModal = document.getElementById('snakeShopModal');
    shopItemsEl = document.getElementById('snakeShopItems'); closeShopModalBtn = document.getElementById('snakeCloseShopModal');
    minigameModal = document.getElementById('snakeMinigameModal'); minigameContentEl = document.getElementById('snakeMinigameContent');
    closeMinigameModalBtn = document.getElementById('snakeCloseMinigameModal'); langBtn = document.getElementById('snakeLangBtn');
    controlsEl = document.getElementById('snakeControls');
    valueEls = { empatie: document.getElementById('snakeEmpatie'), curaj: document.getElementById('snakeCuraj'), rabdare: document.getElementById('snakeRabdare') };

    // --- Stare joc, funcții helper, events etc. ---
    loadGameState(); // Încarcă starea salvată (scor, nivel, etc.)

    // Definește toate funcțiile helper aici (t, spawnFree, newFood, updateScore, etc.)
    // ... (COPIAZĂ AICI TOATE FUNCȚIILE HELPER, LEVELS, SPECIALS, SHOPITEMS din versiunea ta anterioară)
    // Asigură-te că aceste funcții NU depind de starea jocului care este setată în nextLevelSetup
    // sau că sunt apelate doar DUPĂ ce nextLevelSetup a rulat.

    // Exemplu de funcții care trebuie definite aici:
    // loadGameState, saveGameState, translations, levels, specials, shopItemsList, t,
    // spawnFree, newFood, newSpecial, spawnObstacle, updateScore, updateValues, updateLevelDisplay,
    // flash, changeSpeed, resetSpeed, boost, endBoost, speedUpTemporary, slow,
    // endNegativeEffects, invertDirection, shrinkSnake, repelFood, addActiveEffect, tickEffects,
    // spawnParticles, applyLevelMechanics, setupModal, populateShop, startBreathing, startReframe,
    // setLanguage, saveAnalytics, checkStuck, gameOver, handleKeyDown.
    // fullResetGameToLevelZero și nextLevelSetup sunt definite, dar nu apelate încă pentru pornirea jocului.
    // draw și update sunt definite pentru a fi folosite de gameLoop.
    // gameLoop este definit.

    // --- AICI VOR FI TOATE DEFINIȚIILE DE FUNCȚII DIN JOC ---
    // (Am omis copierea lor integrală aici pentru a păstra răspunsul concis,
    //  dar ele trebuie să fie prezente în codul tău final)
    // --- START Definiții Funcții Helper, Stare Joc, Mecanici etc. ---

    function loadGameState() { highScore = parseInt(localStorage.getItem('snakeGameHighScoreV2')) || 0; currentLevel = parseInt(localStorage.getItem('snakeGameCurrentLevelV2')) || 0; score = parseInt(localStorage.getItem('snakeGameScoreV2')) || 0; values = JSON.parse(localStorage.getItem('snakeGameValuesV2')) || { empatie: 0, curaj: 0, rabdare: 0 }; shield = JSON.parse(localStorage.getItem('snakeGameShieldV2')) || { level: 1, hits: 1 }; slowMotion = JSON.parse(localStorage.getItem('snakeGameSlowMotionV2')) || false; clarityMap = JSON.parse(localStorage.getItem('snakeGameClarityMapV2')) || false; journalEntries = JSON.parse(localStorage.getItem('snakeGameJournalV2')) || []; analytics = { sessions: JSON.parse(localStorage.getItem('snakeGameAnalyticsV2')) || [], current: {} }; language = localStorage.getItem('snakeGameLanguageV2') || 'ro'; if(highScoreEl) highScoreEl.textContent = highScore; }
    function saveGameState() { localStorage.setItem('snakeGameHighScoreV2', highScore); localStorage.setItem('snakeGameCurrentLevelV2', currentLevel); localStorage.setItem('snakeGameScoreV2', score); localStorage.setItem('snakeGameValuesV2', JSON.stringify(values)); localStorage.setItem('snakeGameShieldV2', JSON.stringify(shield)); localStorage.setItem('snakeGameSlowMotionV2', slowMotion); localStorage.setItem('snakeGameClarityMapV2', clarityMap); localStorage.setItem('snakeGameJournalV2', JSON.stringify(journalEntries)); localStorage.setItem('snakeGameAnalyticsV2', JSON.stringify(analytics.sessions)); localStorage.setItem('snakeGameLanguageV2', language); }
    const translations = { ro: { score: 'Scor', highScore: 'Maxim', restart: 'Restart Nivel', journal: 'Jurnal', shop: 'Magazin', controls: 'Săgeți/WASD | Space/P: Pauză | J: Jurnal | M: Magazin', save: 'Salvează', export: 'Export PDF', view: 'Vezi Jurnal', journalSaved: 'Jurnal salvat!', journalEmpty: 'Jurnalul este gol.', close: 'Închide', emotionalSummary: 'Rezumat Emoțional', courageFeedback: '🦁 Curajul tău crește! Explorează ce te face puternic.', frustrationFeedback: '🌩️ Ai simțit frustrare. O pauză sau o respirație adâncă pot ajuta.', shieldProtect: '🛡️ Scutul a protejat Copilul Interior', curaj: 'Curaj', rabdare: 'Răbdare', empatie: 'Empatie', acceptare: 'Acceptare', frustrare: 'Frustrare', motivatie: 'Motivație', copil: 'Copil Interior', adult: 'Adult Sănătos', critic: 'Critic Interior', abandon: 'Abandon', izolare: 'Izolare', shopTitle: 'Magazin Interior', dailyQuest: 'Provocarea zilei: Colectează 3 ⭐ Motivație și scrie un gând recunoscător în jurnal.', breathing: 'Exercițiu de Respirație Conștientă', reframe: 'Alege o Afirmație Pozitivă:', stuck: 'Blocaj? Scrie ce te apasă în jurnal.', purchased: 'Cumpărat', InsufficientValues: 'Valori insuficiente!', level: 'Nivel', fullReset: 'Reset Joc Complet', Felicitări: 'Felicitări!', 'Ai finalizat Călătoria Interioară!': 'Ai finalizat Călătoria Interioară!', 'Poți continua explorarea sau reseta jocul.': 'Poți continua explorarea sau reseta jocul.', 'MaxedOut': 'Nivel Maxim', 'achiziționat': 'achiziționat', 'Nivelul': 'Nivelul', 'Ești sigur că vrei să resetezi tot progresul jocului?': 'Ești sigur că vrei să resetezi tot progresul jocului?', 'Jurnal Emoțional (Joc)': 'Jurnal Emoțional (Joc)', 'Notează-ți gândurile...': 'Notează-ți gândurile...', 'Închide Magazin': 'Închide Magazin', 'Închide Minijoc': 'Închide Minijoc', 'CRITICUL INTERIOR': 'CRITICUL INTERIOR' }, en: { score: 'Score', highScore: 'High Score', restart: 'Restart Level', journal: 'Journal', shop: 'Shop', controls: 'Arrows/WASD | Space/P: Pause | J: Journal | M: Shop', save: 'Save', export: 'Export PDF', view: 'View Journal', journalSaved: 'Journal saved!', journalEmpty: 'Journal is empty.', close: 'Close', emotionalSummary: 'Emotional Summary', courageFeedback: '🦁 Your courage grows! Explore what makes you strong.', frustrationFeedback: '🌩️ You felt frustration. A break or deep breath can help.', shieldProtect: '🛡️ Shield protected the Inner Child', curaj: 'Courage', rabdare: 'Patience', empatie: 'Empathy', acceptare: 'Acceptance', frustrare: 'Frustration', motivatie: 'Motivation', copil: 'Inner Child', adult: 'Healthy Adult', critic: 'Inner Critic', abandon: 'Abandonment', izolare: 'Isolation', shopTitle: 'Inner Shop', dailyQuest: 'Daily Quest: Collect 3 ⭐ Motivation and write a grateful thought in your journal.', breathing: 'Mindful Breathing Exercise', reframe: 'Choose a Positive Affirmation:', stuck: 'Feeling stuck? Write what troubles you in the journal.', purchased: 'Purchased', InsufficientValues: 'Insufficient values!', level: 'Level', fullReset: 'Full Game Reset', Felicitări: 'Congratulations!', 'Ai finalizat Călătoria Interioară!': 'You have completed the Inner Journey!', 'Poți continua explorarea sau reseta jocul.': 'You can continue exploring or reset the game.', 'MaxedOut': 'Max Level', 'achiziționat': 'purchased', 'Nivelul': 'Level', 'Ești sigur că vrei să resetezi tot progresul jocului?': 'Are you sure you want to reset all game progress?', 'Jurnal Emoțional (Joc)': 'Emotional Journal (Game)', 'Notează-ți gândurile...': 'Write down your thoughts...', 'Închide Magazin': 'Close Shop', 'Închide Minijoc': 'Close Minigame', 'CRITICUL INTERIOR': 'INNER CRITIC' } };
    const levels = [ { theme: 'Curaj', message: 'Explorează curajul. Ce te motivează?', specials: ['curaj', 'motivatie'], obstacles: 1, bgColor: 'rgba(255, 179, 71, 0.3)', snakeColor: '#ffb347', mechanic: null }, { theme: 'Răbdare', message: 'Practică răbdarea. Cum te ajută să te calmezi?', specials: ['rabdare', 'acceptare'], obstacles: 2, bgColor: 'rgba(126, 217, 87, 0.3)', snakeColor: '#7ed957', mechanic: 'slowObstacles' }, { theme: 'Empatie', message: 'Conectează-te. Ce simți când ești empatic?', specials: ['empatie', 'adult'], obstacles: 1, bgColor: 'rgba(89, 165, 224, 0.3)', snakeColor: '#59a5e0', mechanic: 'magnetFood' }, { theme: 'Acceptare', message: 'Acceptă vulnerabilitățile. Ce te eliberează?', specials: ['acceptare', 'copil', 'rabdare'], obstacles: 2, bgColor: 'rgba(179, 136, 255, 0.3)', snakeColor: '#b388ff', mechanic: 'wallPassTemp' }, { theme: 'Înfruntarea Criticului', message: 'Înfruntă criticul. Ce îți spui pentru a merge mai departe?', specials: ['critic', 'abandon', 'motivatie', 'adult'], obstacles: 0, bgColor: 'rgba(208, 0, 0, 0.4)', snakeColor: '#d00000', mechanic: 'bossCritique' } ];
    const specials = [ { type: 'curaj', symbol: '🦁', color: '#ffb347', valueType: 'curaj', points: 1, effect: () => { boost(1.5, t('curaj')); }, revert: endBoost, duration: 5000 }, { type: 'rabdare', symbol: '⏳', color: '#7ed957', valueType: 'rabdare', points: 1, effect: () => { slow(t('rabdare')); }, revert: resetSpeed, duration: 7000 }, { type: 'empatie', symbol: '💙', color: '#59a5e0', valueType: 'empatie', points: 1, effect: () => { magnet = true; flash(t('empatie') + ' Magnet Activ!'); }, revert: () => { magnet = false; }, duration: 8000 }, { type: 'acceptare', symbol: '🌀', color: '#b388ff', valueType: 'acceptare', points: 1, effect: () => { wallPass = true; flash(t('acceptare') + ' - Treci prin Ziduri!'); }, revert: () => { wallPass = false; }, duration: 6000 }, { type: 'motivatie', symbol: '⭐', color: '#ffe166', valueType: 'motivatie', points: 1, effect: () => { score += 5 * mult; updateScore(); flash(t('motivatie') + ' +5 Pcte!'); }, revert: null }, { type: 'copil', symbol: '👶🛡️', color: '#ffd1dc', valueType: 'copil', points: 0, effect: () => { shield.hits = Math.max(shield.hits, shield.level); flash(t('copil') + ' Protejat!'); }, revert: null }, { type: 'adult', symbol: '🧘', color: '#90e0ef', valueType: 'adult', points: 0, effect: () => { endNegativeEffects(); boost(1.2, t('adult') + ' Prezent!'); }, revert: endBoost, duration: 7000 }, { type: 'critic', symbol: '🗣️💬', color: '#d00000', negative: true, effect: () => { invertDirection(); flash(t('critic') + ' Interior Activ!'); addActiveEffect(t('critic'), 3000, () => {}); }, revert: null }, { type: 'abandon', symbol: '💔', color: '#6d6875', negative: true, effect: () => { shrinkSnake(); flash(t('abandon') + ' - Te Simți Mic...'); addActiveEffect(t('abandon'), 4000); }, revert: null }, { type: 'izolare', symbol: '🧱', color: '#5a189a', negative: true, effect: () => { repelFood(); flash(t('izolare') + ' - Mâncarea Fuge!'); addActiveEffect(t('izolare'), 5000); }, revert: null }, { type: 'frustrare', symbol: '🤯', color: '#ff686b', negative: true, effect: () => { speedUpTemporary(t('frustrare') + ' Intensă!'); addActiveEffect(t('frustrare'), 3000); }, revert: resetSpeed } ];
    const shopItemsList = [ { id: 'shieldUpgrade', name: 'Upgrade Scut Copil', cost: { curaj: 5, rabdare: 3 }, effect: () => { shield.level++; shield.hits = shield.level; flash('Scut Îmbunătățit la Nivelul ' + shield.level); saveGameState(); }, maxLevel: 3, currentLevelFn: () => shield.level-1 }, { id: 'slowMotionActivate', name: 'Activare Respirație Liniștitoare', cost: { rabdare: 3, empatie: 2 }, effect: () => { slowMotion = true; flash('Respirația Liniștitoare poate fi activată cu R.'); saveGameState(); }, oneTimePurchase: true, purchasedFn: () => slowMotion }, { id: 'clarityMapActivate', name: 'Activare Hartă Claritate (Obstacole Vizibile)', cost: { empatie: 4, curaj: 2 }, effect: () => { clarityMap = true; flash('Harta Clarității activată!'); saveGameState(); }, oneTimePurchase: true, purchasedFn: () => clarityMap }, { id: 'valueBoostCuraj', name: 'Focus pe Curaj (Crește șansa 🦁)', cost: { motivatie: 5 }, effect: () => { flash('Focus pe Curaj activat!');}, oneTimePurchase: false} ];
    function t(key) { return translations[language]?.[key] || translations['ro']?.[key] || key; }
    function spawnFree(avoidPlayer = true, minDistance = 0) { let p, attempts = 0; const maxAttempts = (canvas.width / box) * (canvas.height / box); do { p = { x: Math.floor(Math.random() * (canvas.width / box)) * box, y: Math.floor(Math.random() * (canvas.height / box)) * box }; attempts++; if (attempts > maxAttempts) { return snake.length > 0 ? snake[0] : { x: 0, y: 0}; } } while ( (avoidPlayer && snake.some(seg => seg.x === p.x && seg.y === p.y && (minDistance === 0 || Math.abs(seg.x - p.x) < minDistance * box || Math.abs(seg.y - p.y) < minDistance * box))) || obstacles.some(o => o.x === p.x && o.y === p.y) || (food && p.x === food.x && p.y === food.y) || (special && p.x === special.x && p.y === special.y) ); return p; }
    function newFood() { food = spawnFree(true, 3); }
    function newSpecial() { if (special) return; const currentLvlData = levels[currentLevel]; const levelSpecialsTypes = currentLvlData?.specials || specials.map(s => s.type); const availableSpecialsPool = specials.filter(s => levelSpecialsTypes.includes(s.type) && !s.isBoss); if (availableSpecialsPool.length === 0) return; const randomSpecialTemplate = availableSpecialsPool[Math.floor(Math.random() * availableSpecialsPool.length)]; special = { ...randomSpecialTemplate, ...spawnFree(true, 4) }; }
    function spawnObstacle() { obstacles.push(spawnFree()); }
    function updateScore() { if(scoreEl) scoreEl.textContent = score; if (score > highScore) { highScore = score; if(highScoreEl) highScoreEl.textContent = highScore; } if(analytics && analytics.current) analytics.current.score = score; }
    function updateValues() { if(valueEls.empatie) valueEls.empatie.textContent = values.empatie; if(valueEls.curaj) valueEls.curaj.textContent = values.curaj; if(valueEls.rabdare) valueEls.rabdare.textContent = values.rabdare; }
    function updateLevelDisplay() { if(levelDisplayEl) levelDisplayEl.textContent = currentLevel + 1; }
    function flash(text, duration = 1800, type = 'info') { if(!effectEl) return; effectEl.innerHTML = text; effectEl.className = 'game-effect'; if (type === 'good') effectEl.classList.add('positive'); else if (type === 'bad') effectEl.classList.add('negative'); effectEl.style.opacity = 1; setTimeout(() => { if(effectEl) effectEl.style.opacity = 0; }, duration); }
    function changeSpeed(newSpeed) { speed = Math.max(50, Math.min(350, newSpeed)); }
    function resetSpeed() { speed = INITIAL_SNAKE_SPEED + (currentLevel * 5); activeColor = null; }
    function boost(factor, label) { mult = factor; activeColor = (levels[currentLevel] && levels[currentLevel].snakeColor) || '#ffb347'; flash(label, 3000, 'good'); addActiveEffect(label, 3000, endBoost); }
    function endBoost() { mult = 1; activeColor = null; }
    function speedUpTemporary(label) { const originalSpeed = speed; changeSpeed(speed * 0.6); activeColor = '#ff3030'; flash(label, 3000, 'bad'); setTimeout(() => { if (speed < originalSpeed) speed = originalSpeed; activeColor = null; }, 3000); }
    function slow(label) { const originalSpeed = speed; changeSpeed(speed * 1.6); activeColor = '#7ed957'; flash(label, 5000, 'good'); addActiveEffect(label, 5000, () => { if (speed > originalSpeed) speed = originalSpeed; activeColor = null; }); }
    function endNegativeEffects() { effects = effects.filter(e => !e.isNegative); if(statusBar) statusBar.querySelectorAll('.neg-effect').forEach(el => el.remove()); flash("Efecte negative înlăturate!", 2000, 'good'); }
    function invertDirection() { if (dir === 'LEFT') dir = 'RIGHT'; else if (dir === 'RIGHT') dir = 'LEFT'; else if (dir === 'UP') dir = 'DOWN'; else if (dir === 'DOWN') dir = 'UP'; }
    function shrinkSnake() { const amountToShrink = Math.min(snake.length -1, 2); for(let i=0; i<amountToShrink; i++) if(snake.length > 1) snake.pop(); }
    function repelFood() { repelCountdown = Math.floor(5000 / (speed || INITIAL_SNAKE_SPEED)); }
    function addActiveEffect(name, durationMs, onEndCallback = null) { if(!statusBar || !effectId) return 'no-status-bar-' + effectId; const id = 'activeEffect' + (++effectId); const effectData = { id, name, durationMs, timeLeftMs: durationMs, onEnd: onEndCallback, isNegative: specials.find(s=>s.type === name || t(s.type) === name)?.negative }; const span = document.createElement('div'); span.className = 'stat-effect'; if (effectData.isNegative) span.classList.add('neg-effect'); span.id = id; const textSpan = document.createElement('span'); textSpan.textContent = name.length > 15 ? name.substring(0,12) + "..." : name; textSpan.title = name; const barContainer = document.createElement('div'); barContainer.className = 'effect-bar-container'; const bar = document.createElement('div'); bar.className = 'effect-bar'; barContainer.appendChild(bar); span.appendChild(textSpan); span.appendChild(barContainer); statusBar.appendChild(span); effects.push(effectData); return id; }
    function tickEffects(deltaTime) { if(!statusBar || !effects || effects.length === 0) return; for (let i = effects.length - 1; i >= 0; i--) { const effect = effects[i]; effect.timeLeftMs -= deltaTime; const s = document.getElementById(effect.id); if (s) { const barEl = s.querySelector('.effect-bar'); if (barEl) { barEl.style.width = Math.max(0, (effect.timeLeftMs / effect.durationMs)) * 100 + '%'; } } if (effect.timeLeftMs <= 0) { if (s) s.remove(); if (effect.onEnd) effect.onEnd(); effects.splice(i, 1); } } }
    function spawnParticles(x, y, color, count = PARTICLE_COUNT) { for (let i = 0; i < count; i++) { particles.push({ x: x + (Math.random() - 0.5) * box * 0.5, y: y + (Math.random() - 0.5) * box * 0.5, vx: (Math.random() - 0.5) * (3 + Math.random() * 2), vy: (Math.random() - 0.5) * (3 + Math.random() * 2), alpha: 0.8 + Math.random() * 0.2, color, size: 2 + Math.random() * 3, decay: 0.02 + Math.random() * 0.02 }); } }
    function applyLevelMechanics() { if (currentLevel >= levels.length) return; const lvlData = levels[currentLevel]; if (!lvlData) return; canvas.style.backgroundColor = lvlData.bgColor || '#1d2230'; const mechanic = lvlData.mechanic; if (mechanic === 'slowObstacles') { flash("Atenție la obstacolele lente!", 2000); } else if (mechanic === 'magnetFood') { magnet = true; flash("Mâncarea este atrasă de tine!", 3000, 'good'); addActiveEffect("Magnet Mâncare", 15000, () => magnet = false); } else if (mechanic === 'wallPassTemp') { wallPass = true; flash("Poți trece prin ziduri temporar!", 3000, 'good'); addActiveEffect("Trecere Ziduri", 10000, () => wallPass = false); } else if (mechanic === 'bossCritique') { obstacles = []; const bossTemplate = specials.find(s => s.type === 'critic'); if(bossTemplate) { special = { ...bossTemplate, ...spawnFree(true, 5), isBoss: true, bossMaxHits: 3 + currentLevel, bossCurrentHits: 3 + currentLevel, symbol: 'BOSS 🗣️💬' }; flash(`Înfruntă ${t('Critic Interior')} BOSS! Lovește-l de ${special.bossCurrentHits} ori!`, 3500, 'bad'); } } }
    function setupModal(modalElement, openBtnElement, closeBtnElement, onOpenCallback = null) { if (openBtnElement && modalElement && closeBtnElement) { openBtnElement.onclick = () => { if (paused && !modalElement.classList.contains('hidden')) { modalElement.classList.add('hidden'); } else { paused = true; [journalModal, shopModal, minigameModal].forEach(m => { if (m && m !== modalElement) m.classList.add('hidden'); }); modalElement.classList.remove('hidden'); if (onOpenCallback) onOpenCallback(); } }; closeBtnElement.onclick = () => { modalElement.classList.add('hidden'); if (canvas) canvas.focus(); }; } }
    if(journalModal && journalBtn && closeJournalModalBtn) setupModal(journalModal, journalBtn, closeJournalModalBtn, () => { if(journalEntry) journalEntry.focus(); if(viewJournalContentEl) viewJournalContentEl.classList.add('hidden'); });
    if(shopModal && shopBtn && closeShopModalBtn) setupModal(shopModal, shopBtn, closeShopModalBtn, populateShop);
    if(saveJournal) saveJournal.onclick = () => { if(journalEntry.value.trim()){ journalEntries.push({date: new Date().toISOString(), entry: journalEntry.value.trim()}); journalEntry.value = ''; flash(t('journalSaved'), 1500, 'good'); saveGameState();} else {flash(t('Jurnalul este gol.'),1500,'bad');}};
    if(exportJournal) exportJournal.onclick = () => { if(typeof jsPDF !== 'undefined'){ const doc = new jsPDF(); let y = 10; journalEntries.forEach(item => { doc.text(new Date(item.date).toLocaleString() + ": " + item.entry, 10, y); y +=10;}); doc.save('jurnal-snake.pdf');} else {alert('jsPDF nu e încărcat.')} };
    if(viewJournal) viewJournal.onclick = () => { if(viewJournalContentEl.classList.contains('hidden')){ viewJournalContentEl.innerHTML = ''; if(journalEntries.length > 0){journalEntries.forEach(item => { const div = document.createElement('div'); div.innerHTML = `<p><strong>${new Date(item.date).toLocaleString()}</strong></p><p>${item.entry.replace(/\n/g, '<br>')}</p>`; viewJournalContentEl.appendChild(div);});} else {viewJournalContentEl.innerHTML = `<p>${t('journalEmpty')}</p>`;} viewJournalContentEl.classList.remove('hidden');} else {viewJournalContentEl.classList.add('hidden');}};
    function populateShop() { if(!shopItemsEl) return; shopItemsEl.innerHTML = ''; shopItemsList.forEach(item => { const btn = document.createElement('button'); btn.className = 'shop-item-btn'; let currentItemLevel = item.currentLevelFn ? item.currentLevelFn() : 0; let purchased = item.purchasedFn ? item.purchasedFn() : false; let costString = Object.entries(item.cost).map(([k, v]) => `${v} ${t(k)}`).join(', '); let nameString = t(item.name); if (item.maxLevel && currentItemLevel >= item.maxLevel) { btn.innerHTML = `<div>${nameString} (${t('MaxedOut')})</div><div class="shop-item-cost">${t('MaxedOut')}</div>`; btn.disabled = true; } else if (item.oneTimePurchase && purchased) { btn.innerHTML = `<div>${nameString}</div><div class="shop-item-cost">${t('purchased')}</div>`; btn.disabled = true; } else { btn.innerHTML = `<div>${nameString} ${item.maxLevel ? `(Nv. ${currentItemLevel+1})` : ''}</div><div class="shop-item-cost">Cost: ${costString}</div>`; } btn.onclick = () => { if (btn.disabled) return; let canAfford = true; for (const [key, val] of Object.entries(item.cost)) { if (!values[key] || values[key] < val) { canAfford = false; break; } } if (canAfford) { Object.entries(item.cost).forEach(([k, v]) => values[k] -= v); item.effect(); updateValues(); flash(`${t(item.name)} ${t('achiziționat')}!`, 2000, 'good'); populateShop(); saveGameState(); } else { flash(t('InsufficientValues'), 2000, 'bad'); } }; shopItemsEl.appendChild(btn); }); }
    function startBreathing() { if(!minigameModal || !minigameContentEl) return; paused = true; breathingActive = true; minigameModal.classList.remove('hidden'); minigameContentEl.innerHTML = `<h3>${t('breathing')}</h3><p>Inspiră... (4s)</p>`; setTimeout(()=>{minigameContentEl.innerHTML = `<p>Menține... (7s)</p>`},4000); setTimeout(()=>{minigameContentEl.innerHTML = `<p>Expiră... (8s)</p>`},11000); setTimeout(()=>{minigameModal.classList.add('hidden'); paused=false; breathingActive=false; canvas.focus();},19000);}
    function startReframe() { if(!minigameModal || !minigameContentEl) return; paused = true; minigameModal.classList.remove('hidden'); const affirmations = ["Sunt capabil.", "Mă descurc.", "Pot depăși asta."]; minigameContentEl.innerHTML = `<h3>${t('reframe')}</h3>` + affirmations.map(a => `<button class="modal-btn-neutral my-1 w-full">${a}</button>`).join(''); minigameContentEl.querySelectorAll('button').forEach(b => b.onclick=()=>{minigameModal.classList.add('hidden'); paused=false; flash(b.textContent, 2000, 'good'); canvas.focus();});}
    if(closeMinigameModalBtn && minigameModal) closeMinigameModalBtn.onclick = () => { minigameModal.classList.add('hidden'); paused = false; breathingActive = false; if(canvas) canvas.focus(); };
    function setLanguage(lang) { language = lang; const gameInterfaceEl = document.getElementById('snakeGameInterface'); if (!gameInterfaceEl) return; const titleH2 = gameInterfaceEl.querySelector('h2'); if (titleH2) titleH2.textContent = t('Snake 🐍 – Călătoria Interioară'); const scoreLabel = scoreEl?.parentNode?.firstChild; if (scoreLabel && scoreLabel.nodeType === Node.TEXT_NODE) scoreLabel.textContent = t('score') + ": "; const highScoreLabel = highScoreEl?.parentNode?.firstChild; if (highScoreLabel && highScoreLabel.nodeType === Node.TEXT_NODE) highScoreLabel.textContent = t('highScore') + ": "; const levelLabelNodes = levelDisplayEl?.parentElement?.childNodes; if (levelLabelNodes) { for(let node of levelLabelNodes){ if(node.nodeType === Node.TEXT_NODE && (node.textContent.trim().startsWith("Nivel") || node.textContent.trim().startsWith("Level"))){ node.textContent = " " + t('level') + ": "; break; } } } if(controlsEl) controlsEl.textContent = t('controls'); if(restartBtn) restartBtn.textContent = t('restart'); if(fullResetBtn) fullResetBtn.textContent = t('fullReset'); if(journalBtn) journalBtn.textContent = t('journal'); if(shopBtn) shopBtn.textContent = t('shop'); if(langBtn) langBtn.textContent = (language === 'ro' ? 'English' : 'Română'); if(journalModal) journalModal.querySelector('.modal-title').textContent = t('Jurnal Emoțional (Joc)'); if(journalEntry) journalEntry.placeholder = t('Notează-ți gândurile...'); if(saveJournal) saveJournal.textContent = t('save'); if(exportJournal) exportJournal.textContent = t('export'); if(viewJournal) viewJournal.textContent = t('view'); if(closeJournalModalBtn) closeJournalModalBtn.textContent = t('close'); if(shopModal) shopModal.querySelector('.modal-title').textContent = t('shopTitle'); if(closeShopModalBtn) closeShopModalBtn.textContent = t('Închide Magazin'); if(minigameModal && minigameModal.querySelector('h3')) minigameModal.querySelector('h3').textContent = t('Minijoc'); if(closeMinigameModalBtn) closeMinigameModalBtn.textContent = t('Închide Minijoc'); if(langBtn) langBtn.setAttribute('aria-label', language === 'ro' ? 'Switch to English' : 'Schimbă în Română'); if (introEl && !introEl.classList.contains('hidden') && currentLevel < levels.length) { introEl.innerHTML = `<strong class="text-base sm:text-lg">${t('level')} ${currentLevel + 1}: ${t(levels[currentLevel].theme)}</strong><br><span class="text-xs sm:text-sm">${t(levels[currentLevel].message)}</span><br><em class="text-xs text-gray-400">${t('dailyQuest')}</em>`; } updateValues(); }
    if(langBtn) langBtn.onclick = () => { setLanguage(language === 'ro' ? 'en' : 'ro'); saveGameState(); };
    function saveAnalytics() { if (!analytics || !analytics.current) return; analytics.current.timeEnded = Date.now(); analytics.current.level = currentLevel; analytics.current.finalValues = { ...values }; analytics.sessions.push({ ...analytics.current }); }
    function checkStuck() { if(analytics && analytics.current && analytics.current.obstacles && analytics.current.obstacles.filter(o => ['critic', 'abandon', 'izolare', 'frustrare'].includes(o)).length > 2){ flash(t('stuck'), 3000, 'bad'); if(journalBtn) journalBtn.click(); }}
    function fullResetGameToLevelZero() { currentLevel = 0; score = 0; values = { empatie: 0, curaj: 0, rabdare: 0 }; shield = { level: 1, hits: 1 }; slowMotion = false; clarityMap = false; nextLevelSetup(true); saveGameState(); }
    function nextLevelSetup(isInitialOrFullReset = false) { effectId = 0; snake = [{ x: Math.floor(canvas.width / box / 2) * box, y: Math.floor(canvas.height / box / 2) * box }]; dir = ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)]; if (!isInitialOrFullReset) {} else { score = 0; values = { empatie: 0, curaj: 0, rabdare: 0 }; shield = { level: 1, hits: 1 }; slowMotion = false; clarityMap = false; } mult = 1; speed = INITIAL_SNAKE_SPEED - (currentLevel * 3); speed = Math.max(80, speed); wallPass = magnet = false; if(shield) shield.hits = shield.level; activeColor = null; over = false; paused = isInitialOrFullReset ? false : true; special = null; effects = []; particles = []; obstacles = []; if (statusBar) statusBar.innerHTML = ''; collected = { curaj: 0, rabdare: 0, empatie: 0, acceptare: 0, frustrare: 0, motivatie: 0, critic: 0, abandon: 0, izolare: 0, adult: 0, copil: 0 }; if(analytics && analytics.current) { analytics.current = { scoreAtLevelStart: score, valuesAtLevelStart: { ...values }, obstacles: [], timeLevelStart: Date.now() }; } updateScore(); updateValues(); updateLevelDisplay(); newFood(); if (Math.random() < 0.2) newSpecial(); if(restartBtn) restartBtn.classList.add('hidden'); if (currentLevel < levels.length) { const currentLvlData = levels[currentLevel]; if(introEl && currentLvlData) { introEl.innerHTML = `<strong class="text-base sm:text-lg">${t('level')} ${currentLevel + 1}: ${t(currentLvlData.theme)}</strong><br><span class="text-xs sm:text-sm">${t(currentLvlData.message)}</span><br><em class="text-xs text-gray-400">${t('dailyQuest')}</em>`; introEl.classList.remove('hidden'); } setTimeout(() => { if(introEl) introEl.classList.add('hidden'); paused = false; if (currentLvlData) applyLevelMechanics(); if (gameVisibleAndActive && !over && !paused) { lastTime = performance.now(); requestAnimationFrame(gameLoop); } }, isInitialOrFullReset ? 100 : 3500); obstacles = []; if (currentLvlData) { for (let i = 0; i < (currentLvlData.obstacles || 0); i++) spawnObstacle(); } } else { if(introEl) { introEl.innerHTML = `<strong class="text-lg">${t('Felicitări!')}</strong><br><span class="text-sm">${t('Ai finalizat Călătoria Interioară!')}</span><br><em class="text-xs">${t('Poți continua explorarea sau reseta jocul.')}</em>`; introEl.classList.remove('hidden'); paused = true; } } if (!isInitialOrFullReset) { lastTime = performance.now(); } }
    function draw() { if (!ctx || !canvas || !snake) return; const currentLvlData = levels[currentLevel] || levels[levels.length-1]; const baseBg = (currentLvlData && currentLvlData.bgColor) ? currentLvlData.bgColor : 'rgba(29, 34, 48, 0.5)'; let snakeHeadColorToUse = '#36a26b'; if (activeColor) snakeHeadColorToUse = activeColor; else if (shield && shield.hits > 0) snakeHeadColorToUse = '#FFACE4'; else if (currentLvlData && currentLvlData.snakeColor) snakeHeadColorToUse = currentLvlData.snakeColor; let snakeBodyColorToUse = '#88dab2'; if (shield && shield.hits > 0) snakeBodyColorToUse = '#FFD1F0'; else if (currentLvlData && currentLvlData.snakeColor && typeof chroma !== 'undefined') { try { snakeBodyColorToUse = chroma(currentLvlData.snakeColor).darken(0.5).hex(); } catch(e) {} } else if (currentLvlData && currentLvlData.snakeColor) { snakeBodyColorToUse = currentLvlData.snakeColor; } const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 1.5); if (typeof chroma !== 'undefined') { try { gradient.addColorStop(0, chroma(baseBg).brighten(0.3).alpha(0.8).css()); gradient.addColorStop(1, chroma(baseBg).alpha(0.9).css()); } catch (e) { gradient.addColorStop(0, baseBg); gradient.addColorStop(1, baseBg); } } else { gradient.addColorStop(0, baseBg); gradient.addColorStop(1, baseBg); } ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height); snake.forEach((seg, i) => { ctx.beginPath(); if (i === 0) { ctx.fillStyle = snakeHeadColorToUse; ctx.arc(seg.x + box / 2, seg.y + box / 2, box / 2, 0, 2 * Math.PI); ctx.fill(); ctx.fillStyle = 'white'; let eyeOffsetX = dir === 'LEFT' ? -box/4 : (dir === 'RIGHT' ? box/4 : 0); let eyeOffsetY = dir === 'UP' ? -box/4 : (dir === 'DOWN' ? box/4 : 0); if (dir === 'LEFT' || dir === 'RIGHT') { ctx.fillRect(seg.x + box/2 + eyeOffsetX - 1, seg.y + box/4 -1, 2, 2); ctx.fillRect(seg.x + box/2 + eyeOffsetX - 1, seg.y + box*0.75 -2, 2, 2); } else { ctx.fillRect(seg.x + box/4 -1, seg.y + box/2 + eyeOffsetY -1, 2, 2); ctx.fillRect(seg.x + box*0.75 -2, seg.y + box/2 + eyeOffsetY -1, 2, 2); } } else { ctx.fillStyle = snakeBodyColorToUse; const radius = box / 4; ctx.beginPath(); ctx.moveTo(seg.x + radius, seg.y); ctx.lineTo(seg.x + box - radius, seg.y); ctx.quadraticCurveTo(seg.x + box, seg.y, seg.x + box, seg.y + radius); ctx.lineTo(seg.x + box, seg.y + box - radius); ctx.quadraticCurveTo(seg.x + box, seg.y + box, seg.x + box - radius, seg.y + box); ctx.lineTo(seg.x + radius, seg.y + box); ctx.quadraticCurveTo(seg.x, seg.y + box, seg.x, seg.y + box - radius); ctx.lineTo(seg.x, seg.y + radius); ctx.quadraticCurveTo(seg.x, seg.y, seg.x + radius, seg.y); ctx.closePath(); ctx.fill(); } if (typeof chroma !== 'undefined') { try { ctx.strokeStyle = chroma(ctx.fillStyle).darken(1.5).hex(); } catch(e) { ctx.strokeStyle = '#000';} } else { ctx.strokeStyle = '#555'; } ctx.lineWidth = 1; ctx.stroke(); }); if(food) { ctx.fillStyle = '#FF6B6B'; ctx.beginPath(); ctx.arc(food.x + box / 2, food.y + box / 2, box / 2.2, 0, 2 * Math.PI); ctx.fill(); ctx.fillStyle = '#FFE66D'; ctx.beginPath(); ctx.arc(food.x + box / 2, food.y + box / 2, box / 5, 0, 2 * Math.PI); ctx.fill(); } if (special) { ctx.fillStyle = special.color; ctx.beginPath(); ctx.arc(special.x + box/2, special.y + box/2, box/1.8, 0, 2* Math.PI); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = `${box * 0.6}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(special.symbol, special.x + box / 2, special.y + box / 2 + 1); if (special.isBoss) { ctx.fillStyle = 'white'; ctx.font = `${box * 0.3}px Arial`; ctx.fillText(`${special.bossCurrentHits}/${special.bossMaxHits}`, special.x + box / 2, special.y + box * 0.9); } } obstacles.forEach(o => { ctx.fillStyle = '#6c757d'; ctx.fillRect(o.x, o.y, box, box); ctx.strokeStyle = '#343a40'; ctx.lineWidth = 2; ctx.strokeRect(o.x, o.y, box, box); }); particles.forEach(p => { if (typeof chroma !== 'undefined') { try { ctx.fillStyle = chroma(p.color).alpha(p.alpha).css(); } catch(e) { ctx.fillStyle = 'rgba(200,200,200,'+p.alpha+')'; } } else { ctx.fillStyle = `rgba(200,200,200,${p.alpha})`; } ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size); p.x += p.vx; p.y += p.vy; p.alpha -= p.decay; }); particles = particles.filter(p => p.alpha > 0); }
    let previousTimestamp = 0;
    function gameLoop(timestamp) { const deltaTime = timestamp - previousTimestamp; previousTimestamp = timestamp; if (!gameVisibleAndActive || over) { if(gameVisibleAndActive && !over && paused) draw(); return; } if(paused) { draw(); if (gameVisibleAndActive) requestAnimationFrame(gameLoop); return; } if (timestamp - lastTime >= speed) { update(); lastTime = timestamp; } tickEffects(deltaTime); draw(); if (gameVisibleAndActive) requestAnimationFrame(gameLoop); }
    function update() { if (over || paused || !snake || snake.length === 0) return; const head = { x: snake[0].x, y: snake[0].y }; if (dir === 'LEFT') head.x -= box; else if (dir === 'RIGHT') head.x += box; else if (dir === 'UP') head.y -= box; else if (dir === 'DOWN') head.y += box; if (repelCountdown > 0 && food) { const dx = food.x - head.x; const dy = food.y - head.y; if (Math.abs(dx) < box * 3 && Math.abs(dy) < box * 3) { let newFoodX = food.x + Math.sign(dx) * box; let newFoodY = food.y + Math.sign(dy) * box; newFoodX = Math.max(0, Math.min(canvas.width - box, newFoodX)); newFoodY = Math.max(0, Math.min(canvas.height - box, newFoodY)); food.x = newFoodX; food.y = newFoodY; } repelCountdown--; } else if (magnet && food) { const dx = food.x - head.x; const dy = food.y - head.y; if (Math.abs(dx) > box/2 || Math.abs(dy) > box/2) { if (Math.abs(dx) > Math.abs(dy)) { head.x += Math.sign(dx) * box; } else { head.y += Math.sign(dy) * box; } } } if (wallPass) { if (head.x < 0) head.x = canvas.width - box; else if (head.x >= canvas.width) head.x = 0; if (head.y < 0) head.y = canvas.height - box; else if (head.y >= canvas.height) head.y = 0; } else if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) return gameOver('wall'); for (let i = 1; i < snake.length; i++) { if (head.x === snake[i].x && head.y === snake[i].y) return gameOver('self'); } for (let o of obstacles) { if (head.x === o.x && head.y === o.y) return gameOver('obstacle'); } if (food && head.x === food.x && head.y === food.y) { score += mult; updateScore(); newFood(); spawnParticles(food.x + box / 2, food.y + box / 2, '#34D399'); navigator.vibrate?.(50); if (!special && Math.random() < (0.25 + currentLevel * 0.03) ) newSpecial(); } else { snake.pop(); } if (special && head.x === special.x && head.y === special.y) { const sp = { ...special }; special = null; if (sp.isBoss) { sp.bossCurrentHits--; flash(`Lovitură Critic BOSS! Rămase: ${sp.bossCurrentHits}`, 2000, sp.bossCurrentHits > 0 ? 'bad' : 'good'); if (sp.bossCurrentHits <= 0) { flash(`${t('CRITICUL INTERIOR')} ÎNVINS!`, 3000, 'good'); score += 50 + currentLevel * 10; updateScore(); currentLevel++; saveGameState(); setTimeout(() => nextLevelSetup(false), 2500); } else { special = { ...sp, ...spawnFree(true, 6) }; } } else if (sp.negative && shield && shield.hits > 0) { shield.hits--; flash(t('shieldProtect') + ` (${shield.hits} ${shield.hits === 1 ? 'lovitură' : 'lovituri'})`, 2000, 'good'); spawnParticles(sp.x + box/2, sp.y + box/2, '#FFFFFF', 15); } else { if (sp.type) collected[sp.type] = (collected[sp.type] || 0) + 1; if (analytics && analytics.current && analytics.current.obstacles) analytics.current.obstacles.push(sp.type); if (sp.valueType && values.hasOwnProperty(sp.valueType)) { values[sp.valueType] += sp.points || 1; } if (sp.effect) sp.effect(); spawnParticles(sp.x + box / 2, sp.y + box / 2, sp.color, 12); navigator.vibrate?.(100); if (sp.type === 'critic' && !sp.isBoss) { startReframe(); } } updateValues(); checkStuck(); } snake.unshift(head); const levelData = levels[currentLevel]; if (levelData && !levelData.mechanic?.includes('boss')) { const scoreNeededForNextLevel = (currentLevel + 1) * LEVEL_SCORE_INCREMENT + (currentLevel * 5); if (currentLevel < levels.length - 1 && score >= scoreNeededForNextLevel) { currentLevel++; flash(`${t('Nivelul')} ${currentLevel + 1}: ${t(levels[currentLevel].theme)} atins!`, 3000, 'good'); saveGameState(); setTimeout(() => nextLevelSetup(false), 2500); } } }
    function gameOver(reason = 'unknown') { if (over) return; over = true; paused = true; saveGameState(); saveAnalytics(); let reasonText = ''; if (reason === 'wall') reasonText = 'Ai lovit un perete.'; else if (reason === 'self') reasonText = 'Te-ai auto-colizionat.'; else if (reason === 'obstacle') reasonText = 'Ai lovit un obstacol.'; let raport = `<strong class="text-lg">${t('emotionalSummary')} (${reasonText})</strong><br>`; flash(raport, 7000, 'bad'); if(restartBtn) restartBtn.classList.remove('hidden'); if(fullResetBtn) fullResetBtn.classList.remove('hidden'); }
    function handleKeyDown(e) { const isInputFocused = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA'); if (isInputFocused && (e.key !== 'Escape')) return; const relevantKeysForPrevent = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'p', 'j', 'm', 'r']; if (gameVisibleAndActive && !over && relevantKeysForPrevent.includes(e.key.toLowerCase())) { const isActionModalOpen = (journalModal && !journalModal.classList.contains('hidden')) || (shopModal && !shopModal.classList.contains('hidden')) || (minigameModal && !minigameModal.classList.contains('hidden')); if (!isInputFocused || !isActionModalOpen) { e.preventDefault(); } } if (e.key === 'Escape') { if (journalModal && !journalModal.classList.contains('hidden')) { if(closeJournalModalBtn) closeJournalModalBtn.click(); return; } if (shopModal && !shopModal.classList.contains('hidden')) { if(closeShopModalBtn) closeShopModalBtn.click(); return; } if (minigameModal && !minigameModal.classList.contains('hidden')) { if(closeMinigameModalBtn) closeMinigameModalBtn.click(); return; } else if (gameVisibleAndActive && !over) { paused = !paused; flash(paused ? "Joc în Pauză" : "Joc Reluat", 1500); if(!paused) { lastTime = performance.now(); if(gameVisibleAndActive) requestAnimationFrame(gameLoop); } return; } } if (!gameVisibleAndActive || over || breathingActive) return; const k = e.key.toLowerCase(); if (k === ' ' || k === 'p') { paused = !paused; flash(paused ? "Joc în Pauză" : "Joc Reluat", 1500); if (!paused) { lastTime = performance.now(); if(gameVisibleAndActive) requestAnimationFrame(gameLoop); } return; } if (k === 'j' && journalBtn) { journalBtn.click(); return; } if (k === 'm' && shopBtn) { shopBtn.click(); return; } if (k === 'r' && slowMotion && !breathingActive) { startBreathing(); return; } if (paused && !(k === ' ' || k === 'p')) return; if ((k === 'arrowleft' || k === 'a') && dir !== 'RIGHT') dir = 'LEFT'; else if ((k === 'arrowup' || k === 'w') && dir !== 'DOWN') dir = 'UP'; else if ((k === 'arrowright' || k === 'd') && dir !== 'LEFT') dir = 'RIGHT'; else if ((k === 'arrowdown' || k === 's') && dir !== 'UP') dir = 'DOWN'; }
    document.addEventListener('keydown', handleKeyDown);
    if(restartBtn) restartBtn.onclick = () => { if (isCanvasReadyForGame) nextLevelSetup(false); saveGameState(); };
    if(fullResetBtn) fullResetBtn.onclick = () => { if (confirm(t('Ești sigur că vrei să resetezi tot progresul jocului?'))) { if(isCanvasReadyForGame) fullResetGameToLevelZero(); } };
    // --- SFÂRȘIT Definiții Funcții ---

    gameInitialized = true;
    console.log("Instanța jocului Snake PREGĂTITĂ (dar nu pornită complet).");

    return {
        pause: () => { if (!paused) { paused = true; flash("Joc în Pauză", 1500); } },
        resume: () => { if (paused && !over && isCanvasReadyForGame) { paused = false; flash("Joc Reluat", 1500); lastTime = performance.now(); if(gameVisibleAndActive) requestAnimationFrame(gameLoop); if(canvas) canvas.focus();} else if (!isCanvasReadyForGame) { console.warn("Resume apelat, dar canvas nu e gata."); }},
        resetCurrentLevel: () => { if (isCanvasReadyForGame) nextLevelSetup(false); else console.warn("ResetCurrentLevel apelat, dar canvas nu e gata."); },
        fullReset: () => { if (isCanvasReadyForGame) fullResetGameToLevelZero(); else console.warn("FullReset apelat, dar canvas nu e gata."); },
        isPaused: () => paused,
        isOver: () => over,
        setGameVisibility: (isVisible) => {
            const oldVisibility = gameVisibleAndActive;
            gameVisibleAndActive = isVisible;
            if (isVisible && !oldVisibility && !over) {
                console.log("SnakeGame: Vizibilitate ON.");
                if (isCanvasReadyForGame) {
                    console.log("   Canvas gata, pornește/reia game loop.");
                    lastTime = performance.now();
                    requestAnimationFrame(gameLoop);
                    if(canvas) canvas.focus();
                } else { console.log("   Canvas nu e gata. Așteaptă triggerResize."); }
            } else if (!isVisible && oldVisibility && !paused) {
                console.log("SnakeGame: Vizibilitate OFF, pune jocul pe pauză.");
                paused = true;
            }
        },
        triggerResize: () => {
            console.log("triggerResize a fost apelat.");
            resizeCanvas();
            if (canvas && canvas.width > box && canvas.height > box) { // Asigură-te că canvas e definit
                if (!isCanvasReadyForGame) {
                    isCanvasReadyForGame = true;
                    console.log("Canvas este acum gata. Se inițializează primul nivel.");
                    setLanguage(language);
                    nextLevelSetup(true);
                } else {
                    console.log("Canvas a fost redimensionat (jocul era deja gata).");
                    if (!paused && !over && gameVisibleAndActive) draw();
                }
            } else { console.warn("triggerResize apelat, dar dimensiuni canvas invalide după resize."); isCanvasReadyForGame = false;}
        },
        cleanup: () => { document.removeEventListener('keydown', handleKeyDown); gameInitialized = false; gameInstance = null; console.log("Snake game instance cleaned up."); }
    };
}


// --- GESTIONARE MODAL PRINCIPAL ȘI PORNIRE JOC ---
document.addEventListener('DOMContentLoaded', () => {
    const launchModalBtn = document.getElementById('launchGameModalButton');
    snakeGameModalContainer = document.getElementById('snakeGameModalContainer');

    if (!launchModalBtn || !snakeGameModalContainer) {
        console.error("Lipsesc elemente DOM esențiale: launchGameModalButton sau snakeGameModalContainer.");
        return;
    }

    launchModalBtn.addEventListener('click', () => {
        console.log("Buton 'Începe Călătoria Interioară' apăsat.");

        if (!snakeGameModalContainer.querySelector('#snakeGameModalContent')) {
            snakeGameModalContainer.innerHTML = gameModalHTMLStructure;
            snakeGameWrapper = document.getElementById('snakeGameWrapper');
            closeSnakeGameModalButton = document.getElementById('closeSnakeGameModal');

            if (!snakeGameWrapper || !closeSnakeGameModalButton) {
                console.error("CRITICAL: Lipsesc #snakeGameWrapper sau #closeSnakeGameModal după injectare.");
                return;
            }
            closeSnakeGameModalButton.addEventListener('click', () => {
                if (snakeGameModalContainer) snakeGameModalContainer.style.display = 'none';
                if (gameInstance) gameInstance.setGameVisibility(false);
            });
        }

        if (!gameInitialized) {
            if (!snakeGameWrapper) { console.error("CRITICAL: snakeGameWrapper e null înainte de initializeSnakeGame!"); return; }
            gameInstance = initializeSnakeGame();
        }

        if (gameInstance) {
            snakeGameModalContainer.style.display = 'flex';
            if (typeof gameInstance.triggerResize === 'function') {
                setTimeout(() => gameInstance.triggerResize(), 100);
            }
            setTimeout(() => { if (gameInstance) gameInstance.setGameVisibility(true); }, 150);
            if (canvas) setTimeout(() => canvas.focus(), 200); // Canvas e definit global
        } else {
            console.error("Inițializarea jocului a eșuat.");
        }
    });
});

// --- Export și Salvare ---
export function handleGameVisibility(isVisible) {
    const modalIsOpen = snakeGameModalContainer && snakeGameModalContainer.style.display === 'flex';
    if (gameInstance && typeof gameInstance.setGameVisibility === 'function') {
        gameInstance.setGameVisibility(isVisible && modalIsOpen);
        if (isVisible && modalIsOpen && canvas && (gameInstance.isOver() || gameInstance.isPaused())) {
            setTimeout(() => canvas.focus(), 50);
        }
    }
}

window.addEventListener('beforeunload', () => {
    if (gameInstance && gameInitialized && gameVisibleAndActive && !gameInstance.isOver() && typeof saveGameState === 'function') {
        saveGameState(); // saveGameState este definit în scope-ul initializeSnakeGame
        console.log("Progresul jocului Snake salvat la părăsirea paginii.");
    }
});