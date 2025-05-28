// --- assets/js/snakeGame.js ---

// Variabile la nivel de modul pentru a gestiona starea jocului
let gameInstance = null;
let gameInitialized = false;
let gameVisibleAndActive = false;

// DOM Elements specific to the game, will be queried after HTML injection
let snakeGameWrapper;
let startGameButton; // Sau launchGameModalButton dacă folosești modal
let snakeGameModalContainer; // Pentru varianta cu modal
let closeSnakeGameModalButton; // Pentru varianta cu modal

// --- Variabile de configurare ---
const INITIAL_SNAKE_SPEED = 170; // Mai lent pentru început
const BOX_SIZE = 20;
const LEVEL_SCORE_INCREMENT = 25; // Scorul necesar per nivel, crește progresiv
const PARTICLE_COUNT = 8;

// --- HTML STRUCTURE FOR THE GAME (Modal Version) ---
const gameModalHTMLStructure = `
    <div id="snakeGameModalContent" class="bg-gray-900 p-1 sm:p-2 rounded-lg shadow-xl relative w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto" style="aspect-ratio: 4/3.5; display: flex; flex-direction: column;">
        <button id="closeSnakeGameModal" class="absolute top-1 right-1 text-white bg-red-600 hover:bg-red-700 rounded-full p-0 w-7 h-7 flex items-center justify-center text-sm z-50" title="Închide Jocul">×</button>
        <div id="snakeGameWrapper" class="game-wrapper h-full w-full flex-grow" style="display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #222c36; border-radius: 0.5rem;">
            <!-- Conținutul efectiv al jocului va fi injectat aici -->
        </div>
    </div>
`;

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
// const sounds = {
//     collect: new Audio('path/to/collect.wav'),
//     special: new Audio('path/to/special.wav'),
//     negative: new Audio('path/to/negative.wav'),
//     gameOver: new Audio('path/to/gameOver.wav'),
//     levelUp: new Audio('path/to/levelUp.wav'),
// };
// function playSound(soundName) {
//     if (sounds[soundName]) {
//         sounds[soundName].currentTime = 0;
//         sounds[soundName].play().catch(e => console.warn("Eroare redare sunet:", e));
//     }
// }


