/**
 * HTML 문서를 안전하게 웹뷰로 미리보기 위해 JavaScript, iframe, object, 인라인 이벤트 등
 * 모든 실행 가능한 위험 요소를 제거(Sanitize)하는 유틸리티.
 */

const DANGEROUS_TAGS = new Set([
  "script",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "base",
  "noscript",
  "portal",
  "math",
]);

const URL_ATTRS = new Set([
  "href",
  "src",
  "xlink:href",
  "action",
  "formaction",
  "poster",
  "background",
  "cite",
  "data",
]);

function isDangerousUrl(value: string): boolean {
  const normalized = value.replace(/[\s\u0000-\u001f]+/g, "").toLowerCase();
  if (
    normalized.startsWith("javascript:") ||
    normalized.startsWith("vbscript:") ||
    normalized.startsWith("jscript:")
  ) {
    return true;
  }
  // data: URL은 안전한 이미지/폰트 MIME만 허용 (data:text/html 등 차단)
  if (normalized.startsWith("data:")) {
    if (
      !normalized.startsWith("data:image/") &&
      !normalized.startsWith("data:font/")
    ) {
      return true;
    }
  }
  return false;
}

function sanitizeCssText(css: string): string {
  return css
    .replace(/@import\b[^;]*(;|$)/gi, "/* @import blocked */")
    .replace(/expression\s*\(/gi, "/* blocked */(")
    .replace(/javascript\s*:/gi, "/* blocked */:")
    .replace(/vbscript\s*:/gi, "/* blocked */:")
    .replace(/-moz-binding\s*:/gi, "/* blocked */:")
    .replace(/behavior\s*:/gi, "/* blocked */:");
}

export function isHtmlFilename(nameOrPath?: string | null): boolean {
  if (!nameOrPath) return false;
  return /\.(html|htm)$/i.test(nameOrPath.trim());
}

export function sanitizeHtmlForPreview(rawHtml: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml || "", "text/html");

    // 1. 위험한 태그 완전 제거
    const allElements = Array.from(doc.querySelectorAll("*"));
    for (const el of allElements) {
      const tag = el.tagName.toLowerCase();

      if (DANGEROUS_TAGS.has(tag)) {
        el.remove();
        continue;
      }

      if (tag === "meta" && el.hasAttribute("http-equiv")) {
        el.remove();
        continue;
      }

      if (tag === "link") {
        const rel = (el.getAttribute("rel") || "").toLowerCase();
        const href = el.getAttribute("href") || "";
        // 외부 스크립트/임포트 링크 차단, 위험한 URL 차단
        if (rel === "import" || rel === "preload" || rel === "prefetch" || isDangerousUrl(href)) {
          el.remove();
          continue;
        }
      }

      if (tag === "style" && el.textContent) {
        el.textContent = sanitizeCssText(el.textContent);
      }

      // 2. 위험한 속성(on* 이벤트 핸들러, srcdoc, javascript: URL, style 내 스크립트) 제거
      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        const attrName = attr.name.toLowerCase();
        const attrVal = attr.value || "";

        if (attrName.startsWith("on") || attrName === "srcdoc") {
          el.removeAttribute(attr.name);
          continue;
        }

        if (URL_ATTRS.has(attrName) && isDangerousUrl(attrVal)) {
          el.removeAttribute(attr.name);
          continue;
        }

        if (attrName === "style") {
          const safeStyle = sanitizeCssText(attrVal);
          el.setAttribute("style", safeStyle);
        }
      }

      // form 태그 전송 방지
      if (tag === "form") {
        el.removeAttribute("action");
      }

      // 링크 클릭 시 샌드박스 내 페이지 이탈 방지 (안전한 시각적 링크 유지)
      if (tag === "a" && el.hasAttribute("href")) {
        el.setAttribute("rel", "noopener noreferrer");
        el.setAttribute("target", "_blank");
      }
    }

    // 3. 헤드 내 CSP 및 기본 스타일 보강
    let head = doc.head;
    if (!head) {
      head = doc.createElement("head");
      doc.documentElement.insertBefore(head, doc.body || null);
    }

    const cspMeta = doc.createElement("meta");
    cspMeta.setAttribute("http-equiv", "Content-Security-Policy");
    cspMeta.setAttribute(
      "content",
      "default-src 'none'; style-src 'unsafe-inline' https: http:; img-src data: https: http: blob:; font-src data: https: http:; media-src 'none'; script-src 'none'; child-src 'none'; frame-src 'none'; object-src 'none';"
    );
    head.insertBefore(cspMeta, head.firstChild);

    const baseStyle = doc.createElement("style");
    baseStyle.textContent = `
      html, body {
        margin: 0;
        padding: 24px 32px;
        background-color: #ffffff;
        color: #1f2328;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", Helvetica, Arial, sans-serif;
        line-height: 1.65;
        word-wrap: break-word;
      }
      img { max-width: 100%; height: auto; }
      pre, code { overflow-x: auto; }
      a { color: #0969da; }
    `;
    head.appendChild(baseStyle);

    return `<!DOCTYPE html><html>${doc.documentElement.innerHTML}</html>`;
  } catch {
    const escaped = (rawHtml || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<!DOCTYPE html><html><body style="font-family: sans-serif; padding: 24px;"><pre>${escaped}</pre></body></html>`;
  }
}
