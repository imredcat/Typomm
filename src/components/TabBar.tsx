import React from "react";
import { TabItem } from "../types";
import { Plus, X, FileText, Layers } from "lucide-react";

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onNewTab: () => void;
  onClosePanel: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onClosePanel,
}) => {
  return (
    <aside className="ulysses-column vertical-tabbar">
      <div className="column-header">
        <div className="column-title">
          <Layers size={15} />
          <span>문서 탭 ({tabs.length})</span>
        </div>
        <div className="column-actions">
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

      <div className="column-body vertical-tab-list">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
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
              <FileText size={14} className="tab-icon" />
              <div className="tab-info">
                <span className="tab-title">{tab.name}</span>
                {tab.path && (
                  <span className="tab-subpath">
                    {tab.path.split(/[/\\]/).slice(-2, -1)[0] || "/"}
                  </span>
                )}
              </div>

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
    </aside>
  );
};
