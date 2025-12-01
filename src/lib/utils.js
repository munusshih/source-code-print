export const isURL = (str) => {
  if (!str) return false;
  return /^https?:\/\//i.test(String(str));
};

export const extractDomain = (url) => {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export const truncate = (text, maxLength = 200) => {
  const str = String(text);
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength).trim() + "...";
};
