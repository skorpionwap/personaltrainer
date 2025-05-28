// --- assets/js/snakeGame.js ---

// Variabile la nivel de modul pentru a gestiona starea jocului
let gameInstance = null;
let gameInitialized = false;
let gameVisibleAndActive = false;

// DOM Elements
let snakeGameModalContainer;
let snakeGameWrapper;
let closeSnakeGameModalButton;

// --- Variabile de configurare ---
const BOX_SIZE = 20; // Din index (2).html (era 'box' acolo)
const INITIAL_SNAKE_SPEED = 180; // Din index (2).html (era 'speed' acolo)

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
        Maxim: <span id="snakeHighScore" class="font-bold text-yellow-400">0</span>
      </div>
      <div class="values text-xs sm:text-sm mb-1 flex justify-center gap-2 sm:gap-3" aria-live="polite">
        <span>💙 Emp: <span id="snakeEmpatie" class="font-semibold">0</span></span>
        <span>🦁 Cur: <span id="snakeCuraj" class="font-semibold">0</span></span>
        <span>⏳ Răb: <span id="snakeRabdare" class="font-semibold">0</span></span>
      </div>
      <div id="snakeIntro" class="hidden bg-gray-700 p-2 sm:p-3 rounded-lg my-1 text-sm text-center" role="dialog"></div>
      <canvas id="snakeCanvas" width="320" height="320" tabindex="0" aria-label="Joc Snake" class="focus:outline-none focus:ring-2 focus:ring-green-500 rounded-md shadow-lg block mx-auto mb-1 flex-shrink-0" style="background: #1d2230; max-width: 100%; height: auto;"></canvas>
      <div id="snakeStatus" class="flex gap-1 sm:gap-2 justify-center my-1 text-xs sm:text-sm" aria-live="polite"></div>
      <div id="snakeControls" class="controls text-gray-400 text-xs sm:text-sm mb-1">Săgeți/WASD | Space: Pauză | J: Jurnal</div>
      <div class="flex gap-1 sm:gap-2 justify-center mt-auto flex-wrap">
        <button id="snakeRestartBtn" class="hidden px-2 py-1 sm:px-3 sm:py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm rounded-md shadow">Restart</button>
        <button id="snakeJournalBtn" class="px-2 py-1 sm:px-3 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded-md shadow">Jurnal</button>
        <button id="snakeShopBtn" class="px-2 py-1 sm:px-3 sm:py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs sm:text-sm rounded-md shadow">Magazin</button>
        <button id="snakeLangBtn" class="px-2 py-1 sm:px-3 sm:py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm rounded-md shadow">English</button>
      </div>
      <div id="snakeJournalModal" class="modal-overlay hidden"><div class="modal-content"><h3 class="modal-title">Jurnal (Joc)</h3><textarea id="snakeJournalEntry" class="modal-textarea" rows="5" placeholder="Notează-ți gândurile..."></textarea><div class="modal-actions"><button id="snakeSaveJournal" class="modal-btn-primary">Salvează</button><button id="snakeExportJournal" class="modal-btn-secondary">Export PDF</button><button id="snakeViewJournal" class="modal-btn-neutral">Vezi Intrări</button><button id="snakeCloseJournalModal" class="modal-btn-danger">Închide</button></div> <div id="snakeViewJournalContent" class="modal-scroll-content hidden p-2 bg-gray-800 rounded mt-2 max-h-48 overflow-y-auto"></div></div></div>
      <div id="snakeShopModal" class="modal-overlay hidden"><div class="modal-content"><h3 class="modal-title">Magazin Interior (Joc)</h3><div id="snakeShopItems" class="grid gap-2"></div><div class="modal-actions"><button id="snakeCloseShopModal" class="modal-btn-danger w-full">Închide</button></div></div></div>
      <div id="snakeMinigameModal" class="modal-overlay hidden"><div class="modal-content text-center"><div id="snakeMinigameContent"></div><div class="modal-actions"><button id="snakeCloseMinigameModal" class="modal-btn-danger w-full">Închide</button></div></div></div>
      <div id="snakeEffect" class="game-effect" aria-live="assertive"></div>
    </div>
