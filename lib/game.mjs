export const DEFAULT_SIZE = 10;
export const DEFAULT_WALLS = 40;
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
  const seen = new Set();
  const queue = [freeCells[0]];
  seen.add(key(freeCells[0].x, freeCells[0].y));

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

function normalizeGameShape(input) {
  const size = parseInteger(input?.size, DEFAULT_SIZE);
  const wallCount = parseInteger(input?.wallCount, DEFAULT_WALLS);
  const walls = Array.isArray(input?.walls)
    ? input.walls
        .filter((wall) => wall && Number.isInteger(wall.x) && Number.isInteger(wall.y))
        .map((wall) => ({ x: wall.x, y: wall.y }))
    : [];

  const player = input?.player && Number.isInteger(input.player.x) && Number.isInteger(input.player.y)
    ? { x: input.player.x, y: input.player.y }
    : { x: 0, y: 0 };

  const beast = input?.beast && Number.isInteger(input.beast.x) && Number.isInteger(input.beast.y)
    ? {
        x: input.beast.x,
        y: input.beast.y,
        previous: input.beast.previous && Number.isInteger(input.beast.previous.x) && Number.isInteger(input.beast.previous.y)
          ? { x: input.beast.previous.x, y: input.beast.previous.y }
          : null
      }
    : { x: 0, y: 0, previous: null };

  const visited = Array.isArray(input?.visited)
    ? input.visited.filter((item) => typeof item === 'string')
    : [key(player.x, player.y)];

  return {
    size,
    wallCount,
    walls,
    player,
    beast,
    visited,
    turn: parseInteger(input?.turn, 0),
    gameOver: Boolean(input?.gameOver),
    outcome: typeof input?.outcome === 'string' ? input.outcome : 'playing'
  };
}

function hydrateGame(game) {
  return {
    ...game,
    availableMoves: availableMovesForState(game.size, game.walls, game.player)
  };
}

export function sanitizeGame(input) {
  const game = normalizeGameShape(input);
  const maxWalls = game.size * game.size - 2;

  if (!Number.isInteger(game.size) || game.size < 2) {
    throw new Error('Board size must be at least 2.');
  }

  if (!Number.isInteger(game.wallCount) || game.wallCount < 0 || game.wallCount > maxWalls) {
    throw new Error(`Wall count must be between 0 and ${maxWalls}.`);
  }

  if (game.walls.length !== game.wallCount) {
    throw new Error('Game walls are invalid.');
  }

  const wallSet = toWallSet(game.walls);
  if (wallSet.size !== game.walls.length) {
    throw new Error('Duplicate walls are not allowed.');
  }

  for (const point of [game.player, game.beast]) {
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

export function generateGame({ size = DEFAULT_SIZE, wallCount = DEFAULT_WALLS } = {}) {
  const normalizedSize = parseInteger(size, DEFAULT_SIZE);
  const normalizedWallCount = parseInteger(wallCount, DEFAULT_WALLS);
  const maxWalls = normalizedSize * normalizedSize - 2;

  if (!Number.isInteger(normalizedSize) || normalizedSize < 2) {
    throw new Error('Board size must be an integer >= 2.');
  }

  if (!Number.isInteger(normalizedWallCount) || normalizedWallCount < 0 || normalizedWallCount > maxWalls) {
    throw new Error(`Wall count must be an integer between 0 and ${maxWalls}.`);
  }

  for (let attempt = 0; attempt < 4000; attempt += 1) {
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

    if (beastCandidates.length === 0) {
      continue;
    }

    const beastCell = randomChoice(beastCandidates);
    const game = {
      size: normalizedSize,
      wallCount: normalizedWallCount,
      walls,
      player,
      beast: {
        x: beastCell.x,
        y: beastCell.y,
        previous: null
      },
      visited: [key(player.x, player.y)],
      turn: 0,
      gameOver: false,
      outcome: 'playing'
    };

    return hydrateGame(game);
  }

  throw new Error('Could not generate a valid board. Try fewer walls or a larger board.');
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

function moveBeastRandomly(game) {
  const legalMoves = getLegalMovesForPoint(game, game.beast);
  if (legalMoves.length === 0) {
    return {
      beast: game.beast,
      moved: false,
      direction: null
    };
  }

  const direction = randomChoice(legalMoves);
  const nextPosition = movePoint(game.beast, direction);

  return {
    beast: {
      x: nextPosition.x,
      y: nextPosition.y,
      previous: { x: game.beast.x, y: game.beast.y }
    },
    moved: true,
    direction
  };
}

export function applyMove(inputGame, direction) {
  const game = sanitizeGame(inputGame);

  if (game.gameOver) {
    return {
      moved: false,
      game,
      message: 'The game is already over.'
    };
  }

  if (!Object.prototype.hasOwnProperty.call(DIRECTIONS, direction)) {
    return {
      moved: false,
      game,
      message: `Unknown direction '${direction}'.`
    };
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

  if (nextGame.player.x === nextGame.beast.x && nextGame.player.y === nextGame.beast.y) {
    nextGame = hydrateGame({
      ...nextGame,
      gameOver: true,
      outcome: 'caught'
    });

    return {
      moved: true,
      game: nextGame,
      message: `You moved ${direction}, but ran straight into the Beast.`
    };
  }

  const beastStep = moveBeastRandomly(nextGame);
  nextGame = hydrateGame({
    ...nextGame,
    beast: beastStep.beast
  });

  if (nextGame.player.x === nextGame.beast.x && nextGame.player.y === nextGame.beast.y) {
    nextGame = hydrateGame({
      ...nextGame,
      gameOver: true,
      outcome: 'caught'
    });

    return {
      moved: true,
      game: nextGame,
      message: beastStep.moved
        ? `You moved ${direction}. The Beast moved ${beastStep.direction} and caught you.`
        : `You moved ${direction}. The Beast could not move, but you are caught.`
    };
  }

  const beastMessage = beastStep.moved
    ? ` The Beast moved ${beastStep.direction}.`
    : ' The Beast could not move.';

  return {
    moved: true,
    game: nextGame,
    message: `You moved ${direction}.${beastMessage}`
  };
}
