import React, { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { TypewriterStyle, TypingSoundProfile } from "../types";
import { TYPING_SOUND_OPTIONS, playTypingSound } from "../utils/soundEffects";
import {
  FilePlus,
  FolderOpen,
  Save,
  Code2,
  ListTree,
  Settings,
  Eye,
  BookOpen,
  FileCode,
  Download,
  Copy,
  AlignHorizontalSpaceAround,
  Volume2,
  VolumeX,
  Crosshair,
  AlignCenterHorizontal,
} from "lucide-react";

interface ToolbarProps {
  fileName: string;
  isDirty: boolean;
  isSourceMode: boolean;
  isOutlineOpen: boolean;
  isCheatsheetOpen: boolean;
  typewriterMode: boolean;
  typewriterStyle: TypewriterStyle;
  typingSound: TypingSoundProfile;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onToggleSourceMode: () => void;
  onToggleOutline: () => void;
  onToggleCheatsheet: () => void;
  onCycleTypewriter: () => void;
  onSelectTypingSound: (sound: TypingSoundProfile) => void;
  onCenterWindow: () => void;
  onOpenSettings: () => void;
  onExportHtmlFile: () => void;
  onCopyHtmlCode: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  fileName,
  isDirty,
  isSourceMode,
  isOutlineOpen,
  isCheatsheetOpen,
  typewriterMode,
  typewriterStyle,
  typingSound,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onToggleSourceMode,
  onToggleOutline,
  onToggleCheatsheet,
  onCycleTypewriter,
  onSelectTypingSound,
  onCenterWindow,
  onOpenSettings,
  onExportHtmlFile,
  onCopyHtmlCode,
}) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isSoundMenuOpen, setIsSoundMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const soundMenuRef = useRef<HTMLDivElement>(null);

  // Native window dragging via Rust command + Tauri window API fallback
  const handleDragWindow = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, select, input, a, .export-dropdown-wrapper")) {
      return;
    }
    e.preventDefault();
    invoke("start_window_drag").catch(() => {
      getCurrentWindow().startDragging().catch(() => {});
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (soundMenuRef.current && !soundMenuRef.current.contains(e.target as Node)) {
        setIsSoundMenuOpen(false);
      }
    };
    if (isExportMenuOpen || isSoundMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExportMenuOpen, isSoundMenuOpen]);

  const typewriterTooltip = !typewriterMode
    ? "타자기 모드 끄기 상태 (클릭: 모드 1 켜기 / F9)"
    : typewriterStyle === "horizontal"
    ? "타자기 모드 1: 커서 정중앙 & 문장 이동 (클릭: 모드 2 상단 60% 줄 고정으로 전환)"
    : "타자기 모드 2: 상단 60% 줄 고정 & 차임벨 (클릭: 타자기 모드 끄기)";

  return (
    <header className="typora-toolbar omm-minimal-toolbar" onMouseDown={handleDragWindow}>
      {/* macOS Traffic Lights Spacer */}
      <div className="traffic-light-spacer" onMouseDown={handleDragWindow} />

      <div className="toolbar-actions left" onMouseDown={handleDragWindow}>
        <button
          className={`toolbar-btn icon-only ${isOutlineOpen ? "active" : ""}`}
          onClick={onToggleOutline}
          title="목차 (Outline)"
        >
          <ListTree size={15} />
        </button>

        <button className="toolbar-btn icon-only" onClick={onNew} title="새 문서 (Cmd+N)">
          <FilePlus size={15} />
        </button>

        <button className="toolbar-btn icon-only" onClick={onOpen} title="파일 열기 (Cmd+O)">
          <FolderOpen size={15} />
        </button>

        <button
          className={`toolbar-btn icon-only ${isDirty ? "dirty" : ""}`}
          onClick={(e) => {
            if (e.shiftKey) {
              onSaveAs();
            } else {
              onSave();
            }
          }}
          title="저장 (Cmd+S / Shift+클릭: 다른 이름으로 저장)"
        >
          <Save size={15} />
        </button>
      </div>

      <div className="document-title" onMouseDown={handleDragWindow} title="드래그하여 창 이동">
        <span className="title-text">{fileName}</span>
        {isDirty && <span className="dirty-badge" title="저장되지 않은 변경사항">•</span>}
      </div>

      <div className="toolbar-actions right" onMouseDown={handleDragWindow}>
        {/* Typewriter Mode Quick Cycle (Off -> Mode 1 -> Mode 2) */}
        <button
          className={`toolbar-btn icon-only ${typewriterMode ? "active" : ""}`}
          onClick={onCycleTypewriter}
          title={typewriterTooltip}
        >
          {typewriterMode && typewriterStyle === "vertical" ? (
            <AlignCenterHorizontal size={15} />
          ) : (
            <Crosshair size={15} />
          )}
          {typewriterMode && (
            <span className="mini-mode-badge">{typewriterStyle === "horizontal" ? "1" : "2"}</span>
          )}
        </button>

        {/* Typing Sound Selector Dropdown */}
        <div className="export-dropdown-wrapper" ref={soundMenuRef}>
          <button
            className={`toolbar-btn icon-only ${typingSound !== "off" ? "active" : ""}`}
            onClick={() => setIsSoundMenuOpen((prev) => !prev)}
            title="타이핑 사운드 선택 (무음 + 10종 타자 소리)"
          >
            {typingSound === "off" ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {isSoundMenuOpen && (
            <div className="export-menu-popup sound-menu-popup">
              <div className="popup-section-title">타이핑 사운드 (Typing Sound)</div>
              <div className="sound-menu-list">
                {TYPING_SOUND_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    className={`export-menu-item sound-item ${typingSound === opt.id ? "selected" : ""}`}
                    onClick={() => {
                      onSelectTypingSound(opt.id);
                      if (opt.id !== "off") {
                        playTypingSound(opt.id);
                      }
                    }}
                  >
                    <div className="export-item-text">
                      <span className="export-item-title">{opt.name}</span>
                      <span className="export-item-desc">{opt.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Window Horizontal Center (margin: 0px auto on Monitor) */}
        <button
          className="toolbar-btn icon-only"
          onClick={onCenterWindow}
          title="창을 모니터 가로 중앙으로 정렬 (margin: 0px auto)"
        >
          <AlignHorizontalSpaceAround size={15} />
        </button>

        <span className="toolbar-separator" />

        {/* Markdown Cheatsheet (Icon only) */}
        <button
          className={`toolbar-btn icon-only ${isCheatsheetOpen ? "active" : ""}`}
          onClick={onToggleCheatsheet}
          title="마크다운 문법 가이드"
        >
          <BookOpen size={15} />
        </button>

        {/* HTML Export (Icon only) */}
        <div className="export-dropdown-wrapper" ref={exportMenuRef}>
          <button
            className={`toolbar-btn icon-only ${isExportMenuOpen ? "active" : ""}`}
            onClick={() => setIsExportMenuOpen((prev) => !prev)}
            title="HTML 변환 및 내보내기"
          >
            <FileCode size={15} />
          </button>

          {isExportMenuOpen && (
            <div className="export-menu-popup">
              <button
                className="export-menu-item"
                onClick={() => {
                  setIsExportMenuOpen(false);
                  onExportHtmlFile();
                }}
              >
                <Download size={14} />
                <div className="export-item-text">
                  <span className="export-item-title">HTML 파일로 저장...</span>
                  <span className="export-item-desc">단독 .html 파일로 내보냅니다.</span>
                </div>
              </button>

              <button
                className="export-menu-item"
                onClick={() => {
                  setIsExportMenuOpen(false);
                  onCopyHtmlCode();
                }}
              >
                <Copy size={14} />
                <div className="export-item-text">
                  <span className="export-item-title">HTML 코드 복사</span>
                  <span className="export-item-desc">클립보드에 HTML 코드를 복사합니다.</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Source Code Mode Toggle (Icon only) */}
        <button
          className={`toolbar-btn icon-only ${isSourceMode ? "active" : ""}`}
          onClick={onToggleSourceMode}
          title={isSourceMode ? "위지윅 모드로 전환 (Cmd+/)" : "마크다운 소스 코드 모드 (Cmd+/)"}
        >
          {isSourceMode ? <Eye size={15} /> : <Code2 size={15} />}
        </button>

        {/* Preferences / Settings (Theme, Custom Background, Typewriter, Sound) */}
        <button
          className="toolbar-btn icon-only"
          onClick={onOpenSettings}
          title="환경설정 및 테마/배경 설정 (Cmd+,)"
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};
