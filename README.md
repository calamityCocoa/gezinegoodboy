# gezinegoodboy
Is gezine being a good boy? A satire site: https://gezinegoodboy.vercel.app

- `index.html` + `styles.css`: the page (HackerOne tracker, animations, the bootstrap.bas ASMR audio player)
- `device.js`: works out the device (Switch 2/1, Wii U, 3DS, PlayStation, Xbox, Steam Deck, TVs, Kindle, phones...)
  and gives each its own greeting and tweaks. Preview any of them with `?device=switch2`, `?device=3ds`, etc.
- `app.js`: the main page code (modern browsers, including the Switch 1's)
- `legacy.js`: a lighter "classic" page for old browsers (3DS, Wii U, Vita, Kindle). Preview it with `?classic=1`
- `game.js`: DMCA Dodge (when she loses, John Nintendo turns up).
- Direct links to each game: `/play/dodge`, `/play/clicker`, `/play/typer`, `/play/whack`, `/play/match`, `/play/combo`
  (vercel.json redirects them to `/?play=<game>`).
- `arcade.js`: gezine's Arcade: the game menu, a shared game window, and Headpat Clicker, Bootstrap Typer,
  Whack-a-John, Pose Match and Combo Says. The lines that bury her when you lose are pepsipu's real
  [bootstrap.bas](https://gitlab.com/pepsipu/ns2jb/-/blob/main/bootstrap.bas), fetched live from GitLab (not copied here).
- `api/gezine.js`: HackerOne lookup
- `peek.js`: peekaboo. gezine, John Nintendo and pepsipu peek out from behind cards now and then
  (sprites in `images/peek/`, drawn with ChatGPT image generation). `GezPeek.now()` triggers one.
- `api/_lib.js`: shared database access and rate limiting (hashed IPs, standard RateLimit headers)
- `api/counts.js`: global headpat / respects counters
- `api/scores.js`: global leaderboards for every arcade game

## Database (counters and leaderboard)

`api/counts.js` and `api/scores.js` use the Upstash Redis database `webhook-kv` (shared with other projects, so every key starts with `gez:`).
Vercel dashboard → this project → Storage → Create Database → Upstash for Redis (free plan) → Connect.
That sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`; redeploy afterwards. Until then the counters are
hidden and the leaderboard says it's offline (the game itself still works).

## Media

The ASMR videos are on the [`asmr` release](https://github.com/calamityCocoa/gezinegoodboy/releases/tag/asmr), and a 720p
copy is served from [gezinegoodboy-media](https://github.com/calamityCocoa/gezinegoodboy-media) (GitHub Pages) for the
Discord embed and the background player.

## Legal and security

- `privacy.html` and `terms.html` (served at `/privacy` and `/terms`). Keep them in sync with what the code actually stores.
- `vercel.json` sets a Content Security Policy and other security headers. If you add something loaded from another site, add it there too.
- Fonts are self-hosted in `fonts/` (SIL Open Font License), so nothing is loaded from Google.
- The MIT licence covers the code only, not the artwork, audio or other people's material.
