import React, { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppSettings, TyporaTheme, DEFAULT_CUSTOM_BG } from "../types";
import { TYPING_SOUND_OPTIONS, playTypingSound, playCarriageReturnBell } from "../utils/soundEffects";
import { X, Sliders, Image as ImageIcon, Bell } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onClose: () => void;
}

const PRESET_BACKGROUNDS: { name: string; url: string }[] = [
  { name: "설원", url: DEFAULT_CUSTOM_BG },
  {
    name: "안개 숲",
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
    name: "한지",
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
    name: "밤하늘",
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

  const themes: { id: TyporaTheme; name: string; previewBg: string; previewText: string }[] = [
    { id: "github", name: "GitHub", previewBg: "#ffffff", previewText: "#333333" },
    { id: "night", name: "Night", previewBg: "#363b40", previewText: "#f8f8f8" },
    { id: "newsprint", name: "Newsprint", previewBg: "#faf8f1", previewText: "#222222" },
    { id: "gothic", name: "Gothic", previewBg: "#fbfbfb", previewText: "#111111" },
    { id: "custom", name: "커스텀", previewBg: "#dce5ee", previewText: "#1e293b" },
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
      <div className="settings-modal compact-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Sliders size={16} />
            <span>설정</span>
          </div>
          <button className="icon-btn" onClick={onClose} title="닫기 (Esc)">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* 테마 */}
          <div className="settings-section">
            <div className="theme-strip">
              {themes.map((t) => (
                <button
                  key={t.id}
                  className={`theme-chip ${settings.theme === t.id ? "selected" : ""}`}
                  onClick={() => onUpdateSettings({ theme: t.id })}
                  title={`${t.name} 테마`}
                >
                  <span
                    className="theme-swatch"
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
                    Aa
                  </span>
                  <span className="theme-chip-label">{t.name}</span>
                </button>
              ))}
            </div>

            {settings.theme === "custom" && (
              <div className="custom-theme-panel">
                <div className="settings-row">
                  <span className="row-label">배경 이미지</span>
                  <div className="color-picker-row">
                    <button className="option-btn active" onClick={handlePickLocalImage} title="배경 이미지 파일 선택">
                      <ImageIcon size={12} style={{ marginRight: 4, verticalAlign: "-1px" }} />
                      파일 선택
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleFileInputChange}
                    />
                    {PRESET_BACKGROUNDS.map((preset) => (
                      <button
                        key={preset.name}
                        className={`option-btn ${settings.customBgImage === preset.url ? "active" : ""}`}
                        onClick={() => onUpdateSettings({ customBgImage: preset.url })}
                        title={`${preset.name} 배경`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <span className="row-label">용지 색상</span>
                  <div className="color-picker-row">
                    <input
                      type="color"
                      value={settings.customEditorBgColor}
                      onChange={(e) => onUpdateSettings({ customEditorBgColor: e.target.value })}
                      className="color-input-native"
                      title="용지 색상 직접 선택"
                    />
                    {[
                      { color: "#ffffff", text: "#22262c" },
                      { color: "#faf8f1", text: "#222222" },
                      { color: "#eef3f0", text: "#1e2923" },
                      { color: "#1e222a", text: "#f3f4f6" },
                      { color: "#111318", text: "#f8fafc" },
                    ].map((chip) => (
                      <button
                        key={chip.color}
                        className={`dot-swatch-btn ${
                          settings.customEditorBgColor.toLowerCase() === chip.color ? "active" : ""
                        }`}
                        style={{ backgroundColor: chip.color }}
                        onClick={() =>
                          onUpdateSettings({
                            customEditorBgColor: chip.color,
                            customTextColor: chip.text,
                          })
                        }
                        title={`용지 색상: ${chip.color}`}
                      />
                    ))}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={2}
                      value={Math.round(settings.customEditorBgOpacity * 100)}
                      onChange={(e) =>
                        onUpdateSettings({ customEditorBgOpacity: Number(e.target.value) / 100 })
                      }
                      className="opacity-range-slider compact-slider"
                      title={`용지 투명도 ${Math.round(settings.customEditorBgOpacity * 100)}%`}
                    />
                    <span className="opacity-val">
                      {Math.round(settings.customEditorBgOpacity * 100)}%
                    </span>
                  </div>
                </div>

                <div className="settings-row">
                  <span className="row-label">글자 색상</span>
                  <div className="color-picker-row">
                    <input
                      type="color"
                      value={settings.customTextColor}
                      onChange={(e) => onUpdateSettings({ customTextColor: e.target.value })}
                      className="color-input-native"
                      title="글자 색상 직접 선택"
                    />
                    <button
                      className={`option-btn ${settings.customTextColor === "#22262c" ? "active" : ""}`}
                      onClick={() => onUpdateSettings({ customTextColor: "#22262c" })}
                      title="어두운 글자색"
                    >
                      어둡게
                    </button>
                    <button
                      className={`option-btn ${settings.customTextColor === "#f3f4f6" ? "active" : ""}`}
                      onClick={() => onUpdateSettings({ customTextColor: "#f3f4f6" })}
                      title="밝은 글자색"
                    >
                      밝게
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 타자기 & 차임벨 */}
          <div className="settings-section">
            <div className="settings-row">
              <span className="row-label">타자기 모드</span>
              <div className="btn-group">
                <button
                  className={`option-btn ${!settings.typewriterMode ? "active" : ""}`}
                  onClick={() => onUpdateSettings({ typewriterMode: false })}
                  title="타자기 모드 끄기"
                >
                  꺼짐
                </button>
                <button
                  className={`option-btn ${
                    settings.typewriterMode && settings.typewriterStyle === "horizontal" ? "active" : ""
                  }`}
                  onClick={() =>
                    onUpdateSettings({ typewriterMode: true, typewriterStyle: "horizontal" })
                  }
                  title="타자기 모드 1 (중앙 고정)"
                >
                  1. 중앙 고정
                </button>
                <button
                  className={`option-btn ${
                    settings.typewriterMode && settings.typewriterStyle === "vertical" ? "active" : ""
                  }`}
                  onClick={() =>
                    onUpdateSettings({ typewriterMode: true, typewriterStyle: "vertical" })
                  }
                  title="타자기 모드 2 (60% 줄 고정)"
                >
                  2. 60% 줄 고정
                </button>
              </div>
            </div>

            <div className="settings-row">
              <span className="row-label">행 끝 차임벨</span>
              <div className="bell-control-group">
                <button
                  className="option-btn preview-bell-btn"
                  onClick={() => playCarriageReturnBell()}
                  title="차임벨 소리 미리듣기"
                >
                  <Bell size={12} />
                  <span>띵~</span>
                </button>
                <label className="switch" title="행 끝 차임벨 토글">
                  <input
                    type="checkbox"
                    checked={settings.typewriterBell}
                    onChange={(e) => onUpdateSettings({ typewriterBell: e.target.checked })}
                  />
                  <span className="slider" />
                </label>
              </div>
            </div>
          </div>

          {/* 타이핑 사운드 */}
          <div className="settings-section">
            <div className="compact-label">타이핑 소리</div>
            <div className="sound-chip-grid">
              {TYPING_SOUND_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  className={`sound-chip ${settings.typingSound === opt.id ? "selected" : ""}`}
                  onClick={() => {
                    onUpdateSettings({ typingSound: opt.id });
                    if (opt.id !== "off") {
                      playTypingSound(opt.id);
                    }
                  }}
                  title={`${opt.name} 소리`}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>

          {/* 글꼴 & 레이아웃 */}
          <div className="settings-section">
            <div className="settings-row">
              <span className="row-label">글꼴</span>
              <div className="btn-group">
                <button
                  className={`option-btn ${settings.fontFamily === "sans" ? "active" : ""}`}
                  onClick={() => onUpdateSettings({ fontFamily: "sans" })}
                  title="고딕 글꼴"
                >
                  고딕
                </button>
                <button
                  className={`option-btn ${settings.fontFamily === "serif" ? "active" : ""}`}
                  onClick={() => onUpdateSettings({ fontFamily: "serif" })}
                  title="명조 글꼴"
                >
                  명조
                </button>
                <button
                  className={`option-btn ${settings.fontFamily === "mono" ? "active" : ""}`}
                  onClick={() => onUpdateSettings({ fontFamily: "mono" })}
                  title="고정폭 글꼴"
                >
                  고정폭
                </button>
                <button
                  className={`option-btn ${settings.fontFamily === "typewriter" ? "active" : ""}`}
                  onClick={() => onUpdateSettings({ fontFamily: "typewriter" })}
                  title="타자기 글꼴 (Special Elite & Courier Prime)"
                >
                  타자기
                </button>
              </div>
            </div>

            <div className="settings-row">
              <span className="row-label">크기 · 간격</span>
              <div className="color-picker-row">
                <div className="btn-group">
                  {[14, 16, 18, 20].map((sz) => (
                    <button
                      key={sz}
                      className={`option-btn ${settings.fontSize === sz ? "active" : ""}`}
                      onClick={() => onUpdateSettings({ fontSize: sz })}
                      title={`글자 크기 ${sz}px`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
                <div className="btn-group">
                  {[1.5, 1.7, 1.9].map((lh) => (
                    <button
                      key={lh}
                      className={`option-btn ${settings.lineHeight === lh ? "active" : ""}`}
                      onClick={() => onUpdateSettings({ lineHeight: lh })}
                      title={`줄 간격 ${lh}`}
                    >
                      {lh}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="settings-row">
              <span className="row-label">문서 너비</span>
              <div className="btn-group">
                {[
                  { id: "narrow", label: "좁게" },
                  { id: "default", label: "보통" },
                  { id: "wide", label: "넓게" },
                  { id: "full", label: "전체" },
                ].map((w) => (
                  <button
                    key={w.id}
                    className={`option-btn ${settings.contentWidth === w.id ? "active" : ""}`}
                    onClick={() =>
                      onUpdateSettings({ contentWidth: w.id as AppSettings["contentWidth"] })
                    }
                    title={`문서 너비: ${w.label}`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
