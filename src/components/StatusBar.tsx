import React from "react";

interface StatusBarProps {
  words: number;
  chars: number;
  isDirty: boolean;
  isSourceMode: boolean;
  filePath: string | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  words,
  chars,
  isDirty,
  isSourceMode,
  filePath,
}) => {
  const readingTime = Math.max(1, Math.ceil(words / 200));

  return (
    <footer className="typora-statusbar">
      <div className="status-left">
        <span className="status-tag">
          {isSourceMode ? "소스 코드 모드" : "실시간 위지윅 모드"}
        </span>
        <span className="status-divider">|</span>
        <span className="status-path" title={filePath || "저장되지 않음"}>
          {filePath ? filePath : "새 문서 (저장되지 않음)"}
        </span>
      </div>

      <div className="status-right">
        <span className="status-item">{words.toLocaleString()} 단어</span>
        <span className="status-divider">•</span>
        <span className="status-item">{chars.toLocaleString()} 글자</span>
        <span className="status-divider">•</span>
        <span className="status-item">약 {readingTime}분 읽기</span>
        <span className="status-divider">•</span>
        <span className={`status-item ${isDirty ? "unsaved" : "saved"}`}>
          {isDirty ? "저장 안 됨" : "저장 완료"}
        </span>
      </div>
    </footer>
  );
};
