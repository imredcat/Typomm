import React, { useEffect, useImperativeHandle, useRef } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
  bracketMatching,
  foldGutter,
  foldKeymap,
} from "@codemirror/language";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  Completion,
  CompletionContext,
  CompletionResult,
  snippetCompletion,
  startCompletion,
} from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { php } from "@codemirror/lang-php";
import { oneDark } from "@codemirror/theme-one-dark";
import { TabFileType, TyporaTheme } from "../types";

export interface CodeEditorHandle {
  focus: () => void;
  scrollToPos: (pos: number) => void;
}

interface CodeEditorProps {
  value: string;
  fileType: TabFileType;
  theme: TyporaTheme;
  fontSize: number;
  lineHeight: number;
  onChange: (value: string) => void;
  onTypingSound?: (key: string) => void;
}

const MARKDOWN_COMPLETIONS: Completion[] = [
  snippetCompletion("# ${제목}", { label: "# h1", detail: "대제목 (H1)", type: "keyword" }),
  snippetCompletion("## ${제목}", { label: "## h2", detail: "중제목 (H2)", type: "keyword" }),
  snippetCompletion("### ${제목}", { label: "### h3", detail: "소제목 (H3)", type: "keyword" }),
  snippetCompletion("- [ ] ${할 일}", { label: "- [ ] task", detail: "체크리스트", type: "text" }),
  snippetCompletion("- [x] ${완료}", { label: "- [x] done", detail: "완료된 체크리스트", type: "text" }),
  snippetCompletion("**${텍스트}**", { label: "**bold**", detail: "굵게", type: "text" }),
  snippetCompletion("*${텍스트}*", { label: "*italic*", detail: "기울임", type: "text" }),
  snippetCompletion("`${코드}`", { label: "`code`", detail: "인라인 코드", type: "text" }),
  snippetCompletion("```${언어}\n${코드}\n```", {
    label: "```codeblock",
    detail: "코드 블록",
    type: "keyword",
  }),
  snippetCompletion("[${텍스트}](${https://})", { label: "[link]()", detail: "하이퍼링크", type: "text" }),
  snippetCompletion("![${설명}](${이미지경로})", { label: "![image]()", detail: "이미지 삽입", type: "text" }),
  snippetCompletion("> ${인용문}", { label: "> quote", detail: "인용 블록", type: "text" }),
  snippetCompletion("---\n", { label: "--- hr", detail: "가로 구분선", type: "keyword" }),
  snippetCompletion(
    "| ${열1} | ${열2} |\n| --- | --- |\n| ${값1} | ${값2} |",
    { label: "| table", detail: "마크다운 표", type: "keyword" }
  ),
];

const JS_COMPLETIONS: Completion[] = [
  snippetCompletion("const ${name} = ${value};", { label: "const", detail: "상수 선언", type: "keyword" }),
  snippetCompletion("let ${name} = ${value};", { label: "let", detail: "변수 선언", type: "keyword" }),
  snippetCompletion("function ${name}(${params}) {\n  ${}\n}", {
    label: "function",
    detail: "함수 선언",
    type: "function",
  }),
  snippetCompletion("const ${name} = (${params}) => {\n  ${}\n};", {
    label: "arrow",
    detail: "화살표 함수",
    type: "function",
  }),
  snippetCompletion("async function ${name}(${params}) {\n  ${}\n}", {
    label: "async function",
    detail: "비동기 함수",
    type: "function",
  }),
  snippetCompletion("console.log(${value});", { label: "console.log", detail: "콘솔 출력", type: "function" }),
  snippetCompletion("document.querySelector(\"${selector}\")", {
    label: "document.querySelector",
    detail: "DOM 요소 선택",
    type: "function",
  }),
  snippetCompletion("document.querySelectorAll(\"${selector}\")", {
    label: "document.querySelectorAll",
    detail: "DOM 요소 전체 선택",
    type: "function",
  }),
  snippetCompletion("${el}.addEventListener(\"${event}\", (${e}) => {\n  ${}\n});", {
    label: "addEventListener",
    detail: "이벤트 리스너 등록",
    type: "method",
  }),
  snippetCompletion("try {\n  ${}\n} catch (${err}) {\n  console.error(${err});\n}", {
    label: "try/catch",
    detail: "예외 처리",
    type: "keyword",
  }),
  snippetCompletion("if (${condition}) {\n  ${}\n}", { label: "if", detail: "조건문", type: "keyword" }),
  snippetCompletion("for (const ${item} of ${iterable}) {\n  ${}\n}", {
    label: "for..of",
    detail: "반복문",
    type: "keyword",
  }),
  snippetCompletion("await fetch(\"${url}\").then((r) => r.json())", {
    label: "fetch",
    detail: "Fetch API 요청",
    type: "function",
  }),
  { label: "return", type: "keyword" },
  { label: "export default", type: "keyword" },
  { label: "import", type: "keyword" },
  { label: "Promise", type: "class" },
  { label: "JSON.stringify", type: "function" },
  { label: "JSON.parse", type: "function" },
  { label: "setTimeout", type: "function" },
  { label: "setInterval", type: "function" },
  { label: "localStorage", type: "variable" },
  { label: "window", type: "variable" },
  { label: "document", type: "variable" },
];

