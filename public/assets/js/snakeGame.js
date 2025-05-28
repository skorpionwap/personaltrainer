// --- assets/js/snakeGame.js ---

// Variabile la nivel de modul
let gameInstance = null;
let gameInitialized = false;
let gameVisibleAndActive = false;
let isCanvasReadyForGame = false;

// Elemente DOM
let snakeGameModalContainer;
let snakeGameWrapper;
let closeSnakeGameModalButton;
let canvas;
let ctx;
const box = 20; // Dimensiune celulă

// Configurație
const INITIAL_SNAKE_SPEED = 170;
const LEVEL_SCORE_INCREMENT = 25;
const PARTICLE_COUNT = 8;

// Structura HTML a modalului jocului
const gameModalHTMLStructure = `
    <div id="snakeGameModalContent" class="bg-gray-900 p-1 sm:p-2 rounded-lg shadow-xl relative w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto" style="aspect-ratio: 4/3.5; display: flex; flex-direction: column;">
        <button id="closeSnakeGameModal" class="absolute top-1 right-1 text-white bg-red-600 hover:bg-red-700 rounded-full p-0 w-7 h-7 flex items-center justify-center text-sm z-50" title="Închide Jocul">×</button>
        <div id="snakeGameWrapper" class="game-wrapper h-full w-full flex-grow" style="display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #222c36; border-radius: 0.5rem;">
        </div>
    </div>
`;

// Structura HTML a interfeței jocului
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

// Stare joc
let snake, dir, food, score, mult, speed, highScore, currentLevel;
let paused, over, wallPass, magnet, shield;
let activeColor, special, effects, effectId, particles, obstacles;
let values, collected, analytics;
let lastTime, repelCountdown, journalEntries, language;
let slowMotion, clarityMap, breathingActive;

// Elemente DOM specifice
let scoreEl, highScoreEl, levelDisplayEl, effectEl, statusBar, restartBtn, fullResetBtn, introEl;
let journalBtn, journalModal, journalEntry, saveJournal, exportJournal, viewJournal, closeJournalModalBtn, viewJournalContentEl;
let shopBtn, shopModal, shopItemsEl, closeShopModalBtn;
let minigameModal, minigameContentEl, closeMinigameModalBtn, langBtn, controlsEl;
let valueEls = {};

