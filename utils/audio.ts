// Audio utility for realistic poker sounds using Web Audio API
// Generates authentic casino-like sounds programmatically

type GameSound = 'bet' | 'call' | 'fold' | 'check' | 'raise' | 'win' | 'deal' | 'turn' | 'river' | 'chip' | 'your_turn' | 'timer';

let audioContext: AudioContext | null = null;
let audioEnabled = true;
let volume = 0.5;

// Initialize audio context on first user interaction
const getAudioContext = (): AudioContext | null => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  // Resume if suspended (Chrome autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

// Create filtered noise for chip/card sounds
const playNoise = (duration: number, filterFreq: number, filterType: BiquadFilterType, gainValue: number) => {
  const ctx = getAudioContext();
  if (!ctx || !audioEnabled) return;

  try {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);
    filter.Q.setValueAtTime(1, ctx.currentTime);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue * volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + duration);
  } catch (e) {
    console.debug('Noise play error:', e);
  }
};

// Chip clinking sound - ceramic/clay chip hitting felt (professional casino sound)
const playChipSound = () => {
  const ctx = getAudioContext();
  if (!ctx || !audioEnabled) return;

  // Multiple quick impacts to simulate chip stack - deeper, more realistic
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      playNoise(0.08, 2200 + Math.random() * 800, 'bandpass', 0.18);
      playTone(600 + Math.random() * 300, 0.05, 'sine', 0.12);
    }, i * 30);
  }
};

// Card dealing - whoosh/slide sound
const playCardDeal = () => {
  const ctx = getAudioContext();
  if (!ctx || !audioEnabled) return;

  // Card slide whoosh
  playNoise(0.12, 2500, 'highpass', 0.08);
  
  // Card landing thump
  setTimeout(() => {
    playNoise(0.05, 200, 'lowpass', 0.12);
  }, 80);
};

// Card flip for community cards
const playCardFlip = () => {
  playNoise(0.08, 3000, 'bandpass', 0.1);
  setTimeout(() => playNoise(0.04, 400, 'lowpass', 0.08), 60);
};

// Sound generators using realistic casino sounds
const soundGenerators: Record<GameSound, () => void> = {
  // Single chip clink
  chip: () => playChipSound(),
  
  // Bet: professional chip sliding and stacking
  bet: () => {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        playChipSound();
        // Add felt thump
        playTone(200, 0.04, 'sine', 0.08);
      }, i * 40);
    }
  },

  // Call: clean chip toss with weight
  call: () => {
    playChipSound();
    setTimeout(() => {
      playChipSound();
      playTone(220, 0.06, 'sine', 0.12);
    }, 65);
  },

  // Check: table tap - professional knock
  check: () => {
    playNoise(0.08, 350, 'lowpass', 0.22);
    playTone(160, 0.07, 'sine', 0.16);
  },

  // Fold: cards sliding with muted thud
  fold: () => {
    playNoise(0.16, 1400, 'highpass', 0.11);
    setTimeout(() => {
      playNoise(0.09, 280, 'lowpass', 0.09);
      playTone(140, 0.08, 'sine', 0.08);
    }, 110);
  },

  // Raise: authoritative chip stack
  raise: () => {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        playChipSound();
        // Add weight every 2nd chip
        if (i % 2 === 0) {
          playTone(180, 0.06, 'sine', 0.14);
        }
      }, i * 32);
    }
    // Authoritative thud at the end
    setTimeout(() => {
      playTone(110, 0.18, 'sine', 0.22);
      playNoise(0.12, 300, 'lowpass', 0.16);
    }, 200);
  },
  
  // Win: professional chip sweep sound (no music)
  win: () => {
    // Professional chip sweep - faster, more intense
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        playChipSound();
        // Add deeper thump for weight
        if (i % 3 === 0) {
          playTone(150, 0.08, 'sine', 0.15);
        }
      }, i * 45);
    }
    // Final satisfying thud
    setTimeout(() => {
      playTone(120, 0.2, 'sine', 0.2);
      playNoise(0.15, 400, 'lowpass', 0.18);
    }, 480);
  },
  
  // Deal: multiple cards being dealt
  deal: () => {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => playCardDeal(), i * 120);
    }
  },
  
  // Turn: single community card reveal
  turn: () => {
    playCardFlip();
    setTimeout(() => playTone(350, 0.1, 'sine', 0.12), 80);
  },
  
  // River: final card with subtle drama
  river: () => {
    playCardFlip();
    setTimeout(() => playTone(400, 0.12, 'sine', 0.15), 80);
    setTimeout(() => playTone(500, 0.1, 'sine', 0.1), 150);
  },
  
  // Your turn notification - professional alert
  your_turn: () => {
    // Double tap - clear but not musical
    playTone(600, 0.08, 'sine', 0.22);
    playNoise(0.05, 2000, 'bandpass', 0.15);
    setTimeout(() => {
      playTone(600, 0.08, 'sine', 0.22);
      playNoise(0.05, 2000, 'bandpass', 0.15);
    }, 120);
  },
  
  // Timer warning - subtle tick
  timer: () => {
    playTone(800, 0.03, 'square', 0.15);
    playNoise(0.02, 1000, 'bandpass', 0.08);
  },
};

/**
 * Play a tone using Web Audio API
 */
const playTone = (
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainValue: number = 0.3
) => {
  const ctx = getAudioContext();
  if (!ctx || !audioEnabled) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(gainValue * volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.debug('Tone play error:', e);
  }
};

/**
 * Play a game sound effect
 */
export const playGameSound = (sound: GameSound) => {
  if (!audioEnabled) return;

  const generator = soundGenerators[sound];
  if (generator) {
    generator();
  }
};

/**
 * Enable/disable audio
 */
export const setAudioEnabled = (enabled: boolean) => {
  audioEnabled = enabled;
  // Initialize audio context on enable (requires user interaction)
  if (enabled) {
    getAudioContext();
  }
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

/**
 * Initialize audio on user interaction (call this on first click/tap)
 */
export const initAudio = () => {
  getAudioContext();
};

/**
 * Test all sounds (for debugging)
 */
export const testAllSounds = () => {
  const sounds: GameSound[] = ['chip', 'bet', 'call', 'check', 'fold', 'raise', 'deal', 'turn', 'river', 'win', 'your_turn', 'timer'];
  sounds.forEach((sound, index) => {
    setTimeout(() => {
      console.log(`Playing: ${sound}`);
      playGameSound(sound);
    }, index * 800);
  });
};
