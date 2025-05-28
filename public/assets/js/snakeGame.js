// --- assets/js/snakeGame.js ---

// Variabile la nivel de modul pentru a gestiona starea jocului
let gameInstance = null;
let gameInitialized = false;
let gameVisibleAndActive = false; // Track if the game UI is currently supposed to be active

// DOM Elements specific to the game, will be queried after HTML injection
let snakeGameWrapper;
let startGameButton;


// --- NEW HTML STRUCTURE (Provided by you, slightly adapted for clarity) ---
// This structure will be injected directly into snakeGamePageContainer
const gameHTMLStructure = `
    <div id="snakeGameInterface" style="background: #293446; padding: 1rem; border-radius: 1rem; box-shadow: 0 4px 28px #0a121c; text-align: center; position: relative; max-width: 90%; margin: auto;">
      <h2 class="text-2xl text-yellow-200 mb-2" style="font-size: 1.5rem;">Snake 🐍 – Călătoria Interioară</h2>
      <div class="score mb-2" aria-live="polite" style="color: #e2e8f0;">Scor: <span id="snakeScore">0</span> | Maxim: <span id="snakeHighScore">0</span></div>
      <div class="values mb-2" aria-live="polite" style="color: #e2e8f0;">
        💙 Emp: <span id="snakeEmpatie">0</span>
        🦁 Cur: <span id="snakeCuraj">0</span>
        ⏳ Răb: <span id="snakeRabdare">0</span>
      </div>
      <div id="snakeIntro" class="hidden bg-gray-700 p-4 rounded-lg mb-2 text-center" role="dialog" style="color: #e2e8f0;"></div>
      <canvas id="snakeCanvas" width="320" height="320" tabindex="0" aria-label="Joc Snake cu tematică emoțională" class="focus:outline-none focus:ring-2 focus:ring-green-600" style="background: #1d2230; border-radius: 0.5rem; box-shadow: 0 4px 16px #1118; display: block; margin: 0 auto 0.5rem; transition: transform 0.2s ease-in-out;"></canvas>
      <div id="snakeStatus" class="flex gap-2 justify-center my-2" aria-live="polite"></div>
      <div id="snakeControls" class="controls text-gray-400 text-sm mb-2">Săgeți/WASD – mișcare • Space – pauză • J – jurnal • R – respirație</div>
      <div class="flex gap-2 justify-center">
        <button id="snakeRestartBtn" class="hidden px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition duration-300" aria-label="Repornește jocul">Restart</button>
        <button id="snakeJournalBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition duration-300" aria-label="Deschide jurnalul">Jurnal</button>
        <button id="snakeShopBtn" class="px-4 py-2 bg-yellow-500 text-white rounded-lg shadow-lg hover:bg-yellow-700 transition duration-300" aria-label="Deschide magazinul">Magazin</button>
        <button id="snakeLangBtn" class="px-4 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition duration-300" aria-label="Schimbă limba">English</button>
      </div>
      
      {/* Modals remain as fixed overlays, triggered by buttons within snakeGameInterface */}
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

    // Injectează HTML-ul jocului în containerul dedicat
    if (snakeGameWrapper) {
        snakeGameWrapper.innerHTML = gameHTMLStructure;
    } else {
        console.error("Containerul pentru joc (snakeGameWrapper) nu a fost găsit în DOM.");
        return null;
    }

    // --- CONFIG & STATE (declarate în interiorul acestei funcții) ---
    const canvas = document.getElementById('snakeCanvas');
    if (!canvas) {
        console.error("Elementul canvas #snakeCanvas nu a fost găsit după injectare!");
        return null;
    }
    const ctx = canvas.getContext('2d');
    const box = 20;
    if (window.innerWidth < 600 && canvas.width > 280) { canvas.width = canvas.height = 280; } // Ajustare pt mobil

    let snake, dir, food, score = 0, mult = 1, speed = 180, highScore = localStorage.getItem('snakeGameHighScore') || 0;
    let paused = false, over = false, wallPass = false, magnet = false, shield = { level: 1, hits: 1 };
    let activeColor = null, special = null, effects = [], effectId = 0, particles = [], obstacles = [], level = 0;
    let values = { empatie: 0, curaj: 0, rabdare: 0 }, collected = { curaj: 0, rabdare: 0, empatie: 0, acceptare: 0, frustrare: 0, motivatie: 0, critic: 0, abandon: 0, izolare: 0, adult: 0, copil: 0 };
    let analytics = { sessions: JSON.parse(localStorage.getItem('snakeGameAnalytics')) || [], current: { score: 0, values: {}, obstacles: [], time: 0 } }; // Nume diferite pt localStorage
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

    // ---------- TRANSLATIONS, LEVELS, SPECIALS, SHOP ITEMS (la fel ca în jocul original) ----------
    const translations = {
        ro: {
          score: 'Scor', highScore: 'Maxim', restart: 'Restart', journal: 'Jurnal', shop: 'Magazin', controls: 'Săgeți/WASD – mișcare • Space – pauză • J – jurnal • R – respirație',
          save: 'Salvează', export: 'Export PDF', view: 'Vezi Jurnal', journalSaved: 'Jurnal salvat', journalEmpty: 'Jurnal gol', close: 'Închide',
          emotionalSummary: 'Rezumat Emoțional', courageFeedback: '🦁 Mult curaj! Explorează ce te motivează să fii puternic.',
          frustrationFeedback: '🌩️ Ai întâlnit frustrare. Încearcă o pauză sau o respirație profundă.', shieldProtect: 'Scutul a protejat Copilul',
          curaj: 'Curaj', rabdare: 'Răbdare', empatie: 'Empatie Magnet', acceptare: 'Acceptare libertate', frustrare: 'Frustrare',
          motivatie: 'Motivație +5', copil: 'Protejezi Copilul Interior', adult: 'Adult Sănătos', critic: 'Critic Interior',
          abandon: 'Umbra Abandonului', izolare: 'Izolare Socială', shopTitle: 'Magazin Interior', dailyQuest: 'Adună 3 ⭐ Motivație, scrie un gând recunoscător',
          breathing: 'Exercițiu de respirație: Inhalează 4s, ține 4s, expiră 4s', reframe: 'Alege o afirmație pozitivă:', stuck: 'Te simți blocat? Încearcă să scrii ce te apasă.'
        },
        en: {
          score: 'Score', highScore: 'High Score', restart: 'Restart', journal: 'Journal', shop: 'Shop', controls: 'Arrows/WASD – movement • Space – pause • J – journal • R – breathing',
          save: 'Save', export: 'Export PDF', view: 'View Journal', journalSaved: 'Journal saved', journalEmpty: 'Journal empty', close: 'Close',
          emotionalSummary: 'Emotional Summary', courageFeedback: '🦁 Lots of courage! Explore what motivates you to be strong.',
          frustrationFeedback: '🌩️ You encountered frustration. Try a break or deep breathing.', shieldProtect: 'The shield protected the Inner Child',
          curaj: 'Courage', rabdare: 'Patience', empatie: 'Empathy Magnet', acceptare: 'Acceptance Freedom', frustrare: 'Frustration',
          motivatie: 'Motivation +5', copil: 'Protecting the Inner Child', adult: 'Healthy Adult', critic: 'Inner Critic',
          abandon: 'Shadow of Abandonment', izolare: 'Social Isolation', shopTitle: 'Inner Shop', dailyQuest: 'Collect 3 ⭐ Motivation, write a grateful thought',
          breathing: 'Breathing exercise: Inhale 4s, hold 4s, exhale 4s', reframe: 'Choose a positive affirmation:', stuck: 'Feeling stuck? Try writing what’s weighing you down.'
        }
    };
    const levels = [
        { theme: 'Curaj', message: 'Explorează ce înseamnă să fii curajos. Ce te motivează?', specials: ['curaj', 'motivatie'], obstacles: 2, bgColor: '#ffb347', mechanic: 'fearShrink' },
        { theme: 'Frustrare', message: 'Confruntă frustrarea. Ce te ajută să te calmezi?', specials: ['frustrare', 'rabdare'], obstacles: 3, bgColor: '#ff686b', mechanic: 'rageMode' },
        { theme: 'Empatie', message: 'Conectează-te cu ceilalți. Ce simți când ești empatic?', specials: ['empatie', 'adult'], obstacles: 1, bgColor: '#59a5e0', mechanic: 'cooperative' },
        { theme: 'Acceptare', message: 'Acceptă-ți vulnerabilitățile. Ce te face să te simți liber?', specials: ['acceptare', 'copil'], obstacles: 2, bgColor: '#b388ff', mechanic: 'portals' },
        { theme: 'Criticul Interior', message: 'Înfruntă criticul interior. Ce îți spui pentru a merge mai departe?', specials: ['critic', 'abandon'], obstacles: 0, bgColor: '#d00000', mechanic: 'boss' }
    ];
    const specials = [
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


    // ---------- HELPERS (la fel, dar asigură-te că referințele DOM sunt la noile ID-uri prefixate dacă e cazul) ----------
    function t(key) { return translations[language]?.[key] || key; } // Adăugat ? pentru siguranță
    function spawnFree() {
      let p;
      do { p = { x: Math.floor(Math.random() * canvas.width / box) * box, y: Math.floor(Math.random() * canvas.height / box) * box }; }
      while (snake.some(s => s.x === p.x && s.y === p.y) || obstacles.some(o => o.x === p.x && o.y === p.y) || (food && p.x === food.x && p.y === food.y));
      return p;
    }
    function newFood() { food = spawnFree(); }
    function newSpecial() {
      const levelSpecials = levels[level]?.specials || specials.map(s => s.type);
      const available = specials.filter(s => levelSpecials.includes(s.type));
      if (available.length === 0) return; // Evită eroare dacă nu sunt speciale disponibile
      special = Object.assign({}, spawnFree(), available[Math.floor(Math.random() * available.length)]);
    }
    function spawnObstacle() { obstacles.push(spawnFree()); }
    function updateScore() {
      scoreEl.textContent = score;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeGameHighScore', highScore); // Nume localStorage specific
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
    function resetSpeed() { speed = 180; activeColor = null; } // Resetare la viteză normală
    function boost(factor, label) { mult = factor; activeColor = '#ffb347'; flash(`${label}!`); }
    function endBoost() { mult = 1; activeColor = null; }
    function speedUp(label) { changeSpeed(0.7); activeColor = '#ff686b'; flash(`${label}!`); }
    function slow(label) { changeSpeed(1.7); activeColor = '#7ed957'; flash(`${label}!`); }
    function endNegative() { effects = effects.filter(e => !e.neg); statusBar.querySelectorAll('.neg-effect').forEach(el => el.remove()); } // Elimină și din UI
    function invertDirection() {
      if (dir === 'LEFT') dir = 'RIGHT';
      else if (dir === 'RIGHT') dir = 'LEFT';
      else if (dir === 'UP') dir = 'DOWN';
      else if (dir === 'DOWN') dir = 'UP';
      effects.push({ id: addEffectIcon('🔨', 2, true), neg: true });
      flash(t('critic'));
    }
    function shrinkSnake() {
      snake.length = Math.max(1, snake.length - 3);
      effects.push({ id: addEffectIcon('🥀', 2, true), neg: true });
      flash(t('abandon'));
    }
    function repelFood() {
      effects.push({ id: addEffectIcon('👤', 2, true), neg: true });
      repelCountdown = 60; // ~3 secunde la 20 FPS (1000ms / 50ms_per_tick)
      flash(t('izolare'));
    }
    function addEffectIcon(sym, dur = 5, isNegative = false) {
      if(!statusBar) return 'no-status-bar';
      const id = 'effectIcon' + (++effectId), span = document.createElement('span');
      span.className = 'stat' + (isNegative ? ' neg-effect' : '');
      span.id = id;
      span.textContent = sym;
      span.setAttribute('aria-label', `Efect activ: ${sym}`);
      const bar = document.createElement('div');
      bar.className = 'bar';
      span.appendChild(bar);
      statusBar.appendChild(span);
      span.dataset.duration = dur; // Stocăm durata inițială
      span.dataset.timeLeft = dur;  // Stocăm timpul rămas
      return id;
    }
    function tickEffects() {
      if(!statusBar) return;
      effects.forEach((e, index) => {
        const s = document.getElementById(e.id);
        if (!s) {
            effects.splice(index, 1); // Elimină efectul dacă elementul nu mai există
            return;
        }
        let timeLeft = parseFloat(s.dataset.timeLeft) - (speed / 1000); // Scade bazat pe viteza jocului
        s.dataset.timeLeft = timeLeft.toFixed(1);
        const initialDuration = parseFloat(s.dataset.duration);
        s.querySelector('.bar').style.width = Math.max(0,(timeLeft / initialDuration)) * 100 + '%';
        if (timeLeft <= 0) {
            s.remove();
            effects.splice(index, 1);
            // Aici ar trebui să fie logica de revert dacă e cazul și efectul e expirat
            const specialEffect = specials.find(sp => sp.symbol === s.textContent.trim());
            if (specialEffect && specialEffect.revert && !specialEffect.negative) { // Revert doar pt efecte pozitive care au revert
                // specialEffect.revert(); // Atenție la contextul this dacă e necesar
            }
        }
      });
    }
    function spawnParticles(x, y, color) {
      for (let i = 0; i < 10; i++) {
        particles.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, alpha: 1, color });
      }
    }

    // ---------- LEVEL MECHANICS (la fel) ----------
    function applyLevelMechanics() {
        if (level >= levels.length) return; // Asigură-te că nu depășești array-ul
        const currentLevelData = levels[level];
        const mechanic = currentLevelData.mechanic;

        canvas.style.transition = 'transform 0.5s ease-in-out, background-color 0.5s ease-in-out'; // Adaugă tranziție pt BG
        canvas.style.backgroundColor = currentLevelData.bgColor || '#1d2230';


        if (mechanic === 'fearShrink') {
            canvas.style.transform = 'scale(0.9)';
            setTimeout(() => canvas.style.transform = 'scale(1)', 5000);
        } else if (mechanic === 'rageMode' && collected.frustrare > 0) {
            speedUp(t('Frustrare') + ' Mode Activated!'); // Mesaj mai clar
            setTimeout(resetSpeed, 3000);
        } else if (mechanic === 'cooperative') {
            flash("Mod cooperativ (placeholder) - imaginează-ți un aliat!");
        } else if (mechanic === 'portals') {
            wallPass = true; // Activat direct, poate cu un flash
            flash(t('Acceptare') + " - Porți deschise!");
        } else if (mechanic === 'boss') {
            // Spawn "boss" (critic interior) - poate un obstacol special sau un mod de joc diferit
            obstacles = []; // Curăță obstacolele vechi
            // Adaugă un "boss" ca un special persistent sau un set de obstacole
            // De exemplu, un "special" care nu dispare și are un efect negativ constant
            // Aici ai putea adăuga un element special care trebuie "lovit" de mai multe ori
            special = { type: 'critic', symbol: 'BOSS 🔨', color: '#d00000', x: Math.floor(canvas.width / 2 / box) * box, y: Math.floor(canvas.height / 2 / box) * box, negative: true, isBoss: true, bossHits: 3 };
            flash("Înfruntă CRITICUL INTERIOR!");
        }
    }

    // ---------- JOURNAL (adaptat pentru modal) ----------
    function toggleJournalModal() {
        if (paused && !journalModal.classList.contains('hidden')) { // Dacă jocul e pe pauză și modalul e deschis, închide-l
            journalModal.classList.add('hidden');
            viewJournalContentEl.classList.add('hidden'); // Ascunde și conținutul vizualizat
            // Nu relua jocul automat aici, lasă utilizatorul să o facă cu Space
        } else {
            paused = true; // Pune pauză la deschiderea jurnalului
            journalModal.classList.remove('hidden');
            shopModal.classList.add('hidden');
            minigameModal.classList.add('hidden');
            journalEntry.focus();
        }
    }
    saveJournal.onclick = () => {
      const entry = journalEntry.value.trim();
      if (entry) {
        journalEntries.push({ date: new Date().toLocaleString(), text: entry }); // Salvează ca obiect
        localStorage.setItem('snakeGameJournal', JSON.stringify(journalEntries));
        journalEntry.value = '';
        flash(t('journalSaved'));
        if (!viewJournalContentEl.classList.contains('hidden')) displayJournalEntries(); // Reafișează dacă e vizibil
      }
    };
    exportJournal.onclick = () => {
      if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
          flash("Librăria PDF nu este încărcată. Reîncearcă.");
          console.error("jsPDF is not loaded.");
          return;
      }
      const { jsPDF } = jspdf;
      const doc = new jsPDF();
      doc.text(t('Jurnal Emoțional') + " (Snake Game)", 10, 10);
      let y = 20;
      journalEntries.forEach(entryObj => {
        // Împarte textul lung dacă e necesar
        const lines = doc.splitTextToSize(`${entryObj.date}: ${entryObj.text}`, 180);
        lines.forEach(line => {
            if (y > 280) { // Pagina nouă
                doc.addPage();
                y = 10;
            }
            doc.text(line, 10, y);
            y += 7; // Spațiere mai mică între linii
        });
        y += 3; // Spațiu între intrări
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
        // Nu relua jocul automat, lasă utilizatorul să o facă
    };


    // ---------- SHOP (adaptat pentru modal) ----------
    function toggleShopModal() {
        if (paused && !shopModal.classList.contains('hidden')) {
            shopModal.classList.add('hidden');
        } else {
            paused = true;
            shopModal.classList.remove('hidden');
            journalModal.classList.add('hidden');
            minigameModal.classList.add('hidden');
            shopItemsEl.innerHTML = ''; // Golește shop-ul înainte de a repopula
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
                        flash(`${t(item.name) || item.name} ${t('achiziționat') || 'purchased'}!`);
                        // Actualizează UI-ul shop-ului dacă item-ul e unic și a fost cumpărat
                        // De exemplu, dezactivează butonul sau elimină-l
                        btn.disabled = true;
                        btn.classList.add("opacity-50", "cursor-not-allowed");
                        btn.innerHTML += ` <span class="text-xs text-green-300">(${t('cumpărat') || 'Purchased'})</span>`;
                    } else {
                        flash(t('Valori insuficiente') + '!');
                    }
                };
                shopItemsEl.appendChild(btn);
            });
        }
    }
    closeShopModalBtn.onclick = () => shopModal.classList.add('hidden');

    // ---------- MINI-GAMES (adaptat pentru modal) ----------
    function startBreathing() {
        paused = true; // Asigură pauza
        breathingActive = true;
        journalModal.classList.add('hidden');
        shopModal.classList.add('hidden');
        minigameModal.classList.remove('hidden');
        minigameContentEl.innerHTML = `<h4 class="text-lg text-yellow-200 mb-3">${t('breathing')}</h4><div id="breathBar" class="h-4 bg-gray-600 rounded-full overflow-hidden"><div id="breathProgress" class="h-full bg-green-500 rounded-full transition-all duration-100 ease-linear" style="width: 0%"></div></div> <p id="breathPhase" class="mt-2 text-gray-300">Inspiră...</p>`;
        let phase = 0; // 0: inhale, 1: hold, 2: exhale
        let timeInPhase = 0;
        const durationPerSegment = 4; // secunde

        const breathProgressEl = document.getElementById('breathProgress');
        const breathPhaseEl = document.getElementById('breathPhase');

        function updateBreath() {
            if (!breathingActive || !breathProgressEl || !breathPhaseEl) return;

            timeInPhase += 0.1; // Simulează trecerea timpului
            let progressPercent = (timeInPhase / durationPerSegment) * 100;

            if (phase === 0) { // Inhale
                breathPhaseEl.textContent = "Inspiră...";
                breathProgressEl.style.width = `${Math.min(progressPercent, 100)}%`;
                breathProgressEl.style.backgroundColor = '#4ade80'; // green
            } else if (phase === 1) { // Hold
                breathPhaseEl.textContent = "Menține...";
                breathProgressEl.style.width = `100%`; // Rămâne plin
                breathProgressEl.style.backgroundColor = '#facc15'; // yellow
            } else { // Exhale
                breathPhaseEl.textContent = "Expiră...";
                breathProgressEl.style.width = `${Math.max(100 - progressPercent, 0)}%`;
                breathProgressEl.style.backgroundColor = '#60a5fa'; // blue
            }

            if (timeInPhase >= durationPerSegment) {
                timeInPhase = 0;
                phase = (phase + 1) % 3;
                if (phase === 0 && document.getElementById('breathPhase').textContent.includes("Expiră")) { // A completat un ciclu
                     // Poți adăuga o condiție de oprire după X cicluri
                }
            }
             // Condiție de oprire (ex: după 3 cicluri complete = 3 * 3 * 4s)
            if (effects.length > 0 && effects.find(e => e.type === 'breathing_cycle_count') && effects.find(e => e.type === 'breathing_cycle_count').value >= 36) { // Simplificat: 3 cicluri * 3 faze * 4s = 36s
                breathingActive = false;
                minigameModal.classList.add('hidden');
                paused = false; // Reluare joc
                flash('Respirație completă! Te simți mai calm?');
                requestAnimationFrame(gameLoop); // Asigură reluarea buclei
                return;
            }
            if (breathingActive) requestAnimationFrame(updateBreath);
        }
        requestAnimationFrame(updateBreath);
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

      document.querySelectorAll('.affirmation-btn').forEach(btn => {
        btn.onclick = function() {
            // Dezactivează toate butoanele de afirmație
            document.querySelectorAll('.affirmation-btn').forEach(b => {
                b.disabled = true;
                b.classList.add("opacity-50", "cursor-not-allowed");
            });
            flash(`"${btn.textContent}" - Excelent!`);
            setTimeout(() => {
                minigameModal.classList.add('hidden');
                paused = false;
                requestAnimationFrame(gameLoop); // Asigură reluarea buclei
            }, 1500);
        };
      });
    }
    closeMinigameModalBtn.onclick = () => {
      breathingActive = false; // Oprește minijocul de respirație dacă era activ
      minigameModal.classList.add('hidden');
      // Nu relua jocul automat, lasă utilizatorul să o facă
    };


    // ---------- LANGUAGE (la fel) ----------
    function setLanguage(lang) {
        language = lang;
        // Actualizează textele din UI-ul jocului
        if(scoreEl.parentNode.firstChild.nodeType === Node.TEXT_NODE) scoreEl.parentNode.firstChild.textContent = `${t('score')}: `;
        if(highScoreEl.parentNode.firstChild.nodeType === Node.TEXT_NODE) highScoreEl.parentNode.firstChild.textContent = `${t('highScore')}: `;
        if(restartBtn) restartBtn.textContent = t('restart');
        if(journalBtn) journalBtn.textContent = t('journal');
        if(shopBtn) shopBtn.textContent = t('shop');
        if(controlsEl) controlsEl.textContent = t('controls');

        // Jurnal modal
        const journalModalTitle = journalModal.querySelector('h3');
        if(journalModalTitle) journalModalTitle.textContent = t('Jurnal Emoțional') + " (Joc)";
        if(journalEntry) journalEntry.placeholder = t('Notează-ți gândurile din timpul jocului...') || "Notează-ți gândurile din timpul jocului...";
        if(saveJournal) saveJournal.textContent = t('save');
        if(exportJournal) exportJournal.textContent = t('export');
        if(viewJournal) viewJournal.textContent = t('view');
        if(closeJournalModalBtn) closeJournalModalBtn.textContent = t('close');

        // Shop modal
        const shopModalTitle = shopModal.querySelector('h3');
        if(shopModalTitle) shopModalTitle.textContent = t('shopTitle') + " (Joc)";
        if(closeShopModalBtn) closeShopModalBtn.textContent = t('close');
        // Texte butoane shop sunt actualizate la deschiderea shopului

        // Minigame modal (titlurile sunt setate la deschiderea minijocului)
        if(closeMinigameModalBtn) closeMinigameModalBtn.textContent = t('close');


        if(langBtn) {
            langBtn.textContent = lang === 'ro' ? 'English' : 'Română';
            langBtn.setAttribute('aria-label', lang === 'ro' ? 'Switch to English' : 'Schimbă în Română');
        }
        // Actualizează și intro-ul dacă e vizibil
        if (introEl && !introEl.classList.contains('hidden') && level < levels.length) {
             introEl.innerHTML = `<strong>${t(levels[level].theme)}</strong><br>${t(levels[level].message)}<br>${t('dailyQuest')}`;
        }
    }
    if(langBtn) langBtn.onclick = () => setLanguage(language === 'ro' ? 'en' : 'ro');


    // ---------- ANALYTICS (la fel) ----------
    function saveAnalytics() {
        analytics.current.time = Date.now();
        analytics.current.values = { ...values }; // Copie a valorilor
        analytics.sessions.push({ ...analytics.current }); // Copie a sesiunii curente
        localStorage.setItem('snakeGameAnalytics', JSON.stringify(analytics.sessions));
        console.log("Snake game analytics saved to localStorage.");

        // Opțional: Export JSON for therapist (poate fi scos dacă nu e necesar la fiecare game over)
        // const a = document.createElement('a');
        // a.href = URL.createObjectURL(new Blob([JSON.stringify(analytics.sessions, null, 2)], { type: 'application/json' }));
        // a.download = 'snake_session_analytics.json';
        // a.click();
        // URL.revokeObjectURL(a.href); // Eliberează memoria
    }
    function checkStuck() {
        if (collected.abandon >= 3 && collected.izolare >=2 ) { // Condiție ajustată
            flash(t('stuck'), 3000);
            setTimeout(() => { // Deschide jurnalul după un mic delay
                if (!journalModal.classList.contains('hidden')) return; // Nu redeschide dacă e deja deschis
                toggleJournalModal();
            }, 1500);
        }
    }

    // ---------- CUSTOM MAPS (la fel) ----------
    function loadCustomMap(jsonString) { // Schimbat parametrul în string
        try {
            const map = JSON.parse(jsonString); // Parsează string-ul JSON
            obstacles = map.obstacles || [];
            if (level < levels.length && map.specials) {
                 levels[level].specials = map.specials;
            }
            flash('Hartă personalizată încărcată!');
        } catch (e) {
            console.error("Eroare la încărcarea hărții personalizate:", e);
            flash('Harta invalidă sau eroare la parsare!');
        }
    }

    // ---------- RESET (la fel) ----------
    function resetGame(isInitialReset = false) {
        snake = [{ x: 7 * box, y: 7 * box }];
        dir = 'RIGHT';
        score = 0;
        mult = 1;
        speed = 180; // Viteza inițială
        wallPass = magnet = slowMotion = clarityMap = false;
        shield.hits = shield.level; // Reset scut
        activeColor = null;
        over = false;
        // `paused` va fi gestionat de funcția care apelează reset (ex. la startGame)
        // dacă nu e reset inițial, nu vrem să modificăm starea de pauză impusă de sistem
        if (isInitialReset) paused = false;

        special = null;
        effects = [];
        particles = [];
        obstacles = [];
        if (statusBar) statusBar.innerHTML = ''; // Golește status bar

        for (let k in collected) collected[k] = 0;
        analytics.current = { score: 0, values: {}, obstacles: [], time: Date.now() }; // Resetare analytics sesiune curentă

        updateScore();
        updateValues();
        newFood();
        if(newSpecial && Math.random() < 0.1) newSpecial(); // O șansă mică pentru un special la start

        if(restartBtn) restartBtn.classList.add('hidden');

        if (level < levels.length) {
            const currentLvlData = levels[level];
            if(introEl) {
                introEl.innerHTML = `<strong>${t(currentLvlData.theme)}</strong><br>${t(currentLvlData.message)}<br><small>${t('dailyQuest')}</small>`;
                introEl.classList.remove('hidden');
            }
            if(!isInitialReset) paused = true; // Pune pauză pentru intro dacă nu e primul reset
            setTimeout(() => {
                if(introEl) introEl.classList.add('hidden');
                if(!isInitialReset) paused = false;
                applyLevelMechanics();
                 if (gameVisibleAndActive && !over) requestAnimationFrame(gameLoop); // Asigură pornirea/reluarea buclei
            }, isInitialReset ? 100 : 3000); // Delay mai mic la reset inițial

            for (let i = 0; i < (currentLvlData.obstacles || 0); i++) spawnObstacle();
        } else {
             if(introEl) {
                introEl.innerHTML = "Ai finalizat toate nivelele! Poți continua să joci în modul liber sau să resetezi progresul (dacă implementezi).";
                introEl.classList.remove('hidden');
             }
            // Poate un mod "endless" sau opțiune de resetare campanie
        }
        lastTime = 0; // Resetare timp pentru bucla de joc
        // Nu mai apelăm gameLoop direct aici, se va face la resume sau la finalul intro-ului
    }


    // ---------- DRAW (la fel) ----------
    function draw() {
        if (!ctx || !canvas) return;
        // Folosește culorile definite în `levels` sau un default
        const currentBgColor = (level < levels.length ? levels[level].bgColor : null) || '#1d2230';
        const gradientEndColor = '#293446';

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, currentBgColor);
        gradient.addColorStop(1, gradientEndColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        snake.forEach((seg, i) => {
          ctx.fillStyle = i === 0 ? (activeColor || (shield.hits > 0 ? '#ffd1dc' : '#36a26b')) : '#88dab2';
          ctx.fillRect(seg.x, seg.y, box, box);
          ctx.strokeStyle = '#232c37'; // O culoare de bordură mai întunecată
          ctx.strokeRect(seg.x, seg.y, box, box);
        });

        if(food) {
            ctx.font = `${box - 2}px Arial`; // Mărime font relativă la box
            ctx.fillStyle = '#34D399'; // Verde pentru măr
            ctx.fillText('🍏', food.x + 1, food.y + box - 3); // Ajustat pentru aliniere mai bună
        }

        if (special) {
          ctx.font = `${box}px Arial`;
          ctx.fillStyle = special.color;
          // ctx.shadowColor = special.color; // Efect de glow simplu
          // ctx.shadowBlur = 10;
          ctx.fillText(special.symbol, special.x + 1, special.y + box - 2);
          // ctx.shadowBlur = 0; // Reset shadow
        }

        obstacles.forEach(o => {
          ctx.fillStyle = clarityMap ? 'rgba(255,0,0,0.4)' : '#c70000'; // Roșu mai intens pt obstacole
          ctx.fillRect(o.x, o.y, box, box);
          ctx.strokeStyle = '#500000';
          ctx.strokeRect(o.x, o.y, box, box);
        });

        particles.forEach(p => {
          // Convert hex to rgba for alpha
          let r = 0, g = 0, b = 0;
          if (p.color.length === 7) { // #RRGGBB
            r = parseInt(p.color.slice(1, 3), 16);
            g = parseInt(p.color.slice(3, 5), 16);
            b = parseInt(p.color.slice(5, 7), 16);
          }
          ctx.fillStyle = `rgba(${r},${g},${b}, ${p.alpha})`;
          ctx.fillRect(p.x - 2, p.y - 2, 5, 5); // Particule puțin mai mici
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= 0.025; // Se estompează puțin mai repede
        });
        particles = particles.filter(p => p.alpha > 0);
    }


    // ---------- GAME LOOP ----------
    function gameLoop(timestamp) {
        if (!gameVisibleAndActive || paused || over) {
            // Dacă jocul nu e vizibil/activ sau e pe pauză/game over, nu continuăm logica de update.
            // Dar cerem următorul frame pentru a menține bucla activă pentru desenare (dacă e cazul)
            // sau pentru a putea relua ușor.
             if(gameVisibleAndActive && !over) draw(); // Desenează starea curentă dacă e vizibil și nu e game over
            return requestAnimationFrame(gameLoop);
        }

        if (timestamp - lastTime >= speed) {
            update(); // Actualizează logica jocului
            lastTime = timestamp;
        }
        draw(); // Desenează starea actualizată
        requestAnimationFrame(gameLoop);
    }

    // ---------- UPDATE (la fel) ----------
    function update() {
        if (over || paused) return; // Verificare suplimentară

        tickEffects();
        const head = { x: snake[0].x, y: snake[0].y };

        if (dir === 'LEFT') head.x -= box;
        else if (dir === 'RIGHT') head.x += box;
        else if (dir === 'UP') head.y -= box;
        else if (dir === 'DOWN') head.y += box;

        if (magnet && food) {
            const dx = food.x - head.x;
            const dy = food.y - head.y;
            if (Math.abs(dx) > Math.abs(dy)) {
                food.x -= Math.sign(dx) * box / 2; // Se mișcă mai încet spre șarpe
            } else {
                food.y -= Math.sign(dy) * box / 2;
            }
             // Asigură-te că food rămâne pe grilă
            food.x = Math.round(food.x / box) * box;
            food.y = Math.round(food.y / box) * box;
        }

        if (repelCountdown > 0 && food) {
            repelCountdown--;
            if (head.x === food.x && head.y === food.y) {
                repelCountdown = 0; // Anulează efectul dacă mănâncă mâncarea
            } else {
                const dx = food.x - head.x;
                const dy = food.y - head.y;
                if (Math.abs(dx) < box * 3 && Math.abs(dy) < box * 3) { // Respinde doar dacă e aproape
                    if (head.x < food.x && food.x < canvas.width - box) food.x += box;
                    else if (head.x > food.x && food.x > 0) food.x -= box;
                    if (head.y < food.y && food.y < canvas.height - box) food.y += box;
                    else if (head.y > food.y && food.y > 0) food.y -= box;

                    // Verifică dacă mâncarea a ieșit din canvas și repoziționeaz-o
                    if (food.x < 0) food.x = 0;
                    if (food.x >= canvas.width) food.x = canvas.width - box;
                    if (food.y < 0) food.y = 0;
                    if (food.y >= canvas.height) food.y = canvas.height - box;
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
            navigator.vibrate?.(50); // Vibrație mai scurtă
            if (!special && Math.random() < (0.2 + level * 0.05) ) newSpecial(); // Crește șansa cu nivelul
        } else {
            snake.pop();
        }

        if (special && head.x === special.x && head.y === special.y) {
            const sp = special; // Copie pentru referință
            special = null; // Consumă specialul

            if (sp.isBoss) { // Logica pentru boss
                sp.bossHits--;
                flash(`Lovitură Critic! Mai are ${sp.bossHits} vieți.`);
                if (sp.bossHits <= 0) {
                    flash("CRITICUL INTERIOR A FOST ÎNVINS! Felicitări!");
                    score += 50; // Bonus pentru învingerea boss-ului
                    // Aici poți trece la următorul nivel sau finaliza campania
                    level++;
                    setTimeout(() => resetGame(), 2000);
                } else {
                    // Repoziționează boss-ul sau lasă-l pe loc
                    special = sp; // Îl punem înapoi dacă mai are vieți
                }
            } else if (sp.negative && shield.hits > 0) {
                shield.hits--;
                flash(t('shieldProtect') + ` (${shield.hits} lovituri rămase)`);
                spawnParticles(sp.x + box/2, sp.y + box/2, '#FFFFFF'); // Particule albe pentru scut
            } else {
                if (sp.type) collected[sp.type] = (collected[sp.type] || 0) + 1;
                analytics.current.obstacles.push(sp.type);
                if (sp.value && values.hasOwnProperty(sp.value)) values[sp.value]++;
                if (sp.effect) sp.effect(); // Aplică efectul

                // Revert-ul acum e gestionat de tickEffects, dar îl păstrăm aici pt efecte instant
                // if (sp.revert) setTimeout(sp.revert, 5000);

                spawnParticles(sp.x + box / 2, sp.y + box / 2, sp.color);
                navigator.vibrate?.(100);

                if (sp.type === 'critic' && !sp.isBoss) startReframe(); // Doar pentru criticii normali
            }
            updateValues();
            checkStuck(); // Verifică dacă e blocat după colectarea specialului
        }
        snake.unshift(head);

        // Trecere la nivelul următor
        if (level < levels.length -1 && score >= (level + 1) * (20 + level * 5) ) { // Condiție de scor progresivă
            level++;
            flash(`Nivelul ${level + 1}: ${t(levels[level].theme)} atins!`, 2500);
            setTimeout(() => resetGame(), 2000); // Delay înainte de reset pentru noul nivel
        }
    }

    // ---------- GAME OVER (la fel) ----------
    function gameOver() {
        if (over) return; // Previne multiple apeluri
        over = true;
        paused = true; // Oprește orice input sau update
        // playSound('gameOver'); // Adaugă sunet de game over

        let raport = `<strong class="text-lg">${t('emotionalSummary')}:</strong><br>`;
        if (collected.curaj > 3) raport += `<span class="text-yellow-400">${t('courageFeedback')}</span><br>`;
        if (collected.frustrare > 2) raport += `<span class="text-red-400">${t('frustrationFeedback')}</span><br>`;
        raport += `🦁${collected.curaj} ⏳${collected.rabdare} 💙${collected.empatie} 🌀${collected.acceptare}<br>`;
        raport += `👶${collected.copil} 👦${collected.adult} 🔨${collected.critic} 🥀${collected.abandon} 👤${collected.izolare} ⭐${collected.motivatie}`;
        flash(raport, 5000); // Afișează raportul mai mult timp

        if(restartBtn) restartBtn.classList.remove('hidden');
        saveAnalytics(); // Salvează datele sesiunii
    }

    // ---------- CONTROLS (la fel, dar verifică `gameVisibleAndActive` și `paused`) ----------
    function handleKeyDown(e) {
        if (!gameVisibleAndActive || over || breathingActive) return; // Nu procesa input dacă jocul nu e activ, e gata sau într-un minijoc
        const k = e.key.toLowerCase();

        if (k === ' ' || k === 'p') { // Adăugat 'p' pentru pauză
            e.preventDefault();
            if (paused && !journalModal.classList.contains('hidden')) { // Dacă jurnalul e deschis, Space închide jurnalul
                toggleJournalModal();
                // Nu relua jocul automat, lasă utilizatorul
            } else if (paused && !shopModal.classList.contains('hidden')) {
                toggleShopModal();
            } else if (paused && !minigameModal.classList.contains('hidden')) {
                // Nu face nimic dacă un minijoc e activ și apeși space, folosește butoanele lui
            }
            else { // Altfel, comută pauza jocului
                paused = !paused;
                if (paused) {
                    flash("Joc în Pauză. Apasă Space pentru a relua.", 2000);
                } else {
                    flash("Joc Reluat!", 1000);
                    lastTime = performance.now(); // Resetează lastTime pentru a evita un salt mare în update
                    requestAnimationFrame(gameLoop); // Asigură reluarea
                }
            }
            return;
        }

        if (k === 'j') { e.preventDefault(); toggleJournalModal(); return; }
        if (k === 'm') { e.preventDefault(); toggleShopModal(); return; } // Adăugat 'm' pentru shop
        if (k === 'r' && slowMotion) { // Respirație
            e.preventDefault();
            if (!minigameModal.classList.contains('hidden') && breathingActive) return; // Nu reporni dacă e deja activ
            startBreathing();
            slowMotion = false; // Consumă item-ul
            return;
        }

        if (paused) return; // Nu procesa mișcarea dacă e pe pauză (dar alte taste pot funcționa mai sus)

        if ((k === 'arrowleft' || k === 'a') && dir !== 'RIGHT') dir = 'LEFT';
        else if ((k === 'arrowup' || k === 'w') && dir !== 'DOWN') dir = 'UP';
        else if ((k === 'arrowright' || k === 'd') && dir !== 'LEFT') dir = 'RIGHT';
        else if ((k === 'arrowdown' || k === 's') && dir !== 'UP') dir = 'DOWN';
    }
    document.addEventListener('keydown', handleKeyDown);

    // Touch controls (necesită ajustări pentru a nu interfera cu scroll-ul paginii)
    let touchStartX = 0;
    let touchStartY = 0;
    canvas.addEventListener('touchstart', e => {
        if (!gameVisibleAndActive || paused || over) return;
        e.preventDefault(); // Previne scroll-ul paginii DACA jocul e activ
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        if (!gameVisibleAndActive || paused || over || !e.touches.length) return;
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        const threshold = 20; // Prag pentru a detecta swipe-ul

        if (Math.abs(dx) > Math.abs(dy)) { // Mișcare orizontală
            if (dx > threshold && dir !== 'LEFT') { dir = 'RIGHT'; resetTouch(); }
            else if (dx < -threshold && dir !== 'RIGHT') { dir = 'LEFT'; resetTouch(); }
        } else { // Mișcare verticală
            if (dy > threshold && dir !== 'UP') { dir = 'DOWN'; resetTouch(); }
            else if (dy < -threshold && dir !== 'DOWN') { dir = 'UP'; resetTouch(); }
        }
    }, { passive: false });

    function resetTouch() { // Resetează coordonatele de start pentru următorul swipe
        touchStartX = 0;
        touchStartY = 0;
    }


    // Atașare event listeners pentru butoanele din joc
    if(restartBtn) restartBtn.onclick = () => resetGame(false); // false pentru a nu fi considerat reset inițial
    if(journalBtn) journalBtn.onclick = toggleJournalModal;
    if(shopBtn) shopBtn.onclick = toggleShopModal;

    // ---------- INITIALIZE SCRIPT ----------
    if (canvas) canvas.focus();
    setLanguage('ro');
    resetGame(true); // true pentru a indica resetul inițial la încărcarea jocului
    // Nu pornim gameLoop aici direct, ci în funcția de start/resume sau după intro

    gameInitialized = true;
    console.log("Instanța jocului Snake a fost inițializată.");

    // Expune funcții publice
    gameInstance = {
        pause: () => {
            if (!over) {
                paused = true;
                console.log("Snake game paused via instance.");
                 flash("Joc în Pauză", 1500);
            }
        },
        resume: () => {
            if (!over && gameVisibleAndActive) { // Doar dacă e vizibil și nu e game over
                paused = false;
                console.log("Snake game resumed via instance.");
                flash("Joc Reluat!", 1000);
                lastTime = performance.now();
                requestAnimationFrame(gameLoop); // Asigură reluarea buclei
            }
        },
        reset: () => resetGame(false), // Permite resetarea din exterior
        isPaused: () => paused,
        isOver: () => over,
        setGameVisibility: (isVisible) => {
            gameVisibleAndActive = isVisible;
            if (isVisible && !paused && !over) {
                console.log("Game visibility set to true, ensuring game loop is active.");
                lastTime = performance.now();
                requestAnimationFrame(gameLoop); // Pornește/asigură bucla
            } else if (!isVisible && !paused) { // Dacă devine invizibil și nu era deja pe pauză
                gameInstance.pause();
                console.log("Game visibility set to false, pausing game.");
            }
        },
        cleanup: () => {
            document.removeEventListener('keydown', handleKeyDown);
            // Alte operațiuni de curățare dacă sunt necesare
            gameInitialized = false;
            gameInstance = null;
            console.log("Snake game instance cleaned up.");
        }
    };
    return gameInstance;
}

// --- FUNCȚII DE CONTROL EXPUSE MODULULUI PRINCIPAL (dacă e nevoie) ---
// De exemplu, pentru a controla jocul din psihoterapie.js

// --- INIȚIALIZARE LA NIVEL DE MODUL ---
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
                startGameButton.style.display = 'none'; // Ascunde butonul "Joacă Acum"
                gameInstance.setGameVisibility(true);
                if (gameInstance.isOver() || gameInstance.isPaused()) { // Dacă e game over sau era pe pauză, resetează/reia
                    gameInstance.reset(); // Sau gameInstance.resume() dacă vrei să continui starea pauzată
                }
                const gameCanvas = document.getElementById('snakeCanvas');
                if(gameCanvas) gameCanvas.focus(); // Setează focus pe canvas pentru input
            }
        });
    }

    // Logica pentru a pune jocul pe pauză dacă tab-ul "Resurse Personale" devine inactiv
    // Acest lucru ar trebui gestionat de `psihoterapie.js` prin apelarea `gameInstance.pause()`
    // sau `gameInstance.setGameVisibility(false)`
    // De exemplu, în `psihoterapie.js` în funcția `showTab`:
    // if (tabName !== 'materiale' && window.snakeGameInstance && typeof window.snakeGameInstance.setGameVisibility === 'function') {
    //     window.snakeGameInstance.setGameVisibility(false);
    // } else if (tabName === 'materiale' && window.snakeGameInstance && typeof window.snakeGameInstance.setGameVisibility === 'function' && snakeGameWrapper.style.display === 'block') {
    //     window.snakeGameInstance.setGameVisibility(true);
    // }
});

// Exportă instanța jocului pentru a putea fi controlată din exterior, dacă e necesar
// window.snakeGameInstance = gameInstance; // O variantă simplă
// O variantă mai bună ar fi ca psihoterapie.js să importe funcții specifice dacă e nevoie.
// Deocamdată, gestionarea vizibilității și pauzei se face prin evenimente și DOM.

// Funcție apelată din psihoterapie.js când tab-ul "materiale" este activat sau dezactivat
export function handleGameVisibility(isVisible) {
    if (gameInstance && typeof gameInstance.setGameVisibility === 'function') {
        gameInstance.setGameVisibility(isVisible && snakeGameWrapper.style.display === 'block');
        if (isVisible && snakeGameWrapper.style.display === 'block' && (gameInstance.isOver() || gameInstance.isPaused())) {
            const gameCanvas = document.getElementById('snakeCanvas');
            if(gameCanvas) gameCanvas.focus();
        }
    } else if (isVisible && !gameInitialized && snakeGameWrapper && startGameButton && snakeGameWrapper.style.display === 'block') {
        // Dacă tab-ul e vizibil, jocul e vizibil în DOM, dar nu e inițializat (ex. după refresh pe tab),
        // și butonul de start e ascuns (deci jocul ar trebui să ruleze), inițializează-l.
        // Aceasta este o încercare de a gestiona cazul când pagina e reîncărcată pe tab-ul de joc.
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