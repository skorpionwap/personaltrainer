// --- START OF FILE snakeGame.js ---

// --- assets/js/snakeGame.js ---

// Variabile la nivel de modul pentru a gestiona starea jocului
let gameInstance = null;
let gameInitialized = false;
let gameVisibleAndActive = false; // Track if the game UI is currently supposed to be active

// DOM Elements specific to the game, will be queried after HTML injection
let snakeGameWrapper;
let startGameButton;

// --- HTML STRUCTURE FOR THE GAME ---
const gameHTMLStructure = `
    <div id="snakeGameInterface" style="background: #293446; padding: 1rem; border-radius: 1rem; box-shadow: 0 4px 28px #0a121c; text-align: center; position: relative; max-width: 90%; margin: auto;">
      <h2 class="text-2xl text-yellow-200 mb-2" style="font-size: 1.5rem;">Snake 🐍 – Călătoria Interioară</h2>
      <div class="score mb-2" aria-live="polite" style="color: #e2e8f0;">Scor: <span id="snakeScore">0</span> | Maxim: <span id="snakeHighScore">0</span></div>
      <div class="values mb-2" aria-live="polite" style="color: #e2e8f0;">
        💙 <span id="snakeEmpatie">0</span>
        🦁 <span id="snakeCuraj">0</span>
        ⏳ <span id="snakeRabdare">0</span>
      </div>
      <div id="snakeIntro" class="hidden bg-gray-700 p-4 rounded-lg mb-2 text-center" role="dialog" style="color: #e2e8f0;"></div>
      <canvas id="snakeCanvas" width="320" height="320" tabindex="0" aria-label="Joc Snake cu tematică emoțională" class="focus:outline-none focus:ring-2 focus:ring-green-600" style="background: #1d2230; border-radius: 0.5rem; box-shadow: 0 4px 16px #1118; display: block; margin: 0 auto 0.5rem; transition: transform 0.2s ease-in-out;"></canvas>
      <div id="snakeStatus" class="flex gap-2 justify-center my-2" aria-live="polite"></div>
      <div id="snakeControls" class="controls text-gray-400 text-sm mb-2">Săgeți/WASD – mișcare • Space – pauză • J – jurnal • R – respirație</div>
      <div class="flex gap-2 justify-center">
        <button id="snakeRestartBtn" class="hidden px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition duration-300" aria-label="Repornește jocul">Restart</button>
        <button id="snakeJournalBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition duration-300" aria-label="Deschide jurnalul">Jurnal</button>
        <button id="snakeShopBtn" class="px-4 py-2 bg-yellow-600 text-white rounded-lg shadow-lg hover:bg-yellow-700 transition duration-300" aria-label="Deschide magazinul">Magazin</button>
        <button id="snakeLangBtn" class="px-4 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition duration-300" aria-label="Schimbă limba">English</button>
      </div>
      <div id="snakeJournalModal" class="hidden fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div class="bg-gray-700 p-6 rounded-lg shadow-xl w-full max-w-md">
          <h3 class="text-xl text-yellow-200 mb-3">Jurnal Emoțional (Joc)</h3>
          <textarea id="snakeJournalEntry" class="w-full p-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" rows="5" placeholder="Notează-ți gândurile din timpul jocului..."></textarea>
          <div class="flex gap-2 mt-3 justify-end">
            <button id="snakeSaveJournal" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Salvează</button>
            <button id="snakeExportJournal" class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">Export PDF</button>
            <button id="snakeViewJournal" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Vezi Intrări</button>
            <button id="snakeCloseJournalModal" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Închide</button>
          </div>
           <div id="snakeViewJournalContent" class="hidden mt-3 p-3 bg-gray-600 rounded-md max-h-60 overflow-y-auto text-sm"></div>
        </div>
      </div>
      <div id="snakeShopModal" class="hidden fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
         <div class="bg-gray-700 p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 class="text-xl text-yellow-200 mb-3">Magazin Interior (Joc)</h3>
            <div id="snakeShopItems" class="grid gap-3"></div>
            <button id="snakeCloseShopModal" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 w-full">Închide Magazin</button>
        </div>
      </div>
      <div id="snakeMinigameModal" class="hidden fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div class="bg-gray-700 p-6 rounded-lg shadow-xl w-full max-w-md text-center">
            <div id="snakeMinigameContent"></div>
            <button id="snakeCloseMinigameModal" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 w-full">Închide Minijoc</button>
        </div>
      </div>
      <div id="snakeEffect" aria-live="assertive" style="position: absolute; left: 50%; top: 24%; transform: translate(-50%, -50%); font-size: 1.9rem; font-weight: bold; color: #ffe166; text-shadow: 0 0 12px #000, 0 0 8px #232c37; pointer-events: none; opacity: 0; transition: opacity 0.8s;"></div>
    </div>
`;


