import React, { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Editor, EditorHandle } from "./components/Editor";
import { Toolbar } from "./components/Toolbar";
import { Outline } from "./components/Outline";
import { StatusBar } from "./components/StatusBar";
import { SettingsModal } from "./components/SettingsModal";
import { FileInfo, OutlineItem, AppSettings, DEFAULT_SETTINGS, TyporaTheme } from "./types";
import "./App.css";

const SETTINGS_STORAGE_KEY = "typomm_settings";

const DEFAULT_MARKDOWN = `# Typomm

Typora의 고유한 **실시간 인라인 위지윅(Live Preview)**과 미니멀한 타이포그래피를 그대로 경험해 보세요.
상단 툴바의 테마 메뉴나 **환경설정(\`Cmd + ,\`)**에서 Typora 공식 테마(GitHub, Night, Newsprint, Gothic)와 글꼴을 자유롭게 변경할 수 있습니다.

## ✨ 타이포라의 감성을 담은 주요 기능
- **실시간 인라인 위지윅**: 별도 분할창 없이 작성 즉시 서식이 렌더링됩니다.
- **Typora 오리지널 테마**:
  - **GitHub**: 화이트 & 클린 기본 테마
  - **Night**: 눈이 편안한 에메랄드 다크 테마
  - **Newsprint**: 따뜻한 크림 페이퍼 & 세리프 북 스타일
  - **Gothic**: 고대비 흑백 모던 에디토리얼 테마
- **환경설정 지원 (\`Cmd + ,\`)**: 글꼴 계열(Sans/Serif/Mono), 폰트 크기, 행간, 본문 최대 폭(720px~100%) 커스텀
- **소스 코드 모드 (\`Cmd + /\`)**: 원본 마크다운 텍스트와 실시간 위지윅 모드를 자유롭게 왕복

---

### 1. 할 일 목록 (Task List)
- [x] Rust + Tauri v2 초경량 데스크톱 엔진 구축
- [x] Typora 공식 테마 (GitHub, Night, Newsprint, Gothic) 탑재
- [x] 환경설정 모달 및 단축키(\`Cmd + ,\`) 지원
- [ ] 사용자 커스텀 CSS 테마 추가 지원

### 2. 코드 블록
\`\`\`rust
fn main() {
    println!("Typomm: Fast, beautiful, and light.");
}
\`\`\`

### 3. 표 (Table)
| 테마 명 | 스타일 특징 | 추천 용도 |
| :--- | :--- | :--- |
| **GitHub** | 미니멀 화이트, 회색 구분선 | 일상적인 기술 문서, README |
| **Night** | 딥 차콜, 네온 에메랄드 악센트 | 야간 집중 작업, 다크 모드 |
| **Newsprint**| 웜 크림 페이퍼, 세리프 폰트 | 장문 에세이, 독서 및 글쓰기 |
| **Gothic** | 굵고 선명한 흑백 대비 | 깔끔한 브리핑, 보고서 |

### 4. 인용구
> "A designer knows he has achieved perfection not when there is nothing more to add, but when there is nothing left to take away."
> — Antoine de Saint-Exupéry

상단의 **테마 드롭다운**을 눌러보거나 **환경설정 아이콘**을 클릭해 보세요!
`;

