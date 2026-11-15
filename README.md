# Clinomania

> At a minimum, I'm disappointing myself. The question is how many others I'm disappointing by sleeping in.

**Live:** https://clinomania.alexjrigas.workers.dev · **Track:** stupidest metric · Built at Stupid Ideas Hackathon Ottawa, Nov 15 2026

*Clinomania* (n.): an excessive desire to stay in bed. I have it. So I built a metric for it.

I set an alarm in Clinomania. The moment it goes off, the **Disappointment Index** starts at 1: me, disappointed in myself. Anyone on the internet can open the app and press **Be disappointed in him**, and the index goes up by one person. The public dashboard tracks it live: how many people I'm disappointing, how long I've overslept, total *disappointment-minutes* (person × minutes), and a chart of my disappointment over time.

Meanwhile my phone is going off. A loud alarm gets faster with every new person, a notification drops in for each one, and a voice yells the latest number at me ("ON YOUR FEET! 6 PEOPLE ARE WATCHING YOU FAIL!"). Snooze is denied by popular vote. When I finally press **I'm awake**, every open copy of the app shows: **"Congratulations, you have woken Alex."**

## Pages

- `/`: the Disappointment Index (everyone)
- `/bedroom`: Alex's phone (passcode-locked: alarm, voice, notifications, snooze that refuses)
- `/stage`: both phones side by side, for the projector (Alex's phone asks for the passcode)

On a laptop each page renders inside a simulated phone; on a real phone it's full screen.

## How it works

- **One shared state:** a Cloudflare Durable Object holds the alarm time and when each person joined. Each browser has an anonymous id, so the index counts *people*, not clicks.
- **The metric:** index = 1 (me) + people. Disappointment-minutes = my minutes since the alarm + each person's minutes since they joined. The step chart is drawn in SVG from the join times, with hover readouts.
- **The alarm:** a Web Audio digital beep pattern through a compressor, plus a referee whistle before each line. Lines are spoken with the device's deepest, most natural voice (speech synthesis, fast and low) and shown as captions. Wake Lock keeps the screen on.
- Stack: React + Vite, Hono on Cloudflare Workers, Durable Objects. No AI; just people.

## Who did what

| Person | What |
| --- | --- |
| Alexander Rigas (@DISCORD) | Idea (lived experience), product and design direction, built it with Claude Code |

## Running it

```bash
npm install
echo OWNER_KEY=something-secret > .dev.vars
npm run dev   # / for everyone, /bedroom?key=something-secret for the alarm, /stage?key=… for both
```

## Disclosure

The first commit is a starter kit prepared before the event: dev server, deploy config, and generic helpers, with no project code. Everything after it was built at the hackathon.
