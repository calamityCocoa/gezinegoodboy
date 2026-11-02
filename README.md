# gezinegoodboy
Is gezine being a good boy? A satire site: https://gezinegoodboy.vercel.app

- `index.html` + `styles.css`: the page (HackerOne tracker, animations, the bootstrap.bas ASMR audio player)
- `device.js`: works out the device (Switch 2/1, Wii U, 3DS, PlayStation, Xbox, Steam Deck, TVs, Kindle, phones...)
  and gives each its own greeting and tweaks. Preview any of them with `?device=switch2`, `?device=3ds`, etc.
- `app.js`: the main page code (modern browsers, including the Switch 1's)
- `legacy.js`: a lighter "classic" page for old browsers (3DS, Wii U, Vita, Kindle). Preview it with `?classic=1`
- `game.js`: DMCA Dodge, gezine's game (when she loses, John Nintendo turns up). The lines that bury her when you lose are pepsipu's real
  [bootstrap.bas](https://gitlab.com/pepsipu/ns2jb/-/blob/main/bootstrap.bas), fetched live from GitLab (not copied here).
- `api/gezine.js`: HackerOne lookup
- `api/counts.js`: global headpat / respects counters
- `api/scores.js`: DMCA Dodge global leaderboard

## Database (counters and leaderboard)

`api/counts.js` and `api/scores.js` use the Upstash Redis database `webhook-kv` (shared with other projects, so every key starts with `gez:`).
Vercel dashboard → this project → Storage → Create Database → Upstash for Redis (free plan) → Connect.
That sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`; redeploy afterwards. Until then the counters are
hidden and the leaderboard says it's offline (the game itself still works).

## Media

The ASMR videos are on the [`asmr` release](https://github.com/calamityCocoa/gezinegoodboy/releases/tag/asmr), and a 720p
copy is served from [gezinegoodboy-media](https://github.com/calamityCocoa/gezinegoodboy-media) (GitHub Pages) for the
Discord embed and the background player.
