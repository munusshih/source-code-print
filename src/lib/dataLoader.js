import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const loadTabData = (tabs) => {
  const tabData = {};

  for (const tab of tabs) {
    try {
      // Try multiple possible paths for data files
      const possiblePaths = [
        path.join(__dirname, `../data/${tab.toLowerCase()}.json`),
        path.join(process.cwd(), `src/data/${tab.toLowerCase()}.json`),
      ];

      let filename = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          filename = p;
          break;
        }
      }

      if (filename) {
        const content = fs.readFileSync(filename, "utf-8");
        const rows = JSON.parse(content);
        tabData[tab] = { rows };
      } else {
        tabData[tab] = {
          error: `Data file not found. Tried: ${possiblePaths.join(", ")}`,
        };
      }
    } catch (e) {
      tabData[tab] = { error: e.message };
    }
  }

  return tabData;
};

// Auto-generate boolean fields from loaded data
export function extractBooleanFields(tabData) {
  const booleanFieldCandidates = new Set();

  // Scan all tabs for fields that have true/false values
  for (const tabName in tabData) {
    const { rows } = tabData[tabName];
    if (!Array.isArray(rows)) continue;

    // Look at first few rows to identify boolean fields
    for (const row of rows.slice(0, 5)) {
      for (const [key, value] of Object.entries(row)) {
        if (
          value === true ||
          value === false ||
          value === "TRUE" ||
          value === "FALSE" ||
          value === "true" ||
          value === "false"
        ) {
          booleanFieldCandidates.add(key);
        }
      }
    }
  }

  // Filter to only fields that have values across multiple rows
  const fieldCounts = {};
  for (const tabName in tabData) {
    const { rows } = tabData[tabName];
    if (!Array.isArray(rows)) continue;

    for (const row of rows) {
      for (const field of booleanFieldCandidates) {
        const value = row[field];
        if (
          value === true ||
          value === false ||
          value === "TRUE" ||
          value === "FALSE" ||
          value === "true" ||
          value === "false"
        ) {
          fieldCounts[field] = (fieldCounts[field] || 0) + 1;
        }
      }
    }
  }

  // Return fields that appear as boolean in at least 2 records
  return Object.entries(fieldCounts)
    .filter(([_, count]) => count >= 2)
    .map(([field, _]) => field)
    .sort();
}