function initializeSnakeGame() {
    if (gameInitialized) {
        console.log("Jocul Snake este deja inițializat.");
        return gameInstance;
    }

    if (snakeGameWrapper) {
        snakeGameWrapper.innerHTML = gameHTMLStructure;
    } else {
        console.error("Containerul pentru joc (snakeGameWrapper) nu a fost găsit în DOM.");
        return null;
    }

    const canvas = document.getElementById('snakeCanvas');
    if (!canvas) {
        console.error("Elementul canvas #snakeCanvas nu a fost găsit după injectare!");
        return null;
    }
    const ctx = canvas.getContext('2d');
    const box = 20;
    if (window.innerWidth < 600 && canvas.width > 280) { canvas.width = canvas.height = 280; }

    let snake, dir, food, score = 0, mult = 1, highScore = localStorage.getItem('snakeGameHighScore') || 0;
    let baseSpeed = 180; // NOU: Viteza de bază, poate fi folosită la resetarea vitezei per nivel
    let speed = baseSpeed; 
    let paused = false, over = false, wallPass = false, magnet = false, shield = { level: 1, hits: 1 };
    let activeColor = null, special = null, effects = [], effectId = 0, particles = [], obstacles = [], level = 0;
    let values = { empatie: 0, curaj: 0, rabdare: 0 }, collected = { curaj: 0, rabdare: 0, empatie: 0, acceptare: 0, frustrare: 0, motivatie: 0, critic: 0, abandon: 0, izolare: 0, adult: 0, copil: 0 };
    let analytics = { sessions: JSON.parse(localStorage.getItem('snakeGameAnalytics')) || [], current: { score: 0, values: {}, obstacles: [], time: 0 } };
    const scoreEl = document.getElementById('snakeScore'), highScoreEl = document.getElementById('snakeHighScore'), effectEl = document.getElementById('snakeEffect');
    const statusBar = document.getElementById('snakeStatus'), restartBtn = document.getElementById('snakeRestartBtn'), introEl = document.getElementById('snakeIntro');
    const journalBtn = document.getElementById('snakeJournalBtn'), journalModal = document.getElementById('snakeJournalModal'), journalEntry = document.getElementById('snakeJournalEntry');
    const saveJournal = document.getElementById('snakeSaveJournal'), exportJournal = document.getElementById('snakeExportJournal'), viewJournal = document.getElementById('snakeViewJournal');
    const closeJournalModalBtn = document.getElementById('snakeCloseJournalModal'), viewJournalContentEl = document.getElementById('snakeViewJournalContent');
    const shopBtn = document.getElementById('snakeShopBtn'), shopModal = document.getElementById('snakeShopModal'), shopItemsEl = document.getElementById('snakeShopItems'), closeShopModalBtn = document.getElementById('snakeCloseShopModal');
    const minigameModal = document.getElementById('snakeMinigameModal'), minigameContentEl = document.getElementById('snakeMinigameContent'), closeMinigameModalBtn = document.getElementById('snakeCloseMinigameModal');
    const langBtn = document.getElementById('snakeLangBtn'), controlsEl = document.getElementById('snakeControls');
    const valueEls = { empatie: document.getElementById('snakeEmpatie'), curaj: document.getElementById('snakeCuraj'), rabdare: document.getElementById('snakeRabdare') };
    let lastTime = 0, repelCountdown = 0, journalEntries = JSON.parse(localStorage.getItem('snakeGameJournal')) || [], language = 'ro';
    let slowMotion = false, clarityMap = false, breathingActive = false;

    highScoreEl.textContent = highScore;

    const translations = {
        ro: {
          score: 'Scor', highScore: 'Maxim', restart: 'Restart', journal: 'Jurnal', shop: 'Magazin', controls: 'Săgeți/WASD – mișcare • Space – pauză • J – jurnal • R – respirație',
          save: 'Salvează', export: 'Export PDF', view: 'Vezi Jurnal', journalSaved: 'Jurnal salvat', journalEmpty: 'Jurnal gol', close: 'Închide',
          emotionalSummary: 'Rezumat Emoțional', courageFeedback: '🦁 Mult curaj! Explorează ce te motivează să fii puternic.',
          frustrationFeedback: '🌩️ Ai întâlnit frustrare. Încearcă o pauză sau o respirație profundă.', shieldProtect: 'Scutul a protejat Copilul',
          curaj: 'Curaj', rabdare: 'Răbdare', empatie: 'Empatie Magnet', acceptare: 'Acceptare libertate', frustrare: 'Frustrare',
          motivatie: 'Motivație +5', copil: 'Protejezi Copilul Interior', adult: 'Adult Sănătos', critic: 'Critic Interior',
          abandon: 'Umbra Abandonului', izolare: 'Izolare Socială', shopTitle: 'Magazin Interior', dailyQuest: 'Adună 3 ⭐ Motivație, scrie un gând recunoscător',
          breathing: 'Exercițiu de respirație: Inhalează 4s, ține 4s, expiră 4s', reframe: 'Alege o afirmație pozitivă:', stuck: 'Te simți blocat? Încearcă să scrii ce te apasă.',
          levelIntro: 'Nivelul', theme: 'Temă', message: 'Mesaj', purchased: 'achiziționat', insufficientValues: 'Valori insuficiente', bought: 'Cumpărat'
        },
        en: {
          score: 'Score', highScore: 'High Score', restart: 'Restart', journal: 'Journal', shop: 'Shop', controls: 'Arrows/WASD – movement • Space – pause • J – journal • R – breathing',
          save: 'Save', export: 'Export PDF', view: 'View Journal', journalSaved: 'Journal saved', journalEmpty: 'Journal empty', close: 'Close',
          emotionalSummary: 'Emotional Summary', courageFeedback: '🦁 Lots of courage! Explore what motivates you to be strong.',
          frustrationFeedback: '🌩️ You encountered frustration. Try a break or deep breathing.', shieldProtect: 'The shield protected the Inner Child',
          curaj: 'Courage', rabdare: 'Patience', empatie: 'Empathy Magnet', acceptare: 'Acceptance Freedom', frustrare: 'Frustration',
          motivatie: 'Motivation +5', copil: 'Protecting the Inner Child', adult: 'Healthy Adult', critic: 'Inner Critic',
          abandon: 'Shadow of Abandonment', izolare: 'Social Isolation', shopTitle: 'Inner Shop', dailyQuest: 'Collect 3 ⭐ Motivation, write a grateful thought',
          breathing: 'Breathing exercise: Inhale 4s, hold 4s, exhale 4s', reframe: 'Choose a positive affirmation:', stuck: 'Feeling stuck? Try writing what’s weighing you down.',
          levelIntro: 'Level', theme: 'Theme', message: 'Message', purchased: 'purchased', insufficientValues: 'Insufficient values', bought: 'Purchased'
        }
    };
    const levels = [
        { theme: 'Curaj', message: 'Explorează ce înseamnă să fii curajos. Ce te motivează?', specials: ['curaj', 'motivatie'], obstacles: 1, bgColor: '#ffb347', mechanic: 'fearShrink' },
        { theme: 'Frustrare', message: 'Confruntă frustrarea. Ce te ajută să te calmezi?', specials: ['frustrare', 'rabdare'], obstacles: 2, bgColor: '#ff686b', mechanic: 'rageMode' },
        { theme: 'Empatie', message: 'Conectează-te cu ceilalți. Ce simți când ești empatic?', specials: ['empatie', 'adult'], obstacles: 1, bgColor: '#59a5e0', mechanic: 'cooperative' },
        { theme: 'Acceptare', message: 'Acceptă-ți vulnerabilitățile. Ce te face să te simți liber?', specials: ['acceptare', 'copil'], obstacles: 2, bgColor: '#b388ff', mechanic: 'portals' },
        { theme: 'Criticul Interior', message: 'Înfruntă criticul interior. Ce îți spui pentru a merge mai departe?', specials: ['critic', 'abandon'], obstacles: 0, bgColor: '#d00000', mechanic: 'boss' }
    ];
    const specialsList = [ // Renamed to avoid conflict with `special` variable
        { type: 'curaj', symbol: '🦁', color: '#ffb347', value: 'curaj', effect: () => { boost(2, t('curaj')); }, revert: endBoost },
        { type: 'rabdare', symbol: '⏳', color: '#7ed957', value: 'rabdare', effect: () => { slow(t('rabdare')); }, revert: resetSpeed },
        { type: 'empatie', symbol: '💙', color: '#59a5e0', value: 'empatie', effect: () => { magnet = true; flash(t('empatie')); }, revert: () => { magnet = false; } },
        { type: 'acceptare', symbol: '🌀', color: '#b388ff', effect: () => { wallPass = true; flash(t('acceptare')); }, revert: () => { wallPass = false; } },
        { type: 'frustrare', symbol: '🌩️', color: '#ff686b', effect: () => { speedUp(t('frustrare')); }, revert: resetSpeed },
        { type: 'motivatie', symbol: '⭐', color: '#ffe166', effect: () => { score += 5; updateScore(); flash(t('motivatie')); }, revert: null },
        { type: 'copil', symbol: '👶', color: '#ffd1dc', effect: () => { shield.hits = shield.level; flash(t('copil')); }, revert: () => { shield.hits = 0; } },
        { type: 'adult', symbol: '👦💭', color: '#90e0ef', effect: () => { endNegative(); boost(1.5, t('adult')); }, revert: endBoost },
        { type: 'critic', symbol: '🔨', color: '#d00000', negative: true, effect: () => { invertDirection(); flash(t('critic')); }, revert: null },
        { type: 'abandon', symbol: '🥀', color: '#6d6875', negative: true, effect: () => { shrinkSnake(); flash(t('abandon')); }, revert: null },
        { type: 'izolare', symbol: '👤', color: '#5a189a', negative: true, effect: () => { repelFood(); flash(t('izolare')); }, revert: null }
    ];
    const shopItemsList = [
        { id: 'shield2', name: 'Scut Copil Lv2', cost: { curaj: 5 }, effect: () => { shield.level = 2; shield.hits = 2; } },
        { id: 'slowMotion', name: 'Respirație Liniștitoare', cost: { rabdare: 3 }, effect: () => { slowMotion = true; } },
        { id: 'clarity', name: 'Hartă Claritate', cost: { empatie: 4 }, effect: () => { clarityMap = true; } }
    ];

    function t(key) { return translations[language]?.[key] || key; }
    function spawnFree() {
      let p;
      do { p = { x: Math.floor(Math.random() * canvas.width / box) * box, y: Math.floor(Math.random() * canvas.height / box) * box }; }
      while (snake.some(s => s.x === p.x && s.y === p.y) || obstacles.some(o => o.x === p.x && o.y === p.y) || (food && p.x === food.x && p.y === food.y));
      return p;
    }
    function newFood() { food = spawnFree(); }
    function newSpecial() {
      const levelSpecialsTypes = levels[level]?.specials || specialsList.map(s => s.type);
      const availableSpecials = specialsList.filter(s => levelSpecialsTypes.includes(s.type));
      if (availableSpecials.length === 0) return;
      special = Object.assign({}, spawnFree(), availableSpecials[Math.floor(Math.random() * availableSpecials.length)]);
    }
    function spawnObstacle() { obstacles.push(spawnFree()); }
    function updateScore() {
      scoreEl.textContent = score;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeGameHighScore', highScore);
        highScoreEl.textContent = highScore;
      }
      analytics.current.score = score;
    }
    function updateValues() {
        if(valueEls.empatie) valueEls.empatie.textContent = values.empatie;
        if(valueEls.curaj) valueEls.curaj.textContent = values.curaj;
        if(valueEls.rabdare) valueEls.rabdare.textContent = values.rabdare;
    }
    function flash(text, duration = 1600) {
      if(!effectEl) return;
      effectEl.innerHTML = text;
      effectEl.style.opacity = 1;
      setTimeout(() => { if(effectEl) effectEl.style.opacity = 0; }, duration);
    }
    function changeSpeed(factor) { speed = Math.max(40, Math.min(300, Math.floor(speed * factor))); }
    function resetSpeed() { speed = baseSpeed; activeColor = null; }
    function boost(factor, label) { mult = factor; activeColor = '#ffb347'; flash(`${label}!`); addEffectIcon('🚀', 5);}
    function endBoost() { mult = 1; activeColor = null; }
    function speedUp(label) { changeSpeed(0.7); activeColor = '#ff686b'; flash(`${label}!`); addEffectIcon('⚡', 5);}
    function slow(label) { changeSpeed(1.7); activeColor = '#7ed957'; flash(`${label}!`); addEffectIcon('🐢', 5);}
    function endNegative() { effects = effects.filter(e => !e.neg); statusBar.querySelectorAll('.neg-effect').forEach(el => el.remove()); }
    function invertDirection() {
      if (dir === 'LEFT') dir = 'RIGHT'; else if (dir === 'RIGHT') dir = 'LEFT';
      else if (dir === 'UP') dir = 'DOWN'; else if (dir === 'DOWN') dir = 'UP';
      effects.push({ id: addEffectIcon('🔨', 2, true), neg: true, revert: null }); // Adăugat revert: null
      flash(t('critic'));
    }
    function shrinkSnake() {
      snake.length = Math.max(1, snake.length - 3);
      effects.push({ id: addEffectIcon('🥀', 2, true), neg: true, revert: null });
      flash(t('abandon'));
    }
    function repelFood() {
      effects.push({ id: addEffectIcon('👤', 2, true), neg: true, revert: null });
      repelCountdown = 60;
      flash(t('izolare'));
    }
    function addEffectIcon(sym, dur = 5, isNegative = false) {
      if(!statusBar) return 'no-status-bar';
      const id = 'effectIcon' + (++effectId), span = document.createElement('span');
      span.className = 'stat' + (isNegative ? ' neg-effect' : '');
      span.id = id;
      span.textContent = sym;
      span.setAttribute('aria-label', `Efect activ: ${sym}`);
      const bar = document.createElement('div'); bar.className = 'bar'; span.appendChild(bar);
      statusBar.appendChild(span);
      span.dataset.duration = dur; span.dataset.timeLeft = dur;
      return id;
    }
    function tickEffects() {
      if(!statusBar) return;
      effects.forEach((e, index) => {
        const s = document.getElementById(e.id);
        if (!s) { effects.splice(index, 1); return; }
        let timeLeft = parseFloat(s.dataset.timeLeft) - (speed / 1000);
        s.dataset.timeLeft = timeLeft.toFixed(1);
        const initialDuration = parseFloat(s.dataset.duration);
        if(s.querySelector('.bar')) s.querySelector('.bar').style.width = Math.max(0,(timeLeft / initialDuration)) * 100 + '%';
        if (timeLeft <= 0) {
            s.remove();
            const originalEffect = specialsList.find(sp => sp.symbol === s.textContent.trim()) || effects[index]; // Caută și în effects array
            if (originalEffect && originalEffect.revert) {
                originalEffect.revert();
            }
            effects.splice(index, 1);
        }
      });
    }
    function spawnParticles(x, y, color) {
      for (let i = 0; i < 10; i++) {
        particles.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, alpha: 1, color });
      }
    }
    function applyLevelMechanics() {
        if (level >= levels.length) return;
        const currentLevelData = levels[level];
        const mechanic = currentLevelData.mechanic;

        canvas.style.transition = 'transform 0.5s ease-in-out, background-color 0.5s ease-in-out';
        canvas.style.backgroundColor = currentLevelData.bgColor || '#1d2230';
        canvas.style.transform = 'scale(1)'; // NOU: Reset scale before applying new one

        if (mechanic === 'fearShrink') {
            canvas.style.transform = 'scale(0.9)';
            setTimeout(() => { if(canvas) canvas.style.transform = 'scale(1)'; }, 5000);
        } else if (mechanic === 'rageMode' && collected.frustrare > 0) {
            speedUp(t('frustrare') + ' Mode Activated!');
            // setTimeout(resetSpeed, 3000); // Revert handled by tickEffects
        } else if (mechanic === 'cooperative') {
            flash("Mod cooperativ (placeholder) - imaginează-ți un aliat!");
        } else if (mechanic === 'portals') {
            const portalEffect = specialsList.find(s => s.type === 'acceptare');
            if (portalEffect) portalEffect.effect(); // Activate wallPass
            addEffectIcon(portalEffect.symbol, 15); // Durată mai lungă pt portal
            effects.push({ id: 'effectIcon' + effectId, revert: portalEffect.revert }); // Adaugă la efecte pentru revert
        } else if (mechanic === 'boss') {
            obstacles = [];
            special = { type: 'critic', symbol: 'BOSS 🔨', color: '#d00000', x: Math.floor(canvas.width / 2 / box) * box, y: Math.floor(canvas.height / 2 / box) * box, negative: true, isBoss: true, bossHits: 3 };
            flash("Înfruntă CRITICUL INTERIOR!");
        }
    }

    function toggleJournalModal() { /* ... cod existent ... */ }
    saveJournal.onclick = () => { /* ... cod existent ... */ };
    exportJournal.onclick = () => { /* ... cod existent ... */ };
    function displayJournalEntries() { /* ... cod existent ... */ }
    viewJournal.onclick = () => { /* ... cod existent ... */ };
    closeJournalModalBtn.onclick = () => { /* ... cod existent ... */ };

    function toggleShopModal() {
        if (paused && !shopModal.classList.contains('hidden')) {
            shopModal.classList.add('hidden');
        } else {
            paused = true;
            shopModal.classList.remove('hidden');
            journalModal.classList.add('hidden');
            minigameModal.classList.add('hidden');
            shopItemsEl.innerHTML = '';
            shopItemsList.forEach(item => {
                const btn = document.createElement('button');
                btn.className = 'w-full text-left px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150';
                btn.innerHTML = `
                    <div class="font-semibold">${t(item.name) || item.name}</div>
                    <div class="text-sm text-blue-200">Cost: ${Object.entries(item.cost).map(([k, v]) => `${v} ${t(k) || k}`).join(', ')}</div>
                `;
                btn.onclick = () => {
                    if (Object.entries(item.cost).every(([k, v]) => values[k] >= v)) {
                        Object.entries(item.cost).forEach(([k, v]) => values[k] -= v);
                        item.effect();
                        updateValues();
                        flash(`${t(item.name) || item.name} ${t('purchased')}!`);
                        btn.disabled = true;
                        btn.classList.add("opacity-50", "cursor-not-allowed");
                        btn.innerHTML += ` <span class="text-xs text-green-300">(${t('bought')})</span>`;
                    } else {
                        flash(t('insufficientValues') + '!');
                    }
                };
                shopItemsEl.appendChild(btn);
            });
        }
    }
    closeShopModalBtn.onclick = () => shopModal.classList.add('hidden');

    function startBreathing() { /* ... cod existent ... */ }
    function startReframe() { /* ... cod existent ... */ }
    closeMinigameModalBtn.onclick = () => { /* ... cod existent ... */ };
    
    function setLanguage(lang) { /* ... cod existent ... */ }
    if(langBtn) langBtn.onclick = () => setLanguage(language === 'ro' ? 'en' : 'ro');

    function saveAnalytics() { /* ... cod existent ... */ }
    function checkStuck() { /* ... cod existent ... */ }
    function loadCustomMap(jsonString) { /* ... cod existent ... */ }

    // --- MODIFICAT: RESETARE ---
    function fullResetGame(isInitialReset = false) {
        snake = [{ x: 7 * box, y: 7 * box }];
        dir = 'RIGHT';
        score = 0; // Resetare scor la full reset
        values = { empatie: 0, curaj: 0, rabdare: 0 }; // Resetare valori la full reset
        level = 0; // Resetare nivel la full reset
        
        // Resetare iteme din shop (opțional, depinde de design)
        shield.level = 1; 
        slowMotion = false; 
        clarityMap = false;

        mult = 1;
        speed = baseSpeed; // Resetare viteză la cea de bază
        wallPass = magnet = false;
        shield.hits = shield.level;
        activeColor = null;
        over = false;
        if (isInitialReset) paused = false;

        special = null;
        effects = []; // Efectele se resetează complet
        particles = [];
        obstacles = [];
        if (statusBar) statusBar.innerHTML = '';

        for (let k in collected) collected[k] = 0;
        analytics.current = { score: 0, values: {}, obstacles: [], time: Date.now() };

        updateScore();
        updateValues();
        newFood();
        if(newSpecial && Math.random() < 0.1) newSpecial();

        if(restartBtn) restartBtn.classList.add('hidden');

        if (levels.length > 0) {
            const currentLvlData = levels[level]; // Nivelul 0
            if(introEl) {
                introEl.innerHTML = `<strong>${t(currentLvlData.theme)}</strong><br>${t(currentLvlData.message)}<br><small>${t('dailyQuest')}</small>`;
                introEl.classList.remove('hidden');
            }
            if(!isInitialReset) paused = true;
            setTimeout(() => {
                if(introEl) introEl.classList.add('hidden');
                if(!isInitialReset) paused = false;
                applyLevelMechanics(); // Aplică mecanicile pentru nivelul curent (0)
                 if (gameVisibleAndActive && !over) {
                    lastTime = performance.now(); // Previne saltul de timp
                    requestAnimationFrame(gameLoop);
                 }
            }, isInitialReset ? 100 : 3000);

            for (let i = 0; i < (currentLvlData.obstacles || 0); i++) spawnObstacle();
        } else {
             if(introEl) {
                introEl.innerHTML = "Nu sunt nivele definite. Joc în mod liber.";
                introEl.classList.remove('hidden');
             }
             setTimeout(() => {
                if(introEl) introEl.classList.add('hidden');
                if (gameVisibleAndActive && !over) {
                    lastTime = performance.now();
                    requestAnimationFrame(gameLoop);
                }
            }, 100);
        }
        if (!isInitialReset) lastTime = performance.now(); // Asigură resetarea timpului și pentru restart manual
    }

    // NOU: Funcție pentru tranziția la nivelul următor
    function transitionToNextLevel() {
        paused = true; // Pauză pentru intro-ul noului nivel

        // Curățăm elementele specifice nivelului anterior
        obstacles = [];
        special = null;
        // speed = baseSpeed; // Opțional: resetează viteza la cea de bază a nivelului

        newFood();
        if (newSpecial && Math.random() < 0.2) newSpecial();

        if (level < levels.length) { // Verifică dacă mai sunt nivele
            const currentLvlData = levels[level];
            if (introEl) {
                introEl.innerHTML = `<strong>${t('levelIntro')} ${level + 1}: ${t(currentLvlData.theme)}</strong><br>${t(currentLvlData.message)}`;
                introEl.classList.remove('hidden');
            }
            
            setTimeout(() => {
                if (introEl) introEl.classList.add('hidden');
                paused = false;
                applyLevelMechanics(); // Aplică mecanicile pentru NOUL nivel
                obstacles = []; // Asigură golirea obstacolelor vechi înainte de a genera noi
                for (let i = 0; i < (currentLvlData.obstacles || 0); i++) spawnObstacle();
                
                lastTime = performance.now(); // Important pentru a preveni saltul în gameLoop
                if (gameVisibleAndActive && !over) requestAnimationFrame(gameLoop);
            }, 3000); // Durata intro-ului
        } else {
            // Jucătorul a terminat toate nivelele predefinite
            if (introEl) {
                introEl.innerHTML = "Felicitări! Ai finalizat toate provocările emoționale! Poți continua să joci în modul liber.";
                introEl.classList.remove('hidden');
            }
            setTimeout(() => {
                if (introEl) introEl.classList.add('hidden');
                paused = false;
                canvas.style.backgroundColor = '#1d2230'; // Fundal default
                canvas.style.transform = 'scale(1)';
                obstacles = []; // Curăță obstacolele pentru modul liber
                for (let i = 0; i < 3; i++) spawnObstacle(); // Adaugă câteva obstacole random
                lastTime = performance.now();
                if (gameVisibleAndActive && !over) requestAnimationFrame(gameLoop);
            }, 3000);
        }
        updateValues(); // În caz că nivelul oferă bonusuri (nu e cazul acum)
    }


    function draw() {
        if (!ctx || !canvas) return;
        const currentBgColor = (level < levels.length ? levels[level].bgColor : null) || '#1d2230';
        const gradientEndColor = '#293446';
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, currentBgColor);
        gradient.addColorStop(1, gradientEndColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // MODIFICAT: Desenare șarpe cu segmente rotunjite și ochi
        snake.forEach((seg, i) => {
          ctx.fillStyle = i === 0 ? (activeColor || (shield.hits > 0 ? '#ffd1dc' : '#36a26b')) : '#88dab2';
          ctx.strokeStyle = '#232c37';
          ctx.lineWidth = 1; // Asigură o linie subțire pentru stroke

          // Desenare segment rotunjit
          ctx.beginPath();
          // ctx.roundRect este experimental, dar larg suportat. Poți folosi arcTo pentru compatibilitate maximă.
          if (ctx.roundRect) {
             ctx.roundRect(seg.x, seg.y, box, box, box / 3.5); // Raza colțurilor
          } else { // Fallback la pătrat simplu
             ctx.rect(seg.x, seg.y, box, box);
          }
          ctx.fill();
          ctx.stroke();

          // Desenare ochi pe cap
          if (i === 0) {
            ctx.fillStyle = 'white';
            const eyeRadius = box / 6;
            let eye1X, eye1Y, eye2X, eye2Y;
            let pupilOffsetX = 0, pupilOffsetY = 0;

            if (dir === 'LEFT' || dir === 'RIGHT') {
                eye1Y = seg.y + box / 3.5;
                eye2Y = seg.y + box - box / 3.5;
                eye1X = seg.x + box / 2;
                eye2X = seg.x + box / 2;
                if (dir === 'LEFT') pupilOffsetX = -eyeRadius / 2;
                if (dir === 'RIGHT') pupilOffsetX = eyeRadius / 2;
            } else { // UP sau DOWN
                eye1X = seg.x + box / 3.5;
                eye2X = seg.x + box - box / 3.5;
                eye1Y = seg.y + box / 2;
                eye2Y = seg.y + box / 2;
                if (dir === 'UP') pupilOffsetY = -eyeRadius / 2;
                if (dir === 'DOWN') pupilOffsetY = eyeRadius / 2;
            }
            ctx.beginPath(); ctx.arc(eye1X, eye1Y, eyeRadius, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(eye2X, eye2Y, eyeRadius, 0, Math.PI * 2); ctx.fill();

            // Pupile
            ctx.fillStyle = 'black';
            ctx.beginPath(); ctx.arc(eye1X + pupilOffsetX, eye1Y + pupilOffsetY, eyeRadius / 1.8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(eye2X + pupilOffsetX, eye2Y + pupilOffsetY, eyeRadius / 1.8, 0, Math.PI * 2); ctx.fill();
          }
        });

        if(food) { /* ... cod existent ... */ }
        if (special) { /* ... cod existent ... */ }
        obstacles.forEach(o => { /* ... cod existent ... */ });
        particles.forEach(p => { /* ... cod existent ... */ });
        particles = particles.filter(p => p.alpha > 0);
    }

    function gameLoop(timestamp) {
        if (!gameVisibleAndActive || paused || over) {
             if(gameVisibleAndActive && !over) draw();
            // Nu cerem următorul frame dacă e pe pauză sau game over,
            // se va relua prin resume() sau reset/start.
            // Doar dacă e gameVisibleAndActive dar e o pauză internă (ex. intro nivel)
            // atunci requestAnimationFrame ar putea fi util pentru a redesena.
            // Decizia este să NU facem requestAnimationFrame aici, ci la reluare explicită.
            // EXCEPȚIE: dacă pauza este din cauza unui intro, atunci gameLoop trebuie să poată fi reluat după timeout.
            // Soluție: requestAnimationFrame va fi chemat în setTimeout-ul din intro.
            return; 
        }

        if (timestamp - lastTime >= speed) {
            update();
            lastTime = timestamp;
        }
        draw();
        requestAnimationFrame(gameLoop); // Buclează doar dacă jocul e activ și nu e pauzat/over.
    }


    function update() {
        if (over || paused) return;

        tickEffects();
        const head = { x: snake[0].x, y: snake[0].y };

        if (dir === 'LEFT') head.x -= box;
        else if (dir === 'RIGHT') head.x += box;
        else if (dir === 'UP') head.y -= box;
        else if (dir === 'DOWN') head.y += box;

        if (magnet && food) { /* ... cod existent ... */ }
        if (repelCountdown > 0 && food) { /* ... cod existent ... */ }

        if (wallPass) { /* ... cod existent ... */ }
        else if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
            return gameOver();
        }

        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) return gameOver();
        }
        for (let o of obstacles) {
            if (head.x === o.x && head.y === o.y) return gameOver();
        }

        if (food && head.x === food.x && head.y === food.y) {
            score += mult; // Scorul continuă să crească
            updateScore();
            newFood();
            spawnParticles(food.x + box / 2, food.y + box / 2, '#34D399');
            navigator.vibrate?.(50);
            if (!special && Math.random() < (0.2 + level * 0.05) ) newSpecial();
        } else {
            snake.pop();
        }

        if (special && head.x === special.x && head.y === special.y) {
            const sp = special;
            special = null;

            if (sp.isBoss) {
                sp.bossHits--;
                flash(`Lovitură Critic! Mai are ${sp.bossHits} vieți.`);
                if (sp.bossHits <= 0) {
                    flash("CRITICUL INTERIOR A FOST ÎNVINS! Felicitări!");
                    score += 50;
                    updateScore(); // Actualizează scorul după bonus
                    level++; // MODIFICAT: Incrementăm nivelul aici
                    if (level < levels.length) {
                        transitionToNextLevel(); // Tranziție la nivelul următor
                    } else {
                        // Boss final învins, a terminat toate nivelele
                        flash("Ai învins provocarea finală și toate nivelele!", 4000);
                         // Intră în modul liber sau afișează un mesaj de final de campanie
                        transitionToNextLevel(); // Va afișa mesajul de "toate nivelele finalizate"
                    }
                } else {
                    special = sp;
                }
            } else if (sp.negative && shield.hits > 0) { /* ... cod existent ... */ }
            else {
                if (sp.type) collected[sp.type] = (collected[sp.type] || 0) + 1;
                analytics.current.obstacles.push(sp.type);
                if (sp.value && values.hasOwnProperty(sp.value)) values[sp.value]++;
                
                const effectDetails = specialsList.find(s => s.type === sp.type);
                if (effectDetails && effectDetails.effect) effectDetails.effect();
                
                // Adaugă la `effects` pentru `tickEffects` dacă are revert și nu e negativ instantaneu
                if (effectDetails && effectDetails.revert && !sp.negative) {
                     // Caută un ID unic pentru efectul adăugat de addEffectIcon (dacă e cazul)
                    // Pentru simplitate, asumăm că addEffectIcon e apelat în `effectDetails.effect()`
                    // și `tickEffects` va gestiona revert-ul prin simbol.
                    // Alternativ, dacă `addEffectIcon` nu e apelat acolo, îl apelăm aici:
                    // const iconId = addEffectIcon(sp.symbol, 5); // 5 secunde default
                    // effects.push({ id: iconId, revert: effectDetails.revert, symbol: sp.symbol });

                    // Dacă efectul este gestionat de tickEffects (ex: boost, slow), nu e nevoie de setTimeout direct aici.
                    // `effects.push` din `addEffectIcon` și `tickEffects` se ocupă de revert.
                }

                spawnParticles(sp.x + box / 2, sp.y + box / 2, sp.color);
                navigator.vibrate?.(100);

                if (sp.type === 'critic' && !sp.isBoss) startReframe();
            }
            updateValues();
            checkStuck();
        }
        snake.unshift(head);

        // MODIFICAT: Trecere la nivelul următor bazată pe scor
        // Verifică dacă mai sunt nivele de parcurs și dacă nu e deja un boss activ (care are propria logica de tranziție)
        if (levels && levels.length > 0 && level < levels.length -1 && // Asigură-te că nu e ultimul nivel
            (!special || !special.isBoss) && // Nu trece la nivel dacă e un boss activ
            score >= (level + 1) * (15 + level * 3) ) { // Condiție de scor ajustată pentru continuitate
            level++; // Incrementăm nivelul
            transitionToNextLevel(); // Apelăm noua funcție
        }
    }

    function gameOver() {
        if (over) return;
        over = true;
        paused = true;
        // playSound('gameOver');
        let raport = `<strong class="text-lg">${t('emotionalSummary')}:</strong><br>`;
        if (collected.curaj > 3) raport += `<span class="text-yellow-400">${t('courageFeedback')}</span><br>`;
        if (collected.frustrare > 2) raport += `<span class="text-red-400">${t('frustrationFeedback')}</span><br>`;
        raport += `🦁${collected.curaj} ⏳${collected.rabdare} 💙${collected.empatie} 🌀${collected.acceptare}<br>`;
        raport += `👶${collected.copil} 👦${collected.adult} 🔨${collected.critic} 🥀${collected.abandon} 👤${collected.izolare} ⭐${collected.motivatie}`;
        flash(raport, 5000);

        if(restartBtn) {
            restartBtn.classList.remove('hidden');
            // MODIFICAT: Butonul de restart va apela fullResetGame
            restartBtn.onclick = () => {
                fullResetGame(false);
                // gameLoop-ul va fi pornit de fullResetGame prin setTimeout-ul intro-ului
            };
        }
        saveAnalytics();
    }

    function handleKeyDown(e) { /* ... cod existent, asigură-te că nu pornește gameLoop direct la resume, ci doar setează paused=false ... */
        if (!gameVisibleAndActive || over || breathingActive) return; 
        const k = e.key.toLowerCase();

        if (k === ' ' || k === 'p') { 
            e.preventDefault();
            if (paused && !journalModal.classList.contains('hidden')) { 
                toggleJournalModal();
            } else if (paused && !shopModal.classList.contains('hidden')) {
                toggleShopModal();
            } else if (paused && !minigameModal.classList.contains('hidden')) {
                // Nu face nimic
            }
            else { 
                paused = !paused;
                if (paused) {
                    flash("Joc în Pauză. Apasă Space pentru a relua.", 2000);
                } else {
                    flash("Joc Reluat!", 1000);
                    lastTime = performance.now(); 
                    requestAnimationFrame(gameLoop); // Reluare buclă
                }
            }
            return;
        }
        // ... restul codului din handleKeyDown ...
        if (k === 'j') { e.preventDefault(); toggleJournalModal(); return; }
        if (k === 'm') { e.preventDefault(); toggleShopModal(); return; }
        if (k === 'r' && slowMotion) {
            e.preventDefault();
            if (!minigameModal.classList.contains('hidden') && breathingActive) return;
            startBreathing();
            slowMotion = false;
            return;
        }

        if (paused) return; 

        if ((k === 'arrowleft' || k === 'a') && dir !== 'RIGHT') dir = 'LEFT';
        else if ((k === 'arrowup' || k === 'w') && dir !== 'DOWN') dir = 'UP';
        else if ((k === 'arrowright' || k === 'd') && dir !== 'LEFT') dir = 'RIGHT';
        else if ((k === 'arrowdown' || k === 's') && dir !== 'UP') dir = 'DOWN';
    }
    document.addEventListener('keydown', handleKeyDown);

    let touchStartX = 0; let touchStartY = 0;
    canvas.addEventListener('touchstart', e => { /* ... cod existent ... */ }, { passive: false });
    canvas.addEventListener('touchmove', e => { /* ... cod existent ... */ }, { passive: false });
    function resetTouch() { touchStartX = 0; touchStartY = 0; }

    // MODIFICAT: RestartBtn apelează acum fullResetGame
    if(restartBtn) restartBtn.onclick = () => fullResetGame(false);
    if(journalBtn) journalBtn.onclick = toggleJournalModal;
    if(shopBtn) shopBtn.onclick = toggleShopModal;

    if (canvas) canvas.focus();
    setLanguage('ro');
    fullResetGame(true); // MODIFICAT: Apelare fullResetGame la inițializare

    gameInitialized = true;
    console.log("Instanța jocului Snake a fost inițializată.");

    gameInstance = {
        pause: () => {
            if (!over) {
                paused = true;
                console.log("Snake game paused via instance.");
                // Nu este nevoie de flash aici, poate fi gestionat de apelant
            }
        },
        resume: () => {
            if (!over && gameVisibleAndActive && paused) { // Doar dacă e pauzat
                paused = false;
                console.log("Snake game resumed via instance.");
                flash("Joc Reluat!", 1000);
                lastTime = performance.now();
                requestAnimationFrame(gameLoop);
            }
        },
        reset: () => fullResetGame(false), // MODIFICAT
        isPaused: () => paused,
        isOver: () => over,
        setGameVisibility: (isVisible) => {
            const wasVisibleAndActive = gameVisibleAndActive;
            gameVisibleAndActive = isVisible;
            if (isVisible && !paused && !over) {
                if (!wasVisibleAndActive) { // Dacă devine vizibil și nu era înainte
                    console.log("Game visibility set to true, ensuring game loop is active.");
                    lastTime = performance.now();
                    requestAnimationFrame(gameLoop);
                }
            } else if (!isVisible && !paused && !over) { 
                gameInstance.pause(); // Pauzează dacă devine invizibil și rula
                console.log("Game visibility set to false, pausing game.");
            }
        },
        cleanup: () => { /* ... cod existent ... */ }
    };
    return gameInstance;
}

