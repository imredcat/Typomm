import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Placeholder } from "@tiptap/extension-placeholder";
import { OutlineItem } from "../types";

export interface EditorHandle {
  getMarkdown: () => string;
  getHTML: () => string;
  setMarkdown: (content: string) => void;
  insertText: (text: string) => void;
  focus: () => void;
  scrollToHeading: (pos: number) => void;
  centerTypewriter: () => void;
}

interface EditorProps {
  initialContent: string;
  typewriterMode?: boolean;
  onChange: (markdown: string) => void;
  onOutlineUpdate: (outline: OutlineItem[]) => void;
  onStatsUpdate: (stats: { words: number; chars: number }) => void;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(
  ({ initialContent, typewriterMode = false, onChange, onOutlineUpdate, onStatsUpdate }, ref) => {
    const typewriterRef = useRef(typewriterMode);
    const rafIdRef = useRef<number | null>(null);
    const changeTimerRef = useRef<number | null>(null);
    const statsTimerRef = useRef<number | null>(null);

    const scrollTypewriterCursor = useCallback((currentEditor: ReturnType<typeof useEditor>) => {
      if (!typewriterRef.current || !currentEditor || !currentEditor.view) return;

      try {
        const { from } = currentEditor.state.selection;
        const coords = currentEditor.view.coordsAtPos(from);
        if (!coords || typeof coords.top !== "number") return;

        const viewport = currentEditor.view.dom.closest(".editor-viewport") as HTMLElement | null;
        if (!viewport) return;

        const viewportRect = viewport.getBoundingClientRect();
        // Exact vertical center of the viewport
        const targetY = viewportRect.top + viewportRect.height / 2;
        const caretY = (coords.top + coords.bottom) / 2;
        const deltaY = caretY - targetY;

        if (Math.abs(deltaY) > 2) {
          viewport.scrollTop += deltaY;
        }
      } catch {
        // Coords might be temporarily unavailable during rapid DOM mutations
      }
    }, []);

    const scheduleTypewriterScroll = useCallback(
      (currentEditor: ReturnType<typeof useEditor>) => {
        if (!typewriterRef.current || !currentEditor) return;
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          scrollTypewriterCursor(currentEditor);
        });
      },
      [scrollTypewriterCursor]
    );

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3, 4, 5, 6],
          },
          codeBlock: {
            HTMLAttributes: {
              class: "code-block",
            },
          },
        }),
        Markdown.configure({
          html: true,
          transformPastedText: true,
          transformCopiedText: true,
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        Placeholder.configure({
          placeholder: "내용을 입력하세요... (마크다운 문법 지원: # 제목, - 목록, > 인용, ``` 코드 등)",
        }),
      ],
      content: initialContent,
      editorProps: {
        attributes: {
          class: "typora-editor-content",
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        // Instant Typewriter scroll response (< 16ms)
        scheduleTypewriterScroll(currentEditor);

        // Debounce markdown string serialization to keep typing latency < 1ms on large documents
        if (changeTimerRef.current !== null) {
          clearTimeout(changeTimerRef.current);
        }
        changeTimerRef.current = window.setTimeout(() => {
          // @ts-expect-error tiptap-markdown storage type
          const markdown = currentEditor.storage.markdown.getMarkdown() as string;
          onChange(markdown);
        }, 150);

        // Debounce Stats & Outline calculation (250ms) for high performance
        if (statsTimerRef.current !== null) {
          clearTimeout(statsTimerRef.current);
        }
        statsTimerRef.current = window.setTimeout(() => {
          const text = currentEditor.getText();
          const chars = text.length;
          const words = text.trim() ? text.trim().split(/\s+/).length : 0;
          onStatsUpdate({ words, chars });

          const items: OutlineItem[] = [];
          currentEditor.state.doc.descendants((node, pos) => {
            if (node.type.name === "heading") {
              items.push({
                id: `heading-${pos}`,
                level: node.attrs.level,
                text: node.textContent,
                pos,
              });
            }
          });
          onOutlineUpdate(items);
        }, 250);
      },
      onSelectionUpdate: ({ editor: currentEditor }) => {
        scheduleTypewriterScroll(currentEditor);
      },
    });

    useEffect(() => {
      typewriterRef.current = typewriterMode;
      if (typewriterMode && editor) {
        scheduleTypewriterScroll(editor);
      }
    }, [typewriterMode, editor, scheduleTypewriterScroll]);

    useImperativeHandle(ref, () => ({
      getMarkdown: () => {
        if (!editor) return "";
        if (changeTimerRef.current !== null) {
          clearTimeout(changeTimerRef.current);
          changeTimerRef.current = null;
        }
        // @ts-expect-error tiptap-markdown storage type
        return editor.storage.markdown.getMarkdown() as string;
      },
      getHTML: () => {
        if (!editor) return "";
        return editor.getHTML();
      },
      setMarkdown: (content: string) => {
        if (!editor) return;
        editor.commands.setContent(content);
      },
      insertText: (text: string) => {
        if (!editor) return;
        editor.commands.insertContent(text);
      },
      focus: () => {
        editor?.commands.focus();
      },
      scrollToHeading: (_pos: number) => {
        if (!editor) return;
        editor.commands.setTextSelection(_pos);
        const dom = editor.view.domAtPos(_pos);
        if (dom && dom.node) {
          const el = dom.node instanceof HTMLElement ? dom.node : dom.node.parentElement;
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
      centerTypewriter: () => {
        if (editor) {
          scheduleTypewriterScroll(editor);
        }
      },
    }));

    useEffect(() => {
      if (editor && initialContent) {
        // Initial outline & stats
        const text = editor.getText();
        const chars = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        onStatsUpdate({ words, chars });

        const items: OutlineItem[] = [];
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === "heading") {
            items.push({
              id: `heading-${pos}`,
              level: node.attrs.level,
              text: node.textContent,
              pos,
            });
          }
        });
        onOutlineUpdate(items);
      }
    }, [editor]);

    return (
      <div className="editor-container">
        <EditorContent editor={editor} />
      </div>
    );
  }
);
