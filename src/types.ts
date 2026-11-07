export type TyporaTheme = "github" | "night" | "newsprint" | "gothic";

export interface FileInfo {
  path: string;
  name: string;
  content: string;
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
  fontFamily: "sans" | "serif" | "mono";
  fontSize: number; // 14, 16, 18, 20
  contentWidth: "narrow" | "default" | "wide" | "full"; // 720px, 860px, 1080px, 100%
  lineHeight: number; // 1.5, 1.7, 1.9
  showWordCount: boolean;
  typewriterMode: boolean; // 커서 중앙 유지
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "github",
  fontFamily: "sans",
  fontSize: 16,
  contentWidth: "default",
  lineHeight: 1.7,
  showWordCount: true,
  typewriterMode: false,
};
