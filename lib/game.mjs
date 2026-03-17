export const DEFAULT_SIZE = 10;
export const DEFAULT_WALLS = 40;
export const DEFAULT_BEASTS = 1;
export const MIN_BEAST_COUNT = 1;
export const MAX_BEAST_COUNT = 5;
export const MIN_BEAST_DISTANCE = 5;

const DIRECTIONS = {
  forward: { dx: 0, dy: -1 },
  backward: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function randomChoice(items) {
  return items[randomInt(items.length)];
}

function key(x, y) {
  return `${x},${y}`;
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : fallback;
}

export function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(body)
  };
}

export function parseBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      throw new Error('Invalid JSON body.');
    }
  }

  if (typeof body === 'object') {
    return body;
  }

  return {};
}

export function isInside(size, x, y) {
  return x >= 0 && x < size && y >= 0 && y < size;
}

function toWallSet(walls) {
  const result = new Set();
  for (const wall of walls || []) {
    if (wall && Number.isInteger(wall.x) && Number.isInteger(wall.y)) {
      result.add(key(wall.x, wall.y));
    }
  }
  return result;
}

function getFreeCells(size, walls) {
  const wallSet = toWallSet(walls);
  const cells = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!wallSet.has(key(x, y))) {
        cells.push({ x, y });
      }
    }
  }

  return cells;
}

function neighborsFor(size, wallSet, x, y) {
  const neighbors = [];

  for (const [direction, offset] of Object.entries(DIRECTIONS)) {
    const nx = x + offset.dx;
    const ny = y + offset.dy;

    if (isInside(size, nx, ny) && !wallSet.has(key(nx, ny))) {
      neighbors.push({ direction, x: nx, y: ny });
    }
  }

  return neighbors;
}

export function availableMovesForState(size, walls, player) {
  const wallSet = toWallSet(walls);
  const result = {
    forward: false,
    backward: false,
    left: false,
    right: false
  };

  for (const [direction, offset] of Object.entries(DIRECTIONS)) {
    const nx = player.x + offset.dx;
    const ny = player.y + offset.dy;
    result[direction] = isInside(size, nx, ny) && !wallSet.has(key(nx, ny));
  }

  return result;
}

export function allFreeCellsReachable(size, walls) {
  const freeCells = getFreeCells(size, walls);
  if (freeCells.length === 0) {
    return false;
  }

  const wallSet = toWallSet(walls);
  const queue = [freeCells[0]];
  const seen = new Set([key(freeCells[0].x, freeCells[0].y)]);

  while (queue.length > 0) {
    const current = queue.shift();

    for (const neighbor of neighborsFor(size, wallSet, current.x, current.y)) {
      const neighborKey = key(neighbor.x, neighbor.y);
      if (seen.has(neighborKey)) {
        continue;
      }

      seen.add(neighborKey);
      queue.push({ x: neighbor.x, y: neighbor.y });
    }
  }

  return seen.size === freeCells.length;
}

function shortestPathDistance(size, walls, start, end) {
  const wallSet = toWallSet(walls);
  const queue = [{ x: start.x, y: start.y, steps: 0 }];
  const seen = new Set([key(start.x, start.y)]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.x === end.x && current.y === end.y) {
      return current.steps;
    }

    for (const neighbor of neighborsFor(size, wallSet, current.x, current.y)) {
      const neighborKey = key(neighbor.x, neighbor.y);
      if (seen.has(neighborKey)) {
        continue;
      }

      seen.add(neighborKey);
      queue.push({ x: neighbor.x, y: neighbor.y, steps: current.steps + 1 });
    }
  }

  return Number.POSITIVE_INFINITY;
}

function normalizeBeast(beast) {
  if (!beast || !Number.isInteger(beast.x) || !Number.isInteger(beast.y)) {
    return null;
  }

  return {
    x: beast.x,
    y: beast.y,
    previous:
      beast.previous && Number.isInteger(beast.previous.x) && Number.isInteger(beast.previous.y)
        ? { x: beast.previous.x, y: beast.previous.y }
        : null
  };
}

