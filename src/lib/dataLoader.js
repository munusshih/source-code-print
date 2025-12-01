import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const loadTabData = (tabs) => {
  const tabData = {};

  for (const tab of tabs) {
    try {
      const filename = path.join(
        __dirname,
        `../data/${tab.toLowerCase()}.json`
      );
      if (fs.existsSync(filename)) {
        const content = fs.readFileSync(filename, "utf-8");
        const rows = JSON.parse(content);
        tabData[tab] = { rows };
      } else {
        tabData[tab] = {
          error: `Data file not found. Run 'npm run fetch' first.`,
        };
      }
    } catch (e) {
      tabData[tab] = { error: e.message };
    }
  }

  return tabData;
};
