import { useEffect, useState } from 'react'
import useTimerStore, { modeTotal, MIN_MINUTES, MAX_MINUTES } from './store/useTimerStore'
import { buildDots } from './lib/dotMatrix'

const pad2 = (n) => String(n).padStart(2, '0')
const MODE_LABEL = { focus: 'FOCUS', short: 'SHORT BREAK', long: 'LONG BREAK' }

const ACCENT = '#cfd6da'
const LED_DIM = '#3a4046'

// Reel geometry: hub radius → fully-wound radius, area-proportional to time.
const R_HUB = 13
const R_MAX = 46

// One tape reel: a tape pack of radius `r` behind a spinning hub at `cx`.
function Reel({ cx, r, spin }) {
  const spinStyle = {
    transformBox: 'fill-box',
    transformOrigin: 'center',
    animation: 'reelspin 3.6s linear infinite',
    animationPlayState: spin,
  }
  return (
    <>
      <circle cx={cx} cy="64" r={r} fill="#2c2f34" />
      <circle cx={cx} cy="64" r={r} fill="none" stroke="#3b3f45" strokeWidth="0.6" />
      <g style={spinStyle}>
        <circle cx={cx} cy="64" r="13" fill="#c9c7c0" />
        <circle cx={cx} cy="64" r="13" fill="none" stroke="#8e8c85" strokeWidth="1" />
        <circle cx={cx} cy="57" r="2.4" fill="#0a0c0f" />
        <circle cx={cx - 6.06} cy="67.5" r="2.4" fill="#0a0c0f" />
        <circle cx={cx + 6.06} cy="67.5" r="2.4" fill="#0a0c0f" />
        <circle cx={cx} cy="64" r="2.2" fill="#16181b" />
      </g>
    </>
  )
}

// Editable minutes field: accepts typing while preserving in-progress text,
// commits any valid 1–60 value live, and clamps on blur/Enter.
function IntervalInput({ value, onCommit }) {
  const [text, setText] = useState(String(value))
  // Re-sync the field when the value changes from outside (the ± buttons).
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setText(String(value))
  }

  const handleChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2)
    setText(v)
    const n = parseInt(v, 10)
    if (n >= MIN_MINUTES && n <= MAX_MINUTES) onCommit(n)
  }
  const commit = () => {
    const n = parseInt(text, 10)
    const clamped = Number.isNaN(n) ? value : Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, n))
    onCommit(clamped)
    setText(String(clamped))
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={handleChange}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      style={{
        width: '26px',
        padding: 0,
        background: 'transparent',
        border: 'none',
        outline: 'none',
        textAlign: 'right',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '15px',
        fontWeight: 400,
        color: '#cfd6da',
      }}
    />
  )
}

const screwCap = (deg) => ({
  position: 'absolute',
  width: '13px',
  height: '13px',
  borderRadius: '50%',
  background: 'radial-gradient(circle at 38% 32%, #595d62, #1f2225 72%)',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.18)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  ...deg,
})

const divider = {
  height: '1px',
  background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.4), transparent)',
  margin: '0 8px',
}

const sectionLabel = {
  fontSize: '9px',
  fontWeight: 500,
  letterSpacing: '0.2em',
  color: '#82868b',
  textShadow: '0 1px 0 rgba(255,255,255,0.06)',
}

