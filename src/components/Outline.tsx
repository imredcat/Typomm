import React from "react";
import { OutlineItem } from "../types";
import { ListTree, X } from "lucide-react";

interface OutlineProps {
  outline: OutlineItem[];
  onSelect: (pos: number) => void;
  onClose: () => void;
}

export const Outline: React.FC<OutlineProps> = ({ outline, onSelect, onClose }) => {
  return (
    <aside className="ulysses-column outline-sidebar">
      <div className="column-header">
        <div className="column-title">
          <ListTree size={15} />
          <span>문서내 목차</span>
        </div>
        <div className="column-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            title="문서내 목차 영역 닫기"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="column-body outline-list">
        {outline.length === 0 ? (
          <div className="outline-empty">제목(Heading)이 없습니다.</div>
        ) : (
          outline.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`outline-item level-${item.level}`}
              onClick={() => onSelect(item.pos)}
            >
              <span className="outline-bullet">H{item.level}</span>
              <span className="outline-text">{item.text || "제목 없음"}</span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
};
