# Ballegho · بلّغوا

> *"Convey (from me), even if it is one verse."* — The Prophet ﷺ · Bukhārī

Ballegho is an Islamic habit-tracking app that helps Muslims build a consistent Sunnah practice — one small act at a time. It combines daily habit tracking with authentic hadith content, streak motivation, and a full Arabic/RTL experience.

---

## Features

- **Daily Sunnah checklist** — personalised practice list with time-of-day grouping (morning, daily, evening, night)
- **Streak tracking** — Hijri-aware streaks that reset at Maghrib, not midnight
- **Progress tab** — 5-week activity heatmap, milestones (7 · 21 · 40 · 100 days), and consistency bars
- **Hadith collections** — Al-Nawawī's Forty, Forty Hadith Qudsī, Ḥiṣn al-Muslim, Akhlāq, Food & Drink
- **Learn & Convey** — daily rotating hadith + sunnah of the week, with a shareable image card (4 themes)
- **Saved / Favourites** — heart any sunnah or hadith; dedicated Saved page
- **Full Arabic support** — RTL layout, Eastern Arabic-Indic numerals, Amiri + Georgia typography, grammatically correct Arabic copy
- **Dark & light modes** — Night & Gold design system
- **Local notifications** — Fajr nudge + Maghrib streak warning (expo-notifications)
- **Prayer times** — location-based, auto calculation method by country (adhan library)
- **Hijri date** — AlAdhan API with daily AsyncStorage cache and Maghrib-aware advancement

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 (React Native) |
| Navigation | Expo Router v3 (file-based) |
| Styling | NativeWind v4 (Tailwind CSS) + StyleSheet |
| Backend | Supabase (Postgres + Auth + RLS) |
| Prayer times | `adhan` JS library |
| Hijri date | AlAdhan REST API |
| Notifications | `expo-notifications` (local) |
| Fonts | Amiri · Georgia · Inter (via expo-font) |
| Language | TypeScript throughout |

---

## Project structure

```
app/
  (auth)/          — welcome, sign-in, sign-up
  (onboarding)/    — 6-step onboarding flow
  (tabs)/          — main tab screens (today, sunnah, streaks, learn, profile)
  collection/      — dedicated collection screen per hadith set
  hadith/          — hadith reader
  sunnah/          — sunnah detail screen
  favorites.tsx    — saved sunnahs & hadiths

components/
  home/            — SunnahChecklist, WeekStrip, DayProgress
  SunnahShareCard  — shareable image card (4 themes)
  ThemePicker      — share card theme selector
  PrayerStrip      — next prayer display
  MilestoneCard    — streak milestone celebration modal
  Galabeya         — app mascot

hooks/
  useSunnahs       — active practice list + completion tracking (Maghrib-aware)
  useStreaks        — heatmap + streak stats (Maghrib-aware)
  useLearnContent  — hadith/sunnah of the day (Maghrib-aware)
  useFavorites     — saved items (sunnahs & hadiths)
  usePrayerTimes   — location-based prayer times
  useNotifications — local notification scheduling
  useHadithCollection — loads a public.hadiths collection

lib/
  supabase.ts      — Supabase client singleton
  islamicDate.ts   — getEffectiveDate() — Maghrib-aware day boundary
  hijriDateApi.ts  — AlAdhan Hijri date with AsyncStorage cache
  notifications.ts — schedule/cancel helpers

constants/
  theme.ts         — Night & Gold colour tokens
  i18n.ts          — all Arabic + English strings
  collections.ts   — curated collection definitions
  sunnahMeta.ts    — category/time metadata
```

---

## Getting started

### 1. Clone & install

```bash
git clone <repo-url>
cd ballegho
npm install --legacy-peer-deps
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run

```bash
npx expo start --clear
```

Scan the QR code with [Expo Go](https://expo.dev/go) (iOS/Android) or press `w` for web.

> **Note:** Local notifications require a physical device or development build — they don't work in Expo Go on Android (SDK 53+).

---

## Database

The app uses a Supabase project with the following main tables:

| Table | Purpose |
|---|---|
| `profiles` | User identities (synced from auth.users) |
| `sunnahs` | Master catalogue of 42 sunnahs |
| `user_sunnahs` | User's active practice list |
| `user_sunnah_stats` | Per-sunnah streak + completion rates |
| `user_streaks` | Global streak (current + longest) |
| `daily_completions` | One row per sunnah per day completed |
| `user_behavioral_profile` | Onboarding data (sleep schedule, level) |
| `hadiths` | Public hadith collections (Nawawi 40, Qudsi 40) |
| `user_favorites` | Saved sunnahs & hadiths (generic item_type) |

All tables have RLS enabled. Completions use a Hijri-adjusted effective date (Maghrib boundary).

---

## Design system

**Palette — Night & Gold:**
- Dark: `#0a1422` bg · `#d4af37` gold · `#f4ecd8` ink
- Light: `#f5efe2` bg · `#b8892a` gold · `#0e1a2b` ink

**Typography:**
- Display: Georgia (EN) · Amiri Bold (AR)
- Body: system (EN) · Amiri (AR)
- Numbers: Georgia

**Arabic rules:** never use `letterSpacing`, `textTransform`, or `fontWeight > 400` on Arabic text. Use exclusive style pairs (not merged arrays) when a style carries letterSpacing. Eastern Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) for counts displayed in RTL mode.

---

## Roadmap

- [ ] Adhkār tab — dhikr session counter with reward cards
- [ ] Occasions screen — contextual sunnahs (Jumu'ah, Ramadan, travel…)
- [ ] Add-to-practice from the Sunnah Library
- [ ] More hadith collections (Muwatta, Riyadh al-Salihin)
- [ ] Loading skeletons

---

## Licence

Private repository — all rights reserved.
