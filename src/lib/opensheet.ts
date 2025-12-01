export async function fetchSheet(sheetId, tab) {
    const url = `https://opensheet.elk.sh/${sheetId}/${encodeURIComponent(tab)}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed (${res.status}) to fetch tab '${tab}'`);
    }
    return await res.json();
}
