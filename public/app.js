const state = {
  game: null,
  availableMoves: [],
};

const elements = {
  board: document.getElementById('board'),
  newGameBtn: document.getElementById('newGameBtn'),
  sizeInput: document.getElementById('sizeInput'),
  wallCountInput: document.getElementById('wallCountInput'),
  turnsValue: document.getElementById('turnsValue'),
  positionValue: document.getElementById('positionValue'),
  movesValue: document.getElementById('movesValue'),
  statusText: document.getElementById('statusText'),
  moveButtons: [...document.querySelectorAll('[data-direction]')],
};

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }

  return data;
}

function setStatus(text) {
  elements.statusText.textContent = text;
}

function renderBoard() {
  const game = state.game;
  elements.board.innerHTML = '';

  if (!game) {
    elements.board.style.gridTemplateColumns = 'repeat(10, minmax(0, 1fr))';
    return;
  }

  elements.board.style.gridTemplateColumns = `repeat(${game.size}, minmax(0, 1fr))`;

  const walls = new Set(game.walls);

  for (let y = 0; y < game.size; y += 1) {
    for (let x = 0; x < game.size; x += 1) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.title = `x:${x}, y:${y}`;

      if (walls.has(`${x},${y}`)) {
        tile.classList.add('wall');
        tile.textContent = '■';
      } else if (game.player.x === x && game.player.y === y) {
        tile.classList.add('player');
        tile.textContent = 'P';
      }

      elements.board.appendChild(tile);
    }
  }
}

function renderStats() {
  const game = state.game;

  if (!game) {
    elements.turnsValue.textContent = '0';
    elements.positionValue.textContent = '-';
    elements.movesValue.textContent = '-';
    elements.moveButtons.forEach((button) => {
      button.disabled = true;
    });
    return;
  }

  elements.turnsValue.textContent = String(game.turns);
  elements.positionValue.textContent = `(${game.player.x}, ${game.player.y})`;
  elements.movesValue.textContent = state.availableMoves.join(', ') || 'none';

  elements.moveButtons.forEach((button) => {
    button.disabled = !state.availableMoves.includes(button.dataset.direction);
  });
}

function render() {
  renderBoard();
  renderStats();
}

async function newGame() {
  try {
    const size = Number(elements.sizeInput.value);
    const wallCount = Number(elements.wallCountInput.value);

    const data = await postJson('/.netlify/functions/new-game', { size, wallCount });
    state.game = data.game;
    state.availableMoves = data.availableMoves;
    setStatus(`${data.message} Available moves: ${data.availableMoves.join(', ') || 'none'}.`);
    render();
  } catch (error) {
    setStatus(error.message);
  }
}

async function move(direction) {
  if (!state.game) return;

  try {
    const data = await postJson('/.netlify/functions/move', {
      game: state.game,
      direction,
    });

    state.game = data.game;
    state.availableMoves = data.availableMoves;
    setStatus(`${data.message} Available moves: ${data.availableMoves.join(', ') || 'none'}.`);
    render();
  } catch (error) {
    setStatus(error.message);
  }
}

elements.newGameBtn.addEventListener('click', newGame);
elements.moveButtons.forEach((button) => {
  button.addEventListener('click', () => move(button.dataset.direction));
});

render();
