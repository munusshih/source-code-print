import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

async function main() {
  const dataDir = path.join(__dirname, "../src/data");

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log("Fetching sheets...");

  for (const tab of SHEET_TABS) {
    try {
      console.log(`Fetching ${tab}...`);
      const rows = await fetchSheet(SHEET_ID, tab);
      const json = JSON.stringify(rows, null, 2);
      const filename = path.join(dataDir, `${tab.toLowerCase()}.json`);
      fs.writeFileSync(filename, json, "utf-8");
      console.log(`✓ Saved ${tab} (${rows.length} entries)`);
    } catch (error) {
      console.error(`✗ Failed to fetch ${tab}:`, error.message);
    }
  }

  console.log("\nDone!");
}

main();
