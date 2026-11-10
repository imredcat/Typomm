import React, { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { TypewriterStyle, TypingSoundProfile } from "../types";
import { TYPING_SOUND_OPTIONS, playTypingSound } from "../utils/soundEffects";
import {
  SquarePen,
  FileSearch,
  FolderOpen,
  FolderTree,
  Layers,
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
  ScrollText,
} from "lucide-react";

interface ToolbarProps {
  fileName: string;
  isDirty: boolean;
  isSourceMode: boolean;
  isOutlineOpen: boolean;
  isTabsOpen: boolean;
  isFolderOpen: boolean;
  isCheatsheetOpen: boolean;
  paperMode: boolean;
  typewriterMode: boolean;
  typewriterStyle: TypewriterStyle;
  typingSound: TypingSoundProfile;
  onNew: () => void;
  onOpen: () => void;
  onPickFolder: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onToggleSourceMode: () => void;
  onToggleOutline: () => void;
  onToggleTabs: () => void;
  onToggleFolder: () => void;
  onToggleCheatsheet: () => void;
  onTogglePaperMode: () => void;
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
  isTabsOpen,
  isFolderOpen,
  isCheatsheetOpen,
  paperMode,
  typewriterMode,
  typewriterStyle,
  typingSound,
  onNew,
  onOpen,
  onPickFolder,
  onSave,
  onSaveAs,
  onToggleSourceMode,
  onToggleOutline,
  onToggleTabs,
  onToggleFolder,
  onToggleCheatsheet,
  onTogglePaperMode,
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
    ? "타자기 모드 (꺼짐)"
    : typewriterStyle === "horizontal"
    ? "타자기 모드 1 (중앙 고정)"
    : typewriterStyle === "vertical"
    ? "타자기 모드 2 (60% 줄 고정)"
    : "타자기 모드 3 (집중 모드: 세로 50% 스포트라이트)";

  return (
    <div className="top-header-container">
      {/* 1층: macOS 창 제어 버튼(Traffic Lights) 및 문서 제목 영역 */}
      <header className="typora-toolbar omm-minimal-toolbar" onMouseDown={handleDragWindow}>
        <div className="traffic-light-spacer" onMouseDown={handleDragWindow} />
        <div
          className="document-title toolbar-title-left"
          onMouseDown={handleDragWindow}
          title="창 이동 (드래그)"
        >
          <span className="title-text">{fileName}</span>
          {isDirty && (
            <span className="dirty-badge" title="저장되지 않음">
              •
            </span>
          )}
        </div>
        <div className="toolbar-drag-area" onMouseDown={handleDragWindow} />
      </header>

      {/* 2층 (기존 탭바 영역): 좌측 레이아웃(폴더·문서탭·목차) 토글 및 상단 기능 버튼 영역 */}
      <div className="typora-actionbar" onMouseDown={handleDragWindow}>
        <div className="actionbar-left">
          {/* 좌측 레이아웃 패널 토글 그룹: 왼쪽부터 [폴더] -> [문서 탭] -> [목차] 순서와 일치 */}
          <button
            type="button"
            className={`toolbar-btn panel-toggle-btn ${isFolderOpen ? "active" : ""}`}
            onClick={onToggleFolder}
            title={isFolderOpen ? "폴더 영역 닫기" : "폴더 영역 열기"}
          >
            <FolderTree size={14} />
            <span>폴더</span>
          </button>

          <button
            type="button"
            className={`toolbar-btn panel-toggle-btn ${isTabsOpen ? "active" : ""}`}
            onClick={onToggleTabs}
            title={isTabsOpen ? "문서 탭 닫기" : "문서 탭 열기"}
          >
            <Layers size={14} />
            <span>문서 탭</span>
          </button>

          <button
            type="button"
            className={`toolbar-btn panel-toggle-btn ${isOutlineOpen ? "active" : ""}`}
            onClick={onToggleOutline}
            title={isOutlineOpen ? "문서내 목차 닫기" : "문서내 목차 열기"}
          >
            <ListTree size={14} />
            <span>목차</span>
          </button>

          <span className="toolbar-separator" />

          <button
            type="button"
            className="toolbar-btn icon-only"
            onClick={onNew}
            title="새 문서 (Cmd+N)"
          >
            <SquarePen size={15} />
          </button>

          <button
            type="button"
            className="toolbar-btn icon-only"
            onClick={onOpen}
            title="문서 열기 (Cmd+O)"
          >
            <FileSearch size={15} />
          </button>

          <button
            type="button"
            className="toolbar-btn icon-only"
            onClick={onPickFolder}
            title="폴더 열기"
          >
            <FolderOpen size={15} />
          </button>

          <button
            type="button"
            className={`toolbar-btn icon-only ${isDirty ? "dirty" : ""}`}
            onClick={(e) => {
              if (e.shiftKey) {
                onSaveAs();
              } else {
                onSave();
              }
            }}
            title="문서 저장 (Cmd+S)"
          >
            <Save size={15} />
          </button>

          <span className="toolbar-separator" />

          {/* 타자기 모드 (배경색 없이 아이콘으로 구분) */}
          <button
            type="button"
            className={`toolbar-btn icon-only no-bg-toggle ${
              typewriterMode ? "mode-active" : "mode-off"
            }`}
            onClick={onCycleTypewriter}
            title={typewriterTooltip}
          >
            {typewriterMode && typewriterStyle === "vertical" ? (
              <AlignCenterHorizontal size={15} />
            ) : typewriterMode && typewriterStyle === "focus" ? (
              <Eye size={15} />
            ) : (
              <Crosshair size={15} />
            )}
            {typewriterMode && (
              <span className="mini-mode-badge">
                {typewriterStyle === "horizontal"
                  ? "1"
                  : typewriterStyle === "vertical"
                  ? "2"
                  : "3"}
              </span>
            )}
          </button>

          {/* 타이핑 소리 선택 */}
          <div className="export-dropdown-wrapper" ref={soundMenuRef}>
            <button
              type="button"
              className={`toolbar-btn icon-only no-bg-toggle ${
                typingSound !== "off" ? "sound-active" : "sound-off"
              }`}
              onClick={() => setIsSoundMenuOpen((prev) => !prev)}
              title="타이핑 소리"
            >
              {typingSound === "off" ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            {isSoundMenuOpen && (
              <div className="sound-menu-popup compact-sound-popup left-aligned-popup">
                <div className="sound-grid-container">
                  {TYPING_SOUND_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`sound-grid-item ${
                        typingSound === opt.id ? "selected" : ""
                      }`}
                      onClick={() => {
                        onSelectTypingSound(opt.id);
                        if (opt.id !== "off") {
                          playTypingSound(opt.id);
                        }
                      }}
                    >
                      <span>{opt.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 종이 영역 모드 (용지 카드 느낌 토글) */}
          <button
            type="button"
            className={`toolbar-btn icon-only no-bg-toggle ${paperMode ? "mode-active" : "mode-off"}`}
            onClick={onTogglePaperMode}
            title={paperMode ? "종이 영역 느낌 (켜짐)" : "종이 영역 느낌 (꺼짐)"}
          >
            <ScrollText size={15} />
          </button>

          {/* 창 가로 중앙 정렬 */}
          <button
            type="button"
            className="toolbar-btn icon-only"
            onClick={onCenterWindow}
            title="창 가로 중앙 정렬"
          >
            <AlignHorizontalSpaceAround size={15} />
          </button>

          <span className="toolbar-separator" />

          {/* 마크다운 문법 가이드 */}
          <button
            type="button"
            className={`toolbar-btn icon-only ${isCheatsheetOpen ? "active" : ""}`}
            onClick={onToggleCheatsheet}
            title="마크다운 문법 가이드"
          >
            <BookOpen size={15} />
          </button>

          {/* HTML 내보내기 */}
          <div className="export-dropdown-wrapper" ref={exportMenuRef}>
            <button
              type="button"
              className={`toolbar-btn icon-only ${isExportMenuOpen ? "active" : ""}`}
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              title="HTML 내보내기"
            >
              <FileCode size={15} />
            </button>

            {isExportMenuOpen && (
              <div className="export-menu-popup left-aligned-popup">
                <button
                  type="button"
                  className="export-menu-item"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onExportHtmlFile();
                  }}
                >
                  <Download size={14} />
                  <div className="export-item-text">
                    <span className="export-item-title">HTML 문서로 저장...</span>
                    <span className="export-item-desc">단독 .html 문서로 내보냅니다.</span>
                  </div>
                </button>

                <button
                  type="button"
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

          {/* 소스 코드 모드 토글 */}
          <button
            type="button"
            className={`toolbar-btn icon-only ${isSourceMode ? "active" : ""}`}
            onClick={onToggleSourceMode}
            title={isSourceMode ? "위지윅 편집 모드 (Cmd+/)" : "소스 코드 모드 (Cmd+/)"}
          >
            {isSourceMode ? <Eye size={15} /> : <Code2 size={15} />}
          </button>

          {/* 환경설정 */}
          <button
            type="button"
            className="toolbar-btn icon-only"
            onClick={onOpenSettings}
            title="환경설정 (Cmd+,)"
          >
            <Settings size={15} />
          </button>
        </div>

        <div className="toolbar-drag-area" onMouseDown={handleDragWindow} />
      </div>
    </div>
  );
};
