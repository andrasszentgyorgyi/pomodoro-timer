import { create } from 'zustand'

// All intervals accept any whole number of minutes from 1 to 60.
export const MIN_MINUTES = 1
export const MAX_MINUTES = 60
const clampMinutes = (n) => Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, n))

// A long break replaces the short one after every Nth focus session.
const LONG_EVERY = 4

// Length of a given mode, in seconds, for the current settings.
export function modeTotal(mode, settings) {
  const minutes = mode === 'focus' ? settings.focus : mode === 'short' ? settings.short : settings.long
  return minutes * 60
}

// Short square-wave blip emitted each second when TICK SOUND is on.
let actx = null
function ensureAudio() {
  if (!actx) {
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)()
    } catch {
      /* Web Audio unavailable */
    }
  }
  if (actx && actx.state === 'suspended') actx.resume()
}
function playTick() {
  if (!actx) return
  try {
    const t = actx.currentTime
    const o = actx.createOscillator()
    const g = actx.createGain()
    o.type = 'square'
    o.frequency.value = 1750
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.035, t + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03)
    o.connect(g)
    g.connect(actx.destination)
    o.start(t)
    o.stop(t + 0.04)
  } catch {
    /* ignore playback errors */
  }
}

// Short noise burst reused for the mechanical clack transient.
let noiseBuf = null
function getNoise() {
  if (!noiseBuf && actx) {
    const len = Math.floor(actx.sampleRate * 0.05)
    noiseBuf = actx.createBuffer(1, len, actx.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

// Cassette transport "ka-chunk": a low mechanical thunk plus a bright clack.
function playClick() {
  if (!actx) return
  try {
    const t = actx.currentTime
    const o = actx.createOscillator()
    const og = actx.createGain()
    o.type = 'square'
    o.frequency.setValueAtTime(180, t)
    o.frequency.exponentialRampToValueAtTime(70, t + 0.06)
    og.gain.setValueAtTime(0.0001, t)
    og.gain.exponentialRampToValueAtTime(0.16, t + 0.004)
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
    o.connect(og)
    og.connect(actx.destination)
    o.start(t)
    o.stop(t + 0.1)

    const buf = getNoise()
    if (buf) {
      const src = actx.createBufferSource()
      src.buffer = buf
      const bp = actx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 2600
      bp.Q.value = 1.2
      const ng = actx.createGain()
      ng.gain.setValueAtTime(0.5, t)
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.045)
      src.connect(bp)
      bp.connect(ng)
      ng.connect(actx.destination)
      src.start(t)
      src.stop(t + 0.05)
    }
  } catch {
    /* ignore playback errors */
  }
}

// End-of-block alert: a warm three-note ascending chime (~1.1s) over a
// settling thunk, so it's clearly noticeable but stays analog/tape-room.
function playEndChime() {
  if (!actx) return
  try {
    const t0 = actx.currentTime
    const notes = [
      { f: 587.33, at: 0.0, dur: 0.5 }, // D5
      { f: 739.99, at: 0.16, dur: 0.5 }, // F#5
      { f: 880.0, at: 0.32, dur: 0.95 }, // A5, sustained
    ]
    for (const n of notes) {
      const start = t0 + n.at
      const o = actx.createOscillator()
      const g = actx.createGain()
      o.type = 'triangle'
      o.frequency.value = n.f
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(0.22, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, start + n.dur)
      o.connect(g)
      g.connect(actx.destination)
      o.start(start)
      o.stop(start + n.dur + 0.05)
    }
  } catch {
    /* ignore playback errors */
  }
}

const useTimerStore = create((set, get) => ({
  flipped: false,
  settings: { focus: 25, short: 5, long: 15, autostart: false, tick: false, pulse: true },
  timer: { mode: 'focus', remaining: 25 * 60, running: false, session: 1 },

  // Advance one second. Rolls over to the next mode at zero: a focus session
  // is followed by a long break every LONG_EVERY sessions, else a short one;
  // the session counter climbs without bound and never resets.
  tick: () => {
    const { timer, settings } = get()
    if (!timer.running) return

    let rem = timer.remaining - 1
    let { mode, session } = timer
    let running = true
    let doTick = false
    let doEnd = false

    if (rem <= 0) {
      if (mode === 'focus') {
        mode = session % LONG_EVERY === 0 ? 'long' : 'short'
      } else {
        session += 1
        mode = 'focus'
      }
      rem = modeTotal(mode, settings)
      running = settings.autostart
      doEnd = true
    } else if (settings.tick) {
      doTick = true
    }

    set({ timer: { ...timer, remaining: rem, mode, session, running } })
    if (doEnd) playEndChime()
    else if (doTick) playTick()
  },

  toggle: () => {
    ensureAudio()
    playClick()
    set((st) => ({ timer: { ...st.timer, running: !st.timer.running } }))
  },

  stop: () => {
    ensureAudio()
    playClick()
    set((st) => ({
      timer: { ...st.timer, running: false, remaining: modeTotal(st.timer.mode, st.settings) },
    }))
  },

  flip: () => set((st) => ({ flipped: !st.flipped })),

  // Set an interval directly (typed entry), clamped to the legal range and
  // re-arming a paused timer to the new length.
  setInterval: (key, minutes) =>
    set((st) => {
      const v = clampMinutes(minutes)
      const settings = { ...st.settings, [key]: v }
      const timer = st.timer.running
        ? st.timer
        : { ...st.timer, remaining: modeTotal(st.timer.mode, settings) }
      return { settings, timer }
    }),

  // Nudge an interval by one minute via the ± buttons.
  step: (key, dir) => get().setInterval(key, get().settings[key] + dir),

  toggleSwitch: (key) =>
    set((st) => ({ settings: { ...st.settings, [key]: !st.settings[key] } })),
}))

export default useTimerStore
