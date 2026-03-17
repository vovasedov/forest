import { createGame, availableMoves, DEFAULT_SIZE, DEFAULT_WALLS } from '../../lib/game.mjs';

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

function response(statusCode, data) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(data),
  };
}

function parseRequest(event) {
  const fromQuery = {
    size: event.queryStringParameters?.size,
    wallCount: event.queryStringParameters?.wallCount,
  };

  if (!event.body) return fromQuery;

  try {
    return { ...fromQuery, ...JSON.parse(event.body) };
  } catch {
    return fromQuery;
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (!['GET', 'POST'].includes(event.httpMethod)) {
    return response(405, { error: 'Method not allowed' });
  }

  try {
    const request = parseRequest(event);
    const size = Number.isFinite(Number(request.size)) ? Number(request.size) : DEFAULT_SIZE;
    const wallCount = Number.isFinite(Number(request.wallCount)) ? Number(request.wallCount) : DEFAULT_WALLS;

    const game = createGame({ size, wallCount });

    return response(200, {
      ok: true,
      game,
      availableMoves: availableMoves(game),
      message: 'New game created.',
    });
  } catch (error) {
    return response(400, {
      ok: false,
      error: error.message || 'Could not create a new game.',
    });
  }
}
