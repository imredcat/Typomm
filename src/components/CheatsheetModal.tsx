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
    preview: "가장 큰 제목 크기입니다.",
  },
  {
    id: "h2",
    category: "heading",
    categoryLabel: "제목",
    name: "중제목 (H2)",
    syntax: "## 제목 2",
    preview: "중간 크기 섹션 제목입니다.",
  },
  {
    id: "h3",
    category: "heading",
    categoryLabel: "제목",
    name: "소제목 (H3)",
    syntax: "### 제목 3",
    preview: "하위 항목 소제목입니다.",
  },

  // Inline Marks
  {
    id: "bold",
    category: "inline",
    categoryLabel: "강조/서식",
    name: "굵게 (Bold)",
    syntax: "**굵은 텍스트**",
    preview: "텍스트를 굵게 강조합니다.",
  },
  {
    id: "italic",
    category: "inline",
    categoryLabel: "강조/서식",
    name: "기울임 (Italic)",
    syntax: "*기울임 텍스트*",
    preview: "텍스트를 이탤릭체로 표시합니다.",
  },
  {
    id: "strike",
    category: "inline",
    categoryLabel: "강조/서식",
    name: "취소선 (Strikethrough)",
    syntax: "~~취소선 텍스트~~",
    preview: "텍스트 중앙에 가로선을 긋습니다.",
  },
  {
    id: "code-inline",
    category: "inline",
    categoryLabel: "강조/서식",
    name: "인라인 코드 (Inline Code)",
    syntax: "`console.log()`",
    preview: "문장 내에 고정폭 코드 폰트를 적용합니다.",
  },
  {
    id: "underline",
    category: "inline",
    categoryLabel: "강조/서식",
    name: "밑줄 (Underline)",
    syntax: "<u>밑줄 텍스트</u>",
    preview: "텍스트 하단에 밑줄을 표시합니다.",
  },

  // Lists
  {
    id: "bullet-list",
    category: "list",
    categoryLabel: "목록",
    name: "순서 없는 목록 (Bullet List)",
    syntax: "- 항목 1\n- 항목 2\n  - 하위 항목",
    preview: "글머리 기호(원형 점) 목록을 생성합니다.",
  },
  {
    id: "numbered-list",
    category: "list",
    categoryLabel: "목록",
    name: "순서 있는 목록 (Numbered List)",
    syntax: "1. 첫 번째\n2. 두 번째\n3. 세 번째",
    preview: "숫자가 매겨진 순서 목록을 생성합니다.",
  },
  {
    id: "task-list",
    category: "list",
    categoryLabel: "목록",
    name: "할 일 목록 (Task List)",
    syntax: "- [ ] 미완료 할 일\n- [x] 완료된 할 일",
    preview: "클릭 가능한 체크박스 할 일 목록입니다.",
  },

  // Block elements
  {
    id: "blockquote",
    category: "block",
    categoryLabel: "블록",
    name: "인용구 (Blockquote)",
    syntax: "> 중요한 인용구 또는 강조 문장입니다.",
    preview: "왼쪽에 세로선이 있는 인용 블록을 만듭니다.",
  },
  {
    id: "code-block",
    category: "block",
    categoryLabel: "블록",
    name: "코드 블록 (Code Block)",
    syntax: "```javascript\nfunction hello() {\n  console.log('Hello Typomm!');\n}\n```",
    preview: "프로그래밍 언어 신택스 하이라이팅 블록을 만듭니다.",
  },
  {
    id: "horizontal-rule",
    category: "block",
    categoryLabel: "블록",
    name: "구분선 (Horizontal Rule)",
    syntax: "---\n",
    preview: "문단을 나누는 수평 가로선을 그립니다.",
  },

  // Table
  {
    id: "table",
    category: "table",
    categoryLabel: "표",
    name: "표 (Table)",
    syntax: "| 항목 | 설명 | 비고 |\n| :--- | :--- | :--- |\n| 제목 1 | 내용 1 | - |\n| 제목 2 | 내용 2 | 완료 |",
    preview: "데이터를 열과 행으로 정리하는 그리드 표입니다.",
  },

  // Media & Links
  {
    id: "link",
    category: "media",
    categoryLabel: "링크/미디어",
    name: "웹 링크 (Link)",
    syntax: "[Typomm 공식 링크](https://github.com/imredcat/Typomm)",
    preview: "클릭 가능한 하이퍼링크를 삽입합니다.",
  },
  {
    id: "image",
    category: "media",
    categoryLabel: "링크/미디어",
    name: "이미지 (Image)",
    syntax: "![대체 텍스트](https://example.com/image.png)",
    preview: "외부 이미지 또는 로컬 이미지 파일을 본문에 포함합니다.",
  },
];

const CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "heading", label: "제목" },
  { key: "inline", label: "강조/서식" },
  { key: "list", label: "목록" },
  { key: "block", label: "블록" },
  { key: "table", label: "표" },
  { key: "media", label: "링크/미디어" },
];

interface CheatsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (syntax: string) => void;
}

export const CheatsheetModal: React.FC<CheatsheetModalProps> = ({
  isOpen,
  onClose,
  onInsert,
}) => {
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
      setTimeout(() => setCopiedId(null), 1600);
    } catch (e) {
      console.error("클립보드 복사 실패:", e);
    }
  };

  const handleInsert = (syntax: string) => {
    onInsert(syntax);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container cheatsheet-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <BookOpen size={18} className="modal-icon-accent" />
            <span className="modal-title">마크다운 문법 치트시트</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="닫기 (ESC)">
            <X size={18} />
          </button>
        </div>

        {/* Search Bar & Category Filter */}
        <div className="cheatsheet-controls">
          <div className="cheatsheet-search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="문법 검색 (예: 제목, 목록, 코드, 표, 취소선...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searchTerm && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchTerm("")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="cheatsheet-category-tabs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                className={`category-tab-btn ${
                  activeCategory === cat.key ? "active" : ""
                }`}
                onClick={() => setActiveCategory(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        <div className="cheatsheet-content-scroll">
          {filteredItems.length === 0 ? (
            <div className="cheatsheet-empty">
              검색 결과가 없습니다. 다른 검색어를 입력해 보세요.
            </div>
          ) : (
            <div className="cheatsheet-grid">
              {filteredItems.map((item) => (
                <div key={item.id} className="cheatsheet-card">
                  <div className="card-top">
                    <span className="card-title">{item.name}</span>
                    <span className="card-category-tag">{item.categoryLabel}</span>
                  </div>

                  <div className="card-syntax">
                    <pre>
                      <code>{item.syntax}</code>
                    </pre>
                  </div>

                  <div className="card-preview-text">{item.preview}</div>

                  <div className="card-actions">
                    <button
                      className="card-action-btn insert-btn"
                      onClick={() => handleInsert(item.syntax)}
                      title="현재 문서 커서 위치에 바로 삽입"
                    >
                      <Plus size={13} />
                      <span>문서에 삽입</span>
                    </button>

                    <button
                      className={`card-action-btn copy-btn ${
                        copiedId === item.id ? "copied" : ""
                      }`}
                      onClick={() => handleCopy(item.id, item.syntax)}
                      title="클립보드에 마크다운 복사"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check size={13} />
                          <span>복사됨!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>문법 복사</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cheatsheet-footer">
          <span className="cheatsheet-tip">
            💡 <strong>팁</strong>: 원하는 문법의 [문서에 삽입] 버튼을 누르면 열려 있는 문서에 즉시 추가됩니다.
          </span>
          <button className="settings-btn secondary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
