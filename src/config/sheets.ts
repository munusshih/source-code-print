export const SHEET_ID =
    import.meta.env.PUBLIC_SHEET_ID ||
    '1G5B2A6PmhiQAZa3rRKPTor2scTEzSmeiWuYm1JyI8cw';

// Use provided tab names, with env override if needed
const envTabs = (import.meta.env.PUBLIC_SHEET_TABS || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

export const SHEET_TABS = envTabs.length > 0
    ? envTabs
    : ['Databases', 'Precedents', 'Tools'];
