import React, { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Editor, EditorHandle } from "./components/Editor";
import { Toolbar } from "./components/Toolbar";
import { TabBar } from "./components/TabBar";
import { Outline } from "./components/Outline";
import { StatusBar } from "./components/StatusBar";
import { SettingsModal } from "./components/SettingsModal";
import { Cheatsheet } from "./components/Cheatsheet";
import { generateStandaloneHtml } from "./utils/htmlExporter";
import { FileInfo, OutlineItem, AppSettings, DEFAULT_SETTINGS, TyporaTheme, TabItem } from "./types";
import "./App.css";

const SETTINGS_STORAGE_KEY = "typomm_settings";

const INITIAL_MARKDOWN = `# Typomm ✍️

Typora의 고유한 **실시간 인라인 위지윅(Live Preview)**과 **다중 탭(Multi-tabs)** 기능을 경험해 보세요.

## ✨ 새롭게 추가된 탭 기능
- **다중 문서 탭 지원**: 상단 \`+\` 버튼이나 \`Cmd + T\` / \`Cmd + N\` 단축키로 새 문서 탭을 추가할 수 있습니다.
- **탭별 독립 상태 유지**: 각 탭마다 작성 내용, 저장 경로, 수정 여부(\`•\`)가 개별적으로 관리됩니다.
- **간편한 탭 닫기 (\`Cmd + W\`)**: 탭의 \`X\` 버튼을 누르거나 단축키를 눌러 현재 탭을 닫을 수 있습니다.
- **기존 문서 열기 (\`Cmd + O\`)**: 파일을 열면 새 탭으로 열리며, 이미 열려 있는 파일은 해당 탭으로 즉시 전환됩니다.

---

### 1. 할 일 목록 (Task List)
- [x] 다중 탭 시스템(Tab Bar) 구축 완료
- [x] 탭 닫기/전환/새 탭 단축키(\`Cmd + T\`, \`Cmd + W\`, \`Cmd + N\`) 연동
- [x] 빈티지 타자기 키캡 아이콘 적용 완료

### 2. 코드 블록
\`\`\`rust
fn main() {
    println!("Typomm with Multi-tab support!");
}
\`\`\`

상단 탭 바의 **\`+\` 버튼**을 누르거나 새 파일을 열어 여러 문서를 동시에 편집해 보세요!
`;

