# Field Recorder · Pomodoro

A Pomodoro focus timer disguised as a vintage field-recorder tape deck. Hit
play and the reels start turning; the supply reel unwinds and the take-up reel
fills as your session runs down. Flip the unit over to dial in your intervals
and toggle behavior switches on the back panel.

## Features

- **Tape-deck interface** — a skeuomorphic "FR-25" recorder with spinning reels,
  a dot-matrix `MM:SS` readout (hand-rolled 5×7 bitmap font), a pulsing mode LED,
  and physical play/pause and stop transport buttons.
- **Animated reels** — the two tape packs are sized area-proportionally to time,
  so the supply reel visibly empties into the take-up reel as the timer counts
  down.
- **Pomodoro cycle** — focus sessions alternate with short breaks, and a long
  break replaces the short one after every fourth focus session. A session
  counter tracks your progress.
- **Flip-over setup panel** — the back plate holds steppers for focus / short /
  long interval lengths (1–60 min, typed or nudged with ±) and DIP-style switches
  for behavior.
- **Synthesized analog audio** — all sounds are generated live with the Web Audio
  API: a mechanical tape-transport "ka-chunk" on the transport buttons, an
  optional per-second tick, and a warm three-note chime at the end of each block.
- **Behavior switches** — auto-start the next block, per-second tick sound, and
  mode-LED pulse, each toggleable on the back panel.

## Tech stack

- [React 19](https://react.dev/)
- [Zustand](https://github.com/pmndrs/zustand) for timer state
- [Vite](https://vite.dev/) build tooling
- [Tailwind CSS v4](https://tailwindcss.com/)
- Web Audio API for all sound, IBM Plex Mono for type

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run preview  # preview the production build
npm run lint     # run ESLint
```

## How it works

- `src/store/useTimerStore.js` — the Zustand store: the per-second tick logic,
  mode/session rollover, interval clamping, and all Web Audio sound synthesis.
- `src/App.jsx` — the entire tape-deck UI, including the reel SVGs, transport,
  and the flip-to-reveal setup panel.
- `src/lib/dotMatrix.js` — the 5×7 bitmap font and layout for the dot-matrix
  time display.
