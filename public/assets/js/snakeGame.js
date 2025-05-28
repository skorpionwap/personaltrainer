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
    // Ajustare dimensiune canvas pentru mobil, dacă e necesar
    if (window.innerWidth < 600 && canvas.width > 280) { 
        canvas.width = canvas.height = 280; 
    } else if (canvas.width !== 320 || canvas.height !== 320) { // Asigură dimensiunea default dacă nu e mobil
        canvas.width = canvas.height = 320;
    }


    let snake, dir, food, score = 0, mult = 1, highScore = localStorage.getItem('snakeGameHighScore') || 0;
    let baseSpeed = 180; 
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
          save: 'Salvează', export: 'Export PDF', view: 'Vezi Intrări', journalSaved: 'Jurnal salvat!', journalEmpty: 'Jurnalul este gol.', close: 'Închide',
          emotionalSummary: 'Rezumat Emoțional', courageFeedback: '🦁 Mult curaj! Explorează ce te motivează să fii puternic.',
          frustrationFeedback: '🌩️ Ai întâlnit frustrare. Încearcă o pauză sau o respirație profundă.', shieldProtect: 'Scutul a protejat Copilul',
          curaj: 'Curaj', rabdare: 'Răbdare', empatie: 'Empatie Magnet', acceptare: 'Acceptare libertate', frustrare: 'Frustrare',
          motivatie: 'Motivație +5', copil: 'Protejezi Copilul Interior', adult: 'Adult Sănătos', critic: 'Critic Interior',
          abandon: 'Umbra Abandonului', izolare: 'Izolare Socială', shopTitle: 'Magazin Interior', dailyQuest: 'Adună 3 ⭐ Motivație, scrie un gând recunoscător.',
          breathing: 'Exercițiu de respirație: Inhalează 4s, ține 4s, expiră 4s.', reframe: 'Alege o afirmație pozitivă:', stuck: 'Te simți blocat? Încearcă să scrii ce te apasă.',
          levelIntro: 'Nivelul', theme: 'Temă', message: 'Mesaj', purchased: 'achiziționat', insufficientValues: 'Valori insuficiente!', bought: 'Cumpărat',
          pdfNotLoaded: 'Librăria PDF nu este încărcată.', gamePaused: "Joc în Pauză. Apasă Space pentru a relua.", gameResumed: "Joc Reluat!"
        },
        en: {
          score: 'Score', highScore: 'High Score', restart: 'Restart', journal: 'Journal', shop: 'Shop', controls: 'Arrows/WASD – movement • Space – pause • J – journal • R – breathing',
          save: 'Save', export: 'Export PDF', view: 'View Entries', journalSaved: 'Journal saved!', journalEmpty: 'Journal is empty.', close: 'Close',
          emotionalSummary: 'Emotional Summary', courageFeedback: '🦁 Lots of courage! Explore what motivates you to be strong.',
          frustrationFeedback: '🌩️ You encountered frustration. Try a break or deep breathing.', shieldProtect: 'The shield protected the Inner Child',
          curaj: 'Courage', rabdare: 'Patience', empatie: 'Empathy Magnet', acceptare: 'Acceptance Freedom', frustrare: 'Frustration',
          motivatie: 'Motivation +5', copil: 'Protecting the Inner Child', adult: 'Healthy Adult', critic: 'Inner Critic',
          abandon: 'Shadow of Abandonment', izolare: 'Social Isolation', shopTitle: 'Inner Shop', dailyQuest: 'Collect 3 ⭐ Motivation, write a grateful thought.',
          breathing: 'Breathing exercise: Inhale 4s, hold 4s, exhale 4s.', reframe: 'Choose a positive affirmation:', stuck: 'Feeling stuck? Try writing what’s weighing you down.',
          levelIntro: 'Level', theme: 'Theme', message: 'Message', purchased: 'purchased', insufficientValues: 'Insufficient values!', bought: 'Purchased',
          pdfNotLoaded: 'PDF library is not loaded.', gamePaused: "Game Paused. Press Space to resume.", gameResumed: "Game Resumed!"
        }
    };
    const levels = [
        { theme: 'Curaj', message: 'Explorează ce înseamnă să fii curajos. Ce te motivează?', specials: ['curaj', 'motivatie'], obstacles: 1, bgColor: '#ffb347', mechanic: 'fearShrink' },
        { theme: 'Frustrare', message: 'Confruntă frustrarea. Ce te ajută să te calmezi?', specials: ['frustrare', 'rabdare'], obstacles: 2, bgColor: '#ff686b', mechanic: 'rageMode' },
        { theme: 'Empatie', message: 'Conectează-te cu ceilalți. Ce simți când ești empatic?', specials: ['empatie', 'adult'], obstacles: 1, bgColor: '#59a5e0', mechanic: 'cooperative' },
        { theme: 'Acceptare', message: 'Acceptă-ți vulnerabilitățile. Ce te face să te simți liber?', specials: ['acceptare', 'copil'], obstacles: 2, bgColor: '#b388ff', mechanic: 'portals' },
        { theme: 'Criticul Interior', message: 'Înfruntă criticul interior. Ce îți spui pentru a merge mai departe?', specials: ['critic', 'abandon'], obstacles: 0, bgColor: '#d00000', mechanic: 'boss' }
    ];
    const specialsList = [
        { type: 'curaj', symbol: '🦁', color: '#ffb347', value: 'curaj', effect: () => { boost(2, t('curaj')); }, revert: endBoost },
        { type: 'rabdare', symbol: '⏳', color: '#7ed957', value: 'rabdare', effect: () => { slow(t('rabdare')); }, revert: resetSpeed },
        { type: 'empatie', symbol: '💙', color: '#59a5e0', value: 'empatie', effect: () => { magnet = true; flash(t('empatie')); addEffectIcon('💙', 10, false, specialsList.find(s=>s.type==='empatie').revert);}, revert: () => { magnet = false; } },
        { type: 'acceptare', symbol: '🌀', color: '#b388ff', effect: () => { wallPass = true; flash(t('acceptare')); addEffectIcon('🌀', 15, false, specialsList.find(s=>s.type==='acceptare').revert);}, revert: () => { wallPass = false; } },
        { type: 'frustrare', symbol: '🌩️', color: '#ff686b', effect: () => { speedUp(t('frustrare')); }, revert: resetSpeed },
        { type: 'motivatie', symbol: '⭐', color: '#ffe166', effect: () => { score += 5 * mult; updateScore(); flash(t('motivatie')); }, revert: null },
        { type: 'copil', symbol: '👶', color: '#ffd1dc', effect: () => { shield.hits = shield.level; flash(t('copil')); }, revert: () => { shield.hits = 0; } },
        { type: 'adult', symbol: '👦💭', color: '#90e0ef', effect: () => { endNegative(); boost(1.5, t('adult')); }, revert: endBoost },
        { type: 'critic', symbol: '🔨', color: '#d00000', negative: true, effect: () => { invertDirection(); }, revert: null },
        { type: 'abandon', symbol: '🥀', color: '#6d6875', negative: true, effect: () => { shrinkSnake(); }, revert: null },
        { type: 'izolare', symbol: '👤', color: '#5a189a', negative: true, effect: () => { repelFood(); }, revert: null }
    ];
    const shopItemsList = [
        { id: 'shield2', name: 'Scut Copil Lv2', cost: { curaj: 5 }, effect: () => { shield.level = 2; shield.hits = 2; flash(t('Scut Copil Lv2') + ' ' + t('purchased'));} },
        { id: 'slowMotion', name: 'Respirație Liniștitoare', cost: { rabdare: 3 }, effect: () => { slowMotion = true; flash(t('Respirație Liniștitoare') + ' ' + t('purchased')); } },
        { id: 'clarity', name: 'Hartă Claritate', cost: { empatie: 4 }, effect: () => { clarityMap = true; flash(t('Hartă Claritate') + ' ' + t('purchased'));} }
    ];

    function t(key) { return translations[language]?.[key] || key; }

    function spawnFree() {
      let p;
      let attempts = 0;
      const maxAttempts = (canvas.width / box) * (canvas.height / box) * 2; // Evită bucle infinite
      do {
        p = {
          x: Math.floor(Math.random() * (canvas.width / box)) * box,
          y: Math.floor(Math.random() * (canvas.height / box)) * box
        };
        attempts++;
        if (attempts > maxAttempts) {
            console.warn("SpawnFree: Nu s-a găsit o poziție liberă. Canvas plin?");
            // Returnează o poziție default sau gestionează eroarea altfel
            // Încercăm să găsim prima celulă liberă de sus în jos, de la stânga la dreapta
            for (let y = 0; y < canvas.height; y += box) {
                for (let x = 0; x < canvas.width; x += box) {
                    const testPos = {x,y};
                     if (!snake.some(s => s.x === testPos.x && s.y === testPos.y) &&
                        !obstacles.some(o => o.x === testPos.x && o.y === testPos.y) &&
                        (!food || (food.x !== testPos.x || food.y !== testPos.y)) &&
                        (!special || (special.x !== testPos.x || special.y !== testPos.y))) {
                        console.log("SpawnFree: Găsit poziție de fallback:", testPos);
                        return testPos;
                    }
                }
            }
            // Dacă nici așa nu găsește, e o problemă majoră (canvas complet blocat)
            console.error("SpawnFree: Canvas complet blocat, nu se poate genera nimic!");
            return { x: 0, y: 0}; // Poziție de urgență
        }
      } while (
        snake.some(s => s.x === p.x && s.y === p.y) ||
        obstacles.some(o => o.x === p.x && o.y === p.y) ||
        (food && p.x === food.x && p.y === food.y) || // Verifică și food existent
        (special && p.x === special.x && p.y === special.y) // Verifică și special existent
      );
      return p;
    }

    function newFood() { food = spawnFree(); }

    function newSpecial() {
      if (!levels[level]) { // Dacă nivelul nu e definit (ex. modul liber după final)
          const availableSpecials = specialsList.filter(s => !s.isBoss); // Exclude boss-ul din modul liber
          if (availableSpecials.length === 0) return;
          special = Object.assign({}, spawnFree(), availableSpecials[Math.floor(Math.random() * availableSpecials.length)]);
          return;
      }
      const levelSpecialsTypes = levels[level]?.specials || specialsList.map(s => s.type);
      const availableSpecials = specialsList.filter(s => levelSpecialsTypes.includes(s.type));
      if (availableSpecials.length === 0) return;
      special = Object.assign({}, spawnFree(), availableSpecials[Math.floor(Math.random() * availableSpecials.length)]);
    }

    function spawnObstacle() { obstacles.push(spawnFree()); }

    function updateScore() {
      if (scoreEl) scoreEl.textContent = score;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeGameHighScore', highScore);
        if (highScoreEl) highScoreEl.textContent = highScore;
      }
      analytics.current.score = score;
    }

    function updateValues() {
        if(valueEls.empatie) valueEls.empatie.textContent = values.empatie;
        if(valueEls.curaj) valueEls.curaj.textContent = values.curaj;
        if(valueEls.rabdare) valueEls.rabdare.textContent = values.rabdare;
    }

    function flash(text, duration = 2000, type = '') { // Adăugat 'type' pentru stilizare
      if(!effectEl) return;
      effectEl.innerHTML = text;
      effectEl.className = 'game-effect'; // Resetare clasă
      if (type === 'positive') effectEl.classList.add('positive');
      else if (type === 'negative') effectEl.classList.add('negative');
      
      effectEl.style.opacity = 1;
      effectEl.style.transform = 'translate(-50%, -50%) scale(1)';
      setTimeout(() => {
          if(effectEl) {
            effectEl.style.opacity = 0;
            effectEl.style.transform = 'translate(-50%, -50%) scale(0.8)';
          }
      }, duration);
    }

    function changeSpeed(newSpeedValue) { // Modificat pentru a seta o valoare, nu un factor
        speed = Math.max(40, Math.min(300, newSpeedValue));
    }
    function resetSpeed() { changeSpeed(baseSpeed); activeColor = null; }
    function boost(factor, label) { mult = factor; activeColor = '#ffb347'; flash(`${label}!`, 2000, 'positive'); addEffectIcon('🚀', 5, false, endBoost); }
    function endBoost() { mult = 1; activeColor = null; }
    function speedUp(label) { changeSpeed(speed * 0.7); activeColor = '#ff686b'; flash(`${label}!`, 2000, 'negative'); addEffectIcon('⚡', 5, false, resetSpeed); } // Adăugat revert la addEffectIcon
    function slow(label) { changeSpeed(speed * 1.7); activeColor = '#7ed957'; flash(`${label}!`, 2000, 'positive'); addEffectIcon('🐢', 5, false, resetSpeed); } // Adăugat revert la addEffectIcon
    function endNegative() { 
        effects.filter(e => e.neg).forEach(e => {
            const s = document.getElementById(e.id);
            if (s) s.remove();
        });
        effects = effects.filter(e => !e.neg); 
    }

    function invertDirection() {
      if (dir === 'LEFT') dir = 'RIGHT'; else if (dir === 'RIGHT') dir = 'LEFT';
      else if (dir === 'UP') dir = 'DOWN'; else if (dir === 'DOWN') dir = 'UP';
      // Nu adăugăm icon pentru că e instantaneu și negativ, dar facem flash
      flash(t('critic'), 1500, 'negative');
    }
    function shrinkSnake() {
      snake.length = Math.max(1, snake.length - 3);
      flash(t('abandon'), 1500, 'negative');
    }
    function repelFood() {
      repelCountdown = 10 * (1000 / speed); // ~10 secunde efective
      flash(t('izolare'), 1500, 'negative');
    }

    function addEffectIcon(sym, dur = 5, isNegative = false, revertFn = null) {
      if(!statusBar) return 'no-status-bar';
      const effectIdLocal = 'effectIcon' + (++effectId);
      const span = document.createElement('div'); // Schimbat în div pentru a conține mai bine
      span.className = 'stat-effect' + (isNegative ? ' neg-effect' : '');
      span.id = effectIdLocal;
      
      const symbolSpan = document.createElement('span');
      symbolSpan.textContent = sym;
      span.appendChild(symbolSpan);

      const barContainer = document.createElement('div');
      barContainer.className = 'effect-bar-container';
      const bar = document.createElement('div'); 
      bar.className = 'effect-bar'; 
      barContainer.appendChild(bar);
      span.appendChild(barContainer);
      
      statusBar.appendChild(span);
      
      // Stocăm informațiile necesare în array-ul effects
      effects.push({ 
          id: effectIdLocal, 
          duration: dur, 
          timeLeft: dur, 
          revert: revertFn, 
          isNegative: isNegative,
          symbol: sym // Stocăm simbolul pentru identificare în tickEffects dacă e nevoie
      });
      return effectIdLocal;
    }

    function tickEffects() {
        if (!statusBar) return;
        for (let i = effects.length - 1; i >= 0; i--) { // Iterăm invers pentru a putea șterge elemente
            const effect = effects[i];
            const effectElement = document.getElementById(effect.id);

            if (!effectElement) { // Dacă elementul DOM nu mai există, curățăm efectul
                effects.splice(i, 1);
                continue;
            }

            effect.timeLeft -= (speed / 1000); // Timpul scade în funcție de viteza jocului

            const barElement = effectElement.querySelector('.effect-bar');
            if (barElement) {
                barElement.style.width = Math.max(0, (effect.timeLeft / effect.duration)) * 100 + '%';
            }

            if (effect.timeLeft <= 0) {
                effectElement.remove();
                if (effect.revert) {
                    effect.revert();
                }
                effects.splice(i, 1);
            }
        }
    }
    
    function spawnParticles(x, y, color) {
      for (let i = 0; i < 10; i++) {
        particles.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, alpha: 1, color });
      }
    }

    function applyLevelMechanics() {
        if (level >= levels.length) { // Mod liber după ultimul nivel
            canvas.style.backgroundColor = '#1d2230'; // Fundal default
            canvas.style.transform = 'scale(1)';
            return;
        }
        const currentLevelData = levels[level];
        const mechanic = currentLevelData.mechanic;

        canvas.style.transition = 'transform 0.5s ease-in-out, background-color 0.5s ease-in-out';
        canvas.style.backgroundColor = currentLevelData.bgColor || '#1d2230';
        canvas.style.transform = 'scale(1)';

        if (mechanic === 'fearShrink') {
            canvas.style.transform = 'scale(0.9)';
            setTimeout(() => { if(canvas) canvas.style.transform = 'scale(1)'; }, 5000);
        } else if (mechanic === 'rageMode' && collected.frustrare > 0) {
            specialsList.find(s => s.type === 'frustrare')?.effect();
        } else if (mechanic === 'cooperative') {
            flash("Mod cooperativ (placeholder)!", 2000, 'positive');
        } else if (mechanic === 'portals') {
            const portalEffect = specialsList.find(s => s.type === 'acceptare');
            if (portalEffect) portalEffect.effect(); // Activează și adaugă icon prin effect()
        } else if (mechanic === 'boss') {
            obstacles = [];
            special = { 
                type: 'critic', symbol: 'BOSS 🔨', color: '#d00000', 
                x: Math.floor(canvas.width / 2 / box) * box, 
                y: Math.floor(canvas.height / 2 / box) * box, 
                negative: true, isBoss: true, bossHits: 3 
            };
            flash("Înfruntă CRITICUL INTERIOR!", 3000, 'negative');
        }
    }

    function toggleJournalModal() {
        if (paused && !journalModal.classList.contains('hidden')) {
            journalModal.classList.add('hidden');
            viewJournalContentEl.classList.add('hidden');
        } else {
            paused = true;
            journalModal.classList.remove('hidden');
            shopModal.classList.add('hidden');
            minigameModal.classList.add('hidden');
            journalEntry.focus();
        }
    }
    saveJournal.onclick = () => {
      const entry = journalEntry.value.trim();
      if (entry) {
        journalEntries.push({ date: new Date().toLocaleString(), text: entry });
        localStorage.setItem('snakeGameJournal', JSON.stringify(journalEntries));
        journalEntry.value = '';
        flash(t('journalSaved'), 1500, 'positive');
        if (!viewJournalContentEl.classList.contains('hidden')) displayJournalEntries();
      }
    };
    exportJournal.onclick = () => {
      if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
          flash(t('pdfNotLoaded'), 2000, 'negative');
          console.error("jsPDF is not loaded.");
          return;
      }
      const { jsPDF } = jspdf;
      const doc = new jsPDF();
      doc.text(t('Jurnal Emoțional') + " (Snake Game)", 10, 10);
      let y = 20;
      journalEntries.forEach(entryObj => {
        const lines = doc.splitTextToSize(`${entryObj.date}: ${entryObj.text}`, 180);
        lines.forEach(line => {
            if (y > 280) { doc.addPage(); y = 10; }
            doc.text(line, 10, y);
            y += 7;
        });
        y += 3;
      });
      doc.save('jurnal_snake_emotional.pdf');
    };
    function displayJournalEntries() {
        viewJournalContentEl.innerHTML = journalEntries.length > 0
            ? journalEntries.map(e => `<div class="mb-2 p-2 border-b border-gray-500"><strong>${e.date}:</strong><p class="whitespace-pre-wrap">${e.text}</p></div>`).join('')
            : `<p>${t('journalEmpty')}</p>`;
        viewJournalContentEl.classList.remove('hidden');
    }
    viewJournal.onclick = () => {
        if(viewJournalContentEl.classList.contains('hidden')) {
            displayJournalEntries();
        } else {
            viewJournalContentEl.classList.add('hidden');
        }
    };
    closeJournalModalBtn.onclick = () => {
        journalModal.classList.add('hidden');
        viewJournalContentEl.classList.add('hidden');
        // Nu relua jocul automat
    };

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
                // Folosește clasele definite în snakeGame.css pentru butoanele de shop
                btn.className = 'shop-item-btn'; // Clasa generală
                // Poți adăuga culori specifice dacă vrei, dar clasa generală ar trebui să fie suficientă
                // btn.classList.add('bg-blue-500', 'hover:bg-blue-600'); // Exemplu

                let purchased = false; // Verifică dacă itemul a fost deja "cumpărat" (ex. slowMotion e true)
                if (item.id === 'slowMotion' && slowMotion) purchased = true;
                if (item.id === 'clarity' && clarityMap) purchased = true;
                if (item.id === 'shield2' && shield.level >= 2) purchased = true;


                btn.innerHTML = `
                    <div>${t(item.name) || item.name} ${purchased ? `<span class="text-xs text-green-300">(${t('bought')})</span>` : ''}</div>
                    <div class="shop-item-cost">Cost: ${Object.entries(item.cost).map(([k, v]) => `${v} ${t(k) || k}`).join(', ')}</div>
                `;
                btn.disabled = purchased;

                btn.onclick = () => {
                    if (purchased) return; // Nu face nimic dacă e deja cumpărat

                    if (Object.entries(item.cost).every(([k, v]) => values[k] >= v)) {
                        Object.entries(item.cost).forEach(([k, v]) => values[k] -= v);
                        item.effect(); // Efectul ar trebui să facă flash singur
                        updateValues();
                        // Nu mai facem flash aici, lăsăm funcția item.effect() să o facă
                        // flash(`${t(item.name) || item.name} ${t('purchased')}!`, 1500, 'positive');
                        
                        // Actualizează butonul pentru a reflecta achiziția
                        btn.disabled = true;
                        // Re-randează textul butonului pentru a include (Cumpărat)
                        btn.innerHTML = `
                            <div>${t(item.name) || item.name} <span class="text-xs text-green-300">(${t('bought')})</span></div>
                            <div class="shop-item-cost">Cost: ${Object.entries(item.cost).map(([k, v]) => `${v} ${t(k) || k}`).join(', ')}</div>
                        `;
                    } else {
                        flash(t('insufficientValues'), 1500, 'negative');
                    }
                };
                shopItemsEl.appendChild(btn);
            });
        }
    }
    if (closeShopModalBtn) closeShopModalBtn.onclick = () => shopModal.classList.add('hidden');


    function startBreathing() {
        paused = true; 
        breathingActive = true;
        journalModal.classList.add('hidden');
        shopModal.classList.add('hidden');
        minigameModal.classList.remove('hidden');
        minigameContentEl.innerHTML = `<h4 class="text-lg text-yellow-200 mb-3">${t('breathing')}</h4><div id="breathBar" class="h-4 bg-gray-600 rounded-full overflow-hidden"><div id="breathProgress" class="h-full bg-green-500 rounded-full transition-all duration-100 ease-linear" style="width: 0%"></div></div> <p id="breathPhase" class="mt-2 text-gray-300">Inspiră...</p>`;
        
        let phase = 0; // 0: inhale, 1: hold, 2: exhale
        let timeInPhase = 0;
        const durationPerSegment = 4; // secunde
        let cyclesCompleted = 0; 
        const totalCyclesToComplete = 3; 

        const breathProgressEl = document.getElementById('breathProgress');
        const breathPhaseEl = document.getElementById('breathPhase');
        let animationFrameIdBreath;

        function updateBreath(currentTime) {
            if (!breathingActive || !breathProgressEl || !breathPhaseEl) {
                if (animationFrameIdBreath) cancelAnimationFrame(animationFrameIdBreath);
                return;
            }

            // Folosește delta time pentru o animație mai lină, dacă e posibil
            // Momentan, simplificăm cu 0.016s per frame (aprox 60fps)
            timeInPhase += 0.016 * (speed / baseSpeed) ; // Ajustează viteza respirației cu viteza jocului? Sau las-o constantă.
                                                      // Pentru simplitate, o lăsăm constantă (eliminăm `* (speed/baseSpeed)`)
            // timeInPhase += 0.016; // Aproximare pentru delta time

            let progressPercent = (timeInPhase / durationPerSegment) * 100;

            if (phase === 0) { 
                if(breathPhaseEl) breathPhaseEl.textContent = t("Inspiră...");
                if(breathProgressEl) {
                    breathProgressEl.style.width = `${Math.min(progressPercent, 100)}%`;
                    breathProgressEl.style.backgroundColor = '#4ade80';
                }
            } else if (phase === 1) { 
                if(breathPhaseEl) breathPhaseEl.textContent = t("Menține...");
                if(breathProgressEl) {
                    breathProgressEl.style.width = `100%`; 
                    breathProgressEl.style.backgroundColor = '#facc15';
                }
            } else { 
                if(breathPhaseEl) breathPhaseEl.textContent = t("Expiră...");
                if(breathProgressEl) {
                    breathProgressEl.style.width = `${Math.max(100 - progressPercent, 0)}%`;
                    breathProgressEl.style.backgroundColor = '#60a5fa';
                }
            }

            if (timeInPhase >= durationPerSegment) {
                timeInPhase = 0;
                phase = (phase + 1) % 3;
                const phaseTextEl = document.getElementById('breathPhase'); // Re-query în caz că DOM-ul s-a schimbat
                if (phase === 0 && phaseTextEl && phaseTextEl.textContent.includes(t("Expiră"))) { 
                    cyclesCompleted++;
                    if (cyclesCompleted >= totalCyclesToComplete) {
                        breathingActive = false;
                        if(minigameModal) minigameModal.classList.add('hidden');
                        paused = false; 
                        flash(t('Respirație completă! Te simți mai calm?'), 2000, 'positive');
                        lastTime = performance.now(); 
                        requestAnimationFrame(gameLoop); 
                        if (animationFrameIdBreath) cancelAnimationFrame(animationFrameIdBreath);
                        return;
                    }
                }
            }
            if (breathingActive) animationFrameIdBreath = requestAnimationFrame(updateBreath);
        }
        animationFrameIdBreath = requestAnimationFrame(updateBreath);
    }

    function startReframe() {
      paused = true;
      journalModal.classList.add('hidden');
      shopModal.classList.add('hidden');
      minigameModal.classList.remove('hidden');
      const affirmations = ['Sunt capabil să învăț din greșeli.', 'Îmi accept limitele cu blândețe.', 'Fiecare pas contează.', 'Pot gestiona această provocare.', 'Aleg să fiu bun cu mine.'];
      minigameContentEl.innerHTML = `<h4 class="text-lg text-yellow-200 mb-3">${t('reframe')}</h4>` +
        affirmations.map((a, i) =>
          `<button class="block w-full text-left my-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 affirmation-btn">${t(a) || a}</button>`
        ).join('');

      document.querySelectorAll('#snakeMinigameContent .affirmation-btn').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('#snakeMinigameContent .affirmation-btn').forEach(b => {
                b.disabled = true;
                b.classList.add("opacity-50", "cursor-not-allowed");
            });
            flash(`"${btn.textContent}" - ${t('Excelent!')}`, 2000, 'positive');
            setTimeout(() => {
                minigameModal.classList.add('hidden');
                paused = false;
                lastTime = performance.now();
                requestAnimationFrame(gameLoop);
            }, 1500);
        };
      });
    }
    if (closeMinigameModalBtn) {
        closeMinigameModalBtn.onclick = () => {
          breathingActive = false; 
          minigameModal.classList.add('hidden');
          // Nu relua jocul automat
        };
    }


    function setLanguage(lang) {
        language = lang;
        const scoreLabel = scoreEl?.parentNode?.firstChild;
        if(scoreLabel && scoreLabel.nodeType === Node.TEXT_NODE) scoreLabel.textContent = `${t('score')}: `;
        
        const highScoreLabel = highScoreEl?.parentNode?.firstChild;
         if(highScoreLabel && highScoreLabel.nodeType === Node.TEXT_NODE) {
            // highScoreEl.parentNode.childNodes[0] este textul "Maxim: "
            // highScoreEl.parentNode.childNodes[1] este span#snakeHighScore
            // highScoreEl.parentNode.childNodes[2] este textul " | "
            // Este complicat să țintești doar "Maxim: ". Mai simplu e să refaci tot.
             const currentHighScore = highScoreEl.textContent;
             highScoreEl.parentNode.innerHTML = `${t('highScore')}: <span id="snakeHighScore">${currentHighScore}</span>`;
             // Re-selectează highScoreEl deoarece innerHTML l-a recreat
             // highScoreEl = document.getElementById('snakeHighScore'); // Nu e nevoie, deoarece doar textContent se schimbă
        }


        if(restartBtn) restartBtn.textContent = t('restart');
        if(journalBtn) journalBtn.textContent = t('journal');
        if(shopBtn) shopBtn.textContent = t('shop');
        if(controlsEl) controlsEl.textContent = t('controls');

        const journalModalTitle = journalModal.querySelector('h3');
        if(journalModalTitle) journalModalTitle.textContent = t('Jurnal Emoțional (Joc)');
        if(journalEntry) journalEntry.placeholder = t('Notează-ți gândurile din timpul jocului...');
        if(saveJournal) saveJournal.textContent = t('save');
        if(exportJournal) exportJournal.textContent = t('export');
        if(viewJournal) viewJournal.textContent = t('view');
        if(closeJournalModalBtn) closeJournalModalBtn.textContent = t('close');

        const shopModalTitle = shopModal.querySelector('h3');
        if(shopModalTitle) shopModalTitle.textContent = t('shopTitle') + " (Joc)";
        if(closeShopModalBtn) closeShopModalBtn.textContent = t('close');
        
        if(closeMinigameModalBtn) closeMinigameModalBtn.textContent = t('close');

        if(langBtn) {
            langBtn.textContent = lang === 'ro' ? 'English' : 'Română';
            langBtn.setAttribute('aria-label', lang === 'ro' ? 'Switch to English' : 'Schimbă în Română');
        }
        if (introEl && !introEl.classList.contains('hidden') && level < levels.length && levels[level]) {
             introEl.innerHTML = `<strong>${t(levels[level].theme)}</strong><br>${t(levels[level].message)}<br>${t('dailyQuest')}`;
        } else if (introEl && !introEl.classList.contains('hidden') && level >= levels.length) {
            introEl.innerHTML = t("Felicitări! Ai finalizat toate provocările emoționale! Poți continua să joci în modul liber.");
        }
    }
    if(langBtn) langBtn.onclick = () => setLanguage(language === 'ro' ? 'en' : 'ro');

    function saveAnalytics() {
        analytics.current.time = Date.now();
        analytics.current.values = { ...values };
        analytics.current.finalLevel = level; // Adaugă nivelul final
        analytics.sessions.push({ ...analytics.current });
        localStorage.setItem('snakeGameAnalytics', JSON.stringify(analytics.sessions));
        console.log("Snake game analytics saved to localStorage.");
    }
    function checkStuck() {
        if (collected.abandon >= 2 && collected.izolare >=1 && score < 15 ) { // Condiție ajustată
            flash(t('stuck'), 3000, 'negative');
            setTimeout(() => { 
                if (journalModal.classList.contains('hidden')) toggleJournalModal();
            }, 1500);
        }
    }
    function loadCustomMap(jsonString) { 
        try {
            const map = JSON.parse(jsonString); 
            obstacles = map.obstacles || [];
            if (level < levels.length && map.specials && levels[level]) {
                 levels[level].specials = map.specials;
            }
            flash('Hartă personalizată încărcată!', 1500, 'positive');
        } catch (e) {
            console.error("Eroare la încărcarea hărții personalizate:", e);
            flash('Harta invalidă sau eroare la parsare!', 2000, 'negative');
        }
    }

    function fullResetGame(isInitialReset = false) {
        snake = [{ x: 7 * box, y: 7 * box }];
        dir = 'RIGHT';
        score = 0; 
        values = { empatie: 0, curaj: 0, rabdare: 0 }; 
        level = 0; 
        
        shield.level = 1; 
        slowMotion = false; 
        clarityMap = false;

        mult = 1;
        speed = baseSpeed; 
        wallPass = magnet = false;
        shield.hits = shield.level;
        activeColor = null;
        over = false;
        if (isInitialReset) paused = true; // Pauză inițială pentru primul intro

        special = null;
        effects = []; 
        particles = [];
        obstacles = [];
        if (statusBar) statusBar.innerHTML = '';

        for (let k in collected) collected[k] = 0;
        analytics.current = { score: 0, values: {}, obstacles: [], time: Date.now() };

        updateScore();
        updateValues();
        newFood();
        if(Math.random() < 0.1) newSpecial();

        if(restartBtn) restartBtn.classList.add('hidden');

        if (levels.length > 0 && levels[level]) {
            const currentLvlData = levels[level]; 
            if(introEl) {
                introEl.innerHTML = `<strong>${t(currentLvlData.theme)}</strong><br>${t(currentLvlData.message)}<br><small>${t('dailyQuest')}</small>`;
                introEl.classList.remove('hidden');
            }
            // paused este deja true dacă isInitialReset e true
            setTimeout(() => {
                if(introEl) introEl.classList.add('hidden');
                if (isInitialReset || (!isInitialReset && paused) ) paused = false; // Reluare după intro
                applyLevelMechanics(); 
                 if (gameVisibleAndActive && !over) {
                    lastTime = performance.now(); 
                    requestAnimationFrame(gameLoop);
                 }
            }, isInitialReset ? 3000 : 2000); // Delay mai mare pentru intro-ul inițial

            for (let i = 0; i < (currentLvlData.obstacles || 0); i++) spawnObstacle();
        } else {
             if(introEl) {
                introEl.innerHTML = "Nu sunt nivele definite. Joc în mod liber.";
                introEl.classList.remove('hidden');
             }
             paused = true; // Pauză și aici pentru intro
             setTimeout(() => {
                if(introEl) introEl.classList.add('hidden');
                paused = false;
                if (gameVisibleAndActive && !over) {
                    lastTime = performance.now();
                    requestAnimationFrame(gameLoop);
                }
            }, 1500);
        }
        if (!isInitialReset) lastTime = performance.now(); 
    }

    function transitionToNextLevel() {
        paused = true; 

        obstacles = [];
        special = null;
        
        newFood();
        if (Math.random() < 0.2) newSpecial();

        if (level < levels.length && levels[level]) { 
            const currentLvlData = levels[level];
            if (introEl) {
                introEl.innerHTML = `<strong>${t('levelIntro')} ${level + 1}: ${t(currentLvlData.theme)}</strong><br>${t(currentLvlData.message)}`;
                introEl.classList.remove('hidden');
            }
            
            setTimeout(() => {
                if (introEl) introEl.classList.add('hidden');
                paused = false;
                applyLevelMechanics(); 
                obstacles = []; 
                for (let i = 0; i < (currentLvlData.obstacles || 0); i++) spawnObstacle();
                
                lastTime = performance.now(); 
                if (gameVisibleAndActive && !over) requestAnimationFrame(gameLoop);
            }, 3000); 
        } else {
            if (introEl) {
                introEl.innerHTML = t("Felicitări! Ai finalizat toate provocările emoționale! Poți continua să joci în modul liber.");
                introEl.classList.remove('hidden');
            }
            setTimeout(() => {
                if (introEl) introEl.classList.add('hidden');
                paused = false;
                canvas.style.backgroundColor = '#1d2230'; 
                canvas.style.transform = 'scale(1)';
                obstacles = []; 
                for (let i = 0; i < 3; i++) spawnObstacle(); 
                lastTime = performance.now();
                if (gameVisibleAndActive && !over) requestAnimationFrame(gameLoop);
            }, 3000);
        }
        updateValues(); 
    }

    function draw() {
        if (!ctx || !canvas) return;
        const currentBgColor = (level < levels.length && levels[level]?.bgColor) ? levels[level].bgColor : '#1d2230';
        const gradientEndColor = '#293446'; 
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, currentBgColor);
        gradient.addColorStop(1, gradientEndColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        snake.forEach((seg, i) => {
          ctx.fillStyle = i === 0 ? (activeColor || (shield.hits > 0 ? '#ffd1dc' : '#36a26b')) : '#88dab2';
          ctx.strokeStyle = '#232c37';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (ctx.roundRect) {
             ctx.roundRect(seg.x, seg.y, box, box, box / 3.5);
          } else { ctx.rect(seg.x, seg.y, box, box); }
          ctx.fill();
          ctx.stroke();
          if (i === 0) {
            ctx.fillStyle = 'white';
            const eyeRadius = box / 6;
            let eye1X, eye1Y, eye2X, eye2Y;
            let pupilOffsetX = 0, pupilOffsetY = 0;
            if (dir === 'LEFT' || dir === 'RIGHT') {
                eye1Y = seg.y + box / 3.5; eye2Y = seg.y + box - box / 3.5;
                eye1X = seg.x + box / 2; eye2X = seg.x + box / 2;
                if (dir === 'LEFT') pupilOffsetX = -eyeRadius / 2.2;
                if (dir === 'RIGHT') pupilOffsetX = eyeRadius / 2.2;
            } else { 
                eye1X = seg.x + box / 3.5; eye2X = seg.x + box - box / 3.5;
                eye1Y = seg.y + box / 2; eye2Y = seg.y + box / 2;
                if (dir === 'UP') pupilOffsetY = -eyeRadius / 2.2;
                if (dir === 'DOWN') pupilOffsetY = eyeRadius / 2.2;
            }
            ctx.beginPath(); ctx.arc(eye1X, eye1Y, eyeRadius, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(eye2X, eye2Y, eyeRadius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'black'; 
            ctx.beginPath(); ctx.arc(eye1X + pupilOffsetX, eye1Y + pupilOffsetY, eyeRadius / 1.8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(eye2X + pupilOffsetX, eye2Y + pupilOffsetY, eyeRadius / 1.8, 0, Math.PI * 2); ctx.fill();
          }
        });

        if (food) {
            ctx.fillStyle = '#34D399'; 
            ctx.beginPath();
            ctx.arc(food.x + box / 2, food.y + box / 2, box / 2.8, 0, Math.PI * 2); 
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(food.x + box / 2.5, food.y + box / 2.5, box / 8, 0, Math.PI * 2);
            ctx.fill();
        }

        if (special) {
          ctx.font = `${box-2}px Arial`; 
          ctx.fillStyle = special.color;
          ctx.textAlign = 'center'; 
          ctx.textBaseline = 'middle'; 
          ctx.fillText(special.symbol, special.x + box / 2, special.y + box / 2 +1); // Ajustare fină
          ctx.textAlign = 'left'; 
          ctx.textBaseline = 'alphabetic'; 
        }

        obstacles.forEach(o => {
          ctx.fillStyle = clarityMap ? 'rgba(255,0,0,0.4)' : '#c70000'; 
          ctx.fillRect(o.x, o.y, box, box);
          ctx.strokeStyle = '#500000'; 
          ctx.strokeRect(o.x, o.y, box, box);
        });

        particles.forEach(p => {
          ctx.globalAlpha = p.alpha; 
          ctx.fillStyle = p.color; 
          ctx.fillRect(p.x - 2, p.y - 2, 5, 5); 
          ctx.globalAlpha = 1.0; 
          p.x += p.vx; p.y += p.vy; p.alpha -= 0.025; 
        });
        particles = particles.filter(p => p.alpha > 0);
    }

    function gameLoop(timestamp) {
        if (!gameVisibleAndActive) return; // Oprește complet dacă nu e vizibil
        if (paused || over) { // Dacă e pauzat sau game over, dar vizibil, doar desenează
             if(!over) draw(); // Desenează doar dacă nu e game over (pentru a nu redesena mesajul de game over continuu)
            return; 
        }

        if (timestamp - lastTime >= speed) {
            update();
            lastTime = timestamp;
        }
        draw();
        requestAnimationFrame(gameLoop); 
    }

    function update() {
        if (over || paused) return; // Dublă verificare

        tickEffects();
        const head = { x: snake[0].x, y: snake[0].y };

        if (dir === 'LEFT') head.x -= box;
        else if (dir === 'RIGHT') head.x += box;
        else if (dir === 'UP') head.y -= box;
        else if (dir === 'DOWN') head.y += box;

        if (magnet && food) {
            const dx = food.x - head.x;
            const dy = food.y - head.y;
            if (Math.abs(dx) < box * 4 && Math.abs(dy) < box * 4) {
                if (Math.abs(dx) > box / 2) food.x -= Math.sign(dx) * (box / 2);
                if (Math.abs(dy) > box / 2) food.y -= Math.sign(dy) * (box / 2);
                food.x = Math.max(0, Math.min(canvas.width - box, Math.round(food.x / (box/2)) * (box/2) ));
                food.y = Math.max(0, Math.min(canvas.height - box, Math.round(food.y / (box/2)) * (box/2) ));
            }
        }
        if (repelCountdown > 0 && food) {
            repelCountdown--;
            if (head.x === food.x && head.y === food.y) { repelCountdown = 0; }
            else {
                const dx = food.x - head.x; const dy = food.y - head.y;
                if (Math.abs(dx) < box * 3 && Math.abs(dy) < box * 3) {
                    let newFoodX = food.x; let newFoodY = food.y;
                    if (head.x < food.x && food.x < canvas.width - box) newFoodX += box;
                    else if (head.x > food.x && food.x > 0) newFoodX -= box;
                    if (head.y < food.y && food.y < canvas.height - box) newFoodY += box;
                    else if (head.y > food.y && food.y > 0) newFoodY -= box;
                    let canMove = !snake.some(s => s.x === newFoodX && s.y === newFoodY) &&
                                  !obstacles.some(o => o.x === newFoodX && o.y === newFoodY);
                    if (canMove) {
                        food.x = Math.max(0, Math.min(canvas.width - box, newFoodX));
                        food.y = Math.max(0, Math.min(canvas.height - box, newFoodY));
                    }
                }
            }
        }

        if (wallPass) {
            if (head.x < 0) head.x = canvas.width - box;
            else if (head.x >= canvas.width) head.x = 0;
            if (head.y < 0) head.y = canvas.height - box;
            else if (head.y >= canvas.height) head.y = 0;
        } else if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
            return gameOver();
        }

        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) return gameOver();
        }
        for (let o of obstacles) {
            if (head.x === o.x && head.y === o.y) return gameOver();
        }

        if (food && head.x === food.x && head.y === food.y) {
            score += mult; 
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
                flash(`${t('Lovitură Critic!')} ${t('Mai are')} ${sp.bossHits} ${t('vieți')}.`, 2000, 'negative');
                if (sp.bossHits <= 0) {
                    flash(t("CRITICUL INTERIOR A FOST ÎNVINS! Felicitări!"), 3000, 'positive');
                    score += 50 * mult; 
                    updateScore(); 
                    level++; 
                    transitionToNextLevel(); // Va gestiona și cazul când e ultimul nivel
                } else {
                    special = sp; // Boss-ul rămâne până e învins
                }
            } else if (sp.negative && shield.hits > 0) { 
                shield.hits--;
                flash(t('shieldProtect') + ` (${shield.hits} ${t('lovituri rămase')})`, 2000, 'positive');
                spawnParticles(sp.x + box/2, sp.y + box/2, '#FFFFFF');
            } else {
                if (sp.type) collected[sp.type] = (collected[sp.type] || 0) + 1;
                analytics.current.obstacles.push(sp.type);
                if (sp.value && values.hasOwnProperty(sp.value)) values[sp.value]++;
                
                const effectDetails = specialsList.find(s => s.type === sp.type);
                if (effectDetails && effectDetails.effect) {
                     effectDetails.effect(); // Efectul va face flash și va adăuga icon dacă e cazul
                }
                spawnParticles(sp.x + box / 2, sp.y + box / 2, sp.color);
                navigator.vibrate?.(100);
                if (sp.type === 'critic' && !sp.isBoss) startReframe();
            }
            updateValues();
            checkStuck();
        }
        snake.unshift(head);

        if (levels && levels[level] && level < levels.length -1 && 
            (!special || !special.isBoss) && 
            score >= (level + 1) * (15 + level * 3) ) { 
            level++; 
            transitionToNextLevel(); 
        }
    }

    function gameOver() {
        if (over) return;
        over = true;
        paused = true; 
        
        let raport = `<strong class="text-lg">${t('emotionalSummary')}:</strong><br>`;
        if (collected.curaj > 3) raport += `<span class="text-yellow-400">${t('courageFeedback')}</span><br>`;
        if (collected.frustrare > 2) raport += `<span class="text-red-400">${t('frustrationFeedback')}</span><br>`;
        raport += `🦁${collected.curaj} ⏳${collected.rabdare} 💙${collected.empatie} 🌀${collected.acceptare}<br>`;
        raport += `👶${collected.copil} 👦${collected.adult} 🔨${collected.critic} 🥀${collected.abandon} 👤${collected.izolare} ⭐${collected.motivatie}`;
        flash(raport, 5000);

        if(restartBtn) {
            restartBtn.classList.remove('hidden');
            restartBtn.onclick = () => { // Asigură că handlerul e reatașat corect
                fullResetGame(false);
            };
        }
        saveAnalytics();
    }

    function handleKeyDown(e) {
        if (!gameVisibleAndActive || over || breathingActive) return; 
        const k = e.key.toLowerCase();

        if (k === ' ' || k === 'p') { 
            e.preventDefault();
            if (paused && ( !journalModal.classList.contains('hidden') || 
                             !shopModal.classList.contains('hidden') || 
                             !minigameModal.classList.contains('hidden')) ) { 
                // Dacă un modal e deschis, Space nu face nimic (se închid cu Esc sau butoanele lor)
                // Sau, specific, dacă jurnalul e deschis, îl închide:
                // if (!journalModal.classList.contains('hidden')) toggleJournalModal();
                return; 
            }
            else { 
                paused = !paused;
                if (paused) {
                    flash(t('gamePaused'), 2000);
                } else {
                    flash(t('gameResumed'), 1000, 'positive');
                    lastTime = performance.now(); 
                    requestAnimationFrame(gameLoop); 
                }
            }
            return;
        }
        if (k === 'escape') { // Închide modalele cu Escape
            if (!journalModal.classList.contains('hidden')) { toggleJournalModal(); return; }
            if (!shopModal.classList.contains('hidden')) { toggleShopModal(); return; }
            if (!minigameModal.classList.contains('hidden')) { 
                breathingActive = false; // Oprește respirația dacă era activă
                minigameModal.classList.add('hidden'); 
                // Nu relua automat, lasă Space
                return; 
            }
        }

        if (k === 'j') { e.preventDefault(); toggleJournalModal(); return; }
        if (k === 'm') { e.preventDefault(); toggleShopModal(); return; }
        if (k === 'r' && slowMotion && !breathingActive) {
            e.preventDefault();
            startBreathing();
            slowMotion = false; 
            // Actualizează shop-ul dacă e deschis pentru a reflecta itemul consumat
            if (!shopModal.classList.contains('hidden')) toggleShopModal(); // Închide și redeschide pentru refresh
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
    canvas.addEventListener('touchstart', e => { 
        if (!gameVisibleAndActive || paused || over || breathingActive) return;
        e.preventDefault(); 
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        if (!gameVisibleAndActive || paused || over || breathingActive || !e.touches.length) return;
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        const threshold = 15; // Redus pragul pentru sensibilitate mai mare

        if (Math.abs(dx) > Math.abs(dy)) { 
            if (dx > threshold && dir !== 'LEFT') { dir = 'RIGHT'; resetTouch(); }
            else if (dx < -threshold && dir !== 'RIGHT') { dir = 'LEFT'; resetTouch(); }
        } else { 
            if (dy > threshold && dir !== 'UP') { dir = 'DOWN'; resetTouch(); }
            else if (dy < -threshold && dir !== 'DOWN') { dir = 'UP'; resetTouch(); }
        }
    }, { passive: false });

    function resetTouch() { 
        // Obține ultimele coordonate valide pentru a evita saltul la 0,0
        // Dar pentru simplitate, resetăm la 0 și lăsăm următorul touchstart să le seteze
        touchStartX = 0; 
        touchStartY = 0;
    }
    
    // Atașare event listeners pentru butoanele principale din joc
    if(restartBtn) restartBtn.onclick = () => fullResetGame(false);
    if(journalBtn) journalBtn.onclick = toggleJournalModal;
    if(shopBtn) shopBtn.onclick = toggleShopModal;

    if (canvas) canvas.focus();
    setLanguage('ro'); 
    fullResetGame(true); 

    gameInitialized = true;
    console.log("Instanța jocului Snake a fost inițializată complet.");

    gameInstance = {
        pause: () => {
            if (!over && !paused) { // Pauzează doar dacă nu e deja pauzat
                paused = true;
                console.log("Snake game paused via instance.");
            }
        },
        resume: () => {
            if (!over && gameVisibleAndActive && paused) { 
                // Verifică dacă un modal major este deschis (jurnal, shop, minijoc)
                // Dacă da, nu relua jocul principal, lasă utilizatorul să închidă modalul întâi
                if (!journalModal.classList.contains('hidden') ||
                    !shopModal.classList.contains('hidden') ||
                    (!minigameModal.classList.contains('hidden') && breathingActive)) {
                    console.log("Snake game resume deferred: modal active.");
                    return;
                }
                paused = false;
                console.log("Snake game resumed via instance.");
                flash(t('gameResumed'), 1000, 'positive');
                lastTime = performance.now();
                requestAnimationFrame(gameLoop);
            }
        },
        reset: () => fullResetGame(false),
        isPaused: () => paused,
        isOver: () => over,
        setGameVisibility: (isVisible) => {
            const wasVisibleAndActive = gameVisibleAndActive && !paused && !over;
            gameVisibleAndActive = isVisible;

            if (isVisible) {
                if (!wasVisibleAndActive && !paused && !over) { // Dacă devine vizibil și nu rula activ
                    console.log("Game visibility set to true, ensuring game loop is active.");
                    lastTime = performance.now();
                    requestAnimationFrame(gameLoop); // Pornește bucla dacă nu era deja
                }
                // Dacă era pauzat (de sistem, nu de utilizator) și devine vizibil, ar trebui reluat
                // Dar gestionarea pauzei/reluării e mai bine lăsată la interacțiunea utilizatorului sau la resume() explicit
            } else { // Dacă devine invizibil
                if (wasVisibleAndActive) { // Și rula activ
                    gameInstance.pause(); 
                    console.log("Game visibility set to false, pausing game.");
                }
            }
        },
        cleanup: () => {
            document.removeEventListener('keydown', handleKeyDown);
            // TODO: Elimină și event listeners de pe canvas pentru touch, dacă e necesar la un cleanup complet
            // canvas.removeEventListener('touchstart', ...);
            // canvas.removeEventListener('touchmove', ...);
            gameInitialized = false;
            gameInstance = null;
            if(snakeGameWrapper) snakeGameWrapper.innerHTML = ''; // Golește containerul jocului
            console.log("Snake game instance cleaned up.");
        }
    };
    return gameInstance;
}

document.addEventListener('DOMContentLoaded', () => {
    snakeGameWrapper = document.getElementById('snakeGameWrapper');
    startGameButton = document.getElementById('startGameButton');

    if (startGameButton && snakeGameWrapper) {
        startGameButton.addEventListener('click', () => {
            if (!gameInstance || !gameInitialized) { // Verifică și gameInstance
                gameInstance = initializeSnakeGame();
            } else if (gameInstance && typeof gameInstance.cleanup === 'function' && gameInstance.isOver()) {
                // Dacă jocul există dar e game over, îl curățăm și reinițializăm pentru un start curat
                // gameInstance.cleanup(); // Comentat - poate duce la probleme dacă nu e gestionat atent
                // gameInstance = initializeSnakeGame(); // Comentat - reset ar trebui să fie suficient
            }


            if (gameInstance) {
                snakeGameWrapper.style.display = 'block'; // Asigură vizibilitatea wrapper-ului
                startGameButton.style.display = 'none';
                gameInstance.setGameVisibility(true);
                
                const gameCanvas = document.getElementById('snakeCanvas'); // Canvas-ul e acum în DOM

                if (gameInstance.isOver()) {
                    gameInstance.reset(); // Asigură că jocul pornește de la 0 dacă era game over
                } else if (gameInstance.isPaused()) { 
                    // Verifică dacă pauza e din cauza unui intro
                    const introEl = document.getElementById('snakeIntro');
                    if (!introEl || introEl.classList.contains('hidden')) {
                        gameInstance.resume(); // Reluare doar dacă nu e un intro activ
                    }
                } else if (!gameInstance.isPaused() && !gameInstance.isOver()){
                    // Dacă jocul nu e pauzat și nu e game over (ex. după refresh pe tab),
                    // asigură că bucla pornește dacă e vizibil
                    lastTime = performance.now();
                    requestAnimationFrame(gameLoop); // Redundant dacă setGameVisibility o face deja
                }
                if(gameCanvas) gameCanvas.focus();
            }
        });
    }
});

export function handleGameVisibility(isVisible) {
    if (gameInstance && typeof gameInstance.setGameVisibility === 'function') {
        const wrapperIsDisplayed = snakeGameWrapper && snakeGameWrapper.style.display === 'block';
        gameInstance.setGameVisibility(isVisible && wrapperIsDisplayed);

        if (isVisible && wrapperIsDisplayed) {
            const gameCanvas = document.getElementById('snakeCanvas');
            if(gameCanvas) gameCanvas.focus();
            
            // Dacă jocul devine vizibil și era pe pauză (și nu din cauza unui modal activ),
            // utilizatorul ar putea dori să-l reia. Dar e mai bine să lăsăm asta pe seama lui Space.
            // if (gameInstance.isPaused() && !gameInstance.isOver()) {
            //    // Nu relua automat, lasă utilizatorul să apese Space.
            // }
        }
    } else if (isVisible && !gameInitialized && snakeGameWrapper && startGameButton && snakeGameWrapper.style.display === 'block') {
        // Acest caz e pentru reîncărcarea paginii pe tab-ul jocului
        if(startGameButton.style.display === 'none') { 
            console.log("Tab materiale activ, wrapper joc vizibil, buton start ascuns. Se inițializează jocul (handleGameVisibility).")
            gameInstance = initializeSnakeGame(); // Va face și fullResetGame(true)
            if(gameInstance) {
                // gameInstance.setGameVisibility(true); // Este deja setat de initializeSnakeGame prin gameLoop
                // fullResetGame(true) din initializeSnakeGame va seta paused=true și va porni un timer
                // pentru a ascunde intro-ul și a relua jocul.
            }
        }
    }
}

window.addEventListener('beforeunload', () => {
    if (gameInstance && !gameInstance.isOver() && gameInitialized) {
        // saveAnalytics(); // Salvează analytics la părăsirea paginii, dacă se dorește
        console.log("Părăsire pagină, se poate salva progresul jocului Snake.");
    }
    // Nu facem cleanup aici, deoarece pagina se descarcă oricum.
});

// --- END OF FILE snakeGame.js ---