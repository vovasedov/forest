# Grid Quest Starter

A small GitHub + Netlify starter for a grid-based quest game.

## What it does

- creates a new `size x size` board
- places `wallCount` random wall squares
- picks a valid player start square
- returns only the legal moves: `forward`, `backward`, `left`, `right`
- blocks moves into walls and outside the board

## Storage / database

You do **not** need a database for this starter.

The client keeps the current game state in memory and sends it to the Netlify function on each move.

You would only need a database later if you want things like:

- saved games across devices
- user accounts
- leaderboards
- analytics or run history

## Project structure

- `lib/game.mjs` - shared game logic
- `netlify/functions/new-game.mjs` - create a new board
- `netlify/functions/move.mjs` - validate and apply a move
- `public/` - static frontend

## Local development

```bash
npm install
npm run dev
```

Then open the local URL shown by Netlify CLI.

## Deploy

1. Push this folder to GitHub.
2. Create a new site in Netlify from that repo.
3. Netlify should detect:
   - publish directory: `public`
   - functions directory: `netlify/functions`

## Notes

- `forward` means `y - 1`
- `backward` means `y + 1`
- `left` means `x - 1`
- `right` means `x + 1`

If you want, next step can be:

- fog of war
- treasure / enemy tiles
- exit tile
- combat
- save/load with Supabase or Fauna
