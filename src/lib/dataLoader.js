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
