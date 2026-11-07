import React from "react";
import { TyporaTheme } from "../types";
import {
  FilePlus,
  FolderOpen,
  Save,
  Code2,
  ListTree,
  Settings,
  Eye,
  Palette,
} from "lucide-react";

interface ToolbarProps {
  fileName: string;
  isDirty: boolean;
  isSourceMode: boolean;
  isOutlineOpen: boolean;
  currentTheme: TyporaTheme;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onToggleSourceMode: () => void;
  onToggleOutline: () => void;
  onThemeSelect: (theme: TyporaTheme) => void;
  onOpenSettings: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  fileName,
  isDirty,
  isSourceMode,
  isOutlineOpen,
  currentTheme,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onToggleSourceMode,
  onToggleOutline,
  onThemeSelect,
  onOpenSettings,
}) => {
  return (
    <header className="typora-toolbar" data-tauri-drag-region>
      {/* macOS Traffic Lights Spacer */}
      <div className="traffic-light-spacer" data-tauri-drag-region />

      <div className="toolbar-actions left">
        <button
          className={`toolbar-btn ${isOutlineOpen ? "active" : ""}`}
          onClick={onToggleOutline}
          title="목차 사이드바 (Outline)"
        >
          <ListTree size={15} />
        </button>

        <span className="toolbar-separator" />

        <button className="toolbar-btn" onClick={onNew} title="새 문서 (Cmd+N)">
          <FilePlus size={15} />
        </button>
        <button className="toolbar-btn" onClick={onOpen} title="파일 열기 (Cmd+O)">
          <FolderOpen size={15} />
        </button>
        <button
          className={`toolbar-btn ${isDirty ? "dirty" : ""}`}
          onClick={onSave}
          title="저장 (Cmd+S)"
        >
          <Save size={15} />
        </button>
        <button className="toolbar-btn subtle" onClick={onSaveAs} title="다른 이름으로 저장 (Cmd+Shift+S)">
          <span>저장...</span>
        </button>
      </div>

      <div className="document-title" data-tauri-drag-region>
        <span className="title-text">{fileName}</span>
        {isDirty && <span className="dirty-badge" title="저장되지 않은 변경사항">•</span>}
      </div>

      <div className="toolbar-actions right">
        {/* Quick Theme Selector */}
        <div className="theme-selector-dropdown">
          <Palette size={14} className="dropdown-icon" />
          <select
            value={currentTheme}
            onChange={(e) => onThemeSelect(e.target.value as TyporaTheme)}
            className="theme-select"
            title="테마 변경"
          >
            <option value="github">GitHub</option>
            <option value="night">Night</option>
            <option value="newsprint">Newsprint</option>
            <option value="gothic">Gothic</option>
          </select>
        </div>

        {/* Source Code Mode Button - Typora Iconic </> Toggle */}
        <button
          className={`toolbar-btn source-toggle-btn ${isSourceMode ? "active" : ""}`}
          onClick={onToggleSourceMode}
          title={isSourceMode ? "실시간 렌더링 모드로 전환 (Cmd+/)" : "마크다운 소스 코드 모드 (Cmd+/)"}
        >
          {isSourceMode ? <Eye size={15} /> : <Code2 size={15} />}
          <span>{isSourceMode ? "위지윅" : "</>"}</span>
        </button>

        <button
          className="toolbar-btn"
          onClick={onOpenSettings}
          title="환경설정 (Cmd+,)"
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};
