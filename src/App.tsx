import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Editor, EditorHandle } from "./components/Editor";
import { Toolbar } from "./components/Toolbar";
import { TabBar } from "./components/TabBar";
import { Outline } from "./components/Outline";
import { FolderSidebar } from "./components/FolderSidebar";
import { StatusBar } from "./components/StatusBar";
import { SettingsModal } from "./components/SettingsModal";
import { Cheatsheet } from "./components/Cheatsheet";
import { generateStandaloneHtml } from "./utils/htmlExporter";
import { playTypingSound, playCarriageReturnBell } from "./utils/soundEffects";
import { applyFocusSpotlightMask } from "./utils/focusMask";
import { isHtmlFilename, sanitizeHtmlForPreview } from "./utils/htmlSanitizer";
import menuAppIcon from "./assets/menu-app-icon.png";
import {
  FileInfo,
  FolderTree,
  OutlineItem,
  AppSettings,
  DEFAULT_SETTINGS,
  TabItem,
  FavoriteItem,
  FavoritesState,
  SavedSession,
  PanelWidths,
} from "./types";
import "./App.css";

const SETTINGS_STORAGE_KEY = "typomm_settings";
const FAVORITES_STORAGE_KEY = "typomm_favorites";
const SESSION_STORAGE_KEY = "typomm_session";

type ResizablePanelKey = keyof PanelWidths;

const PANEL_MIN_WIDTHS: PanelWidths = {
  folder: 240,
  tabs: 230,
  outline: 220,
};

function loadInitialSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("설정 로드 실패:", e);
  }
  return DEFAULT_SETTINGS;
}

function loadSavedSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedSession;
    if (parsed && Array.isArray(parsed.tabs)) {
      return parsed;
    }
  } catch (e) {
    console.error("세션 로드 실패:", e);
  }
  return null;
}

