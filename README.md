# gezinegoodboy
Is gezine being a good boy? A satire site: https://gezinegoodboy.vercel.app

- `index.html`: the page (HackerOne tracker, animations, the bootstrap.bas ASMR playing in the background)
- `game.js`: Headset Hero, gezine's headset game. The lines that bury her when you lose are pepsipu's real
  [bootstrap.bas](https://gitlab.com/pepsipu/ns2jb/-/blob/main/bootstrap.bas), fetched live from GitLab (not copied here).
- `api/gezine.js`: HackerOne lookup
- `api/counts.js`: global headpat / respects counters
- `api/scores.js`: Headset Hero global leaderboard

## Database (counters and leaderboard)

`api/counts.js` and `api/scores.js` need an Upstash Redis database connected to the Vercel project.
Vercel dashboard → this project → Storage → Create Database → Upstash for Redis (free plan) → Connect.
That sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`; redeploy afterwards. Until then the counters are
hidden and the leaderboard says it's offline (the game itself still works).

## Media

The ASMR videos are on the [`asmr` release](https://github.com/calamityCocoa/gezinegoodboy/releases/tag/asmr), and a 720p
copy is served from [gezinegoodboy-media](https://github.com/calamityCocoa/gezinegoodboy-media) (GitHub Pages) for the
Discord embed and the background player.
