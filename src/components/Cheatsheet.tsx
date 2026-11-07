import React, { useState, useMemo } from "react";
import { X, Search, Copy, Check, Plus, BookOpen } from "lucide-react";

export interface CheatsheetItem {
  id: string;
  category: "heading" | "inline" | "list" | "block" | "table" | "media";
  categoryLabel: string;
  name: string;
  syntax: string;
  preview: string;
}

const CHEATSHEET_ITEMS: CheatsheetItem[] = [
  // Headings
  {
    id: "h1",
    category: "heading",
    categoryLabel: "제목",
    name: "대제목 (H1)",
    syntax: "# 제목 1",
    preview: "가장 큰 제목 크기",
  },
  {
    id: "h2",
    category: "heading",
    categoryLabel: "제목",
    name: "중제목 (H2)",
    syntax: "## 제목 2",
    preview: "중간 크기 섹션 제목",
  },
  {
    id: "h3",
    category: "heading",
    categoryLabel: "제목",
    name: "소제목 (H3)",
    syntax: "### 제목 3",
    preview: "하위 항목 소제목",
  },

  // Inline Marks
  {
    id: "bold",
    category: "inline",
    categoryLabel: "서식",
    name: "굵게 (Bold)",
    syntax: "**굵은 텍스트**",
    preview: "텍스트 굵게 강조",
  },
  {
    id: "italic",
    category: "inline",
    categoryLabel: "서식",
    name: "기울임 (Italic)",
    syntax: "*기울임 텍스트*",
    preview: "이탤릭체 서식 적용",
  },
  {
    id: "strike",
    category: "inline",
    categoryLabel: "서식",
    name: "취소선 (Strikethrough)",
    syntax: "~~취소선 텍스트~~",
    preview: "텍스트 중앙 가로선",
  },
  {
    id: "code-inline",
    category: "inline",
    categoryLabel: "서식",
    name: "인라인 코드",
    syntax: "`console.log()`",
    preview: "고정폭 코드 서식",
  },
  {
    id: "underline",
    category: "inline",
    categoryLabel: "서식",
    name: "밑줄 (Underline)",
    syntax: "<u>밑줄 텍스트</u>",
    preview: "텍스트 하단 밑줄",
  },

  // Lists
  {
    id: "bullet-list",
    category: "list",
    categoryLabel: "목록",
    name: "순서 없는 목록",
    syntax: "- 항목 1\n- 항목 2\n  - 하위 항목",
    preview: "글머리 기호(원형 점) 목록",
  },
  {
    id: "numbered-list",
    category: "list",
    categoryLabel: "목록",
    name: "순서 있는 목록",
    syntax: "1. 첫 번째\n2. 두 번째\n3. 세 번째",
    preview: "숫자가 매겨진 순서 목록",
  },
  {
    id: "task-list",
    category: "list",
    categoryLabel: "목록",
    name: "할 일 목록 (체크박스)",
    syntax: "- [ ] 미완료 할 일\n- [x] 완료된 할 일",
    preview: "클릭 가능한 체크박스 목록",
  },

  // Block elements
  {
    id: "blockquote",
    category: "block",
    categoryLabel: "블록",
    name: "인용구 (Blockquote)",
    syntax: "> 인용구 또는 강조 문장입니다.",
    preview: "왼쪽 세로선 인용 블록",
  },
  {
    id: "code-block",
    category: "block",
    categoryLabel: "블록",
    name: "코드 블록 (Code Block)",
    syntax: "```javascript\nfunction hello() {\n  console.log('Hello Typomm!');\n}\n```",
    preview: "문법 하이라이팅 코드 영역",
  },
  {
    id: "horizontal-rule",
    category: "block",
    categoryLabel: "블록",
    name: "구분선 (Divider)",
    syntax: "---\n",
    preview: "문단 분리 수평 가로선",
  },

  // Table
  {
    id: "table",
    category: "table",
    categoryLabel: "표",
    name: "표 (Table)",
    syntax: "| 항목 | 설명 | 비고 |\n| :--- | :--- | :--- |\n| 제목 1 | 내용 1 | - |\n| 제목 2 | 내용 2 | 완료 |",
    preview: "데이터 열/행 그리드 표",
  },

  // Media & Links
  {
    id: "link",
    category: "media",
    categoryLabel: "링크",
    name: "웹 링크 (Link)",
    syntax: "[Typomm 공식 링크](https://github.com/imredcat/Typomm)",
    preview: "클릭 가능한 하이퍼링크",
  },
  {
    id: "image",
    category: "media",
    categoryLabel: "미디어",
    name: "이미지 (Image)",
    syntax: "![대체 텍스트](https://example.com/image.png)",
    preview: "외부/로컬 이미지 삽입",
  },
];

const CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "heading", label: "제목" },
  { key: "inline", label: "서식" },
  { key: "list", label: "목록" },
  { key: "block", label: "블록" },
  { key: "table", label: "표" },
  { key: "media", label: "링크" },
];

interface CheatsheetProps {
  onInsert: (syntax: string) => void;
  onClose: () => void;
}

export const Cheatsheet: React.FC<CheatsheetProps> = ({ onInsert, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return CHEATSHEET_ITEMS.filter((item) => {
      const matchesCategory =
        activeCategory === "all" || item.category === activeCategory;
      const matchesSearch =
        searchTerm.trim() === "" ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.syntax.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.preview.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoryLabel.includes(searchTerm);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchTerm]);

  const handleCopy = async (id: string, syntax: string) => {
    try {
      await navigator.clipboard.writeText(syntax);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (e) {
      console.error("클립보드 복사 실패:", e);
    }
  };

  return (
    <aside className="cheatsheet-sidebar">
      {/* Sidebar Header */}
      <div className="cheatsheet-header">
        <div className="cheatsheet-title">
          <BookOpen size={16} />
          <span>치트시트 (Cheatsheet)</span>
        </div>
        <button className="icon-btn" onClick={onClose} title="치트시트 닫기">
          <X size={15} />
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="cheatsheet-filter-area">
        <div className="cheatsheet-search-input-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="문법 검색 (제목, 표, 목록...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-btn" onClick={() => setSearchTerm("")}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="cheatsheet-tabs-row">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              className={`cheatsheet-tab-chip ${
                activeCategory === cat.key ? "active" : ""
              }`}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Items List */}
      <div className="cheatsheet-items-list">
        {filteredItems.length === 0 ? (
          <div className="cheatsheet-no-result">
            검색 결과가 없습니다.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="sidebar-cheatsheet-card">
              <div className="sidebar-card-header">
                <span className="card-item-name">{item.name}</span>
                <span className="card-item-tag">{item.categoryLabel}</span>
              </div>

              <div className="sidebar-card-syntax">
                <pre>
                  <code>{item.syntax}</code>
                </pre>
              </div>

              <div className="sidebar-card-preview">{item.preview}</div>

              <div className="sidebar-card-actions">
                <button
                  className="sidebar-action-btn insert"
                  onClick={() => onInsert(item.syntax)}
                  title="현재 문서 커서 위치에 바로 삽입"
                >
                  <Plus size={12} />
                  <span>삽입</span>
                </button>

                <button
                  className={`sidebar-action-btn copy ${
                    copiedId === item.id ? "copied" : ""
                  }`}
                  onClick={() => handleCopy(item.id, item.syntax)}
                  title="마크다운 문법 복사"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check size={12} />
                      <span>복사됨</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>복사</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
