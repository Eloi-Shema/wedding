# 💍 Wedding Photos App

A mobile-first photo sharing app for weddings. Guests scan a QR code → open in browser → upload photos → everyone sees them in real time. No app install needed. Photos stored in Cloudinary.

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Cloudinary credentials

1. Log into [cloudinary.com](https://cloudinary.com)
2. Go to **Settings → Access Keys** (or the Dashboard)
3. Copy your **Cloud name**, **API Key**, and **API Secret**
4. In the Media Library, create a folder (e.g. `wedding`)

### 3. Environment variables

Create `.env.local` in the project root:

```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=wedding
```

### 4. Customize

In `src/app/page.tsx`:
- Change `"Our Wedding Day"` to the couple's names
- The background image is `public/inn.jpg` — swap it for any photo you like

### 5. Run locally

```bash
pnpm dev
```

---

## Deploy to Vercel

1. Push repo to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Add the 4 `CLOUDINARY_*` env vars in the Vercel dashboard
4. Deploy — you get a URL like `yourname.vercel.app`

---

## Generate the QR code

Go to [qr-code-generator.com](https://qr-code-generator.com), enter your Vercel URL, download and print. Put it on tables, the bar, everywhere.

---

## Notes

- Max size for each file: 10MB
- Cloudinary free tier: 25GB storage, plenty for a wedding
- Gallery auto-refreshes every 30 seconds
- After the wedding, download your full folder from the Cloudinary Media Library
