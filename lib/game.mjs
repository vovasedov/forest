export const DEFAULT_SIZE = 10;
export const DEFAULT_WALLS = 40;

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function key(x, y) {
  return `${x},${y}`;
}

function cloneGame(game) {
  return {
    size: game.size,
    wallCount: game.wallCount,
    player: { ...game.player },
    walls: [...game.walls],
    turns: game.turns,
  };
}

export function isInside(size, x, y) {
  return x >= 0 && x < size && y >= 0 && y < size;
}

export function isWall(game, x, y) {
  return game.walls.includes(key(x, y));
}

export function isBlocked(game, x, y) {
  return !isInside(game.size, x, y) || isWall(game, x, y);
}

export function availableMoves(game) {
  const { x, y } = game.player;
  const candidates = [
    { direction: 'forward', x, y: y - 1 },
    { direction: 'backward', x, y: y + 1 },
    { direction: 'left', x: x - 1, y },
    { direction: 'right', x: x + 1, y },
  ];

  return candidates
    .filter((move) => !isBlocked(game, move.x, move.y))
    .map((move) => move.direction);
}

export function createGame({ size = DEFAULT_SIZE, wallCount = DEFAULT_WALLS } = {}) {
  if (!Number.isInteger(size) || size < 2) {
    throw new Error('size must be an integer >= 2');
  }

  const maxWalls = size * size - 1;
  if (!Number.isInteger(wallCount) || wallCount < 0 || wallCount > maxWalls) {
    throw new Error(`wallCount must be an integer between 0 and ${maxWalls}`);
  }

  for (let attempt = 0; attempt < 500; attempt += 1) {
    const player = { x: randomInt(size), y: randomInt(size) };
    const blocked = new Set();

    while (blocked.size < wallCount) {
      const x = randomInt(size);
      const y = randomInt(size);
      if (x === player.x && y === player.y) continue;
      blocked.add(key(x, y));
    }

    const game = {
      size,
      wallCount,
      player,
      walls: [...blocked],
      turns: 0,
    };

    if (availableMoves(game).length > 0) {
      return game;
    }
  }

  throw new Error('Could not generate a playable board. Try fewer walls.');
}

export function movePlayer(game, direction) {
  const next = cloneGame(game);
  const allowed = availableMoves(next);

  if (!allowed.includes(direction)) {
    return {
      ok: false,
      game: next,
      availableMoves: allowed,
      message: `Move '${direction}' is blocked.`,
    };
  }

  switch (direction) {
    case 'forward':
      next.player.y -= 1;
      break;
    case 'backward':
      next.player.y += 1;
      break;
    case 'left':
      next.player.x -= 1;
      break;
    case 'right':
      next.player.x += 1;
      break;
    default:
      return {
        ok: false,
        game: next,
        availableMoves: allowed,
        message: `Unknown direction '${direction}'.`,
      };
  }

  next.turns += 1;

  return {
    ok: true,
    game: next,
    availableMoves: availableMoves(next),
    message: `You moved ${direction}.`,
  };
}
