// Audio utility for game sounds

type GameSound = 'bet' | 'call' | 'fold' | 'check' | 'raise' | 'win' | 'deal' | 'turn' | 'river' | 'chip';

// Sound files mapping (can be replaced with actual audio files)
const soundMap: Record<GameSound, string> = {
  bet: '/sounds/bet.mp3',
  call: '/sounds/call.mp3',
  fold: '/sounds/fold.mp3',
  check: '/sounds/check.mp3',
  raise: '/sounds/raise.mp3',
  win: '/sounds/win.mp3',
  deal: '/sounds/deal.mp3',
  turn: '/sounds/turn.mp3',
  river: '/sounds/river.mp3',
  chip: '/sounds/chip.mp3',
};

let audioEnabled = true;
let volume = 0.5;

/**
 * Play a game sound effect
 */
export const playGameSound = (sound: GameSound) => {
  if (!audioEnabled) return;

  try {
    const audio = new Audio(soundMap[sound]);
    audio.volume = volume;
    audio.play().catch(err => {
      // Silently fail if audio cannot be played (e.g., autoplay restrictions)
      console.debug('Audio play failed:', err);
    });
  } catch (err) {
    console.debug('Audio error:', err);
  }
};

/**
 * Enable/disable audio
 */
export const setAudioEnabled = (enabled: boolean) => {
  audioEnabled = enabled;
};

/**
 * Set audio volume (0-1)
 */
export const setVolume = (vol: number) => {
  volume = Math.max(0, Math.min(1, vol));
};

/**
 * Get current audio settings
 */
export const getAudioSettings = () => ({
  enabled: audioEnabled,
  volume,
});
