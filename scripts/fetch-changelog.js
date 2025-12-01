import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const changelogDataPath = path.join(__dirname, "changelog-data.json");

function getGitLog() {
  try {
    const gitLog = execSync(
      'git log --pretty=format:"%h|%ai|%s|%b" --reverse',
      { encoding: "utf-8", cwd: path.join(__dirname, "..") }
    );
    return gitLog;
  } catch (error) {
    console.error("Error reading git log:", error.message);
    return "";
  }
}

function parseGitLog(log) {
  const entries = [];
  const lines = log.split("\n").filter((line) => line.trim());

  let currentCommit = null;

  for (const line of lines) {
    const parts = line.split("|");
    if (parts.length >= 3) {
      const hash = parts[0];
      const dateStr = parts[1];
      const subject = parts[2];
      const body = parts[3] || "";

      const date = new Date(dateStr);
      const formattedDate = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (!currentCommit || currentCommit.date !== formattedDate) {
        if (currentCommit) {
          entries.push(currentCommit);
        }
        currentCommit = {
          date: formattedDate,
          dateObj: date,
          commits: [],
          isGit: true,
        };
      }

      currentCommit.commits.push({
        hash,
        subject,
        body: body.trim(),
      });
    }
  }

  if (currentCommit) {
    entries.push(currentCommit);
  }

  return entries;
}

async function main() {
  console.log("Extracting git changelog...");

  const log = getGitLog();
  if (!log) {
    console.error("Failed to read git log");
    process.exit(1);
  }

  const gitEntries = parseGitLog(log);

  // Read existing manual entries
  let data = { manual: [] };

  if (fs.existsSync(changelogDataPath)) {
    data = JSON.parse(fs.readFileSync(changelogDataPath, "utf-8"));
  }

  // Add git entries to the data
  data.git = gitEntries.map((entry) => ({
    date: entry.date,
    commits: entry.commits,
  }));

  // Write the combined data
  fs.writeFileSync(changelogDataPath, JSON.stringify(data, null, 2), "utf-8");

  const totalCommits = gitEntries.reduce((sum, e) => sum + e.commits.length, 0);
  console.log(
    `✓ Updated changelog-data.json with ${gitEntries.length} git date entries (${totalCommits} commits)`
  );
}

main();

// Old functions below (kept for reference, not used)
function generateGitMarkdown(entries) {
  let markdown = "";

  // Reverse to show newest first
  const reversedEntries = entries.reverse();

  for (const entry of reversedEntries) {
    markdown += `<div class="group-card">

<div class="sidebar">

### ${entry.date}

</div>

<div class="content">

`;

    for (const commit of entry.commits) {
      markdown += `- **${commit.subject}**`;
      if (commit.body) {
        markdown += `\n  ${commit.body.replace(/\n/g, "\n  ")}`;
      }
      markdown += "\n";
    }

    markdown += `
</div>

</div>

`;
  }

  return markdown;
}

function readChangelogWithMarkers() {
  const changelogPath = path.join(__dirname, "../src/pages/changelog.md");
  if (!fs.existsSync(changelogPath)) {
    return null;
  }
  return fs.readFileSync(changelogPath, "utf-8");
}

function hasManualMarkers(content) {
  return (
    content.includes("<!-- MANUAL_START -->") &&
    content.includes("<!-- MANUAL_END -->") &&
    content.includes("<!-- GIT_START -->") &&
    content.includes("<!-- GIT_END -->")
  );
}

function extractManualEntries(content) {
  const manualStart = content.indexOf("<!-- MANUAL_START -->");
  const manualEnd = content.indexOf("<!-- MANUAL_END -->");

  if (manualStart === -1 || manualEnd === -1) {
    return [];
  }

  const manualContent = content.substring(manualStart + 21, manualEnd);
  const manualEntries = [];

  const cardRegex =
    /<div class="group-card">[\s\S]*?### (.*?)\n[\s\S]*?<\/div>\s*<\/div>/g;
  let match;

  while ((match = cardRegex.exec(manualContent)) !== null) {
    const dateStr = match[1].trim();
    const dateObj = new Date(dateStr);

    manualEntries.push({
      date: dateStr,
      dateObj: dateObj,
      isGit: false,
      originalHtml: match[0],
    });
  }

  return manualEntries;
}

function mergeAndSort(manualEntries, gitEntries) {
  const allEntries = [...manualEntries, ...gitEntries];

  // Sort by date descending (newest first)
  allEntries.sort((a, b) => b.dateObj - a.dateObj);

  return allEntries;
}

function buildChangelogWithMarkers(sortedEntries) {
  let manualMarkdown = "";
  let gitMarkdown = "";

  // Separate and sort manual and git entries independently by date descending
  const manualEntries = sortedEntries.filter((e) => !e.isGit);
  const gitEntries = sortedEntries.filter((e) => e.isGit);

  // Build manual section
  for (const entry of manualEntries) {
    manualMarkdown += `${entry.originalHtml}\n\n`;
  }

  // Build git section
  for (const entry of gitEntries) {
    gitMarkdown += `<div class="group-card">

<div class="sidebar">

### ${entry.date}

</div>

<div class="content">

`;

    for (const commit of entry.commits) {
      gitMarkdown += `- **${commit.subject}**`;
      if (commit.body) {
        gitMarkdown += `\n  ${commit.body.replace(/\n/g, "\n  ")}`;
      }
      gitMarkdown += "\n";
    }

    gitMarkdown += `
</div>

</div>

`;
  }

  const content = `---
title: Changelog
slug: changelog
layout: ../layouts/BaseLayout.astro
---

# Changelog

<!-- MANUAL_START -->
${manualMarkdown}<!-- MANUAL_END -->

<!-- GIT_START -->
${gitMarkdown}<!-- GIT_END -->`;

  return content;
}

function appendGitToExisting(existingContent, gitMarkdown) {
  // If file already has git entries, remove them and replace
  if (
    existingContent.includes("<!-- GIT_START -->") &&
    existingContent.includes("<!-- GIT_END -->")
  ) {
    const gitStart = existingContent.indexOf("<!-- GIT_START -->");
    const gitEnd =
      existingContent.indexOf("<!-- GIT_END -->") + "<!-- GIT_END -->".length;
    const beforeGit = existingContent.substring(0, gitStart);
    return (
      beforeGit +
      `<!-- GIT_START -->
${gitMarkdown}<!-- GIT_END -->`
    );
  }

  // Otherwise just append
  return (
    existingContent +
    `

<!-- GIT_START -->
${gitMarkdown}<!-- GIT_END -->`
  );
}
