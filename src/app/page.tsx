"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { BadgeCheck, Image, Loader } from "lucide-react";
import { MAX_FILE_MB } from "@/src/lib/config";
import { uploadFiles, type Progress } from "@/src/lib/upload";

type UploadState = "idle" | "uploading" | "success" | "error";

export default function HomePage() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [notice, setNotice] = useState("");
  const [uploadCount, setUploadCount] = useState(0);
  const [progress, setProgress] = useState<Progress>({
    done: 0,
    total: 0,
    fraction: 0,
  });
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;

    setUploadState("uploading");
    setErrorMsg("");
    setNotice("");
    setFailedFiles([]);
    setProgress({ done: 0, total: files.length, fraction: 0 });

    // Keep the screen awake: a phone that locks mid-upload pauses the upload.
    let wakeLock: WakeLockSentinel | null = null;
    try {
      wakeLock = (await navigator.wakeLock?.request("screen")) ?? null;
    } catch {}

    try {
      const { succeeded, failed, skipped } = await uploadFiles(
        files,
        setProgress,
      );

      if (skipped.length > 0) {
        setNotice(
          skipped.length === 1
            ? `"${skipped[0].file.name}" was skipped (${skipped[0].reason}).`
            : `${skipped.length} files were skipped (unsupported or over ${MAX_FILE_MB}MB).`,
        );
      }
      setUploadCount((c) => c + succeeded.length);
      setFailedFiles(failed);

      if (failed.length > 0) {
        setErrorMsg(
          succeeded.length > 0
            ? `${succeeded.length} shared, but ${failed.length} couldn't be uploaded.`
            : `${failed.length === 1 ? "Your file" : "Your files"} couldn't be uploaded. Check your connection and try again.`,
        );
        setUploadState("error");
      } else if (succeeded.length > 0) {
        setUploadState("success");
        setTimeout(
          () => setUploadState("idle"),
          skipped.length > 0 ? 6000 : 3500,
        );
      } else {
        // Nothing uploadable at all (every file was skipped)
        setErrorMsg("Those files can't be uploaded.");
        setUploadState("error");
      }
    } catch {
      setErrorMsg("Connection error. Please try again.");
      setFailedFiles(files);
      setUploadState("error");
    } finally {
      wakeLock?.release().catch(() => {});
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  }

  return (
    <main className="relative min-h-dvh flex flex-col items-center justify-center px-5 py-10">
      <div className="fixed inset-0 z-0 bg-ink" aria-hidden="true">
        <img
          src="/inn.jpg"
          alt=""
          className="w-full h-full object-cover object-top"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/50 to-black/90" />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        <header className="text-center flex flex-col gap-2">
          <p className="font-body text-[11px] font-medium tracking-[0.18em] uppercase text-text-gold-light/90">
            You&apos;re invited to share
          </p>
          <h1 className="font-display text-[clamp(40px,11vw,58px)] leading-[1.1] tracking-wide text-white font-bold">
            Your moments from our wedding day
          </h1>
          <p className="font-display text-lg italic tracking-wider text-shadow-gold-light">
            Snap a moment, share the love
          </p>
        </header>

        <div className="w-full bg-white/10 backdrop-blur-xl border border-gold/30 rounded-md p-8 flex flex-col items-center gap-3 min-h-35 justify-center">
          {uploadState === "idle" && (
            <>
              <button
                className="flex items-center justify-center gap-3 w-full bg-gold text-ink border border-gold/25 rounded-md py-4 px-7 font-body text-base font-medium active:scale-[0.97] active:bg-gold/90 transition-all duration-150 cursor-pointer"
                onClick={() => galleryInputRef.current?.click()}
              >
                <Image size={18} />
                Upload from gallery
              </button>
              <p className="font-body text-xs text-white/70 text-center">
                Choose from your gallery or take a new photo/video
                <br />
                <span className="font-medium">
                  Max {MAX_FILE_MB}MB per file
                </span>
              </p>
            </>
          )}

          {uploadState === "uploading" && (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="flex items-center gap-3">
                <Loader className="text-gold animate-spin" size={20} />
                <p className="font-display text-white animate-pulse">
                  {progress.total > 1
                    ? `Uploading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
                    : "Uploading your moment…"}
                </p>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-gold transition-[width] duration-200"
                  style={{ width: `${Math.round(progress.fraction * 100)}%` }}
                />
              </div>
              <p className="font-body text-xs text-white/60">
                Keep this page open until it finishes
              </p>
            </div>
          )}

          {uploadState === "success" && (
            <div className="flex flex-col items-center gap-2">
              <p className="font-display flex items-center gap-2 text-lg text-white">
                <BadgeCheck size={20} />
                {uploadCount === 1
                  ? "Photo shared!"
                  : `${uploadCount} photos shared!`}
              </p>
              <p className="font-body text-sm text-white/70">Thank you 💛</p>
              {notice && (
                <p className="font-body text-xs text-white/60 text-center">
                  {notice}
                </p>
              )}
            </div>
          )}

          {uploadState === "error" && (
            <div className="flex flex-col items-center gap-3">
              <p className="font-body text-sm text-red-200 text-center">
                {errorMsg || "Something went wrong."}
              </p>
              {notice && (
                <p className="font-body text-xs text-white/60 text-center">
                  {notice}
                </p>
              )}
              <button
                className="border border-gold text-gold rounded-md px-6 py-2.5 font-body text-sm cursor-pointer"
                onClick={() => {
                  if (failedFiles.length > 0) {
                    handleFiles(failedFiles); // retry only what failed
                  } else {
                    setUploadState("idle");
                    setErrorMsg("");
                  }
                }}
              >
                {failedFiles.length > 0 ? "Retry failed uploads" : "Try again"}
              </button>
              {failedFiles.length > 0 && (
                <button
                  className="font-body text-xs text-white/60 underline cursor-pointer"
                  onClick={() => {
                    setFailedFiles([]);
                    setUploadState("idle");
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
        </div>

        <Link
          href="/gallery"
          className="font-body text-sm text-white/70 tracking-widest border-b border-white/25 pb-0.5 hover:text-gold-light transition-colors"
        >
          View all snapped moments →
        </Link>
      </div>
    </main>
  );
}
