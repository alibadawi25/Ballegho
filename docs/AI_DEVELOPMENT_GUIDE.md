# Ballegho — AI Development Guide

> This file tells any AI agent (Claude, Copilot, Cursor, etc.) how to work effectively
> in this codebase. Read this before writing any code.

---

## First: Read the Versioned Docs

> **Expo SDK 54** — always check https://docs.expo.dev/versions/v54.0.0/ before writing Expo-specific code.
> APIs, hooks, and configs change between SDK versions. Never assume.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Expo (React Native) | ~54.0.35 |
| Language | TypeScript | ~5.9.2 |
| Navigation | Expo Router | ~6.0.24 |
| Styling | NativeWind + StyleSheet | ^4.1.23 |
| Backend | Supabase (PostgreSQL + Auth) | ^2.49.8 |
| Fonts | expo-font + Google Fonts | ~14.0.12 |
| Icons | @expo/vector-icons (Feather) | (bundled) |
| SVG | react-native-svg | ^15.12.1 |
| Prayer times | adhan | ^4.4.3 |
| Location | expo-location | ~19.0.8 |
| Time picker | @react-native-community/datetimepicker | ^9.1.0 |

---

## Project Structure

```
app/
  _layout.tsx         Root layout: fonts, AuthGate, routing
  (auth)/             Unauthenticated screens (welcome, sign-in, sign-up)
  (onboarding)/       6-step onboarding flow — wrapped in OnboardingProvider
  (tabs)/             Main app: home (index), profile
  sunnah/
    [id].tsx          Sunnah detail page — push from home checklist

components/
  home/
    SunnahChecklist.tsx   SunnahGroup + SunnahRow + DayProgress
  onboarding/
    OnboardingShell.tsx   Progress bar + back button for steps 2–5
  DifficultyRatingCard.tsx  "After 7 days — how natural is this?" prompt
  Galabeya.tsx          Gold SVG mascot (4 moods: idle|happy|streak|sleeping)
  PrayerStrip.tsx       Prayer times card used on home screen

contexts/
  AuthContext.tsx         Session, signIn, signUp, signOut
  SettingsContext.tsx     langPref, themePref, calcMethod — persisted to AsyncStorage
  OnboardingContext.tsx   Shared state across onboarding steps (in-memory only)

hooks/
  useLang.ts            Returns { lang, t, isRTL, isDark } — use this everywhere
  useSunnahs.ts         Active sunnahs + today's completions + global streak
  useDifficultyRating.ts  Detects unrated sunnahs with 3+ completions
  usePrayerTimes.ts     Calculates live prayer times from location + calc method

constants/
  theme.ts    ★ Canonical design tokens: PALETTE, NIGHT, colors(), TYPE, SPACE, RADIUS
  i18n.ts     All strings: { en: {...}, ar: {...} } — add new keys here, both languages

lib/
  supabase.ts   Supabase client singleton (EXPO_PUBLIC_ env vars, AsyncStorage session)

docs/
  APP_CONCEPT.md          Full app vision and philosophy
  AI_DEVELOPMENT_GUIDE.md This file
  DESIGN_SYSTEM.md        Visual design, DB schema, navigation map, personalization
```

---

## Routing & Auth

### Route groups

```
(auth)       → unauthenticated. Entry: welcome → sign-in / sign-up
(onboarding) → runs once after account creation. Entry: step0, exits to (tabs) from step6
(tabs)       → main authenticated app. Currently: index (home), profile
sunnah/[id]  → sunnah detail — root-level Stack screen (keeps tab bar hidden on detail)
```

### AuthGate (in `app/_layout.tsx`)

```
No session                          → replace("/(auth)/welcome")
Session + onboarding_complete=false → replace("/(onboarding)/step0")
Session + onboarding_complete=true  → stays wherever user is (tabs, sunnah detail, etc.)
```

**Key rule:** AuthGate only redirects when the user is on an *auth or onboarding* screen with a completed session.
It does NOT redirect when the user is navigating between app routes (tabs ↔ sunnah detail).

AuthGate re-queries the DB only when crossing the auth/onboarding ↔ app zone boundary,
not on every navigation — this prevents loading overlays during in-app navigation.