function normalizeBeasts(input) {
  if (Array.isArray(input?.beasts)) {
    return input.beasts.map(normalizeBeast).filter(Boolean);
  }

  const legacyBeast = normalizeBeast(input?.beast);
  return legacyBeast ? [legacyBeast] : [];
}

function normalizeGameShape(input) {
  const size = parseInteger(input?.size, DEFAULT_SIZE);
  const wallCount = parseInteger(input?.wallCount, DEFAULT_WALLS);
  const beasts = normalizeBeasts(input);
  const beastCount = parseInteger(input?.beastCount, beasts.length || DEFAULT_BEASTS);

  const walls = Array.isArray(input?.walls)
    ? input.walls
        .filter((wall) => wall && Number.isInteger(wall.x) && Number.isInteger(wall.y))
        .map((wall) => ({ x: wall.x, y: wall.y }))
    : [];

  const player = input?.player && Number.isInteger(input.player.x) && Number.isInteger(input.player.y)
    ? { x: input.player.x, y: input.player.y }
    : { x: 0, y: 0 };

  const visited = Array.isArray(input?.visited)
    ? input.visited.filter((item) => typeof item === 'string')
    : [key(player.x, player.y)];

  return {
    size,
    wallCount,
    beastCount,
    walls,
    player,
    beasts,
    visited,
    turn: parseInteger(input?.turn, 0),
    gameOver: Boolean(input?.gameOver),
    outcome: typeof input?.outcome === 'string' ? input.outcome : 'playing'
  };
}

function hydrateGame(game) {
  return {
    ...game,
    beastCount: game.beasts.length,
    availableMoves: availableMovesForState(game.size, game.walls, game.player)
  };
}

export function sanitizeGame(input) {
  const game = normalizeGameShape(input);
  const maxWalls = game.size * game.size - (1 + game.beastCount);

  if (!Number.isInteger(game.size) || game.size < 2) {
    throw new Error('Board size must be at least 2.');
  }

  if (!Number.isInteger(game.beastCount) || game.beastCount < MIN_BEAST_COUNT || game.beastCount > MAX_BEAST_COUNT) {
    throw new Error(`Beast count must be between ${MIN_BEAST_COUNT} and ${MAX_BEAST_COUNT}.`);
  }

  if (!Number.isInteger(game.wallCount) || game.wallCount < 0 || game.wallCount > maxWalls) {
    throw new Error(`Wall count must be between 0 and ${maxWalls}.`);
  }

  if (game.walls.length !== game.wallCount) {
    throw new Error('Game walls are invalid.');
  }

  if (game.beasts.length !== game.beastCount) {
    throw new Error('Game beasts are invalid.');
  }

  const wallSet = toWallSet(game.walls);
  if (wallSet.size !== game.walls.length) {
    throw new Error('Duplicate walls are not allowed.');
  }

  const positions = [game.player, ...game.beasts];
  for (const point of positions) {
    if (!isInside(game.size, point.x, point.y)) {
      throw new Error('Game position is outside the board.');
    }
    if (wallSet.has(key(point.x, point.y))) {
      throw new Error('Game position overlaps a wall.');
    }
  }

  if (!allFreeCellsReachable(game.size, game.walls)) {
    throw new Error('Board is not fully connected.');
  }

  return hydrateGame(game);
}

function createRandomWalls(size, wallCount, reservedCells) {
  const reservedSet = new Set(reservedCells.map((cell) => key(cell.x, cell.y)));
  const wallSet = new Set();

  while (wallSet.size < wallCount) {
    const x = randomInt(size);
    const y = randomInt(size);
    const cellKey = key(x, y);

    if (reservedSet.has(cellKey)) {
      continue;
    }

    wallSet.add(cellKey);
  }

  return [...wallSet].map((entry) => {
    const [x, y] = entry.split(',').map(Number);
    return { x, y };
  });
}

function sampleWithoutReplacement(items, count) {
  const pool = [...items];
  const result = [];

  while (result.length < count && pool.length > 0) {
    const index = randomInt(pool.length);
    result.push(pool[index]);
    pool.splice(index, 1);
  }

  return result;
}

