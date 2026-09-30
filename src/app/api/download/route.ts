import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET } from "@/src/lib/r2";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key") ?? "";

  // Only files guests uploaded, so this can't be used to sign arbitrary keys.
  if (!/^uploads\/[\w-]+\.[a-z0-9]+$/i.test(key)) {
    return NextResponse.json({ error: "Invalid file." }, { status: 400 });
  }

  const filename = `wedding-${key.slice("uploads/".length)}`;
  const url = await getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    }),
    { expiresIn: 300 },
  );

  return NextResponse.redirect(url, 302);
}
