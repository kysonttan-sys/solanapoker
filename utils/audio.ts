
// Advanced Procedural Audio for Poker Realism
// No external assets required. Synthesized on the fly.

export type SoundType = 'chip' | 'check' | 'fold' | 'win' | 'turn';

// Singleton instance to prevent creating too many contexts
let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
    if (!audioCtx) {
        // Check for browser support
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    return audioCtx;
};

export const playGameSound = (type: SoundType) => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        
        // Resume context if suspended (browser autoplay policy)
        if (ctx.state === 'suspended') {
            ctx.resume().catch(e => console.warn("Audio resume blocked until user interaction", e));
        }

        const now = ctx.currentTime;

        // Helper: Create Noise Buffer (White/Pink noise approximation)
        // Cache this buffer in a real app, but generating it on fly is cheap enough for low poly audio
        const createNoise = () => {
            const bufferSize = ctx.sampleRate * 2.0;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                // Simple white noise
                data[i] = Math.random() * 2 - 1;
            }
            return buffer;
        };

        const noiseBuffer = createNoise();

        switch (type) {
            case 'chip':
                // REALISTIC CLAY CHIP CLACK
                // Layer 1: The "Click" (High frequency impact)
                const clickSrc = ctx.createBufferSource();
                clickSrc.buffer = noiseBuffer;
                
                const clickFilter = ctx.createBiquadFilter();
                clickFilter.type = 'bandpass';
                clickFilter.frequency.setValueAtTime(2800, now); // Clay chip frequency
                clickFilter.Q.value = 1.2;

                const clickGain = ctx.createGain();
                clickGain.gain.setValueAtTime(1.2, now);
                clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08); // Very short decay

                clickSrc.connect(clickFilter);
                clickFilter.connect(clickGain);
                clickGain.connect(ctx.destination);
                clickSrc.start(now);
                clickSrc.stop(now + 0.1);

                // Layer 2: The "Body" (Ceramic resonance)
                const resOsc = ctx.createOscillator();
                resOsc.type = 'sine';
                resOsc.frequency.setValueAtTime(2200, now);
                
                const resGain = ctx.createGain();
                resGain.gain.setValueAtTime(0.1, now);
                resGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

                resOsc.connect(resGain);
                resGain.connect(ctx.destination);
                resOsc.start(now);
                resOsc.stop(now + 0.05);
                break;

            case 'check':
                // REALISTIC TABLE KNOCK (Double Tap)
                // We need two impacts slightly spaced
                [0, 0.15].forEach((offset) => {
                    const knockSrc = ctx.createBufferSource();
                    knockSrc.buffer = noiseBuffer;

                    const knockFilter = ctx.createBiquadFilter();
                    knockFilter.type = 'lowpass';
                    knockFilter.frequency.setValueAtTime(120, now + offset); // Thud sound
                    
                    const knockGain = ctx.createGain();
                    knockGain.gain.setValueAtTime(0, now + offset);
                    knockGain.gain.linearRampToValueAtTime(0.8, now + offset + 0.01); // Attack
                    knockGain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.1); // Decay

                    knockSrc.connect(knockFilter);
                    knockFilter.connect(knockGain);
                    knockGain.connect(ctx.destination);
                    knockSrc.start(now + offset);
                    knockSrc.stop(now + offset + 0.2);
                });
                break;

            case 'fold':
                // REALISTIC CARD SLIDE (Felt friction)
                const slideSrc = ctx.createBufferSource();
                slideSrc.buffer = noiseBuffer;

                const slideFilter = ctx.createBiquadFilter();
                slideFilter.type = 'bandpass';
                slideFilter.frequency.setValueAtTime(1200, now);
                slideFilter.frequency.linearRampToValueAtTime(800, now + 0.3); // Pitch drops as slide slows
                slideFilter.Q.value = 0.8;

                const slideGain = ctx.createGain();
                slideGain.gain.setValueAtTime(0, now);
                slideGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
                slideGain.gain.linearRampToValueAtTime(0.01, now + 0.3);

                slideSrc.connect(slideFilter);
                slideFilter.connect(slideGain);
                slideGain.connect(ctx.destination);
                slideSrc.start(now);
                slideSrc.stop(now + 0.35);
                break;
            
            case 'turn':
                // ATTENTION DING (Glass/Bell)
                const bellOsc = ctx.createOscillator();
                bellOsc.type = 'sine';
                bellOsc.frequency.setValueAtTime(880, now); // A5
                
                const bellGain = ctx.createGain();
                bellGain.gain.setValueAtTime(0.05, now);
                bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

                bellOsc.connect(bellGain);
                bellGain.connect(ctx.destination);
                bellOsc.start(now);
                bellOsc.stop(now + 0.8);
                break;

            case 'win':
                // SUCCESS CHORD
                const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle'; // Softer than square, fuller than sine
                    osc.frequency.value = freq;
                    
                    const startTime = now + (i * 0.05);
                    gain.gain.setValueAtTime(0, startTime);
                    gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(startTime);
                    osc.stop(startTime + 0.6);
                });
                break;
        }

    } catch (e) {
        // Audio context error
        console.error("Audio playback error:", e);
    }
};
