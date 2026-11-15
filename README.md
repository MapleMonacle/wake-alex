# wake-alex

> One sentence that makes a judge laugh. ("Uber, but every driver is a goose.")

**Live:** https://PROJECT.YOUR-SUBDOMAIN.workers.dev · **Demo video (≤1 min):** LINK · **Track:** stupidest ___

![hero screenshot](docs/hero.png)

## What it does

Two or three sentences. What's the problem nobody has, and how do we solve it?

## Why

The fake-serious justification. Commit to the bit.

## How it works

- Front end: React + Vite
- Back end: Hono on Cloudflare Workers, with a Durable Object for the shared counter
- The stupid part: what's technically doing the stupid thing (e.g. MediaPipe hand tracking, Claude, Web Audio)

## What I learned

The skill or concept I tried for the first time today, what was hard, and what surprised me. (The organizers judge "learning > flexing".)

## Track

**stupidest ___**: one line on why this fits. (Pick ONE of AI / API / metric / button, or none.)

## Who did what

| Person | What they built |
| --- | --- |
| Alexander Rigas (@discord-handle) | ... |
|  |  |

## Screenshots

| | |
| --- | --- |
| ![](docs/1.png) | ![](docs/2.png) |

## Running it

```bash
npm install
cp .dev.vars.example .dev.vars   # add ANTHROPIC_API_KEY if using the AI bits
npm run dev
```

## Disclosure

The first commit is a starter kit prepared before the event. It contains tooling only (dev server, deploy config, reusable hooks for sound, webcam, mic, a shared counter and shared room state) and no project code. Everything after it was built at Stupid Ideas Hackathon Ottawa on Nov 15, 2026.
