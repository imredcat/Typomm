import React, { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Editor, EditorHandle } from "./components/Editor";
import { Toolbar } from "./components/Toolbar";
import { TabBar } from "./components/TabBar";
import { Outline } from "./components/Outline";
import { StatusBar } from "./components/StatusBar";
import { SettingsModal } from "./components/SettingsModal";
import { Cheatsheet } from "./components/Cheatsheet";
import { generateStandaloneHtml } from "./utils/htmlExporter";
import { playTypingSound, playCarriageReturnBell } from "./utils/soundEffects";
import { FileInfo, OutlineItem, AppSettings, DEFAULT_SETTINGS, TabItem } from "./types";
import "./App.css";

const SETTINGS_STORAGE_KEY = "typomm_settings";

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "").trim();
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) {
    return `rgba(255, 255, 255, ${alpha})`;
  }
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const INITIAL_MARKDOWN = `# Typomm ✍️

Typora의 **실시간 인라인 위지윅(Live Preview)**과 OmmWriter의 **몰입형 감성**을 결합한 마크다운 에디터입니다.

## ✨ 주요 기능 안내
- **2가지 타자기 모드 (\`F9\`)**:
  - **1번 (정중앙 고정)**: 커서가 화면 정중앙(50%)에 고정되고 문장이 상하좌우로 움직입니다.
  - **2번 (상단 60% 줄 고정)**: 문장은 좌우로 움직이지 않고 커서만 이동하며, 작성 중인 줄이 상단 60% 위치에 고정됩니다. 행의 마지막에 도달하면 **'띵~' 차임벨** 소리가 울립니다.
- **무음 + 10가지 타이핑 사운드**: 상단 스피커 아이콘 또는 환경설정(\`Cmd + ,\`)에서 클래식 타자기, 전동 타자기, 청축/갈축/적축, 조약돌 도각도각, 무접점, Omm 물방울 등 10가지 타건음을 선택할 수 있습니다.
- **커스텀 배경 이미지 & 반투명 작성 영역**: 환경설정에서 **Custom 테마**를 선택하여 원하는 배경 이미지와 글 작성 영역의 투명 배경색을 자유롭게 지정해 보세요.
- **창 자유 이동 & 모니터 중앙 정렬**: 상단 바를 마우스로 드래그해 창을 원하는 위치로 이동하고, 상단 **가로 중앙 정렬 아이콘**을 눌러 언제든 모니터 중앙(\`margin: 0 auto\`)으로 정렬할 수 있습니다.
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
  const sourceTransformRef = useRef<{ tx: number; ty: number }>({ tx: 0, ty: 0 });
  const sourceGlidingRef = useRef<boolean>(false);
  const sourceGlideTimerRef = useRef<number | null>(null);
  const sourceComposingRef = useRef<boolean>(false);
  const sourceLastCompletedPosRef = useRef<number>(-1);
  const sourceLastLenRef = useRef<number>(0);
  const sourceLastBellLineRef = useRef<number>(-1);

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

  // Cycle Typewriter Mode: Off -> Mode 1 ("horizontal") -> Mode 2 ("vertical") -> Off
  const handleCycleTypewriter = useCallback(() => {
    if (!settings.typewriterMode) {
      updateSettings({ typewriterMode: true, typewriterStyle: "horizontal" });
    } else if (settings.typewriterStyle === "horizontal") {
      updateSettings({ typewriterMode: true, typewriterStyle: "vertical" });
    } else {
      updateSettings({ typewriterMode: false });
    }
  }, [settings.typewriterMode, settings.typewriterStyle, updateSettings]);

  // Center Window Horizontally on Monitor (margin: 0px auto)
  const handleCenterWindow = useCallback(() => {
    invoke("center_window_horizontally").catch(() => {
      getCurrentWindow().center().catch(() => {});
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

  const handleOpen = useCallback(async () => {
    try {
      const res = await invoke<FileInfo | null>("open_file_dialog");
      if (res) {
        const existingTab = tabs.find((t) => t.path === res.path);
        if (existingTab) {
          handleSelectTab(existingTab.id);
          return;
        }

        if (
          !activeTab.path &&
          !activeTab.isDirty &&
          (activeTab.content.trim() === "" || activeTab.content === "# 제목 없음\n\n")
        ) {
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

  const handleExportHtmlFile = useCallback(async () => {
    let bodyHtml = "";
    if (editorRef.current) {
      if (activeTab.isSourceMode) {
        editorRef.current.setMarkdown(activeTab.content);
      }
      bodyHtml = editorRef.current.getHTML();
    }

    const title = activeTab.name.replace(/\.md$/i, "");
    const exportTheme = settings.theme === "custom" ? "github" : settings.theme;
    const fullHtml = generateStandaloneHtml(title, bodyHtml, exportTheme);
    const defaultName = `${title}.html`;

    try {
      await invoke<string | null>("export_html_dialog", {
        defaultName,
        content: fullHtml,
      });
    } catch (err) {
      console.error("HTML 내보내기 실패:", err);
      alert(`HTML 내보내기 실패: ${err}`);
    }
  }, [activeTab, settings.theme]);

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
            scheduleSourceTypewriterScroll();
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

  // Source Code Mode Typewriter Centering (Mode 1 & Mode 2 + Bell)
  const scheduleSourceTypewriterScroll = useCallback((forceGlide = false) => {
    if (!settings.typewriterMode) return;
    requestAnimationFrame(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>(".source-textarea");
      const container = document.querySelector<HTMLElement>(".source-mode-container");
      const viewport = document.querySelector<HTMLElement>(".editor-viewport");
      if (!textarea || !container || !viewport) return;

      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(textarea.scrollHeight, 400)}px`;

      const selectionEnd = textarea.selectionEnd;
      const fullText = textarea.value;
      const prevLen = sourceLastLenRef.current;
      const charBefore = selectionEnd > 0 ? fullText.slice(selectionEnd - 1, selectionEnd) : "";
      const isComposingKorean =
        sourceComposingRef.current && /[ㄱ-ㅎㅏ-ㅣ가-힣\u1100-\u11FF\u3130-\u318F]/.test(charBefore);

      const completedPos =
        settings.typewriterStyle === "horizontal" && isComposingKorean
          ? Math.max(0, selectionEnd - 1)
          : selectionEnd;

      if (
        settings.typewriterStyle === "horizontal" &&
        !forceGlide &&
        isComposingKorean &&
        completedPos === sourceLastCompletedPosRef.current
      ) {
        sourceLastLenRef.current = fullText.length;
        return;
      }

      const textBefore = fullText.substring(0, completedPos);
      const lines = textBefore.split("\n");
      const lineIndex = lines.length - 1;
      const currentLineText = lines[lineIndex];

      const computed = window.getComputedStyle(textarea);
      const lineHeight = parseFloat(computed.lineHeight) || settings.fontSize * settings.lineHeight;
      const paddingLeft = parseFloat(computed.paddingLeft) || 32;
      const paddingTop = parseFloat(computed.paddingTop) || 40;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      let textWidth = 0;
      if (ctx) {
        ctx.font = `${computed.fontSize} ${computed.fontFamily}`;
        textWidth = ctx.measureText(currentLineText).width;
      }

      const viewportRect = viewport.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const caretXInContainer = paddingLeft + textWidth;
      const caretYInContainer = paddingTop + lineIndex * lineHeight + lineHeight / 2;

      if (!forceGlide && settings.typewriterBell && fullText.length >= prevLen && prevLen > 0) {
        const rightLimit = containerRect.width - paddingLeft * 2 - 24;
        if (textWidth >= rightLimit && sourceLastBellLineRef.current !== lineIndex) {
          sourceLastBellLineRef.current = lineIndex;
          playCarriageReturnBell();
        }
      }

      const lastTx = sourceTransformRef.current.tx;
      const lastTy = sourceTransformRef.current.ty;

      let targetTx: number;
      let targetTy: number;

      if (settings.typewriterStyle === "vertical") {
        targetTx = Math.round(Math.max(0, (viewportRect.width - containerRect.width) / 2));
        targetTy = Math.round(viewportRect.height * 0.6 - caretYInContainer);
      } else {
        const targetCenterX = viewportRect.width / 2;
        const targetCenterY = viewportRect.height / 2;
        targetTx = Math.round(targetCenterX - caretXInContainer);
        targetTy = Math.round(targetCenterY - caretYInContainer);

        const isForwardTyping =
          !forceGlide &&
          fullText.length >= prevLen &&
          sourceLastCompletedPosRef.current >= 0 &&
          completedPos >= sourceLastCompletedPosRef.current;
        const isSameLine = Math.abs(targetTy - lastTy) < 10;

        if (isForwardTyping && isSameLine && targetTx > lastTx && (lastTx !== 0 || lastTy !== 0)) {
          targetTx = lastTx;
        }
      }

      sourceLastCompletedPosRef.current = completedPos;
      sourceLastLenRef.current = fullText.length;

      const deltaX = Math.abs(targetTx - lastTx);
      const deltaY = Math.abs(targetTy - lastTy);

      const isLineWrapOrJump =
        forceGlide || deltaX > 60 || deltaY > 40 || (settings.typewriterStyle === "vertical" && deltaY > 10);

      if (isLineWrapOrJump) {
        container.style.transition = "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)";
        sourceGlidingRef.current = true;
        if (sourceGlideTimerRef.current !== null) {
          clearTimeout(sourceGlideTimerRef.current);
        }
        sourceGlideTimerRef.current = window.setTimeout(() => {
          if (container) {
            container.style.transition = "none";
          }
          sourceGlidingRef.current = false;
        }, 230);
      } else if (!sourceGlidingRef.current) {
        container.style.transition = "none";
      }

      sourceTransformRef.current = { tx: targetTx, ty: targetTy };
      container.style.transform = `translate3d(${targetTx}px, ${targetTy}px, 0)`;
    });
  }, [
    settings.typewriterMode,
    settings.typewriterStyle,
    settings.typewriterBell,
    settings.fontSize,
    settings.lineHeight,
  ]);

  useEffect(() => {
    if (activeTab.isSourceMode) {
      if (settings.typewriterMode) {
        scheduleSourceTypewriterScroll(true);
      } else {
        const container = document.querySelector<HTMLElement>(".source-mode-container");
        if (container) {
          container.style.transform = "";
          container.style.transition = "";
        }
        sourceTransformRef.current = { tx: 0, ty: 0 };
        sourceLastCompletedPosRef.current = -1;
        sourceGlidingRef.current = false;
        if (sourceGlideTimerRef.current !== null) {
          clearTimeout(sourceGlideTimerRef.current);
          sourceGlideTimerRef.current = null;
        }
      }
    } else if (settings.typewriterMode) {
      editorRef.current?.centerTypewriter();
    }
  }, [activeTab.isSourceMode, settings.typewriterMode, settings.typewriterStyle, scheduleSourceTypewriterScroll]);

  // Enable smooth mouse wheel browsing in source mode typewriter
  useEffect(() => {
    const viewport = document.querySelector<HTMLElement>(".editor-viewport");
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      if (!settings.typewriterMode || !activeTab.isSourceMode) return;
      const container = document.querySelector<HTMLElement>(".source-mode-container");
      if (!container) return;

      sourceTransformRef.current.ty -= e.deltaY;
      container.style.transition = "none";
      container.style.transform = `translate3d(${sourceTransformRef.current.tx}px, ${sourceTransformRef.current.ty}px, 0)`;
    };

    viewport.addEventListener("wheel", handleWheel, { passive: true });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [settings.typewriterMode, activeTab.isSourceMode]);

  // Recenter on window resize
  useEffect(() => {
    const handleResize = () => {
      if (settings.typewriterMode) {
        if (activeTab.isSourceMode) {
          scheduleSourceTypewriterScroll();
        } else {
          editorRef.current?.centerTypewriter();
        }
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [settings.typewriterMode, activeTab.isSourceMode, scheduleSourceTypewriterScroll]);

  // Keyboard Shortcuts
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
      } else if (isMeta && (e.key.toLowerCase() === "n" || (e.key.toLowerCase() === "t" && !e.altKey))) {
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
      } else if (e.key === "F9" || (isMeta && e.altKey && e.key.toLowerCase() === "t")) {
        e.preventDefault();
        handleCycleTypewriter();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleSave,
    handleSaveAs,
    handleOpen,
    handleNewTab,
    handleCloseTab,
    activeTabId,
    handleToggleSourceMode,
    handleCycleTypewriter,
  ]);

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

  const customEditorRgba = hexToRgba(settings.customEditorBgColor, settings.customEditorBgOpacity);

  return (
    <div
      className={`app-root theme-${settings.theme} font-${settings.fontFamily}`}
      style={
        {
          "--editor-font-size": `${settings.fontSize}px`,
          "--editor-line-height": settings.lineHeight,
          "--custom-editor-bg": customEditorRgba,
          "--custom-text-color": settings.customTextColor,
          backgroundImage:
            settings.theme === "custom" && settings.customBgImage
              ? `url("${settings.customBgImage}")`
              : undefined,
          backgroundSize: settings.theme === "custom" ? "cover" : undefined,
          backgroundPosition: settings.theme === "custom" ? "center" : undefined,
        } as React.CSSProperties
      }
    >
      <Toolbar
        fileName={activeTab.name}
        isDirty={activeTab.isDirty}
        isSourceMode={activeTab.isSourceMode}
        isOutlineOpen={isOutlineOpen}
        isCheatsheetOpen={isCheatsheetOpen}
        typewriterMode={settings.typewriterMode}
        typewriterStyle={settings.typewriterStyle}
        typingSound={settings.typingSound}
        onNew={handleNewTab}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onToggleSourceMode={handleToggleSourceMode}
        onToggleOutline={handleToggleOutline}
        onToggleCheatsheet={() => setIsCheatsheetOpen((prev) => !prev)}
        onCycleTypewriter={handleCycleTypewriter}
        onSelectTypingSound={(sound) => updateSettings({ typingSound: sound })}
        onCenterWindow={handleCenterWindow}
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

        <main
          className={`editor-viewport width-${settings.contentWidth} ${
            settings.typewriterMode ? `typewriter-mode typewriter-${settings.typewriterStyle}` : ""
          }`}
        >
          {activeTab.isSourceMode && (
            <div className="source-mode-container">
              <textarea
                className="source-textarea"
                style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}
                value={activeTab.content}
                onChange={(e) => {
                  handleSourceChange(e);
                  scheduleSourceTypewriterScroll();
                }}
                onKeyDown={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.altKey && settings.typingSound !== "off") {
                    playTypingSound(settings.typingSound, e.key);
                  }
                }}
                onSelect={() => scheduleSourceTypewriterScroll()}
                onKeyUp={() => scheduleSourceTypewriterScroll()}
                onClick={() => scheduleSourceTypewriterScroll()}
                onCompositionStart={() => {
                  sourceComposingRef.current = true;
                }}
                onCompositionUpdate={() => {
                  sourceComposingRef.current = true;
                }}
                onCompositionEnd={() => {
                  sourceComposingRef.current = false;
                  scheduleSourceTypewriterScroll();
                }}
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
              typewriterMode={settings.typewriterMode}
              typewriterStyle={settings.typewriterStyle}
              typewriterBell={settings.typewriterBell}
              typingSound={settings.typingSound}
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
        typewriterMode={settings.typewriterMode}
        typewriterStyle={settings.typewriterStyle}
        onToggleTypewriter={handleCycleTypewriter}
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
