import { invoke } from "@tauri-apps/api/core";
import { getMimeTypeForFilename } from "./fileTypes";

const MAX_CACHE_ENTRIES = 48;

const objectUrlCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string>>();

export async function loadBinaryBytes(path: string): Promise<Uint8Array> {
  const buffer = await invoke<ArrayBuffer>("read_binary_file", { path });
  return new Uint8Array(buffer);
}

export function getCachedObjectUrl(path: string): string | undefined {
  const hit = objectUrlCache.get(path);
  if (hit) {
    // LRU refresh
    objectUrlCache.delete(path);
    objectUrlCache.set(path, hit);
  }
  return hit;
}

export async function loadBinaryObjectUrl(path: string, mimeOverride?: string): Promise<string> {
  const cached = getCachedObjectUrl(path);
  if (cached) return cached;

  const existingPromise = inFlightRequests.get(path);
  if (existingPromise) return existingPromise;

  const promise = (async () => {
    try {
      const bytes = await loadBinaryBytes(path);
      const mime = mimeOverride || getMimeTypeForFilename(path);
      const blob = new Blob([bytes as BlobPart], { type: mime });
      const url = URL.createObjectURL(blob);

      if (objectUrlCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = objectUrlCache.keys().next().value;
        if (oldestKey) {
          const oldestUrl = objectUrlCache.get(oldestKey);
          objectUrlCache.delete(oldestKey);
          if (oldestUrl) URL.revokeObjectURL(oldestUrl);
        }
      }
      objectUrlCache.set(path, url);
      return url;
    } finally {
      inFlightRequests.delete(path);
    }
  })();

  inFlightRequests.set(path, promise);
  return promise;
}