// --- FUNCȚII DE CONTROL EXPUSE MODULULUI PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    snakeGameWrapper = document.getElementById('snakeGameWrapper');
    startGameButton = document.getElementById('startGameButton');

    if (startGameButton && snakeGameWrapper) {
        startGameButton.addEventListener('click', () => {
            if (!gameInitialized) {
                gameInstance = initializeSnakeGame();
            }
            if (gameInstance) {
                snakeGameWrapper.style.display = 'block';
                startGameButton.style.display = 'none';
                gameInstance.setGameVisibility(true);
                // La primul start, fullResetGame(true) deja rulează/a rulat
                // Dacă jocul era într-o stare de game over și se re-apasă "Joacă Acum" (după un refresh, de ex.)
                if (gameInstance.isOver()) {
                    gameInstance.reset();
                } else if (gameInstance.isPaused()) { // Dacă era pe pauză (ex. după ce tab-ul a fost inactiv)
                    gameInstance.resume();
                }
                const gameCanvas = document.getElementById('snakeCanvas');
                if(gameCanvas) gameCanvas.focus();
            }
        });
    }
});

export function handleGameVisibility(isVisible) {
    if (gameInstance && typeof gameInstance.setGameVisibility === 'function') {
        const wrapperIsVisible = snakeGameWrapper && snakeGameWrapper.style.display === 'block';
        gameInstance.setGameVisibility(isVisible && wrapperIsVisible);

        if (isVisible && wrapperIsVisible) {
            const gameCanvas = document.getElementById('snakeCanvas');
            if(gameCanvas) gameCanvas.focus();
             // Dacă e vizibil și jocul e "terminat" (over) sau în pauză de sistem, ar trebui să poată fi reluat
            if (gameInstance.isPaused() && !gameInstance.isOver() && !document.getElementById('snakeIntro')?.classList.contains('hidden') === false ) {
                 // Doar resume dacă nu e un intro activ (care are propriul management de pauză)
                 // gameInstance.resume(); // Acest resume poate fi prea agresiv, poate fi gestionat de user cu Space
            }
        }
    } else if (isVisible && !gameInitialized && snakeGameWrapper && startGameButton && snakeGameWrapper.style.display === 'block') {
        if(startGameButton.style.display === 'none') {
            console.log("Tab materiale activ, wrapper joc vizibil, buton start ascuns. Se încearcă inițializarea jocului.")
            gameInstance = initializeSnakeGame();
            if(gameInstance) gameInstance.setGameVisibility(true);
        }
    }
}

// La părăsirea paginii, salvează progresul dacă e cazul sau oprește bucla
window.addEventListener('beforeunload', () => {
    if (gameInstance && !gameInstance.isOver() && gameInitialized) {
        // Poți adăuga aici logica de salvare a stării jocului dacă e complexă
        // De ex., saveAnalytics() ar putea fi apelat aici.
        console.log("Părăsire pagină, se poate salva progresul jocului Snake.");
    }
    if (gameInstance && typeof gameInstance.cleanup === 'function') {
        // gameInstance.cleanup(); // Oprește event listeners etc.
    }
});