export default function App() {
  const [content, setContent] = useState<string>(DEFAULT_MARKDOWN);
  const [currentFile, setCurrentFile] = useState<{ path: string; name: string } | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSourceMode, setIsSourceMode] = useState<boolean>(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Settings State with LocalStorage Persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error("설정 로드 실패:", e);
    }
    return DEFAULT_SETTINGS;
  });

  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [stats, setStats] = useState<{ words: number; chars: number }>({ words: 0, chars: 0 });

  const editorRef = useRef<EditorHandle>(null);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("설정 저장 실패:", e);
      }
      return updated;
    });
  }, []);

  // File Operations
  const handleNew = useCallback(() => {
    if (isDirty) {
      const confirmDiscard = window.confirm("저장되지 않은 변경사항이 있습니다. 새 문서를 여시겠습니까?");
      if (!confirmDiscard) return;
    }
    const emptyContent = "# 제목 없음\n\n";
    setContent(emptyContent);
    setCurrentFile(null);
    setIsDirty(false);
    editorRef.current?.setMarkdown(emptyContent);
  }, [isDirty]);

  const handleOpen = useCallback(async () => {
    try {
      const res = await invoke<FileInfo | null>("open_file_dialog");
      if (res) {
        setCurrentFile({ path: res.path, name: res.name });
        setContent(res.content);
        setIsDirty(false);
        editorRef.current?.setMarkdown(res.content);
      }
    } catch (err) {
      console.error("파일 열기 실패:", err);
      alert(`파일 열기 실패: ${err}`);
    }
  }, []);

  const handleSave = useCallback(async () => {
    const currentMarkdown = isSourceMode ? content : editorRef.current?.getMarkdown() || content;
    try {
      if (currentFile) {
        await invoke("save_file", {
          path: currentFile.path,
          content: currentMarkdown,
        });
        setIsDirty(false);
      } else {
        const res = await invoke<FileInfo | null>("save_file_as_dialog", {
          defaultName: "Untitled.md",
          content: currentMarkdown,
        });
        if (res) {
          setCurrentFile({ path: res.path, name: res.name });
          setIsDirty(false);
        }
      }
    } catch (err) {
      console.error("파일 저장 실패:", err);
      alert(`파일 저장 실패: ${err}`);
    }
  }, [content, currentFile, isSourceMode]);

  const handleSaveAs = useCallback(async () => {
    const currentMarkdown = isSourceMode ? content : editorRef.current?.getMarkdown() || content;
    try {
      const res = await invoke<FileInfo | null>("save_file_as_dialog", {
        defaultName: currentFile ? currentFile.name : "Untitled.md",
        content: currentMarkdown,
      });
      if (res) {
        setCurrentFile({ path: res.path, name: res.name });
        setIsDirty(false);
      }
    } catch (err) {
      console.error("다른 이름으로 저장 실패:", err);
      alert(`다른 이름으로 저장 실패: ${err}`);
    }
  }, [content, currentFile, isSourceMode]);

  // Mode & UI Toggles
  const handleToggleSourceMode = useCallback(() => {
    if (!isSourceMode) {
      const md = editorRef.current?.getMarkdown() || content;
      setContent(md);
      setIsSourceMode(true);
    } else {
      setIsSourceMode(false);
      setTimeout(() => {
        editorRef.current?.setMarkdown(content);
      }, 0);
    }
  }, [content, isSourceMode]);

  const handleToggleOutline = () => {
    setIsOutlineOpen((prev) => !prev);
  };

  const handleThemeSelect = (theme: TyporaTheme) => {
    updateSettings({ theme });
  };

  // Keyboard Shortcuts (Cmd/Ctrl + S, O, N, /, ,)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (e.shiftKey) {
          handleSaveAs();
        } else {
          handleSave();
        }
      } else if (isMeta && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handleOpen();
      } else if (isMeta && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNew();
      } else if (isMeta && e.key === "/") {
        e.preventDefault();
        handleToggleSourceMode();
      } else if (isMeta && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleSaveAs, handleOpen, handleNew, handleToggleSourceMode]);

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setIsDirty(true);

    const chars = newContent.length;
    const words = newContent.trim() ? newContent.trim().split(/\s+/).length : 0;
    setStats({ words, chars });

    const lines = newContent.split("\n");
    const items: OutlineItem[] = [];
    let pos = 0;
    lines.forEach((line) => {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        items.push({
          id: `heading-source-${pos}`,
          level: match[1].length,
          text: match[2],
          pos,
        });
      }
      pos += line.length + 1;
    });
    setOutline(items);
  };

  return (
    <div
      className={`app-root theme-${settings.theme} font-${settings.fontFamily}`}
      style={
        {
          "--editor-font-size": `${settings.fontSize}px`,
          "--editor-line-height": settings.lineHeight,
        } as React.CSSProperties
      }
    >
      <Toolbar
        fileName={currentFile ? currentFile.name : "Untitled.md"}
        isDirty={isDirty}
        isSourceMode={isSourceMode}
        isOutlineOpen={isOutlineOpen}
        currentTheme={settings.theme}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onToggleSourceMode={handleToggleSourceMode}
        onToggleOutline={handleToggleOutline}
        onThemeSelect={handleThemeSelect}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div className="main-layout">
        {isOutlineOpen && (
          <Outline
            outline={outline}
            onSelect={(pos) => {
              if (isSourceMode) {
                const textarea = document.querySelector<HTMLTextAreaElement>(".source-textarea");
                if (textarea) {
                  textarea.focus();
                  textarea.setSelectionRange(pos, pos);
                }
              } else {
                editorRef.current?.scrollToHeading(pos);
              }
            }}
            onClose={() => setIsOutlineOpen(false)}
          />
        )}

        <main className={`editor-viewport width-${settings.contentWidth}`}>
          {isSourceMode ? (
            <div className="source-mode-container">
              <textarea
                className="source-textarea"
                style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}
                value={content}
                onChange={handleSourceChange}
                placeholder="마크다운 원본 내용을 입력하세요..."
                autoFocus
              />
            </div>
          ) : (
            <div
              className="editor-wrapper"
              style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}
            >
              <Editor
                ref={editorRef}
                initialContent={content}
                onChange={(md) => {
                  setContent(md);
                  setIsDirty(true);
                }}
                onOutlineUpdate={setOutline}
                onStatsUpdate={setStats}
              />
            </div>
          )}
        </main>
      </div>

      <StatusBar
        words={stats.words}
        chars={stats.chars}
        isDirty={isDirty}
        isSourceMode={isSourceMode}
        filePath={currentFile ? currentFile.path : null}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onUpdateSettings={updateSettings}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
