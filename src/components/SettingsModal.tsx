import React, { useEffect } from "react";
import { AppSettings, TyporaTheme } from "../types";
import { X, Palette, Type, Layout, Sliders } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose,
}) => {
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
    { id: "github", name: "GitHub", desc: "Typora 기본 화이트 & 클린 스타일", previewBg: "#ffffff", previewText: "#333333" },
    { id: "night", name: "Night", desc: "Typora 공식 다크 테마 & 민트 포인트", previewBg: "#363b40", previewText: "#f8f8f8" },
    { id: "newsprint", name: "Newsprint", desc: "따뜻한 크림 페이퍼 & 세리프 북 스타일", previewBg: "#faf8f1", previewText: "#222222" },
    { id: "gothic", name: "Gothic", desc: "고대비 흑백 모던 에디토리얼 스타일", previewBg: "#fbfbfb", previewText: "#111111" },
  ];

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
                    style={{ backgroundColor: t.previewBg, color: t.previewText }}
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

          {/* Section: Layout & Editor */}
          <div className="settings-section">
            <div className="section-label">
              <Layout size={15} />
              <span>에디터 레이아웃 (Editor Layout)</span>
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
                    onClick={() => onUpdateSettings({ contentWidth: w.id as AppSettings["contentWidth"] })}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <span className="row-label">타자기 모드 (커서 중앙 유지)</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.typewriterMode}
                  onChange={(e) => onUpdateSettings({ typewriterMode: e.target.checked })}
                />
                <span className="slider" />
              </label>
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
