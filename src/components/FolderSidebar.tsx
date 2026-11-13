import React, { useState, useRef, useEffect } from "react";
import { FavoriteItem, FolderNode, FolderTree } from "../types";
import { isOpenableFilename, getTabFileType } from "../utils/fileTypes";
import { getCachedObjectUrl, loadBinaryObjectUrl } from "../utils/binaryCache";
import {
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  Image,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  X,
  FolderSearch,
  Star,
} from "lucide-react";

interface FolderSidebarProps {
  folderTree: FolderTree | null;
  activeFilePath: string | null;
  favoriteFolders: FavoriteItem[];
  onPickFolder: () => void;
  onRefreshFolder: () => void;
  onOpenFile: (path: string) => void;
  onOpenFolderByPath: (path: string) => void;
  onToggleFavoriteFolder: (item: FavoriteItem) => void;
  onRemoveFavoriteFolder: (path: string) => void;
  onClose: () => void;
  width?: number;
  onResizeStart?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

interface HoverImageInfo {
  path: string;
  name: string;
  rect: DOMRect;
}

interface TreeNodeItemProps {
  node: FolderNode;
  level: number;
  activeFilePath: string | null;
  onOpenFile: (path: string) => void;
  onHoverImage: (info: HoverImageInfo | null) => void;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  level,
  activeFilePath,
  onOpenFile,
  onHoverImage,
}) => {
  const [expanded, setExpanded] = useState<boolean>(level < 1);
  const isOpenable = !node.is_dir && isOpenableFilename(node.name);
  const fileType = getTabFileType(node.name);
  const isImageFile = isOpenable && fileType === "image";
  const isCodeOrWeb =
    isOpenable &&
    (fileType === "html" ||
      fileType === "mhtml" ||
      fileType === "css" ||
      fileType === "js" ||
      fileType === "php");
  const isActive = !node.is_dir && activeFilePath === node.path;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    onHoverImage(null);
    if (node.is_dir || !isOpenable) {
      e.preventDefault();
      return;
    }
    const payload = JSON.stringify({
      name: node.name,
      path: node.path,
    });
    e.dataTransfer.setData("application/x-typomm-file", payload);
    e.dataTransfer.setData("text/plain", node.path);
    e.dataTransfer.effectAllowed = "copy";
  };

  if (node.is_dir) {
    return (
      <div className="folder-tree-group">
        <div
          className="folder-tree-item is-dir"
          style={{ paddingLeft: `${10 + level * 14}px` }}
          onClick={() => setExpanded((prev) => !prev)}
          title={node.path}
        >
          <span className="tree-chevron">
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
          {expanded ? (
            <FolderOpen size={14} className="tree-icon folder-icon" />
          ) : (
            <Folder size={14} className="tree-icon folder-icon" />
          )}
          <span className="tree-label">{node.name}</span>
        </div>

        {expanded && node.children && node.children.length > 0 && (
          <div className="folder-tree-children">
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                level={level + 1}
                activeFilePath={activeFilePath}
                onOpenFile={onOpenFile}
                onHoverImage={onHoverImage}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`folder-tree-item is-file ${isActive ? "active" : ""} ${
        !isOpenable ? "unopenable" : ""
      }`}
      style={{ paddingLeft: `${26 + level * 14}px` }}
      draggable={isOpenable}
      onDragStart={handleDragStart}
      onMouseEnter={(e) => {
        if (isImageFile) {
          onHoverImage({
            path: node.path,
            name: node.name,
            rect: e.currentTarget.getBoundingClientRect(),
          });
        }
      }}
      onMouseLeave={() => {
        if (isImageFile) {
          onHoverImage(null);
        }
      }}
      onDoubleClick={() => {
        onHoverImage(null);
        if (isOpenable) onOpenFile(node.path);
      }}
      title={
        isOpenable
          ? `${node.name}\n더블클릭 또는 에디터로 드래그: 문서 열기`
          : `${node.name}\n열 수 없는 파일 형식`
      }
    >
      {isImageFile ? (
        <Image size={14} className="tree-icon html-icon" />
      ) : isCodeOrWeb ? (
        <FileCode size={14} className="tree-icon html-icon" />
      ) : (
        <FileText size={14} className="tree-icon md-icon" />
      )}
      <span className="tree-label">{node.name}</span>
    </div>
  );
};

export const FolderSidebar: React.FC<FolderSidebarProps> = ({
  folderTree,
  activeFilePath,
  favoriteFolders,
  onPickFolder,
  onRefreshFolder,
  onOpenFile,
  onOpenFolderByPath,
  onToggleFavoriteFolder,
  onRemoveFavoriteFolder,
  onClose,
  width,
  onResizeStart,
}) => {
  const [isFavOpen, setIsFavOpen] = useState<boolean>(false);
  const favDropdownRef = useRef<HTMLDivElement>(null);
  const [hoverPreview, setHoverPreview] = useState<{
    path: string;
    name: string;
    url: string;
    x: number;
    y: number;
    dims?: { w: number; h: number };
  } | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const activeHoverPathRef = useRef<string | null>(null);

  const handleHoverImage = (info: HoverImageInfo | null) => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (!info) {
      activeHoverPathRef.current = null;
      setHoverPreview(null);
      return;
    }

    activeHoverPathRef.current = info.path;
    const x = Math.min(window.innerWidth - 280, Math.round(info.rect.right + 12));
    const y = Math.max(12, Math.min(window.innerHeight - 255, Math.round(info.rect.top - 12)));

    const cachedUrl = getCachedObjectUrl(info.path);
    if (cachedUrl) {
      setHoverPreview({ path: info.path, name: info.name, url: cachedUrl, x, y });
      return;
    }

    hoverTimerRef.current = window.setTimeout(async () => {
      try {
        const url = await loadBinaryObjectUrl(info.path);
        if (activeHoverPathRef.current === info.path) {
          setHoverPreview({ path: info.path, name: info.name, url, x, y });
        }
      } catch {
        // ignore preview errors
      }
    }, 90);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    };
  }, []);

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

  const isCurrentFolderFavorited = Boolean(
    folderTree && favoriteFolders.some((f) => f.path === folderTree.root_path)
  );

  return (
    <aside
      className="ulysses-column folder-sidebar"
      style={width ? { width: `${width}px` } : undefined}
    >
      <div className="column-header">
        <div className="column-title" title={folderTree?.root_path || "폴더"}>
          <Folder size={15} />
          <span>{folderTree ? folderTree.root_name : "폴더"}</span>
        </div>
        <div className="column-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={onPickFolder}
            title="폴더 열기"
          >
            <FolderSearch size={14} />
          </button>
          {folderTree && (
            <>
              <button
                type="button"
                className={`icon-btn fav-header-btn ${isCurrentFolderFavorited ? "is-fav" : ""}`}
                onClick={() =>
                  onToggleFavoriteFolder({
                    name: folderTree.root_name,
                    path: folderTree.root_path,
                  })
                }
                title={
                  isCurrentFolderFavorited
                    ? "현재 폴더 즐겨찾기 해제"
                    : "현재 폴더 즐겨찾기 추가"
                }
              >
                <Star
                  size={13}
                  fill={isCurrentFolderFavorited ? "currentColor" : "none"}
                />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={onRefreshFolder}
                title="폴더 새로고침"
              >
                <RefreshCw size={13} />
              </button>
            </>
          )}
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            title="폴더 영역 닫기"
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
            <span>즐겨찾기 ({favoriteFolders.length})</span>
            <ChevronDown
              size={12}
              className={`fav-chevron ${isFavOpen ? "rotated" : ""}`}
            />
          </button>

          {folderTree && (
            <button
              type="button"
              className={`fav-add-btn ${isCurrentFolderFavorited ? "added" : ""}`}
              onClick={() =>
                onToggleFavoriteFolder({
                  name: folderTree.root_name,
                  path: folderTree.root_path,
                })
              }
              title={
                isCurrentFolderFavorited
                  ? "현재 폴더 즐겨찾기에서 제거"
                  : "현재 폴더를 즐겨찾기에 추가"
              }
            >
              <Star size={11} fill={isCurrentFolderFavorited ? "currentColor" : "none"} />
              <span>{isCurrentFolderFavorited ? "즐겨찾기됨" : "즐겨 찾기 추가"}</span>
            </button>
          )}
        </div>

        {isFavOpen && (
          <div className="favorites-dropdown-menu">
            {favoriteFolders.length === 0 ? (
              <div className="favorites-empty">즐겨찾기한 폴더가 없습니다</div>
            ) : (
              <div className="favorites-list">
                {favoriteFolders.map((fav) => {
                  const isCurrent = folderTree?.root_path === fav.path;
                  return (
                    <div
                      key={fav.path}
                      className={`favorite-item ${isCurrent ? "active" : ""}`}
                      onClick={() => {
                        onOpenFolderByPath(fav.path);
                        setIsFavOpen(false);
                      }}
                      title={fav.path}
                    >
                      <Folder size={13} className="fav-item-icon folder-icon" />
                      <span className="fav-item-label">{fav.name}</span>
                      <button
                        type="button"
                        className="fav-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFavoriteFolder(fav.path);
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

      <div className="column-body folder-tree-container">
        {!folderTree ? (
          <div className="folder-empty-state">
            <p className="empty-desc">열려 있는 폴더가 없습니다.</p>
            <button type="button" className="open-folder-cta-btn" onClick={onPickFolder}>
              <FolderOpen size={14} />
              <span>폴더 열기</span>
            </button>
          </div>
        ) : folderTree.nodes.length === 0 ? (
          <div className="folder-empty-state">
            <p className="empty-desc">폴더가 비어 있습니다.</p>
          </div>
        ) : (
          <div className="folder-tree-root">
            {folderTree.nodes.map((node) => (
              <TreeNodeItem
                key={node.path}
                node={node}
                level={0}
                activeFilePath={activeFilePath}
                onOpenFile={onOpenFile}
                onHoverImage={handleHoverImage}
              />
            ))}
          </div>
        )}
      </div>
      {hoverPreview && (
        <div
          className="folder-image-floating-preview"
          style={{ left: `${hoverPreview.x}px`, top: `${hoverPreview.y}px` }}
        >
          <div className="floating-preview-img-wrap">
            <img
              src={hoverPreview.url}
              alt={hoverPreview.name}
              className="floating-preview-img"
              onLoad={(e) => {
                const img = e.currentTarget;
                setHoverPreview((prev) =>
                  prev && prev.path === hoverPreview.path
                    ? { ...prev, dims: { w: img.naturalWidth, h: img.naturalHeight } }
                    : prev
                );
              }}
            />
          </div>
          <div className="floating-preview-meta">
            <span className="floating-preview-name">{hoverPreview.name}</span>
            {hoverPreview.dims && (
              <span className="floating-preview-dims">
                {hoverPreview.dims.w} × {hoverPreview.dims.h}
              </span>
            )}
          </div>
        </div>
      )}
      {onResizeStart && (
        <div
          className="column-resizer"
          onMouseDown={onResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="폴더 영역 너비 조절"
        />
      )}
    </aside>
  );
};
