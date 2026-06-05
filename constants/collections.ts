/**
 * Collections — curated sets of sunnahs surfaced on the Learn tab.
 *
 * Membership is hand-picked by `slug` (not derived from a single `category`)
 * because the collections are conceptual groupings — "The 40" and
 * "Ḥiṣn al-Muslim" span multiple categories, while Akhlāq folds character +
 * social manners together. Slugs are listed in the order they should appear.
 *
 * Display text (title / subtitle / description) lives in `constants/i18n.ts`
 * under `t.collections[key]`; this file holds only structure.
 */

import type { Colors } from "@/constants/theme";

export type CollectionKey = "the40" | "qudsi" | "hisn" | "akhlaq" | "food";

export type AccentKey = "ink" | "emerald" | "rose" | "gold";

export interface CollectionDef {
  key:    CollectionKey;
  icon:   string;     // Feather icon name
  accent: AccentKey;
  /** "sunnah" = curated practice slugs; "hadith" = read-only hadith set. */
  kind:   "sunnah" | "hadith";
  slugs?: string[];            // kind === "sunnah"
  hadithCollection?: string;   // kind === "hadith" → public.hadiths.collection
}

export const COLLECTION_ORDER: CollectionKey[] = ["the40", "qudsi", "hisn", "akhlaq", "food"];

export const COLLECTIONS: Record<CollectionKey, CollectionDef> = {
  // Imam al-Nawawī's Forty (42) Hadith — read-only hadith content.
  the40: {
    key:    "the40",
    icon:   "book-open",
    accent: "ink",
    kind:   "hadith",
    hadithCollection: "nawawi40",
  },

  // Forty Hadith Qudsī — sacred narrations in which Allah ﷻ speaks in first person.
  qudsi: {
    key:    "qudsi",
    icon:   "star",
    accent: "gold",
    kind:   "hadith",
    hadithCollection: "qudsi40",
  },

  // Remembrances & supplications — the Fortress of the Muslim.
  hisn: {
    key:    "hisn",
    icon:   "shield",
    accent: "emerald",
    kind:   "sunnah",
    slugs: [
      "morning-adhkar", "evening-adhkar", "sleep-adhkar", "ayat-kursi-fajr",
      "ayat-kursi-prayer", "ayat-kursi-sleep", "muawwidhat-fajr",
      "al-baqarah-last-2", "subhanallah-100", "istighfar-100", "tasbeeh-prayer",
      "bismillah-enter-home", "dua-leaving-home", "mirror-dua",
      "dua-last-hour-friday", "alhamdulillah-sneeze", "salawat",
    ],
  },

  // Character & manners — character + social categories combined.
  akhlaq: {
    key:    "akhlaq",
    icon:   "heart",
    accent: "rose",
    kind:   "sunnah",
    slugs: [
      "smile", "spread-salam", "sadaqah", "remove-harm", "jazakallah",
      "alhamdulillah-sneeze", "salawat", "salawat-friday", "right-shoe-first",
      "bismillah-enter-home", "dua-leaving-home", "mirror-dua",
    ],
  },

  // Sunnah at the table.
  food: {
    key:    "food",
    icon:   "coffee",
    accent: "gold",
    kind:   "sunnah",
    slugs: ["bismillah-eating", "alhamdulillah-eating", "eat-right-hand", "drink-three-sips"],
  },
};

/** Resolve a collection's accent key to a concrete color for the current theme. */
export function collectionAccent(accent: AccentKey, c: Colors): string {
  switch (accent) {
    case "emerald": return c.green;
    case "rose":    return c.rose;
    case "gold":    return c.gold;
    case "ink":
    default:        return c.ink;
  }
}
