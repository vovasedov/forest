export const DEFAULT_SIZE = 10;
export const DEFAULT_WALL_COUNT = 40;
export const MIN_BEAST_DISTANCE = 5;

export const DIRECTIONS = {
  forward: { dx: 0, dy: -1, label: 'forward' },
  backward: { dx: 0, dy: 1, label: 'backward' },
  left: { dx: -1, dy: 0, label: 'left' },
  right: { dx: 1, dy: 0, label: 'right' }
};

export function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    },
    body: JSON.stringify(payload)
  };
}

export function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'object') return body;

  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

export function normalizeInteger(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue)) {
    return fallback;
  }
  return numericValue;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function toKey(x, y) {
  return `${x},${y}`;
}

export function fromKey(key) {
  const [x, y] = String(key).split(',').map(Number);
  return { x, y };
}

export function isInside(size, x, y) {
  return x >= 0 && x < size && y >= 0 && y < size;
}

export function randomInt(max) {
  return Math.floor(Math.random() * max);
}

export function createWallSet(walls) {
  const wallSet = new Set();

  for (const wall of Array.isArray(walls) ? walls : []) {
    if (wall && Number.isInteger(wall.x) && Number.isInteger(wall.y)) {
      wallSet.add(toKey(wall.x, wall.y));
    }
  }

  return wallSet;
}

export function getNeighbors(size, x, y, wallSet) {
  const neighbors = [];

  for (const delta of Object.values(DIRECTIONS)) {
    const nextX = x + delta.dx;
    const nextY = y + delta.dy;
    const key = toKey(nextX, nextY);

    if (isInside(size, nextX, nextY) && !wallSet.has(key)) {
      neighbors.push({ x: nextX, y: nextY });
    }
  }

  return neighbors;
}

export function getFreeCells(size, wallSet) {
  const freeCells = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!wallSet.has(toKey(x, y))) {
        freeCells.push({ x, y });
      }
    }
  }

  return freeCells;
}

export function getDistancesFrom(size, start, wallSet) {
  const distances = new Map();
  const queue = [start];
  distances.set(toKey(start.x, start.y), 0);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const currentKey = toKey(current.x, current.y);
    const currentDistance = distances.get(currentKey);

    for (const neighbor of getNeighbors(size, current.x, current.y, wallSet)) {
      const neighborKey = toKey(neighbor.x, neighbor.y);
      if (distances.has(neighborKey)) {
        continue;
      }

      distances.set(neighborKey, currentDistance + 1);
      queue.push(neighbor);
    }
  }

  return distances;
}

export function allFreeCellsReachable(size, wallSet) {
  const freeCells = getFreeCells(size, wallSet);
  if (freeCells.length === 0) {
    return false;
  }

  const reachable = getDistancesFrom(size, freeCells[0], wallSet);
  return reachable.size === freeCells.length;
}

export function getAvailableMoves(game) {
  const availableMoves = {};
  const wallSet = createWallSet(game.walls);

  for (const [directionName, delta] of Object.entries(DIRECTIONS)) {
    const nextX = game.player.x + delta.dx;
    const nextY = game.player.y + delta.dy;
    availableMoves[directionName] =
      isInside(game.size, nextX, nextY) && !wallSet.has(toKey(nextX, nextY));
  }

  return availableMoves;
}

function getNextBeastPosition(game) {
  const wallSet = createWallSet(game.walls);
  const neighbors = getNeighbors(game.size, game.beast.x, game.beast.y, wallSet);

  if (neighbors.length === 0) {
    return { ...game.beast };
  }

  return { ...neighbors[randomInt(neighbors.length)] };
}

function hydrateGame(game) {
  const wallSet = createWallSet(game.walls);
  const distancesFromPlayer = getDistancesFrom(game.size, game.player, wallSet);
  const beastDistance = distancesFromPlayer.get(toKey(game.beast.x, game.beast.y)) ?? null;

  return {
    ...game,
    wallCount: game.walls.length,
    availableMoves: getAvailableMoves(game),
    beastDistance
  };
}

function randomWallSet(size, wallCount) {
  const wallSet = new Set();

  while (wallSet.size < wallCount) {
    wallSet.add(toKey(randomInt(size), randomInt(size)));
  }

  return wallSet;
}

export function generateGame(options = {}) {
  const size = clamp(normalizeInteger(options.size, DEFAULT_SIZE), 2, 50);
  const maxWalls = Math.max(0, size * size - 2);
  const requestedWallCount = normalizeInteger(options.wallCount, DEFAULT_WALL_COUNT);
  const wallCount = clamp(requestedWallCount, 0, maxWalls);
  const minimumRequiredDistance = Math.max(1, normalizeInteger(options.minBeastDistance, MIN_BEAST_DISTANCE));

  for (let attempt = 0; attempt < 2000; attempt += 1) {
    const wallSet = randomWallSet(size, wallCount);
    const freeCells = getFreeCells(size, wallSet);

    if (freeCells.length < 2) {
      continue;
    }

    if (!allFreeCellsReachable(size, wallSet)) {
      continue;
    }

    const player = freeCells[randomInt(freeCells.length)];
    const distancesFromPlayer = getDistancesFrom(size, player, wallSet);
    const beastCandidates = freeCells.filter((cell) => {
      if (cell.x === player.x && cell.y === player.y) {
        return false;
      }

      const distance = distancesFromPlayer.get(toKey(cell.x, cell.y));
      return Number.isInteger(distance) && distance >= minimumRequiredDistance;
    });

    if (beastCandidates.length === 0) {
      continue;
    }

    const beast = beastCandidates[randomInt(beastCandidates.length)];
    const walls = Array.from(wallSet).map(fromKey);

    return hydrateGame({
      size,
      wallCount: walls.length,
      walls,
      player: { ...player },
      beast: { ...beast },
      turn: 0,
      visited: [toKey(player.x, player.y)],
      status: 'playing'
    });
  }

  throw new Error('Could not generate a fully connected board with a distant Beast. Try fewer walls.');
}

