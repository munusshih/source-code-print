// Sheet configuration
const SHEET_ID =
    import.meta.env.PUBLIC_SHEET_ID ||
    "1G5B2A6PmhiQAZa3rRKPTor2scTEzSmeiWuYm1JyI8cw";

const envTabs = (import.meta.env.PUBLIC_SHEET_TABS || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

export const SHEET_TABS = envTabs.length > 0
    ? envTabs
    : ["Databases", "Precedents", "Tools"];

// Fetch sheet data from OpenSheet
export async function fetchSheet(sheetId: string, tab: string) {
    const url = `https://opensheet.elk.sh/${sheetId}/${encodeURIComponent(tab)}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed (${res.status}) to fetch tab '${tab}'`);
    }
    return await res.json();
}

// Auto-generate boolean fields from loaded data
export function extractBooleanFields(allTabsData: Record<string, any[]>): string[] {
    const booleanFieldCandidates = new Set<string>();

    // Scan all tabs for fields that have true/false values
    for (const tabName in allTabsData) {
        const rows = allTabsData[tabName];
        if (!Array.isArray(rows)) continue;

        // Look at first few rows to identify boolean fields
        for (const row of rows.slice(0, 5)) {
            for (const [key, value] of Object.entries(row)) {
                if (value === true || value === false || value === "TRUE" || value === "FALSE" || value === "true" || value === "false") {
                    booleanFieldCandidates.add(key);
                }
            }
        }
    }

    // Filter to only fields that have values across multiple rows
    const fieldCounts: Record<string, number> = {};
    for (const tabName in allTabsData) {
        const rows = allTabsData[tabName];
        if (!Array.isArray(rows)) continue;

        for (const row of rows) {
            for (const field of booleanFieldCandidates) {
                const value = row[field];
                if (value === true || value === false || value === "TRUE" || value === "FALSE" || value === "true" || value === "false") {
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