const HTML_SNIPPET_COMPLETIONS: Completion[] = [
  snippetCompletion(
    "<!DOCTYPE html>\n<html lang=\"ko\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n  <title>${문서 제목}</title>\n</head>\n<body>\n  ${}\n</body>\n</html>",
    { label: "!html5", detail: "HTML5 기본 템플릿", type: "keyword" }
  ),
  snippetCompletion("<div class=\"${name}\">${}</div>", { label: "div", detail: "div 블록", type: "type" }),
  snippetCompletion("<section class=\"${name}\">${}</section>", {
    label: "section",
    detail: "section 영역",
    type: "type",
  }),
  snippetCompletion("<button type=\"button\">${버튼}</button>", {
    label: "button",
    detail: "버튼 요소",
    type: "type",
  }),
  snippetCompletion("<a href=\"${https://}\">${링크}</a>", { label: "a", detail: "링크 요소", type: "type" }),
  snippetCompletion("<img src=\"${src}\" alt=\"${alt}\" />", {
    label: "img",
    detail: "이미지 요소",
    type: "type",
  }),
  snippetCompletion("<link rel=\"stylesheet\" href=\"${style.css}\" />", {
    label: "link:css",
    detail: "외부 CSS 연결",
    type: "type",
  }),
  snippetCompletion("<script src=\"${app.js}\"></script>", {
    label: "script:src",
    detail: "외부 JS 연결",
    type: "type",
  }),
  snippetCompletion("<style>\n  ${}\n</style>", { label: "style", detail: "내부 스타일", type: "type" }),
];

const CSS_SNIPPET_COMPLETIONS: Completion[] = [
  snippetCompletion("display: flex;\nalign-items: center;\njustify-content: center;", {
    label: "flex-center",
    detail: "Flex 중앙 정렬",
    type: "property",
  }),
  snippetCompletion("display: grid;\ngrid-template-columns: repeat(${2}, 1fr);\ngap: ${16px};", {
    label: "grid",
    detail: "CSS Grid 레이아웃",
    type: "property",
  }),
  snippetCompletion("@media (max-width: ${768px}) {\n  ${}\n}", {
    label: "@media",
    detail: "반응형 미디어 쿼리",
    type: "keyword",
  }),
  snippetCompletion(":root {\n  --${name}: ${value};\n}", {
    label: ":root",
    detail: "CSS 변수 루트",
    type: "keyword",
  }),
  snippetCompletion("transition: all ${0.2s} ease;", {
    label: "transition",
    detail: "트랜지션 효과",
    type: "property",
  }),
];

