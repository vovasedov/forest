const IMAGE_BY_EXITS = {
  'forward|right|left|back': '/images/crossroad.png',

  'right|left|back': '/images/t-no-forward.png',
  'forward|left|back': '/images/t-no-right.png',
  'forward|right|back': '/images/t-no-left.png',
  'forward|right|left': '/images/t-no-back.png',

  'forward|back': '/images/corridor-vertical.png',
  'left|right': '/images/corridor-horizontal.png',

  'forward|right': '/images/corner-forward-right.png',
  'forward|left': '/images/corner-forward-left.png',
  'back|right': '/images/corner-back-right.png',
  'back|left': '/images/corner-back-left.png',

  'forward': '/images/deadend-forward.png',
  'right': '/images/deadend-right.png',
  'left': '/images/deadend-left.png',
  'back': '/images/deadend-back.png'
};

const ENDGAME_WIN_IMAGE = '/images/endgame_win.png';
const ENDGAME_LOOSE_IMAGE = '/images/endgame_loose.png';
const STORAGE_KEY = 'grid-quest-current-game';

const elements = {
  sizeInput: document.getElementById('sizeInput'),
  wallInput: document.getElementById('wallInput'),
  beastCountInput: document.getElementById('beastCountInput'),
  newGameButton: document.getElementById('newGameButton'),
  catchModeButton: document.getElementById('catchCenterButton'),
  actionModeText: document.getElementById('actionModeText'),
  grid: document.getElementById('grid'),
  turnValue: document.getElementById('turnValue'),
  positionValue: document.getElementById('positionValue'),
  beastValue: document.getElementById('beastValue'),
  visitedValue: document.getElementById('visitedValue'),
  openMovesValue: document.getElementById('openMovesValue'),
  outcomeValue: document.getElementById('outcomeValue'),
  message: document.getElementById('message'),
  sceneImage: document.getElementById('sceneImage'),
  sceneImageLabel: document.getElementById('sceneImageLabel'),
  moveForward: document.getElementById('moveForward'),
  moveBackward: document.getElementById('moveBackward'),
  moveLeft: document.getElementById('moveLeft'),
  moveRight: document.getElementById('moveRight')
};

let game = null;
let busy = false;
let catchMode = false;

const directionButtons = {
  forward: elements.moveForward,
  backward: elements.moveBackward,
  left: elements.moveLeft,
  right: elements.moveRight
};

function createKey(x, y) {
  return `${x},${y}`;
}

function getBeasts(source = game) {
  if (!source) {
    return [];
  }

  if (Array.isArray(source.beasts)) {
    return source.beasts;
  }

  if (source.beast && Number.isInteger(source.beast.x) && Number.isInteger(source.beast.y)) {
    return [source.beast];
  }

  return [];
}

function saveGame() {
  if (!game) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
}

function setMessage(message, isError = false) {
  elements.message.textContent = message;
  elements.message.style.color = isError ? '#fca5a5' : '';
}

function getExitKey(availableMoves) {
  const order = ['forward', 'right', 'left', 'back'];
  return order.filter((direction) => availableMoves && availableMoves[direction]).join('|');
}

function getImageForMoves(availableMoves) {
  const key = getExitKey(availableMoves);
  return IMAGE_BY_EXITS[key] || '/images/crossroad.png';
}

function formatOpenMoves(availableMoves) {
  return Object.entries(availableMoves || {})
    .filter(([, allowed]) => Boolean(allowed))
    .map(([direction]) => direction)
    .join(', ');
}

function isAdjacentBeast(direction) {
  if (!game) {
    return false;
  }

  const offsets = {
    forward: { dx: 0, dy: -1 },
    backward: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 }
  };

  const offset = offsets[direction];
  const targetX = game.player.x + offset.dx;
  const targetY = game.player.y + offset.dy;
  return getBeasts().some((beast) => beast.x === targetX && beast.y === targetY);
}

