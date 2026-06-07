/**
 * Eastern Arabic-Indic numeral helpers.
 *
 * In the Arabic UI, numbers must render as ٠١٢٣٤٥٦٧٨٩ — never Western digits.
 * Render Arabic-Indic digits with the system font (Georgia / Fraunces have no
 * Arabic glyphs) and never apply fontWeight or letterSpacing to them.
 *
 * This was previously duplicated inline across screens (streaks, hadith,
 * favorites, collection). Import from here instead.
 */

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** Convert a number (or numeric string) to Eastern Arabic-Indic digits. */
export function toArabicDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => AR_DIGITS[+d]);
}

/** Localise a number: Arabic-Indic digits when RTL, Western otherwise. */
export function localizeNumber(n: number | string, isRTL: boolean): string {
  return isRTL ? toArabicDigits(n) : String(n);
}
