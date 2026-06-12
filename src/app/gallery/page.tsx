"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Photo = {
  id: string;
  name: string;
  createdTime: string;
  type: "image" | "video";
  url: string;
  thumbnail: string;
};

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch("/api/photos");
      const data = await res.json();
      if (res.ok) setPhotos(data.photos);
      else setError(data.error ?? "Could not load photos.");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
    const interval = setInterval(fetchPhotos, 30_000);
    return () => clearInterval(interval);
  }, [fetchPhotos]);

  return (
    <main className="min-h-dvh bg-dark pb-10">
      <header className="sticky top-0 z-10 bg-dark/90 backdrop-blur-md border-b border-gold/15 px-5 pt-4 pb-3 flex flex-col gap-4">
        <Link
          href="/"
          className="font-body flex items-center text-xs text-gold tracking-wide"
        >
          <ArrowLeft className="mr-2" size={14} /> Share your moment as well
        </Link>
        <h1 className="font-display text-3xl font-light text-white tracking-wide">
          Moments from our wedding day
        </h1>
        {!loading && (
          <p className="font-body text-xs text-white/50">
            {photos.length} photo{photos.length !== 1 ? "s" : ""}
          </p>
        )}
      </header>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-9 h-9 rounded-full border-2 border-gold/25 border-t-gold animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-4 py-24 px-6 text-center">
          <p className="font-body text-sm text-red-300">{error}</p>
          <button
            className="border border-gold text-gold rounded-xl px-6 py-2.5 font-body text-sm"
            onClick={fetchPhotos}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && photos.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-24 px-6 text-center">
          <p className="font-display text-3xl font-light text-white/90">
            No photos yet
          </p>
          <p className="font-body text-sm text-white/60">
            Be the first to share a moment!
          </p>
          <Link
            href="/"
            className="bg-gold text-ink rounded-xl px-7 py-3.5 font-body text-sm font-medium"
          >
            Share a photo
          </Link>
        </div>
      )}

      {!loading && photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 p-1">
          {photos.map((photo) => (
            // Replace the grid tile's <img> with this — renders correctly for both types
            <button
              key={photo.id}
              className="aspect-square overflow-hidden bg-white/5 cursor-pointer active:opacity-80 transition-opacity relative"
              onClick={() => setLightbox(photo)}
              aria-label={`View ${photo.type} from ${new Date(photo.createdTime).toLocaleDateString()}`}
            >
              {/* Thumbnail is always a JPEG (Cloudinary extracts a frame for videos) */}
              <img
                src={photo.thumbnail}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Show a play icon overlay for videos so guests know it's a video */}
              {photo.type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="white"
                      aria-hidden="true"
                    >
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/93 flex flex-col items-center justify-center gap-4 p-5"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>

          {lightbox.type === "video" ? (
            <video
              src={lightbox.url}
              className="max-w-full max-h-[calc(100dvh-140px)] rounded-lg"
              controls
              autoPlay
              playsInline // required for iOS autoplay
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={lightbox.url}
              alt=""
              className="max-w-full max-h-[calc(100dvh-140px)] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <a
            href={lightbox.url}
            download
            className="border border-gold text-gold rounded-xl px-6 py-2.5 font-body text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            Save {lightbox.type === "video" ? "video" : "photo"}
          </a>
        </div>
      )}
    </main>
  );
}
