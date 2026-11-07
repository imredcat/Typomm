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
    <aside className="outline-sidebar">
      <div className="outline-header">
        <div className="outline-title">
          <ListTree size={16} />
          <span>목차 (Outline)</span>
        </div>
        <button className="icon-btn" onClick={onClose} title="목차 닫기">
          <X size={15} />
        </button>
      </div>
      <div className="outline-list">
        {outline.length === 0 ? (
          <div className="outline-empty">제목(Heading)이 없습니다.</div>
        ) : (
          outline.map((item) => (
            <button
              key={item.id}
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