`;


function initializeSnakeGame() {
    if (!snakeGameWrapper) {
        console.error("CRITICAL ERROR: #snakeGameWrapper nu a fost găsit.");
        return null;
    }
    snakeGameWrapper.innerHTML = gameInterfaceHTMLStructure;

    const canvas = document.getElementById('snakeCanvas'); // ID din gameInterfaceHTMLStructure
    if (!canvas) {
        console.error("Elementul canvas #snakeCanvas nu a fost găsit!");
        return null;
    }
    const ctx = canvas.getContext('2d');
    const box = BOX_SIZE;

    // --- Canvas Resize Logic (from complex version) ---
    function resizeCanvas() {
        const parentInterface = canvas.parentElement;
        const gameModalContent = document.getElementById('snakeGameModalContent');
        if (!parentInterface || !gameModalContent) {
            canvas.width = BOX_SIZE * 16; canvas.height = BOX_SIZE * 16; return;
        }
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
        uiElementsToMeasure.forEach((el) => {
            if (el) {
                const elHeight = el.offsetHeight;
                let marginTop = parseInt(getComputedStyle(el).marginTop) || 0;
                const marginBottom = parseInt(getComputedStyle(el).marginBottom) || 0;
                // Basic correction for large unexpected margins if needed, can be refined
                if (marginTop > 25 && (el.classList.contains('values') || el.id === 'snakeStatus')) marginTop = 4;
                nonCanvasHeight += elHeight + marginTop + marginBottom;
            }
        });
        const interfacePaddingTop = parseInt(getComputedStyle(parentInterface).paddingTop) || 0;
        const interfacePaddingBottom = parseInt(getComputedStyle(parentInterface).paddingBottom) || 0;
        nonCanvasHeight += interfacePaddingTop + interfacePaddingBottom + 5;
        const availableHeight = parentInterface.clientHeight - nonCanvasHeight;
        if (availableWidth <= BOX_SIZE * 5 || availableHeight <= BOX_SIZE * 5) {
            canvas.width = BOX_SIZE * 16; canvas.height = BOX_SIZE * 16; return;
        }
        const newSizeBase = Math.min(availableWidth, availableHeight);
        canvas.width = Math.floor(newSizeBase / box) * box;
        canvas.height = Math.floor(newSizeBase / box) * box;
        console.log(`Canvas resized to: ${canvas.width}x${canvas.height}`);
    }

    // --- Game State Variables (from simple version, adapted) ---
    let snake, dir, food, score = 0, currentSpeed = INITIAL_SNAKE_SPEED, highScore = 0;
    let paused = false, over = false, wallPass = false, magnet = false;
    let shield = { level: 1, hits: 1 }; // Kept from complex
    let activeColor = null, specialItem = null, effects = [], effectIdCounter = 0, particles = [], obstacles = [];
    let currentLevel = 0; // For campaign structure
    let values = { empatie: 0, curaj: 0, rabdare: 0 }; // Kept from complex
    let collectedForLevel = {}; // For per-level tracking if needed
    let lastFrameTime = 0, repelFoodCountdown = 0, journalEntries = [], language = 'ro';
    let slowMotionActive = false, clarityMapActive = false, breathingMinigameActive = false; // Kept from complex

    // --- DOM Elements (mapped to new IDs) ---
    const scoreEl = document.getElementById('snakeScore'), highScoreEl = document.getElementById('snakeHighScore');
    const effectEl = document.getElementById('snakeEffect');
    const statusBar = document.getElementById('snakeStatus'), restartBtn = document.getElementById('snakeRestartBtn');
    const introEl = document.getElementById('snakeIntro');
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
    const levelDisplayEl = document.getElementById('snakeLevelDisplay');


    // --- Load/Save State (simplified from complex, focusing on simple version's needs) ---
    function loadGameState() {
        highScore = parseInt(localStorage.getItem('snakeGameHighScore_simpleV1')) || 0;
        journalEntries = JSON.parse(localStorage.getItem('snakeGameJournal_simpleV1')) || [];
        language = localStorage.getItem('snakeGameLanguage_simpleV1') || 'ro';
        // Values and level might be reset or loaded if campaign is more complex
        values = JSON.parse(localStorage.getItem('snakeGameValues_simpleV1')) || { empatie: 0, curaj: 0, rabdare: 0 };
        currentLevel = parseInt(localStorage.getItem('snakeGameLevel_simpleV1')) || 0;
        shield = JSON.parse(localStorage.getItem('snakeGameShield_simpleV1')) || { level: 1, hits: 1 };
        slowMotionActive = JSON.parse(localStorage.getItem('snakeGameSlowMotion_simpleV1')) || false;
        clarityMapActive = JSON.parse(localStorage.getItem('snakeGameClarityMap_simpleV1')) || false;

        if(highScoreEl) highScoreEl.textContent = highScore;
        updateValuesDisplay();
        updateLevelDisplay();
    }
    function saveGameState() {
        localStorage.setItem('snakeGameHighScore_simpleV1', highScore);
        localStorage.setItem('snakeGameJournal_simpleV1', JSON.stringify(journalEntries));
        localStorage.setItem('snakeGameLanguage_simpleV1', language);
        localStorage.setItem('snakeGameValues_simpleV1', JSON.stringify(values));
        localStorage.setItem('snakeGameLevel_simpleV1', currentLevel);
        localStorage.setItem('snakeGameShield_simpleV1', JSON.stringify(shield));
        localStorage.setItem('snakeGameSlowMotion_simpleV1', slowMotionActive);
        localStorage.setItem('snakeGameClarityMap_simpleV1', clarityMapActive);
    }
    loadGameState();

    // --- Translations (from complex version) ---
    const translations = { ro: { score: 'Scor', highScore: 'Maxim', restart: 'Restart', journal: 'Jurnal', shop: 'Magazin', controls: 'Săgeți/WASD | Space: Pauză | J: Jurnal', save: 'Salvează', export: 'Export PDF', view: 'Vezi Intrări', journalSaved: 'Jurnal salvat!', journalEmpty: 'Jurnalul este gol.', close: 'Închide', purchased: 'Cumpărat', InsufficientValues: 'Valori insuficiente!', level: 'Nivel', English: 'English', Română: 'Română', dailyQuest: 'Provocarea zilei: Adună 3 ⭐ Motivație, scrie un gând recunoscător.', shieldProtect: '🛡️ Scut activ!', curaj: 'Curaj', rabdare: 'Răbdare', empatie: 'Empatie', acceptare: 'Acceptare', frustrare: 'Frustrare', motivatie: 'Motivație', copil: 'Copil Interior', adult: 'Adult Sănătos', critic: 'Critic Interior', abandon: 'Abandon', izolare: 'Izolare', shopTitle: 'Magazin Interior', breathing: 'Exercițiu de Respirație (R)', reframe: 'Alege o Afirmație Pozitivă:', stuck: 'Blocaj? Scrie în jurnal.', MaxedOut: 'Nivel Maxim', 'achiziționat': 'achiziționat', 'Nivelul': 'Nivelul', 'Ești sigur că vrei să resetezi tot progresul jocului?': 'Ești sigur că vrei să resetezi tot progresul jocului?' }, en: { score: 'Score', highScore: 'High Score', restart: 'Restart', journal: 'Journal', shop: 'Shop', controls: 'Arrows/WASD | Space: Pause | J: Journal', save: 'Save', export: 'Export PDF', view: 'View Entries', journalSaved: 'Journal saved!', journalEmpty: 'Journal is empty.', close: 'Close', purchased: 'Purchased', InsufficientValues: 'Insufficient values!', level: 'Level', English: 'English', Română: 'Română', dailyQuest: 'Daily Quest: Collect 3 ⭐ Motivation, write a grateful thought.', shieldProtect: '🛡️ Shield active!', curaj: 'Courage', rabdare: 'Patience', empatie: 'Empathy', acceptare: 'Acceptance', frustrare: 'Frustration', motivatie: 'Motivation', copil: 'Inner Child', adult: 'Healthy Adult', critic: 'Inner Critic', abandon: 'Abandonment', izolare: 'Isolation', shopTitle: 'Inner Shop', breathing: 'Breathing Exercise (R)', reframe: 'Choose a Positive Affirmation:', stuck: 'Stuck? Write in journal.', MaxedOut: 'Max Level', 'achiziționat': 'purchased', 'Nivelul': 'Level', 'Ești sigur că vrei să resetezi tot progresul jocului?': 'Are you sure you want to reset all game progress?' } };
    function t(key) { return translations[language]?.[key] || translations['ro']?.[key] || key; }

    // --- Levels (Campaign structure from complex, content from simple if available) ---
    const gameLevels = [ // Renamed from 'levels' to avoid conflict
        { theme: 'Curaj', message: 'Explorează ce înseamnă să fii curajos. Ce te motivează?', specialTypes: ['curaj', 'motivatie'], obstacles: 1, bgColor: '#ffb347', snakeColor: '#e69500', speedFactor: 1 },
        { theme: 'Frustrare', message: 'Confruntă frustrarea. Ce te ajută să te calmezi?', specialTypes: ['frustrare', 'rabdare'], obstacles: 2, bgColor: '#ff686b', snakeColor: '#c94f52', speedFactor: 0.95 },
        { theme: 'Empatie', message: 'Conectează-te cu ceilalți. Ce simți când ești empatic?', specialTypes: ['empatie', 'adult'], obstacles: 1, bgColor: '#59a5e0', snakeColor: '#3584c4', speedFactor: 0.9 },
        { theme: 'Acceptare', message: 'Acceptă-ți vulnerabilitățile. Ce te face să te simți liber?', specialTypes: ['acceptare', 'copil'], obstacles: 2, bgColor: '#b388ff', snakeColor: '#8f6acc', speedFactor: 0.85 },
        { theme: 'Criticul Interior', message: 'Înfruntă criticul interior. Ce îți spui pentru a merge mai departe?', specialTypes: ['critic', 'abandon', 'motivatie'], obstacles: 0, bgColor: '#d00000', snakeColor: '#a00000', speedFactor: 0.8, isBossLevel: true }
    ];

    // --- Specials (Adapted from simple, enhanced by complex structure) ---
    const specialTemplates = [
        { type: 'curaj', symbol: '🦁', color: '#ffb347', valueType: 'curaj', points: 1, effect: () => { values.curaj++; updateValuesDisplay(); flash(t('curaj')+' +1!', 1500,'good');}},
        { type: 'rabdare', symbol: '⏳', color: '#7ed957', valueType: 'rabdare', points: 1, effect: () => { values.rabdare++; updateValuesDisplay(); flash(t('rabdare')+' +1!', 1500,'good');}},
        { type: 'empatie', symbol: '💙', color: '#59a5e0', valueType: 'empatie', points: 1, effect: () => { values.empatie++; updateValuesDisplay(); magnet = true; addActiveEffect("Empatie Magnet", 5000, () => magnet = false); flash(t('empatie')+' +1 & Magnet!', 1500,'good');}},
        { type: 'acceptare', symbol: '🌀', color: '#b388ff', effect: () => { wallPass = true; addActiveEffect("Acceptare Ziduri", 5000, () => wallPass = false); flash(t('acceptare')+' - Treci prin ziduri!', 1500,'good');}},
        { type: 'frustrare', symbol: '🌩️', color: '#ff686b', negative: true, effect: () => { const oldSpeed = currentSpeed; currentSpeed = Math.max(50, currentSpeed * 0.7); addActiveEffect("Frustrare Viteză", 3000, () => currentSpeed = oldSpeed, true); flash(t('frustrare')+' - Viteză crescută!', 1500,'bad');}},
        { type: 'motivatie', symbol: '⭐', color: '#ffe166', effect: () => { score += 5; updateScoreDisplay(); flash(t('motivatie')+' +5 Pcte!', 1500,'good');}},
        { type: 'copil', symbol: '👶🛡️', color: '#ffd1dc', effect: () => { if(shield) shield.hits = Math.max(shield.hits, shield.level); flash(t('shieldProtect'), 1500,'good');}},
        { type: 'adult', symbol: '🧘', color: '#90e0ef', effect: () => { endNegativeEffects(); flash(t('adult')+' - Claritate!', 1500,'good');}}, // Simplified
        { type: 'critic', symbol: '🗣️💬', color: '#d00000', negative: true, effect: () => { invertDirection(); flash(t('critic')+' - Direcție inversată!', 1500,'bad');}},
        { type: 'abandon', symbol: '💔', color: '#6d6875', negative: true, effect: () => { shrinkSnake(); flash(t('abandon')+' - Te simți mic...', 1500,'bad');}},
        { type: 'izolare', symbol: '🧱', color: '#5a189a', negative: true, effect: () => { repelFoodCountdown = Math.floor(5000 / currentSpeed); flash(t('izolare')+' - Mâncarea fuge!', 1500,'bad');}}
    ];
     let multScoreFactor = 1; // Not really used if specials give fixed points

    // --- Shop Items (from complex version) ---
    const shopItemsList = [
        { id: 'shieldUpgrade', name: 'Upgrade Scut', cost: { curaj: 5, rabdare: 3 }, effect: () => { shield.level++; shield.hits = shield.level; flash('Scut Nivel ' + shield.level); saveGameState(); }, maxLevel: 3, currentLevelFn: () => shield.level-1 },
        { id: 'slowMotionActivate', name: 'Respirație Liniștitoare (R)', cost: { rabdare: 3, empatie: 2 }, effect: () => { slowMotionActive = true; flash('Respirație activată (R)'); saveGameState(); }, oneTimePurchase: true, purchasedFn: () => slowMotionActive },
    ];


    // --- Helper Functions (Core from simple, enhanced from complex) ---
    function spawnFreePosition() { /* ... (same as complex version, using 'box' for BOX_SIZE) ... */
        let p, attempts = 0; const maxAttempts = (canvas.width / box) * (canvas.height / box);
        if (maxAttempts <=0 || !snake) return {x:0, y:0};
        do {
            p = { x: Math.floor(Math.random() * (canvas.width / box)) * box, y: Math.floor(Math.random() * (canvas.height / box)) * box };
            attempts++; if (attempts > maxAttempts * 2) return snake.length > 0 ? {x: snake[0].x, y: snake[0].y} : { x: 0, y: 0};
        } while ( snake.some(seg => seg.x === p.x && seg.y === p.y) || obstacles.some(o => o.x === p.x && o.y === p.y) || (food && p.x === food.x && p.y === food.y) || (specialItem && p.x === specialItem.x && p.y === specialItem.y));
        return p;
    }
    function createNewFood() { food = spawnFreePosition(); }
    function createNewSpecialItem() { /* ... (same as complex version, using gameLevels and specialTemplates) ... */
        if (specialItem || currentLevel >= gameLevels.length) return;
        const currentLvlData = gameLevels[currentLevel]; const levelSpecialTypes = currentLvlData?.specialTypes || specialTemplates.map(s => s.type);
        const availableSpecialsPool = specialTemplates.filter(s => levelSpecialTypes.includes(s.type) && !s.isBoss);
        if (availableSpecialsPool.length === 0) return;
        const randomSpecialTemplate = availableSpecialsPool[Math.floor(Math.random() * availableSpecialsPool.length)];
        specialItem = { ...randomSpecialTemplate, ...spawnFreePosition() };
    }
    function spawnNewObstacle() { obstacles.push(spawnFreePosition()); }
    function updateScoreDisplay() { /* ... (same as complex version) ... */
        if(scoreEl) scoreEl.textContent = score;
        if (score > highScore) { highScore = score; if(highScoreEl) highScoreEl.textContent = highScore; }
    }
    function updateValuesDisplay() { /* ... (same as complex version) ... */
        if(valueEls.empatie) valueEls.empatie.textContent = values.empatie;
        if(valueEls.curaj) valueEls.curaj.textContent = values.curaj;
        if(valueEls.rabdare) valueEls.rabdare.textContent = values.rabdare;
    }
    function updateLevelDisplay() { if(levelDisplayEl) levelDisplayEl.textContent = t('Nivelul') + ' ' + (currentLevel + 1); }
    function flash(text, duration = 1600, type = 'info') { /* ... (same as complex, using effectEl) ... */
      if(!effectEl) return; effectEl.innerHTML = text; effectEl.className = 'game-effect';
      if (type === 'good') effectEl.classList.add('positive'); else if (type === 'bad') effectEl.classList.add('negative');
      effectEl.style.opacity = 1; setTimeout(() => { if(effectEl) effectEl.style.opacity = 0; }, duration);
    }
    function endNegativeEffects() { /* ... (same as complex) ... */
        effects = effects.filter(e => !e.isNegative);
        if(statusBar) statusBar.querySelectorAll('.neg-effect').forEach(el => el.remove());
        flash("Efecte negative înlăturate!", 2000, 'good');
    }
    function invertDirection() { /* ... (same as complex) ... */
        if (dir === 'LEFT') dir = 'RIGHT'; else if (dir === 'RIGHT') dir = 'LEFT';
        else if (dir === 'UP') dir = 'DOWN'; else if (dir === 'DOWN') dir = 'UP';
    }
    function shrinkSnake() { /* ... (same as complex) ... */
        const amountToShrink = Math.min(snake.length -1, 2);
        for(let i=0; i<amountToShrink; i++) if(snake.length > 1) snake.pop();
    }
    function addActiveEffect(name, durationMs, onEndCallback = null, isNegative = false) { /* ... (same as complex) ... */
        if(!statusBar) return; const id = 'activeEffect' + (++effectIdCounter);
        const effectData = { id, name, durationMs, timeLeftMs: durationMs, onEnd: onEndCallback, isNegative };
        const span = document.createElement('div'); span.className = 'stat-effect'; if (effectData.isNegative) span.classList.add('neg-effect'); span.id = id;
        const textSpan = document.createElement('span'); textSpan.textContent = name.length > 12 ? name.substring(0,10) + "..." : name; textSpan.title = name;
        const barContainer = document.createElement('div'); barContainer.className = 'effect-bar-container'; const bar = document.createElement('div'); bar.className = 'effect-bar'; barContainer.appendChild(bar);
        span.appendChild(textSpan); span.appendChild(barContainer); statusBar.appendChild(span); effects.push(effectData);
    }
    function tickEffects(deltaTime) { /* ... (same as complex) ... */
        if(!statusBar || effects.length === 0) return;
        for (let i = effects.length - 1; i >= 0; i--) {
            const effect = effects[i]; effect.timeLeftMs -= deltaTime;
            const s = document.getElementById(effect.id); if (s) { const barEl = s.querySelector('.effect-bar'); if (barEl) barEl.style.width = Math.max(0, (effect.timeLeftMs / effect.durationMs)) * 100 + '%';}
            if (effect.timeLeftMs <= 0) { if (s) s.remove(); if (effect.onEnd) effect.onEnd(); effects.splice(i, 1); }
        }
    }
    function spawnParticles(x, y, color, count = 8) { /* ... (same as complex, using 'box') ... */
      for (let i = 0; i < count; i++) {
        particles.push({ x: x + (Math.random() - 0.5) * box * 0.5, y: y + (Math.random() - 0.5) * box * 0.5, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, alpha: 1, color, size: 2 + Math.random() * 2, decay: 0.02 + Math.random() * 0.01 });
      }
    }


    // --- Modals Setup (from complex version) ---
    function setupModal(modalElement, openBtnElement, closeBtnElement, onOpenCallback = null) { /* ... (same as complex version, adapted for game pause) ... */
        if (openBtnElement && modalElement && closeBtnElement) {
            openBtnElement.onclick = () => {
                if (!paused && modalElement.classList.contains('hidden')) { paused = true; flash("Joc în Pauză (Modal)", 1500); }
                else if (paused && !modalElement.classList.contains('hidden')) { modalElement.classList.add('hidden'); if(canvas) canvas.focus(); return; }
                [journalModal, shopModal, minigameModal].forEach(m => { if (m && m !== modalElement) m.classList.add('hidden');});
                modalElement.classList.remove('hidden'); if (onOpenCallback) onOpenCallback();
            };
            closeBtnElement.onclick = () => { modalElement.classList.add('hidden'); if(canvas) canvas.focus(); };
        }
    }
    if(journalModal && journalBtn && closeJournalModalBtn) setupModal(journalModal, journalBtn, closeJournalModalBtn, () => { if(journalEntry) journalEntry.focus(); viewJournalContentEl.classList.add('hidden'); });
    if(shopModal && shopBtn && closeShopModalBtn) setupModal(shopModal, shopBtn, closeShopModalBtn, populateShop);
    if(saveJournalBtn) saveJournalBtn.onclick = () => { /* ... (same as complex) ... */
        const entryText = journalEntry.value.trim(); if (entryText) { journalEntries.push({ date: new Date().toISOString(), text: entryText }); saveGameState(); journalEntry.value = ''; flash(t('journalSaved'), 1500, 'good'); } else { flash(t('journalEmpty'), 1500, 'bad'); }
    };
    if(exportJournalBtn) exportJournalBtn.onclick = () => { /* ... (same as complex, ensure jsPDF is available) ... */
        if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') { flash("PDF library not loaded.", 2000, "bad"); return; }
        if (journalEntries.length === 0) { flash(t('journalEmpty'), 1500, 'bad'); return; }
        const { jsPDF: JSPDF_LOCAL } = window.jspdf; const doc = new JSPDF_LOCAL(); doc.text(t('Jurnal (Joc)'), 10, 10); let y = 20;
        journalEntries.forEach(entry => { const lines = doc.splitTextToSize(`[${new Date(entry.date).toLocaleString('ro-RO')}]: ${entry.text}`, 180); if (y + lines.length * 7 > 280) { doc.addPage(); y = 15; } doc.text(lines, 10, y); y += lines.length * 7 + 5; });
        doc.save('jurnal_snake_game.pdf'); flash("Jurnal exportat!", 2000, 'good');
    };
    if(viewJournalBtn) viewJournalBtn.onclick = () => { /* ... (same as complex) ... */
        if(viewJournalContentEl) { if (journalEntries.length === 0) { viewJournalContentEl.innerHTML = `<p>${t('journalEmpty')}</p>`; } else { viewJournalContentEl.innerHTML = journalEntries.slice().reverse().map(entry => `<div class="journal-history-item"><strong>${new Date(entry.date).toLocaleString('ro-RO')}:</strong><p>${entry.text.replace(/\n/g, '<br>')}</p></div>`).join(''); } viewJournalContentEl.classList.toggle('hidden'); }
    };
    function populateShop() { /* ... (same as complex version) ... */
        if(!shopItemsEl) return; shopItemsEl.innerHTML = '';
        shopItemsList.forEach(item => {
            const btn = document.createElement('button'); btn.className = 'shop-item-btn';
            let currentItemLvl = item.currentLevelFn ? item.currentLevelFn() : 0; let purchased = item.purchasedFn ? item.purchasedFn() : false;
            let costString = Object.entries(item.cost).map(([k, v]) => `${v} ${t(k)}`).join(', '); let nameString = t(item.name);
            if (item.maxLevel && currentItemLvl >= item.maxLevel) { btn.innerHTML = `<div>${nameString} (${t('MaxedOut')})</div>`; btn.disabled = true; }
            else if (item.oneTimePurchase && purchased) { btn.innerHTML = `<div>${nameString} (${t('purchased')})</div>`; btn.disabled = true; }
            else { btn.innerHTML = `<div>${nameString} ${item.maxLevel ? `(Nv. ${currentItemLvl+1})` : ''}</div><div class="shop-item-cost">Cost: ${costString}</div>`;}
            btn.onclick = () => { if (btn.disabled) return; let canAfford = true; for (const [key, val] of Object.entries(item.cost)) { if (!values[key] || values[key] < val) { canAfford = false; break;}} if (canAfford) { Object.entries(item.cost).forEach(([k, v]) => values[k] -= v); item.effect(); updateValuesDisplay(); flash(`${t(item.name)} ${t('achiziționat')}!`, 2000, 'good'); populateShop(); saveGameState(); } else { flash(t('InsufficientValues'), 2000, 'bad'); }};
            shopItemsEl.appendChild(btn);
        });
    }
    function startBreathingMinigame() { /* ... (from complex, simplified if needed, using minigameModal) ... */
        breathingMinigameActive = true; paused = true; [journalModal, shopModal].forEach(m => m?.classList.add('hidden')); minigameModal.classList.remove('hidden');
        minigameContentEl.innerHTML = `<p class="text-lg mb-2">${t('breathing')}</p><div class="breathing-circle-container"><div id="breathingCircle" class="breathing-circle">Inspiră</div></div>`;
        const circle = document.getElementById('breathingCircle'); let phase = 0, phaseTimer = 0; const phaseDuration = 4;
        function animateBreath() { if (!breathingMinigameActive || !circle) return; phaseTimer += 0.05; if (phaseTimer >= phaseDuration) { phaseTimer = 0; phase = (phase + 1) % 4; if (phase === 0) circle.textContent = "Inspiră"; else if (phase === 1) circle.textContent = "Ține"; else if (phase === 2) circle.textContent = "Expiră"; else if (phase === 3) circle.textContent = "Ține"; } let scale = 1; if (phase === 0) scale = 1 + (phaseTimer / phaseDuration) * 0.5; else if (phase === 1) scale = 1.5; else if (phase === 2) scale = 1.5 - (phaseTimer / phaseDuration) * 0.5; else if (phase === 3) scale = 1; circle.style.transform = `scale(${scale})`; requestAnimationFrame(animateBreath); } animateBreath();
    }
    if(closeMinigameModalBtn && minigameModal) closeMinigameModalBtn.onclick = () => { minigameModal.classList.add('hidden'); breathingMinigameActive = false; if(canvas) canvas.focus(); };


    // --- Language (from complex version) ---
    function setLanguage(lang) { /* ... (same as complex, ensure all IDs match) ... */
        language = lang; const gameInterfaceEl = document.getElementById('snakeGameInterface'); if (!gameInterfaceEl) return;
        const titleH2 = gameInterfaceEl.querySelector('h2'); if (titleH2) titleH2.textContent = t('Snake 🐍 – Călătoria Interioară');
        const scoreLabel = scoreEl?.parentNode?.firstChild; if (scoreLabel && scoreLabel.nodeType === Node.TEXT_NODE) scoreLabel.textContent = t('score') + ": ";
        const highScoreLabel = highScoreEl?.parentNode?.firstChild; if (highScoreLabel && highScoreLabel.nodeType === Node.TEXT_NODE) highScoreLabel.textContent = t('highScore') + ": ";
        updateLevelDisplay(); // Will use t('Nivelul')
        if(controlsEl) controlsEl.textContent = t('controls'); if(restartBtn) restartBtn.textContent = t('restart');
        if(journalBtn) journalBtn.textContent = t('journal'); if(shopBtn) shopBtn.textContent = t('shop');
        if(langBtn) langBtn.textContent = t(language === 'ro' ? 'English' : 'Română');
        if(journalModal) journalModal.querySelector('.modal-title').textContent = t('Jurnal (Joc)');
        if(journalEntry) journalEntry.placeholder = t('Notează-ți gândurile...'); if(saveJournalBtn) saveJournalBtn.textContent = t('save');
        if(exportJournalBtn) exportJournalBtn.textContent = t('export'); if(viewJournalBtn) viewJournalBtn.textContent = t('view');
        if(closeJournalModalBtn) closeJournalModalBtn.textContent = t('close');
        if(shopModal) shopModal.querySelector('.modal-title').textContent = t('shopTitle');
        if(closeShopModalBtn) closeShopModalBtn.textContent = t('close');
        if(closeMinigameModalBtn) closeMinigameModalBtn.textContent = t('close');
        if(langBtn) langBtn.setAttribute('aria-label', t(language === 'ro' ? 'Switch to English' : 'Schimbă în Română'));
        if (introEl && !introEl.classList.contains('hidden') && currentLevel < gameLevels.length) { const lvlData = gameLevels[currentLevel]; introEl.innerHTML = `<strong class="text-base sm:text-lg">${t('level')} ${currentLevel + 1}: ${t(lvlData.theme)}</strong><br><span class="text-xs sm:text-sm">${t(lvlData.message)}</span><br><em class="text-xs text-gray-400">${t('dailyQuest')}</em>`; }
        updateValuesDisplay();
    }
    if(langBtn) langBtn.onclick = () => { setLanguage(language === 'ro' ? 'en' : 'ro'); saveGameState(); };


    // --- Game Reset/Setup (Core from simple, with level intro from complex) ---
    function resetGame(isFullReset = false) {
        snake = [{ x: Math.floor(canvas.width / box / 2) * box, y: Math.floor(canvas.height / box / 2) * box }]; // Center
        dir = ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)]; // Random initial direction
        
        if (isFullReset) {
            score = 0;
            currentLevel = 0;
            values = { empatie: 0, curaj: 0, rabdare: 0 };
            shield = { level: 1, hits: 1 };
            slowMotionActive = false; clarityMapActive = false;
            // highScore is not reset by full game reset
        }
        // Score is reset per level attempt if not a full reset that already did it
        // Or, if score should persist across levels, this line is removed.
        // For now, let's assume score resets per level attempt for simplicity like original simple game.
        if (!isFullReset) score = 0;


        currentSpeed = INITIAL_SNAKE_SPEED / (gameLevels[currentLevel]?.speedFactor || 1);
        wallPass = magnet = false;
        if(shield) shield.hits = shield.level;
        activeColor = null; over = false;
        paused = true; // Pause for intro message
        specialItem = null; effects = []; particles = []; obstacles = [];
        if (statusBar) statusBar.innerHTML = ''; effectIdCounter = 0;
        collectedForLevel = {}; // Reset per-level collected items

        updateScoreDisplay(); updateValuesDisplay(); updateLevelDisplay();
        createNewFood();
        if (Math.random() < 0.2) createNewSpecialItem();

        if(restartBtn) restartBtn.classList.add('hidden');

        if (currentLevel < gameLevels.length) {
            const lvlData = gameLevels[currentLevel];
            if(introEl && lvlData) {
                introEl.innerHTML = `<strong class="text-base sm:text-lg">${t('level')} ${currentLevel + 1}: ${t(lvlData.theme)}</strong><br><span class="text-xs sm:text-sm">${t(lvlData.message)}</span><br><em class="text-xs text-gray-400">${t('dailyQuest')}</em>`;
                introEl.classList.remove('hidden');
            }
            obstacles = []; for (let i = 0; i < (lvlData.obstacles || 0); i++) spawnNewObstacle();
            
            setTimeout(() => {
                if(introEl) introEl.classList.add('hidden');
                paused = false;
                if (gameVisibleAndActive && !over && !paused) {
                     lastFrameTime = performance.now(); requestAnimationFrame(gameLoop);
                }
            }, 2500); // Intro display time
        } else { // All levels completed
            if(introEl) { introEl.innerHTML = `<strong class="text-lg">Felicitări!</strong><br><span>Ai finalizat toate nivelele!</span>`; introEl.classList.remove('hidden');}
            paused = true; over = true; // Mark as game over to prevent further play
            if(restartBtn) restartBtn.textContent = "Restart Joc Complet"; // Or a different message
            if(restartBtn) restartBtn.classList.remove('hidden');
        }
        if (!paused) lastFrameTime = performance.now(); // Set if not paused by intro
    }


    // --- Draw Function (from simple version, adapted for new canvas ID and colors) ---
    function drawGame() {
        if (!ctx || !canvas) return;
        const currentLvlData = gameLevels[currentLevel] || {};
        const baseBg = currentLvlData.bgColor || '#1d2230'; // Default from interface
        const snakeHeadActualColor = activeColor || (shield.hits > 0 ? '#FFACE4' : (currentLvlData.snakeColor || '#36a26b'));
        const snakeBodyActualColor = (shield.hits > 0 ? '#FFD1F0' : (currentLvlData.snakeColor ? (typeof chroma !== 'undefined' ? chroma(currentLvlData.snakeColor).darken(0.5).hex() : currentLvlData.snakeColor) : '#88dab2'));

        ctx.fillStyle = baseBg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        snake.forEach((seg, i) => {
            ctx.fillStyle = i === 0 ? snakeHeadActualColor : snakeBodyActualColor;
            ctx.fillRect(seg.x, seg.y, box, box);
            ctx.strokeStyle = '#232c37'; // Darker border from simple version
            ctx.strokeRect(seg.x, seg.y, box, box);
        });

        if (food) {
            ctx.fillStyle = '#FF6B6B'; // Simple food color
            ctx.font = `${box*0.9}px Arial`; // Adjust size based on box
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🍏', food.x + box / 2, food.y + box / 2 + box*0.05); // Centered apple
        }
        if (specialItem) {
            ctx.fillStyle = specialItem.color;
            ctx.font = `${box*0.9}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(specialItem.symbol, specialItem.x + box / 2, specialItem.y + box / 2 + box*0.05);
        }
        obstacles.forEach(o => {
            ctx.fillStyle = clarityMapActive ? 'rgba(108, 117, 125, 0.5)' : '#6c757d';
            ctx.fillRect(o.x, o.y, box, box);
            ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1; ctx.strokeRect(o.x,o.y,box,box);
        });
        particles.forEach(p => { /* ... (same as complex) ... */
            if (typeof chroma !== 'undefined') { try { ctx.fillStyle = chroma(p.color).alpha(p.alpha).css(); } catch(e) { ctx.fillStyle = `rgba(200,200,200,${p.alpha})`; }} else { ctx.fillStyle = `rgba(200,200,200,${p.alpha})`; }
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size); p.x += p.vx; p.y += p.vy; p.alpha -= p.decay;
        });
        particles = particles.filter(p => p.alpha > 0);
    }

    // --- Game Loop (from simple version, adapted) ---
    let previousTimestamp = 0;
    function gameLoop(timestamp) {
        const deltaTime = timestamp - previousTimestamp; // For tickEffects
        previousTimestamp = timestamp;

        if (!gameVisibleAndActive || over) { if(gameVisibleAndActive && !over && paused) drawGame(); return; }
        if (paused) { drawGame(); if (gameVisibleAndActive) requestAnimationFrame(gameLoop); return; }

        if (timestamp - lastFrameTime >= currentSpeed) {
            updateGame();
            lastFrameTime = timestamp;
        }
        tickEffects(deltaTime); // From complex
        drawGame();
        if (gameVisibleAndActive) requestAnimationFrame(gameLoop);
    }

    // --- Update Game Logic (Core from simple, with special item logic from complex) ---
    function updateGame() {
        if (over || paused || !snake || snake.length === 0) return;
        const head = { x: snake[0].x, y: snake[0].y };
        if (dir === 'LEFT') head.x -= box; else if (dir === 'RIGHT') head.x += box;
        else if (dir === 'UP') head.y -= box; else if (dir === 'DOWN') head.y += box;

        // Repel/Magnet Food Logic (from complex version)
        if (repelFoodCountdown > 0 && food) { /* ... */ const dx = food.x - head.x; const dy = food.y - head.y; if (Math.abs(dx) < box * 3 && Math.abs(dy) < box * 3) { let nFX = food.x + Math.sign(dx) * box; let nFY = food.y + Math.sign(dy) * box; food.x = Math.max(0, Math.min(canvas.width - box, nFX)); food.y = Math.max(0, Math.min(canvas.height - box, nFY));} repelFoodCountdown--; }
        else if (magnet && food) { /* ... */ const dx = food.x - head.x; const dy = food.y - head.y; if (Math.abs(dx) > box/2 || Math.abs(dy) > box/2) { if (Math.abs(dx) > Math.abs(dy)) head.x += Math.sign(dx) * box; else head.y += Math.sign(dy) * box;}}


        if (wallPass) { /* ... (wall pass logic from complex) ... */
            if (head.x < 0) head.x = canvas.width - box; else if (head.x >= canvas.width) head.x = 0;
            if (head.y < 0) head.y = canvas.height - box; else if (head.y >= canvas.height) head.y = 0;
        } else if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) return triggerGameOver('wall');

        for (let i = 1; i < snake.length; i++) if (head.x === snake[i].x && head.y === snake[i].y) return triggerGameOver('self');
        for (let o of obstacles) if (head.x === o.x && head.y === o.y) return triggerGameOver('obstacle');

        if (food && head.x === food.x && head.y === food.y) {
            score++; updateScoreDisplay(); createNewFood();
            spawnParticles(food.x + box / 2, food.y + box / 2, '#34D399'); // Green particles
            navigator.vibrate?.(50);
            if (!specialItem && Math.random() < 0.3) createNewSpecialItem(); // Chance for special
        } else { snake.pop(); }

        if (specialItem && head.x === specialItem.x && head.y === specialItem.y) {
            const spData = { ...specialItem }; specialItem = null;
            if (spData.negative && shield && shield.hits > 0) {
                shield.hits--; flash(t('shieldProtect'), 1500, 'good'); spawnParticles(spData.x + box/2, spData.y + box/2, '#FFFFFF', 10);
            } else {
                if (spData.type) collectedForLevel[spData.type] = (collectedForLevel[spData.type] || 0) + 1;
                if (spData.valueType && values.hasOwnProperty(spData.valueType)) values[spData.valueType] += (spData.points || 1);
                if (spData.effect) spData.effect(); // This will handle its own flash/effects
                spawnParticles(spData.x + box / 2, spData.y + box / 2, spData.color, 10);
                navigator.vibrate?.(100);
            }
            updateValuesDisplay();
        }
        snake.unshift(head);

        // Level Progression (Simplified from complex)
        const LEVEL_SCORE_TARGET = 10; // Simple target for now
        if (score >= LEVEL_SCORE_TARGET * (currentLevel + 1) && currentLevel < gameLevels.length - 1) {
            currentLevel++;
            flash(`${t('Nivelul')} ${currentLevel + 1} atins!`, 2000, 'good');
            saveGameState();
            setTimeout(() => resetGame(false), 2000); // Go to next level
        } else if (currentLevel >= gameLevels.length -1 && gameLevels[currentLevel]?.isBossLevel && score >= 1) { // Example boss win condition
            // This part needs specific boss logic if a boss is defeated
        }
    }

    // --- Game Over (from simple, adapted) ---
    function triggerGameOver(reason = 'unknown') {
        if (over) return; over = true; paused = true; saveGameState();
        let reasonText = '';
        if (reason === 'wall') reasonText = 'Ai lovit un perete.';
        else if (reason === 'self') reasonText = 'Te-ai auto-colizionat.';
        else if (reason === 'obstacle') reasonText = 'Ai lovit un obstacol.';
        flash(`Joc Terminat! ${reasonText} Scor: ${score}`, 5000, 'bad');
        if(restartBtn) restartBtn.classList.remove('hidden');
    }

    // --- Controls (from simple, adapted for new keys and modals) ---
    function handleKeyDown(e) {
        const isInputFocused = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
        if (isInputFocused && e.key !== 'Escape') return;

        const isActionModalOpen = isAnyModalOpen(); // Helper from complex

        if (e.key === 'Escape') {
            if (isActionModalOpen) {
                if (journalModal && !journalModal.classList.contains('hidden')) closeJournalModalBtn.click();
                else if (shopModal && !shopModal.classList.contains('hidden')) closeShopModalBtn.click();
                else if (minigameModal && !minigameModal.classList.contains('hidden')) closeMinigameModalBtn.click();
                return;
            } else if (gameVisibleAndActive && !over) {
                paused = !paused; flash(paused ? "Pauză" : "Reluat", 1000);
                if(!paused) { lastFrameTime = performance.now(); if(gameVisibleAndActive) requestAnimationFrame(gameLoop); }
            }
            return;
        }

        if (!gameVisibleAndActive || over || breathingMinigameActive) return;
        const k = e.key.toLowerCase();

        if (k === ' ' || k === 'p') { // Space or P for pause/resume
            if (isActionModalOpen) return;
            paused = !paused; flash(paused ? "Pauză" : "Reluat", 1000);
            if (!paused) { lastFrameTime = performance.now(); if(gameVisibleAndActive) requestAnimationFrame(gameLoop); }
            return;
        }
        if (k === 'j' && journalBtn) { journalBtn.click(); return; }
        if (k === 'm' && shopBtn) { shopBtn.click(); return; } // M for Shop
        if (k === 'r' && slowMotionActive && !isActionModalOpen) { startBreathingMinigame(); return; } // R for Breathing

        if (paused) return; // Ignore game movement if paused (and not unpausing)

        if ((k === 'arrowleft' || k === 'a') && dir !== 'RIGHT') dir = 'LEFT';
        else if ((k === 'arrowup' || k === 'w') && dir !== 'DOWN') dir = 'UP';
        else if ((k === 'arrowright' || k === 'd') && dir !== 'LEFT') dir = 'RIGHT';
        else if ((k === 'arrowdown' || k === 's') && dir !== 'UP') dir = 'DOWN';
    }
    document.addEventListener('keydown', handleKeyDown);
    if(restartBtn) restartBtn.onclick = () => resetGame(currentLevel >= gameLevels.length -1); // Full reset if all levels done


    // --- Initialize Script & Return Game Instance (from complex) ---
    setLanguage(language);
    gameInitialized = true;
    console.log("Instanța jocului Snake (versiune simplificată) inițializată.");

    return {
        pause: () => { if (!paused) { paused = true; flash("Pauză", 1000); } },
        resume: () => { if (paused && !over && !isAnyModalOpen()) { paused = false; flash("Reluat", 1000); lastFrameTime = performance.now(); if(gameVisibleAndActive) requestAnimationFrame(gameLoop); if(canvas) canvas.focus();} },
        resetCurrentLevel: () => resetGame(false), // Reset current level attempt
        fullReset: () => resetGame(true),      // Full game reset to level 0
        isPaused: () => paused,
        isOver: () => over,
        setGameVisibility: (isVisible) => {
            const oldVisibility = gameVisibleAndActive;
            gameVisibleAndActive = isVisible;
            if (isVisible && !oldVisibility) {
                console.log("SnakeGame (simplu): Vizibilitate ON.");
                if (typeof resizeCanvas === 'function') resizeCanvas();
                if (!snake) { // First time game is made visible
                    resetGame(true); // Initial setup, starts unpaused after intro
                } else if (over) {
                    resetGame(currentLevel >= gameLevels.length -1); // Reset if game was over
                } else if (paused && !isAnyModalOpen()) {
                    // resume(); // Or let user unpause
                }
                if (!paused && !over) { lastFrameTime = performance.now(); requestAnimationFrame(gameLoop); }
                if(canvas) canvas.focus();
            } else if (!isVisible && oldVisibility && !paused) {
                console.log("SnakeGame (simplu): Vizibilitate OFF, pauză.");
                paused = true;
            }
        },
        triggerResize: resizeCanvas,
        cleanup: () => {
            document.removeEventListener('keydown', handleKeyDown);
            gameInitialized = false; gameInstance = null;
            console.log("Snake game instance (simplu) cleaned up.");
        }
    };
}

