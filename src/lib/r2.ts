import { S3Client } from "@aws-sdk/client-s3";

// R2 speaks the S3 API, so we use the AWS SDK pointed at Cloudflare's endpoint.
export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export const BUCKET = process.env.R2_BUCKET!;

// Public base URL of the bucket (custom domain or the r2.dev URL), no trailing slash.
export const PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
