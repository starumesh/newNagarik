export const WEB_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-IN,en;q=0.9",
};

export async function fetchText(
  url: string,
  extra: Record<string, string> = {}
) {
  const response = await fetch(url, {
    headers: { ...WEB_HEADERS, ...extra },
    signal: AbortSignal.timeout(18000),
  });
  if (!response.ok) return "";
  return response.text();
}

export async function fetchJson<T>(
  url: string,
  extra: Record<string, string> = {}
): Promise<T | null> {
  const response = await fetch(url, {
    headers: {
      ...WEB_HEADERS,
      Accept: "application/json,text/plain,*/*",
      ...extra,
    },
    signal: AbortSignal.timeout(18000),
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function decodeEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");
}