function App() {
  const { flipped, settings, timer, tick, toggle, stop, flip, step, setInterval: setIntervalLength, toggleSwitch } = useTimerStore()

  // One persistent 1-second heartbeat; the store ignores it while paused.
  useEffect(() => {
    const id = setInterval(() => tick(), 1000)
    return () => clearInterval(id)
  }, [tick])

  const total = modeTotal(timer.mode, settings)
  const f = (total - timer.remaining) / total
  const supplyR = Math.sqrt(R_HUB * R_HUB + (1 - f) * (R_MAX * R_MAX - R_HUB * R_HUB))
  const takeupR = Math.sqrt(R_HUB * R_HUB + f * (R_MAX * R_MAX - R_HUB * R_HUB))

  const mm = pad2(Math.floor(timer.remaining / 60))
  const ss = pad2(timer.remaining % 60)
  const { cells, w: dotW, h: dotH } = buildDots(mm + ss)

  const spin = timer.running ? 'running' : 'paused'
  const ledColor = timer.running ? ACCENT : LED_DIM
  const ledPulse = timer.running && settings.pulse ? 'running' : 'paused'

  const steppers = [
    { key: 'focus', label: 'FOCUS', unit: 'MIN' },
    { key: 'short', label: 'SHORT', unit: 'MIN' },
    { key: 'long', label: 'LONG', unit: 'MIN' },
  ]
  const switches = [
    { key: 'autostart', label: 'AUTO-START' },
    { key: 'tick', label: 'TICK SOUND' },
    { key: 'pulse', label: 'PULSE LED' },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        padding: '48px 20px',
        background: 'radial-gradient(120% 90% at 50% 0%, #d0cec7, #b4b2ab 70%, #a3a199)',
        fontFamily: "'IBM Plex Mono', monospace",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: 'min(440px, 92vw)', perspective: '1800px' }}>
        <div
          style={{
            position: 'relative',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.9s cubic-bezier(0.7,0.04,0.2,1)',
            transform: `rotateY(${flipped ? '180deg' : '0deg'})`,
          }}
        >
          {/* ═══════════════ FRONT FACE ═══════════════ */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              opacity: flipped ? 0 : 1,
              pointerEvents: flipped ? 'none' : 'auto',
              transition: 'opacity 0s linear 0.45s',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(#1a1d21,#0f1215)',
                border: '1px solid #2c3036',
                borderRadius: '18px',
                padding: '26px 22px 20px',
                boxShadow: '0 26px 60px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.05)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {/* handle lugs */}
              <div style={{ position: 'absolute', top: '-8px', left: '58px', width: '60px', height: '9px', background: 'linear-gradient(#2a2e33,#181b1e)', border: '1px solid #34383e', borderBottom: 'none', borderRadius: '5px 5px 0 0' }} />
              <div style={{ position: 'absolute', top: '-8px', right: '58px', width: '60px', height: '9px', background: 'linear-gradient(#2a2e33,#181b1e)', border: '1px solid #34383e', borderBottom: 'none', borderRadius: '5px 5px 0 0' }} />

              {/* top bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: ledColor, boxShadow: `0 0 8px ${ledColor}`, animation: 'ledpulse 1.6s ease-in-out infinite', animationPlayState: ledPulse }} />
                  <span style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.15em', color: '#7d838a' }}>{MODE_LABEL[timer.mode]}</span>
                </div>
                <span style={{ fontSize: '9px', fontWeight: 400, letterSpacing: '0.18em', color: '#4f555b' }}>FR-25 · MØD-01</span>
              </div>

              {/* reels window */}
              <div style={{ background: '#0a0c0f', border: '1px solid #25292e', borderRadius: '10px', padding: '10px 8px', boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.75)' }}>
                <svg viewBox="0 0 240 128" style={{ width: '100%', display: 'block' }}>
                  <line x1="60" y1="20" x2="180" y2="20" stroke="#1d2024" strokeWidth="1.5" />
                  <circle cx="120" cy="118" r="6" fill="#1a1d20" stroke="#33383e" strokeWidth="1" />
                  <circle cx="120" cy="118" r="2.2" fill="#0a0c0f" />
                  <Reel cx={60} r={supplyR.toFixed(2)} spin={spin} />
                  <Reel cx={180} r={takeupR.toFixed(2)} spin={spin} />
                </svg>
              </div>

              {/* dot-matrix display */}
              <div style={{ background: '#090b0d', border: '1px solid #20242a', borderRadius: '8px', padding: '18px', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center' }}>
                <div style={{ position: 'relative', width: `${dotW}px`, height: `${dotH}px` }}>
                  {cells.map((d) => (
                    <div key={d.k} style={{ position: 'absolute', width: '6.5px', height: '6.5px', borderRadius: '50%', left: `${d.l}px`, top: `${d.t}px`, background: d.bg }} />
                  ))}
                </div>
              </div>

              {/* transport */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <div onClick={stop} style={{ width: '46px', height: '46px', borderRadius: '10px', background: 'linear-gradient(#22262b,#14171a)', border: '1px solid #2f343a', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 3px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9aa1a7' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" /></svg>
                </div>
                <div onClick={toggle} style={{ width: '58px', height: '58px', borderRadius: '12px', background: 'linear-gradient(#2a2f35,#181b1f)', border: '1px solid #3a4047', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 6px rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#dfe4e8' }}>
                  {timer.running ? (
                    <svg width="26" height="26" viewBox="0 0 24 24"><rect x="7" y="6" width="4" height="12" rx="1" fill="currentColor" /><rect x="14" y="6" width="4" height="12" rx="1" fill="currentColor" /></svg>
                  ) : (
                    <svg width="26" height="26" viewBox="0 0 24 24"><path d="M8 5 L20 12 L8 19 Z" fill="currentColor" /></svg>
                  )}
                </div>
                <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: 'linear-gradient(#1c1f23,#121417)', border: '1px solid #282c31', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                  <div style={{ fontSize: '8px', letterSpacing: '0.1em', color: '#5a6066' }}>SESS</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#aeb5bb' }}>
                    {pad2(timer.session)}
                  </div>
                </div>
              </div>

              {/* footer: vent + grille + setup */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: 'radial-gradient(circle at 38% 34%, #44484d, #14171a 72%)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.12)' }} />
                <div style={{ flex: 1, height: '8px', margin: '0 12px', background: 'repeating-linear-gradient(90deg, #1e2226 0 3px, #0c0e11 3px 6px)', borderRadius: '2px', opacity: 0.7 }} />
                <div onClick={flip} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', background: 'linear-gradient(#22262b,#14171a)', border: '1px solid #2f343a', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)', cursor: 'pointer', color: '#8b9197' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v4h-4" /></svg>
                  <span style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.16em' }}>SETUP</span>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════ BACKPLATE ═══════════════ */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              opacity: flipped ? 1 : 0,
              pointerEvents: flipped ? 'auto' : 'none',
              transition: 'opacity 0s linear 0.45s',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(150deg,#3c4045,#2c2f33)',
                border: '1px solid #1c1e21',
                borderRadius: '18px',
                padding: '22px 20px',
                boxShadow: '0 26px 60px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.08)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                overflow: 'hidden',
              }}
            >
              {/* brushed metal overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(94deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px)', pointerEvents: 'none', borderRadius: '18px' }} />

              {/* corner screws */}
              <div style={screwCap({ top: '11px', left: '11px' })}><div style={{ width: '9px', height: '1.4px', background: '#16181a', transform: 'rotate(34deg)' }} /></div>
              <div style={screwCap({ top: '11px', right: '11px' })}><div style={{ width: '9px', height: '1.4px', background: '#16181a', transform: 'rotate(-58deg)' }} /></div>
              <div style={screwCap({ bottom: '11px', left: '11px' })}><div style={{ width: '9px', height: '1.4px', background: '#16181a', transform: 'rotate(-18deg)' }} /></div>
              <div style={screwCap({ bottom: '11px', right: '11px' })}><div style={{ width: '9px', height: '1.4px', background: '#16181a', transform: 'rotate(62deg)' }} /></div>

              {/* engraved header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 16px', position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.2em', color: '#aeb2b6', textShadow: '0 1px 0 rgba(255,255,255,0.08), 0 -1px 0 rgba(0,0,0,0.55)' }}>FIELD TIMER</span>
                  <span style={{ fontSize: '8.5px', fontWeight: 400, letterSpacing: '0.14em', color: '#7f8388', textShadow: '0 1px 0 rgba(255,255,255,0.05)' }}>MODEL FR-25 · SER. 0042-A</span>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '8.5px', fontWeight: 400, letterSpacing: '0.12em', color: '#7f8388', textShadow: '0 1px 0 rgba(255,255,255,0.05)' }}>5V ⎓ 0.2A</span>
                  <span style={{ fontSize: '8.5px', fontWeight: 400, letterSpacing: '0.12em', color: '#7f8388', textShadow: '0 1px 0 rgba(255,255,255,0.05)' }}>MØD·LAB</span>
                </div>
              </div>

              <div style={divider} />

              {/* INTERVALS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', padding: '0 4px', position: 'relative' }}>
                <span style={sectionLabel}>INTERVALS</span>
                {steppers.map((st) => (
                  <div key={st.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ flex: 1, fontSize: '10px', fontWeight: 500, letterSpacing: '0.12em', color: '#a6aaae', textShadow: '0 1px 0 rgba(0,0,0,0.4)' }}>{st.label}</span>
                    <div onClick={() => step(st.key, -1)} style={{ width: '30px', height: '30px', borderRadius: '6px', background: 'linear-gradient(#33373c,#22262a)', border: '1px solid #15171a', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#c2c6ca', fontSize: '16px', fontWeight: 400, userSelect: 'none' }}>−</div>
                    <div style={{ width: '54px', height: '30px', borderRadius: '5px', background: '#0c0e10', border: '1px solid #15171a', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <IntervalInput value={settings[st.key]} onCommit={(n) => setIntervalLength(st.key, n)} />
                      <span style={{ fontSize: '8px', color: '#5d6368' }}>{st.unit}</span>
                    </div>
                    <div onClick={() => step(st.key, 1)} style={{ width: '30px', height: '30px', borderRadius: '6px', background: 'linear-gradient(#33373c,#22262a)', border: '1px solid #15171a', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#c2c6ca', fontSize: '16px', fontWeight: 400, userSelect: 'none' }}>+</div>
                  </div>
                ))}
              </div>

              <div style={divider} />

              {/* BEHAVIOR DIP switches */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', padding: '0 4px', position: 'relative' }}>
                <span style={sectionLabel}>BEHAVIOR</span>
                {switches.map((sw) => {
                  const on = settings[sw.key]
                  return (
                    <div key={sw.key} onClick={() => toggleSwitch(sw.key)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                      <span style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', color: '#a6aaae', textShadow: '0 1px 0 rgba(0,0,0,0.4)' }}>{sw.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <span style={{ fontSize: '8.5px', fontWeight: 500, letterSpacing: '0.1em', width: '22px', textAlign: 'right', color: on ? '#cfd6da' : '#5d6368' }}>{on ? 'ON' : 'OFF'}</span>
                        <div style={{ width: '38px', height: '20px', borderRadius: '3px', background: '#0c0e10', border: '1px solid #15171a', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.7)', padding: '2px', display: 'flex' }}>
                          <div style={{ width: '15px', height: '14px', borderRadius: '2px', background: 'linear-gradient(#5a5e63,#3c4044)', border: '1px solid #2a2d30', boxShadow: '0 1px 1px rgba(0,0,0,0.5)', transition: 'transform 0.16s ease', transform: `translateX(${on ? '17px' : '0px'})` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ flex: 1 }} />

              {/* battery door + close */}
              <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px', padding: '0 4px', position: 'relative' }}>
                <div style={{ flex: 1, height: '42px', borderRadius: '6px', background: 'linear-gradient(#34383d,#26292d)', border: '1px solid #1a1c1f', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px' }}>
                  <span style={{ fontSize: '8.5px', letterSpacing: '0.14em', color: '#7f8388', textShadow: '0 1px 0 rgba(255,255,255,0.05)' }}>BATT · 2×AA</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <div style={{ width: '4px', height: '14px', background: '#1c1e21', borderRadius: '1px' }} />
                    <div style={{ width: '4px', height: '14px', background: '#1c1e21', borderRadius: '1px' }} />
                    <div style={{ width: '11px', height: '11px', borderRadius: '50%', alignSelf: 'center', background: 'radial-gradient(circle at 38% 32%, #595d62, #1f2225 72%)' }} />
                  </div>
                </div>
                <div onClick={flip} style={{ flex: 'none', padding: '0 18px', borderRadius: '6px', background: 'linear-gradient(#33373c,#22262a)', border: '1px solid #15171a', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', color: '#c2c6ca' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v4h4" /></svg>
                  <span style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em' }}>CLOSE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
