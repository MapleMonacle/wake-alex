// Speech-to-text via the browser (Chrome/Edge). No key, no cost.
// const { listening, interim, last, start, stop } = useSpeech((finalText) => ...);
import { useCallback, useEffect, useRef, useState } from "react";

type Result = { isFinal: boolean; 0: { transcript: string } };
type SR = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<Result> }) => void) | null;
  onend: (() => void) | null;
};

export function useSpeech(onFinal?: (text: string) => void) {
  const recRef = useRef<SR | null>(null);
  const wantRef = useRef(false);
  const cbRef = useRef(onFinal);
  cbRef.current = onFinal;
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [last, setLast] = useState("");
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;

  useEffect(
    () => () => {
      wantRef.current = false;
      recRef.current?.stop();
    },
    [],
  );

  const start = useCallback(() => {
    if (!Ctor) return alert("Speech recognition needs Chrome or Edge");
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-CA";
    rec.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const text = r[0].transcript.trim();
          setLast(text);
          cbRef.current?.(text);
        } else live += r[0].transcript;
      }
      setInterim(live);
    };
    // Chrome ends sessions on its own after silence; restart while we still want it.
    rec.onend = () => (wantRef.current ? rec.start() : setListening(false));
    wantRef.current = true;
    rec.start();
    recRef.current = rec;
    setListening(true);
  }, [Ctor]);

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
  }, []);

  return { supported: !!Ctor, listening, interim, last, start, stop };
}
