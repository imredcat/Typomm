import React, { useState, useRef, useEffect } from "react";
import { FavoriteItem, TabItem } from "../types";
import { Plus, X, FileText, FileCode, Image, Layers, Star, ChevronDown } from "lucide-react";

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string;
  favoriteFiles: FavoriteItem[];
  currentFolderPath?: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onNewTab: () => void;
  onOpenFavoriteFile: (path: string) => void;
  onToggleFavoriteTab: (tab: TabItem) => void;
  onRemoveFavoriteFile: (path: string) => void;
  onClosePanel: () => void;
  width?: number;
  onResizeStart?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function isFileInsideFolder(filePath: string, folderPath: string): boolean {
  const normFile = filePath.replace(/\\/g, "/");
  const normFolder = folderPath.replace(/\\/g, "/").replace(/\/+$/, "");
  return normFile.startsWith(`${normFolder}/`);
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  favoriteFiles,
  currentFolderPath = null,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onOpenFavoriteFile,
  onToggleFavoriteTab,
  onRemoveFavoriteFile,
  onClosePanel,
  width,
  onResizeStart,
}) => {
  const [isFavOpen, setIsFavOpen] = useState<boolean>(false);
  const favDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFavOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (favDropdownRef.current && !favDropdownRef.current.contains(e.target as Node)) {
        setIsFavOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFavOpen]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;
  const isActiveTabFavorited = Boolean(
    activeTab?.path && favoriteFiles.some((f) => f.path === activeTab.path)
  );
  const folderFavoriteFiles = currentFolderPath
    ? favoriteFiles.filter((f) => isFileInsideFolder(f.path, currentFolderPath))
    : [];

  return (
    <aside
      className="ulysses-column vertical-tabbar"
      style={width ? { width: `${width}px` } : undefined}
    >
      <div className="column-header">
        <div className="column-title">
          <Layers size={15} />
          <span>문서 탭 ({tabs.length})</span>
        </div>
        <div className="column-actions">
          {activeTab && (
            <button
              type="button"
              className={`icon-btn fav-header-btn ${isActiveTabFavorited ? "is-fav" : ""}`}
              onClick={() => onToggleFavoriteTab(activeTab)}
              title={
                isActiveTabFavorited
                  ? "현재 문서 즐겨찾기 해제"
                  : "현재 문서 즐겨찾기 추가"
              }
            >
              <Star
                size={13}
                fill={isActiveTabFavorited ? "currentColor" : "none"}
              />
            </button>
          )}
          <button
            type="button"
            className="icon-btn"
            onClick={onNewTab}
            title="새 문서 탭 (Cmd+T)"
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onClosePanel}
            title="문서 탭 영역 닫기"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 상단 즐겨찾기 드롭다운 바 */}
      <div className="favorites-section" ref={favDropdownRef}>
        <div className="favorites-header">
          <button
            type="button"
            className={`favorites-dropdown-trigger ${isFavOpen ? "open" : ""}`}
            onClick={() => setIsFavOpen((prev) => !prev)}
            title="즐겨찾기 목록 열기"
          >
            <Star size={12} className="fav-title-star" fill="currentColor" />
            <span>즐겨찾기 ({folderFavoriteFiles.length})</span>
            <ChevronDown
              size={12}
              className={`fav-chevron ${isFavOpen ? "rotated" : ""}`}
            />
          </button>

          {activeTab && (
            <button
              type="button"
              className={`fav-add-btn ${isActiveTabFavorited ? "added" : ""}`}
              onClick={() => onToggleFavoriteTab(activeTab)}
              title={
                isActiveTabFavorited
                  ? "현재 문서 즐겨찾기에서 제거"
                  : "현재 문서를 즐겨찾기에 추가"
              }
            >
              <Star size={11} fill={isActiveTabFavorited ? "currentColor" : "none"} />
              <span>{isActiveTabFavorited ? "즐겨찾기됨" : "즐겨 찾기 추가"}</span>
            </button>
          )}
        </div>

        {isFavOpen && (
          <div className="favorites-dropdown-menu">
            {!currentFolderPath ? (
              <div className="favorites-empty">선택한 폴더가 없습니다</div>
            ) : folderFavoriteFiles.length === 0 ? (
              <div className="favorites-empty">이 폴더에 즐겨찾기한 문서가 없습니다</div>
            ) : (
              <div className="favorites-list">
                {folderFavoriteFiles.map((fav) => {
                  const isCurrent = activeTab?.path === fav.path;
                  const isHtml = /\.(html|htm)$/i.test(fav.name);
                  return (
                    <div
                      key={fav.path}
                      className={`favorite-item ${isCurrent ? "active" : ""}`}
                      onClick={() => {
                        onOpenFavoriteFile(fav.path);
                        setIsFavOpen(false);
                      }}
                      title={fav.path}
                    >
                      {isHtml ? (
                        <FileCode size={13} className="fav-item-icon html-icon" />
                      ) : (
                        <FileText size={13} className="fav-item-icon md-icon" />
                      )}
                      <span className="fav-item-label">{fav.name}</span>
                      <button
                        type="button"
                        className="fav-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFavoriteFile(fav.path);
                        }}
                        title="즐겨찾기 삭제"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="column-body vertical-tab-list">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isImageFile =
            tab.fileType === "image" ||
            /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(tab.name);
          const isCodeOrWeb =
            tab.fileType === "html" ||
            tab.fileType === "mhtml" ||
            tab.fileType === "css" ||
            tab.fileType === "js" ||
            tab.fileType === "php" ||
            /\.(html|htm|mhtml|css|js|php)$/i.test(tab.name);
          const isFav = Boolean(
            tab.path && favoriteFiles.some((f) => f.path === tab.path)
          );
          return (
            <div
              key={tab.id}
              className={`vertical-tab-item ${isActive ? "active" : ""}`}
              onClick={() => onSelectTab(tab.id)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.stopPropagation();
                  onCloseTab(tab.id, e);
                }
              }}
              title={tab.path ? tab.path : tab.name}
            >
              {isImageFile ? (
                <Image size={14} className="tab-icon html-icon" />
              ) : isCodeOrWeb ? (
                <FileCode size={14} className="tab-icon html-icon" />
              ) : (
                <FileText size={14} className="tab-icon" />
              )}
              <div className="tab-info">
                <span className="tab-title">{tab.name}</span>
                {tab.path && (
                  <span className="tab-subpath">
                    {tab.path.split(/[/\\]/).slice(-2, -1)[0] || "/"}
                  </span>
                )}
              </div>

              <button
                type="button"
                className={`tab-fav-btn ${isFav ? "is-fav" : ""}`}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onToggleFavoriteTab(tab);
                }}
                title={isFav ? "즐겨찾기 해제" : "즐겨 찾기 추가"}
              >
                <Star size={12} fill={isFav ? "currentColor" : "none"} />
              </button>

              {tab.isDirty ? (
                <button
                  type="button"
                  className="tab-close-btn dirty-indicator"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onCloseTab(tab.id, e);
                  }}
                  title="탭 닫기 (Cmd+W)"
                >
                  <span className="dot" />
                  <X size={12} className="close-x" />
                </button>
              ) : (
                <button
                  type="button"
                  className="tab-close-btn"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onCloseTab(tab.id, e);
                  }}
                  title="탭 닫기 (Cmd+W)"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {onResizeStart && (
        <div
          className="column-resizer"
          onMouseDown={onResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="문서 탭 영역 너비 조절"
        />
      )}
    </aside>
  );
};
