// Client-side thumbnails. Cloudinary used to resize on the fly; R2 stores files as-is, so the phone makes a small square JPEG before uploading.

const SIZE = 400;

function drawCover(
  source: CanvasImageSource,
  w: number,
  h: number,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx || !w || !h) return Promise.resolve(null);

  // "cover" crop: fill the square, centre the image
  const scale = Math.max(SIZE / w, SIZE / h);
  const dw = w * scale;
  const dh = h * scale;
  ctx.drawImage(source, (SIZE - dw) / 2, (SIZE - dh) / 2, dw, dh);

  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8),
  );
}

async function imageThumbnail(file: File) {
  const bitmap = await createImageBitmap(file); // applies EXIF rotation
  try {
    return await drawCover(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

function videoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    let finished = false;
    const finish = (blob: Blob | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
      resolve(blob);
    };

    const timer = setTimeout(() => finish(null), 8000);
    video.onerror = () => finish(null);
    video.onloadeddata = () => {
      // Seek a little in so we don't grab a black first frame
      video.currentTime = Math.min(1, (video.duration || 2) / 2);
    };
    video.onseeked = async () => {
      finish(await drawCover(video, video.videoWidth, video.videoHeight));
    };
    video.src = url;
  });
}

// Returns a JPEG blob, or null if the browser can't decode the file. Never throws.
export async function makeThumbnail(
  file: File,
  contentType: string,
): Promise<Blob | null> {
  try {
    return contentType.startsWith("video/")
      ? await videoThumbnail(file)
      : await imageThumbnail(file);
  } catch {
    return null;
  }
}