const PHP_COMPLETIONS: Completion[] = [
  snippetCompletion("<?php\n${}\n?>", { label: "<?php", detail: "PHP 블록", type: "keyword" }),
  snippetCompletion("echo ${$value};", { label: "echo", detail: "출력", type: "keyword" }),
  snippetCompletion("function ${name}(${$param}) {\n  ${}\n}", {
    label: "function",
    detail: "함수 선언",
    type: "function",
  }),
  snippetCompletion("public function ${name}(${$param}) {\n  ${}\n}", {
    label: "public function",
    detail: "클래스 메서드",
    type: "function",
  }),
  snippetCompletion("class ${ClassName} {\n  ${}\n}", {
    label: "class",
    detail: "클래스 선언",
    type: "class",
  }),
  snippetCompletion("if (${$condition}) {\n  ${}\n}", { label: "if", detail: "조건문", type: "keyword" }),
  snippetCompletion("foreach (${$items} as ${$item}) {\n  ${}\n}", {
    label: "foreach",
    detail: "배열 반복문",
    type: "keyword",
  }),
  snippetCompletion("foreach (${$items} as ${$key} => ${$val}) {\n  ${}\n}", {
    label: "foreach_kv",
    detail: "키-값 반복문",
    type: "keyword",
  }),
  snippetCompletion("try {\n  ${}\n} catch (Exception $e) {\n  ${}\n}", {
    label: "try/catch",
    detail: "예외 처리",
    type: "keyword",
  }),
  snippetCompletion("require_once __DIR__ . '/${file.php}';", {
    label: "require_once",
    detail: "파일 포함",
    type: "keyword",
  }),
  snippetCompletion("json_encode(${$data}, JSON_UNESCAPED_UNICODE)", {
    label: "json_encode",
    detail: "JSON 인코딩",
    type: "function",
  }),
  snippetCompletion("json_decode(${$json}, true)", {
    label: "json_decode",
    detail: "JSON 디코딩",
    type: "function",
  }),
  { label: "return", type: "keyword" },
  { label: "isset", type: "function" },
  { label: "empty", type: "function" },
  { label: "count", type: "function" },
  { label: "array_map", type: "function" },
  { label: "array_filter", type: "function" },
  { label: "explode", type: "function" },
  { label: "implode", type: "function" },
  { label: "str_contains", type: "function" },
  { label: "htmlspecialchars", type: "function" },
  { label: "var_dump", type: "function" },
  { label: "$_GET", type: "variable" },
  { label: "$_POST", type: "variable" },
  { label: "$_SERVER", type: "variable" },
  { label: "$_SESSION", type: "variable" },
];

function createCustomCompletionSource(items: Completion[], triggerRegex: RegExp) {
  return (context: CompletionContext): CompletionResult | null => {
    const match = context.matchBefore(triggerRegex);
    if (!match) {
      if (!context.explicit) return null;
      return {
        from: context.pos,
        options: items,
      };
    }
    if (match.from === match.to && !context.explicit) return null;
    return {
      from: match.from,
      options: items,
      validFor: triggerRegex,
    };
  };
}