function initializeSnakeGame() {
    if (gameInitialized) {
        console.log("Jocul Snake este deja inițializat.");
        return gameInstance;
    }

    if (snakeGameWrapper) {
        snakeGameWrapper.innerHTML = gameInterfaceHTMLStructure;
    } else {
        console.error("Containerul pentru joc (#snakeGameWrapper) nu a fost găsit în DOM la injectare.");
        return null;
    }

    const canvas = document.getElementById('snakeCanvas');
    if (!canvas) {
        console.error("Elementul canvas #snakeCanvas nu a fost găsit după injectare!");
        return null;
    }
    const ctx = canvas.getContext('2d');
    const box = BOX_SIZE;

    // Ajustare dimensiuni canvas pentru a umple containerul modal păstrând aspect ratio
    function resizeCanvas() {
        const parent = canvas.parentElement;
        if (!parent) return;
        const parentWidth = parent.clientWidth - 20; // Lăsăm puțin padding
        const parentHeight = parent.clientHeight - 150; // Aproximativ, spațiu pentru UI

        const newSize = Math.min(parentWidth, parentHeight);
        canvas.width = Math.floor(newSize / box) * box; // Asigură multiplu de box
        canvas.height = Math.floor(newSize / box) * box;
    }
    resizeCanvas(); // Inițial
    // window.addEventListener('resize', resizeCanvas); // Adaugă dacă vrei redimensionare dinamică a modalului

    let snake, dir, food, score, mult, speed, highScore, currentLevel;
    let paused, over, wallPass, magnet, shield;
    let activeColor, special, effects, effectId, particles, obstacles;
    let values, collected, analytics;
    let lastTime, repelCountdown, journalEntries, language;
    let slowMotion, clarityMap, breathingActive;

    // DOM elements (căutate după injectarea HTML)
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


    // --- ÎNCĂRCARE STARE JOC din localStorage ---
    function loadGameState() {
        highScore = parseInt(localStorage.getItem('snakeGameHighScoreV2')) || 0;
        currentLevel = parseInt(localStorage.getItem('snakeGameCurrentLevelV2')) || 0;
        score = parseInt(localStorage.getItem('snakeGameScoreV2')) || 0; // Scorul persistă
        values = JSON.parse(localStorage.getItem('snakeGameValuesV2')) || { empatie: 0, curaj: 0, rabdare: 0 };
        shield = JSON.parse(localStorage.getItem('snakeGameShieldV2')) || { level: 1, hits: 1 };
        slowMotion = JSON.parse(localStorage.getItem('snakeGameSlowMotionV2')) || false;
        clarityMap = JSON.parse(localStorage.getItem('snakeGameClarityMapV2')) || false;
        journalEntries = JSON.parse(localStorage.getItem('snakeGameJournalV2')) || [];
        analytics = { sessions: JSON.parse(localStorage.getItem('snakeGameAnalyticsV2')) || [], current: {} };
        language = localStorage.getItem('snakeGameLanguageV2') || 'ro';

        highScoreEl.textContent = highScore;
    }

    // --- SALVARE STARE JOC în localStorage ---
    function saveGameState() {
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
        console.log("Starea jocului Snake a fost salvată.");
    }

    loadGameState(); // Încarcă starea la inițializare

    // ---------- TRANSLATIONS, LEVELS, SPECIALS, SHOP ITEMS (la fel ca înainte) ----------
    const translations = { ro: { score: 'Scor', highScore: 'Maxim', restart: 'Restart Nivel', journal: 'Jurnal', shop: 'Magazin', controls: 'Săgeți/WASD | Space/P: Pauză | J: Jurnal | M: Magazin', save: 'Salvează', export: 'Export PDF', view: 'Vezi Jurnal', journalSaved: 'Jurnal salvat!', journalEmpty: 'Jurnalul este gol.', close: 'Închide', emotionalSummary: 'Rezumat Emoțional', courageFeedback: '🦁 Curajul tău crește! Explorează ce te face puternic.', frustrationFeedback: '🌩️ Ai simțit frustrare. O pauză sau o respirație adâncă pot ajuta.', shieldProtect: '🛡️ Scutul a protejat Copilul Interior', curaj: 'Curaj', rabdare: 'Răbdare', empatie: 'Empatie', acceptare: 'Acceptare', frustrare: 'Frustrare', motivatie: 'Motivație', copil: 'Copil Interior', adult: 'Adult Sănătos', critic: 'Critic Interior', abandon: 'Abandon', izolare: 'Izolare', shopTitle: 'Magazin Interior', dailyQuest: 'Provocarea zilei: Colectează 3 ⭐ Motivație și scrie un gând recunoscător în jurnal.', breathing: 'Exercițiu de Respirație Conștientă', reframe: 'Alege o Afirmație Pozitivă:', stuck: 'Blocaj? Scrie ce te apasă în jurnal.', purchased: 'Cumpărat', InsufficientValues: 'Valori insuficiente!', level: 'Nivel', fullReset: 'Reset Joc Complet' }, en: { score: 'Score', highScore: 'High Score', restart: 'Restart Level', journal: 'Journal', shop: 'Shop', controls: 'Arrows/WASD | Space/P: Pause | J: Journal | M: Shop', save: 'Save', export: 'Export PDF', view: 'View Journal', journalSaved: 'Journal saved!', journalEmpty: 'Journal is empty.', close: 'Close', emotionalSummary: 'Emotional Summary', courageFeedback: '🦁 Your courage grows! Explore what makes you strong.', frustrationFeedback: '🌩️ You felt frustration. A break or deep breath can help.', shieldProtect: '🛡️ Shield protected the Inner Child', curaj: 'Courage', rabdare: 'Patience', empatie: 'Empathy', acceptare: 'Acceptance', frustrare: 'Frustration', motivatie: 'Motivation', copil: 'Inner Child', adult: 'Healthy Adult', critic: 'Inner Critic', abandon: 'Abandonment', izolare: 'Isolation', shopTitle: 'Inner Shop', dailyQuest: 'Daily Quest: Collect 3 ⭐ Motivation and write a grateful thought in your journal.', breathing: 'Mindful Breathing Exercise', reframe: 'Choose a Positive Affirmation:', stuck: 'Feeling stuck? Write what troubles you in the journal.', purchased: 'Purchased', InsufficientValues: 'Insufficient values!', level: 'Level', fullReset: 'Full Game Reset' } };
    const levels = [ /* ... la fel ca înainte, poate cu bgColor actualizat pentru canvas ... */
        { theme: 'Curaj', message: 'Explorează curajul. Ce te motivează?', specials: ['curaj', 'motivatie'], obstacles: 1, bgColor: 'rgba(255, 179, 71, 0.3)', snakeColor: '#ffb347', mechanic: null },
        { theme: 'Răbdare', message: 'Practică răbdarea. Cum te ajută să te calmezi?', specials: ['rabdare', 'acceptare'], obstacles: 2, bgColor: 'rgba(126, 217, 87, 0.3)', snakeColor: '#7ed957', mechanic: 'slowObstacles' },
        { theme: 'Empatie', message: 'Conectează-te. Ce simți când ești empatic?', specials: ['empatie', 'adult'], obstacles: 1, bgColor: 'rgba(89, 165, 224, 0.3)', snakeColor: '#59a5e0', mechanic: 'magnetFood' },
        { theme: 'Acceptare', message: 'Acceptă vulnerabilitățile. Ce te eliberează?', specials: ['acceptare', 'copil', 'rabdare'], obstacles: 2, bgColor: 'rgba(179, 136, 255, 0.3)', snakeColor: '#b388ff', mechanic: 'wallPassTemp' },
        { theme: 'Înfruntarea Criticului', message: 'Înfruntă criticul. Ce îți spui pentru a merge mai departe?', specials: ['critic', 'abandon', 'motivatie', 'adult'], obstacles: 0, bgColor: 'rgba(208, 0, 0, 0.4)', snakeColor: '#d00000', mechanic: 'bossCritique' }
    ];
    const specials = [ /* ... la fel, poate cu simboluri emoji mai clare și valori ajustate ... */
        { type: 'curaj', symbol: '🦁', color: '#ffb347', valueType: 'curaj', points: 1, effect: () => { boost(1.5, t('curaj')); }, revert: endBoost, duration: 5000 },
        { type: 'rabdare', symbol: '⏳', color: '#7ed957', valueType: 'rabdare', points: 1, effect: () => { slow(t('rabdare')); }, revert: resetSpeed, duration: 7000 },
        { type: 'empatie', symbol: '💙', color: '#59a5e0', valueType: 'empatie', points: 1, effect: () => { magnet = true; flash(t('empatie') + ' Magnet Activ!'); }, revert: () => { magnet = false; }, duration: 8000 },
        { type: 'acceptare', symbol: '🌀', color: '#b388ff', valueType: 'acceptare', points: 1, effect: () => { wallPass = true; flash(t('acceptare') + ' - Treci prin Ziduri!'); }, revert: () => { wallPass = false; }, duration: 6000 },
        { type: 'motivatie', symbol: '⭐', color: '#ffe166', valueType: 'motivatie', points: 1, effect: () => { score += 5 * mult; updateScore(); flash(t('motivatie') + ' +5 Pcte!'); }, revert: null },
        { type: 'copil', symbol: '👶🛡️', color: '#ffd1dc', valueType: 'copil', points: 0, effect: () => { shield.hits = Math.max(shield.hits, shield.level); flash(t('copil') + ' Protejat!'); }, revert: null }, // Nu se adaugă la valori, e un scut
        { type: 'adult', symbol: '🧘', color: '#90e0ef', valueType: 'adult', points: 0, effect: () => { endNegativeEffects(); boost(1.2, t('adult') + ' Prezent!'); }, revert: endBoost, duration: 7000 },
        // Negative
        { type: 'critic', symbol: '🗣️💬', color: '#d00000', negative: true, effect: () => { invertDirection(); flash(t('critic') + ' Interior Activ!'); addActiveEffect(t('critic'), 3000, () => { /* nu e nevoie de revert specific aici */ }); }, revert: null },
        { type: 'abandon', symbol: '💔', color: '#6d6875', negative: true, effect: () => { shrinkSnake(); flash(t('abandon') + ' - Te Simți Mic...'); addActiveEffect(t('abandon'), 4000); }, revert: null },
        { type: 'izolare', symbol: '🧱', color: '#5a189a', negative: true, effect: () => { repelFood(); flash(t('izolare') + ' - Mâncarea Fuge!'); addActiveEffect(t('izolare'), 5000); }, revert: null },
        { type: 'frustrare', symbol: '🤯', color: '#ff686b', negative: true, effect: () => { speedUpTemporary(t('frustrare') + ' Intensă!'); addActiveEffect(t('frustrare'), 3000); }, revert: resetSpeed }
    ];
    const shopItemsList = [ /* ... la fel ... */
        { id: 'shieldUpgrade', name: 'Upgrade Scut Copil', cost: { curaj: 5, rabdare: 3 }, effect: () => { shield.level++; shield.hits = shield.level; flash('Scut Îmbunătățit la Nivelul ' + shield.level); saveGameState(); }, maxLevel: 3, currentLevelFn: () => shield.level-1 },
        { id: 'slowMotionActivate', name: 'Activare Respirație Liniștitoare', cost: { rabdare: 3, empatie: 2 }, effect: () => { slowMotion = true; flash('Respirația Liniștitoare poate fi activată cu R.'); saveGameState(); }, oneTimePurchase: true, purchasedFn: () => slowMotion },
        { id: 'clarityMapActivate', name: 'Activare Hartă Claritate (Obstacole Vizibile)', cost: { empatie: 4, curaj: 2 }, effect: () => { clarityMap = true; flash('Harta Clarității activată!'); saveGameState(); }, oneTimePurchase: true, purchasedFn: () => clarityMap },
        { id: 'valueBoostCuraj', name: 'Focus pe Curaj (Crește șansa 🦁)', cost: { motivatie: 5 }, effect: () => { /* TODO: Logică pentru a crește șansa de curaj */ flash('Focus pe Curaj activat!');}, oneTimePurchase: false} // Exemplu de item repetabil
    ];

    // ---------- HELPERS (multe rămân similare, dar cu referințe DOM actualizate și mici îmbunătățiri) ----------
    function t(key) { return translations[language]?.[key] || key; }

    function spawnFree(avoidPlayer = true, minDistance = 0) {
        let p, attempts = 0;
        const maxAttempts = (canvas.width / box) * (canvas.height / box); // Evită bucle infinite
        do {
            p = {
                x: Math.floor(Math.random() * (canvas.width / box)) * box,
                y: Math.floor(Math.random() * (canvas.height / box)) * box
            };
            attempts++;
            if (attempts > maxAttempts) {
                console.warn("Nu s-a putut găsi un spațiu liber pentru spawn.");
                return snake[0]; // Failsafe, spawnează pe capul șarpelui (va fi colectat imediat)
            }
        } while (
            (avoidPlayer && snake.some(seg => seg.x === p.x && seg.y === p.y && (minDistance === 0 || Math.abs(seg.x - p.x) < minDistance * box || Math.abs(seg.y - p.y) < minDistance * box))) ||
            obstacles.some(o => o.x === p.x && o.y === p.y) ||
            (food && p.x === food.x && p.y === food.y) ||
            (special && p.x === special.x && p.y === special.y)
        );
        return p;
    }

    function newFood() { food = spawnFree(true, 3); /* Evită spawn prea aproape de șarpe */ }

    function newSpecial() {
        if (special) return; // Doar un special activ o dată (cu excepția boss-ului)
        const currentLvlData = levels[currentLevel];
        const levelSpecialsTypes = currentLvlData?.specials || specials.map(s => s.type);
        const availableSpecialsPool = specials.filter(s => levelSpecialsTypes.includes(s.type) && !s.isBoss); // Exclude boss-ul din spawn random

        // TODO: Ponderea apariției specialelor (pozitive vs negative, sau bazate pe 'focus' din shop)
        if (availableSpecialsPool.length === 0) return;
        const randomSpecialTemplate = availableSpecialsPool[Math.floor(Math.random() * availableSpecialsPool.length)];
        special = { ...randomSpecialTemplate, ...spawnFree(true, 4) }; // Copiază template-ul și adaugă coordonate
    }

    function spawnObstacle() { obstacles.push(spawnFree()); }

    function updateScore() {
        if(scoreEl) scoreEl.textContent = score;
        if (score > highScore) {
            highScore = score;
            if(highScoreEl) highScoreEl.textContent = highScore;
            // saveGameState(); // Salvează imediat high score-ul
        }
        analytics.current.score = score; // Update analytics
    }
    function updateValues() {
        if(valueEls.empatie) valueEls.empatie.textContent = values.empatie;
        if(valueEls.curaj) valueEls.curaj.textContent = values.curaj;
        if(valueEls.rabdare) valueEls.rabdare.textContent = values.rabdare;
    }
    function updateLevelDisplay() {
        if(levelDisplayEl) levelDisplayEl.textContent = currentLevel + 1;
    }

    function flash(text, duration = 1800, type = 'info') { // 'info', 'good', 'bad'
      if(!effectEl) return;
      effectEl.innerHTML = text;
      effectEl.className = 'game-effect'; // Reset classes
      if (type === 'good') effectEl.classList.add('positive');
      else if (type === 'bad') effectEl.classList.add('negative');
      // else 'info' (default)

      effectEl.style.opacity = 1;
      setTimeout(() => { if(effectEl) effectEl.style.opacity = 0; }, duration);
    }

    function changeSpeed(newSpeed) { speed = Math.max(50, Math.min(350, newSpeed)); }
    function resetSpeed() {
        speed = INITIAL_SNAKE_SPEED + (currentLevel * 5); // Viteza crește ușor cu nivelul
        activeColor = null; // Reset culoarea specială a șarpelui
    }
    function boost(factor, label) {
        mult = factor;
        activeColor = levels[currentLevel]?.snakeColor || '#ffb347'; // Folosește culoarea nivelului
        flash(label, 3000, 'good');
        // playSound('special');
        addActiveEffect(label, 3000, endBoost);
    }
    function endBoost() { mult = 1; activeColor = null; }

    function speedUpTemporary(label) { // Pentru frustrare
        const originalSpeed = speed;
        changeSpeed(speed * 0.6); // Mult mai rapid
        activeColor = '#ff3030';
        flash(label, 3000, 'bad');
        // playSound('negative');
        setTimeout(() => {
            if (speed < originalSpeed) speed = originalSpeed; // Revine doar dacă nu a fost alt efect între timp
            activeColor = null;
        }, 3000);
    }
    function slow(label) {
        const originalSpeed = speed;
        changeSpeed(speed * 1.6); // Mult mai lent
        activeColor = '#7ed957';
        flash(label, 5000, 'good');
        // playSound('special');
        addActiveEffect(label, 5000, () => {
            if (speed > originalSpeed) speed = originalSpeed;
            activeColor = null;
        });
    }

    function endNegativeEffects() {
        // Aici poți adăuga logica de a anula efectele negative specifice (invert, shrink, repel)
        effects = effects.filter(e => !e.isNegative); // Elimină din array
        statusBar.querySelectorAll('.neg-effect').forEach(el => el.remove()); // Elimină din UI
        // Reset direcție dacă era inversată, etc.
        flash("Efecte negative înlăturate!", 2000, 'good');
    }

    function invertDirection() {
        const oldDir = dir;
        if (dir === 'LEFT') dir = 'RIGHT';
        else if (dir === 'RIGHT') dir = 'LEFT';
        else if (dir === 'UP') dir = 'DOWN';
        else if (dir === 'DOWN') dir = 'UP';
        // playSound('negative');
        // Adaugă la active effects pentru UI, dar efectul e instant
    }
    function shrinkSnake() {
        const amountToShrink = Math.min(snake.length -1, 2); // Nu poate fi mai mic de 1
        for(let i=0; i<amountToShrink; i++) snake.pop();
        // playSound('negative');
    }
    function repelFood() {
        repelCountdown = Math.floor(5000 / speed); // 5 secunde de respingere
        // playSound('negative');
    }

    function addActiveEffect(name, durationMs, onEndCallback = null) {
        if(!statusBar) return 'no-status-bar-' + effectId;
        const id = 'activeEffect' + (++effectId);
        const effectData = { id, name, durationMs, timeLeftMs: durationMs, onEnd: onEndCallback, isNegative: specials.find(s=>s.type === name || t(s.type) === name)?.negative };

        const span = document.createElement('div'); // Folosim div pentru flexbox mai ușor
        span.className = 'stat-effect';
        if (effectData.isNegative) span.classList.add('neg-effect');
        span.id = id;

        const textSpan = document.createElement('span');
        textSpan.textContent = name.length > 15 ? name.substring(0,12) + "..." : name; // Scurtează numele lungi
        textSpan.title = name; // Tooltip cu numele complet

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

    function tickEffects(deltaTime) { // deltaTime în ms
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

    function spawnParticles(x, y, color, count = PARTICLE_COUNT) {
      for (let i = 0; i < count; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * box * 0.5, // Spawnează mai aproape de centru
            y: y + (Math.random() - 0.5) * box * 0.5,
            vx: (Math.random() - 0.5) * (3 + Math.random() * 2), // Viteză variabilă
            vy: (Math.random() - 0.5) * (3 + Math.random() * 2),
            alpha: 0.8 + Math.random() * 0.2, // Alpha inițial variabil
            color,
            size: 2 + Math.random() * 3, // Mărime variabilă
            decay: 0.02 + Math.random() * 0.02 // Rata de dispariție variabilă
        });
      }
    }

    // ---------- LEVEL MECHANICS (îmbunătățit) ----------
    function applyLevelMechanics() {
        if (currentLevel >= levels.length) return;
        const lvlData = levels[currentLevel];
        if (!lvlData) return;

        // Setare fundal canvas specific nivelului
        canvas.style.backgroundColor = lvlData.bgColor || '#1d2230';

        const mechanic = lvlData.mechanic;
        if (mechanic === 'slowObstacles') {
            // TODO: Implementează obstacole care se mișcă lent
            flash("Atenție la obstacolele lente!", 2000);
        } else if (mechanic === 'magnetFood') {
            magnet = true; // Acest efect persistă pentru nivel? Sau temporar?
            flash("Mâncarea este atrasă de tine!", 3000, 'good');
            addActiveEffect("Magnet Mâncare", 15000, () => magnet = false); // Durează 15s
        } else if (mechanic === 'wallPassTemp') {
            wallPass = true;
            flash("Poți trece prin ziduri temporar!", 3000, 'good');
            addActiveEffect("Trecere Ziduri", 10000, () => wallPass = false); // Durează 10s
        } else if (mechanic === 'bossCritique') {
            obstacles = []; // Curăță obstacolele
            // Spawn un "boss" - un special care nu dispare și are viață
            special = {
                ...specials.find(s => s.type === 'critic'), // Găsește template-ul criticului
                ...spawnFree(true, 5), // Spawnează-l departe
                isBoss: true,
                bossMaxHits: 3 + currentLevel, // Viața crește cu nivelul (dacă e refăcut)
                bossCurrentHits: 3 + currentLevel,
                symbol: 'BOSS 🗣️💬'
            };
            flash(`Înfruntă ${t('Critic Interior')} BOSS! Lovește-l de ${special.bossCurrentHits} ori!`, 3500, 'bad');
        }
        // Alte mecanici pot fi adăugate aici
    }

    // ---------- JOURNAL, SHOP, MINIGAMES (cu modale stilizate) ----------
    // (Funcțiile toggleJournalModal, saveJournal, exportJournal, displayJournalEntries,
    // toggleShopModal, startBreathing, startReframe, și event listeners pentru butoanele de close
    // rămân similare ca logică, dar se asigură că manipulează clasele `hidden` pe modale
    // și că pun/scot jocul din pauză corespunzător)

    function setupModal(modalElement, openBtnElement, closeBtnElement, onOpenCallback = null) {
        if (openBtnElement) {
            openBtnElement.onclick = () => {
                if (paused && !modalElement.classList.contains('hidden')) {
                    modalElement.classList.add('hidden');
                    // Nu relua jocul automat
                } else {
                    paused = true; // Pauză la deschiderea oricărui modal
                    // Ascunde alte modale dacă sunt deschise
                    [journalModal, shopModal, minigameModal].forEach(m => {
                        if (m !== modalElement) m.classList.add('hidden');
                    });
                    modalElement.classList.remove('hidden');
                    if (onOpenCallback) onOpenCallback();
                }
            };
        }
        if (closeBtnElement) {
            closeBtnElement.onclick = () => {
                modalElement.classList.add('hidden');
                // Nu relua jocul automat
                if (canvas) canvas.focus(); // Redă focusul pe joc
            };
        }
    }

    setupModal(journalModal, journalBtn, closeJournalModalBtn, () => {
        journalEntry.focus();
        viewJournalContentEl.classList.add('hidden'); // Ascunde by default
    });
    setupModal(shopModal, shopBtn, closeShopModalBtn, populateShop);
    // Minigames vor fi deschise programatic (ex. startBreathing)

    // Jurnal
    saveJournal.onclick = () => { /* ... la fel ... */ };
    exportJournal.onclick = () => { /* ... la fel, verifică `jspdf` ... */ };
    viewJournal.onclick = () => { /* ... la fel ... */ };

    // Shop
    function populateShop() {
        shopItemsEl.innerHTML = '';
        shopItemsList.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'shop-item-btn';
            let currentItemLevel = item.currentLevelFn ? item.currentLevelFn() : 0;
            let purchased = item.purchasedFn ? item.purchasedFn() : false;

            let costString = Object.entries(item.cost).map(([k, v]) => `${v} ${t(k)}`).join(', ');
            let nameString = t(item.name);

            if (item.maxLevel && currentItemLevel >= item.maxLevel) {
                btn.innerHTML = `<div>${nameString} (Max Nivel)</div><div class="shop-item-cost">${t('MaxedOut') || 'Maxed Out'}</div>`;
                btn.disabled = true;
            } else if (item.oneTimePurchase && purchased) {
                btn.innerHTML = `<div>${nameString}</div><div class="shop-item-cost">${t('purchased')}</div>`;
                btn.disabled = true;
            } else {
                 btn.innerHTML = `<div>${nameString} ${item.maxLevel ? `(Nv. ${currentItemLevel+1})` : ''}</div><div class="shop-item-cost">Cost: ${costString}</div>`;
            }

            btn.onclick = () => {
                if (btn.disabled) return;
                if (Object.entries(item.cost).every(([k, v]) => values[k] >= v)) {
                    Object.entries(item.cost).forEach(([k, v]) => values[k] -= v);
                    item.effect(); // Aceasta ar trebui să actualizeze starea (ex. shield.level++, slowMotion = true)
                    updateValues();
                    flash(`${t(item.name)} ${t('achiziționat')}!`, 2000, 'good');
                    // playSound('special');
                    populateShop(); // Re-randează shop-ul pentru a actualiza starea butoanelor
                    saveGameState(); // Salvează starea după cumpărare
                } else {
                    flash(t('InsufficientValues'), 2000, 'bad');
                }
            };
            shopItemsEl.appendChild(btn);
        });
    }


    // Minigames (startBreathing, startReframe adaptate pentru a folosi minigameModal)
    function startBreathing() { /* ... la fel, dar afișează în minigameModal și folosește minigameContentEl ... */ }
    function startReframe() { /* ... la fel ... */ }
    closeMinigameModalBtn.onclick = () => { /* ... la fel ... */ };


    // ---------- LANGUAGE (adaptat) ----------
    function setLanguage(lang) {
        language = lang;
        // Actualizează TOATE textele din UI-ul jocului
        const elementsToTranslate = {
            // Titluri
            '#snakeGameInterface h2': 'Snake – Călătoria Interioară', // Acest titlu e fix, dar altele pot fi traduse
            [journalModal.querySelector('h3')]: 'journalTitleSnake', // Exemplu dacă titlurile modale sunt dinamice
            [shopModal.querySelector('h3')]: 'shopTitle',

            // UI Principal
            [scoreEl?.parentNode.firstChild]: 'score', // Complex, trebuie verificat nodul text
            [highScoreEl?.parentNode.firstChild]: 'highScore',
            [levelDisplayEl?.parentNode.childNodes[4]]: 'level', // Foarte fragil, mai bine un span dedicat
            '#snakeControls': 'controls',
            [restartBtn]: 'restart',
            [fullResetBtn]: 'fullReset',
            [journalBtn]: 'journal',
            [shopBtn]: 'shop',
            [langBtn]: (language === 'ro' ? 'English' : 'Română'),

            // Jurnal Modal
            '#snakeJournalEntry[placeholder]': 'journalPlaceholderSnake',
            [saveJournal]: 'save',
            [exportJournal]: 'export',
            [viewJournal]: 'view',
            [closeJournalModalBtn]: 'close',
            // Shop Modal (titlu deja mapat, itemele se traduc la populare)
            [closeShopModalBtn]: 'close',
            // Minigame Modal
            [closeMinigameModalBtn]: 'close',
        };
        for (const selectorOrElement in elementsToTranslate) {
            let el;
            if (typeof selectorOrElement === 'string') {
                if (selectorOrElement.includes('[placeholder]')) {
                    el = document.querySelector(selectorOrElement.replace('[placeholder]', ''));
                    if (el) el.placeholder = t(translations.ro[elementsToTranslate[selectorOrElement]]); // Presupunem că cheia e pt RO
                } else {
                    el = document.querySelector(selectorOrElement);
                }
            } else {
                el = selectorOrElement; // Este deja un element DOM
            }

            if (el) {
                const key = elementsToTranslate[selectorOrElement];
                if (el.nodeType === Node.TEXT_NODE) { // Pentru nodurile text
                     //el.textContent = t(key) + (key === 'score' || key === 'highScore' || key === 'level' ? ': ' : ''); // Adaugă :
                } else if (el.tagName === 'BUTTON' || el.tagName === 'TEXTAREA' && !selectorOrElement.includes('[placeholder]')) {
                    el.textContent = t(key);
                } else if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE && (key === 'score' || key === 'highScore' || key ==='level')){
                     // Cazul specific pentru "Scor: ", "Maxim: ", "Nivel: "
                     // el.firstChild.textContent = t(key) + ": ";
                }
                 else {
                    // Pentru alte elemente, poate titluri
                    // el.innerHTML = t(key); // Folosește innerHTML dacă textul tradus poate conține tag-uri simple
                }
            }
        }
        // Cazuri speciale care nu se potrivesc ușor în buclă
        if(scoreEl?.parentNode?.firstChild.nodeType === Node.TEXT_NODE) scoreEl.parentNode.firstChild.textContent = t('score') + ": ";
        if(highScoreEl?.parentNode?.firstChild.nodeType === Node.TEXT_NODE) highScoreEl.parentNode.firstChild.textContent = t('highScore') + ": ";
        const levelLabel = levelDisplayEl?.parentElement?.childNodes; // Caută textul "Nivel: "
        if (levelLabel) {
            for(let node of levelLabel){
                if(node.nodeType === Node.TEXT_NODE && node.textContent.includes("Nivel")){
                    node.textContent = " " + t('level') + ": ";
                    break;
                }
            }
        }


        if(langBtn) langBtn.setAttribute('aria-label', language === 'ro' ? 'Switch to English' : 'Schimbă în Română');
        if (introEl && !introEl.classList.contains('hidden') && currentLevel < levels.length) {
             introEl.innerHTML = `<strong>${t(levels[currentLevel].theme)}</strong><br>${t(levels[currentLevel].message)}<br><small>${t('dailyQuest')}</small>`;
        }
        updateValues(); // Re-afișează valorile (Empatie, Curaj, Răbdare) traduse
        // playSound('uiClick'); // Sunet pentru schimbare limbă
    }
    if(langBtn) langBtn.onclick = () => { setLanguage(language === 'ro' ? 'en' : 'ro'); saveGameState(); };


    // ---------- ANALYTICS (la fel, dar salvează în localStorage specific jocului) ----------
    function saveAnalytics() {
        analytics.current.timeEnded = Date.now(); // Adaugă timp de final
        analytics.current.level = currentLevel;
        analytics.current.finalValues = { ...values };
        analytics.sessions.push({ ...analytics.current });
        // localStorage.setItem('snakeGameAnalyticsV2', JSON.stringify(analytics.sessions));
        console.log("Snake game analytics for session saved.");
    }
    function checkStuck() { /* ... la fel ... */ }

    // ---------- FULL RESET GAME & NEXT LEVEL SETUP (logica de progresie) ----------
    function fullResetGameToLevelZero() {
        currentLevel = 0;
        score = 0;
        values = { empatie: 0, curaj: 0, rabdare: 0 };
        shield = { level: 1, hits: 1 }; // Reset scut la starea inițială
        slowMotion = false;
        clarityMap = false;
        // Nu reseta highScore aici, e global pentru joc
        // Nu reseta analytics.sessions, doar curentul
        // Nu reseta journalEntries sau language
        // playSound('uiClick');
        nextLevelSetup(true); // true pentru reset inițial/complet
        saveGameState(); // Salvează starea resetată (fără progres)
    }

    function nextLevelSetup(isInitialOrFullReset = false) {
        snake = [{ x: Math.floor(canvas.width / box / 2) * box, y: Math.floor(canvas.height / box / 2) * box }]; // Start în centru
        dir = ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)]; // Direcție aleatorie la startul nivelului

        if (!isInitialOrFullReset) { // Dacă e trecere la nivel nou, nu reset de la zero
            // Păstrează scorul și valorile
            // playSound('levelUp');
        } else { // Dacă e reset inițial sau full reset
            if (currentLevel > 0 && !isInitialOrFullReset) {
                // Dacă e un reset de nivel (nu full), nu reseta scorul/valorile
            } else {
                 score = 0; // Doar la full reset sau primul start absolut
                 values = { empatie: 0, curaj: 0, rabdare: 0 };
                 shield = { level: 1, hits: 1 };
                 slowMotion = false;
                 clarityMap = false;
            }
        }


        mult = 1;
        speed = INITIAL_SNAKE_SPEED - (currentLevel * 3); // Viteza crește ușor cu nivelul, dar nu prea mult
        speed = Math.max(80, speed); // Limită inferioară viteză
        wallPass = magnet = false;
        shield.hits = shield.level;

        activeColor = null;
        over = false;
        paused = isInitialOrFullReset ? false : true; // Pauză pentru intro între nivele

        special = null;
        effects = [];
        particles = [];
        obstacles = [];
        if (statusBar) statusBar.innerHTML = '';

        collected = { curaj: 0, rabdare: 0, empatie: 0, acceptare: 0, frustrare: 0, motivatie: 0, critic: 0, abandon: 0, izolare: 0, adult: 0, copil: 0 };
        analytics.current = { scoreAtLevelStart: score, valuesAtLevelStart: { ...values }, obstacles: [], timeLevelStart: Date.now() };

        updateScore();
        updateValues();
        updateLevelDisplay();
        newFood();
        if (Math.random() < 0.2) newSpecial();

        if(restartBtn) restartBtn.classList.add('hidden');

        if (currentLevel < levels.length) {
            const currentLvlData = levels[currentLevel];
            if(introEl) {
                introEl.innerHTML = `
                    <strong class="text-base sm:text-lg">${t('level')} ${currentLevel + 1}: ${t(currentLvlData.theme)}</strong><br>
                    <span class="text-xs sm:text-sm">${t(currentLvlData.message)}</span><br>
                    <em class="text-xs text-gray-400">${t('dailyQuest')}</em>`;
                introEl.classList.remove('hidden');
            }

            setTimeout(() => {
                if(introEl) introEl.classList.add('hidden');
                paused = false;
                applyLevelMechanics();
                if (gameVisibleAndActive && !over && !paused) {
                     lastTime = performance.now();
                     requestAnimationFrame(gameLoop);
                }
            }, isInitialOrFullReset ? 100 : 3500);

            obstacles = [];
            for (let i = 0; i < (currentLvlData.obstacles || 0); i++) spawnObstacle();
        } else {
            if(introEl) {
                introEl.innerHTML = `<strong class="text-lg">${t('Felicitări!')}</strong><br><span class="text-sm">${t('Ai finalizat Călătoria Interioară!')}</span><br><em class="text-xs">${t('Poți continua explorarea sau reseta jocul.')}</em>`;
                introEl.classList.remove('hidden');
                paused = true; // Lasă pe pauză la final
            }
            // Mod "endless" ar putea începe aici, sau opțiune de fullReset.
        }
        if (!isInitialOrFullReset) {
            lastTime = performance.now();
        }
        // saveGameState(); // Salvează starea la începutul fiecărui nivel
    }


    // ---------- DRAW (cu îmbunătățiri vizuale) ----------
    function draw() {
        if (!ctx || !canvas) return;
        const currentLvlData = levels[currentLevel] || levels[levels.length-1]; // Folosește ultimul nivel dacă depășim
        const baseBg = currentLvlData.bgColor || 'rgba(29, 34, 48, 0.5)'; // #1d2230
        const snakeHeadColor = activeColor || (shield.hits > 0 ? '#FFACE4' : (currentLvlData.snakeColor || '#36a26b')); // Roz pentru scut, apoi culoarea nivelului
        const snakeBodyColor = shield.hits > 0 ? '#FFD1F0' : (currentLvlData.snakeColor ? chroma(currentLvlData.snakeColor).darken(0.5).hex() : '#88dab2');

        // Gradient subtil pentru fundal
        const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 1.5);
        try {
            gradient.addColorStop(0, chroma(baseBg).brighten(0.3).alpha(0.8).css());
            gradient.addColorStop(1, chroma(baseBg).alpha(0.9).css());
        } catch (e) { // Fallback dacă chroma nu e disponibil sau e eroare
             gradient.addColorStop(0, baseBg);
             gradient.addColorStop(1, baseBg);
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Desenare șarpe cu cap distinct și corp
        snake.forEach((seg, i) => {
            ctx.beginPath();
            if (i === 0) { // Capul
                ctx.fillStyle = snakeHeadColor;
                // Desenăm un cerc pentru cap sau un dreptunghi mai rotunjit
                ctx.arc(seg.x + box / 2, seg.y + box / 2, box / 2, 0, 2 * Math.PI);
                ctx.fill();
                // Ochi (simpli)
                ctx.fillStyle = 'white';
                let eyeOffsetX = dir === 'LEFT' ? -box/4 : (dir === 'RIGHT' ? box/4 : 0);
                let eyeOffsetY = dir === 'UP' ? -box/4 : (dir === 'DOWN' ? box/4 : 0);
                if (dir === 'LEFT' || dir === 'RIGHT') { // Ochi laterali
                    ctx.fillRect(seg.x + box/2 + eyeOffsetX - 1, seg.y + box/4 -1, 2, 2);
                    ctx.fillRect(seg.x + box/2 + eyeOffsetX - 1, seg.y + box*0.75 -1 -1, 2, 2); // -1 pt pupilă
                } else { // Ochi sus/jos
                     ctx.fillRect(seg.x + box/4 -1, seg.y + box/2 + eyeOffsetY -1, 2, 2);
                     ctx.fillRect(seg.x + box*0.75 -1 -1, seg.y + box/2 + eyeOffsetY -1, 2, 2);
                }
            } else { // Corpul
                ctx.fillStyle = snakeBodyColor;
                // Dreptunghiuri rotunjite pentru corp
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
            // Bordură subtilă pentru definire
            ctx.strokeStyle = chroma(ctx.fillStyle).darken(1.5).hex();
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        if(food) { /* ... la fel ... */ }
        if (special) { /* ... la fel ... */ }
        obstacles.forEach(o => { /* ... la fel ... */ });
        particles.forEach(p => { /* ... la fel, folosește p.size și p.decay ... */
            ctx.fillStyle = chroma(p.color).alpha(p.alpha).css();
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
        });
        particles = particles.filter(p => p.alpha > 0);
    }


    // ---------- GAME LOOP (cu deltaTime pentru tickEffects) ----------
    let previousTimestamp = 0;
    function gameLoop(timestamp) {
        const deltaTime = timestamp - previousTimestamp;
        previousTimestamp = timestamp;

        if (!gameVisibleAndActive || over) { // Scoatem `paused` de aici, vrem să desenăm dacă e pauză
             if(gameVisibleAndActive && !over && paused) draw(); // Desenează starea de pauză
            return requestAnimationFrame(gameLoop);
        }
        if(paused) { // Dacă e pauză, doar desenează și cere următorul frame
            draw();
            return requestAnimationFrame(gameLoop);
        }


        if (timestamp - lastTime >= speed) {
            update();
            lastTime = timestamp;
        }
        tickEffects(deltaTime); // Actualizează efectele active
        draw();
        requestAnimationFrame(gameLoop);
    }

    // ---------- UPDATE (cu logica de progresie între nivele) ----------
    function update() {
        if (over || paused) return;
        // ... (logica de mișcare, coliziuni, colectare - similară, dar acum `level` se numește `currentLevel`) ...

        const head = { x: snake[0].x, y: snake[0].y };
        // ... (logica de mișcare cap) ...
        if (dir === 'LEFT') head.x -= box;
        else if (dir === 'RIGHT') head.x += box;
        else if (dir === 'UP') head.y -= box;
        else if (dir === 'DOWN') head.y += box;

        // Magnet și Repel (rămân similare)
        // ...

        // Wall Pass și Coliziuni cu pereții (rămân similare)
        // ...
        if (wallPass) { /* ... */ }
        else if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) return gameOver('wall');


        // Coliziune cu propriul corp (rămâne similară)
        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) return gameOver('self');
        }
        // Coliziune cu obstacole (rămâne similară)
        for (let o of obstacles) {
            if (head.x === o.x && head.y === o.y) return gameOver('obstacle');
        }


        // Colectare mâncare
        if (food && head.x === food.x && head.y === food.y) {
            score += mult;
            updateScore();
            newFood();
            spawnParticles(food.x + box / 2, food.y + box / 2, '#34D399');
            // playSound('collect');
            navigator.vibrate?.(50);
            // Crește șansa de special dacă nu e deja unul pe hartă
            if (!special && Math.random() < (0.25 + currentLevel * 0.03) ) newSpecial();
        } else {
            snake.pop();
        }

        // Colectare special
        if (special && head.x === special.x && head.y === special.y) {
            const sp = { ...special }; // Copiază specialul pentru procesare
            special = null; // Consumă-l de pe hartă

            if (sp.isBoss) {
                sp.bossCurrentHits--;
                flash(`Lovitură Critic BOSS! Rămase: ${sp.bossCurrentHits}`, 2000, sp.bossCurrentHits > 0 ? 'bad' : 'good');
                // playSound(sp.bossCurrentHits > 0 ? 'negative' : 'levelUp');
                if (sp.bossCurrentHits <= 0) {
                    flash(`${t('CRITICUL INTERIOR')} ÎNVINS!`, 3000, 'good');
                    score += 50 + currentLevel * 10; // Bonus mai mare
                    updateScore();
                    // Aici se trece la nivelul următor sau se termină jocul
                    currentLevel++;
                    setTimeout(() => nextLevelSetup(false), 2500);
                } else {
                    // Repoziționează boss-ul sau adaugă o mecanică (ex. devine mai rapid)
                    special = { ...sp, ...spawnFree(true, 6) }; // Îl punem înapoi, dar în alt loc
                }
            } else if (sp.negative && shield.hits > 0) {
                shield.hits--;
                flash(t('shieldProtect') + ` (${shield.hits} ${shield.hits === 1 ? 'lovitură' : 'lovituri'})`, 2000, 'good');
                spawnParticles(sp.x + box/2, sp.y + box/2, '#FFFFFF', 15);
                // playSound('special'); // Sunet de scut activat
            } else {
                if (sp.type) collected[sp.type] = (collected[sp.type] || 0) + 1;
                analytics.current.obstacles.push(sp.type); // Salvează în analytics-ul nivelului
                if (sp.valueType && values.hasOwnProperty(sp.valueType)) {
                    values[sp.valueType] += sp.points || 1;
                }
                if (sp.effect) sp.effect(); // Aplică efectul (boost, slow etc.) care adaugă la `activeEffects`

                spawnParticles(sp.x + box / 2, sp.y + box / 2, sp.color, 12);
                navigator.vibrate?.(100);
                // playSound(sp.negative ? 'negative' : 'special');

                if (sp.type === 'critic' && !sp.isBoss) {
                    // playSound('uiInteraction'); // Sunet pentru deschidere minijoc
                    startReframe();
                }
            }
            updateValues();
            checkStuck();
        }
        snake.unshift(head);


        // Trecere la nivelul următor (dacă nu e nivel de boss care gestionează asta)
        const levelData = levels[currentLevel];
        if (levelData && !levelData.mechanic?.includes('boss')) { // Nu trece automat dacă e nivel de boss
            const scoreNeededForNextLevel = (currentLevel + 1) * LEVEL_SCORE_INCREMENT + (currentLevel * 5); // Scorul necesar crește
            if (currentLevel < levels.length - 1 && score >= scoreNeededForNextLevel) {
                currentLevel++;
                flash(`${t('Nivelul')} ${currentLevel + 1}: ${t(levels[currentLevel].theme)} atins!`, 3000, 'good');
                // playSound('levelUp');
                saveGameState(); // Salvează progresul la trecerea de nivel
                setTimeout(() => nextLevelSetup(false), 2500);
            }
        }
    }

    // ---------- GAME OVER (cu detalii) ----------
    function gameOver(reason = 'unknown') {
        if (over) return;
        over = true;
        paused = true;
        // playSound('gameOver');
        saveGameState(); // Salvează starea finală
        saveAnalytics(); // Salvează datele sesiunii de joc

        let reasonText = '';
        if (reason === 'wall') reasonText = 'Ai lovit un perete.';
        else if (reason === 'self') reasonText = 'Te-ai auto-colizionat.';
        else if (reason === 'obstacle') reasonText = 'Ai lovit un obstacol.';

        let raport = `<strong class="text-lg">${t('emotionalSummary')} (${reasonText})</strong><br>`;
        // ... (restul raportului, similar)
        flash(raport, 7000, 'bad');

        if(restartBtn) restartBtn.classList.remove('hidden');
        if(fullResetBtn) fullResetBtn.classList.remove('hidden'); // Afișează și butonul de reset complet
    }


    // ---------- CONTROLS (cu preventDefault și adaptat pentru modal) ----------
    function handleKeyDown(e) {
        const isInputFocused = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
        if (isInputFocused && (e.key !== 'Escape')) return; // Nu interfera cu input-ul din modale (ex. jurnal)

        // Prevenire scroll pentru tastele relevante dacă jocul e activ și nu e într-un modal de input
        const relevantKeysForPrevent = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'p', 'j', 'm', 'r'];
        if (gameVisibleAndActive && !over && relevantKeysForPrevent.includes(e.key.toLowerCase())) {
             // Verificare suplimentară dacă un modal al jocului e deschis, dar nu e cel de input text
            const isActionModalOpen = !journalModal.classList.contains('hidden') ||
                                     !shopModal.classList.contains('hidden') ||
                                     !minigameModal.classList.contains('hidden');
            if (!isInputFocused || !isActionModalOpen) { // Previne scroll dacă nu scriem în jurnal
                e.preventDefault();
            }
        }
         if (e.key === 'Escape') { // Escape închide orice modal deschis al jocului
            if (!journalModal.classList.contains('hidden')) { closeJournalModalBtn.click(); return; }
            if (!shopModal.classList.contains('hidden')) { closeShopModalBtn.click(); return; }
            if (!minigameModal.classList.contains('hidden')) { closeMinigameModalBtn.click(); return; }
            // Dacă niciun modal nu e deschis și jocul e activ, Escape poate pune pauză
            else if (gameVisibleAndActive && !over) {
                paused = !paused;
                flash(paused ? "Joc în Pauză" : "Joc Reluat", 1500);
                if(!paused) { lastTime = performance.now(); requestAnimationFrame(gameLoop); }
                return;
            }
        }


        if (!gameVisibleAndActive || over || breathingActive) return;
        const k = e.key.toLowerCase();

        // ... (restul logicii pentru ' ', 'p', 'j', 'm', 'r' - similară, dar asigură că apelează funcțiile de toggle modal)
        if (k === ' ' || k === 'p') { /* ... toggle pauză ... */ }
        if (k === 'j') { journalBtn.click(); return; }
        if (k === 'm') { shopBtn.click(); return; }
        if (k === 'r' && slowMotion && !breathingActive) { /* ... startBreathing() ... */ }


        if (paused && !(k === ' ' || k === 'p')) return; // Doar Space/P funcționează pe pauză (pe lângă modale)


        if ((k === 'arrowleft' || k === 'a') && dir !== 'RIGHT') dir = 'LEFT';
        else if ((k === 'arrowup' || k === 'w') && dir !== 'DOWN') dir = 'UP';
        else if ((k === 'arrowright' || k === 'd') && dir !== 'LEFT') dir = 'RIGHT';
        else if ((k === 'arrowdown' || k === 's') && dir !== 'UP') dir = 'DOWN';
    }
    document.addEventListener('keydown', handleKeyDown);
    // Touch controls (rămân similare, dar adaugă `passive: false` pentru a permite `preventDefault`)


    // Atașare event listeners pentru butoanele din joc
    if(restartBtn) restartBtn.onclick = () => { nextLevelSetup(false); saveGameState(); /*playSound('uiClick');*/ };
    if(fullResetBtn) fullResetBtn.onclick = () => {
        if (confirm(t('Ești sigur că vrei să resetezi tot progresul jocului?'))) {
            fullResetGameToLevelZero();
            // playSound('uiClick');
        }
    };
    // journalBtn, shopBtn sunt gestionate de `setupModal`

    // ---------- INITIALIZE SCRIPT ----------
    setLanguage(language); // Setează limba încărcată
    nextLevelSetup(true); // Inițializează primul nivel (sau cel salvat)

    gameInitialized = true;
    console.log("Instanța jocului Snake a fost inițializată și îmbunătățită.");

    gameInstance = {
        pause: () => { /* ... similar ... */ },
        resume: () => { /* ... similar ... */ },
        resetCurrentLevel: () => nextLevelSetup(false),
        fullReset: fullResetGameToLevelZero,
        isPaused: () => paused,
        isOver: () => over,
        setGameVisibility: (isVisible) => {
            const oldVisibility = gameVisibleAndActive;
            gameVisibleAndActive = isVisible;
            if (isVisible && !oldVisibility && !over) { // Dacă devine vizibil și nu era, și nu e game over
                console.log("Game visibility ON, resuming/starting game loop.");
                paused = false; // Asigură că nu e pe pauză la revenire
                lastTime = performance.now();
                requestAnimationFrame(gameLoop);
                if(canvas) canvas.focus();
            } else if (!isVisible && oldVisibility && !paused) {
                console.log("Game visibility OFF, pausing game.");
                paused = true;
            }
        },
        cleanup: () => {
            document.removeEventListener('keydown', handleKeyDown);
            // window.removeEventListener('resize', resizeCanvas);
            gameInitialized = false;
            gameInstance = null;
            console.log("Snake game instance cleaned up.");
        }
    };
    return gameInstance;
}

