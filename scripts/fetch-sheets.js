import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../src/data");
const dataFile = path.join(dataDir, "data.json");

const DEFAULT_SHEET_ID =
  "1G5B2A6PmhiQAZa3rRKPTor2scTEzSmeiWuYm1JyI8cw";
const DEFAULT_TABS = ["Databases", "Precedents", "Tools"];

function parseArgs(argv) {
  const options = {
    checkOnly: false,
    failOnChange: false,
    sheetId: "",
    tabs: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--check-only") {
      options.checkOnly = true;
      continue;
    }

    if (arg === "--fail-on-change") {
      options.failOnChange = true;
      continue;
    }

    if (arg === "--sheet-id" && argv[i + 1]) {
      options.sheetId = argv[i + 1].trim();
      i += 1;
      continue;
    }

    if (arg.startsWith("--sheet-id=")) {
      options.sheetId = arg.slice("--sheet-id=".length).trim();
      continue;
    }

    if (arg === "--tabs" && argv[i + 1]) {
      options.tabs = argv[i + 1]
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      i += 1;
      continue;
    }

    if (arg.startsWith("--tabs=")) {
      options.tabs = arg
        .slice("--tabs=".length)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }

  return options;
}

function resolveSheetId(options) {
  return options.sheetId || process.env.PUBLIC_SHEET_ID || DEFAULT_SHEET_ID;
}

function resolveTabs(options) {
  if (options.tabs.length > 0) return options.tabs;

  const envTabs = (process.env.PUBLIC_SHEET_TABS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return envTabs.length > 0 ? envTabs : DEFAULT_TABS;
}

async function fetchSheet(sheetId, tab) {
  const url = `https://opensheet.elk.sh/${sheetId}/${encodeURIComponent(tab)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed (${response.status}) to fetch tab '${tab}'`);
  }

  return response.json();
}

function normalizeString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function getCaseInsensitive(row, fieldName) {
  const target = fieldName.toLowerCase();

  for (const [key, value] of Object.entries(row || {})) {
    if (key.toLowerCase() === target) return value;
  }

  return "";
}

function normalizeLink(rawLink) {
  const firstLine = normalizeString(rawLink).split("\n")[0].trim();
  return /^https?:\/\//i.test(firstLine) ? firstLine : "";
}

function normalizeFields(row) {
  const fields = {};

  for (const [key, value] of Object.entries(row || {})) {
    const normalizedKey = key.toLowerCase();

    if (normalizedKey === "title" || normalizedKey === "link") {
      continue;
    }

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) continue;
      fields[key] = trimmed;
      continue;
    }

    fields[key] = value;
  }

  return fields;
}

