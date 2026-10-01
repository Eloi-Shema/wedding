# 💍 Wedding Photos App

A mobile-first wedding photo sharing app. Guests scan a QR code, open the page, upload photos, and see a live gallery. No app install is required.

This project uses Next.js and stores uploaded media in Cloudflare R2.

---

## Features

- Mobile-friendly upload flow for guests
- Automatic thumbnail generation for images
- Gallery view with polling refresh
- Download links for uploaded originals
- Supports common image and video formats

---

## Prerequisites

- Node.js 20+
- pnpm
- A Cloudflare account with an R2 bucket
- A public bucket URL, custom domain, or R2.dev URL

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create your Cloudflare R2 bucket

1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com)
2. Open the R2 section
3. Create a new bucket, for example `wedding-photos`
4. Create an API token with permission to read and write objects in that bucket
5. Copy the following values:
   - Account ID
   - Access Key ID
   - Secret Access Key
   - Bucket name
   - Public URL for the bucket

### 3. Environment variables

The app expects these variables:

```bash
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET=your_bucket_name
R2_PUBLIC_URL=https://your-bucket.public.r2.dev
```

If you use a custom domain instead of the default R2.dev URL, set `R2_PUBLIC_URL` to that domain.

### 4. Customize the page

In `src/app/page.tsx`:

- Change `"Our Wedding Day"` to the couple's names
- Replace the background image in `public/` if you want a different hero photo

### 5. Run locally

```bash
pnpm dev
```

Then open the local URL shown in the terminal.

---

## Deploy to Vercel

1. Push the project to GitHub
2. Import it in [Vercel](https://vercel.com)
3. Add the same `R2_*` variables in the Vercel project settings
4. Deploy the app
5. Use the resulting URL in your QR code

---

## Generate the QR code

Go to a QR code generator, enter your deployed app URL, then print and place it on tables, the bar, or the welcome area.

---

## Notes

- The app accepts files up to 300MB per upload in the current codebase
- Supported file types include common image and video formats
- The gallery refreshes automatically while guests are browsing
- You can use a custom domain for `R2_PUBLIC_URL` if you want a branded photo URL
