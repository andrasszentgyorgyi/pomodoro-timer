import { useEffect, useRef } from 'react'
import useTimerStore from './store/useTimerStore'

// Standard public-domain audio URLs for immediate testing
const AUDIO_SOURCES = {
  click: '/audio/click.mp3',
  alarm: '/audio/alarm.mp3',
  rain: '/audio/rain.mp3',
  cafe: '/audio/rain.mp3' // Using rain as a placeholder until you find a cafe asset
}

function App() {
  const { 
    timeLeft, isRunning, mode, 
    ambientTrack, ambientVolume,
    startTimer, pauseTimer, resetTimer, tick, setMode,
    setAmbientTrack, setAmbientVolume
  } = useTimerStore()

  // Use a React Ref to control the persistent background audio element
  const ambientAudioRef = useRef(null)

  // 1. Audio Utility: Play short sound effects instantly
  const playSoundEffect = (type) => {
    const sound = new Audio(AUDIO_SOURCES[type])
    sound.volume = 0.4
    sound.play().catch(err => console.log("Audio playback blocked until user interaction:", err))
  }

  // 2. Wrap actions with a click sound
  const handleStartPause = () => {
    playSoundEffect('click')
    if (isRunning) pauseTimer() 
    else startTimer()
  }

  const handleReset = () => {
    playSoundEffect('click')
    resetTimer()
  }

  const handleModeChange = (newMode) => {
    setMode(newMode)
  }

  // 3. Timer Loop & Session End Alarm
  useEffect(() => {
    let interval = null
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => tick(), 1000)
    } else if (timeLeft === 0) {
      clearInterval(interval)
      playSoundEffect('alarm') // Play calm completion signal when timer hits 0
    }
    
    return () => clearInterval(interval)
  }, [isRunning, timeLeft, tick])

  // 4. Background Ambient Noise Controller
  useEffect(() => {
    if (!ambientAudioRef.current) return

    const audio = ambientAudioRef.current
    audio.volume = ambientVolume

    if (ambientTrack !== 'none') {
      audio.src = AUDIO_SOURCES[ambientTrack]
      audio.loop = true
      
      // Only play background noise if the timer is actively running
      if (isRunning) {
        audio.play().catch(err => console.log("Playback interrupted:", err))
      } else {
        audio.pause()
      }
    } else {
      audio.pause()
    }
  }, [ambientTrack, isRunning, ambientVolume])

  // Helper to format seconds into MM:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-900 text-white p-6">
      
      {/* Hidden HTML5 Audio element for background streaming */}
      <audio ref={ambientAudioRef} />

      {/* Mode Selectors */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => handleModeChange('work')}
          className={`px-4 py-2 rounded-full font-semibold transition-colors ${
            mode === 'work' ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Focus
        </button>
        <button
          onClick={() => handleModeChange('break')}
          className={`px-4 py-2 rounded-full font-semibold transition-colors ${
            mode === 'break' ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Break
        </button>
      </div>

      {/* Timer Display */}
      <div className="text-9xl font-bold tracking-tighter mb-8 tabular-nums">
        {formatTime(timeLeft)}
      </div>

      {/* Core Controls */}
      <div className="flex gap-4 mb-16">
        <button
          onClick={handleStartPause}
          className="px-8 py-3 bg-white text-zinc-900 font-bold rounded-full hover:bg-zinc-200 transition-transform active:scale-95"
        >
          {isRunning ? 'PAUSE' : 'START'}
        </button>
        <button
          onClick={handleReset}
          className="px-8 py-3 bg-zinc-800 text-white font-bold rounded-full hover:bg-zinc-700 transition-transform active:scale-95"
        >
          RESET
        </button>
      </div>

      {/* Audio Panel Card */}
      <div className="w-full max-w-md bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-lg font-bold mb-4 tracking-tight text-zinc-200">Background Atmosphere</h2>
        
        {/* Track Selection Buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {['none', 'rain', 'cafe'].map((track) => (
            <button
              key={track}
              onClick={() => setAmbientTrack(track) }
              className={`py-2 px-3 rounded-xl capitalize font-medium text-sm transition-colors ${
                ambientTrack === track 
                  ? 'bg-zinc-100 text-zinc-900 font-semibold' 
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
              }`}
            >
              {track === 'none' ? 'Silent' : track}
            </button>
          ))}
        </div>

        {/* Volume Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-zinc-400 font-medium">
            <span>Volume</span>
            <span>{Math.round(ambientVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={ambientVolume}
            onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        <p className="mt-3 text-[11px] text-zinc-500 text-center">
          Note: Atmosphere plays automatically when the timer is running.
        </p>
      </div>
      
    </div>
  )
}

export default App