function slugify(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function buildItemId(type, link, title, fallbackIndex) {
  const typeSlug = slugify(type) || "records";
  const identity = slugify(link || title) || `item-${fallbackIndex}`;
  return `${typeSlug}-${identity}`;
}

function ensureUniqueId(baseId, usedIds) {
  if (!usedIds.has(baseId)) {
    usedIds.add(baseId);
    return baseId;
  }

  let suffix = 2;
  let candidate = `${baseId}-${suffix}`;

  while (usedIds.has(candidate)) {
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }

  usedIds.add(candidate);
  return candidate;
}

function normalizeForDiff(item) {
  const sortedFields = {};

  for (const key of Object.keys(item.fields || {}).sort()) {
    const value = item.fields[key];
    sortedFields[key] = typeof value === "string" ? value.trim() : value;
  }

  return {
    id: item.id,
    type: item.type,
    title: item.title,
    link: item.link,
    fields: sortedFields,
  };
}

function loadExistingData() {
  if (!fs.existsSync(dataFile)) {
    return { sheetId: "", tabs: [], updatedAt: "", count: 0, items: [] };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    return {
      sheetId: normalizeString(parsed.sheetId),
      tabs: Array.isArray(parsed.tabs) ? parsed.tabs : [],
      updatedAt: normalizeString(parsed.updatedAt),
      count: Number(parsed.count || items.length),
      items,
    };
  } catch {
    return { sheetId: "", tabs: [], updatedAt: "", count: 0, items: [] };
  }
}

function computeDiff(oldItems, newItems) {
  const oldMap = new Map(oldItems.map((item) => [item.id, item]));
  const newMap = new Map(newItems.map((item) => [item.id, item]));

  const byType = {};
  const getTypeBucket = (type) => {
    if (!byType[type]) {
      byType[type] = { added: 0, updated: 0, removed: 0, unchanged: 0 };
    }
    return byType[type];
  };

  let added = 0;
  let updated = 0;
  let removed = 0;
  let unchanged = 0;

  for (const [id, nextItem] of newMap) {
    const bucket = getTypeBucket(nextItem.type);
    const prevItem = oldMap.get(id);

    if (!prevItem) {
      added += 1;
      bucket.added += 1;
      continue;
    }

    const prevComparable = JSON.stringify(normalizeForDiff(prevItem));
    const nextComparable = JSON.stringify(normalizeForDiff(nextItem));

    if (prevComparable !== nextComparable) {
      updated += 1;
      bucket.updated += 1;
      continue;
    }

    unchanged += 1;
    bucket.unchanged += 1;
  }

  for (const [id, prevItem] of oldMap) {
    if (newMap.has(id)) continue;
    removed += 1;
    getTypeBucket(prevItem.type).removed += 1;
  }

  return {
    totals: { added, updated, removed, unchanged },
    byType,
    hasChanges: added > 0 || updated > 0 || removed > 0,
  };
}

function printDiff(diff) {
  const { totals, byType } = diff;

  console.log("\nDiff summary:");
  console.log(
    `- added: ${totals.added}, updated: ${totals.updated}, removed: ${totals.removed}, unchanged: ${totals.unchanged}`
  );

  for (const type of Object.keys(byType).sort()) {
    const bucket = byType[type];
    console.log(
      `- ${type}: +${bucket.added} ~${bucket.updated} -${bucket.removed} =${bucket.unchanged}`
    );
  }
}

function buildNewItems(sheetRowsByTab, existingItems) {
  const existingById = new Map(existingItems.map((item) => [item.id, item]));
  const existingImageByLink = new Map(
    existingItems
      .filter((item) => normalizeString(item.link) && normalizeString(item.image))
      .map((item) => [item.link, item.image])
  );

  const usedIds = new Set();
  const items = [];

  for (const [type, rows] of Object.entries(sheetRowsByTab)) {
    rows.forEach((row, index) => {
      const rawTitle = getCaseInsensitive(row, "Title");
      const title = normalizeString(rawTitle) || "Untitled";
      const link = normalizeLink(getCaseInsensitive(row, "Link"));

      const baseId = buildItemId(type, link, title, index + 1);
      const id = ensureUniqueId(baseId, usedIds);

      const existing = existingById.get(id);
      const imageFromLink = link ? existingImageByLink.get(link) || "" : "";

      items.push({
        id,
        type,
        title,
        link,
        image: normalizeString(existing?.image) || normalizeString(imageFromLink),
        fields: normalizeFields(row),
      });
    });
  }

  return items;
}

function writeDataFile({ sheetId, tabs, items }) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const payload = {
    sheetId,
    tabs,
    updatedAt: new Date().toISOString(),
    count: items.length,
    items,
  };

  fs.writeFileSync(dataFile, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`\n✓ Saved ${dataFile} (${items.length} items)`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sheetId = resolveSheetId(options);
  const tabs = resolveTabs(options);

  console.log("Syncing Google Sheet data...");
  console.log(`- sheetId: ${sheetId}`);
  console.log(`- tabs: ${tabs.join(", ")}`);
  if (options.checkOnly) {
    console.log("- mode: check-only");
  }

  const existingData = loadExistingData();
  const sheetRowsByTab = {};

  for (const tab of tabs) {
    try {
      const rows = await fetchSheet(sheetId, tab);
      sheetRowsByTab[tab] = Array.isArray(rows) ? rows : [];
      console.log(`✓ Fetched ${tab} (${sheetRowsByTab[tab].length} rows)`);
    } catch (error) {
      console.error(`✗ Failed to fetch ${tab}: ${error.message}`);
      process.exit(1);
    }
  }

  const newItems = buildNewItems(sheetRowsByTab, existingData.items);
  const diff = computeDiff(existingData.items, newItems);
  const metadataChanged =
    existingData.sheetId !== sheetId ||
    JSON.stringify(existingData.tabs) !== JSON.stringify(tabs);

  printDiff(diff);

  if (!diff.hasChanges && !metadataChanged) {
    console.log("\nNo sheet changes detected.");

    if (options.failOnChange) {
      process.exit(0);
    }

    return;
  }

  if (options.checkOnly) {
    console.log("\nUpdates available. Run `npm run fetch` to apply.");

    if (options.failOnChange) {
      process.exit(2);
    }

    return;
  }

  writeDataFile({ sheetId, tabs, items: newItems });
}

main();
