/**
 * Islamic day boundary helpers.
 *
 * In the Hijri calendar the day starts at Maghrib (sunset). We use Maghrib
 * as the boundary for all streak and completion tracking:
 *
 *   before today's Maghrib → effective date = today's local calendar date
 *   after  today's Maghrib → effective date = tomorrow's local calendar date
 *
 * This also fixes the pre-existing UTC bug: the old code used
 * `new Date().toISOString().split("T")[0]` which returns the UTC date, so
 * users in UTC+N timezones had completions attributed to the wrong local day.
 * All dates are now derived from the device's local clock.
 */

/**
 * Returns the "Islamic day" date string (YYYY-MM-DD, local time).
 * Falls back to local midnight when no maghrib time is available.
 */
export function getEffectiveDate(maghrib: Date | null): string {
  const now = new Date();
  let base: Date;

  if (maghrib && now >= maghrib) {
    // Past Maghrib — the new Hijri day has started; attribute to tomorrow's date.
    base = new Date(now);
    base.setDate(base.getDate() + 1);
  } else {
    base = now;
  }

  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const d = String(base.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Minutes remaining until Maghrib. Returns null if time unavailable, 0 if already past. */
export function minutesUntilMaghrib(maghrib: Date | null): number | null {
  if (!maghrib) return null;
  return Math.max(0, Math.floor((maghrib.getTime() - Date.now()) / 60_000));
}

/** True when Maghrib is within `warningMinutes` AND hasn't passed yet. */
export function isApproachingMaghrib(maghrib: Date | null, warningMinutes = 90): boolean {
  const mins = minutesUntilMaghrib(maghrib);
  return mins !== null && mins > 0 && mins <= warningMinutes;
}

/** True if today's Maghrib has already passed. */
export function isPastMaghrib(maghrib: Date | null): boolean {
  if (!maghrib) return false;
  return Date.now() >= maghrib.getTime();
}

/** Seconds remaining until Maghrib (for a live countdown). */
export function secondsUntilMaghrib(maghrib: Date | null): number | null {
  if (!maghrib) return null;
  return Math.max(0, Math.ceil((maghrib.getTime() - Date.now()) / 1_000));
}

/** Format a Date as YYYY-MM-DD using local (not UTC) clock. */
export function localDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
