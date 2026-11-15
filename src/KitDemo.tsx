// Toolbox playground. Open /kit to check every piece works on the venue laptop/wifi
// before you need it. Safe to delete once your project is underway.
import { useEffect, useState } from "react";
import {
  ask,
  HandOverlay,
  listCameras,
  snapshot,
  type DrawFn,
  BigButton,
  celebrate,
  deviceId,
  emojiRain,
  pickFor,
  shortId,
  useRoom,
  fingersUp,
  isPinching,
  QR,
  say,
  sfx,
  track,
  useCounter,
  useHands,
  useMicLevel,
  useSpeech,
} from "./kit";

export default function KitDemo() {
  return (
    <main className="grid">
      <header className="span">
        <h1>stupid hack kit</h1>
        <p className="muted">
          Every card below is a module in <code>src/kit</code>. Your project page is <a href="/">/</a>.
        </p>
      </header>
      <ButtonCard />
      <RoomCard />
      <SoundCard />
      <ApiCard />
      <LlmCard />
      <SpeechCard />
      <MicCard />
      <HandsCard />
      <QrCard />
    </main>
  );
}

function Card({ title, file, children }: { title: string; file: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <code className="muted small">{file}</code>
      <div className="body">{children}</div>
    </section>
  );
}

function ButtonCard() {
  const { value, add } = useCounter("kit-demo");
  return (
    <Card title="Button + shared counter" file="BigButton.tsx · useCounter.ts">
      <BigButton
        size={140}
        onPress={() => {
          add();
          track("kit button");
        }}
      >
        PRESS
      </BigButton>
      <p>
        Room-wide count: <b>{value ?? "…"}</b>
      </p>
    </Card>
  );
}

const DEPTS = ["Treasury Board of Buttons", "Ministry of Pressing Matters", "Phoenix Pay Centre", "Office of Official Buttons"];
type Msg = { id: string; from: string; text: string };

function RoomCard() {
  const me = deviceId();
  const dept = pickFor(me, DEPTS);
  const room = useRoom("kit-demo", { motion: "Ban geese from the Rideau", feed: [] as Msg[] });
  const [text, setText] = useState("");
  const yes = room.count(`yes:${room.state.motion}`);
  const no = room.count(`no:${room.state.motion}`);
  return (
    <Card title="Shared room state" file="useRoom.ts · me.ts">
      <p className="muted small">
        You are device <code>{me}</code>, assigned to <b>{dept}</b>. Open this page in a second tab with{" "}
        <code>?as=someone</code> to watch it sync.
      </p>
      <p>
        Motion: <b>{room.state.motion}</b>
      </p>
      <div className="row">
        <button onClick={() => room.inc(`yes:${room.state.motion}`)}>APPROVED ({yes})</button>
        <button onClick={() => room.inc(`no:${room.state.motion}`)}>REJECTED ({no})</button>
        <button onClick={() => room.merge({ motion: pickFor(shortId(), ["Make the LRT optional", "Shawarma as currency", "Mandatory honking", "Ban geese from the Rideau"]) })}>
          new motion
        </button>
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          room.push("feed", { id: shortId(), from: dept, text: text.trim() }, 20);
          setText("");
        }}
      >
        <input placeholder="say something to the room" value={text} onChange={(e) => setText(e.target.value)} />
        <button>send</button>
      </form>
      {room.state.feed
        .slice(-5)
        .reverse()
        .map((m) => (
          <p key={m.id} className="small">
            <b>{m.from}:</b> {m.text}
          </p>
        ))}
      <button className="small" onClick={() => room.set({ motion: "Ban geese from the Rideau", feed: [] })}>
        reset room
      </button>
      {room.error && <p className="muted">⚠ {room.error}</p>}
    </Card>
  );
}

function SoundCard() {
  return (
    <Card title="Sounds + confetti" file="sfx.ts">
      <div className="row">
        {(Object.keys(sfx) as (keyof typeof sfx)[]).map((k) => (
          <button key={k} onClick={sfx[k]}>
            {k}
          </button>
        ))}
      </div>
      <div className="row">
        <button onClick={celebrate}>confetti</button>
        <button onClick={() => emojiRain("🪿")}>goose rain</button>
        <button onClick={() => say("Your idea is bad and you should feel bad", { pitch: 0.4 })}>say</button>
      </div>
    </Card>
  );
}