### Adding a new tab

1. Create `app/(tabs)/newscreen.tsx`
2. Add `<Tabs.Screen name="newscreen" .../>` in `app/(tabs)/_layout.tsx`
3. Add i18n key in `constants/i18n.ts` for the tab label (both en + ar)
4. Use the `useLang()` hook for the title

### Adding a new root-level screen (like sunnah detail)

1. Create `app/myscreen/[param].tsx`
2. Add `<Stack.Screen name="myscreen/[param]" options={{ headerShown: false }} />` in `app/_layout.tsx`
3. Navigate with: `router.push({ pathname: "/myscreen/[param]", params: { param: value } })`

---

## Colors — use `constants/theme.ts`

**Never hardcode hex values outside `constants/theme.ts`.**

```tsx
import { colors, NIGHT } from "@/constants/theme";
import { useLang } from "@/hooks/useLang";

// App screens (support dark/light mode):
const { isDark } = useLang();
const c = colors(isDark);
<View style={{ backgroundColor: c.bg }}>

// Auth / onboarding screens (always dark):
const C = NIGHT;
<View style={{ backgroundColor: C.bg }}>
```

`colors(isDark)` returns: `bg, surface, surfaceDim, ink, inkMuted, inkFaint, gold, rose, green, divider`

`NIGHT` returns: `bg, bgDeep, surface, ink, muted, faint, gold, error, divider`

---

## Arabic Text — Critical Rules

**NEVER do any of these to Arabic text:**

```tsx
// ❌ Breaks letter connections (ligatures become disconnected)
letterSpacing: 0.3

// ❌ Meaningless in Arabic, distorts glyphs
textTransform: "uppercase"

// ❌ Synthesised bold distorts Arabic glyphs
fontWeight: "600"   // on system font Arabic text

// ❌ "System" is not a valid fontFamily — omit fontFamily entirely
fontFamily: "System"
```

**Correct patterns:**

```tsx
// ✅ Arabic display/hadith text
{ fontFamily: "Amiri_400Regular", fontSize: 19, lineHeight: 34, writingDirection: "rtl" }

// ✅ Arabic UI body text (let system font handle it)
{ fontSize: 15, lineHeight: 24 }  // no fontFamily, no letterSpacing

// ✅ Conditional letterSpacing — use spread, not ternary
...(isRTL ? {} : { letterSpacing: 1.4 })   // ✅
letterSpacing: isRTL ? 0 : 1.4              // ❌ still applies it to Arabic

// ✅ Style pairs — use exclusive (not merged) when base has letterSpacing/textTransform
<Text style={isRTL ? styles.titleAr : styles.titleEn}>    // ✅
<Text style={[styles.titleEn, isRTL && styles.titleAr]}>  // ❌ bleed-through
```

---

## i18n Conventions

All user-facing strings in `constants/i18n.ts`:

```ts
export const strings = {
  en: { greeting: "As-salāmu ʿalaykum", ... },
  ar: { greeting: "السَّلَامُ عَلَيْكُم", ... },
}
```

Access via `useLang()`:
```tsx
const { t, isRTL } = useLang();
<Text>{t.greeting}</Text>
<Text>{isRTL ? t.sunnah.hadithLabel : t.sunnah.hadithLabel}</Text>
```

Adding new strings:
1. Add key + value to `strings.en`
2. Add same key + value to `strings.ar`
3. TypeScript will error if the shapes don't match

**Never do:** `isRTL ? "دخول" : "Sign in"` inline in JSX — put it in i18n.ts.

---

## Supabase Patterns

### Client

```tsx
import { supabase } from "@/lib/supabase";
```

### ⚠️ CRITICAL: Split queries for `user_sunnah_stats`

`user_sunnah_stats` has **no foreign key to `user_sunnahs`**. They both reference `sunnahs`
and `profiles` independently. PostgREST can only auto-join tables with a direct FK.

**If you nest them in one query, you will get a 400 Bad Request and data will be null silently.**

