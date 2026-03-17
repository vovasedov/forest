import { generateGame, json, parseBody } from '../../lib/game.mjs';

export async function handler(event) {
  try {
    const query = event.queryStringParameters || {};
    const body = parseBody(event.body);

    const size = body.size ?? query.size;
    const wallCount = body.wallCount ?? body.walls ?? query.wallCount ?? query.walls;

    const game = generateGame({ size, wallCount });

    return json(200, {
      message: 'New game created.',
      game
    });
  } catch (error) {
    return json(400, {
      error: error.message || 'Could not start a new game.'
    });
  }
}
