export type TyporaTheme = "github" | "night" | "newsprint" | "gothic" | "custom";

export type TypewriterStyle = "horizontal" | "vertical";

export type TypingSoundProfile =
  | "off"
  | "vintage-olympia"
  | "vintage-hermes"
  | "ibm-selectric"
  | "mech-blue"
  | "mech-brown"
  | "mech-red"
  | "custom-thock"
  | "topre-raindrop"
  | "omm-waterdrop"
  | "wood-keycap"
  | "vintage-underwood";

export interface FileInfo {
  path: string;
  name: string;
  content: string;
}

export interface FolderNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FolderNode[] | null;
}

export interface FolderTree {
  root_path: string;
  root_name: string;
  nodes: FolderNode[];
}

export interface TabItem {
  id: string;
  path: string | null;
  name: string;
  content: string;
  isDirty: boolean;
  isSourceMode: boolean;
}

export interface OutlineItem {
  id: string;
  level: number;
  text: string;
  pos: number;
}

export interface AppSettings {
  theme: TyporaTheme;
  fontFamily: "sans" | "serif" | "mono" | "typewriter";
  fontSize: number; // 14, 16, 18, 20
  contentWidth: "narrow" | "default" | "wide" | "full"; // 720px, 860px, 1080px, 100%
  lineHeight: number; // 1.5, 1.7, 1.9
  showWordCount: boolean;
  typewriterMode: boolean; // 타자기 모드 ON/OFF
  typewriterStyle: TypewriterStyle; // 1번("horizontal"): 커서 정중앙 & 문장 이동, 2번("vertical"): 상단 60% 줄 고정 & 커서만 이동
  typewriterBell: boolean; // 행의 마지막에서 '띵~' 차임벨 소리
  typingSound: TypingSoundProfile; // 무음 + 10가지 타자 소리
  customBgImage: string; // 커스텀 테마 배경 이미지 (Data URL 또는 SVG/그라데이션 프리셋)
  customEditorBgColor: string; // 글 작성 영역 배경색 (#hex)
  customEditorBgOpacity: number; // 글 작성 영역 투명도 (0.0 ~ 1.0)
  customTextColor: string; // 커스텀 테마 글자색 (#hex)
}

// OmmWriter 감성의 기본 내장 설원/안개 풍경 SVG 배경 (Data URL)
export const DEFAULT_CUSTOM_BG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d8e2eb"/>
      <stop offset="52%" stop-color="#eef2f6"/>
      <stop offset="100%" stop-color="#f7f8fa"/>
    </linearGradient>
    <linearGradient id="hill1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#b9c9d8" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#eef2f6" stop-opacity="0.1"/>
    </linearGradient>
    <linearGradient id="hill2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9fb4c7" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#e5ebf1" stop-opacity="0.8"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#sky)"/>
  <circle cx="1220" cy="240" r="78" fill="#ffffff" fill-opacity="0.65"/>
  <path d="M0 640 Q 420 530 860 610 T 1600 580 L 1600 1000 L 0 1000 Z" fill="url(#hill1)"/>
  <path d="M0 730 Q 520 650 1050 720 T 1600 690 L 1600 1000 L 0 1000 Z" fill="url(#hill2)"/>
  <g stroke="#5b6e82" stroke-opacity="0.32" stroke-width="2" fill="none">
    <line x1="280" y1="680" x2="280" y2="615"/>
    <path d="M280 622 L266 650 M280 622 L294 650 M280 638 L263 668 M280 638 L297 668"/>
    <line x1="330" y1="692" x2="330" y2="642"/>
    <path d="M330 648 L319 670 M330 648 L341 670 M330 660 L316 683 M330 660 L344 683"/>
  </g>
</svg>`);

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "github",
  fontFamily: "sans",
  fontSize: 16,
  contentWidth: "default",
  lineHeight: 1.7,
  showWordCount: true,
  typewriterMode: false,
  typewriterStyle: "horizontal",
  typewriterBell: true,
  typingSound: "off",
  customBgImage: DEFAULT_CUSTOM_BG,
  customEditorBgColor: "#ffffff",
  customEditorBgOpacity: 0.78,
  customTextColor: "#22262c",
};
