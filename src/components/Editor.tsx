import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { EditorView } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Placeholder } from "@tiptap/extension-placeholder";
import { OutlineItem, TypewriterStyle, TypingSoundProfile } from "../types";
import { playTypingSound, playCarriageReturnBell } from "../utils/soundEffects";

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
  typewriterStyle?: TypewriterStyle;
  typewriterBell?: boolean;
  typingSound?: TypingSoundProfile;
  onChange: (markdown: string) => void;
  onOutlineUpdate: (outline: OutlineItem[]) => void;
  onStatsUpdate: (stats: { words: number; chars: number }) => void;
}

const KOREAN_CHAR_REGEX = /[ㄱ-ㅎㅏ-ㅣ가-힣\u1100-\u11FF\u3130-\u318F]/;

const NON_TYPING_KEYS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "Tab",
  "Escape",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "ContextMenu",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "F10",
  "F11",
  "F12",
]);

/**
 * Measures the exact pixel coordinates of `targetPos` using a non-empty 1-character DOM Range
 * `[endOffset - 1, endOffset]` whenever a character precedes `targetPos` on the current line.
 * This completely avoids WebKit's collapsed-range bug across mixed Korean/ASCII font runs (e.g. "ㅁ;ㅁ;ㅁ;").
 */
function getExactCaretCoords(
  view: EditorView,
  targetPos: number
): { left: number; top: number; bottom: number } | null {
  const doc = view.state.doc;
  const clampedPos = Math.max(0, Math.min(targetPos, doc.content.size));
  const $pos = doc.resolve(clampedPos);

  if ($pos.parent.isTextblock && $pos.parentOffset > 0) {
    try {
      const domPos = view.domAtPos(clampedPos, -1);
      let node: Node | null = domPos.node;
      let offset: number = domPos.offset;

      if (node.nodeType === Node.ELEMENT_NODE && offset > 0) {
        let child: Node | null = node.childNodes[offset - 1];
        while (child && child.nodeType === Node.ELEMENT_NODE && child.lastChild) {
          child = child.lastChild;
        }
        if (child && child.nodeType === Node.TEXT_NODE) {
          node = child;
          offset = (child.nodeValue || "").length;
        }
      }

      if (node && node.nodeType === Node.TEXT_NODE && offset > 0) {
        const textLen = (node.nodeValue || "").length;
        const endOffset = Math.min(offset, textLen);
        if (endOffset > 0) {
          const range = document.createRange();
          range.setStart(node, endOffset - 1);
          range.setEnd(node, endOffset);
          const rects = range.getClientRects();
          const rect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect();
          if (rect && (rect.width > 0 || rect.height > 0)) {
            let rightEdge = rect.right;
            const prefixRange = document.createRange();
            prefixRange.setStart(node, 0);
            prefixRange.setEnd(node, endOffset);
            const prefixRects = prefixRange.getClientRects();
            for (let i = 0; i < prefixRects.length; i++) {
              const r = prefixRects[i];
              if (Math.abs(r.top - rect.top) < 6 && r.right > rightEdge) {
                rightEdge = r.right;
              }
            }
            return {
              left: rightEdge,
              top: rect.top,
              bottom: rect.bottom,
            };
          }
        }
      }
    } catch {
      // Fall through to fallback
    }
  } else if ($pos.parent.isTextblock && $pos.parentOffset === 0 && $pos.parent.content.size > 0) {
    try {
      const domPos = view.domAtPos(clampedPos, 1);
      let node: Node | null = domPos.node;
      if (node.nodeType === Node.ELEMENT_NODE && node.firstChild) {
        let child: Node | null = node.firstChild;
        while (child && child.nodeType === Node.ELEMENT_NODE && child.firstChild) {
          child = child.firstChild;
        }
        if (child && child.nodeType === Node.TEXT_NODE) {
          node = child;
        }
      }
      if (node && node.nodeType === Node.TEXT_NODE && (node.nodeValue || "").length > 0) {
        const range = document.createRange();
        range.setStart(node, 0);
        range.setEnd(node, 1);
        const rects = range.getClientRects();
        const rect = rects.length > 0 ? rects[0] : range.getBoundingClientRect();
        if (rect && (rect.width > 0 || rect.height > 0)) {
          return {
            left: rect.left,
            top: rect.top,
            bottom: rect.bottom,
          };
        }
      }
    } catch {
      // Fall through to fallback
    }
  }

  const coords = view.coordsAtPos(clampedPos, 1);
  if (!coords || typeof coords.top !== "number") return null;
  return {
    left: coords.left,
    top: coords.top,
    bottom: coords.bottom,
  };
}

