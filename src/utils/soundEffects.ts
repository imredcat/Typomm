import { TypingSoundProfile } from "../types";

export interface TypingSoundOption {
  id: TypingSoundProfile;
  name: string;
}

export const TYPING_SOUND_OPTIONS: TypingSoundOption[] = [
  { id: "off", name: "무음" },
  { id: "vintage-olympia", name: "1. 클래식 타자기" },
  { id: "vintage-hermes", name: "2. 포터블 타자기" },
  { id: "ibm-selectric", name: "3. 전동 타자기" },
  { id: "mech-blue", name: "4. 기계식 청축" },
  { id: "mech-brown", name: "5. 기계식 갈축" },
  { id: "mech-red", name: "6. 기계식 적축" },
  { id: "custom-thock", name: "7. 조약돌 도각" },
  { id: "topre-raindrop", name: "8. 무접점 빗방울" },
  { id: "omm-waterdrop", name: "9. 옴 물방울" },
  { id: "wood-keycap", name: "10. 우드 키캡" },
];

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let lastPlayTime = 0;
let lastBellTime = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer;
  }
  const length = Math.floor(ctx.sampleRate * 0.15);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return buffer;
}

function triggerFilteredNoise(
  ctx: AudioContext,
  now: number,
  filterType: BiquadFilterType,
  freq: number,
  q: number,
  gainPeak: number,
  duration: number
) {
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(freq, now);
  filter.Q.setValueAtTime(q, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.0015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  src.start(now);
  src.stop(now + duration + 0.005);
}

function triggerTone(
  ctx: AudioContext,
  now: number,
  type: OscillatorType,
  startFreq: number,
  endFreq: number,
  gainPeak: number,
  duration: number
) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, now);
  if (endFreq !== startFreq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.0015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.005);
}

