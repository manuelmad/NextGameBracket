// State Management
let state = {
    games: [],
    vsSlots: { 1: null, 2: null },
    bracketSize: 8,
    bracketData: {} // Map of slotID -> Game object
};

// --- DOM Elements ---
const gameInput = document.getElementById('game-input');
const addGameBtn = document.getElementById('add-game-btn');
const gameListEl = document.getElementById('game-list');
const gameCountEl = document.getElementById('game-count');
const startTimerBtn = document.getElementById('start-timer-btn');
const timerDisplay = document.getElementById('timer-display');
const timerConfigInput = document.getElementById('timer-config-input');
const bracketSelect = document.getElementById('bracket-size-select');
const bracketRender = document.getElementById('bracket-render');
const showLastBtn = document.getElementById('show-last-btn');
const saveBtn = document.getElementById('save-btn');
const victoryOverlay = document.getElementById('victory-overlay');
const winnerNameDisplay = document.getElementById('winner-name-display');

// --- Initialization ---
function init() {
    renderGameList();
    renderBracket();
    setupDragAndDrop();
}

// --- LocalStorage Logic ---
function saveToLocal() {
    localStorage.setItem('emwins_bracket_data', JSON.stringify({
        games: state.games,
        bracketData: state.bracketData,
        bracketSize: state.bracketSize
    }));
}

function loadFromLocal() {
    const data = localStorage.getItem('emwins_bracket_data');
    if (data) {
        const parsed = JSON.parse(data);
        state.games = parsed.games || [];
        state.bracketData = parsed.bracketData || {};
        state.bracketSize = parsed.bracketSize || 8;
        state.vsSlots = { 1: null, 2: null }; // Reset VS on reload for simplicity

        bracketSelect.value = state.bracketSize;
        renderGameList();
        renderBracket();
        renderVsSlots();
    }
}

// --- Game Pool Management ---
function addGame() {
    const name = gameInput.value.trim();
    if (!name) return;

    const newGame = {
        id: 'game-' + Date.now(),
        name: name
    };

    state.games.push(newGame);
    gameInput.value = '';
    renderGameList();
    // No auto-save here
}

function renderGameList() {
    gameListEl.innerHTML = '';
    state.games.forEach(game => {
        const item = document.createElement('div');
        item.className = 'game-item';
        item.draggable = true;
        item.dataset.gameId = game.id;
        item.innerHTML = `
            <span class="game-name" contenteditable="true">${game.name}</span>
            <div class="actions">
                <button class="icon-btn delete-btn" title="Eliminar">✕</button>
            </div>
        `;

        // Inline Edit
        item.querySelector('.game-name').addEventListener('blur', (e) => {
            game.name = e.target.innerText;
            // No auto-save here
        });

        // Delete
        item.querySelector('.delete-btn').addEventListener('click', () => {
            state.games = state.games.filter(g => g.id !== game.id);
            renderGameList();
            // No auto-save here
        });

        // Drag Start
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({ source: 'pool', game: game }));
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => item.classList.remove('dragging'));

        gameListEl.appendChild(item);
    });
    gameCountEl.innerText = state.games.length;
}

// --- VS Stage Logic ---
function renderVsSlots() {
    [1, 2].forEach(num => {
        const slotEl = document.getElementById(`vs-slot-${num}`);
        const game = state.vsSlots[num];

        if (game) {
            slotEl.innerHTML = `
                <div class="game-card" draggable="true">
                    ${game.name}
                    <button class="icon-btn remove-vs">✕</button>
                </div>
            `;

            const card = slotEl.querySelector('.game-card');
            card.ondragstart = (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ source: 'vs', game: game, slotNum: num }));
            };

            slotEl.querySelector('.remove-vs').onclick = () => {
                state.vsSlots[num] = null;
                renderVsSlots();
            };
        } else {
            slotEl.innerHTML = '<span class="text-muted">Drag here</span>';
        }
    });
}

// --- Timer Logic ---
const pauseTimerBtn = document.getElementById('pause-timer-btn');
const resetTimerBtn = document.getElementById('reset-timer-btn');

