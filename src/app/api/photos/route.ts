import { NextResponse } from "next/server";
import cloudinary, { FOLDER } from "@/src/lib/cloudinary";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Fetch images and videos in two separate searches
    const [imageResult, videoResult] = await Promise.all([
      cloudinary.search
        .expression(`folder:${FOLDER} AND resource_type:image`)
        .sort_by("created_at", "desc")
        .max_results(200)
        .execute(),
      cloudinary.search
        .expression(`folder:${FOLDER} AND resource_type:video`)
        .sort_by("created_at", "desc")
        .max_results(50)
        .execute(),
    ]);

    const mapAsset = (asset: {
      public_id: string;
      created_at: string;
      secure_url: string;
      resource_type: string;
    }) => ({
      id: asset.public_id,
      createdTime: asset.created_at,
      type: asset.resource_type as "image" | "video", // passed to frontend to decide <img> vs <video>
      url: asset.secure_url,
      thumbnail:
        asset.resource_type === "video"
          ? // For videos: grab a frame at 1s as the poster image
            cloudinary.url(asset.public_id, {
              resource_type: "video",
              format: "jpg", // extract a JPEG frame
              start_offset: "1", // at 1 second in
              width: 400,
              height: 400,
              crop: "fill",
              secure: true,
            })
          : cloudinary.url(asset.public_id, {
              width: 400,
              height: 400,
              crop: "fill",
              quality: "auto",
              fetch_format: "auto",
              secure: true,
            }),
    });

    // Merge and re-sort by date descending
    const photos = [...imageResult.resources, ...videoResult.resources]
      .map(mapAsset)
      .sort(
        (a, b) =>
          new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime(),
      );

    return NextResponse.json({ photos });
  } catch (err) {
    console.error("Fetch photos error:", err);
    return NextResponse.json(
      { error: "Could not load photos." },
      { status: 500 },
    );
  }
}