export function playTypingSound(profile: TypingSoundProfile, key?: string): void {
  if (profile === "off") return;

  const perfNow = performance.now();
  if (perfNow - lastPlayTime < 12) return;
  lastPlayTime = perfNow;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const jitter = 0.96 + Math.random() * 0.08;
  const isSpace = key === " ";
  const isEnter = key === "Enter";
  const pitchMod = isSpace ? 0.84 : isEnter ? 0.78 : jitter;

  switch (profile) {
    case "vintage-olympia": {
      // 1950s Mechanical Typewriter (Based on real ASMR 1950s typewriter audio)
      if (isSpace) {
        // Spacebar: Heavy carriage ratchet advance without typebar strike
        triggerFilteredNoise(ctx, now, "bandpass", 950 * pitchMod, 2.2, 0.32, 0.038);
        triggerTone(ctx, now, "triangle", 140 * pitchMod, 50, 0.24, 0.042);
      } else {
        // 1. Sharp metallic typebar impact on paper/platen (1600Hz~2200Hz narrow bandpass)
        triggerFilteredNoise(ctx, now, "bandpass", 1950 * pitchMod, 3.8, 0.45, 0.026);
        // 2. Heavy steel platen roller body thud (180Hz -> 55Hz pitch drop)
        triggerTone(ctx, now, "triangle", 185 * pitchMod, 55, 0.32, 0.036);
        // 3. Crisp mechanical key-lever click & escapement rebound
        triggerFilteredNoise(ctx, now + 0.008, "highpass", 3800 * pitchMod, 1.8, 0.22, 0.02);
        triggerTone(ctx, now + 0.004, "sine", 850 * pitchMod, 380, 0.16, 0.018);
      }
      break;
    }
    case "vintage-hermes": {
      triggerFilteredNoise(ctx, now, "bandpass", 2650 * pitchMod, 3.2, 0.34, 0.024);
      triggerTone(ctx, now, "square", 540 * pitchMod, 160, 0.12, 0.022);
      triggerTone(ctx, now + 0.004, "sine", 210 * pitchMod, 110, 0.18, 0.028);
      break;
    }
    case "ibm-selectric": {
      triggerFilteredNoise(ctx, now, "bandpass", 1450 * pitchMod, 1.8, 0.38, 0.038);
      triggerTone(ctx, now, "sawtooth", 260 * pitchMod, 75, 0.2, 0.042);
      triggerFilteredNoise(ctx, now + 0.012, "highpass", 3400, 1.2, 0.14, 0.018);
      break;
    }
    case "mech-blue": {
      triggerFilteredNoise(ctx, now, "bandpass", 4600 * pitchMod, 5.5, 0.3, 0.014);
      triggerTone(ctx, now, "sine", 3900 * pitchMod, 2200, 0.14, 0.012);
      triggerTone(ctx, now + 0.006, "triangle", 380 * pitchMod, 150, 0.16, 0.026);
      break;
    }
    case "mech-brown": {
      triggerFilteredNoise(ctx, now, "bandpass", 2100 * pitchMod, 2.8, 0.22, 0.022);
      triggerTone(ctx, now, "triangle", 310 * pitchMod, 130, 0.18, 0.028);
      break;
    }
    case "mech-red": {
      triggerFilteredNoise(ctx, now, "lowpass", 1150 * pitchMod, 1.4, 0.2, 0.024);
      triggerTone(ctx, now, "sine", 230 * pitchMod, 105, 0.18, 0.028);
      break;
    }
    case "custom-thock": {
      triggerFilteredNoise(ctx, now, "bandpass", 920 * pitchMod, 3.6, 0.28, 0.028);
      triggerTone(ctx, now, "sine", 195 * pitchMod, 88, 0.3, 0.038);
      triggerTone(ctx, now + 0.002, "triangle", 460 * pitchMod, 210, 0.15, 0.022);
      break;
    }
    case "topre-raindrop": {
      // Crystal-clear water droplet ("맑고 영롱한 물방울 소리")
      const dropStart = (1350 + Math.random() * 220) * pitchMod;
      const dropEnd = dropStart * 1.72; // upward chirping waterdrop glide
      triggerTone(ctx, now, "sine", dropStart, dropEnd, 0.32, 0.052);
      triggerTone(ctx, now + 0.003, "sine", dropStart * 1.98, dropEnd * 1.95, 0.09, 0.04);
      triggerTone(ctx, now + 0.001, "triangle", 210 * pitchMod, 120, 0.14, 0.028);
      break;
    }
    case "omm-waterdrop": {
      // Pure harmonic droplet melody (Pentatonic, pure sine overtones)
      const pentatonic = [587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];
      const baseNote =
        pentatonic[Math.floor(Math.random() * pentatonic.length)] * (isSpace ? 0.75 : 1);
      triggerTone(ctx, now, "sine", baseNote * 0.94, baseNote * 1.25, 0.22, 0.09);
      triggerTone(ctx, now + 0.002, "sine", baseNote * 2, baseNote * 2.05, 0.06, 0.06);
      break;
    }
    case "wood-keycap": {
      triggerTone(ctx, now, "sine", 410 * pitchMod, 175, 0.24, 0.03);
      triggerTone(ctx, now, "triangle", 820 * pitchMod, 390, 0.11, 0.018);
      triggerFilteredNoise(ctx, now, "bandpass", 1250 * pitchMod, 4.5, 0.18, 0.02);
      break;
    }
  }
}

/**
 * Plays a pure, crystal-clear chime bell ("맑은 띵~ 차임벨") when the cursor reaches the end of a line.
 */
export function playCarriageReturnBell(): void {
  const perfNow = performance.now();
  if (perfNow - lastBellTime < 180) return;
  lastBellTime = perfNow;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Pure, clear harmonic bell partials (E7 2637Hz fundamental + warm overtones, no noisy click)
  const partials = [
    { freq: 2637.02, gain: 0.22, attack: 0.003, decay: 1.15 }, // Fundamental E7 (clear bell ring)
    { freq: 5274.04, gain: 0.08, attack: 0.002, decay: 0.65 }, // Octave harmonic E8 (bright shimmer)
    { freq: 3951.07, gain: 0.05, attack: 0.002, decay: 0.45 }, // Fifth harmonic B7 (warm resonance)
    { freq: 7040.0, gain: 0.03, attack: 0.001, decay: 0.18 },  // Delicate silver bell ping
  ];

  for (const p of partials) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(p.freq, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(p.gain, now + p.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + p.decay + 0.02);
  }
}
