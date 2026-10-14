const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export function parseIndianRent(text: string): number | null {
  const cleaned = text.replace(/<[^>]+>/g, " ").replace(/,/g, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  const lac = cleaned.match(/₹?\s*([\d.]+)\s*(lacs?|lakhs?)\b/i);
  if (lac) {
    const n = Number(lac[1]) * 100_000;
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  const crore = cleaned.match(/₹?\s*([\d.]+)\s*(cr|crores?)\b/i);
  if (crore) {
    const n = Number(crore[1]) * 10_000_000;
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  const rupees = cleaned.match(/₹\s*([\d.]+)/);
  if (rupees) {
    const n = Number(rupees[1]);
    if (Number.isFinite(n) && n >= 4_000 && n <= 300_000) return Math.round(n);
  }
  return null;
}

export function parseBhk(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 8) {
    return value;
  }
  const text = String(value ?? "").trim();
  if (!text) return null;
  const lone = text.match(/^([1-8])(?:\s*BHK)?$/i);
  if (lone) return Number(lone[1]);
  const bhk = text.match(/(\d+)\s*BHK/i) ?? text.match(/BHK\s*(\d+)/i);
  if (bhk) {
    const n = Number(bhk[1]);
    return n >= 1 && n <= 8 ? n : null;
  }
  if (/\bRK\b/i.test(text) || /^RK\d+$/i.test(text)) return 1;
  const typed = text.match(/^BHK(\d+)$/i);
  if (typed) {
    const n = Number(typed[1]);
    return n >= 1 && n <= 8 ? n : null;
  }
  return null;
}

export function parseRentAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return plausibleRent(value, null) ? Math.round(value) : null;
  }
  if (typeof value === "string") {
    const compact = value.replace(/,/g, "").trim();
    if (/^\d+(\.\d+)?$/.test(compact)) {
      const n = Number(compact);
      return plausibleRent(n, null) ? Math.round(n) : parseIndianRent(value);
    }
    return parseIndianRent(value);
  }
  return null;
}

export function parseEpoch(value: unknown): string | null {
  const n = Number(value);
  if (Number.isFinite(n) && n > 1_000_000_000) {
    const ms = n < 1e12 ? n * 1000 : n;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

export function parsePostedLabel(label: string, now = Date.now()): string | null {
  const stripped = label.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!stripped) return null;
  // "Updated today" is a bump of an older ad, not the original post date.
  if (/^updated\b/i.test(stripped)) return null;
  const text = stripped
    .replace(/^(posted)\s*:?\s*/i, "")
    .trim()
    .toLowerCase();
  if (!text) return null;
  if (text === "today") return new Date(now).toISOString();
  if (text === "yesterday") return new Date(now - 86_400_000).toISOString();
  const days = text.match(/^(\d+)\s+days?\s+ago$/);
  if (days) return new Date(now - Number(days[1]) * 86_400_000).toISOString();
  const weeks = text.match(/^(\d+)\s+weeks?\s+ago$/);
  if (weeks) return new Date(now - Number(weeks[1]) * 7 * 86_400_000).toISOString();
  const named = text.match(/^([a-z]{3})\s+(\d{1,2}),?\s+'?(\d{2,4})$/i);
  if (named) {
    const month = MONTHS[named[1]!.slice(0, 3)];
    if (month == null) return null;
    let year = Number(named[3]);
    if (year < 100) year += 2000;
    const date = new Date(Date.UTC(year, month, Number(named[2])));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return parseEpoch(label);
}

export function postedWithinTwoWeeks(iso: string | null, now = Date.now()) {
  if (!iso) return false;
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return false;
  const age = now - time;
  return age >= -86_400_000 && age <= TWO_WEEKS_MS;
}

export function matchesArea(queryArea: string, ...values: Array<string | null | undefined>) {
  const area = queryArea.trim().toLowerCase();
  if (!area) return false;
  const haystack = values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replaceAll("whitefeild", "whitefield");
  if (haystack.includes(area)) return true;
  const tokens = area.split(/[^a-z0-9]+/).filter((token) => token.length > 2);
  if (tokens.length === 0) return haystack.includes(area);
  return tokens.every((token) => haystack.includes(token));
}

export function plausibleRent(rent: number | null, bhk: number | null) {
  if (rent == null || rent < 4_000 || rent > 300_000) return false;
  if (bhk && bhk <= 2 && rent > 150_000) return false;
  if (bhk && bhk >= 3 && rent < 12_000) return false;
  if (bhk && bhk >= 4 && rent < 18_000) return false;
  return true;
}

export function parseSqft(text: string): number | null {
  const match = text.replace(/,/g, "").match(/(\d+)\s*(sq\.?\s*ft|sqft)/i);
  if (!match) return null;
  const n = Number(match[1]);
  return n >= 100 && n <= 20_000 ? n : null;
}