export const Editor = forwardRef<EditorHandle, EditorProps>(
  (
    {
      initialContent,
      typewriterMode = false,
      typewriterStyle = "horizontal",
      typewriterBell = true,
      typingSound = "off",
      onChange,
      onOutlineUpdate,
      onStatsUpdate,
    },
    ref
  ) => {
    const typewriterRef = useRef(typewriterMode);
    const typewriterStyleRef = useRef<TypewriterStyle>(typewriterStyle);
    const typewriterBellRef = useRef<boolean>(typewriterBell);
    const typingSoundRef = useRef<TypingSoundProfile>(typingSound);

    const rafIdRef = useRef<number | null>(null);
    const changeTimerRef = useRef<number | null>(null);
    const statsTimerRef = useRef<number | null>(null);
    const lastTransformRef = useRef<{ tx: number; ty: number }>({ tx: 0, ty: 0 });
    const isGlidingRef = useRef<boolean>(false);
    const glideTimerRef = useRef<number | null>(null);
    const isComposingRef = useRef<boolean>(false);
    const lastCompletedPosRef = useRef<number>(-1);
    const lastDocSizeRef = useRef<number>(0);
    const lastCaretYRef = useRef<number>(-1);
    const lastBellLineKeyRef = useRef<number>(-1);

    useEffect(() => {
      typewriterStyleRef.current = typewriterStyle;
    }, [typewriterStyle]);

    useEffect(() => {
      typewriterBellRef.current = typewriterBell;
    }, [typewriterBell]);

    useEffect(() => {
      typingSoundRef.current = typingSound;
    }, [typingSound]);

    const scrollTypewriterCursor = useCallback((currentEditor: ReturnType<typeof useEditor>, forceGlide = false) => {
      if (!typewriterRef.current || !currentEditor || !currentEditor.view) return;

      try {
        const { to } = currentEditor.state.selection;
        const doc = currentEditor.state.doc;
        const docSize = doc.content.size;
        const prevDocSize = lastDocSizeRef.current;
        const style = typewriterStyleRef.current;
        const isComposing = currentEditor.view.composing || isComposingRef.current;

        const clampedTo = Math.max(0, Math.min(to, docSize));
        const $to = doc.resolve(clampedTo);
        const hasCharBefore = $to.parent.isTextblock && $to.parentOffset > 0;
        const charBefore = hasCharBefore ? doc.textBetween(clampedTo - 1, clampedTo) : "";
        const isComposingKorean = isComposing && KOREAN_CHAR_REGEX.test(charBefore);

        // In Mode 1 ("horizontal"), wait until the current Korean syllable (초성 -> 중성 -> 종성)
        // finishes and the next character/symbol is entered before advancing completedPos.
        const completedPos =
          style === "horizontal" && isComposingKorean ? clampedTo - 1 : clampedTo;

        if (
          style === "horizontal" &&
          !forceGlide &&
          isComposingKorean &&
          completedPos === lastCompletedPosRef.current
        ) {
          lastDocSizeRef.current = docSize;
          return;
        }

        const coords = getExactCaretCoords(currentEditor.view, completedPos);
        if (!coords) return;

        const viewport = currentEditor.view.dom.closest(".editor-viewport") as HTMLElement | null;
        const paper = currentEditor.view.dom.closest(".editor-wrapper") as HTMLElement | null;
        if (!viewport || !paper) return;

        if (viewport.scrollLeft !== 0) viewport.scrollLeft = 0;
        if (viewport.scrollTop !== 0) viewport.scrollTop = 0;

        const viewportRect = viewport.getBoundingClientRect();
        const paperRect = paper.getBoundingClientRect();

        // Caret position relative to the paper's top-left corner
        const caretXInPaper = coords.left - paperRect.left;
        const caretYInPaper = (coords.top + coords.bottom) / 2 - paperRect.top;

        // Check End-of-Line Chime Bell ("띵~") when typing forward
        if (!forceGlide && typewriterBellRef.current && docSize >= prevDocSize && prevDocSize > 0) {
          const currentLineKey = Math.round(caretYInPaper / 12);
          const prevLineKey = lastCaretYRef.current >= 0 ? Math.round(lastCaretYRef.current / 12) : currentLineKey;
          // Right text margin inside paper (padding 32px + 56px = 88px; bell zone within 26px of right margin)
          const rightMarginThreshold = paperRect.width - 114;
          const hitRightMargin = caretXInPaper >= rightMarginThreshold;
          const wrappedToNextLine =
            lastCaretYRef.current >= 0 && caretYInPaper - lastCaretYRef.current > 12;

          if (hitRightMargin && lastBellLineKeyRef.current !== currentLineKey) {
            lastBellLineKeyRef.current = currentLineKey;
            playCarriageReturnBell();
          } else if (wrappedToNextLine && lastBellLineKeyRef.current !== prevLineKey) {
            lastBellLineKeyRef.current = currentLineKey;
            playCarriageReturnBell();
          }
        }
        lastCaretYRef.current = caretYInPaper;

        const lastTx = lastTransformRef.current.tx;
        const lastTy = lastTransformRef.current.ty;

        let targetTx: number;
        let targetTy: number;

        if (style === "vertical") {
          // Mode 2: Paper stays horizontally centered (sentences don't move left/right; only cursor moves),
          // while the active line is fixed at 60% from the top of the viewport.
          targetTx = Math.round(Math.max(0, (viewportRect.width - paperRect.width) / 2));
          const targetLineY = viewportRect.height * 0.6;
          targetTy = Math.round(targetLineY - caretYInPaper);
        } else {
          // Mode 1: Classic 2D Typewriter Mode (Caret locked at exact 50% X & 50% Y center)
          const targetCenterX = viewportRect.width / 2;
          const targetCenterY = viewportRect.height / 2;

          targetTx = Math.round(targetCenterX - caretXInPaper);
          targetTy = Math.round(targetCenterY - caretYInPaper);

          // One-way typewriter ratchet: when typing forward on the same line,
          // prevent the paper from moving in the reverse direction (right).
          const isForwardTyping =
            !forceGlide &&
            docSize >= prevDocSize &&
            lastCompletedPosRef.current >= 0 &&
            completedPos >= lastCompletedPosRef.current;
          const isSameLine = Math.abs(targetTy - lastTy) < 10;

          if (isForwardTyping && isSameLine && targetTx > lastTx && (lastTx !== 0 || lastTy !== 0)) {
            targetTx = lastTx;
          }
        }

        lastCompletedPosRef.current = completedPos;
        lastDocSizeRef.current = docSize;

        const deltaX = Math.abs(targetTx - lastTx);
        const deltaY = Math.abs(targetTy - lastTy);

        const isLineWrapOrJump =
          forceGlide || deltaX > 60 || deltaY > 40 || (style === "vertical" && deltaY > 10);

        if (isLineWrapOrJump) {
          // Smooth carriage return / vertical line advance glide animation
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
        handleScrollToSelection: () => typewriterRef.current,
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

    // Track Korean/IME composition lifecycle and Typing Sounds accurately
    useEffect(() => {
      if (!editor || !editor.view || !editor.view.dom) return;
      const dom = editor.view.dom;

      const onCompStart = () => {
        isComposingRef.current = true;
      };
      const onCompUpdate = () => {
        isComposingRef.current = true;
      };
      const onCompEnd = () => {
        isComposingRef.current = false;
        if (typewriterRef.current) {
          scheduleTypewriterScroll(editor);
        }
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (NON_TYPING_KEYS.has(e.key)) return;
        if (typingSoundRef.current !== "off") {
          playTypingSound(typingSoundRef.current, e.key);
        }
      };

      dom.addEventListener("compositionstart", onCompStart, { capture: true });
      dom.addEventListener("compositionupdate", onCompUpdate, { capture: true });
      dom.addEventListener("compositionend", onCompEnd);
      dom.addEventListener("keydown", onKeyDown, { capture: true });
      return () => {
        dom.removeEventListener("compositionstart", onCompStart, { capture: true });
        dom.removeEventListener("compositionupdate", onCompUpdate, { capture: true });
        dom.removeEventListener("compositionend", onCompEnd);
        dom.removeEventListener("keydown", onKeyDown, { capture: true });
      };
    }, [editor, scheduleTypewriterScroll]);

    useEffect(() => {
      typewriterRef.current = typewriterMode;
      if (typewriterMode && editor) {
        scheduleTypewriterScroll(editor, true);
      } else if (!typewriterMode && editor) {
        const paper = editor.view.dom.closest(".editor-wrapper") as HTMLElement | null;
        if (paper) {
          paper.style.transform = "";
          paper.style.transition = "";
        }
        lastTransformRef.current = { tx: 0, ty: 0 };
        lastCompletedPosRef.current = -1;
        lastCaretYRef.current = -1;
        lastBellLineKeyRef.current = -1;
        isGlidingRef.current = false;
        if (glideTimerRef.current !== null) {
          clearTimeout(glideTimerRef.current);
          glideTimerRef.current = null;
        }
      }
    }, [typewriterMode, typewriterStyle, editor, scheduleTypewriterScroll]);

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
