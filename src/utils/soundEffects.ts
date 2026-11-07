import { TypingSoundProfile } from "../types";

export interface TypingSoundOption {
  id: TypingSoundProfile;
  name: string;
  desc: string;
}

export const TYPING_SOUND_OPTIONS: TypingSoundOption[] = [
  { id: "off", name: "무음 (Mute)", desc: "타이핑 소리를 끕니다" },
  { id: "vintage-olympia", name: "1. 클래식 타자기 (Olympia)", desc: "묵직한 철제 해머와 종이 타격음" },
  { id: "vintage-hermes", name: "2. 포터블 타자기 (Hermes Baby)", desc: "경쾌하고 또렷한 빈티지 수동 타자기" },
  { id: "ibm-selectric", name: "3. 전동 타자기 (IBM Selectric)", desc: "특유의 박력 있는 전동 볼 타격음" },
  { id: "mech-blue", name: "4. 기계식 청축 (Clicky Blue)", desc: "찰칵거리는 선명한 클릭 스위치" },
  { id: "mech-brown", name: "5. 기계식 갈축 (Tactile Brown)", desc: "단정하고 절제된 택타일 구분감" },
  { id: "mech-red", name: "6. 기계식 적축 (Linear Red)", desc: "부드럽고 정숙한 리니어 타건음" },
  { id: "custom-thock", name: "7. 커스텀 조약돌 (Pebble Thock)", desc: "깊고 단단한 하이엔드 도각도각 사운드" },
  { id: "topre-raindrop", name: "8. 무접점 빗방울 (Topre Raindrop)", desc: "포근하고 보글보글한 무접점 사운드" },
  { id: "omm-waterdrop", name: "9. 옴라이터 물방울 (Omm Zen)", desc: "맑고 영롱한 물방울·실로폰 울림" },
  { id: "wood-keycap", name: "10. 우드 키캡 (Warm Wood)", desc: "따뜻하고 차분한 원목 블록 타건음" },
];

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let lastPlayTime = 0;
let lastBellTime = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

