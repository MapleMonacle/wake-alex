# Kit reference

`npm run dev` serves one server at http://localhost:5173 that runs both the React app and the worker API. `--host` is on, so phones on the same wifi can open it via your LAN IP.

- `/` is your project (`src/App.tsx`)
- `/kit` is the playground with every module working (`src/KitDemo.tsx`)

## Front end (`src/kit`, import from `"./kit"`)

| Module | What | Use for |
| --- | --- | --- |
| `BigButton` | Big satisfying red button | stupidest button track |
| `useCounter(name)` | Shared counter across every device, polled | live audience demos, leaderboards, stupid metrics |
| `useRoom(name, initial)` | Shared JSON state for every device: `merge`, `push(list, item)`, `inc(key)`, `count(key)`, `set`. Typed from `initial`, applied optimistically, polled every 1s, 64KB max | the current round or stage, applications to vote on, a live feed, per-item votes |
| `deviceId()`, `pickFor(id, list)`, `shortId()` | Stable per-device id. `pickFor` deterministically gives each phone a role. Add `?as=bob` to the URL to fake another device | giving the audience roles, teams or departments |
| `track(event, props)` | Amplitude event (logs to the console if there's no key) | stupidest metric track: actually use Amplitude |
| `sfx.*`, `celebrate()`, `emojiRain(e)`, `await say(text, { voice })`, `listVoices()` | Synth sounds with no asset files, confetti, text-to-speech (resolves when it finishes speaking) | instant comedy and polish |
| `ask(prompt, { images, effort })`, `askJson(prompt, { schema })` | Claude via `/api/llm`, with the key kept server-side. Can look at images, and with a `schema` the JSON is guaranteed to match it | stupidest AI track |
| `snapshot(video)`, `listCameras()` | Webcam frame as a JPEG data URL (for `images`), and a camera list so you can pick the external webcam on stage | vision features, stage setups |
| `HandOverlay` | Canvas over the mirrored video that draws the hand skeleton with a glow, plus a `draw` callback for custom effects | anything with hands on camera |
| `useSpeech(onFinal)` | Browser speech-to-text (Chrome/Edge) | voice-controlled nonsense |
| `useMicLevel(on)` | Mic loudness from 0 to 1 | scream-to-unlock, clap detection |
| `useHands(on, { deviceId })` + `isPinching`, `fingersUp`, `isFist` | Webcam hand tracking (MediaPipe, on-device) | gesture control. The Theremin won in Toronto |
| `QR` | QR code for any URL | put it on screen during the demo |

## Back end (`worker/index.ts`, Hono)

| Route | What |
| --- | --- |
| `GET /api/health` | sanity check |
| `GET /api/stupid/:thing` | example stupid API that "measures" anything in random units |
| `GET/POST /api/counter/:name` | Durable Object counter. POST `{ by }` |
| `GET/POST /api/room/:name` | Durable Object JSON room. GET returns `{ state, version }`. POST takes an op: `{op:"merge",value}`, `{op:"push",key,item,max?}`, `{op:"inc",key,by?}` or `{op:"set",value}` |
| `POST /api/llm` | `{ prompt, system?, maxTokens?, images?, schema?, effort? }` → `{ text, json? }`. Claude Opus 5.5 at low effort by default, with server-side refusal fallback. A `schema` gives structured JSON output |

## Secrets and keys

- **Claude:** `.dev.vars` → `ANTHROPIC_API_KEY=...`. For deploy, run `npx wrangler secret put ANTHROPIC_API_KEY`.
- **Amplitude:** `.env.local` → `VITE_AMPLITUDE_KEY=...` (from a free Amplitude project).

## Deploy

```bash
npx wrangler login     # once
npm run deploy         # → https://<name>.<subdomain>.workers.dev
```