function updateSceneImage() {
  if (game?.gameOver && game?.outcome === 'caught') {
    elements.sceneImage.src = ENDGAME_LOOSE_IMAGE;
    elements.sceneImage.alt = 'The Beast has caught the player';
    elements.sceneImageLabel.textContent = 'The Beast found you.';
    return;
  }

  if (game?.gameOver && game?.outcome === 'won') {
    elements.sceneImage.src = ENDGAME_WIN_IMAGE;
    elements.sceneImage.alt = 'A Beast has been caught in the net';
    elements.sceneImageLabel.textContent = 'You caught a Beast and won!';
    return;
  }

  const openMoves = formatOpenMoves(game?.availableMoves);
  elements.sceneImage.src = getImageForMoves(game?.availableMoves);
  elements.sceneImage.alt = 'Current view based on open exits';
  elements.sceneImageLabel.textContent = `Open exits: ${openMoves || 'none'}`;
}

function setCatchMode(nextCatchMode) {
  catchMode = Boolean(nextCatchMode && game && !game.gameOver);
  elements.catchModeButton.classList.toggle('active', catchMode);
  elements.catchModeButton.textContent = catchMode ? 'Cancel' : 'Catch';
  elements.actionModeText.textContent = catchMode ? 'Mode: catch - choose a direction' : 'Mode: move';
  renderButtons();
}

function setBusy(nextBusy) {
  busy = nextBusy;
  elements.newGameButton.disabled = nextBusy;
  elements.catchModeButton.disabled = nextBusy || !game || game.gameOver;
  renderButtons();
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data;
}

function renderGrid() {
  if (!game) {
    elements.grid.innerHTML = '';
    elements.grid.style.gridTemplateColumns = 'repeat(10, 1fr)';
    return;
  }

  const wallSet = new Set((game.walls || []).map((wall) => createKey(wall.x, wall.y)));
  const visitedSet = new Set(game.visited || []);
  const beastCounts = new Map();

  for (const beast of getBeasts()) {
    const beastKey = createKey(beast.x, beast.y);
    beastCounts.set(beastKey, (beastCounts.get(beastKey) || 0) + 1);
  }

  elements.grid.innerHTML = '';
  elements.grid.style.gridTemplateColumns = `repeat(${game.size}, var(--cell-size))`;

  for (let y = 0; y < game.size; y += 1) {
    for (let x = 0; x < game.size; x += 1) {
      const cell = document.createElement('div');
      const currentKey = createKey(x, y);
      const playerHere = game.player.x === x && game.player.y === y;
      const beastCountHere = beastCounts.get(currentKey) || 0;
      cell.className = 'cell';
      cell.title = `(${x}, ${y})`;

      if (playerHere && beastCountHere > 0) {
        cell.classList.add('player');
        cell.textContent = 'X';
      } else if (playerHere) {
        cell.classList.add('player');
        cell.textContent = 'P';
      } else if (beastCountHere > 0) {
        cell.classList.add('beast');
        cell.textContent = beastCountHere > 1 ? String(beastCountHere) : 'B';
      } else if (wallSet.has(currentKey)) {
        cell.classList.add('wall');
      } else if (visitedSet.has(currentKey)) {
        cell.classList.add('visited');
      } else {
        cell.classList.add('empty');
      }

      elements.grid.appendChild(cell);
    }
  }
}

function renderStats() {
  if (!game) {
    elements.turnValue.textContent = '-';
    elements.positionValue.textContent = '-';
    elements.beastValue.textContent = '-';
    elements.visitedValue.textContent = '-';
    elements.openMovesValue.textContent = '-';
    elements.outcomeValue.textContent = '-';
    return;
  }

  elements.turnValue.textContent = String(game.turn ?? 0);
  elements.positionValue.textContent = `${game.player.x}, ${game.player.y}`;
  elements.beastValue.textContent = String(getBeasts().length);
  elements.visitedValue.textContent = String((game.visited || []).length);
  elements.openMovesValue.textContent = formatOpenMoves(game.availableMoves) || 'none';
  elements.outcomeValue.textContent = game.outcome || 'playing';
}

