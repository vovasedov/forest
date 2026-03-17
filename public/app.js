const elements = {
  sizeInput: document.getElementById('sizeInput'),
  wallInput: document.getElementById('wallInput'),
  newGameButton: document.getElementById('newGameButton'),
  grid: document.getElementById('grid'),
  turnValue: document.getElementById('turnValue'),
  positionValue: document.getElementById('positionValue'),
  beastPositionValue: document.getElementById('beastPositionValue'),
  beastDistanceValue: document.getElementById('beastDistanceValue'),
  visitedValue: document.getElementById('visitedValue'),
  openMovesValue: document.getElementById('openMovesValue'),
  message: document.getElementById('message'),
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

function setMessage(message, isError = false) {
  elements.message.textContent = message;
  elements.message.style.color = isError ? '#fca5a5' : '';
}

function gameIsPlayable() {
  return Boolean(game && game.status !== 'lost');
}

function setBusy(nextBusy) {
  busy = nextBusy;
  elements.newGameButton.disabled = nextBusy;

  for (const [direction, button] of Object.entries(directionButtons)) {
    button.disabled =
      nextBusy ||
      !gameIsPlayable() ||
      !game ||
      !game.availableMoves ||
      !game.availableMoves[direction];
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

function createKey(x, y) {
  return `${x},${y}`;
}

function renderGrid() {
  if (!game) {
    elements.grid.innerHTML = '';
    elements.grid.style.gridTemplateColumns = 'repeat(10, 1fr)';
    return;
  }

  const wallSet = new Set(game.walls.map((wall) => createKey(wall.x, wall.y)));
  const visitedSet = new Set(game.visited || []);

  elements.grid.innerHTML = '';
  elements.grid.style.gridTemplateColumns = `repeat(${game.size}, minmax(0, 1fr))`;

  for (let y = 0; y < game.size; y += 1) {
    for (let x = 0; x < game.size; x += 1) {
      const cell = document.createElement('div');
      const key = createKey(x, y);
      const isPlayer = game.player.x === x && game.player.y === y;
      const isBeast = game.beast.x === x && game.beast.y === y;

      cell.className = 'cell';
      cell.title = `(${x}, ${y})`;

      if (isPlayer && isBeast) {
        cell.classList.add('caught');
        cell.textContent = '!';
      } else if (isPlayer) {
        cell.classList.add('player');
        cell.textContent = 'P';
      } else if (isBeast) {
        cell.classList.add('beast');
        cell.textContent = 'B';
      } else if (wallSet.has(key)) {
        cell.classList.add('wall');
      } else if (visitedSet.has(key)) {
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
    elements.beastPositionValue.textContent = '-';
    elements.beastDistanceValue.textContent = '-';
    elements.visitedValue.textContent = '-';
    elements.openMovesValue.textContent = '-';
    return;
  }

  elements.turnValue.textContent = String(game.turn);
  elements.positionValue.textContent = `${game.player.x}, ${game.player.y}`;
  elements.beastPositionValue.textContent = `${game.beast.x}, ${game.beast.y}`;
  elements.beastDistanceValue.textContent =
    game.beastDistance == null ? 'blocked' : String(game.beastDistance);
  elements.visitedValue.textContent = String((game.visited || []).length);

  const openMoves = Object.entries(game.availableMoves || {})
    .filter(([, isOpen]) => Boolean(isOpen))
    .map(([direction]) => direction)
    .join(', ');

  elements.openMovesValue.textContent = openMoves || 'none';
}

function renderButtons() {
  for (const [direction, button] of Object.entries(directionButtons)) {
    button.dataset.direction = direction;
    button.disabled = busy || !gameIsPlayable() || !game?.availableMoves?.[direction];
  }
}

function render() {
  renderGrid();
  renderStats();
  renderButtons();
}

async function startNewGame() {
  const size = Number(elements.sizeInput.value || 10);
  const wallCount = Number(elements.wallInput.value || 40);

  setBusy(true);

  try {
    const data = await requestJson(
      `/api/new-game?size=${encodeURIComponent(size)}&wallCount=${encodeURIComponent(wallCount)}`
    );
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
  if (!game || busy || game.status === 'lost') {
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
      setMessage(parsed.status === 'lost' ? 'Restored a finished game.' : 'Restored your last local game.');
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
