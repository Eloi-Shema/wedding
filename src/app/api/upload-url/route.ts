import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET } from "@/src/lib/r2";
import { ALLOWED_TYPES, MAX_FILE_BYTES } from "@/src/lib/config";

export const runtime = "nodejs";

const MAX_FILES_PER_REQUEST = 50;
const URL_LIFETIME_SECONDS = 60 * 60; // big videos on slow networks need time

// Without this the presigner only signs the "host" header, so a client coul upload any Content-Type (e.g. HTML) to a key we named ".jpg".
const SIGN_OPTIONS = {
  expiresIn: URL_LIFETIME_SECONDS,
  signableHeaders: new Set(["content-type"]),
};

type FileMeta = { type: string; size: number };

export async function POST(req: Request) {
  let files: FileMeta[];
  try {
    ({ files } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (
    !Array.isArray(files) ||
    files.length === 0 ||
    files.length > MAX_FILES_PER_REQUEST
  ) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // One entry per requested file, in the same order. A bad file gets an error instead of URLs, so it never blocks the good ones.
  const results = await Promise.all(
    files.map(async (f) => {
      const ext = ALLOWED_TYPES[f?.type];
      if (!ext) return { error: "Unsupported file type." };

      if (
        typeof f.size !== "number" ||
        f.size <= 0 ||
        f.size > MAX_FILE_BYTES
      ) {
        return { error: "File is too large." };
      }

      const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
      const key = `uploads/${id}.${ext}`;
      const thumbKey = `thumbs/${id}.jpg`;

      const [uploadUrl, thumbUploadUrl] = await Promise.all([
        getSignedUrl(
          r2,
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            ContentType: f.type,
          }),
          SIGN_OPTIONS,
        ),
        getSignedUrl(
          r2,
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: thumbKey,
            ContentType: "image/jpeg",
          }),
          SIGN_OPTIONS,
        ),
      ]);

      return { key, uploadUrl, thumbUploadUrl };
    }),
  );

  return NextResponse.json({ files: results });
}
