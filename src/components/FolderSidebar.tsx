import React, { useState } from "react";
import { FolderNode, FolderTree } from "../types";
import {
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  X,
  FolderSearch,
} from "lucide-react";

interface FolderSidebarProps {
  folderTree: FolderTree | null;
  activeFilePath: string | null;
  onPickFolder: () => void;
  onRefreshFolder: () => void;
  onOpenFile: (path: string) => void;
  onClose: () => void;
}

interface TreeNodeItemProps {
  node: FolderNode;
  level: number;
  activeFilePath: string | null;
  onOpenFile: (path: string) => void;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  level,
  activeFilePath,
  onOpenFile,
}) => {
  const [expanded, setExpanded] = useState<boolean>(level < 1);
  const isHtml = /\.(html|htm)$/i.test(node.name);
  const isActive = !node.is_dir && activeFilePath === node.path;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (node.is_dir) {
      e.preventDefault();
      return;
    }
    const payload = JSON.stringify({
      name: node.name,
      path: node.path,
    });
    e.dataTransfer.setData("application/x-typomm-file", payload);
    e.dataTransfer.setData("text/plain", `[${node.name}](${node.path})`);
    e.dataTransfer.effectAllowed = "copyLink";
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
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`folder-tree-item is-file ${isActive ? "active" : ""}`}
      style={{ paddingLeft: `${26 + level * 14}px` }}
      draggable={true}
      onDragStart={handleDragStart}
      onDoubleClick={() => onOpenFile(node.path)}
      title={`${node.name}\n더블클릭: 문서 열기 | 에디터로 드래그: 링크 삽입`}
    >
      {isHtml ? (
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
  onPickFolder,
  onRefreshFolder,
  onOpenFile,
  onClose,
}) => {
  return (
    <aside className="ulysses-column folder-sidebar">
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
            <button
              type="button"
              className="icon-btn"
              onClick={onRefreshFolder}
              title="폴더 새로고침"
            >
              <RefreshCw size={13} />
            </button>
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
            <p className="empty-desc">표시할 폴더나 .md / .html 문서가 없습니다.</p>
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
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
