import { applyMove, json, parseBody, sanitizeGame } from '../../lib/game.mjs';

export async function handler(event) {
  if (event.httpMethod && event.httpMethod !== 'POST') {
    return json(405, {
      error: 'Use POST for moves.'
    });
  }

  try {
    const body = parseBody(event.body);
    const direction = typeof body.direction === 'string' ? body.direction.trim() : '';
    const game = sanitizeGame(body.game);
    const result = applyMove(game, direction);

    if (!result.moved) {
      return json(400, {
        error: result.message,
        game: result.game
      });
    }

    return json(200, {
      message: result.message,
      game: result.game
    });
  } catch (error) {
    return json(400, {
      error: error.message || 'Could not perform the move.'
    });
  }
}