function getLanguageExtension(fileType: TabFileType) {
  switch (fileType) {
    case "html":
    case "mhtml":
      return [
        html({ autoCloseTags: true, matchClosingTags: true }),
        autocompletion({
          override: undefined,
          activateOnTyping: true,
          maxRenderedOptions: 14,
        }),
        EditorState.languageData.of(() => [
          {
            autocomplete: createCustomCompletionSource(
              HTML_SNIPPET_COMPLETIONS,
              /[!<a-zA-Z][a-zA-Z0-9:-]*/
            ),
          },
        ]),
      ];
    case "css":
      return [
        css(),
        autocompletion({ activateOnTyping: true, maxRenderedOptions: 14 }),
        EditorState.languageData.of(() => [
          {
            autocomplete: createCustomCompletionSource(
              CSS_SNIPPET_COMPLETIONS,
              /[@:a-zA-Z-][a-zA-Z0-9_-]*/
            ),
          },
        ]),
      ];
    case "js":
      return [
        javascript(),
        autocompletion({
          override: [
            createCustomCompletionSource(JS_COMPLETIONS, /[a-zA-Z_$][a-zA-Z0-9_$.]*/),
          ],
          activateOnTyping: true,
          maxRenderedOptions: 14,
        }),
      ];
    case "php":
      return [
        php(),
        autocompletion({
          override: [
            createCustomCompletionSource(
              PHP_COMPLETIONS,
              /(?:<\?|\$[a-zA-Z_]?|[a-zA-Z_][a-zA-Z0-9_]*)/
            ),
          ],
          activateOnTyping: true,
          maxRenderedOptions: 14,
        }),
      ];
    case "markdown":
      return [
        markdown(),
        autocompletion({
          override: [
            createCustomCompletionSource(
              MARKDOWN_COMPLETIONS,
              /(?:#{1,3}|-{1,3}|>|\[|!\[|`{1,3}|\*{1,2}|\||\/)[a-zA-Z0-9가-힣\s[\]x-]*/
            ),
          ],
          activateOnTyping: true,
          maxRenderedOptions: 14,
        }),
      ];
    default:
      return [autocompletion({ activateOnTyping: true, maxRenderedOptions: 12 })];
  }
}

export const CodeEditor = React.forwardRef<CodeEditorHandle, CodeEditorProps>(
  ({ value, fileType, theme, fontSize, lineHeight, onChange, onTypingSound }, ref) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const languageCompartmentRef = useRef(new Compartment());
    const themeCompartmentRef = useRef(new Compartment());
    const onChangeRef = useRef(onChange);
    const onTypingSoundRef = useRef(onTypingSound);
    onChangeRef.current = onChange;
    onTypingSoundRef.current = onTypingSound;

    const isDark = theme === "night";

    const buildThemeExtension = (dark: boolean, fs: number, lh: number) => [
      ...(dark ? [oneDark] : [syntaxHighlighting(defaultHighlightStyle, { fallback: true })]),
      EditorView.theme(
        {
          "&": {
            fontSize: `${fs}px`,
            lineHeight: String(lh),
            height: "100%",
            backgroundColor: "transparent",
          },
          ".cm-scroller": {
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Nanum Gothic Coding", monospace',
            lineHeight: String(lh),
            overflow: "auto",
          },
          ".cm-content": {
            padding: "24px 16px 40px 8px",
            minHeight: "100%",
          },
          ".cm-gutters": {
            backgroundColor: "transparent",
            borderRight: "1px solid var(--border-subtle)",
            color: "var(--text-muted)",
          },
          ".cm-activeLineGutter": {
            backgroundColor: "transparent",
            color: "var(--text-primary)",
          },
          ".cm-activeLine": {
            backgroundColor: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
          },
        },
        { dark }
      ),
    ];

    useImperativeHandle(ref, () => ({
      focus: () => {
        viewRef.current?.focus();
      },
      scrollToPos: (pos: number) => {
        const view = viewRef.current;
        if (!view) return;
        const clamped = Math.max(0, Math.min(pos, view.state.doc.length));
        view.dispatch({
          selection: { anchor: clamped },
          effects: EditorView.scrollIntoView(clamped, { y: "center" }),
        });
        view.focus();
      },
    }));

    useEffect(() => {
      if (!hostRef.current) return;

      const state = EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          foldGutter(),
          bracketMatching(),
          closeBrackets(),
          highlightSelectionMatches(),
          EditorView.lineWrapping,
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...completionKeymap,
            { key: "Alt-Space", run: startCompletion },
            indentWithTab,
          ]),
          languageCompartmentRef.current.of(getLanguageExtension(fileType)),
          themeCompartmentRef.current.of(buildThemeExtension(isDark, fontSize, lineHeight)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          EditorView.domEventHandlers({
            keydown: (e) => {
              if (!e.metaKey && !e.ctrlKey && !e.altKey) {
                onTypingSoundRef.current?.(e.key);
              }
              return false;
            },
          }),
        ],
      });

      const view = new EditorView({
        state,
        parent: hostRef.current,
      });
      viewRef.current = view;

      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // Mount once per component lifecycle; value/language/theme sync handled below
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync external document changes (tab switch, disk reload)
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      const currentDoc = view.state.doc.toString();
      if (value !== currentDoc) {
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: value },
        });
      }
    }, [value]);

    // Sync language mode
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: languageCompartmentRef.current.reconfigure(getLanguageExtension(fileType)),
      });
    }, [fileType]);

    // Sync theme, fontSize, lineHeight
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: themeCompartmentRef.current.reconfigure(
          buildThemeExtension(isDark, fontSize, lineHeight)
        ),
      });
    }, [isDark, fontSize, lineHeight]);

    return <div ref={hostRef} className="code-editor-host" />;
  }
);

CodeEditor.displayName = "CodeEditor";