function resizeCanvas() {
    const parentInterface = canvas?.parentElement;
    const gameModalContent = document.getElementById('snakeGameModalContent');

    if (!parentInterface || !gameModalContent) {
        console.warn("Nu s-a putut redimensiona canvas-ul: #snakeGameInterface sau #snakeGameModalContent lipsesc.");
        canvas.width = box * 10; canvas.height = box * 10;
        return;
    }

    const interfacePaddingLeft = parseInt(getComputedStyle(parentInterface).paddingLeft) || 0;
    const interfacePaddingRight = parseInt(getComputedStyle(parentInterface).paddingRight) || 0;
    const availableWidth = parentInterface.clientWidth - interfacePaddingLeft - interfacePaddingRight - 5;

    let nonCanvasHeight = interfacePaddingTop + interfacePaddingBottom + 5;
    const uiElementsToMeasure = [
        parentInterface.querySelector('h2'), parentInterface.querySelector('.score'),
        parentInterface.querySelector('.values'), parentInterface.querySelector('#snakeIntro:not(.hidden)'),
        parentInterface.querySelector('#snakeStatus'), parentInterface.querySelector('#snakeControls'),
        parentInterface.querySelector('.flex.gap-1.justify-center.mt-auto.flex-wrap')
    ];
    uiElementsToMeasure.forEach(el => {
        if (el) {
            nonCanvasHeight += el.offsetHeight + (parseInt(getComputedStyle(el).marginTop) || 0) + (parseInt(getComputedStyle(el).marginBottom) || 0);
        }
    });

    const availableHeight = parentInterface.clientHeight - nonCanvasHeight;

    if (availableWidth <= 0 || availableHeight <= 0) {
        console.warn(`Dimensiuni disponibile pentru canvas <= 0. W: ${availableWidth}, H: ${availableHeight}.`);
        canvas.width = box * 10; canvas.height = box * 10;
        return;
    }

    const newSizeBase = Math.min(availableWidth, availableHeight);
    canvas.width = Math.floor(newSizeBase / box) * box;
    canvas.height = Math.floor(newSizeBase / box) * box;
    console.log(`Canvas resized to: ${canvas.width}x${canvas.height}`);
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
    canvas.width = box * 10;
    canvas.height = box * 10;
    isCanvasReadyForGame = false;

    // Inițializare elemente DOM
    scoreEl = document.getElementById('snakeScore');
    highScoreEl = document.getElementById('snakeHighScore');
    levelDisplayEl = document.getElementById('snakeLevelDisplay');
    effectEl = document.getElementById('snakeEffect');
    statusBar = document.getElementById('snakeStatus');
    restartBtn = document.getElementById('snakeRestartBtn');
    fullResetBtn = document.getElementById('snakeFullResetBtn');
    introEl = document.getElementById('snakeIntro');
    journalBtn = document.getElementById('snakeJournalBtn');
    journalModal = document.getElementById('snakeJournalModal');
    journalEntry = document.getElementById('snakeJournalEntry');
    saveJournal = document.getElementById('snakeSaveJournal');
    exportJournal = document.getElementById('snakeExportJournal');
    viewJournal = document.getElementById('snakeViewJournal');
    closeJournalModalBtn = document.getElementById('snakeCloseJournalModal');
    viewJournalContentEl = document.getElementById('snakeViewJournalContent');
    shopBtn = document.getElementById('snakeShopBtn');
    shopModal = document.getElementById('snakeShopModal');
    shopItemsEl = document.getElementById('snakeShopItems');
    closeShopModalBtn = document.getElementById('snakeCloseShopModal');
    minigameModal = document.getElementById('snakeMinigameModal');
    minigameContentEl = document.getElementById('snakeMinigameContent');
    closeMinigameModalBtn = document.getElementById('snakeCloseMinigameModal');
    langBtn = document.getElementById('snakeLangBtn');
    controlsEl = document.getElementById('snakeControls');
    valueEls = { empatie: document.getElementById('snakeEmpatie'), curaj: document.getElementById('snakeCuraj'), rabdare: document.getElementById('snakeRabdare') };

    // Încarcă starea jocului
    loadGameState();

    // Funcții helper (simplificate pentru claritate)
    function loadGameState() {
        highScore = parseInt(localStorage.getItem('snakeGameHighScoreV2')) || 0;
        currentLevel = parseInt(localStorage.getItem('snakeGameCurrentLevelV2')) || 0;
        score = parseInt(localStorage.getItem('snakeGameScoreV2')) || 0;
        values = JSON.parse(localStorage.getItem('snakeGameValuesV2')) || { empatie: 0, curaj: 0, rabdare: 0 };
        shield = JSON.parse(localStorage.getItem('snakeGameShieldV2')) || { level: 1, hits: 1 };
        slowMotion = JSON.parse(localStorage.getItem('snakeGameSlowMotionV2')) || false;
        clarityMap = JSON.parse(localStorage.getItem('snakeGameClarityMapV2')) || false;
        journalEntries = JSON.parse(localStorage.getItem('snakeGameJournalV2')) || [];
        analytics = { sessions: JSON.parse(localStorage.getItem('snakeGameAnalyticsV2')) || [], current: {} };
        language = localStorage.getItem('snakeGameLanguageV2') || 'ro';
        if (highScoreEl) highScoreEl.textContent = highScore;
    }

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
    }

    const translations = { ro: { /* [translations from original] */ }, en: { /* [translations from original] */ } };
    const levels = [ /* [levels from original] */ ];
    const specials = [ /* [specials from original] */ ];
    const shopItemsList = [ /* [shopItemsList from original] */ ];

    function t(key) { return translations[language]?.[key] || translations['ro']?.[key] || key; }
    function spawnFree(avoidPlayer = true, minDistance = 0) { /* [simplified logic] */ return { x: 0, y: 0 }; }
    function newFood() { food = spawnFree(true, 3); }
    function newSpecial() { /* [simplified logic] */ }
    function spawnObstacle() { obstacles.push(spawnFree()); }
    function updateScore() { if (scoreEl) scoreEl.textContent = score; if (score > highScore && highScoreEl) highScoreEl.textContent = highScore; }
    function updateValues() { for (let k in valueEls) if (valueEls[k]) valueEls[k].textContent = values[k] || 0; }
    function updateLevelDisplay() { if (levelDisplayEl) levelDisplayEl.textContent = currentLevel + 1; }
    function flash(text, duration = 1800, type = 'info') { if (effectEl) { effectEl.innerHTML = text; effectEl.style.opacity = 1; setTimeout(() => effectEl.style.opacity = 0, duration); } }
    function changeSpeed(newSpeed) { speed = Math.max(50, Math.min(350, newSpeed)); }
    function resetSpeed() { speed = INITIAL_SNAKE_SPEED + (currentLevel * 5); activeColor = null; }
    function boost(factor, label) { mult = factor; activeColor = '#ffb347'; flash(label, 3000, 'good'); }
    function endBoost() { mult = 1; activeColor = null; }
    function gameOver() { over = true; paused = true; flash("Game Over", 3000, 'bad'); if (restartBtn) restartBtn.classList.remove('hidden'); }

    function draw() {
        if (!ctx || !canvas || !snake) return;
        ctx.fillStyle = '#1d2230';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        snake.forEach((seg, i) => {
            ctx.fillStyle = i === 0 ? '#36a26b' : '#88dab2';
            ctx.fillRect(seg.x, seg.y, box, box);
        });
        if (food) {
            ctx.fillStyle = '#FF6B6B';
            ctx.fillRect(food.x, food.y, box, box);
        }
    }

    let previousTimestamp = 0;
    function gameLoop(timestamp) {
        const deltaTime = timestamp - previousTimestamp;
        previousTimestamp = timestamp;
        if (!gameVisibleAndActive || over) return;
        if (paused) { draw(); return; }
        if (timestamp - lastTime >= speed) {
            // Simplificat pentru testare
            snake[0].x += dir === 'RIGHT' ? box : dir === 'LEFT' ? -box : 0;
            snake[0].y += dir === 'DOWN' ? box : dir === 'UP' ? -box : 0;
            if (snake[0].x < 0 || snake[0].x >= canvas.width || snake[0].y < 0 || snake[0].y >= canvas.height) gameOver();
            lastTime = timestamp;
        }
        draw();
        requestAnimationFrame(gameLoop);
    }

    function handleKeyDown(e) {
        if (over || breathingActive) return;
        const k = e.key.toLowerCase();
        if (k === ' ' || k === 'p') {
            paused = !paused;
            flash(paused ? "Joc în Pauză" : "Joc Reluat", 1500);
            if (!paused) requestAnimationFrame(gameLoop);
            return;
        }
        if (paused) return;
        if ((k === 'arrowleft' || k === 'a') && dir !== 'RIGHT') dir = 'LEFT';
        else if ((k === 'arrowup' || k === 'w') && dir !== 'DOWN') dir = 'UP';
        else if ((k === 'arrowright' || k === 'd') && dir !== 'LEFT') dir = 'RIGHT';
        else if ((k === 'arrowdown' || k === 's') && dir !== 'UP') dir = 'DOWN';
    }

    document.addEventListener('keydown', handleKeyDown);

    if (restartBtn) restartBtn.onclick = () => nextLevelSetup(false);
    if (fullResetBtn) fullResetBtn.onclick = () => { if (confirm(t('Ești sigur că vrei să resetezi tot progresul jocului?'))) nextLevelSetup(true); };

    function nextLevelSetup(isInitialOrFullReset = false) {
        effectId = 0;
        snake = [{ x: Math.floor(canvas.width / box / 2) * box, y: Math.floor(canvas.height / box / 2) * box }];
        dir = ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)];
        if (isInitialOrFullReset) {
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
        shield.hits = shield.level;
        activeColor = null;
        over = false;
        paused = false;
        special = null;
        effects = [];
        particles = [];
        obstacles = [];
        updateScore();
        updateValues();
        updateLevelDisplay();
        newFood();
        if (introEl) {
            introEl.innerHTML = `<strong>${t('level')} 1: ${t('Curaj')}</strong>`;
            introEl.classList.remove('hidden');
            setTimeout(() => introEl.classList.add('hidden'), 3000);
        }
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }

    function setupModal(modalElement, openBtnElement, closeBtnElement, onOpenCallback) {
        if (openBtnElement && modalElement && closeBtnElement) {
            openBtnElement.onclick = () => {
                paused = true;
                [journalModal, shopModal, minigameModal].forEach(m => m?.classList.add('hidden'));
                modalElement.classList.remove('hidden');
                if (onOpenCallback) onOpenCallback();
            };
            closeBtnElement.onclick = () => {
                modalElement.classList.add('hidden');
                paused = false;
                if (canvas) canvas.focus();
                if (gameVisibleAndActive && !over) requestAnimationFrame(gameLoop);
            };
        }
    }

    setupModal(journalModal, journalBtn, closeJournalModalBtn);
    setupModal(shopModal, shopBtn, closeShopModalBtn);
    if (saveJournal) saveJournal.onclick = () => { if (journalEntry.value.trim()) { journalEntries.push({ date: new Date().toISOString(), entry: journalEntry.value.trim() }); journalEntry.value = ''; flash(t('journalSaved'), 1500, 'good'); saveGameState(); } };
    if (closeMinigameModalBtn && minigameModal) closeMinigameModalBtn.onclick = () => {
        minigameModal.classList.add('hidden');
        paused = false;
        breathingActive = false;
        if (canvas) canvas.focus();
        if (gameVisibleAndActive && !over) requestAnimationFrame(gameLoop);
    };

    if (langBtn) langBtn.onclick = () => { language = language === 'ro' ? 'en' : 'ro'; setLanguage(language); saveGameState(); };

    function setLanguage(lang) {
        language = lang;
        // [Simplificat pentru testare]
        if (controlsEl) controlsEl.textContent = t('controls');
        if (langBtn) langBtn.textContent = lang === 'ro' ? 'English' : 'Română';
    }

    gameInitialized = true;
    console.log("Jocul Snake PREGĂTIT.");
    return {
        setGameVisibility: (isVisible) => {
            gameVisibleAndActive = isVisible;
            if (isVisible && !over) {
                console.log("Jocul devine vizibil, pornește loop-ul.");
                if (!paused) requestAnimationFrame(gameLoop);
            } else if (!isVisible) {
                paused = true;
            }
        },
        triggerResize: () => {
            resizeCanvas();
            if (canvas && canvas.width > box && canvas.height > box) {
                isCanvasReadyForGame = true;
                console.log("Canvas gata, inițializează nivel.");
                nextLevelSetup(true);
            } else {
                console.warn("Dimensiuni canvas invalide.");
            }
        },
        cleanup: () => { document.removeEventListener('keydown', handleKeyDown); gameInitialized = false; }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const launchModalBtn = document.getElementById('launchGameModalButton');
    snakeGameModalContainer = document.getElementById('snakeGameModalContainer');

    if (!launchModalBtn || !snakeGameModalContainer) {
        console.error("Lipsesc elemente DOM esențiale.");
        return;
    }

    launchModalBtn.addEventListener('click', () => {
        console.log("Buton 'Începe Călătoria Interioară' apăsat.");

        if (!snakeGameModalContainer.querySelector('#snakeGameModalContent')) {
            snakeGameModalContainer.innerHTML = gameModalHTMLStructure;
            snakeGameWrapper = document.getElementById('snakeGameWrapper');
            closeSnakeGameModalButton = document.getElementById('closeSnakeGameModal');

            if (!snakeGameWrapper || !closeSnakeGameModalButton) {
                console.error("CRITICAL: Lipsesc #snakeGameWrapper sau #closeSnakeGameModal.");
                return;
            }
            closeSnakeGameModalButton.addEventListener('click', () => {
                snakeGameModalContainer.style.display = 'none';
                if (gameInstance) gameInstance.setGameVisibility(false);
            });
        }

        if (!gameInitialized) {
            gameInstance = initializeSnakeGame();
        }

        if (gameInstance) {
            snakeGameModalContainer.style.display = 'flex';
            setTimeout(() => gameInstance.triggerResize(), 100);
            setTimeout(() => gameInstance.setGameVisibility(true), 150);
            if (canvas) canvas.focus();
        }
    });
});

window.addEventListener('beforeunload', () => {
    if (gameInstance && gameInitialized && gameVisibleAndActive && !over) saveGameState();
});