```tsx
// ❌ FAILS — 400 from PostgREST, data is null, nothing renders
const { data } = await supabase
  .from("user_sunnahs")
  .select(`id, sunnah_id, user_sunnah_stats (current_streak)`);  // no FK!

// ✅ CORRECT — two queries, merge by sunnah_id in JS
const [{ data: sunnahRows }, { data: statsRows }] = await Promise.all([
  supabase.from("user_sunnahs").select("id, sunnah_id, ..."),
  supabase.from("user_sunnah_stats").select("sunnah_id, current_streak, ...").eq("user_id", user.id),
]);
const statsMap = new Map(statsRows?.map(s => [s.sunnah_id, s]) ?? []);
// Then: const stats = statsMap.get(row.sunnah_id);
```

See `hooks/useSunnahs.ts` for the full implementation of this pattern.

### Standard query

```tsx
const { data, error } = await supabase
  .from("table_name")
  .select("col1, col2, related_table(col3)")   // only tables with direct FK
  .eq("user_id", user.id)
  .order("position");
```

### Always use RLS — never bypass it.

### Tables (public schema)

| Table | Purpose | Notes |
|---|---|---|
| `profiles` | User info (id = auth.users.id, name) | Created by DB trigger on signup |
| `user_streaks` | current_streak, longest_streak, last_activity_date | Created by trigger |
| `sunnahs` | Master list of 42+ sunnahs | Public read-only, RLS: `true` |
| `user_sunnahs` | User's active sunnah list | is_active, is_anchor, position |
| `user_sunnah_stats` | Per-sunnah stats per user | No FK to user_sunnahs — query separately |
| `daily_completions` | Daily check-off records | (user_id, sunnah_id, completed_date) |
| `user_behavioral_profile` | Onboarding data + behavioral signals | onboarding_complete here |
| `adhkar_sessions` | Dhikr tap counts (JSONB) | Not yet implemented in app |

### Auto-creation trigger

On user signup, `handle_new_user()` runs and creates:
- `profiles` row
- `user_streaks` row (streak starts at 0)
- `user_behavioral_profile` row (onboarding_complete = false)

`user_sunnah_stats` rows are created when the first completion is recorded via the
`record_sunnah_completion` RPC.

### RPCs used

| RPC | When called | What it does |
|---|---|---|
| `record_sunnah_completion` | On sunnah check | Updates user_sunnah_stats for that sunnah |
| `update_user_streak` | On sunnah check | Updates user_streaks.current_streak |
| `recompute_difficulty` | On difficulty rating | Blends self-rating with derived difficulty |

---

## Key Hooks

### `useSunnahs()`

The main data hook for the home screen. Returns:
```ts
{
  groups: SunnahGroups          // morning/daily/evening/night
  completedIds: Set<string>     // sunnah_ids done today (optimistic)
  anchorId: string | null       // user's anchor sunnah
  loading: boolean
  totalCount: number
  doneCount: number
  currentStreak: number         // from user_streaks (live, updates on completion)
  longestStreak: number
  complete(sunnahId): void      // optimistic → writes to DB
  uncomplete(sunnahId): void    // optimistic → deletes from DB
  reload(): void                // re-fetch all (call from useFocusEffect)
}
```

Uses 4 parallel queries: user_sunnahs, user_sunnah_stats, daily_completions, user_streaks.

### `useLang()`

Every component should use this instead of reading context directly:
```ts
{ lang: "ar"|"en", t: Strings, isRTL: boolean, isDark: boolean }
```

### `useDifficultyRating()`

Detects sunnahs with 3+ completions and no self-rating. Returns `pending` sunnah or null.
Home screen shows `<DifficultyRatingCard>` when `pending` is non-null.

---

## State Management

No global state library. Uses React Context + hooks:

| Context | What it holds | Persisted? |
|---|---|---|
| `AuthContext` | session, user, sign-in/up/out | AsyncStorage via Supabase |
| `SettingsContext` | langPref, themePref, calcMethod | AsyncStorage |
| `OnboardingContext` | wakeTime, selectedIds, anchorId, etc. | No — in-memory only |

---

## Styling Conventions

### Primary: `StyleSheet.create()` with theme colors

```tsx
import { colors, NIGHT } from "@/constants/theme";
const c = colors(isDark);  // or NIGHT for fixed-dark screens

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  title:     { fontFamily: "Georgia", fontSize: 26, color: c.ink },
});
```

