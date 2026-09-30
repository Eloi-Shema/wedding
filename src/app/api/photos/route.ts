import { NextResponse } from "next/server";
import { ListObjectsV2Command, type _Object } from "@aws-sdk/client-s3";
import { r2, BUCKET, PUBLIC_URL } from "@/src/lib/r2";
import { VIDEO_EXTENSIONS } from "@/src/lib/config";

export const runtime = "nodejs";

const MAX_LISTED = 5000;

async function listAll(prefix: string): Promise<_Object[]> {
  const objects: _Object[] = [];
  let token: string | undefined;
  do {
    const res = await r2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    objects.push(...(res.Contents ?? []));
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token && objects.length < MAX_LISTED);
  return objects;
}

export async function GET() {
  try {
    const [uploads, thumbs] = await Promise.all([
      listAll("uploads/"),
      listAll("thumbs/"),
    ]);

    // thumbs/<id>.jpg belongs to uploads/<id>.<ext>
    const thumbIds = new Set(
      thumbs.flatMap((t) =>
        t.Key ? [t.Key.slice("thumbs/".length).replace(/\.jpg$/, "")] : [],
      ),
    );

    const photos = uploads
      .flatMap((o) => {
        if (!o.Key || !o.LastModified) return [];
        const file = o.Key.slice("uploads/".length);
        const dot = file.lastIndexOf(".");
        if (dot < 1) return [];
        const id = file.slice(0, dot);
        const type = VIDEO_EXTENSIONS.has(file.slice(dot + 1).toLowerCase())
          ? "video"
          : "image";
        const url = `${PUBLIC_URL}/${o.Key}`;

        return [
          {
            id: o.Key,
            createdTime: o.LastModified.toISOString(),
            type: type as "image" | "video",
            url,
            // No thumbnail: fall back to the full image; videos get a placeholder tile.
            thumbnail: thumbIds.has(id)
              ? `${PUBLIC_URL}/thumbs/${id}.jpg`
              : type === "image"
                ? url
                : null,
          },
        ];
      })
      .sort(
        (a, b) =>
          new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime(),
      );

    return NextResponse.json(
      { photos },
      {
        // Every guest's gallery polls this. Let the CDN answer most of them
        // so R2 only gets listed every ~10s (LIST calls count against the free tier).
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      },
    );
  } catch (err) {
    console.error("Fetch photos error:", err);
    return NextResponse.json(
      { error: "Could not load photos." },
      { status: 500 },
    );
  }
}
