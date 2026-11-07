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
    const lastTransformRef = useRef<{ tx: number; ty: number }>({ tx: 0, ty: 0 });
    const isGlidingRef = useRef<boolean>(false);
    const glideTimerRef = useRef<number | null>(null);

    const scrollTypewriterCursor = useCallback((currentEditor: ReturnType<typeof useEditor>, forceGlide = false) => {
      if (!typewriterRef.current || !currentEditor || !currentEditor.view) return;

      try {
        const { from } = currentEditor.state.selection;
        const coords = currentEditor.view.coordsAtPos(from);
        if (!coords || typeof coords.top !== "number") return;

        const viewport = currentEditor.view.dom.closest(".editor-viewport") as HTMLElement | null;
        const paper = currentEditor.view.dom.closest(".editor-wrapper") as HTMLElement | null;
        if (!viewport || !paper) return;

        const viewportRect = viewport.getBoundingClientRect();
        const paperRect = paper.getBoundingClientRect();

        // Exact 50% Horizontal and Vertical Center of Viewport
        const targetCenterX = viewportRect.width / 2;
        const targetCenterY = viewportRect.height / 2;

        // Caret position relative to the paper's top-left corner
        const caretXInPaper = coords.left - paperRect.left;
        const caretYInPaper = ((coords.top + coords.bottom) / 2) - paperRect.top;

        // Target paper translation to position caret at viewport exact center
        const targetTx = Math.round(targetCenterX - caretXInPaper);
        const targetTy = Math.round(targetCenterY - caretYInPaper);

        const lastTx = lastTransformRef.current.tx;
        const lastTy = lastTransformRef.current.ty;
        const deltaX = Math.abs(targetTx - lastTx);
        const deltaY = Math.abs(targetTy - lastTy);

        // Detect line wrap (soft wrap), Enter key, or distant selection jump
        // Standard single char typing has deltaX of 6-25px.
        // Line wrap causes caret to wrap to line start, causing a large jump (deltaX > 60px).
        const isLineWrapOrJump = forceGlide || deltaX > 60 || deltaY > 40;

        if (isLineWrapOrJump) {
          // Smooth carriage return glide animation (absorbs line wrap jitter smoothly)
          paper.style.transition = "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)";
          isGlidingRef.current = true;
          if (glideTimerRef.current !== null) {
            clearTimeout(glideTimerRef.current);
          }
          glideTimerRef.current = window.setTimeout(() => {
            if (paper) {
              paper.style.transition = "none";
            }
            isGlidingRef.current = false;
          }, 230);
        } else if (!isGlidingRef.current) {
          // Zero latency instant tracking (< 1ms) locks caret rock-solid at center
          paper.style.transition = "none";
        }

        lastTransformRef.current = { tx: targetTx, ty: targetTy };
        paper.style.transform = `translate3d(${targetTx}px, ${targetTy}px, 0)`;
      } catch {
        // Coords might be temporarily unavailable during rapid DOM mutations
      }
    }, []);

    const scheduleTypewriterScroll = useCallback(
      (currentEditor: ReturnType<typeof useEditor>, forceGlide = false) => {
        if (!typewriterRef.current || !currentEditor) return;
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          scrollTypewriterCursor(currentEditor, forceGlide);
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
        scheduleTypewriterScroll(editor, true);
      } else if (!typewriterMode && editor) {
        // Reset transforms cleanly when leaving typewriter mode
        const paper = editor.view.dom.closest(".editor-wrapper") as HTMLElement | null;
        if (paper) {
          paper.style.transform = "";
          paper.style.transition = "";
        }
        lastTransformRef.current = { tx: 0, ty: 0 };
        isGlidingRef.current = false;
        if (glideTimerRef.current !== null) {
          clearTimeout(glideTimerRef.current);
          glideTimerRef.current = null;
        }
      }
    }, [typewriterMode, editor, scheduleTypewriterScroll]);

    // Enable smooth mouse wheel browsing while in typewriter mode
    useEffect(() => {
      const viewport = document.querySelector<HTMLElement>(".editor-viewport");
      if (!viewport) return;

      const handleWheel = (e: WheelEvent) => {
        if (!typewriterRef.current) return;
        const paper = document.querySelector<HTMLElement>(".editor-wrapper");
        if (!paper) return;

        lastTransformRef.current.ty -= e.deltaY;
        paper.style.transition = "none";
        paper.style.transform = `translate3d(${lastTransformRef.current.tx}px, ${lastTransformRef.current.ty}px, 0)`;
      };

      viewport.addEventListener("wheel", handleWheel, { passive: true });
      return () => viewport.removeEventListener("wheel", handleWheel);
    }, []);

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
          scheduleTypewriterScroll(editor, true);
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
