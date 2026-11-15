// YOUR PROJECT GOES HERE. Delete everything below and build the stupid thing.
// The toolbox is at /kit. Import what you need from "./kit".
import { BigButton, celebrate, sfx, track, useCounter } from "./kit";

export default function App() {
  const { value, add } = useCounter("presses");

  return (
    <main className="center">
      <h1>something stupid</h1>
      <p className="muted">Replace this page. Toolbox demos live at <a href="/kit">/kit</a>.</p>
      <BigButton
        onPress={() => {
          sfx.boing();
          celebrate();
          track("pressed the button");
          add();
        }}
      />
      <p className="huge">{value ?? "…"}</p>
      <p className="muted">people have pressed the button for no reason</p>
    </main>
  );
}
