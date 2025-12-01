import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SHEET_ID =
  process.env.PUBLIC_SHEET_ID || "1G5B2A6PmhiQAZa3rRKPTor2scTEzSmeiWuYm1JyI8cw";
const SHEET_TABS = ["Databases", "Precedents", "Tools"];

async function fetchSheet(sheetId, tab) {
  const url = `https://opensheet.elk.sh/${sheetId}/${encodeURIComponent(tab)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed (${res.status}) to fetch tab '${tab}'`);
  }
  return await res.json();
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

function normalizeImageUrl(imageUrl, baseUrl) {
  if (imageUrl.startsWith("//")) {
    return `https:${imageUrl}`;
  }
  if (imageUrl.startsWith("/")) {
    const urlObj = new URL(baseUrl);
    return `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
  }
  if (!imageUrl.startsWith("http")) {
    const urlObj = new URL(baseUrl);
    return `${urlObj.protocol}//${urlObj.host}/${imageUrl}`;
  }
  return imageUrl;
}

async function extractOgImage(url) {
  try {
    const { data } = await fetchUrl(url);

    // Look for og:image meta tag
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

    // Look for twitter:image as fallback
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

    // Skip apple-touch-icon and favicons - they're too small
    // We'll take a screenshot instead for better quality

    // Look for first img tag with reasonable size
    const imgMatches = data.matchAll(
      /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi
    );
    for (const match of imgMatches) {
      const imgTag = match[0];
      const imgSrc = match[1];

      // Skip tiny images, icons, and common ad/tracking pixels
      if (
        imgSrc.includes("icon") ||
        (imgSrc.includes("logo") && imgSrc.includes("small")) ||
        imgSrc.includes("1x1") ||
        imgSrc.includes("pixel") ||
        imgSrc.includes("spacer")
      ) {
        continue;
      }

      // Check if image has width/height attributes suggesting it's substantial
      const widthMatch = imgTag.match(/width=["']?(\d+)/i);
      const heightMatch = imgTag.match(/height=["']?(\d+)/i);

      if (widthMatch && heightMatch) {
        const width = parseInt(widthMatch[1]);
        const height = parseInt(heightMatch[1]);
        if (width >= 200 && height >= 200) {
          return normalizeImageUrl(imgSrc, url);
        }
      } else {
        // No size info, try it anyway
        return normalizeImageUrl(imgSrc, url);
      }
    }

    // No image found, will take screenshot
    return null;
  } catch (error) {
    console.error(`  ✗ Failed to fetch ${url}:`, error.message);
    return null;
  }
}

async function takeScreenshot(url, outputPath) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630 });

    // Set a shorter timeout and handle failures gracefully
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await page.screenshot({
      path: outputPath,
      type: "jpeg",
      quality: 85,
    });

    return true;
  } catch (error) {
    console.error(`    ✗ Screenshot failed: ${error.message}`);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function main() {
  const dataDir = path.join(__dirname, "../src/data");
  const screenshotsDir = path.join(__dirname, "../public/screenshots");
  const imagesFile = path.join(dataDir, "images.json");

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log("Fetching OG images for all entries...\n");

  const allImages = {};

  for (const tab of SHEET_TABS) {
    try {
      console.log(`Processing ${tab}...`);
      const filename = path.join(dataDir, `${tab.toLowerCase()}.json`);

      if (!fs.existsSync(filename)) {
        console.log(`  ✗ Data file not found, skipping`);
        continue;
      }

      const rows = JSON.parse(fs.readFileSync(filename, "utf-8"));
      allImages[tab] = {};

      for (const row of rows) {
        const link = row["Link"] || row["link"];
        const title = row["Title"] || row["title"] || "Unknown";

        if (link && /^https?:\/\//i.test(link)) {
          const url = link.split("\n")[0].trim();
          console.log(`  Fetching image for: ${title}`);

          // First try to extract OG image or other meta images
          const imageUrl = await extractOgImage(url);

          if (imageUrl) {
            allImages[tab][url] = imageUrl;
            console.log(`    ✓ Found: ${imageUrl}`);
          } else {
            // Take screenshot if no image found
            console.log(`    → Taking screenshot...`);
            const safeFilename = url
              .replace(/https?:\/\//g, "")
              .replace(/[^a-z0-9]/gi, "_")
              .substring(0, 100);
            const screenshotPath = path.join(
              screenshotsDir,
              `${safeFilename}.jpg`
            );

            const success = await takeScreenshot(url, screenshotPath);
            if (success) {
              const screenshotUrl = `/screenshots/${safeFilename}.jpg`;
              allImages[tab][url] = screenshotUrl;
              console.log(`    ✓ Screenshot saved`);
            } else {
              console.log(`    ✗ Could not capture screenshot`);
            }
          }

          // Small delay to be respectful
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      console.log(`✓ Processed ${tab}\n`);
    } catch (error) {
      console.error(`✗ Failed to process ${tab}:`, error.message);
    }
  }

  fs.writeFileSync(imagesFile, JSON.stringify(allImages, null, 2), "utf-8");
  console.log(`\n✓ Saved image data to ${imagesFile}`);
  console.log("Done!");
}

main();
