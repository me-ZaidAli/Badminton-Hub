export const UK_TZ = "Europe/London";

function ukParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

function londonOffsetMinutesAt(utcDate: Date): number {
  const p = ukParts(utcDate);
  const utcAsIfLondon = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((utcAsIfLondon - utcDate.getTime()) / 60000);
}

export function londonInputsToUtcISO(date: string, time: string): string | null {
  if (!date || !time) return null;
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  if (![y, mo, d, h, mi].every(Number.isFinite)) return null;
  let guess = new Date(Date.UTC(y, (mo || 1) - 1, d || 1, h || 0, mi || 0, 0));
  for (let i = 0; i < 3; i++) {
    const offset = londonOffsetMinutesAt(guess);
    const corrected = new Date(Date.UTC(y, (mo || 1) - 1, d || 1, h || 0, mi || 0, 0) - offset * 60000);
    if (corrected.getTime() === guess.getTime()) break;
    guess = corrected;
  }
  return guess.toISOString();
}

export function londonLocalStringToUtcISO(localStr: string): string | null {
  if (!localStr) return null;
  const [date, time] = localStr.split("T");
  return londonInputsToUtcISO(date, (time || "").slice(0, 5));
}

export function utcToLondonInputs(utc: Date | string | null | undefined): { date: string; time: string } {
  if (!utc) return { date: "", time: "" };
  const d = typeof utc === "string" ? new Date(utc) : utc;
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const p = ukParts(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
  };
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function londonDayOfWeek(d: Date): number {
  const p = ukParts(d);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
}

export function formatLondon(utc: Date | string | null | undefined, pattern: string): string {
  if (!utc) return "";
  const d = typeof utc === "string" ? new Date(utc) : utc;
  if (Number.isNaN(d.getTime())) return "";
  const p = ukParts(d);
  const dow = londonDayOfWeek(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  const h12 = ((p.hour + 11) % 12) + 1;
  const ampm = p.hour < 12 ? "am" : "pm";
  const map: Record<string, string> = {
    yyyy: String(p.year),
    yy: String(p.year).slice(-2),
    MMMM: MONTH_LONG[p.month - 1],
    MMM: MONTH_SHORT[p.month - 1],
    MM: pad(p.month),
    dd: pad(p.day),
    d: String(p.day),
    EEEE: DOW_LONG[dow],
    EEE: DOW_SHORT[dow],
    HH: pad(p.hour),
    H: String(p.hour),
    mm: pad(p.minute),
    hh: pad(h12),
    h: String(h12),
    a: ampm,
  };
  const tokens = ["yyyy", "yy", "MMMM", "MMM", "MM", "dd", "EEEE", "EEE", "HH", "hh", "mm", "a", "d", "h", "H"];
  let out = pattern;
  for (const t of tokens) {
    out = out.split(t).join(`\u0000${t}\u0000`);
  }
  return out
    .split("\u0000")
    .map(seg => (map[seg] !== undefined ? map[seg] : seg))
    .join("");
}

export function formatLondonDateTime(utc: Date | string | null | undefined): string {
  return formatLondon(utc, "EEE dd MMM yyyy HH:mm");
}

export function formatLondonShort(utc: Date | string | null | undefined): string {
  return formatLondon(utc, "dd MMM yyyy HH:mm");
}

export function formatLondonTime(utc: Date | string | null | undefined): string {
  return formatLondon(utc, "HH:mm");
}

export function formatLondonDate(utc: Date | string | null | undefined): string {
  return formatLondon(utc, "EEE dd MMM yyyy");
}

export function isLondonBst(utc: Date | string | null | undefined): boolean {
  if (!utc) return false;
  const d = typeof utc === "string" ? new Date(utc) : utc;
  if (Number.isNaN(d.getTime())) return false;
  return londonOffsetMinutesAt(d) === 60;
}

export function ukTimeZoneLabel(utc?: Date | string | null): string {
  return isLondonBst(utc ?? new Date()) ? "BST" : "GMT";
}
