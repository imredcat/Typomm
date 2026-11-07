import React, { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppSettings, TyporaTheme, DEFAULT_CUSTOM_BG } from "../types";
import { TYPING_SOUND_OPTIONS, playTypingSound, playCarriageReturnBell } from "../utils/soundEffects";
import { X, Palette, Type, Layout, Sliders, Volume2, Image as ImageIcon, Bell } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onClose: () => void;
}

const PRESET_BACKGROUNDS: { name: string; url: string }[] = [
  {
    name: "Omm 설원 (Winter Zen)",
    url: DEFAULT_CUSTOM_BG,
  },
  {
    name: "안개 낀 숲 (Misty Forest)",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c9d6d3"/>
          <stop offset="55%" stop-color="#dfe7e5"/>
          <stop offset="100%" stop-color="#f1f5f4"/>
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#g)"/>
      <path d="M0 680 Q 400 590 820 650 T 1600 620 L 1600 1000 L 0 1000 Z" fill="#8fa8a1" fill-opacity="0.28"/>
      <path d="M0 780 Q 520 710 1080 770 T 1600 740 L 1600 1000 L 0 1000 Z" fill="#6b877f" fill-opacity="0.22"/>
    </svg>`),
  },
  {
    name: "따뜻한 한지 (Warm Linen)",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="w" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stop-color="#f6efe2"/>
          <stop offset="100%" stop-color="#dfd3be"/>
        </radialGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#w)"/>
      <circle cx="1280" cy="220" r="140" fill="#ffffff" fill-opacity="0.35"/>
    </svg>`),
  },
  {
    name: "고요한 밤하늘 (Midnight Aurora)",
    url:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="n" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#141b29"/>
          <stop offset="50%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#n)"/>
      <ellipse cx="800" cy="300" rx="650" ry="180" fill="#38bdf8" fill-opacity="0.08"/>
      <ellipse cx="1100" cy="680" rx="520" ry="160" fill="#818cf8" fill-opacity="0.08"/>
    </svg>`),
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const themes: { id: TyporaTheme; name: string; desc: string; previewBg: string; previewText: string }[] = [
    { id: "github", name: "GitHub", desc: "화이트 & 클린 스타일", previewBg: "#ffffff", previewText: "#333333" },
    { id: "night", name: "Night", desc: "다크 테마 & 민트 포인트", previewBg: "#363b40", previewText: "#f8f8f8" },
    { id: "newsprint", name: "Newsprint", desc: "따뜻한 크림 페이퍼", previewBg: "#faf8f1", previewText: "#222222" },
    { id: "gothic", name: "Gothic", desc: "모던 에디토리얼 스타일", previewBg: "#fbfbfb", previewText: "#111111" },
    { id: "custom", name: "Custom (배경 이미지)", desc: "배경 이미지 & 반투명 글 영역", previewBg: "#dce5ee", previewText: "#1e293b" },
  ];

  const handlePickLocalImage = async () => {
    try {
      const dataUrl = await invoke<string | null>("pick_background_image");
      if (dataUrl) {
        onUpdateSettings({ theme: "custom", customBgImage: dataUrl });
      }
    } catch {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUpdateSettings({ theme: "custom", customBgImage: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Sliders size={18} />
            <span>환경설정 (Preferences)</span>
          </div>
          <button className="icon-btn" onClick={onClose} title="닫기 (Esc)">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Section: Themes */}
          <div className="settings-section">
            <div className="section-label">
              <Palette size={15} />
              <span>테마 선택 (Theme)</span>
            </div>
            <div className="theme-grid">
              {themes.map((t) => (
                <button
                  key={t.id}
                  className={`theme-card ${settings.theme === t.id ? "selected" : ""}`}
                  onClick={() => onUpdateSettings({ theme: t.id })}
                >
                  <div
                    className="theme-preview"
                    style={{
                      backgroundColor: t.previewBg,
                      color: t.previewText,
                      backgroundImage:
                        t.id === "custom" && settings.customBgImage
                          ? `url("${settings.customBgImage}")`
                          : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <span className="preview-heading">Typomm</span>
                    <span className="preview-sub">Aa #1</span>
                  </div>
                  <div className="theme-info">
                    <div className="theme-name">{t.name}</div>
                    <div className="theme-desc">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Theme Controls */}
            {settings.theme === "custom" && (
              <div className="custom-theme-panel">
                <div className="custom-panel-header">
                  <ImageIcon size={14} />
                  <span>커스텀 배경 이미지 & 글 작성 영역 투명 색상 설정</span>
                </div>

                <div className="settings-row">
                  <span className="row-label">배경 이미지 선택</span>
                  <div className="btn-group">
                    <button className="option-btn active" onClick={handlePickLocalImage}>
                      파일에서 이미지 선택...
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleFileInputChange}
                    />
                  </div>
                </div>

                <div className="settings-row">
                  <span className="row-label">기본 감성 배경 프리셋</span>
                  <div className="btn-group wrap-group">
                    {PRESET_BACKGROUNDS.map((preset) => (
                      <button
                        key={preset.name}
                        className={`option-btn ${settings.customBgImage === preset.url ? "active" : ""}`}
                        onClick={() => onUpdateSettings({ customBgImage: preset.url })}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <span className="row-label">글 작성 영역 배경색</span>
                  <div className="color-picker-row">
                    <input
                      type="color"
                      value={settings.customEditorBgColor}
                      onChange={(e) => onUpdateSettings({ customEditorBgColor: e.target.value })}
                      className="color-input-native"
                      title="글 작성 영역 배경색 직접 선택"
                    />
                    {[
                      { color: "#ffffff", text: "#22262c", label: "화이트" },
                      { color: "#faf8f1", text: "#222222", label: "크림" },
                      { color: "#eef3f0", text: "#1e2923", label: "세이지" },
                      { color: "#1e222a", text: "#f3f4f6", label: "다크 슬레이트" },
                      { color: "#111318", text: "#f8fafc", label: "차콜 블랙" },
                    ].map((chip) => (
                      <button
                        key={chip.color}
                        className={`color-chip-btn ${
                          settings.customEditorBgColor.toLowerCase() === chip.color ? "active" : ""
                        }`}
                        onClick={() =>
                          onUpdateSettings({
                            customEditorBgColor: chip.color,
                            customTextColor: chip.text,
                          })
                        }
                      >
                        <span className="chip-swatch" style={{ backgroundColor: chip.color }} />
                        <span>{chip.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <span className="row-label">
                    글 작성 영역 투명도 ({Math.round(settings.customEditorBgOpacity * 100)}%)
                  </span>
                  <div className="slider-control-row">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={2}
                      value={Math.round(settings.customEditorBgOpacity * 100)}
                      onChange={(e) =>
                        onUpdateSettings({ customEditorBgOpacity: Number(e.target.value) / 100 })
                      }
                      className="opacity-range-slider"
                    />
                  </div>
                </div>

                <div className="settings-row">
                  <span className="row-label">본문 글자 색상</span>
                  <div className="color-picker-row">
                    <input
                      type="color"
                      value={settings.customTextColor}
                      onChange={(e) => onUpdateSettings({ customTextColor: e.target.value })}
                      className="color-input-native"
                    />
                    <button
                      className={`option-btn ${settings.customTextColor === "#22262c" ? "active" : ""}`}
                      onClick={() => onUpdateSettings({ customTextColor: "#22262c" })}
                    >
                      어두운 글자 (#22262c)
                    </button>
                    <button
                      className={`option-btn ${settings.customTextColor === "#f3f4f6" ? "active" : ""}`}
                      onClick={() => onUpdateSettings({ customTextColor: "#f3f4f6" })}
                    >
                      밝은 글자 (#f3f4f6)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Typewriter Mode (Mode 1 & Mode 2 + Chime Bell) */}
          <div className="settings-section">
            <div className="section-label">
              <Layout size={15} />
              <span>타자기 모드 & 레이아웃 (Typewriter & Layout)</span>
            </div>

            <div className="settings-row">
              <span className="row-label">타자기 모드 활성화 (F9)</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.typewriterMode}
                  onChange={(e) => onUpdateSettings({ typewriterMode: e.target.checked })}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="settings-row">
              <span className="row-label">타자기 모드 동작 방식</span>
              <div className="btn-group">
                <button
                  className={`option-btn ${settings.typewriterStyle === "horizontal" ? "active" : ""}`}
                  onClick={() =>
                    onUpdateSettings({ typewriterMode: true, typewriterStyle: "horizontal" })
                  }
                >
                  1번: 커서 정중앙 고정 (문장 상하좌우 이동)
                </button>
                <button
                  className={`option-btn ${settings.typewriterStyle === "vertical" ? "active" : ""}`}
                  onClick={() =>
                    onUpdateSettings({ typewriterMode: true, typewriterStyle: "vertical" })
                  }
                >
                  2번: 상단 60% 줄 고정 (문장 고정 · 커서만 이동)
                </button>
              </div>
            </div>

            <div className="settings-row">
              <span className="row-label">행 마지막 도달 시 '띵~' 차임벨 소리</span>
              <div className="bell-control-group">
                <button
                  className="option-btn preview-bell-btn"
                  onClick={() => playCarriageReturnBell()}
                  title="차임벨 소리 미리듣기"
                >
                  <Bell size={13} />
                  <span>띵~ 미리듣기</span>
                </button>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.typewriterBell}
                    onChange={(e) => onUpdateSettings({ typewriterBell: e.target.checked })}
                  />
                  <span className="slider" />
                </label>
              </div>
            </div>

            <div className="settings-row">
              <span className="row-label">문서 최대 너비</span>
              <div className="btn-group">
                {[
                  { id: "narrow", label: "720px (집중)" },
                  { id: "default", label: "860px (표준)" },
                  { id: "wide", label: "1080px (넓게)" },
                  { id: "full", label: "100% (전체)" },
                ].map((w) => (
                  <button
                    key={w.id}
                    className={`option-btn ${settings.contentWidth === w.id ? "active" : ""}`}
                    onClick={() =>
                      onUpdateSettings({ contentWidth: w.id as AppSettings["contentWidth"] })
                    }
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Typing Sounds (Mute + 10 Sound Profiles) */}
          <div className="settings-section">
            <div className="section-label">
              <Volume2 size={15} />
              <span>타이핑 사운드 (무음 + 10가지 타자 소리 · 클릭 시 미리듣기)</span>
            </div>
            <div className="sound-grid">
              {TYPING_SOUND_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  className={`sound-card ${settings.typingSound === opt.id ? "selected" : ""}`}
                  onClick={() => {
                    onUpdateSettings({ typingSound: opt.id });
                    if (opt.id !== "off") {
                      playTypingSound(opt.id);
                    }
                  }}
                >
                  <div className="sound-card-title">{opt.name}</div>
                  <div className="sound-card-desc">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Typography */}
          <div className="settings-section">
            <div className="section-label">
              <Type size={15} />
              <span>타이포그래피 (Typography)</span>
            </div>

            <div className="settings-row">
              <span className="row-label">글꼴 계열</span>
              <div className="btn-group">
                <button
                  className={`option-btn ${settings.fontFamily === "sans" ? "active" : ""}`}
                  onClick={() => onUpdateSettings({ fontFamily: "sans" })}
                >
                  Sans-Serif (기본)
                </button>
                <button
                  className={`option-btn ${settings.fontFamily === "serif" ? "active" : ""}`}
                  onClick={() => onUpdateSettings({ fontFamily: "serif" })}
                >
                  Serif (명조/바탕)
                </button>
                <button
                  className={`option-btn ${settings.fontFamily === "mono" ? "active" : ""}`}
                  onClick={() => onUpdateSettings({ fontFamily: "mono" })}
                >
                  Monospace (고정폭)
                </button>
              </div>
            </div>

            <div className="settings-row">
              <span className="row-label">글자 크기</span>
              <div className="btn-group">
                {[14, 16, 18, 20].map((sz) => (
                  <button
                    key={sz}
                    className={`option-btn ${settings.fontSize === sz ? "active" : ""}`}
                    onClick={() => onUpdateSettings({ fontSize: sz })}
                  >
                    {sz}px
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <span className="row-label">줄 간격</span>
              <div className="btn-group">
                {[
                  { val: 1.5, label: "1.5 (좁게)" },
                  { val: 1.7, label: "1.7 (표준)" },
                  { val: 1.9, label: "1.9 (넓게)" },
                ].map((lh) => (
                  <button
                    key={lh.val}
                    className={`option-btn ${settings.lineHeight === lh.val ? "active" : ""}`}
                    onClick={() => onUpdateSettings({ lineHeight: lh.val })}
                  >
                    {lh.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="confirm-btn" onClick={onClose}>
            적용 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