function renderButtons() {
  const canAct = Boolean(game && !game.gameOver && !busy);

  for (const [direction, button] of Object.entries(directionButtons)) {
    button.dataset.direction = direction;
    if (!canAct) {
      button.disabled = true;
      button.classList.remove('catch-armed', 'catch-hit');
      continue;
    }

    if (catchMode) {
      button.disabled = false;
      button.classList.add('catch-armed');
      button.classList.toggle('catch-hit', isAdjacentBeast(direction));
    } else {
      button.disabled = !game.availableMoves || !game.availableMoves[direction];
      button.classList.remove('catch-armed', 'catch-hit');
    }
  }

  elements.catchModeButton.disabled = !canAct;
}

function render() {
  renderGrid();
  renderStats();
  renderButtons();
  updateSceneImage();
}

async function startNewGame() {
  const size = Number(elements.sizeInput.value || 10);
  const wallCount = Number(elements.wallInput.value || 40);
  const beastCount = Number(elements.beastCountInput.value || 1);

  setCatchMode(false);
  setBusy(true);

  try {
    const data = await requestJson(
      `/api/new-game?size=${encodeURIComponent(size)}&wallCount=${encodeURIComponent(wallCount)}&beastCount=${encodeURIComponent(beastCount)}`
    );
    game = data.game;
    saveGame();
    setMessage(data.message || 'New game created.');
    render();
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function performAction(action, direction) {
  if (!game || busy || game.gameOver) {
    return;
  }

  setBusy(true);

  try {
    const data = await requestJson('/api/move', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action,
        direction,
        game
      })
    });

    game = data.game;
    saveGame();
    setMessage(data.message || (action === 'catch' ? `You threw the net ${direction}.` : `You moved ${direction}.`));
    setCatchMode(false);
    render();
  } catch (error) {
    setMessage(error.message, true);
    setCatchMode(false);
    render();
  } finally {
    setBusy(false);
  }
}

function handleDirectionPress(direction) {
  if (catchMode) {
    performAction('catch', direction);
    return;
  }

  performAction('move', direction);
}

function restoreGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      render();
      return;
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      game = parsed;
      if (Number.isInteger(parsed.size)) {
        elements.sizeInput.value = String(parsed.size);
      }
      if (Number.isInteger(parsed.wallCount)) {
        elements.wallInput.value = String(parsed.wallCount);
      }
      const beasts = Array.isArray(parsed.beasts)
        ? parsed.beasts.length
        : parsed.beast
          ? 1
          : Number(parsed.beastCount || 1);
      elements.beastCountInput.value = String(Math.min(5, Math.max(1, beasts)));
      setMessage('Restored your last local game.');
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  render();
}

for (const [direction, button] of Object.entries(directionButtons)) {
  button.dataset.direction = direction;
  button.addEventListener('click', () => handleDirectionPress(direction));
}

elements.catchModeButton.addEventListener('click', () => {
  if (!game || busy || game.gameOver) {
    return;
  }

  const nextState = !catchMode;
  setCatchMode(nextState);

  if (nextState) {
    setMessage('Catch mode is active. Choose a direction to throw the net.');
  } else {
    setMessage('Catch mode cancelled.');
  }
});

elements.newGameButton.addEventListener('click', startNewGame);

window.addEventListener('keydown', (event) => {
  if (event.key === ' ' || event.key === 'Enter') {
    if (document.activeElement === elements.catchModeButton) {
      return;
    }
  }

  const keyMap = {
    ArrowUp: 'forward',
    ArrowDown: 'backward',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'forward',
    s: 'backward',
    a: 'left',
    d: 'right',
    W: 'forward',
    S: 'backward',
    A: 'left',
    D: 'right'
  };

  if (event.key === 'c' || event.key === 'C') {
    if (game && !busy && !game.gameOver) {
      event.preventDefault();
      elements.catchModeButton.click();
    }
    return;
  }

  const direction = keyMap[event.key];
  if (!direction) {
    return;
  }

  event.preventDefault();
  handleDirectionPress(direction);
});

restoreGame();
