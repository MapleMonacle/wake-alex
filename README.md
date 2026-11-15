# Wake Alex Up

> Alex is a clinomaniac. He needs your help. Or at least your disappointment.

**Track:** stupidest button · Built at Stupid Ideas Hackathon Ottawa, Nov 15 2026

Wake Alex Up is an alarm clock you can't snooze, because it isn't yours. **Anyone on the internet can press one button to wake Alex up.** Every press adds a person to the count, and Alex's phone plays a siren and announces, louder and louder:

> "WAKE UP! 23 PEOPLE ARE DISAPPOINTED IN YOU FOR SLEEPING IN. YOU ARE DISAPPOINTING THEM ALL."

When Alex finally presses **I'm awake**, everyone who helped is told they did it: "Alex is awake. You did it. You and 22 people woke him up." People who didn't help are told that too.

## How it works

- **One button, one shared state.** A Cloudflare Durable Object holds whether Alex is asleep and who's disappointed in him. Each browser gets an anonymous id, so the count is *people*, not clicks.
- **The bedroom** (`/bedroom`, protected by a private key) is Alex's phone. The siren (Web Audio) gets louder and more frantic with the crowd, and the browser's speech synthesis reads the latest count over and over until he's up. It keeps the screen awake with the Wake Lock API.
- **The public page** polls every second. When Alex wakes, every open tab flips to the morning screen, fires confetti, and sends a browser notification if you allowed one.
- Stack: React + Vite, Hono on Cloudflare Workers, Durable Objects. No AI; just people.

## Who did what

| Person | What |
| --- | --- |
| Alexander Rigas (@DISCORD) | Idea (lived experience), design direction, built it with Claude Code |

## Running it

```bash
npm install
echo OWNER_KEY=something-secret > .dev.vars
npm run dev   # public page at /, bedroom at /bedroom?key=something-secret
```

## Disclosure

The first commit is a starter kit prepared before the event: dev server, deploy config, and generic helpers, with no project code. Everything after it was built at the hackathon.
