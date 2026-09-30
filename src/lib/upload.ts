import {
  MAX_FILE_BYTES,
  MAX_FILE_MB,
  resolveContentType,
} from "@/src/lib/config";
import { makeThumbnail } from "@/src/lib/thumbnail";

export type Progress = { done: number; total: number; fraction: number };

export type UploadOutcome = {
  succeeded: File[];
  failed: File[];
  // Files we never tried to upload, with a human-readable reason.
  skipped: { file: File; reason: string }[];
};

const CONCURRENCY = 3;
const ATTEMPTS = 3;
const URL_BATCH = 50;

type PresignedFile =
  | { key: string; uploadUrl: string; thumbUploadUrl: string }
  | { error: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < ATTEMPTS - 1) await sleep(1000 * 2 ** attempt); // 1s, 2s
    }
  }
  throw lastError;
}

// XMLHttpRequest to report upload progress.
function put(
  url: string,
  body: Blob,
  contentType: string,
  onProgress?: (loaded: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(body);
  });
}

async function requestUrls(
  metas: { type: string; size: number }[],
): Promise<PresignedFile[]> {
  const out: PresignedFile[] = [];
  for (let i = 0; i < metas.length; i += URL_BATCH) {
    const res = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: metas.slice(i, i + URL_BATCH) }),
    });
    if (!res.ok) throw new Error("Could not start upload");
    out.push(...(await res.json()).files);
  }
  return out;
}

export async function uploadFiles(
  files: File[],
  onProgress: (p: Progress) => void,
): Promise<UploadOutcome> {
  const outcome: UploadOutcome = { succeeded: [], failed: [], skipped: [] };

  // Weed out bad files up front so one bad file never blocks the rest.
  const valid: { file: File; contentType: string }[] = [];
  for (const file of files) {
    const contentType = resolveContentType(file);
    if (!contentType)
      outcome.skipped.push({ file, reason: "unsupported file type" });
    else if (file.size > MAX_FILE_BYTES)
      outcome.skipped.push({ file, reason: `over ${MAX_FILE_MB}MB` });
    else if (file.size === 0)
      outcome.skipped.push({ file, reason: "empty file" });
    else valid.push({ file, contentType });
  }
  if (valid.length === 0) return outcome;

  // One small request for every upload URL (this is the only server call).
  const urls = await requestUrls(
    valid.map((v) => ({ type: v.contentType, size: v.file.size })),
  );

  // Upload in a small pool, tracking bytes for a single overall progress bar.
  const loaded = new Array<number>(valid.length).fill(0);
  const totalBytes = valid.reduce((sum, v) => sum + v.file.size, 0);
  let done = 0;
  const report = () =>
    onProgress({
      done,
      total: valid.length,
      fraction: totalBytes ? loaded.reduce((a, b) => a + b, 0) / totalBytes : 0,
    });
  report();

  async function uploadOne(i: number) {
    const { file, contentType } = valid[i];
    const target = urls[i];
    if (!target || "error" in target) {
      outcome.skipped.push({
        file,
        reason: target ? target.error.toLowerCase() : "rejected by server",
      });
      done++;
      report();
      return;
    }

    try {
      // Generate a thumbnail.
      const thumb = await makeThumbnail(file, contentType);
      if (thumb) {
        await withRetry(() =>
          put(target.thumbUploadUrl, thumb, "image/jpeg"),
        ).catch(() => {});
      }

      await withRetry(() => {
        loaded[i] = 0; // a retry starts from zero
        return put(target.uploadUrl, file, contentType, (n) => {
          loaded[i] = n;
          report();
        });
      });

      loaded[i] = file.size;
      outcome.succeeded.push(file);
    } catch {
      loaded[i] = 0;
      outcome.failed.push(file);
    } finally {
      done++;
      report();
    }
  }

  let next = 0;
  const worker = async () => {
    while (next < valid.length) await uploadOne(next++);
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, valid.length) }, worker),
  );

  return outcome;
}