timerConfigInput.addEventListener('input', () => {
    if (!timerInterval && !isPaused) {
        timerDisplay.innerText = timerConfigInput.value;
    }
});

let timerInterval = null;
let timeLeft = 0;
let isPaused = false;
function startTimer() {
    if (timerInterval) return;

    if (!isPaused) {
        timeLeft = parseInt(timerConfigInput.value);
        if (isNaN(timeLeft) || timeLeft < 1) timeLeft = 30;
    }

    isPaused = false;
    timerDisplay.innerText = timeLeft;
    startTimerBtn.disabled = true;
    startTimerBtn.innerText = 'BATTLE!';
    pauseTimerBtn.disabled = false;
    pauseTimerBtn.innerText = 'Pause';

    // Lock interaction
    toggleInteractions(false);

    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = timeLeft;

        if (timeLeft <= 5) {
            timerDisplay.classList.add('danger');
        }

        if (timeLeft <= 0) {
            finishTimer();
        }
    }, 1000);
}

function pauseTimer() {
    if (!timerInterval) return;
    clearInterval(timerInterval);
    timerInterval = null;
    isPaused = true;
    startTimerBtn.disabled = false;
    startTimerBtn.innerText = 'Resume';
    pauseTimerBtn.disabled = true;
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isPaused = false;
    timeLeft = parseInt(timerConfigInput.value);
    timerDisplay.innerText = timeLeft;
    timerDisplay.classList.remove('danger');
    startTimerBtn.disabled = false;
    startTimerBtn.innerText = 'Start';
    pauseTimerBtn.disabled = true;
    pauseTimerBtn.innerText = 'Pause';
    toggleInteractions(true);
}

function finishTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isPaused = false;
    timerDisplay.classList.remove('danger');
    startTimerBtn.disabled = false;
    startTimerBtn.innerText = 'Start';
    pauseTimerBtn.disabled = true;

    // Unlock interaction
    toggleInteractions(true);

    // Subtle flash effect or notification
    timerDisplay.style.color = 'var(--accent-success)';
    setTimeout(() => timerDisplay.style.color = '', 2000);
}

function toggleInteractions(enable) {
    document.querySelectorAll('.game-item, .game-card, .slot, .remove-vs, .delete-btn').forEach(el => {
        if (enable) {
            el.classList.remove('disabled');
            if (el.setAttribute) el.setAttribute('draggable', 'true');
        } else {
            el.classList.add('disabled');
            if (el.setAttribute) el.setAttribute('draggable', 'false');
        }
    });
}

// --- Bracket Generation ---
function renderBracket() {
    bracketRender.innerHTML = '';
    const size = parseInt(bracketSelect.value);
    state.bracketSize = size;

    const leftSide = document.createElement('div');
    leftSide.className = 'bracket-side left';

    const rightSide = document.createElement('div');
    rightSide.className = 'bracket-side right';

    const rounds = Math.log2(size);

    // Left Rounds
    for (let r = 0; r < rounds - 1; r++) {
        const roundEl = document.createElement('div');
        roundEl.className = 'round';
        const count = (size / 4) / Math.pow(2, r);
        for (let m = 0; m < count; m++) {
            roundEl.appendChild(createMatchPair(`L-r${r}-m${m}`));
        }
        leftSide.appendChild(roundEl);
    }

    // Right Rounds
    for (let r = 0; r < rounds - 1; r++) {
        const roundEl = document.createElement('div');
        roundEl.className = 'round';
        const count = (size / 4) / Math.pow(2, r);
        for (let m = 0; m < count; m++) {
            roundEl.appendChild(createMatchPair(`R-r${r}-m${m}`));
        }
        rightSide.prepend(roundEl);
    }

    // Center Column (Final Round + Podium)
    const centerColumn = document.createElement('div');
    centerColumn.className = 'bracket-center-column';

    // Final Round
    const finalRound = document.createElement('div');
    finalRound.className = 'round final-round';
    // finalRound.innerHTML = '<h3>GRAND FINAL</h3>';
    finalRound.appendChild(createMatchPair('GrandFinal'));

    // Winner Podium (Center)
    const podium = document.createElement('div');
    podium.className = 'champion-podium';
    const finalSlot = createSlot('Final-Champion');
    finalSlot.classList.add('final-slot');
    podium.innerHTML = '<h3>GRAND FINAL</h3>';
    podium.appendChild(finalSlot);

    centerColumn.appendChild(finalRound);
    centerColumn.appendChild(podium);

    bracketRender.appendChild(leftSide);
    bracketRender.appendChild(centerColumn);
    bracketRender.appendChild(rightSide);

    setupDragAndDrop();
}