export default function App() {
  // Tabs State
  const [tabs, setTabs] = useState<TabItem[]>([
    {
      id: "tab-1",
      path: null,
      name: "Typomm 환영 문서",
      content: INITIAL_MARKDOWN,
      isDirty: false,
      isSourceMode: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("tab-1");

  const [isOutlineOpen, setIsOutlineOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState<boolean>(false);

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

  // Active tab helper
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

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

  // Sync editor content whenever active tab changes
  useEffect(() => {
    if (activeTab && editorRef.current) {
      editorRef.current.setMarkdown(activeTab.content);
    }
  }, [activeTabId]);

  // Tab Operations
  const handleNewTab = useCallback(() => {
    // Save current active tab content from editor first
    const currentMarkdown = editorRef.current?.getMarkdown();
    const newTabId = `tab-${Date.now()}`;
    const newTabName = `제목 없음 ${tabs.length + 1}`;
    const newTabContent = "# 제목 없음\n\n";

    setTabs((prev) => {
      const updated = prev.map((t) =>
        t.id === activeTabId && currentMarkdown !== undefined ? { ...t, content: currentMarkdown } : t
      );
      return [
        ...updated,
        {
          id: newTabId,
          path: null,
          name: newTabName,
          content: newTabContent,
          isDirty: false,
          isSourceMode: false,
        },
      ];
    });

    setActiveTabId(newTabId);
    setTimeout(() => {
      editorRef.current?.setMarkdown(newTabContent);
      editorRef.current?.focus();
    }, 10);
  }, [activeTabId, tabs.length]);

  const handleSelectTab = useCallback(
    (targetId: string) => {
      if (targetId === activeTabId) return;

      // Persist current editor text to active tab
      const currentMarkdown = editorRef.current?.getMarkdown() || activeTab.content;
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, content: currentMarkdown } : t))
      );

      const targetTab = tabs.find((t) => t.id === targetId);
      setActiveTabId(targetId);

      if (targetTab && editorRef.current) {
        editorRef.current.setMarkdown(targetTab.content);
      }
    },
    [activeTabId, activeTab, tabs]
  );

  const handleCloseTab = useCallback(
    (targetId: string, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }

      const targetTab = tabs.find((t) => t.id === targetId);
      if (!targetTab) return;

      if (targetTab.isDirty) {
        const confirmClose = window.confirm(
          `"${targetTab.name}"에 저장되지 않은 변경사항이 있습니다. 닫으시겠습니까?`
        );
        if (!confirmClose) return;
      }

      // If only one tab left, reset it to empty
      if (tabs.length === 1) {
        const emptyTab: TabItem = {
          id: `tab-${Date.now()}`,
          path: null,
          name: "제목 없음",
          content: "# 제목 없음\n\n",
          isDirty: false,
          isSourceMode: false,
        };
        setTabs([emptyTab]);
        setActiveTabId(emptyTab.id);
        editorRef.current?.setMarkdown(emptyTab.content);
        return;
      }

      const closingIndex = tabs.findIndex((t) => t.id === targetId);
      const remainingTabs = tabs.filter((t) => t.id !== targetId);
      setTabs(remainingTabs);

      if (targetId === activeTabId) {
        // Switch to adjacent tab
        const nextIndex = Math.min(closingIndex, remainingTabs.length - 1);
        const nextTab = remainingTabs[nextIndex];
        setActiveTabId(nextTab.id);
        setTimeout(() => {
          editorRef.current?.setMarkdown(nextTab.content);
        }, 10);
      }
    },
    [tabs, activeTabId]
  );

  // File Open (Opens in existing tab if already open, or creates a new tab)
  const handleOpen = useCallback(async () => {
    try {
      const res = await invoke<FileInfo | null>("open_file_dialog");
      if (res) {
        // Check if file is already open in a tab
        const existingTab = tabs.find((t) => t.path === res.path);
        if (existingTab) {
          handleSelectTab(existingTab.id);
          return;
        }

        // If current active tab is empty and unsaved, reuse it
        if (!activeTab.path && !activeTab.isDirty && (activeTab.content.trim() === "" || activeTab.content === "# 제목 없음\n\n")) {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === activeTab.id
                ? { ...t, path: res.path, name: res.name, content: res.content, isDirty: false }
                : t
            )
          );
          editorRef.current?.setMarkdown(res.content);
          return;
        }

        // Otherwise open in a new tab
        const newTabId = `tab-${Date.now()}`;
        const newTab: TabItem = {
          id: newTabId,
          path: res.path,
          name: res.name,
          content: res.content,
          isDirty: false,
          isSourceMode: false,
        };

        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTabId);
        setTimeout(() => {
          editorRef.current?.setMarkdown(res.content);
        }, 10);
      }
    } catch (err) {
      console.error("파일 열기 실패:", err);
      alert(`파일 열기 실패: ${err}`);
    }
  }, [tabs, activeTab, handleSelectTab]);

  // File Save
  const handleSave = useCallback(async () => {
    const currentMarkdown = activeTab.isSourceMode
      ? activeTab.content
      : editorRef.current?.getMarkdown() || activeTab.content;

    try {
      if (activeTab.path) {
        await invoke("save_file", {
          path: activeTab.path,
          content: currentMarkdown,
        });
        setTabs((prev) =>
          prev.map((t) => (t.id === activeTab.id ? { ...t, content: currentMarkdown, isDirty: false } : t))
        );
      } else {
        const res = await invoke<FileInfo | null>("save_file_as_dialog", {
          defaultName: activeTab.name.endsWith(".md") ? activeTab.name : `${activeTab.name}.md`,
          content: currentMarkdown,
        });
        if (res) {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === activeTab.id
                ? { ...t, path: res.path, name: res.name, content: currentMarkdown, isDirty: false }
                : t
            )
          );
        }
      }
    } catch (err) {
      console.error("파일 저장 실패:", err);
      alert(`파일 저장 실패: ${err}`);
    }
  }, [activeTab]);

  const handleSaveAs = useCallback(async () => {
    const currentMarkdown = activeTab.isSourceMode
      ? activeTab.content
      : editorRef.current?.getMarkdown() || activeTab.content;

    try {
      const res = await invoke<FileInfo | null>("save_file_as_dialog", {
        defaultName: activeTab.name.endsWith(".md") ? activeTab.name : `${activeTab.name}.md`,
        content: currentMarkdown,
      });
      if (res) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id
              ? { ...t, path: res.path, name: res.name, content: currentMarkdown, isDirty: false }
              : t
          )
        );
      }
    } catch (err) {
      console.error("다른 이름으로 저장 실패:", err);
      alert(`다른 이름으로 저장 실패: ${err}`);
    }
  }, [activeTab]);

  // Mode & UI Toggles
  const handleToggleSourceMode = useCallback(() => {
    const md = editorRef.current?.getMarkdown() || activeTab.content;
    const newSourceMode = !activeTab.isSourceMode;

    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab.id ? { ...t, content: md, isSourceMode: newSourceMode } : t))
    );

    if (!newSourceMode) {
      setTimeout(() => {
        editorRef.current?.setMarkdown(md);
      }, 0);
    }
  }, [activeTab]);

  const handleToggleOutline = () => {
    setIsOutlineOpen((prev) => !prev);
  };

  const handleThemeSelect = (theme: TyporaTheme) => {
    updateSettings({ theme });
  };

  // HTML Export Dialog
  const handleExportHtmlFile = useCallback(async () => {
    let bodyHtml = "";
    if (editorRef.current) {
      if (activeTab.isSourceMode) {
        editorRef.current.setMarkdown(activeTab.content);
      }
      bodyHtml = editorRef.current.getHTML();
    }

    const title = activeTab.name.replace(/\.md$/i, "");
    const fullHtml = generateStandaloneHtml(title, bodyHtml, settings.theme);
    const defaultName = `${title}.html`;

    try {
      const res = await invoke<string | null>("export_html_dialog", {
        defaultName,
        content: fullHtml,
      });
      if (res) {
        console.log("HTML 저장 완료:", res);
      }
    } catch (err) {
      console.error("HTML 내보내기 실패:", err);
      alert(`HTML 내보내기 실패: ${err}`);
    }
  }, [activeTab, settings.theme]);

  // HTML Code Copy to Clipboard
  const handleCopyHtmlCode = useCallback(async () => {
    let bodyHtml = "";
    if (editorRef.current) {
      if (activeTab.isSourceMode) {
        editorRef.current.setMarkdown(activeTab.content);
      }
      bodyHtml = editorRef.current.getHTML();
    }

    try {
      await navigator.clipboard.writeText(bodyHtml);
      alert("본문 HTML 코드가 클립보드에 복사되었습니다!");
    } catch (err) {
      console.error("HTML 복사 실패:", err);
      alert(`HTML 복사 실패: ${err}`);
    }
  }, [activeTab]);

  // Cheatsheet Insert Handler
  const handleInsertSyntax = useCallback(
    (syntax: string) => {
      if (activeTab.isSourceMode) {
        const textarea = document.querySelector<HTMLTextAreaElement>(".source-textarea");
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const oldText = textarea.value;
          const newText =
            oldText.substring(0, start) +
            (start > 0 && !oldText.endsWith("\n", start) ? "\n" : "") +
            syntax +
            "\n" +
            oldText.substring(end);

          setTabs((prev) =>
            prev.map((t) => (t.id === activeTab.id ? { ...t, content: newText, isDirty: true } : t))
          );
          setTimeout(() => {
            textarea.focus();
            const newPos = start + syntax.length + 1;
            textarea.setSelectionRange(newPos, newPos);
          }, 10);
        } else {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === activeTab.id
                ? { ...t, content: t.content + "\n" + syntax, isDirty: true }
                : t
            )
          );
        }
      } else {
        editorRef.current?.insertText("\n" + syntax + "\n");
        editorRef.current?.focus();
      }
    },
    [activeTab]
  );

  // Keyboard Shortcuts (Cmd/Ctrl + S, O, N, T, W, /, ,)
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
      } else if (isMeta && (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "t")) {
        e.preventDefault();
        handleNewTab();
      } else if (isMeta && e.key.toLowerCase() === "w") {
        e.preventDefault();
        handleCloseTab(activeTabId);
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
  }, [handleSave, handleSaveAs, handleOpen, handleNewTab, handleCloseTab, activeTabId, handleToggleSourceMode]);

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab.id ? { ...t, content: newContent, isDirty: true } : t))
    );

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
        fileName={activeTab.name}
        isDirty={activeTab.isDirty}
        isSourceMode={activeTab.isSourceMode}
        isOutlineOpen={isOutlineOpen}
        isCheatsheetOpen={isCheatsheetOpen}
        currentTheme={settings.theme}
        onNew={handleNewTab}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onToggleSourceMode={handleToggleSourceMode}
        onToggleOutline={handleToggleOutline}
        onToggleCheatsheet={() => setIsCheatsheetOpen((prev) => !prev)}
        onThemeSelect={handleThemeSelect}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportHtmlFile={handleExportHtmlFile}
        onCopyHtmlCode={handleCopyHtmlCode}
      />

      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onNewTab={handleNewTab}
      />

      <div className="main-layout">
        {isOutlineOpen && (
          <Outline
            outline={outline}
            onSelect={(pos) => {
              if (activeTab.isSourceMode) {
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
          {activeTab.isSourceMode && (
            <div className="source-mode-container">
              <textarea
                className="source-textarea"
                style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}
                value={activeTab.content}
                onChange={handleSourceChange}
                placeholder="마크다운 원본 내용을 입력하세요..."
                autoFocus
              />
            </div>
          )}
          <div
            className="editor-wrapper"
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
              display: activeTab.isSourceMode ? "none" : "block",
            }}
          >
            <Editor
              ref={editorRef}
              initialContent={activeTab.content}
              onChange={(md) => {
                setTabs((prev) =>
                  prev.map((t) => (t.id === activeTab.id ? { ...t, content: md, isDirty: true } : t))
                );
              }}
              onOutlineUpdate={setOutline}
              onStatsUpdate={setStats}
            />
          </div>
        </main>

        {isCheatsheetOpen && (
          <Cheatsheet
            onInsert={handleInsertSyntax}
            onClose={() => setIsCheatsheetOpen(false)}
          />
        )}
      </div>

      <StatusBar
        words={stats.words}
        chars={stats.chars}
        isDirty={activeTab.isDirty}
        isSourceMode={activeTab.isSourceMode}
        filePath={activeTab.path}
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
