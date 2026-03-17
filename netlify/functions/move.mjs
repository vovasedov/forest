import { movePlayer } from '../../lib/game.mjs';

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

function response(statusCode, data) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(data),
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { game, direction } = payload;

    if (!game || !direction) {
      return response(400, {
        ok: false,
        error: 'Body must contain game and direction.',
      });
    }

    const result = movePlayer(game, direction);
    return response(result.ok ? 200 : 400, result);
  } catch (error) {
    return response(400, {
      ok: false,
      error: error.message || 'Invalid request.',
    });
  }
}