### Section eyebrows (UPPERCASE labels above cards)

Always create two style variants — never apply one unconditionally:

```tsx
// StyleSheet
eyebrowEn: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.2 },
eyebrowAr: { fontFamily: "Amiri_400Regular", fontSize: 13, textAlign: "right", writingDirection: "rtl" },

// Usage
<Text style={isRTL ? styles.eyebrowAr : styles.eyebrowEn}>{label}</Text>
```

### RTL layout flipping

```tsx
flexDirection: isRTL ? "row-reverse" : "row"
alignItems:    isRTL ? "flex-end"    : "flex-start"
textAlign:     isRTL ? "right"       : "left"
```

### NativeWind: Available but used sparingly

Prefer `StyleSheet` for complex styles. NativeWind for quick layout utilities only.

---

## Common Pitfalls

### 1. npm install — always use `--legacy-peer-deps`
```bash
npm install some-package --legacy-peer-deps
```

### 2. Metro cache — clear when things are broken
```bash
npx expo start --clear
```

### 3. Supabase nested join fails silently
If a query returns `null` data without an error, the most likely cause is a nested join
between tables that don't have a direct FK relationship. Split into separate queries.
**The known case: `user_sunnah_stats` nested inside `user_sunnahs`.**

### 4. AuthGate redirect loop
If the app keeps redirecting, check that new root-level routes are NOT in the `(auth)` or
`(onboarding)` group. AuthGate only redirects when `segments[0]` is `"(auth)"` or `"(onboarding)"`.
Routes like `sunnah/[id]` are fine — they're in neither group.

### 5. Arabic text breaking
Check for: `letterSpacing`, `textTransform`, `fontWeight > "400"` on system-font Arabic,
or `fontFamily: "System"`. All cause visual glitches. The rule is strict: omit these
entirely for Arabic, don't set them to 0 or "none".

### 6. Reanimated worklets
The babel worklets plugin is NOT configured. Do not use `useAnimatedStyle`,
`useSharedValue`, or any Reanimated worklet APIs. Use React Native's built-in
`Animated` API instead.

### 7. Supabase email confirmation (development)
The free plan rate-limits to 4 confirmations/hour. Email confirmation is currently
**disabled** on this project — users get a session immediately on signup.
If you see `"Email not confirmed"` errors, check Supabase Dashboard → Auth → Email.

---

## Adding a New Screen

1. Create file in the appropriate route group
2. Export a default React component
3. Colors: `const c = colors(isDark)` from `constants/theme.ts`
4. Strings: add to `i18n.ts`, access via `useLang().t`
5. Data: create a hook in `hooks/` — never query Supabase directly in components
6. Root-level routes: add `<Stack.Screen name="...">` to `app/_layout.tsx`

---

## Adding a New Sunnah

Sunnahs are seeded in the database. To add:

```sql
INSERT INTO public.sunnahs (
  slug, name_en, name_ar, category, time_of_day,
  estimated_seconds, difficulty_base,
  hadith_text_en, hadith_text_ar, hadith_source,
  sort_order
) VALUES (
  'my-sunnah-slug',
  'English name',
  'الاسم العربي',
  'prayer',    -- prayer|food|sleep|character|quran|social|cleanliness|etiquette|dhikr|dua
  'morning',   -- morning|evening|night|anytime|after_prayer|before_sleep
  30,          -- estimated seconds
  2,           -- base difficulty 1–5
  'English hadith text',
  'النص العربي للحديث',
  'Bukhārī',
  43           -- sort_order (use next available)
);
```

The `CATEGORY` and `TIME` maps in `app/sunnah/[id].tsx` will need updating if you add
new category or time_of_day values.

---

## Environment Variables

In `.env` at project root (not committed):
```
EXPO_PUBLIC_SUPABASE_URL=https://xzspizfqrenilxkkxkil.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## Mascot Usage

```tsx
import { Galabeya } from "@/components/Galabeya";

// Supported moods: "idle" | "happy" | "streak" | "sleeping"
// Unknown moods fall back to "idle" automatically (safe to pass others — won't crash)
<Galabeya mood="happy" size={140} animate={true} />
```

See `docs/DESIGN_SYSTEM.md` for the mood-to-context mapping.