export function generateGame({
  size = DEFAULT_SIZE,
  wallCount = DEFAULT_WALLS,
  beastCount = DEFAULT_BEASTS
} = {}) {
  const normalizedSize = parseInteger(size, DEFAULT_SIZE);
  const normalizedWallCount = parseInteger(wallCount, DEFAULT_WALLS);
  const normalizedBeastCount = parseInteger(beastCount, DEFAULT_BEASTS);
  const maxWalls = normalizedSize * normalizedSize - (1 + normalizedBeastCount);

  if (!Number.isInteger(normalizedSize) || normalizedSize < 2) {
    throw new Error('Board size must be an integer >= 2.');
  }

  if (!Number.isInteger(normalizedBeastCount) || normalizedBeastCount < MIN_BEAST_COUNT || normalizedBeastCount > MAX_BEAST_COUNT) {
    throw new Error(`Beast count must be an integer between ${MIN_BEAST_COUNT} and ${MAX_BEAST_COUNT}.`);
  }

  if (!Number.isInteger(normalizedWallCount) || normalizedWallCount < 0 || normalizedWallCount > maxWalls) {
    throw new Error(`Wall count must be an integer between 0 and ${maxWalls}.`);
  }

  for (let attempt = 0; attempt < 5000; attempt += 1) {
    const player = { x: randomInt(normalizedSize), y: randomInt(normalizedSize) };
    const walls = createRandomWalls(normalizedSize, normalizedWallCount, [player]);

    if (!allFreeCellsReachable(normalizedSize, walls)) {
      continue;
    }

    const freeCells = getFreeCells(normalizedSize, walls).filter((cell) => !(cell.x === player.x && cell.y === player.y));
    const beastCandidates = freeCells.filter((cell) => {
      const distance = shortestPathDistance(normalizedSize, walls, player, cell);
      return Number.isFinite(distance) && distance >= MIN_BEAST_DISTANCE;
    });

    if (beastCandidates.length < normalizedBeastCount) {
      continue;
    }

    const beasts = sampleWithoutReplacement(beastCandidates, normalizedBeastCount).map((cell) => ({
      x: cell.x,
      y: cell.y,
      previous: null
    }));

    const game = {
      size: normalizedSize,
      wallCount: normalizedWallCount,
      beastCount: normalizedBeastCount,
      walls,
      player,
      beasts,
      visited: [key(player.x, player.y)],
      turn: 0,
      gameOver: false,
      outcome: 'playing'
    };

    return hydrateGame(game);
  }

  throw new Error('Could not generate a valid board. Try fewer walls, fewer beasts, or a larger board.');
}

function movePoint(point, direction) {
  const offset = DIRECTIONS[direction];
  return {
    x: point.x + offset.dx,
    y: point.y + offset.dy
  };
}

function getLegalMovesForPoint(game, point) {
  const available = availableMovesForState(game.size, game.walls, point);
  return Object.entries(available)
    .filter(([, allowed]) => allowed)
    .map(([direction]) => direction);
}

function moveBeastRandomly(game, beast) {
  const legalMoves = getLegalMovesForPoint(game, beast);
  if (legalMoves.length === 0) {
    return {
      beast,
      moved: false,
      direction: null
    };
  }

  const direction = randomChoice(legalMoves);
  const nextPosition = movePoint(beast, direction);

  return {
    beast: {
      x: nextPosition.x,
      y: nextPosition.y,
      previous: { x: beast.x, y: beast.y }
    },
    moved: true,
    direction
  };
}

function isAnyBeastOnCell(beasts, target) {
  return beasts.some((beast) => beast.x === target.x && beast.y === target.y);
}

function moveAllBeasts(game) {
  const results = game.beasts.map((beast) => moveBeastRandomly(game, beast));

  return {
    beasts: results.map((entry) => entry.beast),
    movedCount: results.filter((entry) => entry.moved).length,
    stuckCount: results.filter((entry) => !entry.moved).length
  };
}