function createMatchPair(idPrefix) {
    const pair = document.createElement('div');
    pair.className = 'match-pair';
    pair.appendChild(createSlot(`${idPrefix}-s1`));
    pair.appendChild(createSlot(`${idPrefix}-s2`));
    return pair;
}

function createSlot(id) {
    const slot = document.createElement('div');
    slot.className = 'slot empty';
    slot.dataset.slotId = id;

    const game = state.bracketData[id];
    if (game) {
        slot.classList.remove('empty');
        slot.draggable = true;
        slot.innerHTML = `
            <span class="game-text">${game.name}</span>
            <div class="actions">
                <button class="icon-btn copy-btn" title="Copy (Hold and drag)">📋</button>
                <button class="icon-btn remove-btn">✕</button>
            </div>
        `;

        slot.ondragstart = (e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({
                source: 'bracket',
                game: game,
                originSlotId: id
            }));
        };

        slot.querySelector('.remove-btn').onclick = () => {
            delete state.bracketData[id];
            renderBracket();
            // No auto-save here
        };

        // For "duplicating", we'll use a special drag behavior or just let them copy-paste?
        // Let's implement copy on drag if the source is bracket.

        if (id === 'Final-Champion') {
            setTimeout(() => showVictory(game.name), 100);
        }
    } else {
        slot.innerHTML = '<span class="text-muted">---</span>';
    }

    return slot;
}

function showVictory(name) {
    winnerNameDisplay.innerText = name;
    victoryOverlay.style.display = 'flex';
}

// --- Drag and Drop System ---
function setupDragAndDrop() {
    const targets = document.querySelectorAll('.vs-slot, .slot');

    targets.forEach(target => {
        target.ondragover = (e) => {
            e.preventDefault();
            target.classList.add('drag-over');
        };

        target.ondragleave = () => {
            target.classList.remove('drag-over');
        };

        target.ondrop = (e) => {
            e.preventDefault();
            target.classList.remove('drag-over');

            const dataRaw = e.dataTransfer.getData('application/json');
            if (!dataRaw) return;
            const data = JSON.parse(dataRaw);

            handleDrop(target, data);
        };
    });
}

function handleDrop(target, data) {
    const game = data.game;

    // 1. VS Slots
    if (target.classList.contains('vs-slot')) {
        const slotNum = target.dataset.slot;
        state.vsSlots[slotNum] = game;
        renderVsSlots();
    }
    // 2. Bracket Slots
    else if (target.classList.contains('slot')) {
        const targetId = target.dataset.slotId;
        state.bracketData[targetId] = game;
        renderBracket();
        // No auto-save here
    }
}

// --- Event Listeners ---
saveBtn.addEventListener('click', () => {
    saveToLocal();
    const originalText = saveBtn.innerText;
    saveBtn.innerText = 'Saved! ✓';
    setTimeout(() => saveBtn.innerText = originalText, 2000);
});
addGameBtn.addEventListener('click', addGame);
gameInput.addEventListener('keypress', (e) => e.key === 'Enter' && addGame());
startTimerBtn.addEventListener('click', startTimer);
pauseTimerBtn.addEventListener('click', pauseTimer);
resetTimerBtn.addEventListener('click', resetTimer);
bracketSelect.addEventListener('change', renderBracket);
showLastBtn.addEventListener('click', loadFromLocal);

// Initial Load
init();