/**
 * Helper to trigger a filtered noise burst + resonant body tone
 */
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
  // Throttle ultra-rapid duplicate triggers within 12ms
  if (perfNow - lastPlayTime < 12) return;
  lastPlayTime = perfNow;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Subtle humanization jitter (±4%)
  const jitter = 0.96 + Math.random() * 0.08;
  const isSpace = key === " ";
  const isEnter = key === "Enter";
  const pitchMod = isSpace ? 0.84 : isEnter ? 0.78 : jitter;

  switch (profile) {
    case "vintage-olympia": {
      // 1. Classic Olympia manual typewriter: sharp metal hammer strike + paper platen thud
      triggerFilteredNoise(ctx, now, "bandpass", 1850 * pitchMod, 2.4, 0.36, 0.032);
      triggerFilteredNoise(ctx, now + 0.003, "lowpass", 420 * pitchMod, 1.5, 0.28, 0.045);
      triggerTone(ctx, now, "triangle", 320 * pitchMod, 95, 0.22, 0.035);
      break;
    }
    case "vintage-hermes": {
      // 2. Hermes Baby portable typewriter: crisp, snappy high-mid strike
      triggerFilteredNoise(ctx, now, "bandpass", 2650 * pitchMod, 3.2, 0.34, 0.024);
      triggerTone(ctx, now, "square", 540 * pitchMod, 160, 0.12, 0.022);
      triggerTone(ctx, now + 0.004, "sine", 210 * pitchMod, 110, 0.18, 0.028);
      break;
    }
    case "ibm-selectric": {
      // 3. IBM Selectric electric golf-ball typewriter: punchy electromechanical snap + motor damping
      triggerFilteredNoise(ctx, now, "bandpass", 1450 * pitchMod, 1.8, 0.38, 0.038);
      triggerTone(ctx, now, "sawtooth", 260 * pitchMod, 75, 0.20, 0.042);
      triggerFilteredNoise(ctx, now + 0.012, "highpass", 3400, 1.2, 0.14, 0.018);
      break;
    }
    case "mech-blue": {
      // 4. Clicky Blue mechanical switch: high-pitched click jacket + bottom-out clack
      triggerFilteredNoise(ctx, now, "bandpass", 4600 * pitchMod, 5.5, 0.30, 0.014);
      triggerTone(ctx, now, "sine", 3900 * pitchMod, 2200, 0.14, 0.012);
      triggerTone(ctx, now + 0.006, "triangle", 380 * pitchMod, 150, 0.16, 0.026);
      break;
    }
    case "mech-brown": {
      // 5. Tactile Brown switch: subtle bump + clean mid-frequency clack
      triggerFilteredNoise(ctx, now, "bandpass", 2100 * pitchMod, 2.8, 0.22, 0.022);
      triggerTone(ctx, now, "triangle", 310 * pitchMod, 130, 0.18, 0.028);
      break;
    }
    case "mech-red": {
      // 6. Linear Red switch: soft, smooth bottom-out without sharp high click
      triggerFilteredNoise(ctx, now, "lowpass", 1150 * pitchMod, 1.4, 0.20, 0.024);
      triggerTone(ctx, now, "sine", 230 * pitchMod, 105, 0.18, 0.028);
      break;
    }
    case "custom-thock": {
      // 7. Pebble Thock (lubed custom PBT keyboard): deep, resonant low-mid "도각도각"
      triggerFilteredNoise(ctx, now, "bandpass", 920 * pitchMod, 3.6, 0.28, 0.028);
      triggerTone(ctx, now, "sine", 195 * pitchMod, 88, 0.30, 0.038);
      triggerTone(ctx, now + 0.002, "triangle", 460 * pitchMod, 210, 0.15, 0.022);
      break;
    }
    case "topre-raindrop": {
      // 8. Topre electrostatic capacitive "보글보글" raindrop dome collapse
      triggerTone(ctx, now, "sine", 290 * pitchMod, 145, 0.26, 0.042);
      triggerTone(ctx, now + 0.005, "sine", 520 * pitchMod, 340, 0.12, 0.028);
      triggerFilteredNoise(ctx, now, "bandpass", 780 * pitchMod, 4.0, 0.15, 0.032);
      break;
    }
    case "omm-waterdrop": {
      // 9. OmmWriter Zen waterdrop / kalimba harmonic tone
      const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      const baseNote = pentatonic[Math.floor(Math.random() * pentatonic.length)] * (isSpace ? 0.75 : 1);
      triggerTone(ctx, now, "sine", baseNote * 0.92, baseNote, 0.15, 0.095);
      triggerTone(ctx, now, "sine", baseNote * 2, baseNote * 2.02, 0.045, 0.055);
      break;
    }
    case "wood-keycap": {
      // 10. Warm wooden block / rosewood keycap acoustic knock
      triggerTone(ctx, now, "sine", 410 * pitchMod, 175, 0.24, 0.030);
      triggerTone(ctx, now, "triangle", 820 * pitchMod, 390, 0.11, 0.018);
      triggerFilteredNoise(ctx, now, "bandpass", 1250 * pitchMod, 4.5, 0.18, 0.020);
      break;
    }
  }
}

/**
 * Plays a realistic vintage typewriter carriage return chime bell ("띵~")
 */
export function playCarriageReturnBell(): void {
  const perfNow = performance.now();
  // Prevent double ringing within 250ms
  if (perfNow - lastBellTime < 250) return;
  lastBellTime = perfNow;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Metallic clapper strike transient
  triggerFilteredNoise(ctx, now, "bandpass", 5200, 4.0, 0.18, 0.016);

  // Bell partials (clear vintage brass bell: fundamental ~2093Hz C7 + overtones)
  const partials = [
    { freq: 2093.0, gain: 0.22, decay: 0.85 },
    { freq: 3135.96, gain: 0.11, decay: 0.55 },
    { freq: 4434.92, gain: 0.06, decay: 0.35 },
  ];

  for (const p of partials) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(p.freq, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(p.gain, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + p.decay + 0.02);
  }
}