// --- GESTIONARE MODAL ȘI PORNIRE JOC ---
document.addEventListener('DOMContentLoaded', () => {
    const launchModalBtn = document.getElementById('launchGameModalButton'); // Presupunând că acesta e ID-ul din psihoterapie.html
    snakeGameModalContainer = document.getElementById('snakeGameModalContainer');
    closeSnakeGameModalButton = document.getElementById('closeSnakeGameModal'); // Definit în gameModalHTMLStructure
    snakeGameWrapper = document.getElementById('snakeGameWrapper'); // Definit în gameModalHTMLStructure


    if (launchModalBtn && snakeGameModalContainer) {
        launchModalBtn.addEventListener('click', () => {
            if (!snakeGameModalContainer.querySelector('#snakeGameInterface')) { // Injectează doar dacă nu există deja
                 if (snakeGameWrapper) snakeGameWrapper.innerHTML = ''; // Golește wrapper-ul intern
                 else { // Dacă snakeGameWrapper nu e găsit (caz improbabil dacă gameModalHTMLStructure e corect)
                    snakeGameModalContainer.querySelector('#snakeGameModalContent').innerHTML = `<div id="snakeGameWrapper" class="game-wrapper h-full w-full flex-grow" style="display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #222c36; border-radius: 0.5rem;"></div>`;
                    snakeGameWrapper = snakeGameModalContainer.querySelector('#snakeGameWrapper');
                 }
            }

            if (!gameInitialized) {
                gameInstance = initializeSnakeGame();
            }

            if (gameInstance) {
                snakeGameModalContainer.style.display = 'flex';
                // Este posibil ca resizeCanvas să trebuiască apelat aici DUPĂ ce modalul e vizibil
                const tempCanvas = document.getElementById('snakeCanvas');
                if(tempCanvas && typeof resizeCanvas === 'function') { // resizeCanvas e definit in initializeSnakeGame
                    // Nu putem apela direct resizeCanvas de aici fără a-l expune.
                    // O soluție e ca initializeSnakeGame să-l apeleze după ce canvas e creat și părintele e vizibil.
                    // Sau, mai simplu, setează o dimensiune fixă/procentuală bună pentru canvas în CSS.
                }

                gameInstance.setGameVisibility(true);
                if (gameInstance.isOver()) { // Dacă era game over, resetează nivelul curent
                    gameInstance.resetCurrentLevel();
                } else if (gameInstance.isPaused()){ // Dacă era doar pe pauză, reia
                    gameInstance.resume();
                }
                const activeCanvas = document.getElementById('snakeCanvas');
                if(activeCanvas) setTimeout(() => activeCanvas.focus(), 50);
            }
        });
    }

    if (closeSnakeGameModalButton) { // Acum este în interiorul gameModalHTMLStructure
         // Event listener-ul va fi atașat când gameModalHTMLStructure e injectat,
         // sau trebuie delegat de pe un părinte static.
         // Pentru simplitate, îl atașăm după ce știm că modalul e în DOM.
         // Acest listener ar trebui să fie în `initializeSnakeGame` dacă butonul e creat dinamic.
         // SAU, dacă snakeGameModalContainer e mereu în DOM (doar display:none):
        document.addEventListener('click', function(event) { // Delegare
            if (event.target && event.target.id === 'closeSnakeGameModal') {
                if(snakeGameModalContainer) snakeGameModalContainer.style.display = 'none';
                if (gameInstance) {
                    gameInstance.setGameVisibility(false);
                }
            }
        });
    }
});