function loadSavedFavorites(): FavoritesState {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FavoritesState;
      return {
        folders: Array.isArray(parsed.folders) ? parsed.folders : [],
        files: Array.isArray(parsed.files) ? parsed.files : [],
      };
    }
  } catch (e) {
    console.error("즐겨찾기 로드 실패:", e);
  }
  return { folders: [], files: [] };
}

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
  const initialBootRef = useRef<{
    settings: AppSettings;
    session: SavedSession | null;
  } | null>(null);
  if (!initialBootRef.current) {
    initialBootRef.current = {
      settings: loadInitialSettings(),
      session: loadSavedSession(),
    };
  }
  const bootSettings = initialBootRef.current.settings;
  const bootSession = initialBootRef.current.session;

  // Settings State with LocalStorage Persistence
  const [settings, setSettings] = useState<AppSettings>(bootSettings);

  // Tabs State (이전 작업 복원 또는 환영 문서 설정 반영)
  const [tabs, setTabs] = useState<TabItem[]>(() => {
    if (bootSession) {
      const restoredTabs = bootSettings.showWelcomeDoc
        ? bootSession.tabs
        : bootSession.tabs.filter(
            (t) =>
              !(
                t.id === "tab-1" &&
                t.path === null &&
                !t.isDirty &&
                t.name === "Typomm 환영 문서"
              )
          );
      return restoredTabs.map((t) => ({
        ...t,
        fileType: t.fileType || (isHtmlFilename(t.path || t.name) ? "html" : "markdown"),
      }));
    }
    if (bootSettings.showWelcomeDoc) {
      return [
        {
          id: "tab-1",
          path: null,
          name: "Typomm 환영 문서",
          content: INITIAL_MARKDOWN,
          isDirty: false,
          isSourceMode: false,
          fileType: "markdown",
        },
      ];
    }
    return [];
  });
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (bootSession) {
      return bootSession.activeTabId || "";
    }
    return bootSettings.showWelcomeDoc ? "tab-1" : "";
  });

  const [isOutlineOpen, setIsOutlineOpen] = useState<boolean>(
    bootSession ? Boolean(bootSession.isOutlineOpen) : false
  );
  const [isTabsOpen, setIsTabsOpen] = useState<boolean>(
    bootSession ? Boolean(bootSession.isTabsOpen) : true
  );
  const [isFolderOpen, setIsFolderOpen] = useState<boolean>(
    bootSession ? Boolean(bootSession.isFolderOpen) : false
  );
  const [panelWidths, setPanelWidths] = useState<PanelWidths>(() => ({
    folder: Math.max(
      PANEL_MIN_WIDTHS.folder,
      bootSession?.panelWidths?.folder ?? PANEL_MIN_WIDTHS.folder
    ),
    tabs: Math.max(
      PANEL_MIN_WIDTHS.tabs,
      bootSession?.panelWidths?.tabs ?? PANEL_MIN_WIDTHS.tabs
    ),
    outline: Math.max(
      PANEL_MIN_WIDTHS.outline,
      bootSession?.panelWidths?.outline ?? PANEL_MIN_WIDTHS.outline
    ),
  }));
  const [folderTree, setFolderTree] = useState<FolderTree | null>(null);
  const [favorites, setFavorites] = useState<FavoritesState>(loadSavedFavorites);
  const [isDragOverEditor, setIsDragOverEditor] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [pendingCloseTabId, setPendingCloseTabId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fsShowToolbar, setFsShowToolbar] = useState<boolean>(false);
  const [fsHoverLeftOverlay, setFsHoverLeftOverlay] = useState<boolean>(false);

  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [stats, setStats] = useState<{ words: number; chars: number }>({ words: 0, chars: 0 });

  const editorRef = useRef<EditorHandle>(null);
  const sourceTextareaRef = useRef<HTMLTextAreaElement>(null);
  const sourceTransformRef = useRef<{ tx: number; ty: number }>({ tx: 0, ty: 0 });
  const sourceGlidingRef = useRef<boolean>(false);
  const sourceGlideTimerRef = useRef<number | null>(null);
  const sourceComposingRef = useRef<boolean>(false);
  const sourceLastCompletedPosRef = useRef<number>(-1);
  const sourceLastLenRef = useRef<number>(0);
  const sourceLastBellLineRef = useRef<number>(-1);
  const fsToolbarPinnedRef = useRef<boolean>(false);
  const fsSidebarsPinnedRef = useRef<boolean>(false);
  const fsSidebarGraceUntilRef = useRef<number>(0);

  const activeTab: TabItem | null = tabs.find((t) => t.id === activeTabId) || tabs[0] || null;

  const isTabHtml = useCallback((tab: TabItem | null): boolean => {
    if (!tab) return false;
    return tab.fileType === "html" || isHtmlFilename(tab.path || tab.name);
  }, []);

  const isActiveTabHtml = isTabHtml(activeTab);
  const isActiveHtmlWebView = Boolean(activeTab && isActiveTabHtml && !activeTab.isSourceMode);

  const sanitizedHtmlPreview = useMemo(() => {
    if (!isActiveHtmlWebView || !activeTab) return "";
    return sanitizeHtmlForPreview(activeTab.content);
  }, [isActiveHtmlWebView, activeTab]);

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

  const updateFavorites = useCallback((updater: (prev: FavoritesState) => FavoritesState) => {
    setFavorites((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("즐겨찾기 저장 실패:", e);
      }
      return next;
    });
  }, []);

  // Session Persistence (앱 재실행 시 이전 폴더 및 작업 문서들 그대로 복원)
  const latestSessionRef = useRef<{
    tabs: TabItem[];
    activeTabId: string;
    folderPath: string | null;
    isFolderOpen: boolean;
    isTabsOpen: boolean;
    isOutlineOpen: boolean;
    panelWidths: PanelWidths;
  }>({
    tabs,
    activeTabId,
    folderPath: folderTree?.root_path ?? bootSession?.folderPath ?? null,
    isFolderOpen,
    isTabsOpen,
    isOutlineOpen,
    panelWidths,
  });

  latestSessionRef.current = {
    tabs,
    activeTabId,
    folderPath: folderTree?.root_path ?? null,
    isFolderOpen,
    isTabsOpen,
    isOutlineOpen,
    panelWidths,
  };

  const persistSessionNow = useCallback(() => {
    try {
      const snap = latestSessionRef.current;
      const currentActive = snap.tabs.find((t) => t.id === snap.activeTabId) || snap.tabs[0] || null;
      let syncedTabs = snap.tabs;

      if (currentActive && !currentActive.isSourceMode && !isTabHtml(currentActive) && editorRef.current) {
        const liveMd = editorRef.current.getMarkdown();
        syncedTabs = snap.tabs.map((t) =>
          t.id === currentActive.id ? { ...t, content: liveMd } : t
        );
      }

      const payload: SavedSession = {
        folderPath: snap.folderPath,
        tabs: syncedTabs,
        activeTabId: snap.activeTabId,
        isFolderOpen: snap.isFolderOpen,
        isTabsOpen: snap.isTabsOpen,
        isOutlineOpen: snap.isOutlineOpen,
        panelWidths: snap.panelWidths,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error("세션 저장 실패:", e);
    }
  }, [isTabHtml]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      persistSessionNow();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [tabs, activeTabId, folderTree, isFolderOpen, isTabsOpen, isOutlineOpen, panelWidths, persistSessionNow]);

  useEffect(() => {
    const onBeforeUnload = () => {
      persistSessionNow();
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    let unlistenClose: (() => void) | undefined;
    getCurrentWindow()
      .onCloseRequested(() => {
        persistSessionNow();
      })
      .then((fn) => {
        unlistenClose = fn;
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (unlistenClose) unlistenClose();
    };
  }, [persistSessionNow]);

  // Restore previous folder & clean file contents on startup
  useEffect(() => {
    const session = bootSession;
    if (!session) return;

    if (session.folderPath) {
      invoke<FolderTree>("read_folder_tree", { path: session.folderPath })
        .then((tree) => setFolderTree(tree))
        .catch(() => {});
    }

    const cleanSavedTabs = session.tabs.filter((t) => t.path && !t.isDirty);
    if (cleanSavedTabs.length > 0) {
      Promise.all(
        cleanSavedTabs.map(async (t) => {
          try {
            const info = await invoke<FileInfo>("read_file", { path: t.path! });
            return { id: t.id, content: info.content, name: info.name };
          } catch {
            return null;
          }
        })
      ).then((results) => {
        const updates = new Map<string, { content: string; name: string }>();
        for (const r of results) {
          if (r) updates.set(r.id, { content: r.content, name: r.name });
        }
        if (updates.size === 0) return;

        setTabs((prev) =>
          prev.map((t) => {
            const u = updates.get(t.id);
            if (!u || t.isDirty) return t;
            return { ...t, content: u.content, name: u.name };
          })
        );

        const activeUpd = updates.get(session.activeTabId);
        if (activeUpd) {
          const activeOrig = session.tabs.find((t) => t.id === session.activeTabId);
          if (activeOrig && !activeOrig.isSourceMode && !isTabHtml(activeOrig)) {
            setTimeout(() => {
              editorRef.current?.setMarkdown(activeUpd.content);
            }, 30);
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update stats/outline when viewing HTML WebView tab
  useEffect(() => {
    if (!isActiveHtmlWebView || !activeTab) return;
    const plain = activeTab.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const chars = plain.length;
    const words = plain ? plain.split(/\s+/).length : 0;
    setStats({ words, chars });
    setOutline([]);
  }, [isActiveHtmlWebView, activeTab]);

  // Cycle Typewriter Mode: Off -> Mode 1 ("horizontal") -> Mode 2 ("vertical") -> Mode 3 ("focus") -> Off
  const handleCycleTypewriter = useCallback(() => {
    if (!settings.typewriterMode) {
      updateSettings({ typewriterMode: true, typewriterStyle: "horizontal" });
    } else if (settings.typewriterStyle === "horizontal") {
      updateSettings({ typewriterMode: true, typewriterStyle: "vertical" });
    } else if (settings.typewriterStyle === "vertical") {
      updateSettings({ typewriterMode: true, typewriterStyle: "focus" });
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

  // Tab Operations
  const handleNewTab = useCallback(() => {
    const newTabId = `tab-${Date.now()}`;
    const newTabName = tabs.length === 0 ? "제목 없음" : `제목 없음 ${tabs.length + 1}`;
    const newTabContent = "# 제목 없음\n\n";

    if (!activeTab) {
      setTabs([
        {
          id: newTabId,
          path: null,
          name: newTabName,
          content: newTabContent,
          isDirty: false,
          isSourceMode: false,
          fileType: "markdown",
        },
      ]);
      setActiveTabId(newTabId);
      setTimeout(() => {
        editorRef.current?.setMarkdown(newTabContent);
        editorRef.current?.focus();
      }, 20);
      return;
    }

    const currentContent =
      activeTab.isSourceMode || isTabHtml(activeTab)
        ? activeTab.content
        : editorRef.current?.getMarkdown() ?? activeTab.content;

    setTabs((prev) => {
      const updated = prev.map((t) =>
        t.id === activeTabId ? { ...t, content: currentContent } : t
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
          fileType: "markdown",
        },
      ];
    });

    setActiveTabId(newTabId);
    setTimeout(() => {
      editorRef.current?.setMarkdown(newTabContent);
      editorRef.current?.focus();
    }, 10);
  }, [activeTabId, activeTab, tabs.length, isTabHtml]);

  const handleSelectTab = useCallback(
    (targetId: string) => {
      if (targetId === activeTabId) return;

      const currentContent = activeTab
        ? activeTab.isSourceMode || isTabHtml(activeTab)
          ? activeTab.content
          : editorRef.current?.getMarkdown() ?? activeTab.content
        : "";

      const targetTab = tabs.find((t) => t.id === targetId);
      if (!targetTab) return;

      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, content: currentContent } : t))
      );

      setActiveTabId(targetId);

      if (!targetTab.isSourceMode && !isTabHtml(targetTab)) {
        setTimeout(() => {
          editorRef.current?.setMarkdown(targetTab.content);
          editorRef.current?.focus();
        }, 10);
      }
    },
    [activeTabId, activeTab, tabs, isTabHtml]
  );

  const performCloseTab = useCallback(
    (targetId: string) => {
      const closingIndex = tabs.findIndex((t) => t.id === targetId);
      const remainingTabs = tabs.filter((t) => t.id !== targetId);
      setTabs(remainingTabs);

      if (remainingTabs.length === 0) {
        setActiveTabId("");
        setOutline([]);
        setStats({ words: 0, chars: 0 });
        return;
      }

      if (targetId === activeTabId) {
        const nextIndex = Math.min(closingIndex, remainingTabs.length - 1);
        const nextTab = remainingTabs[nextIndex];
        setActiveTabId(nextTab.id);
        if (!nextTab.isSourceMode && !isTabHtml(nextTab)) {
          setTimeout(() => {
            editorRef.current?.setMarkdown(nextTab.content);
          }, 10);
        }
      }
    },
    [tabs, activeTabId, isTabHtml]
  );

  const handleCloseTab = useCallback(
    (targetId: string, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }

      const targetTab = tabs.find((t) => t.id === targetId);
      if (!targetTab) return;

      if (targetTab.isDirty) {
        setPendingCloseTabId(targetId);
        return;
      }

      performCloseTab(targetId);
    },
    [tabs, performCloseTab]
  );

  const handleConfirmSaveAndClose = useCallback(async () => {
    if (!pendingCloseTabId) return;
    const targetTab = tabs.find((t) => t.id === pendingCloseTabId);
    if (!targetTab) {
      setPendingCloseTabId(null);
      return;
    }

    const contentToSave =
      targetTab.id === activeTabId && !targetTab.isSourceMode && !isTabHtml(targetTab)
        ? editorRef.current?.getMarkdown() ?? targetTab.content
        : targetTab.content;

    try {
      if (targetTab.path) {
        await invoke("save_file", {
          path: targetTab.path,
          content: contentToSave,
        });
        setPendingCloseTabId(null);
        performCloseTab(targetTab.id);
      } else {
        const res = await invoke<FileInfo | null>("save_file_as_dialog", {
          defaultName: targetTab.name.endsWith(".md") ? targetTab.name : `${targetTab.name}.md`,
          defaultDir: folderTree?.root_path ?? null,
          content: contentToSave,
        });
        if (res) {
          setPendingCloseTabId(null);
          performCloseTab(targetTab.id);
          if (folderTree?.root_path) {
            invoke<FolderTree>("read_folder_tree", { path: folderTree.root_path })
              .then(setFolderTree)
              .catch(() => {});
          }
        } else {
          // 저장 대화상자에서 취소한 경우 편집 화면으로 복귀
          setPendingCloseTabId(null);
        }
      }
    } catch (err) {
      console.error("문서 저장 실패:", err);
      alert(`문서 저장 실패: ${err}`);
    }
  }, [pendingCloseTabId, tabs, activeTabId, performCloseTab, isTabHtml, folderTree?.root_path]);

  const handleConfirmDiscardAndClose = useCallback(() => {
    if (!pendingCloseTabId) return;
    const targetId = pendingCloseTabId;
    setPendingCloseTabId(null);
    performCloseTab(targetId);
  }, [pendingCloseTabId, performCloseTab]);

  const handleCancelCloseTab = useCallback(() => {
    setPendingCloseTabId(null);
    setTimeout(() => {
      if (activeTab && !activeTab.isSourceMode && !isTabHtml(activeTab)) {
        editorRef.current?.focus();
      }
    }, 10);
  }, [activeTab, isTabHtml]);

  const handleOpen = useCallback(async () => {
    try {
      const res = await invoke<FileInfo | null>("open_file_dialog");
      if (res) {
        const existingTab = tabs.find((t) => t.path === res.path);
        if (existingTab) {
          handleSelectTab(existingTab.id);
          return;
        }

        const openedIsHtml = isHtmlFilename(res.path || res.name);

        if (
          activeTab &&
          !activeTab.path &&
          !activeTab.isDirty &&
          (activeTab.content.trim() === "" || activeTab.content === "# 제목 없음\n\n")
        ) {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === activeTab.id
                ? {
                    ...t,
                    path: res.path,
                    name: res.name,
                    content: res.content,
                    isDirty: false,
                    isSourceMode: false,
                    fileType: openedIsHtml ? "html" : "markdown",
                  }
                : t
            )
          );
          if (!openedIsHtml) {
            setTimeout(() => {
              editorRef.current?.setMarkdown(res.content);
            }, 20);
          }
          return;
        }

        const currentContent = activeTab
          ? activeTab.isSourceMode || isTabHtml(activeTab)
            ? activeTab.content
            : editorRef.current?.getMarkdown() ?? activeTab.content
          : "";

        const newTabId = `tab-${Date.now()}`;
        const newTab: TabItem = {
          id: newTabId,
          path: res.path,
          name: res.name,
          content: res.content,
          isDirty: false,
          isSourceMode: false,
          fileType: openedIsHtml ? "html" : "markdown",
        };

        setTabs((prev) => [
          ...prev.map((t) => (t.id === activeTabId ? { ...t, content: currentContent } : t)),
          newTab,
        ]);
        setActiveTabId(newTabId);
        if (!openedIsHtml) {
          setTimeout(() => {
            editorRef.current?.setMarkdown(res.content);
          }, 20);
        }
      }
    } catch (err) {
      console.error("문서 열기 실패:", err);
      alert(`문서 열기 실패: ${err}`);
    }
  }, [tabs, activeTab, activeTabId, handleSelectTab, isTabHtml]);

  const handleSave = useCallback(async () => {
    if (!activeTab) return;
    const currentContent =
      activeTab.isSourceMode || isTabHtml(activeTab)
        ? activeTab.content
        : editorRef.current?.getMarkdown() || activeTab.content;

    try {
      if (activeTab.path) {
        await invoke("save_file", {
          path: activeTab.path,
          content: currentContent,
        });
        setTabs((prev) =>
          prev.map((t) => (t.id === activeTab.id ? { ...t, content: currentContent, isDirty: false } : t))
        );
      } else {
        const res = await invoke<FileInfo | null>("save_file_as_dialog", {
          defaultName: activeTab.name.endsWith(".md") ? activeTab.name : `${activeTab.name}.md`,
          defaultDir: folderTree?.root_path ?? null,
          content: currentContent,
        });
        if (res) {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === activeTab.id
                ? {
                    ...t,
                    path: res.path,
                    name: res.name,
                    content: currentContent,
                    isDirty: false,
                    fileType: isHtmlFilename(res.path || res.name) ? "html" : "markdown",
                  }
                : t
            )
          );
          if (folderTree?.root_path) {
            invoke<FolderTree>("read_folder_tree", { path: folderTree.root_path })
              .then(setFolderTree)
              .catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error("문서 저장 실패:", err);
      alert(`문서 저장 실패: ${err}`);
    }
  }, [activeTab, isTabHtml, folderTree?.root_path]);

  const handleSaveAs = useCallback(async () => {
    if (!activeTab) return;
    const currentContent =
      activeTab.isSourceMode || isTabHtml(activeTab)
        ? activeTab.content
        : editorRef.current?.getMarkdown() || activeTab.content;

    try {
      const res = await invoke<FileInfo | null>("save_file_as_dialog", {
        defaultName:
          activeTab.name.endsWith(".md") || isHtmlFilename(activeTab.name)
            ? activeTab.name
            : `${activeTab.name}.md`,
        defaultDir: folderTree?.root_path ?? null,
        content: currentContent,
      });
      if (res) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id
              ? {
                  ...t,
                  path: res.path,
                  name: res.name,
                  content: currentContent,
                  isDirty: false,
                  fileType: isHtmlFilename(res.path || res.name) ? "html" : "markdown",
                }
              : t
          )
        );
        if (folderTree?.root_path) {
          invoke<FolderTree>("read_folder_tree", { path: folderTree.root_path })
            .then(setFolderTree)
            .catch(() => {});
        }
      }
    } catch (err) {
      console.error("다른 이름으로 저장 실패:", err);
      alert(`다른 이름으로 저장 실패: ${err}`);
    }
  }, [activeTab, isTabHtml, folderTree?.root_path]);

  const handleToggleSourceMode = useCallback(() => {
    if (!activeTab) return;
    const htmlTab = isTabHtml(activeTab);
    const content = htmlTab
      ? activeTab.content
      : activeTab.isSourceMode
      ? activeTab.content
      : editorRef.current?.getMarkdown() || activeTab.content;
    const newSourceMode = !activeTab.isSourceMode;

    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTab.id ? { ...t, content, isSourceMode: newSourceMode } : t
      )
    );

    if (!newSourceMode && !htmlTab) {
      setTimeout(() => {
        editorRef.current?.setMarkdown(content);
      }, 10);
    }
  }, [activeTab, isTabHtml]);

  const handleToggleOutline = () => {
    setIsOutlineOpen((prev) => !prev);
  };

  const handleToggleTabs = () => {
    setIsTabsOpen((prev) => !prev);
  };

  const handleToggleFolder = () => {
    setIsFolderOpen((prev) => !prev);
  };

  const handlePickFolder = useCallback(async () => {
    try {
      const res = await invoke<FolderTree | null>("open_folder_dialog");
      if (res) {
        setFolderTree(res);
        setIsFolderOpen(true);
      }
    } catch (err) {
      console.error("폴더 열기 실패:", err);
      alert(`폴더 열기 실패: ${err}`);
    }
  }, []);

  const handleOpenFolderByPath = useCallback(async (folderPath: string) => {
    try {
      const res = await invoke<FolderTree>("read_folder_tree", {
        path: folderPath,
      });
      setFolderTree(res);
      setIsFolderOpen(true);
    } catch (err) {
      console.error("즐겨찾기 폴더 열기 실패:", err);
      alert(`폴더를 열 수 없습니다: ${err}`);
    }
  }, []);

  const handleToggleFavoriteFolder = useCallback(
    (item: FavoriteItem) => {
      updateFavorites((prev) => {
        const exists = prev.folders.some((f) => f.path === item.path);
        return {
          ...prev,
          folders: exists
            ? prev.folders.filter((f) => f.path !== item.path)
            : [item, ...prev.folders],
        };
      });
    },
    [updateFavorites]
  );

  const handleRemoveFavoriteFolder = useCallback(
    (path: string) => {
      updateFavorites((prev) => ({
        ...prev,
        folders: prev.folders.filter((f) => f.path !== path),
      }));
    },
    [updateFavorites]
  );

  const handleToggleFavoriteTab = useCallback(
    async (tab: TabItem) => {
      if (!tab.path) {
        // 저장되지 않은 새 문서는 먼저 저장 후 즐겨찾기에 등록
        const contentToSave =
          tab.id === activeTabId && !tab.isSourceMode && !isTabHtml(tab)
            ? editorRef.current?.getMarkdown() ?? tab.content
            : tab.content;
        try {
          const res = await invoke<FileInfo | null>("save_file_as_dialog", {
            defaultName: tab.name.endsWith(".md") ? tab.name : `${tab.name}.md`,
            defaultDir: folderTree?.root_path ?? null,
            content: contentToSave,
          });
          if (!res) return;
          setTabs((prev) =>
            prev.map((t) =>
              t.id === tab.id
                ? {
                    ...t,
                    path: res.path,
                    name: res.name,
                    content: contentToSave,
                    isDirty: false,
                    fileType: isHtmlFilename(res.path || res.name) ? "html" : "markdown",
                  }
                : t
            )
          );
          updateFavorites((prev) => {
            if (prev.files.some((f) => f.path === res.path)) return prev;
            return {
              ...prev,
              files: [{ name: res.name, path: res.path }, ...prev.files],
            };
          });
          if (folderTree?.root_path) {
            invoke<FolderTree>("read_folder_tree", { path: folderTree.root_path })
              .then(setFolderTree)
              .catch(() => {});
          }
        } catch (err) {
          console.error("문서 저장 실패:", err);
        }
        return;
      }

      const targetPath = tab.path;
      const targetName = tab.name;
      updateFavorites((prev) => {
        const exists = prev.files.some((f) => f.path === targetPath);
        return {
          ...prev,
          files: exists
            ? prev.files.filter((f) => f.path !== targetPath)
            : [{ name: targetName, path: targetPath }, ...prev.files],
        };
      });
    },
    [activeTabId, isTabHtml, updateFavorites, folderTree?.root_path]
  );

  const handleRemoveFavoriteFile = useCallback(
    (path: string) => {
      updateFavorites((prev) => ({
        ...prev,
        files: prev.files.filter((f) => f.path !== path),
      }));
    },
    [updateFavorites]
  );

  const handleRefreshFolder = useCallback(async () => {
    if (!folderTree) return;
    try {
      const res = await invoke<FolderTree>("read_folder_tree", {
        path: folderTree.root_path,
      });
      setFolderTree(res);
    } catch (err) {
      console.error("폴더 새로고침 실패:", err);
    }
  }, [folderTree]);

  const handleOpenFileByPath = useCallback(
    async (filePath: string) => {
      try {
        const existingTab = tabs.find((t) => t.path === filePath);
        if (existingTab) {
          handleSelectTab(existingTab.id);
          return;
        }

        const res = await invoke<FileInfo>("read_file", { path: filePath });
        const openedIsHtml = isHtmlFilename(res.path || res.name);

        if (
          activeTab &&
          !activeTab.path &&
          !activeTab.isDirty &&
          (activeTab.content.trim() === "" || activeTab.content === "# 제목 없음\n\n")
        ) {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === activeTab.id
                ? {
                    ...t,
                    path: res.path,
                    name: res.name,
                    content: res.content,
                    isDirty: false,
                    isSourceMode: false,
                    fileType: openedIsHtml ? "html" : "markdown",
                  }
                : t
            )
          );
          if (!openedIsHtml) {
            setTimeout(() => {
              editorRef.current?.setMarkdown(res.content);
            }, 20);
          }
          return;
        }

        const currentContent = activeTab
          ? activeTab.isSourceMode || isTabHtml(activeTab)
            ? activeTab.content
            : editorRef.current?.getMarkdown() ?? activeTab.content
          : "";

        const newTabId = `tab-${Date.now()}`;
        const newTab: TabItem = {
          id: newTabId,
          path: res.path,
          name: res.name,
          content: res.content,
          isDirty: false,
          isSourceMode: false,
          fileType: openedIsHtml ? "html" : "markdown",
        };

        setTabs((prev) => [
          ...prev.map((t) => (t.id === activeTabId ? { ...t, content: currentContent } : t)),
          newTab,
        ]);
        setActiveTabId(newTabId);
        if (!openedIsHtml) {
          setTimeout(() => {
            editorRef.current?.setMarkdown(res.content);
          }, 20);
        }
      } catch (err) {
        console.error("파일 열기 실패:", err);
        alert(`파일 열기 실패: ${err}`);
      }
    },
    [tabs, activeTab, activeTabId, handleSelectTab, isTabHtml]
  );

  // 폴더 트리에서 문서를 에디터로 드래그앤드롭 시 해당 문서 열기
  const handleEditorDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (e.dataTransfer.types.includes("application/x-typomm-file")) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      setIsDragOverEditor(true);
    }
  }, []);

  const handleEditorDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOverEditor(false);
    }
  }, []);

  useEffect(() => {
    const onDragStart = () => setIsDraggingFile(true);
    const onDragEnd = () => {
      setIsDraggingFile(false);
      setIsDragOverEditor(false);
    };
    window.addEventListener("dragstart", onDragStart);
    window.addEventListener("dragend", onDragEnd);
    window.addEventListener("drop", onDragEnd);
    return () => {
      window.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("dragend", onDragEnd);
      window.removeEventListener("drop", onDragEnd);
    };
  }, []);

  const handleEditorDrop = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      const raw = e.dataTransfer.getData("application/x-typomm-file");
      if (!raw) return;

      e.preventDefault();
      e.stopPropagation();
      setIsDragOverEditor(false);

      try {
        const { path } = JSON.parse(raw) as { name: string; path: string };
        if (path) {
          handleOpenFileByPath(path);
        }
      } catch (err) {
        console.error("드래그앤드롭 문서 열기 실패:", err);
      }
    },
    [handleOpenFileByPath]
  );

  const handleExportHtmlFile = useCallback(async () => {
    if (!activeTab) return;
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
      const exportedPath = await invoke<string | null>("export_html_dialog", {
        defaultName,
        defaultDir: folderTree?.root_path ?? null,
        content: fullHtml,
      });
      if (exportedPath && folderTree?.root_path) {
        invoke<FolderTree>("read_folder_tree", { path: folderTree.root_path })
          .then(setFolderTree)
          .catch(() => {});
      }
    } catch (err) {
      console.error("HTML 내보내기 실패:", err);
      alert(`HTML 내보내기 실패: ${err}`);
    }
  }, [activeTab, settings.theme, folderTree?.root_path]);

  const handleCopyHtmlCode = useCallback(async () => {
    if (!activeTab) return;
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
      if (!activeTab) return;
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

  // Source Code Mode Textarea Auto Resize to Content
  const adjustSourceTextareaHeight = useCallback(() => {
    const textarea = sourceTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 80)}px`;
  }, []);

  // Source Code Mode Typewriter Centering (Mode 1 & Mode 2 + Bell)
  const scheduleSourceTypewriterScroll = useCallback((forceGlide = false) => {
    if (!settings.typewriterMode) return;
    requestAnimationFrame(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>(".source-textarea");
      const container = document.querySelector<HTMLElement>(".source-mode-container");
      const viewport = document.querySelector<HTMLElement>(".editor-viewport");
      if (!textarea || !container || !viewport) return;

      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(textarea.scrollHeight, 80)}px`;

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

      if (
        !forceGlide &&
        settings.typewriterBell &&
        charBefore !== "\n" &&
        fullText.length > prevLen &&
        prevLen > 0
      ) {
        const usableWidth = Math.max(200, containerRect.width - paddingLeft * 2);
        const visualWrapRow = Math.floor(textWidth / usableWidth);
        const xInRow = textWidth % usableWidth;
        const visualRowKey = lineIndex * 1000 + visualWrapRow;
        if (usableWidth - xInRow <= 28 && sourceLastBellLineRef.current !== visualRowKey) {
          sourceLastBellLineRef.current = visualRowKey;
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
      } else if (settings.typewriterStyle === "focus") {
        targetTx = Math.round(Math.max(0, (viewportRect.width - containerRect.width) / 2));
        targetTy = Math.round(viewportRect.height * 0.5 - caretYInContainer);
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
        forceGlide ||
        deltaX > 60 ||
        deltaY > 40 ||
        ((settings.typewriterStyle === "vertical" || settings.typewriterStyle === "focus") && deltaY > 10);

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
          if (textarea) {
            textarea.style.transition = "none";
          }
          sourceGlidingRef.current = false;
        }, 230);
      } else if (!sourceGlidingRef.current) {
        container.style.transition = "none";
      }

      sourceTransformRef.current = { tx: targetTx, ty: targetTy };
      container.style.transform = `translate3d(${targetTx}px, ${targetTy}px, 0)`;

      applyFocusSpotlightMask(
        textarea,
        settings.typewriterStyle === "focus",
        viewportRect.height,
        targetTy,
        lineHeight,
        isLineWrapOrJump || sourceGlidingRef.current
      );
    });
  }, [
    settings.typewriterMode,
    settings.typewriterStyle,
    settings.typewriterBell,
    settings.fontSize,
    settings.lineHeight,
  ]);

  const activeIsSourceMode = activeTab?.isSourceMode ?? false;
  const activeTabContent = activeTab?.content ?? "";
  const hasActiveSidebarPanels = isFolderOpen || isTabsOpen || isOutlineOpen;

  useEffect(() => {
    if (activeIsSourceMode) {
      const textarea = document.querySelector<HTMLTextAreaElement>(".source-textarea");
      if (settings.typewriterMode) {
        if (settings.typewriterStyle !== "focus") {
          applyFocusSpotlightMask(textarea, false, 0, 0, 0, false);
        }
        scheduleSourceTypewriterScroll(true);
      } else {
        const container = document.querySelector<HTMLElement>(".source-mode-container");
        if (container) {
          container.style.transform = "";
          container.style.transition = "";
        }
        applyFocusSpotlightMask(textarea, false, 0, 0, 0, false);
        sourceTransformRef.current = { tx: 0, ty: 0 };
        sourceLastCompletedPosRef.current = -1;
        sourceGlidingRef.current = false;
        if (sourceGlideTimerRef.current !== null) {
          clearTimeout(sourceGlideTimerRef.current);
          sourceGlideTimerRef.current = null;
        }
      }
    } else if (settings.typewriterMode && activeTab) {
      editorRef.current?.centerTypewriter();
    }
  }, [activeIsSourceMode, activeTab, settings.typewriterMode, settings.typewriterStyle, scheduleSourceTypewriterScroll]);

  // Enable smooth mouse wheel browsing in source mode typewriter with bounded scroll range
  useEffect(() => {
    const viewport = document.querySelector<HTMLElement>(".editor-viewport");
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      if (!settings.typewriterMode || !activeIsSourceMode) return;
      const container = document.querySelector<HTMLElement>(".source-mode-container");
      if (!container) return;

      const viewportH = viewport.clientHeight;
      const contentH = container.offsetHeight;
      const maxTy = viewportH * 0.5;
      const minTy = Math.min(0, -(contentH - viewportH * 0.5));
      const nextTy = sourceTransformRef.current.ty - e.deltaY;
      sourceTransformRef.current.ty = Math.max(minTy, Math.min(maxTy, nextTy));

      container.style.transition = "none";
      container.style.transform = `translate3d(${sourceTransformRef.current.tx}px, ${sourceTransformRef.current.ty}px, 0)`;

      if (settings.typewriterStyle === "focus") {
        const textarea = container.querySelector<HTMLTextAreaElement>(".source-textarea");
        if (textarea) {
          const computed = window.getComputedStyle(textarea);
          const lineHeight = parseFloat(computed.lineHeight) || settings.fontSize * settings.lineHeight;
          applyFocusSpotlightMask(
            textarea,
            true,
            viewportH,
            sourceTransformRef.current.ty,
            lineHeight,
            false
          );
        }
      }
    };

    viewport.addEventListener("wheel", handleWheel, { passive: true });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [settings.typewriterMode, settings.typewriterStyle, settings.fontSize, settings.lineHeight, activeIsSourceMode]);

  // Track Fullscreen State (macOS & Tauri window fullscreen + DOM fullscreen)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let timer1: number | undefined;
    let timer2: number | undefined;
    const appWindow = getCurrentWindow();

    const syncFullscreen = async () => {
      try {
        const fs = await appWindow.isFullscreen();
        const domFs = Boolean(document.fullscreenElement);
        setIsFullscreen(fs || domFs);
      } catch {
        setIsFullscreen(Boolean(document.fullscreenElement));
      }
    };

    const scheduleSync = () => {
      syncFullscreen();
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
      // macOS 네이티브 전체화면 전환 애니메이션 직후 최종 상태 재확인
      timer1 = window.setTimeout(syncFullscreen, 200);
      timer2 = window.setTimeout(syncFullscreen, 600);
    };

    syncFullscreen();
    if (settings.startInFullscreen) {
      appWindow
        .isFullscreen()
        .then((fs) => {
          if (!fs) {
            return appWindow.setFullscreen(true).then(() => scheduleSync());
          }
        })
        .catch(() => {});
    }
    window.addEventListener("resize", scheduleSync);
    document.addEventListener("fullscreenchange", syncFullscreen);

    appWindow
      .onResized(() => {
        scheduleSync();
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("resize", scheduleSync);
      document.removeEventListener("fullscreenchange", syncFullscreen);
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
      if (unlisten) unlisten();
    };
  }, []);

  // Reset fullscreen overlays whenever fullscreen mode changes
  useEffect(() => {
    setFsShowToolbar(false);
    setFsHoverLeftOverlay(false);
    fsToolbarPinnedRef.current = false;
    fsSidebarsPinnedRef.current = false;
    fsSidebarGraceUntilRef.current = 0;
  }, [isFullscreen]);

  // Fullscreen Left-Edge Hover Detection:
  // 전체 화면에서 툴바가 숨겨져 있을 때 마우스를 좌측면(clientX <= 14)으로 가져가면
  // 툴바에서 활성화되어 있는 폴더·문서탭·목차만 왼쪽에 표시
  useEffect(() => {
    if (!isFullscreen) return;

    if (fsShowToolbar || !hasActiveSidebarPanels) {
      if (fsHoverLeftOverlay) {
        setFsHoverLeftOverlay(false);
      }
      if (fsShowToolbar) return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;

      if (!fsShowToolbar && hasActiveSidebarPanels) {
        if (e.clientX <= 14) {
          fsSidebarGraceUntilRef.current = Date.now() + 450;
          setFsHoverLeftOverlay(true);
        } else if (fsHoverLeftOverlay) {
          const inSidebar = Boolean(target?.closest(".sidebar-panels-dock"));
          if (inSidebar || isResizingPanelRef.current) {
            fsSidebarGraceUntilRef.current = Date.now() + 300;
          } else if (Date.now() > fsSidebarGraceUntilRef.current) {
            setFsHoverLeftOverlay(false);
          }
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isFullscreen, fsShowToolbar, fsHoverLeftOverlay, hasActiveSidebarPanels]);

  // Recenter on window resize, fullscreen toggle, or toolbar/sidebar visibility change
  useEffect(() => {
    const handleResize = () => {
      if (settings.typewriterMode && activeTab) {
        if (activeIsSourceMode) {
          scheduleSourceTypewriterScroll();
        } else {
          editorRef.current?.centerTypewriter();
        }
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [
    settings.typewriterMode,
    activeTab,
    activeIsSourceMode,
    isFullscreen,
    fsShowToolbar,
    isFolderOpen,
    isTabsOpen,
    isOutlineOpen,
    scheduleSourceTypewriterScroll,
  ]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pendingCloseTabId) {
          e.preventDefault();
          handleCancelCloseTab();
          return;
        }
        if (isFullscreen && (fsShowToolbar || fsHoverLeftOverlay)) {
          e.preventDefault();
          fsToolbarPinnedRef.current = false;
          setFsShowToolbar(false);
          setFsHoverLeftOverlay(false);
          return;
        }
      }

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
        if (activeTabId) {
          handleCloseTab(activeTabId);
        }
      } else if (isMeta && e.key === "/") {
        e.preventDefault();
        handleToggleSourceMode();
      } else if (isMeta && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      } else if (e.key === "F9" || (isMeta && e.altKey && e.key.toLowerCase() === "t")) {
        e.preventDefault();
        handleCycleTypewriter();
      } else if (e.key === "F10" || (isMeta && e.shiftKey && e.key.toLowerCase() === "h")) {
        // 전체 화면에서 상단 버튼 영역(메뉴바) 보이기/숨기기 토글
        if (isFullscreen) {
          e.preventDefault();
          setFsShowToolbar((prev) => {
            const next = !prev;
            fsToolbarPinnedRef.current = next;
            return next;
          });
        }
      } else if ((isMeta && e.key === "\\") || (isMeta && e.shiftKey && e.key.toLowerCase() === "l")) {
        // 문서 탭 영역 보이기/숨기기 토글
        e.preventDefault();
        setIsTabsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    pendingCloseTabId,
    isFullscreen,
    fsShowToolbar,
    fsHoverLeftOverlay,
    handleCancelCloseTab,
    handleSave,
    handleSaveAs,
    handleOpen,
    handleNewTab,
    handleCloseTab,
    activeTabId,
    handleToggleSourceMode,
    handleCycleTypewriter,
  ]);

  useEffect(() => {
    if (activeIsSourceMode) {
      adjustSourceTextareaHeight();
    }
  }, [activeIsSourceMode, activeTabId, activeTabContent, adjustSourceTextareaHeight]);

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeTab) return;
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

  const isResizingPanelRef = useRef<boolean>(false);

  const handlePanelResizeStart = useCallback(
    (panel: ResizablePanelKey, e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = panelWidths[panel];
      const minWidth = PANEL_MIN_WIDTHS[panel];
      isResizingPanelRef.current = true;
      document.body.classList.add("is-resizing-panel");

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const maxWidth = Math.max(minWidth, window.innerWidth - 260);
        const nextWidth = Math.round(
          Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX))
        );
        setPanelWidths((prev) =>
          prev[panel] === nextWidth ? prev : { ...prev, [panel]: nextWidth }
        );
      };

      const handleMouseUp = () => {
        isResizingPanelRef.current = false;
        document.body.classList.remove("is-resizing-panel");
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [panelWidths]
  );

  const customEditorRgba = hexToRgba(settings.customEditorBgColor, settings.customEditorBgOpacity);
  const pendingCloseTab = pendingCloseTabId ? tabs.find((t) => t.id === pendingCloseTabId) : null;

  return (
    <div
      className={`app-root theme-${settings.theme}${isFullscreen ? " is-fullscreen" : ""}${
        fsShowToolbar ? " fs-show-toolbar" : ""
      }${fsHoverLeftOverlay ? " fs-hover-left-overlay" : ""}`}
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
      {isFullscreen && (
        <button
          type="button"
          className={`fullscreen-menu-toggle-btn ${fsShowToolbar ? "active" : ""}`}
          onClick={() => {
            setFsShowToolbar((prev) => {
              const next = !prev;
              fsToolbarPinnedRef.current = next;
              return next;
            });
          }}
          aria-label="메뉴버튼"
          title={
            fsShowToolbar
              ? "메뉴버튼: 메뉴바 숨기기 (Cmd+Shift+H)"
              : "메뉴버튼: 메뉴바 보이기 (Cmd+Shift+H)"
          }
        >
          <img
            src={menuAppIcon}
            alt="메뉴버튼"
            className="fullscreen-menu-icon"
            draggable={false}
          />
        </button>
      )}

      <Toolbar
        fileName={activeTab?.name ?? "열린 문서 없음"}
        isDirty={activeTab?.isDirty ?? false}
        isSourceMode={activeTab?.isSourceMode ?? false}
        isOutlineOpen={isOutlineOpen}
        isTabsOpen={isTabsOpen}
        isFolderOpen={isFolderOpen}
        isCheatsheetOpen={isCheatsheetOpen}
        paperMode={settings.paperMode}
        typewriterMode={settings.typewriterMode}
        typewriterStyle={settings.typewriterStyle}
        typingSound={settings.typingSound}
        onNew={handleNewTab}
        onOpen={handleOpen}
        onPickFolder={handlePickFolder}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onToggleSourceMode={handleToggleSourceMode}
        onToggleOutline={handleToggleOutline}
        onToggleTabs={handleToggleTabs}
        onToggleFolder={handleToggleFolder}
        onToggleCheatsheet={() => setIsCheatsheetOpen((prev) => !prev)}
        onTogglePaperMode={() => updateSettings({ paperMode: !settings.paperMode })}
        onCycleTypewriter={handleCycleTypewriter}
        onSelectTypingSound={(sound) => updateSettings({ typingSound: sound })}
        onCenterWindow={handleCenterWindow}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportHtmlFile={handleExportHtmlFile}
        onCopyHtmlCode={handleCopyHtmlCode}
      />

      {/* Ulysses 스타일 좌측 다중 컬럼 레이아웃: 왼쪽에서부터 순서대로 [폴더] -> [문서 탭] -> [목차] -> [편집영역] */}
      <div className="main-layout">
        <div className="sidebar-panels-dock">
          {/* 1. 폴더 (가장 왼쪽) */}
          {isFolderOpen && (
            <FolderSidebar
              folderTree={folderTree}
              activeFilePath={activeTab?.path ?? null}
              favoriteFolders={favorites.folders}
              width={panelWidths.folder}
              onResizeStart={(e) => handlePanelResizeStart("folder", e)}
              onPickFolder={handlePickFolder}
              onRefreshFolder={handleRefreshFolder}
              onOpenFile={handleOpenFileByPath}
              onOpenFolderByPath={handleOpenFolderByPath}
              onToggleFavoriteFolder={handleToggleFavoriteFolder}
              onRemoveFavoriteFolder={handleRemoveFavoriteFolder}
              onClose={() => setIsFolderOpen(false)}
            />
          )}

          {/* 2. 문서 탭 (세로 탭 영역) */}
          {isTabsOpen && (
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              favoriteFiles={favorites.files}
              currentFolderPath={folderTree?.root_path ?? null}
              width={panelWidths.tabs}
              onResizeStart={(e) => handlePanelResizeStart("tabs", e)}
              onSelectTab={handleSelectTab}
              onCloseTab={handleCloseTab}
              onNewTab={handleNewTab}
              onOpenFavoriteFile={handleOpenFileByPath}
              onToggleFavoriteTab={handleToggleFavoriteTab}
              onRemoveFavoriteFile={handleRemoveFavoriteFile}
              onClosePanel={() => setIsTabsOpen(false)}
            />
          )}

          {/* 3. 문서내 목차 */}
          {isOutlineOpen && (
            <Outline
              outline={outline}
              width={panelWidths.outline}
              onResizeStart={(e) => handlePanelResizeStart("outline", e)}
              onSelect={(pos) => {
                if (!activeTab) return;
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
        </div>

        {/* 4. 편집영역 (메인 캔버스) */}
        <main
          className={`editor-viewport width-${settings.contentWidth} font-${settings.fontFamily} ${
            !activeTab ? "is-empty-viewport" : ""
          } ${
            settings.paperMode ? "paper-mode" : ""
          } ${
            activeTab && settings.typewriterMode && !isActiveHtmlWebView
              ? `typewriter-mode typewriter-${settings.typewriterStyle}`
              : ""
          } ${isDragOverEditor ? "drag-over-target" : ""}`}
          onDragOverCapture={handleEditorDragOver}
          onDragLeaveCapture={handleEditorDragLeave}
          onDropCapture={handleEditorDrop}
          onMouseDown={() => {
            if (isFullscreen && fsHoverLeftOverlay) {
              setFsHoverLeftOverlay(false);
            }
          }}
        >
          {!activeTab ? (
            <div className="empty-editor-state">
              <div className="empty-editor-title">열려 있는 문서가 없습니다</div>
              <div className="empty-editor-desc">
                새 문서를 만들거나 기존 마크다운·HTML 문서를 열어 작업을 시작하세요.
              </div>
              <div className="empty-editor-actions">
                <button type="button" className="empty-action-btn primary" onClick={handleNewTab}>
                  새 문서 만들기 (Cmd+N)
                </button>
                <button type="button" className="empty-action-btn" onClick={handleOpen}>
                  문서 열기 (Cmd+O)
                </button>
              </div>
            </div>
          ) : (
            <>
              {isActiveHtmlWebView && (
                <div className="html-webview-container">
                  <div className="html-webview-banner">
                    <span className="html-webview-badge">
                      <span className="html-webview-dot" />
                      HTML 안전 웹뷰 — JavaScript·iframe 등 위험 요소 차단됨
                    </span>
                    <button
                      type="button"
                      className="html-webview-source-btn"
                      onClick={handleToggleSourceMode}
                    >
                      소스 코드 보기
                    </button>
                  </div>
                  <iframe
                    key={activeTab.id}
                    className="html-webview-frame"
                    sandbox=""
                    srcDoc={sanitizedHtmlPreview}
                    title={activeTab.name}
                    style={{ pointerEvents: isDraggingFile ? "none" : "auto" }}
                  />
                </div>
              )}

              {activeTab.isSourceMode && (
                <div className="source-mode-container">
                  <textarea
                    ref={sourceTextareaRef}
                    className="source-textarea"
                    style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}
                    value={activeTab.content}
                    onChange={(e) => {
                      handleSourceChange(e);
                      scheduleSourceTypewriterScroll();
                      adjustSourceTextareaHeight();
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
                    placeholder={
                      isActiveTabHtml
                        ? "HTML 원본 소스 코드를 입력하세요..."
                        : "마크다운 원본 내용을 입력하세요..."
                    }
                    autoFocus
                  />
                </div>
              )}
              <div
                className="editor-wrapper"
                style={{
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight,
                  display: activeTab.isSourceMode || isActiveHtmlWebView ? "none" : "block",
                }}
              >
                <Editor
                  ref={editorRef}
                  initialContent={isActiveTabHtml ? "" : activeTab.content}
                  typewriterMode={settings.typewriterMode && !isActiveHtmlWebView}
                  typewriterStyle={settings.typewriterStyle}
                  typewriterBell={settings.typewriterBell}
                  typingSound={settings.typingSound}
                  onChange={(md) => {
                    if (isActiveTabHtml) return;
                    setTabs((prev) =>
                      prev.map((t) => (t.id === activeTabId ? { ...t, content: md, isDirty: true } : t))
                    );
                  }}
                  onOutlineUpdate={setOutline}
                  onStatsUpdate={setStats}
                />
              </div>
            </>
          )}
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
        isDirty={activeTab?.isDirty ?? false}
        isSourceMode={activeTab?.isSourceMode ?? false}
        isHtmlWebView={isActiveHtmlWebView}
        typewriterMode={settings.typewriterMode}
        typewriterStyle={settings.typewriterStyle}
        onToggleTypewriter={handleCycleTypewriter}
        filePath={activeTab?.path ?? null}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onUpdateSettings={updateSettings}
        onClose={() => setIsSettingsOpen(false)}
      />

      {pendingCloseTab && (
        <div className="modal-backdrop" onClick={handleCancelCloseTab}>
          <div className="unsaved-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="unsaved-confirm-title">
              "{pendingCloseTab.name}" 문서를 저장하지 않고 닫으시겠습니까?
            </div>
            <div className="unsaved-confirm-desc">
              저장하지 않고 닫으면 편집한 변경사항이 사라집니다.
            </div>
            <div className="unsaved-confirm-actions">
              <button
                type="button"
                className="confirm-action-btn primary-save"
                onClick={handleConfirmSaveAndClose}
              >
                저장
              </button>
              <button
                type="button"
                className="confirm-action-btn danger-discard"
                onClick={handleConfirmDiscardAndClose}
              >
                닫기
              </button>
              <button
                type="button"
                className="confirm-action-btn neutral-cancel"
                onClick={handleCancelCloseTab}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