export function sanitizeGame(rawGame) {
  if (!rawGame || typeof rawGame !== 'object') {
    throw new Error('Missing game state.');
  }

  const size = clamp(normalizeInteger(rawGame.size, DEFAULT_SIZE), 2, 50);
  const walls = [];
  const wallSet = new Set();

  for (const wall of Array.isArray(rawGame.walls) ? rawGame.walls : []) {
    const x = normalizeInteger(wall?.x, Number.NaN);
    const y = normalizeInteger(wall?.y, Number.NaN);

    if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
    if (!isInside(size, x, y)) continue;

    const key = toKey(x, y);
    if (wallSet.has(key)) continue;

    wallSet.add(key);
    walls.push({ x, y });
  }

  const playerX = normalizeInteger(rawGame.player?.x, Number.NaN);
  const playerY = normalizeInteger(rawGame.player?.y, Number.NaN);
  const beastX = normalizeInteger(rawGame.beast?.x, Number.NaN);
  const beastY = normalizeInteger(rawGame.beast?.y, Number.NaN);

  if (!Number.isInteger(playerX) || !Number.isInteger(playerY)) {
    throw new Error('Invalid player position.');
  }

  if (!Number.isInteger(beastX) || !Number.isInteger(beastY)) {
    throw new Error('Invalid Beast position.');
  }

  if (!isInside(size, playerX, playerY) || wallSet.has(toKey(playerX, playerY))) {
    throw new Error('Player position is invalid.');
  }

  if (!isInside(size, beastX, beastY) || wallSet.has(toKey(beastX, beastY))) {
    throw new Error('Beast position is invalid.');
  }

  const visited = [];
  const visitedSet = new Set();

  for (const item of Array.isArray(rawGame.visited) ? rawGame.visited : []) {
    if (typeof item !== 'string') continue;
    const point = fromKey(item);
    if (!Number.isInteger(point.x) || !Number.isInteger(point.y)) continue;
    if (!isInside(size, point.x, point.y)) continue;
    if (wallSet.has(item)) continue;
    if (visitedSet.has(item)) continue;

    visitedSet.add(item);
    visited.push(item);
  }

  const playerKey = toKey(playerX, playerY);
  if (!visitedSet.has(playerKey)) {
    visited.push(playerKey);
  }

  return hydrateGame({
    size,
    wallCount: walls.length,
    walls,
    player: { x: playerX, y: playerY },
    beast: { x: beastX, y: beastY },
    turn: Math.max(0, normalizeInteger(rawGame.turn, 0)),
    visited,
    status: rawGame.status === 'lost' ? 'lost' : 'playing'
  });
}

export function applyMove(game, direction) {
  if (!Object.prototype.hasOwnProperty.call(DIRECTIONS, direction)) {
    return {
      moved: false,
      message: `Unknown direction '${direction}'.`,
      game: hydrateGame(game)
    };
  }

  if (game.status === 'lost') {
    return {
      moved: false,
      message: 'The game is already over.',
      game: hydrateGame(game)
    };
  }

  const availableMoves = getAvailableMoves(game);
  if (!availableMoves[direction]) {
    return {
      moved: false,
      message: `You cannot move ${direction}.`,
      game: hydrateGame(game)
    };
  }

  const delta = DIRECTIONS[direction];
  const nextPlayer = {
    x: game.player.x + delta.dx,
    y: game.player.y + delta.dy
  };

  const visited = Array.isArray(game.visited) ? [...game.visited] : [];
  const nextPlayerKey = toKey(nextPlayer.x, nextPlayer.y);
  if (!visited.includes(nextPlayerKey)) {
    visited.push(nextPlayerKey);
  }

  let nextGame = {
    ...game,
    player: nextPlayer,
    visited,
    turn: game.turn + 1,
    status: 'playing'
  };

  if (nextPlayer.x === game.beast.x && nextPlayer.y === game.beast.y) {
    nextGame = hydrateGame({
      ...nextGame,
      status: 'lost'
    });

    return {
      moved: true,
      message: `You moved ${direction} straight into the Beast.`,
      game: nextGame
    };
  }

  const nextBeast = getNextBeastPosition(nextGame);
  nextGame = hydrateGame({
    ...nextGame,
    beast: nextBeast,
    status: nextBeast.x === nextGame.player.x && nextBeast.y === nextGame.player.y ? 'lost' : 'playing'
  });

  const beastStep =
    nextBeast.x === game.beast.x && nextBeast.y === game.beast.y
      ? 'stayed still'
      : `moved to ${nextBeast.x}, ${nextBeast.y}`;

  return {
    moved: true,
    message:
      nextGame.status === 'lost'
        ? `You moved ${direction}. The Beast ${beastStep} and caught you.`
        : `You moved ${direction}. The Beast ${beastStep}.`,
    game: nextGame
  };
}
