"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { BadgeCheck, Image, Loader } from "lucide-react";

type UploadState = "idle" | "uploading" | "success" | "error";

export default function HomePage() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadCount, setUploadCount] = useState(0);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const oversized = fileArray.filter((f) => f.size > 10 * 1024 * 1024);
    if (oversized.length > 0) {
      setErrorMsg(
        `${oversized.length > 1 ? `${oversized.length} files are` : `"${oversized[0].name}" is`} too large. Max 10MB per file.`,
      );
      setUploadState("error");
      return;
    }

    setUploadState("uploading");
    setErrorMsg("");

    // Get a signed signature from server (tiny request, no file)
    let sigData: {
      timestamp: number;
      signature: string;
      folder: string;
      cloudName: string;
      apiKey: string;
      resourceType: string;
    };

    try {
      const sigRes = await fetch("/api/upload-signature");
      sigData = await sigRes.json();
    } catch {
      setErrorMsg("Connection error. Please try again.");
      setUploadState("error");
      return;
    }

    let successCount = 0;

    for (const file of fileArray) {
      // Post each file directly to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("timestamp", String(sigData.timestamp));
      formData.append("signature", sigData.signature);
      formData.append("api_key", sigData.apiKey);
      formData.append("folder", sigData.folder);

      try {
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`,
          { method: "POST", body: formData },
        );

        if (res.ok) successCount++;
        else setErrorMsg("One or more uploads failed.");
      } catch {
        setErrorMsg("Connection error. Please try again.");
      }
    }

    if (successCount > 0) {
      setUploadCount((c) => c + successCount);
      setUploadState("success");
      setTimeout(() => setUploadState("idle"), 3500);
    } else {
      setUploadState("error");
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
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
                className="flex items-center justify-center gap-3 w-full bg-gold text-ink border border-gold/25 rounded-md py-4 px-7 font-body text-base font-medium active:scale-[0.97] active:bg-[#f0b348] transition-all duration-150 cursor-pointer"
                onClick={() => galleryInputRef.current?.click()}
              >
                <Image size={18} />
                Upload from gallery
              </button>
              <p className="font-body text-xs text-white/70 text-center">
                Choose from your gallery or take a new photo/video
                <br />
                <span className="font-medium">Max 10MB per file</span>
              </p>
            </>
          )}

          {uploadState === "uploading" && (
            <div className="flex items-center gap-3">
              <Loader className="text-gold animate-spin" size={20} />
              <p className="font-display text-white animate-pulse">
                Uploading your moment…
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
            </div>
          )}

          {uploadState === "error" && (
            <div className="flex flex-col items-center gap-3">
              <p className="font-body text-sm text-red-200 text-center">
                {errorMsg || "Something went wrong."}
              </p>
              <button
                className="border border-gold text-gold rounded-md px-6 py-2.5 font-body text-sm cursor-pointer"
                onClick={() => {
                  setUploadState("idle");
                  setErrorMsg("");
                }}
              >
                Try again
              </button>
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
