import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(__dirname, "../src/data/data.json");
const screenshotsDir = path.join(__dirname, "../public/screenshots");

function parseArgs(argv) {
  const options = {
    refresh: false,
    limit: Number.POSITIVE_INFINITY,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--refresh") {
      options.refresh = true;
      continue;
    }

    if (arg === "--limit" && argv[i + 1]) {
      options.limit = Number(argv[i + 1]) || Number.POSITIVE_INFINITY;
      i += 1;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      options.limit = Number(arg.slice("--limit=".length)) || Number.POSITIVE_INFINITY;
    }
  }

  return options;
}

function loadData() {
  if (!fs.existsSync(dataFile)) {
    throw new Error("data.json not found. Run `npm run fetch` first.");
  }

  const parsed = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
  const items = Array.isArray(parsed.items) ? parsed.items : [];

  return {
    ...parsed,
    items,
  };
}

function saveData(payload) {
  const next = {
    ...payload,
    updatedAt: new Date().toISOString(),
    count: payload.items.length,
  };

  fs.writeFileSync(dataFile, JSON.stringify(next, null, 2), "utf-8");
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, { timeout: 10000 }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ data, headers: res.headers }));
      })
      .on("error", reject)
      .on("timeout", () => reject(new Error("Request timeout")));
  });
}

async function downloadImage(imageUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const client = imageUrl.startsWith("https") ? https : http;
    client
      .get(imageUrl, { timeout: 10000 }, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          downloadImage(res.headers.location, outputPath)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Failed with status ${res.statusCode}`));
          return;
        }

        const file = fs.createWriteStream(outputPath);
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(true);
        });
        file.on("error", reject);
      })
      .on("error", reject)
      .on("timeout", () => reject(new Error("Request timeout")));
  });
}

function getImageExtension(imageUrl) {
  try {
    const pathname = new URL(imageUrl).pathname;
    const match = pathname.match(/\.([a-z0-9]+)(?:\?|$)/i);
    return match ? match[1].toLowerCase() : "jpg";
  } catch {
    return "jpg";
  }
}

function normalizeImageUrl(imageUrl, baseUrl) {
  try {
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    if (imageUrl.startsWith("//")) {
      return "https:" + imageUrl;
    }

    if (imageUrl.startsWith("/")) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${imageUrl}`;
    }

    const base = new URL(baseUrl);
    const basePath = base.pathname.split("/").slice(0, -1).join("/");
    return `${base.protocol}//${base.host}${basePath}/${imageUrl}`;
  } catch {
    return null;
  }
}

async function extractOgImage(url) {
  try {
    const { data } = await fetchUrl(url);

    const ogImageMatch =
      data.match(
        /<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i
      ) ||
      data.match(
        /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i
      );

    if (ogImageMatch) {
      return normalizeImageUrl(ogImageMatch[1], url);
    }

    const twitterImageMatch =
      data.match(
        /<meta\s+(?:property|name)=["']twitter:image["']\s+content=["']([^"']+)["']/i
      ) ||
      data.match(
        /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']twitter:image["']/i
      );

    if (twitterImageMatch) {
      return normalizeImageUrl(twitterImageMatch[1], url);
    }

    const imgMatches = data.matchAll(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi);
    for (const match of imgMatches) {
      const imgTag = match[0];
      const imgSrc = match[1];

      if (
        imgSrc.includes("icon") ||
        (imgSrc.includes("logo") && imgSrc.includes("small")) ||
        imgSrc.includes("1x1") ||
        imgSrc.includes("pixel") ||
        imgSrc.includes("spacer")
      ) {
        continue;
      }

      const widthMatch = imgTag.match(/width=["']?(\d+)/i);
      const heightMatch = imgTag.match(/height=["']?(\d+)/i);

      if (widthMatch && heightMatch) {
        const width = Number(widthMatch[1]);
        const height = Number(heightMatch[1]);
        if (width >= 200 && height >= 200) {
          return normalizeImageUrl(imgSrc, url);
        }
      } else {
        return normalizeImageUrl(imgSrc, url);
      }
    }

    return null;
  } catch (error) {
    console.error(`  ✗ Failed to parse page ${url}: ${error.message}`);
    return null;
  }
}

function toLocalImagePath(itemId, extension) {
  const safeId = String(itemId)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .slice(0, 120);
  const ext = extension || "jpg";
  return {
    filePath: path.join(screenshotsDir, `${safeId}.${ext}`),
    publicPath: `/screenshots/${safeId}.${ext}`,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const payload = loadData();
  const items = payload.items;

  const candidates = items.filter((item) => {
    if (!item?.link || !/^https?:\/\//i.test(item.link)) return false;
    if (options.refresh) return true;
    return !item.image || String(item.image).trim() === "";
  });

  const limited = Number.isFinite(options.limit)
    ? candidates.slice(0, Math.max(0, options.limit))
    : candidates;

  console.log("Fetching images for data.json entries...");
  console.log(`- refresh: ${options.refresh ? "yes" : "no"}`);
  console.log(`- total candidates: ${candidates.length}`);
  console.log(`- processing now: ${limited.length}`);

  let updatedCount = 0;

  for (const item of limited) {
    console.log(`\n[${item.type}] ${item.title}`);
    const imageUrl = await extractOgImage(item.link);

    if (!imageUrl) {
      console.log("  ⊘ No downloadable image found");
      continue;
    }

    const extension = getImageExtension(imageUrl);
    const { filePath, publicPath } = toLocalImagePath(item.id, extension);

    try {
      await downloadImage(imageUrl, filePath);
      item.image = publicPath;
      updatedCount += 1;
      console.log(`  ✓ Saved ${publicPath}`);
    } catch (error) {
      console.log(`  ✗ Download failed (${error.message}); using source URL`);
      item.image = imageUrl;
      updatedCount += 1;
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  if (updatedCount > 0) {
    saveData(payload);
    console.log(`\n✓ Updated ${updatedCount} item(s) in data.json`);
  } else {
    console.log("\nNo image updates applied.");
  }
}

main();