function getBeastMovementMessage(totalCount, movedCount, stuckCount) {
  if (totalCount === 1) {
    return movedCount === 1 ? ' The Beast moved.' : ' The Beast could not move.';
  }

  if (movedCount === totalCount) {
    return ' The Beasts moved.';
  }

  if (movedCount === 0) {
    return ' None of the Beasts could move.';
  }

  return ` ${movedCount} Beast${movedCount === 1 ? '' : 's'} moved and ${stuckCount} stayed put.`;
}

function finishCaught(game, message) {
  return {
    moved: true,
    game: hydrateGame({
      ...game,
      gameOver: true,
      outcome: 'caught'
    }),
    message
  };
}

function finishWon(game, message) {
  return {
    moved: true,
    game: hydrateGame({
      ...game,
      gameOver: true,
      outcome: 'won'
    }),
    message
  };
}

function validateActionDirection(game, direction) {
  if (game.gameOver) {
    return {
      ok: false,
      response: {
        moved: false,
        game,
        message: 'The game is already over.'
      }
    };
  }

  if (!Object.prototype.hasOwnProperty.call(DIRECTIONS, direction)) {
    return {
      ok: false,
      response: {
        moved: false,
        game,
        message: `Unknown direction '${direction}'.`
      }
    };
  }

  return { ok: true };
}

export function applyMove(inputGame, direction) {
  const game = sanitizeGame(inputGame);
  const validation = validateActionDirection(game, direction);
  if (!validation.ok) {
    return validation.response;
  }

  if (!game.availableMoves[direction]) {
    return {
      moved: false,
      game,
      message: `You cannot move ${direction} from here.`
    };
  }

  const nextPlayer = movePoint(game.player, direction);
  const nextVisited = new Set(game.visited);
  nextVisited.add(key(nextPlayer.x, nextPlayer.y));

  let nextGame = {
    ...game,
    player: nextPlayer,
    visited: [...nextVisited],
    turn: game.turn + 1
  };

  if (isAnyBeastOnCell(nextGame.beasts, nextGame.player)) {
    return finishCaught(nextGame, `You moved ${direction}, but ran straight into a Beast.`);
  }

  const beastStep = moveAllBeasts(nextGame);
  nextGame = {
    ...nextGame,
    beasts: beastStep.beasts
  };

  if (isAnyBeastOnCell(nextGame.beasts, nextGame.player)) {
    const who = nextGame.beasts.length === 1 ? 'The Beast caught you.' : 'One of the Beasts caught you.';
    return finishCaught(nextGame, `You moved ${direction}.${getBeastMovementMessage(nextGame.beasts.length, beastStep.movedCount, beastStep.stuckCount)} ${who}`);
  }

  return {
    moved: true,
    game: hydrateGame(nextGame),
    message: `You moved ${direction}.${getBeastMovementMessage(nextGame.beasts.length, beastStep.movedCount, beastStep.stuckCount)}`
  };
}

export function applyCatch(inputGame, direction) {
  const game = sanitizeGame(inputGame);
  const validation = validateActionDirection(game, direction);
  if (!validation.ok) {
    return validation.response;
  }

  const target = movePoint(game.player, direction);
  const nextGame = {
    ...game,
    turn: game.turn + 1
  };

  if (isInside(game.size, target.x, target.y) && isAnyBeastOnCell(game.beasts, target)) {
    return finishWon(nextGame, `You threw the net ${direction} and caught a Beast in the next cell. You win!`);
  }

  const beastStep = moveAllBeasts(nextGame);
  const afterMiss = {
    ...nextGame,
    beasts: beastStep.beasts
  };

  if (isAnyBeastOnCell(afterMiss.beasts, afterMiss.player)) {
    const who = afterMiss.beasts.length === 1 ? 'The Beast caught you.' : 'One of the Beasts caught you.';
    return finishCaught(afterMiss, `You threw the net ${direction}, but missed.${getBeastMovementMessage(afterMiss.beasts.length, beastStep.movedCount, beastStep.stuckCount)} ${who}`);
  }

  return {
    moved: true,
    game: hydrateGame(afterMiss),
    message: `You threw the net ${direction}, but missed.${getBeastMovementMessage(afterMiss.beasts.length, beastStep.movedCount, beastStep.stuckCount)}`
  };
}
