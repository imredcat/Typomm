/**
 * MHTML(.mhtml) 멀티파트 MIME 아카이브에서 HTML 본문과 인라인 리소스(CSS, 이미지 등)를
 * 추출하여 웹뷰에서 렌더링 가능한 단일 HTML 문자열로 변환합니다.
 */

interface MimePart {
  headers: Record<string, string>;
  body: string;
}

function decodeQuotedPrintableBytes(input: string): Uint8Array {
  const unfolded = input.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < unfolded.length; i++) {
    if (
      unfolded[i] === "=" &&
      i + 2 < unfolded.length &&
      /^[0-9a-fA-F]{2}$/.test(unfolded.slice(i + 1, i + 3))
    ) {
      bytes.push(parseInt(unfolded.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(unfolded.charCodeAt(i) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

function decodeBase64ToBytes(input: string): Uint8Array {
  const cleaned = input.replace(/\s+/g, "");
  const bin = atob(cleaned);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function bytesToUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    let out = "";
    for (let i = 0; i < bytes.length; i++) {
      out += String.fromCharCode(bytes[i]);
    }
    return out;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    bin += String.fromCharCode(...chunk);
  }
  return btoa(bin);
}

function parseHeadersAndBody(raw: string): MimePart {
  const normalized = raw.replace(/\r\n/g, "\n");
  const sepIdx = normalized.indexOf("\n\n");
  const headerBlock = sepIdx >= 0 ? normalized.slice(0, sepIdx) : "";
  const body = sepIdx >= 0 ? normalized.slice(sepIdx + 2) : normalized;

  const unfoldedHeaders = headerBlock.replace(/\n[ \t]+/g, " ");
  const headers: Record<string, string> = {};
  for (const line of unfoldedHeaders.split("\n")) {
    const colon = line.indexOf(":");
    if (colon > 0) {
      const key = line.slice(0, colon).trim().toLowerCase();
      const val = line.slice(colon + 1).trim();
      headers[key] = val;
    }
  }
  return { headers, body };
}

function extractBoundary(contentType: string, raw: string): string | null {
  const match = contentType.match(/boundary\s*=\s*(?:"([^"]+)"|([^\s;]+))/i);
  if (match) {
    return match[1] || match[2] || null;
  }
  const fallback = raw.match(/^--([^\r\n]+)/m);
  return fallback ? fallback[1].trim() : null;
}

function decodePartText(part: MimePart): string {
  const encoding = (part.headers["content-transfer-encoding"] || "").toLowerCase();
  if (encoding === "quoted-printable") {
    return bytesToUtf8(decodeQuotedPrintableBytes(part.body));
  }
  if (encoding === "base64") {
    try {
      return bytesToUtf8(decodeBase64ToBytes(part.body));
    } catch {
      return part.body;
    }
  }
  return part.body;
}

function decodePartDataUrl(part: MimePart, mimeType: string): string {
  const encoding = (part.headers["content-transfer-encoding"] || "").toLowerCase();
  const cleanMime = mimeType.split(";")[0].trim() || "application/octet-stream";
  if (encoding === "base64") {
    const cleaned = part.body.replace(/\s+/g, "");
    return `data:${cleanMime};base64,${cleaned}`;
  }
  if (encoding === "quoted-printable") {
    const bytes = decodeQuotedPrintableBytes(part.body);
    return `data:${cleanMime};base64,${bytesToBase64(bytes)}`;
  }
  const encoder = new TextEncoder();
  return `data:${cleanMime};base64,${bytesToBase64(encoder.encode(part.body))}`;
}

export function parseMhtmlToHtml(rawMhtml: string): string {
  if (!rawMhtml || !rawMhtml.trim()) return "";

  const root = parseHeadersAndBody(rawMhtml);
  const rootCt = root.headers["content-type"] || "";
  const boundary = extractBoundary(rootCt, rawMhtml);

  if (!boundary) {
    // 단일 HTML 파트 fallback
    return decodePartText(root);
  }

  const delimiter = `--${boundary}`;
  const rawChunks = rawMhtml.split(delimiter).slice(1);
  const parts: MimePart[] = [];

  for (const chunk of rawChunks) {
    const trimmed = chunk.replace(/^\r?\n/, "");
    if (!trimmed || trimmed.startsWith("--")) continue;
    parts.push(parseHeadersAndBody(trimmed));
  }

  const htmlPart =
    parts.find((p) => (p.headers["content-type"] || "").toLowerCase().includes("text/html")) ||
    parts[0];

  if (!htmlPart) {
    return rawMhtml;
  }

  let html = decodePartText(htmlPart);

  // Content-Location / Content-ID 별 인라인 리소스 맵 구축
  const resourceMap = new Map<string, { mime: string; dataUrl: string; text?: string }>();
  for (const part of parts) {
    if (part === htmlPart) continue;
    const ct = (part.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    const loc = (part.headers["content-location"] || "").trim();
    const cid = (part.headers["content-id"] || "").trim().replace(/^<|>$/g, "");

    const isText = ct.startsWith("text/");
    const entry = {
      mime: ct,
      dataUrl: decodePartDataUrl(part, ct),
      text: isText ? decodePartText(part) : undefined,
    };

    if (loc) resourceMap.set(loc, entry);
    if (cid) resourceMap.set(`cid:${cid}`, entry);
  }

  // 외부 스타일시트(<link rel="stylesheet" href="...">)를 인라인 <style>로 치환
  html = html.replace(
    /<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi,
    (tag, href: string) => {
      if (!/rel=["']?stylesheet["']?/i.test(tag)) return tag;
      const res = resourceMap.get(href);
      if (res && res.mime === "text/css" && res.text !== undefined) {
        return `<style>${res.text}</style>`;
      }
      return tag;
    }
  );

  // src="..." / href="..." 내의 cid: 또는 Content-Location을 data URL로 치환
  for (const [key, entry] of resourceMap.entries()) {
    if (!key) continue;
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(new RegExp(escapedKey, "g"), entry.dataUrl);
  }

  return html;
}
