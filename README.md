# Ballegho · بلّغوا

> *"Convey (from me), even if it is one verse."* — The Prophet ﷺ · Bukhārī

An Islamic habit-tracking app for building a consistent daily Sunnah practice. Full Arabic/RTL support, Maghrib-aware day boundaries, and a Night & Gold design system.

---

## Stack

- **Expo SDK 54** · React Native · TypeScript
- **Expo Router v3** — file-based navigation
- **NativeWind v4** — Tailwind CSS for React Native
- **Supabase** — Postgres + Auth + Row-Level Security
- **adhan** — local prayer time calculations
- **AlAdhan API** — Hijri date (cached via AsyncStorage)
- **expo-notifications** — local scheduled notifications

## Fonts

Amiri (Arabic display) · Georgia (English display) · System (UI)

## Environment

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Run

```bash
npm install --legacy-peer-deps
npx expo start --clear
```
