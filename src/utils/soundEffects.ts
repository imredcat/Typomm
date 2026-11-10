import { TypingSoundProfile } from "../types";

export interface TypingSoundOption {
  id: TypingSoundProfile;
  name: string;
}

export const TYPING_SOUND_OPTIONS: TypingSoundOption[] = [
  { id: "off", name: "0. 무음" },
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
  { id: "vintage-underwood", name: "11. 언더우드 타자기" },
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

function triggerMetallicRing(
  ctx: AudioContext,
  now: number,
  freq: number,
  gainPeak: number,
  duration: number
) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.001);
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
      // 1. 클래식 타자기 (1950s Olympia SM-3):
      // 정교한 기계식 놋쇠 활자봉이 종이와 고무 롤러를 경쾌하고 선명하게 때리는 클래식 "탁! 찰칵"
      if (isSpace) {
        triggerFilteredNoise(ctx, now, "bandpass", 920 * pitchMod, 2.5, 0.32, 0.035);
        triggerTone(ctx, now, "triangle", 150 * pitchMod, 60, 0.22, 0.038);
      } else {
        // 얇고 팽팽한 종이와 고무 롤러 타격음 (1850Hz)
        triggerFilteredNoise(ctx, now, "bandpass", 1850 * pitchMod, 4.0, 0.45, 0.024);
        // 고무 플래튼 롤러 바디의 탄력 있는 중저음 (210Hz -> 70Hz)
        triggerTone(ctx, now, "triangle", 210 * pitchMod, 70, 0.28, 0.032);
        // 정교한 톱니바퀴 에스케이프먼트(Escapement)의 경쾌한 찰칵
        triggerFilteredNoise(ctx, now + 0.006, "highpass", 3900 * pitchMod, 2.2, 0.22, 0.018);
        triggerTone(ctx, now + 0.004, "sine", 920 * pitchMod, 420, 0.15, 0.016);
      }
      break;
    }
    case "vintage-hermes": {
      // 2. 포터블 타자기 (Hermes Baby):
      // 초경량 알루미늄 바디의 가볍고 찰진 높은 피치의 "착! 칫!"
      triggerFilteredNoise(ctx, now, "bandpass", 2700 * pitchMod, 3.4, 0.32, 0.022);
      triggerTone(ctx, now, "square", 580 * pitchMod, 200, 0.1, 0.018);
      triggerTone(ctx, now + 0.003, "sine", 240 * pitchMod, 120, 0.15, 0.024);
      break;
    }
    case "ibm-selectric": {
      // 3. 전동 타자기 (IBM Selectric Typeball):
      // 전동 모터 회전 + 전기 솔레노이드 기구가 Typeball 골프공 헤드를 강력하게 내리꽂는 묵직한 "철컥-탁!"
      if (isSpace) {
        // 전동 랙 어드밴스드
        triggerFilteredNoise(ctx, now, "bandpass", 1100 * pitchMod, 2.2, 0.34, 0.035);
        triggerTone(ctx, now, "sawtooth", 190 * pitchMod, 80, 0.24, 0.04);
      } else {
        // 1) 순간적인 전기 솔레노이드 작동 메커니즘 (전동 기계 래치)
        triggerTone(ctx, now, "sawtooth", 340 * pitchMod, 95, 0.26, 0.038);
        // 2) 회전형 골프공(Typeball) 헤드가 고속으로 플래튼을 때려박는 단단한 타격음
        triggerFilteredNoise(ctx, now + 0.002, "bandpass", 1250 * pitchMod, 2.8, 0.44, 0.032);
        // 3) 전동 파워 전달 기어 래칫의 메탈 스냅
        triggerFilteredNoise(ctx, now + 0.008, "bandpass", 2600 * pitchMod, 2.4, 0.24, 0.02);
        triggerTone(ctx, now + 0.004, "triangle", 160 * pitchMod, 55, 0.22, 0.042);
      }
      break;
    }
    case "mech-blue": {
      // 4. 기계식 청축 (Cherry MX Blue):
      // 명확한 2단 클릭 재킷(Click Jacket)의 찰칵! 하는 고음 스냅
      triggerFilteredNoise(ctx, now, "bandpass", 4800 * pitchMod, 6.0, 0.32, 0.014);
      triggerTone(ctx, now, "sine", 4100 * pitchMod, 2400, 0.16, 0.012);
      triggerTone(ctx, now + 0.005, "triangle", 360 * pitchMod, 140, 0.16, 0.024);
      break;
    }
    case "mech-brown": {
      // 5. 기계식 갈축 (Cherry MX Brown):
      // 클릭음 없이 미세한 걸림과 부드러운 서걱-도각
      triggerFilteredNoise(ctx, now, "bandpass", 1950 * pitchMod, 2.6, 0.22, 0.022);
      triggerTone(ctx, now, "triangle", 310 * pitchMod, 130, 0.18, 0.026);
      break;
    }
    case "mech-red": {
      // 6. 기계식 적축 (Cherry MX Red):
      // 걸림 없는 리니어 스위치 특유의 폭신하고 먹먹하게 가라앉는 저음 바닥 침 (Muted Thud)
      // 고음 클릭이 전혀 없고 중저역(550Hz Lowpass)으로 흡음 폼을 누르는 소리
      triggerFilteredNoise(ctx, now, "lowpass", 550 * pitchMod, 1.2, 0.22, 0.026);
      triggerTone(ctx, now, "sine", 165 * pitchMod, 65, 0.25, 0.034);
      break;
    }
    case "custom-thock": {
      // 7. 조약돌 도각 (Pebble Clack):
      // 단단하고 매끄러운 2개의 조약돌이나 바둑알이 서로 경쾌하고 단단하게 부딪힐 때의 "딱! 또각!" 소리
      // 고체 광물질 특유의 선명한 맑은 임팩트 + 짧은 미네랄 공명음
      // 1) 돌 표면 충돌 순간의 극단적으로 날카롭고 단단한 광물 틱 (3400Hz)
      triggerFilteredNoise(ctx, now, "bandpass", 3400 * pitchMod, 4.2, 0.36, 0.012);
      // 2) 매끄러운 조약돌 몸통의 맑고 단단한 고유 공명음 (1380Hz -> 1050Hz)
      triggerTone(ctx, now, "sine", 1380 * pitchMod, 1050, 0.34, 0.022);
      // 3) 조약돌 2차 배음 핑 (2450Hz)
      triggerTone(ctx, now + 0.001, "triangle", 2450 * pitchMod, 1850, 0.14, 0.015);
      // 4) 손바닥과 돌 사이의 짧은 옹골찬 바디 사운드 (480Hz -> 280Hz)
      triggerTone(ctx, now + 0.002, "sine", 480 * pitchMod, 280, 0.22, 0.018);
      break;
    }
    case "topre-raindrop": {
      // 8. 무접점 빗방울:
      // 영롱하게 위로 솟아오르는 맑은 빗방울 물방울
      const dropStart = (1380 + Math.random() * 200) * pitchMod;
      const dropEnd = dropStart * 1.75;
      triggerTone(ctx, now, "sine", dropStart, dropEnd, 0.32, 0.05);
      triggerTone(ctx, now + 0.003, "sine", dropStart * 1.98, dropEnd * 1.95, 0.09, 0.038);
      triggerTone(ctx, now + 0.001, "triangle", 200 * pitchMod, 110, 0.13, 0.026);
      break;
    }
    case "omm-waterdrop": {
      // 9. 옴 물방울:
      // 펜타토닉 음계의 화음 물방울
      const pentatonic = [587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];
      const baseNote =
        pentatonic[Math.floor(Math.random() * pentatonic.length)] * (isSpace ? 0.75 : 1);
      triggerTone(ctx, now, "sine", baseNote * 0.94, baseNote * 1.25, 0.22, 0.09);
      triggerTone(ctx, now + 0.002, "sine", baseNote * 2, baseNote * 2.05, 0.06, 0.06);
      break;
    }
    case "wood-keycap": {
      // 10. 우드 키캡:
      // 목탁/나무 블록의 통통거리는 따뜻하고 단단한 원목 공명음
      triggerTone(ctx, now, "sine", 440 * pitchMod, 180, 0.28, 0.028);
      triggerTone(ctx, now, "triangle", 880 * pitchMod, 420, 0.14, 0.018);
      triggerFilteredNoise(ctx, now, "bandpass", 1150 * pitchMod, 4.0, 0.18, 0.018);
      break;
    }
    case "vintage-underwood": {
      // 11. 언더우드 타자기 (1920s Antique Underwood No. 5):
      // 15kg 무거운 쇳덩어리 주철(Cast Iron) 몸체와 두꺼운 철제 활자대의 육중한 충격 + 쇠 스프링 핑
      if (isSpace) {
        // 무거운 쇠 주철 캐리지 레일 덜컹
        triggerFilteredNoise(ctx, now, "bandpass", 650 * pitchMod, 2.0, 0.38, 0.048);
        triggerTone(ctx, now, "sawtooth", 110 * pitchMod, 40, 0.32, 0.052);
        triggerMetallicRing(ctx, now + 0.005, 780 * pitchMod, 0.08, 0.04);
      } else {
        // 1) 묵직한 주철 몸통 전체를 흔드는 깊은 저음 충격 (135Hz -> 42Hz)
        triggerTone(ctx, now, "triangle", 135 * pitchMod, 42, 0.42, 0.048);
        // 2) 육중한 쇠 활자바의 거칠고 강한 쇳소리 타격 (980Hz 밴드패스)
        triggerFilteredNoise(ctx, now, "bandpass", 980 * pitchMod, 2.4, 0.48, 0.038);
        // 3) 앤틱 강철 스프링과 철제 레버의 금속성 링잉 (1550Hz, 2300Hz 메탈릭 핑)
        triggerMetallicRing(ctx, now + 0.003, 1550 * pitchMod, 0.16, 0.042);
        triggerMetallicRing(ctx, now + 0.005, 2320 * pitchMod, 0.09, 0.035);
        // 4) 거친 기계식 래치 노이즈
        triggerFilteredNoise(ctx, now + 0.01, "highpass", 2800 * pitchMod, 1.4, 0.22, 0.024);
      }
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