// --- CSS PENTRU MODALE ȘI ELEMENTE SPECIFICE JOCULUI (adăugat direct aici pentru simplitate) ---
// Ideal, acest CSS ar fi într-un fișier separat și încărcat în psihoterapie.html
const gameStyles = `
    .modal-overlay { position: fixed; inset: 0; background-color: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .modal-content { background-color: #2d3748; /* gray-800 */ color: #e2e8f0; /* gray-200 */ padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 100%; max-width: 500px; max-height: 90vh; display: flex; flex-direction: column; }
    .modal-title { font-size: 1.25rem; font-weight: 600; color: #facc15; /* yellow-400 */ margin-bottom: 1rem; text-align: center; }
    .modal-textarea { width: 100%; padding: 0.75rem; background-color: #4a5568; /* gray-600 */ border-radius: 0.375rem; border: 1px solid #718096; /* gray-500 */ color: white; min-height: 80px; margin-bottom: 1rem; }
    .modal-textarea:focus { outline: none; border-color: #63b3ed; /* blue-400 */ box-shadow: 0 0 0 2px rgba(99, 179, 237, 0.5); }
    .modal-scroll-content { background-color: #4a5568; padding: 0.75rem; border-radius: 0.375rem; margin-top: 0.75rem; max-height: 200px; overflow-y: auto; font-size: 0.875rem; }
    .modal-scroll-content div { padding-bottom: 0.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #718096; }
    .modal-scroll-content div:last-child { border-bottom: none; margin-bottom: 0; }
    .modal-actions { margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: flex-end; }
    .modal-btn-primary { background-color: #38a169; /* green-600 */ } .modal-btn-primary:hover { background-color: #2f855a; /* green-700 */ }
    .modal-btn-secondary { background-color: #ecc94b; /* yellow-500 */ color: #2d3748; } .modal-btn-secondary:hover { background-color: #d69e2e; /* yellow-600 */ }
    .modal-btn-neutral { background-color: #718096; /* gray-500 */ } .modal-btn-neutral:hover { background-color: #4a5568; /* gray-600 */ }
    .modal-btn-danger { background-color: #e53e3e; /* red-600 */ } .modal-btn-danger:hover { background-color: #c53030; /* red-700 */ }
    .modal-actions button { color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; transition: background-color 0.2s; }
    .shop-item-btn { width: 100%; text-align: left; padding: 0.75rem 1rem; background-color: #4299e1; /* blue-500 */ color: white; border-radius: 0.375rem; margin-bottom: 0.5rem; transition: background-color 0.2s; }
    .shop-item-btn:hover { background-color: #3182ce; /* blue-600 */ }
    .shop-item-btn:disabled { opacity: 0.6; cursor: not-allowed; background-color: #718096; }
    .shop-item-cost { font-size: 0.75rem; color: #a0aec0; /* gray-400 */ margin-top: 0.25rem; }
    .game-effect { position: absolute; left: 50%; top: 20%; transform: translate(-50%, -50%); font-size: 1.5rem; sm:font-size: 1.9rem; font-weight: bold; color: #ffe166; text-shadow: 1px 1px 3px #000; pointer-events: none; opacity: 0; transition: opacity 0.7s ease-out, transform 0.7s ease-out; z-index: 100; padding: 0.5rem 1rem; background-color: rgba(0,0,0,0.5); border-radius: 0.5rem;}
    .game-effect.positive { color: #68d391; /* green-400 */ }
    .game-effect.negative { color: #fc8181; /* red-400 */ }
    .stat-effect { display: flex; flex-direction: column; align-items: center; background-color: rgba(0,0,0,0.4); padding: 2px 5px; border-radius: 4px; margin: 0 2px; font-size: 0.7rem; color: #cbd5e1; min-width: 60px; text-align:center; }
    .stat-effect.neg-effect span:first-child { color: #fc8181; }
    .effect-bar-container { width: 100%; height: 4px; background-color: rgba(255,255,255,0.2); border-radius: 2px; margin-top: 2px; overflow: hidden;}
    .effect-bar { height: 100%; background-color: #68d391; /* green-400 */ border-radius: 2px; transition: width 0.15s linear; }
    .stat-effect.neg-effect .effect-bar { background-color: #fc8181; }
`;
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = gameStyles;
document.head.appendChild(styleSheet);

