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

const elements = {
  sizeInput: document.getElementById('sizeInput'),
  wallInput: document.getElementById('wallInput'),
  newGameButton: document.getElementById('newGameButton'),
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

const directionButtons = {
  forward: elements.moveForward,
  backward: elements.moveBackward,
  left: elements.moveLeft,
  right: elements.moveRight
};

function createKey(x, y) {
  return `${x},${y}`;
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

function updateSceneImage() {
  const openMoves = formatOpenMoves(game?.availableMoves);
  elements.sceneImage.src = getImageForMoves(game?.availableMoves);
  elements.sceneImageLabel.textContent = `Open exits: ${openMoves || 'none'}`;
}

function setBusy(nextBusy) {
  busy = nextBusy;
  elements.newGameButton.disabled = nextBusy;

  for (const [direction, button] of Object.entries(directionButtons)) {
    const canMove = Boolean(game && !game.gameOver && game.availableMoves && game.availableMoves[direction]);
    button.disabled = nextBusy || !canMove;
  }
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

  elements.grid.innerHTML = '';
  elements.grid.style.gridTemplateColumns = `repeat(${game.size}, minmax(0, 1fr))`;

  for (let y = 0; y < game.size; y += 1) {
    for (let x = 0; x < game.size; x += 1) {
      const cell = document.createElement('div');
      const currentKey = createKey(x, y);
      const playerHere = game.player.x === x && game.player.y === y;
      const beastHere = game.beast.x === x && game.beast.y === y;
      cell.className = 'cell';
      cell.title = `(${x}, ${y})`;

      if (playerHere && beastHere) {
        cell.classList.add('player');
        cell.textContent = 'X';
      } else if (playerHere) {
        cell.classList.add('player');
        cell.textContent = 'P';
      } else if (beastHere) {
        cell.classList.add('beast');
        cell.textContent = 'B';
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
  elements.beastValue.textContent = `${game.beast.x}, ${game.beast.y}`;
  elements.visitedValue.textContent = String((game.visited || []).length);
  elements.openMovesValue.textContent = formatOpenMoves(game.availableMoves) || 'none';
  elements.outcomeValue.textContent = game.outcome || 'playing';
}

function renderButtons() {
  for (const [direction, button] of Object.entries(directionButtons)) {
    button.dataset.direction = direction;
    button.disabled = busy || !game || game.gameOver || !game.availableMoves || !game.availableMoves[direction];
  }
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

  setBusy(true);

  try {
    const data = await requestJson(`/api/new-game?size=${encodeURIComponent(size)}&wallCount=${encodeURIComponent(wallCount)}`);
    game = data.game;
    localStorage.setItem('grid-quest-current-game', JSON.stringify(game));
    setMessage(data.message || 'New game created.');
    render();
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function move(direction) {
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
        direction,
        game
      })
    });

    game = data.game;
    localStorage.setItem('grid-quest-current-game', JSON.stringify(game));
    setMessage(data.message || `You moved ${direction}.`);
    render();
  } catch (error) {
    setMessage(error.message, true);
    render();
  } finally {
    setBusy(false);
  }
}

function restoreGame() {
  try {
    const raw = localStorage.getItem('grid-quest-current-game');
    if (!raw) {
      render();
      return;
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      game = parsed;
      setMessage('Restored your last local game.');
    }
  } catch {
    localStorage.removeItem('grid-quest-current-game');
  }

  render();
}

for (const [direction, button] of Object.entries(directionButtons)) {
  button.dataset.direction = direction;
  button.addEventListener('click', () => move(direction));
}

elements.newGameButton.addEventListener('click', startNewGame);

window.addEventListener('keydown', (event) => {
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

  const direction = keyMap[event.key];
  if (!direction) {
    return;
  }

  event.preventDefault();
  move(direction);
});

restoreGame();
