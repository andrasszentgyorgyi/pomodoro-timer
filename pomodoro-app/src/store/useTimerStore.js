import { create } from 'zustand'

const useTimerStore = create((set) => ({
  // Timer State
  timeLeft: 25 * 60,
  isRunning: false,
  mode: 'work',

  // Audio State
  ambientTrack: 'none', // 'none', 'rain', or 'cafe'
  ambientVolume: 0.5,

  // Timer Actions
  startTimer: () => set({ isRunning: true }),
  pauseTimer: () => set({ isRunning: false }),
  resetTimer: () => set((state) => ({
    isRunning: false,
    timeLeft: state.mode === 'work' ? 25 * 60 : 5 * 60
  })),
  
  tick: () => set((state) => {
    if (state.timeLeft > 0) {
      return { timeLeft: state.timeLeft - 1 }
    }
    return { isRunning: false, timeLeft: 0 }
  }),

  setMode: (newMode) => set({
    mode: newMode,
    isRunning: false,
    timeLeft: newMode === 'work' ? 25 * 60 : 5 * 60
  }),

  // Audio Actions
  setAmbientTrack: (track) => set({ ambientTrack: track }),
  setAmbientVolume: (volume) => set({ ambientVolume: volume })
}))

export default useTimerStore