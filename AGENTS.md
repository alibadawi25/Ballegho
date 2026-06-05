# Ballegho — Agent Instructions

## Read These First

Before writing ANY code, read these three files in order:

1. `docs/AI_DEVELOPMENT_GUIDE.md` — Tech stack, patterns, pitfalls, conventions
2. `docs/DESIGN_SYSTEM.md` — Colors, typography, components, architecture, personalization
3. `docs/APP_CONCEPT.md` — App vision, philosophy, full feature list, roadmap

## Expo Version

This project uses **Expo SDK 54** (NOT 56). Always check versioned docs before writing Expo-specific code:
https://docs.expo.dev/versions/v54.0.0/

## Critical Rules

- **Arabic text**: NEVER add `letterSpacing`, `textTransform: uppercase`, or `fontWeight > 400` on Arabic text.
  Never use `fontFamily: "System"` — omit fontFamily entirely for system font.
  
- **letterSpacing on conditionals**: Use spread pattern, never `letterSpacing: isRTL ? 0 : value`:
  ```tsx
  // ✅ Correct — letterSpacing is absent entirely for Arabic
  ...(isRTL ? {} : { letterSpacing: 1.4 })
  
  // ❌ Wrong — letterSpacing: 0 still "applies" it
  letterSpacing: isRTL ? 0 : 1.4
  ```

- **Style pairs for Arabic overrides**: When a base style has `letterSpacing` or `textTransform`,
  use exclusive styles — not merged arrays — to prevent bleed-through:
  ```tsx
  // ✅ Arabic never sees the English letterSpacing
  <Text style={isRTL ? styles.titleAr : styles.titleEn}>
  
  // ❌ titleEn's letterSpacing bleeds into titleAr (RN merges arrays)
  <Text style={[styles.titleEn, isRTL && styles.titleAr]}>
  ```

- **Colors**: Use `constants/theme.ts` — never hardcode hex values outside that file.
  - `NIGHT` for auth/onboarding screens (always dark)
  - `colors(isDark)` for app screens (dark/light adaptive)
  ```tsx
  import { colors, NIGHT } from "@/constants/theme";
  const c = colors(isDark);   // app screens
  const C = NIGHT;            // auth / onboarding
  ```

- **Strings**: All user-facing text goes in `constants/i18n.ts` — never hardcode strings in components.
  Add both `en` and `ar` keys. TypeScript will catch mismatches.

- **Supabase queries**: `user_sunnah_stats` has no FK to `user_sunnahs`. Never nest them in one query.
  Always fetch separately and merge by `sunnah_id` in JS. See `hooks/useSunnahs.ts` for the pattern.

- **npm installs**: Always use `--legacy-peer-deps`

- **Cache**: Run `npx expo start --clear` after config changes

- **Reanimated**: Worklets babel plugin is NOT configured. Use React Native's built-in `Animated` instead.

- **Supabase**: RLS is always enabled. Never bypass it. Use `auth.uid()` policies.
