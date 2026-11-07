import { TyporaTheme } from "../types";

export function generateStandaloneHtml(title: string, bodyHtml: string, theme: TyporaTheme): string {
  // Theme color styles embedded directly so the HTML file is 100% portable
  const themeCss = `
    :root {
      --bg-color: ${theme === "night" ? "#363b40" : theme === "newsprint" ? "#faf8f1" : "#ffffff"};
      --text-color: ${theme === "night" ? "#e6edf3" : theme === "newsprint" ? "#222222" : "#333333"};
      --border-color: ${theme === "night" ? "#464c53" : theme === "newsprint" ? "#e2ded0" : "#e1e4e8"};
      --accent-color: ${theme === "night" ? "#00e676" : theme === "newsprint" ? "#a33e38" : "#4183c4"};
      --code-bg: ${theme === "night" ? "#282c34" : theme === "newsprint" ? "#f0ece0" : "#f8f8f8"};
      --table-zebra: ${theme === "night" ? "#2f3438" : theme === "newsprint" ? "#f4f1e8" : "#f6f8fa"};
      --font-family: ${theme === "newsprint" ? 'Georgia, Cambria, "Apple SD Gothic Neo", serif' : '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", sans-serif'};
    }

    body {
      margin: 0;
      padding: 40px 20px;
      background-color: var(--bg-color);
      color: var(--text-color);
      font-family: var(--font-family);
      line-height: 1.7;
      display: flex;
      justify-content: center;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      width: 100%;
      max-width: 860px;
    }

    h1, h2, h3, h4, h5, h6 {
      margin-top: 28px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
      color: var(--text-color);
    }

    h1 {
      font-size: 2.1em;
      padding-bottom: 0.3em;
      border-bottom: 1px solid var(--border-color);
    }

    h2 {
      font-size: 1.5em;
      padding-bottom: 0.25em;
      border-bottom: 1px solid var(--border-color);
    }

    p { margin-top: 0; margin-bottom: 16px; }

    hr {
      height: 2px;
      background-color: var(--border-color);
      border: 0;
      margin: 28px 0;
    }

    blockquote {
      padding: 0 1em;
      color: ${theme === "night" ? "#9da5b4" : "#555555"};
      border-left: 4px solid var(--accent-color);
      margin: 16px 0;
    }

    ul, ol {
      padding-left: 2em;
      margin-bottom: 16px;
    }

    li { margin-top: 0.25em; }

    ul[data-type="taskList"] {
      list-style: none;
      padding-left: 0;
    }

    ul[data-type="taskList"] li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    ul[data-type="taskList"] li input[type="checkbox"] {
      cursor: pointer;
      margin-top: 5px;
      accent-color: var(--accent-color);
    }

    code:not(pre code) {
      padding: 0.2em 0.4em;
      background-color: var(--code-bg);
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 85%;
    }

    pre {
      padding: 16px;
      overflow: auto;
      background-color: var(--code-bg);
      border-radius: 6px;
      border: 1px solid var(--border-color);
      margin-bottom: 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 88%;
      line-height: 1.5;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
    }

    th, td {
      padding: 8px 14px;
      border: 1px solid var(--border-color);
    }

    th {
      background-color: var(--table-zebra);
      font-weight: 600;
    }

    tr:nth-child(2n) {
      background-color: var(--table-zebra);
    }

    a {
      color: var(--accent-color);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    @media print {
      body { background-color: #ffffff; color: #000000; padding: 0; }
      .container { max-width: 100%; }
    }
  `;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
${themeCss}
  </style>
</head>
<body>
  <div class="container">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
