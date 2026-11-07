import React from "react";
import { TabItem } from "../types";
import { Plus, X, FileText } from "lucide-react";

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onNewTab: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  return (
    <div className="typora-tabbar">
      <div className="tab-list">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`tab-item ${isActive ? "active" : ""}`}
              onClick={() => onSelectTab(tab.id)}
              onAuxClick={(e) => {
                // Middle click closes tab
                if (e.button === 1) {
                  onCloseTab(tab.id, e);
                }
              }}
              title={tab.path ? tab.path : tab.name}
            >
              <FileText size={13} className="tab-icon" />
              <span className="tab-title">{tab.name}</span>

              {tab.isDirty ? (
                <button
                  className="tab-close-btn dirty-indicator"
                  onClick={(e) => onCloseTab(tab.id, e)}
                  title="저장되지 않은 변경사항 (클릭하여 닫기)"
                >
                  <span className="dot" />
                  <X size={12} className="close-x" />
                </button>
              ) : (
                <button
                  className="tab-close-btn"
                  onClick={(e) => onCloseTab(tab.id, e)}
                  title="탭 닫기 (Cmd+W)"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button className="new-tab-btn" onClick={onNewTab} title="새 문서 탭 (Cmd+T / Cmd+N)">
        <Plus size={14} />
      </button>
    </div>
  );
};