// Adaugă Chroma.js dacă vrei culori mai avansate (opțional)
// <script src="https://cdnjs.cloudflare.com/ajax/libs/chroma-js/2.1.2/chroma.min.js"></script>
// Verifică dacă Chroma este disponibil înainte de a-l folosi: if (typeof chroma !== 'undefined') { ... }


// Funcție apelată din psihoterapie.js când tab-ul "materiale" este activat sau dezactivat
export function handleGameVisibility(isVisible) {
    const modalIsOpen = snakeGameModalContainer && snakeGameModalContainer.style.display === 'flex';
    if (gameInstance && typeof gameInstance.setGameVisibility === 'function') {
        gameInstance.setGameVisibility(isVisible && modalIsOpen);
        if (isVisible && modalIsOpen && (gameInstance.isOver() || gameInstance.isPaused())) {
            const gameCanvas = document.getElementById('snakeCanvas');
            if(gameCanvas) setTimeout(() => gameCanvas.focus(), 50); // Dă focus după ce modalul e sigur vizibil
        }
    } else if (isVisible && !gameInitialized && modalIsOpen) {
        // Dacă tab-ul e vizibil, modalul e deschis, dar jocul nu e inițializat
        console.log("Tab materiale activ, modal joc deschis. Se inițializează jocul.");
        gameInstance = initializeSnakeGame();
        if(gameInstance) gameInstance.setGameVisibility(true);
    }
}

window.addEventListener('beforeunload', () => {
    if (gameInstance && gameInitialized && !gameInstance.isOver()) {
        saveGameState(); // Salvează starea curentă la părăsirea paginii
        console.log("Progresul jocului Snake a fost salvat la părăsirea paginii.");
    }
    if (gameInstance && typeof gameInstance.cleanup === 'function') {
        // gameInstance.cleanup(); // Curăță resurse dacă e necesar
    }
});