function isAnyModalOpen() { /* ... (same as complex version) ... */
    const jM = document.getElementById('snakeJournalModal'), sM = document.getElementById('snakeShopModal'), mgM = document.getElementById('snakeMinigameModal');
    return (jM && !jM.classList.contains('hidden')) || (sM && !sM.classList.contains('hidden')) || (mgM && !mgM.classList.contains('hidden'));
}

// --- GESTIONARE MODAL PRINCIPAL ȘI PORNIRE JOC (from complex version) ---
document.addEventListener('DOMContentLoaded', () => {
    const launchModalBtn = document.getElementById('launchGameModalButton');
    snakeGameModalContainer = document.getElementById('snakeGameModalContainer');
    if (!launchModalBtn || !snakeGameModalContainer) { console.error("Elemente UI principale lipsesc!"); return; }
    launchModalBtn.addEventListener('click', () => {
        if (!snakeGameModalContainer.querySelector('#snakeGameModalContent')) {
            snakeGameModalContainer.innerHTML = gameModalHTMLStructure;
            snakeGameWrapper = document.getElementById('snakeGameWrapper');
            closeSnakeGameModalButton = document.getElementById('closeSnakeGameModal');
            if (!snakeGameWrapper) { console.error("CRITICAL: #snakeGameWrapper negăsit!"); return; }
            if (closeSnakeGameModalButton) {
                closeSnakeGameModalButton.addEventListener('click', () => {
                    if (snakeGameModalContainer) snakeGameModalContainer.style.display = 'none';
                    if (gameInstance) gameInstance.setGameVisibility(false);
                });
            }
        }
        if (!gameInitialized) gameInstance = initializeSnakeGame();
        if (gameInstance) {
            snakeGameModalContainer.style.display = 'flex';
            setTimeout(() => { // Delay for resize and visibility
                if (typeof gameInstance.triggerResize === 'function') gameInstance.triggerResize();
                gameInstance.setGameVisibility(true);
                const activeCanvas = document.getElementById('snakeCanvas');
                if (activeCanvas) setTimeout(() => activeCanvas.focus(), 50);
            }, 100);
        } else { console.error("Inițializare joc eșuată."); }
    });
});

export function handleGameVisibility(isVisible) { /* ... (same as complex version) ... */
    const modalIsOpen = snakeGameModalContainer && snakeGameModalContainer.style.display === 'flex';
    if (gameInstance && typeof gameInstance.setGameVisibility === 'function') {
        gameInstance.setGameVisibility(isVisible && modalIsOpen);
        if (isVisible && modalIsOpen && (gameInstance.isOver() || gameInstance.isPaused())) {
            const gameCanvas = document.getElementById('snakeCanvas'); if (gameCanvas) setTimeout(() => gameCanvas.focus(), 50);
        }
    }
}

window.addEventListener('beforeunload', () => { /* ... (same as complex version, using saveGameState from this scope) ... */
    if (gameInstance && gameInitialized && gameVisibleAndActive && !gameInstance.isOver()) {
        saveGameState(); console.log("Progres joc Snake (simplu) salvat.");
    }
});

// Optional: Chroma.js for advanced colors (if needed by any retained complex drawing parts)
// <script src="https://cdnjs.cloudflare.com/ajax/libs/chroma-js/2.1.2/chroma.min.js"></script>