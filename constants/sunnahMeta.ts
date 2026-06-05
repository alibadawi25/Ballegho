/**
 * Sunnah metadata — category + time-of-day display maps.
 *
 * Pairs each DB enum value (category / time_of_day) with its bilingual label
 * and a Feather icon. Kept here (not in i18n.ts) because the label is bound to
 * an icon, mirroring the existing pattern in `app/sunnah/[id].tsx`.
 *
 * The Arabic labels follow the project rule: no letterSpacing / textTransform —
 * render them with the `*Ar` style variants in components.
 */

import type { GroupKey } from "@/hooks/useSunnahs";

export interface MetaEntry {
  en:   string;
  ar:   string;
  icon: string; // Feather icon name
}

// ── Categories (public.sunnahs.category) ──────────────────────────────────────
// Only the categories actually seeded in the database are listed. Unknown
// values fall back gracefully via CATEGORY_FALLBACK in consumers.

export const CATEGORY_META: Record<string, MetaEntry> = {
  quran:       { en: "Qurʾān",      ar: "القرآن",     icon: "book-open" },
  prayer:      { en: "Prayer",      ar: "الصلاة",     icon: "compass"   },
  character:   { en: "Akhlāq",      ar: "الأخلاق",    icon: "heart"     },
  food:        { en: "Food",        ar: "الطعام",     icon: "coffee"    },
  social:      { en: "Social",      ar: "الاجتماعي",  icon: "users"     },
  cleanliness: { en: "Cleanliness", ar: "الطهارة",    icon: "droplet"   },
  sleep:       { en: "Sleep",       ar: "النوم",      icon: "moon"      },
};

// Preferred order for filter pills (categories missing from the data are skipped).
export const CATEGORY_ORDER = [
  "prayer", "quran", "character", "food", "social", "cleanliness", "sleep",
] as const;

// ── Time-of-day groups (matches the home checklist grouping) ───────────────────

export const GROUP_META: Record<GroupKey, MetaEntry> = {
  morning: { en: "Morning", ar: "الصباح", icon: "sun"      },
  daily:   { en: "Daily",   ar: "اليومي", icon: "activity" },
  evening: { en: "Evening", ar: "المساء", icon: "sunset"   },
  night:   { en: "Night",   ar: "الليل",  icon: "moon"     },
};

export const GROUP_ORDER: GroupKey[] = ["morning", "daily", "evening", "night"];
