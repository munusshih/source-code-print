# Source Code Print

Minimal Astro setup using:
- One canonical data file: `src/data/data.json`
- Astro Content Layer (`file()` loader) for rendering

## Setup

```bash
npm install
npm run sync
```

## Commands

```bash
npm run check:updates         # Compare Google Sheet vs local data.json, no writes
npm run check:updates:strict  # Same check, exits non-zero when changes exist
npm run fetch                 # Pull sheet, compute diff, write data.json if changed
npm run fetch:images          # Fill missing images in data.json + save local files
npm run sync                  # fetch + fetch:images
npm run dev                   # Start Astro dev server
npm run build                 # Runs sync, then Astro build
npm run preview               # Preview build
```

## Replace Sheet ID Easily

Use either method:

```bash
# One-off via arg
npm run check:updates -- --sheet-id=YOUR_SHEET_ID
npm run fetch -- --sheet-id=YOUR_SHEET_ID

# One-off via env var (works well for sync/build too)
PUBLIC_SHEET_ID=YOUR_SHEET_ID npm run sync
```

Optional tab override:

```bash
npm run fetch -- --tabs=Databases,Precedents,Tools
```

## Project Structure

```text
scripts/
  fetch-sheets.js
  fetch-images.js

src/
  content.config.ts
  data/
    data.json
  pages/
    index.astro

public/
  screenshots/
```
