import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfViewerProps {
  dataUrl: string;
  fileName: string;
  zoom: number;
  onNumPagesChange?: (numPages: number) => void;
}

function decodePdfDataUrl(dataUrl: string): Uint8Array | null {
  const prefix = "data:application/pdf;base64,";
  if (!dataUrl || !dataUrl.startsWith(prefix)) return null;
  const b64 = dataUrl.slice(prefix.length);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  dataUrl,
  fileName,
  zoom,
  onNumPagesChange,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;
    let loadedDoc: pdfjsLib.PDFDocumentProxy | null = null;
    let observer: IntersectionObserver | null = null;

    async function renderPdf() {
      const container = containerRef.current;
      const stage = stageRef.current;
      if (!container || !stage) return;

      container.innerHTML = "";
      setError(null);
      setLoading(true);

      if (!dataUrl) {
        setLoading(false);
        setError("PDF 데이터를 불러올 수 없습니다.");
        return;
      }

      try {
        if (dataUrl.startsWith("blob:")) {
          loadingTask = pdfjsLib.getDocument({ url: dataUrl });
        } else {
          const bytes = decodePdfDataUrl(dataUrl);
          if (!bytes) {
            setLoading(false);
            setError("PDF 데이터를 불러올 수 없습니다.");
            return;
          }
          loadingTask = pdfjsLib.getDocument({ data: bytes });
        }

        loadedDoc = await loadingTask.promise;
        if (cancelled) {
          await loadedDoc.cleanup();
          return;
        }

        const doc = loadedDoc;
        onNumPagesChange?.(doc.numPages);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const scale = zoom * 1.25;

        // 1페이지 크기를 기준으로 플레이스홀더 카드 생성 (즉시 스크롤 가능)
        const firstPage = await doc.getPage(1);
        if (cancelled) return;
        const firstViewport = firstPage.getViewport({ scale });
        const defaultW = Math.floor(firstViewport.width);
        const defaultH = Math.floor(firstViewport.height);

        const renderedPages = new Set<number>();
        const renderingPages = new Set<number>();

        const renderPage = async (pageNum: number, card: HTMLDivElement) => {
          if (cancelled || renderedPages.has(pageNum) || renderingPages.has(pageNum)) return;
          renderingPages.add(pageNum);
          try {
            const page = pageNum === 1 ? firstPage : await doc.getPage(pageNum);
            if (cancelled) return;

            const viewport = page.getViewport({ scale });
            const w = Math.floor(viewport.width);
            const h = Math.floor(viewport.height);
            card.style.width = `${w}px`;
            card.style.height = `${h}px`;

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            canvas.width = Math.floor(viewport.width * dpr);
            canvas.height = Math.floor(viewport.height * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            card.innerHTML = "";
            card.appendChild(canvas);

            await page.render({
              canvasContext: ctx,
              canvas,
              viewport,
            }).promise;

            renderedPages.add(pageNum);
          } finally {
            renderingPages.delete(pageNum);
          }
        };

        const cards: HTMLDivElement[] = [];
        for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
          const card = document.createElement("div");
          card.className = "pdf-page-card";
          card.dataset.page = String(pageNum);
          card.style.width = `${defaultW}px`;
          card.style.height = `${defaultH}px`;
          container.appendChild(card);
          cards.push(card);
        }

        // 첫 페이지(및 2페이지) 즉시 렌더링하여 체감 대기 시간 최소화
        setLoading(false);
        await renderPage(1, cards[0]);
        if (cards[1] && !cancelled) {
          void renderPage(2, cards[1]);
        }

        // 나머지 페이지는 뷰포트 진입 시 지연 렌더링
        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const card = entry.target as HTMLDivElement;
              const pageNum = Number(card.dataset.page);
              if (pageNum) {
                void renderPage(pageNum, card);
              }
            }
          },
          { root: stage, rootMargin: "400px 0px" }
        );

        for (const card of cards) {
          observer.observe(card);
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
          setError(`PDF 렌더링 실패 (${fileName}): ${String(err)}`);
        }
      }
    }

    renderPdf();

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (loadingTask) loadingTask.destroy().catch(() => {});
      if (loadedDoc) loadedDoc.cleanup().catch(() => {});
    };
  }, [dataUrl, fileName, zoom, onNumPagesChange]);

  return (
    <div ref={stageRef} className="pdf-viewer-stage">
      {loading && <div className="image-viewer-empty">PDF 페이지를 렌더링하는 중입니다...</div>}
      {error && <div className="image-viewer-empty">{error}</div>}
      <div ref={containerRef} className="pdf-pages-list" />
    </div>
  );
};
