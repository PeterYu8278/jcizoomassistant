/**
 * App timezone: Asia/Kuala_Lumpur (UTC+8)
 * All date/time display and interpretation use this timezone for consistency with Zoom.
 */
export const APP_TIMEZONE = "Asia/Kuala_Lumpur";

/** Get today's date (YYYY-MM-DD) in app timezone */
export const getTodayInAppTz = (): string => {
  const now = new Date();
  const s = now.toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
  return s; // "YYYY-MM-DD"
};

/** Parse date + startTime (HH:mm) as Asia/Kuala_Lumpur, return Date for comparison */
export const parseAsAppTz = (date: string, startTime: string): Date => {
  const d = new Date(`${date}T${startTime}:00+08:00`);
  return d;
};

/** Zoom API returns start_time in UTC. Parse as UTC (append Z if no timezone). */
const parseAsUtc = (s: string): Date => {
  const t = (s || "").trim();
  if (!t) return new Date(NaN);
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(t)) return new Date(t);
  return new Date(t + "Z");
};

/** Convert UTC ISO string (e.g. from Zoom) to { date, startTime } in app timezone */
export const utcToAppTz = (utcIso: string): { date: string; startTime: string } => {
  const d = parseAsUtc(utcIso);
  const datePart = d.toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE }); // YYYY-MM-DD
  const timePart = d.toLocaleTimeString("en-CA", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }); // HH:mm or HH:mm:ss
  const [h, m] = timePart.split(":").map(Number);
  const startTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return { date: datePart, startTime };
};

/** Get current hour and minute in app timezone (for "now" indicator) */
export const nowInAppTz = (): { hours: number; minutes: number } => {
  const now = new Date();
  const s = now.toLocaleTimeString("en-CA", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [h, m] = s.split(":").map(Number);
  return { hours: h, minutes: m };
};