function ApiCard() {
  const [thing, setThing] = useState("my landlord");
  const [out, setOut] = useState("");
  return (
    <Card title="Stupid API" file="worker/index.ts → GET /api/stupid/:thing">
      <div className="row">
        <input value={thing} onChange={(e) => setThing(e.target.value)} />
        <button
          onClick={async () =>
            setOut(JSON.stringify(await (await fetch(`/api/stupid/${encodeURIComponent(thing)}`)).json(), null, 2))
          }
        >
          measure
        </button>
      </div>
      {out && <pre>{out}</pre>}
    </Card>
  );
}

function LlmCard() {
  const [prompt, setPrompt] = useState("Rate my idea: Uber, but for geese.");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card title="LLM" file="llm.ts → POST /api/llm">
      <textarea rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setOut(await ask(prompt).catch((e: Error) => `⚠ ${e.message}`));
          setBusy(false);
        }}
      >
        {busy ? "thinking…" : "ask"}
      </button>
      {out && <p className="out">{out}</p>}
    </Card>
  );
}

function SpeechCard() {
  const [log, setLog] = useState<string[]>([]);
  const s = useSpeech((t) => setLog((l) => [t, ...l].slice(0, 5)));
  return (
    <Card title="Speech to text" file="useSpeech.ts">
      <button onClick={s.listening ? s.stop : s.start}>{s.listening ? "stop" : "listen"}</button>
      {!s.supported && <p className="muted">Needs Chrome or Edge.</p>}
      <p className="muted">{s.interim}</p>
      {log.map((t, i) => (
        <p key={i}>“{t}”</p>
      ))}
    </Card>
  );
}

function MicCard() {
  const [on, setOn] = useState(false);
  const level = useMicLevel(on);
  return (
    <Card title="Mic loudness" file="useMicLevel.ts">
      <button onClick={() => setOn(!on)}>{on ? "stop" : "start"}</button>
      <div className="meter">
        <div style={{ width: `${level * 100}%`, background: level > 0.6 ? "#e10600" : "#3a7" }} />
      </div>
      {level > 0.6 && <p>TOO LOUD. Good.</p>}
    </Card>
  );
}

// Custom overlay effect example: a glowing ring on each index fingertip.
const fingertipRing: DrawFn = (ctx, hands) => {
  ctx.strokeStyle = "#e10600";
  ctx.lineWidth = 4;
  for (const p of hands) {
    ctx.beginPath();
    ctx.arc(p[8].x, p[8].y, 14, 0, Math.PI * 2);
    ctx.stroke();
  }
};

function HandsCard() {
  const [on, setOn] = useState(false);
  const [cams, setCams] = useState<{ id: string; label: string }[]>([]);
  const [cam, setCam] = useState<string | undefined>();
  const [seen, setSeen] = useState("");
  const { videoRef, hands, ready, error } = useHands(on, { deviceId: cam });
  useEffect(() => {
    if (ready) listCameras().then(setCams);
  }, [ready]);
  return (
    <Card title="Hand tracking + vision" file="useHands.ts · HandOverlay.tsx · media.ts">
      <div className="row">
        <button onClick={() => setOn(!on)}>{on ? "stop camera" : "start camera"}</button>
        {cams.length > 1 && (
          <select value={cam ?? ""} onChange={(e) => setCam(e.target.value || undefined)}>
            <option value="">default camera</option>
            {cams.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {on && (
        <div className="cam">
          <video ref={videoRef} muted playsInline />
          <HandOverlay hands={hands} draw={fingertipRing} />
        </div>
      )}
      {ready && (
        <button
          onClick={async () => {
            setSeen("looking…");
            const img = snapshot(videoRef.current!);
            setSeen(await ask("In one funny sentence, what do you see?", { images: [img] }).catch((e: Error) => `⚠ ${e.message}`));
          }}
        >
          ask AI about this frame
        </button>
      )}
      {seen && <p className="out">{seen}</p>}
      {error && <p className="muted">⚠ {error}</p>}
      {on && !ready && !error && <p className="muted">loading model, waiting for camera permission…</p>}
      {hands.map((h, i) => (
        <p key={i}>
          {h.side}: {fingersUp(h)} fingers up{isPinching(h) ? " · PINCH" : ""}
        </p>
      ))}
    </Card>
  );
}

function QrCard() {
  return (
    <Card title="Demo QR" file="QR.tsx">
      <QR url={location.origin} size={160} />
      <p className="muted small">{location.origin}</p>
    </Card>
  );
}
