# Ballegho — Design System, Architecture & Personalization

---

## 1. Design Philosophy

### Night & Gold
The palette is called "Night & Gold" — deep indigo navy backgrounds with antique gold accents and warm cream text. It evokes:
- Nighttime reflection (most Islamic remembrance happens at dawn and after Isha)
- The warmth of candlelight in a mosque
- Manuscript illumination (Islamic art tradition)
- Spiritual gravity without coldness

### Design axioms
1. **Never make the user feel behind** — zero red states, zero guilt language
2. **Arabic and English are equal** — neither is a translation of the other
3. **Calm over excitement** — no confetti, no loud animations
4. **Space is intentional** — generous padding signals importance
5. **The hadith is the UX copy** — let authentic text do the motivating

---

## 2. Color Tokens

### Light mode
```
bg:          #f5efe2   cream paper — main background
bgAlt:       #ede4d0   deeper cream — slightly different surface
surface:     #ffffff   cards, inputs
surfaceDim:  #faf4e7   subtle surface variant
ink:         #0e1a2b   indigo night — primary text
inkSoft:     #3d4a5e   secondary text
inkMuted:    #7a8193   tertiary text, placeholders
inkFaint:    #b9bcc4   disabled, borders
gold:        #b8892a   primary accent — CTAs, highlights, active states
goldSoft:    #e8d49a   light gold for backgrounds
goldDeep:    #8a6417   dark gold for icons on light backgrounds
emerald:     #2d6b4f   success, nature, positive
rose:        #a84a3d   destructive actions, warnings
divider:     rgba(14,26,43,0.1)   subtle borders
star:        #c9a13b   star ratings
```

### Dark mode
```
bg:          #0a1422   deep navy — main background
bgAlt:       #0e1a2b   slightly lighter navy
surface:     #122236   card backgrounds
surfaceDim:  #0f1d31   subtle surface variant
ink:         #f4ecd8   warm cream — primary text
inkSoft:     #c5bda8   secondary text
inkMuted:    #8a8876   tertiary text
inkFaint:    #4a5362   disabled, borders
gold:        #d4af37   brighter gold for dark backgrounds
goldSoft:    #8a6417   muted gold
goldDeep:    #f2d57a   bright gold highlight
emerald:     #5da082   lighter emerald
rose:        #d27866   lighter rose
divider:     rgba(244,236,216,0.08)   very subtle borders
star:        #e8c559   star ratings
```

### Usage in code

All tokens are centralised in `constants/theme.ts`. Never hardcode hex values in components.

```tsx
import { colors, NIGHT } from "@/constants/theme";
import { useLang } from "@/hooks/useLang";

// App screens (home, profile, sunnah detail) — dark/light adaptive
const { isDark } = useLang();
const c = colors(isDark);

// Auth / onboarding screens — always dark ("Night & Gold" aesthetic)
const C = NIGHT;
```

`constants/theme.ts` also exports `TYPE` (typography presets), `SPACE`, `RADIUS`, `SHADOW_SM`,
and `PALETTE` (raw hex values). See that file for the full reference.

---

## 3. Typography

### Typefaces

| Typeface | Role | Loaded via |
|---|---|---|
| **Georgia** (system serif) | English display, headers, key numbers | System (no import needed) |
| **Amiri_400Regular** | Arabic display, hadith text | @expo-google-fonts/amiri |
| **Amiri_700Bold** | Arabic wordmarks (e.g. بلّغوا) | @expo-google-fonts/amiri |
| **ScheherazadeNew_400Regular** | Arabic alternative display | @expo-google-fonts/scheherazade-new |
| System default | Arabic and English UI body text | (no fontFamily = system) |

### Scale

```
Display (English):  Georgia, 26–44px, weight 400, letterSpacing -0.5
Display (Arabic):   Amiri, 20–58px, lineHeight 1.6–1.8× fontSize
Heading:            System, 18–22px, weight 600
Eyebrow:            System, 10px, weight 600, UPPERCASE, letterSpacing 1.4
                    ⚠️ ONLY for English — never apply to Arabic
Body:               System, 13–15px, weight 400, lineHeight 1.5
Caption:            System, 10–11px, letterSpacing 0.3–0.5
Arabic hadith:      Amiri, 18–26px, lineHeight 2× fontSize
Arabic UI label:    System (no fontFamily), 13–16px, NO letterSpacing
```

### Arabic text rules (critical — read this)

```
NO letterSpacing on Arabic       → breaks letter connections and ligatures
NO textTransform on Arabic       → meaningless, distorts glyphs
NO fontWeight > "400" on system  → synthesised bold = broken rendering
NO fontFamily "System"           → invalid in React Native, causes errors
ALWAYS writingDirection: "rtl"   → for all Arabic display text nodes
ALWAYS lineHeight ≥ 1.6×         → Arabic glyphs are taller than Latin
```

**Conditional letterSpacing — use spread, never ternary:**
```tsx
// ✅ letterSpacing is completely absent for Arabic
...(isRTL ? {} : { letterSpacing: 1.4 })

// ❌ letterSpacing: 0 still "sets" it on Arabic text
letterSpacing: isRTL ? 0 : 1.4
```

**Style overrides — use exclusive styles, never merged arrays when base has letterSpacing:**
```tsx
// ✅ Arabic text never inherits English letterSpacing or textTransform
<Text style={isRTL ? styles.titleAr : styles.titleEn}>

// ❌ React Native merges arrays — titleEn's letterSpacing bleeds into titleAr
<Text style={[styles.titleEn, isRTL && styles.titleAr]}>
```

---

## 4. Component Library

### Shared primitives (to be built in `components/ui/`)

#### CheckCircle
```tsx
// Circular checkbox — gold when checked
<CheckCircle checked={true} size={22} />

// Style:
// Unchecked: 1.5px border inkFaint, transparent bg
// Checked: gold bg, gold border, white checkmark inside
```

#### Eyebrow
```tsx
// Section labels — English only
// 10px, 600 weight, UPPERCASE, letterSpacing 1.4, inkMuted color
<Eyebrow label="Morning" isRTL={isRTL} c={c} />
```

#### Bar (progress)
```tsx
// Full-width progress bar
// height 4–8px, rounded, gold fill, divider bg
```

#### Pill / Tag
```tsx
// Tones: default | gold | filled | emerald | ink | ghost
// Sizes: xs (10px) | sm (11px) | md (12px)
// Border-radius: 999 (fully rounded)
```

#### Ornament
```tsx
// Islamic geometric divider: ─── ◇ ───
// Used between sections, on splash screens, in hadith displays
```

---

## 5. Screen Layout Rules

```
Screen padding H:   22px (most screens) / 24–28px (onboarding)
Card border-radius: 14–18px
Pill border-radius: 999px
Section gap:        16px between cards
Item gap:           0 (items inside cards use divider lines, not gap)
Tab bar height:     76px
Status bar offset:  useSafeAreaInsets().top + 16px
Bottom offset:      useSafeAreaInsets().bottom + 24–32px
```

### Card anatomy
```
Surface background (white/surface dark)
0.5px border (divider color)
14–18px border-radius
14–18px padding
iOS shadow: shadowColor: "#000", shadowOffset: {0,1}, shadowOpacity: 0.04–0.08, shadowRadius: 4
Android: elevation 1–2
```

### Tab bar spec
```
backgroundColor: bg color (matches screen)
borderTopColor: divider (0.5px)
height: 76px
paddingTop: 10px
Active icon: gold, strokeWidth 2, label fontWeight 600
Inactive icon: inkMuted, strokeWidth 1.6, label fontWeight 500
Label fontSize: 10px
```

---

## 6. Mascot System

### Fanous (فانوس) — `components/Fanous.tsx`
```
Props: mood ("idle"|"happy"|"sleeping"|"empty"|"streak"), size (default 120), isDark

idle    → soft warm glow, quiet flame
happy   → bright glow, tall flame, sparkles
sleeping→ dim, tiny flame, Zzz text
empty   → unlit, X mark inside, low opacity
streak  → blazing flame, dashed outer ring
```

**Context map:**
```
idle     → daily home screen, neutral state
happy    → anchor sunnah just completed
sleeping → night time (after Isha), sleep sunnah screen
empty    → no sunnahs added, empty states
streak   → 7+ day streak milestone
```

### Galabeya — `components/Galabeya.tsx`

> ⚠️ Only 4 moods are currently implemented. The others listed in APP_CONCEPT.md
> (praying, reading, dua) are planned for future implementation.

```
Props: mood ("idle"|"happy"|"streak"|"sleeping"), size (default 140), animate (default true)

idle     → relaxed stance, slow float & breathe, faint aura
happy    → arms raised, joyful bounce, sparkle burst, bright aura
streak   → proud stance, pulsing aura, orbiting sparkles
sleeping → head tilt, slow breathe, drifting Zzz glyphs, dim aura
```

Unknown moods fall back to `"idle"` automatically — safe to pass future moods without crashing.

**Context map:**
```
idle     → onboarding steps, neutral home state, few completions
happy    → anchor sunnah completed, streak milestones
streak   → 7+ consecutive days active
sleeping → after-Isha state, sleep sunnahs screen, night mode
```

---

## 7. Database Architecture

### Full Schema

```sql
-- ── Auth (Supabase managed) ────────────────────────────────────────
auth.users                    Supabase managed auth

-- ── Core user data ─────────────────────────────────────────────────
profiles (
  id              uuid PK → auth.users.id
  name            text
  created_at      timestamptz
  updated_at      timestamptz
)

user_streaks (
  user_id         uuid PK → profiles.id
  current_streak  int
  longest_streak  int
  last_activity_date date
  updated_at      timestamptz
)

-- ── Content ────────────────────────────────────────────────────────
sunnahs (
  id              uuid PK
  slug            text UNIQUE        -- 'bismillah-eating'
  name_en         text
  name_ar         text
  description_en  text
  description_ar  text
  category        text               -- prayer|food|sleep|character|quran|social|cleanliness
  time_of_day     text               -- morning|afternoon|evening|night|anytime
  estimated_seconds int
  difficulty_base int (1-5)          -- global baseline difficulty
  hadith_text_en  text
  hadith_text_ar  text
  hadith_source   text
  is_occasional   bool               -- Friday/Ramadan specific
  sort_order      int
)

-- ── User-sunnah relationship ────────────────────────────────────────
user_sunnahs (
  id          uuid PK
  user_id     uuid → profiles.id
  sunnah_id   uuid → sunnahs.id
  is_active   bool
  is_anchor   bool                   -- the streak-protecting sunnah
  position    int
  UNIQUE (user_id, sunnah_id)
)
-- ⚠️ NO FK between user_sunnahs and user_sunnah_stats.
--    Always query them separately and merge by sunnah_id in JS.

-- ── Per-sunnah stats (personalisation signals) ───────────────────────────
user_sunnah_stats (
  user_id              uuid → profiles.id
  sunnah_id            uuid → sunnahs.id
  difficulty_self      int              -- user self-rating 1–5 (null until rated)
  difficulty_derived   float            -- computed from completion patterns
  difficulty_effective float            -- blend of self + derived
  completion_rate_7d   float            -- 0.0–1.0
  completion_rate_30d  float
  current_streak       int
  longest_streak       int
  total_completions    int
  avg_completion_hour  float            -- hour user usually completes this
  last_completed_at    timestamptz
  difficulty_rated_at  timestamptz
  updated_at           timestamptz
  PRIMARY KEY (user_id, sunnah_id)
)

-- ── Activity logging ────────────────────────────────────────────────
daily_completions (
  id              uuid PK
  user_id         uuid → profiles.id
  sunnah_id       text               -- legacy: will migrate to uuid FK
  completed_date  date
  created_at      timestamptz
)

adhkar_sessions (
  id            uuid PK
  user_id       uuid → profiles.id
  session_date  date
  counts        jsonb DEFAULT '{}'   -- { "dhikr_slug": count }
  updated_at    timestamptz
)

-- ── Personalization ─────────────────────────────────────────────────
user_behavioral_profile (
  user_id                 uuid PK → profiles.id
  wake_time               time               -- from onboarding or Health
  sleep_time              time
  consistency_level       text               -- 'beginner'|'some'|'consistent'
  preferred_hour          int                -- most active hour 0–23 (derived)
  is_morning_person       bool               -- wake_time < 8:00
  avg_session_seconds     int                -- derived
  weekly_consistency_rate float              -- derived (0–1)
  strongest_category      text               -- derived
  weakest_category        text               -- derived
  is_in_hard_week         bool DEFAULT false -- triggers reduced load mode
  sunnah_capacity         int DEFAULT 3      -- adaptive max
  onboarding_complete     bool DEFAULT false
  last_profiled_at        timestamptz
  updated_at              timestamptz
)
```

### RLS Summary
All tables have Row Level Security enabled. Every table uses `auth.uid() = user_id` policies. `sunnahs` is read-only public (anyone can SELECT).

---

## 8. Personalization Architecture

### The Adaptive Engine

**Phase 1: Calibration (Days 1–7)**
- Track all signals silently
- No suggestions, no nudges
- Just observe

**Phase 2: Scoring (Day 7+)**

Confidence score formula per sunnah per user:
```
confidence = (completions_7d / 7) × 0.6
           + (completions_30d / 30) × 0.3
           + (1 - avg_skip_rate) × 0.1
```

**Phase 3: Adaptation (Day 14+)**

Decision tree:
```
IF all active sunnahs confidence > 0.75 for 7 days AND active_count < capacity_max:
  → Suggest unlock from ZPD sweet spot:
    - NOT from strongest category (too easy → boring)
    - NOT difficulty 4+ unless consistent user (too hard → anxiety)
    - MATCHES user's preferred hour of day
    - INTRODUCES new category

IF any sunnah confidence < 0.30 for 14 days:
  → Surface: "This one seems hard right now — want to pause it?"

IF weekly_consistency_rate < 0.50:
  → Set is_in_hard_week = true
  → Home screen shows only anchor sunnah prominently
  → Banner: "Let's focus on your anchor this week"

IF weekly_consistency_rate > 0.85:
  → Unlock suggestion notification after 7th consistent day
```

**Weekly profile refresh** (triggered on app open if 7 days since last):
```
1. Recalculate completion_rate_7d, completion_rate_30d per sunnah
2. Update preferred_hour from completion timestamps
3. Update weekly_consistency_rate
4. Update is_morning_person (wake_time < 08:00)
5. Identify strongest/weakest category
6. Evaluate is_in_hard_week flag
7. Update sunnah_capacity (can increase if consistently high)
```

---

### Habit Stacking System

Detect natural anchor moments from user behavior:
```
IF user consistently opens app between 05:00–07:00:
  → Fajr stacking opportunity:
     "You pray Fajr at this time. Want to attach [sunnah] right after?"

IF user completes Bismillah sunnah at ~13:00 daily:
  → Lunch stacking:
     "You say Bismillah every lunch. Want to add drinking in 3 sips at the same moment?"
```

Stacks are suggested — never forced. One suggestion per week maximum to avoid notification fatigue.

---

### AI Layer (Claude API via Supabase Edge Functions)

**Weekly Personalised Reflection:**
```
Supabase Edge Function runs weekly per user:
1. Query: completions this week, best/worst sunnah, current streak
2. Call Claude API with anonymised data + user language preference
3. Generate 3–4 sentence personal coaching message
4. Store in notifications table
5. Surface on next app open as a card on home screen

Prompt template:
"The user's name is {first_name}. This week they completed {X} of 7 days.
Their most consistent sunnah was {best} ({rate}%). Their hardest was {worst} ({rate}%).
Their streak is {N} days. Their language is {ar|en}.
Write a personal 3–4 sentence Islamic coaching message. Include one relevant hadith.
Be warm, never guilty. Celebrate small wins. End with a practical suggestion for next week."
```

**"Why this sunnah?" explanations:**
```
User long-presses a sunnah → Claude generates:
- 2–3 sentences on the wisdom of this sunnah
- Connection to the user's life stage/level
- Authentic hadith reference
- Practical application tip

Cached per sunnah per language — not regenerated on every tap.
```

---

### Emotional Success Design (BJ Fogg: Shine Moment)

**After completing the anchor sunnah:**
```
1. CheckCircle animates to checked (gold fill)
2. 300ms pause
3. Small message appears below the sunnah name:
   - English: "بَارَكَ اللَّهُ فِيكَ · Day {N}"
   - Arabic: "بارك الله فيك · اليوم {N}"
4. If first completion today: Galabeya mood lifts to Happy
5. If streak milestone (7/21/40): full milestone card with relevant hadith
```

**Language for celebrations:**
```
Day 1:      "Your journey continues. One sunnah at a time."
Day 7:      "7 days. The Prophet ﷺ said deeds done consistently are the most beloved."
Day 14:     "Two weeks of consistency. SubḥānAllāh."
Day 21:     "21 days. Habits start to feel natural around now."
Day 40:     "40 days. 'Whoever does a deed consistently for 40 days, it becomes part of him.'"
Day 100:    "100 days. MāshāAllāh. You've made the Sunnah part of who you are."
```

---

## 9. Navigation Map

```
app/
  _layout.tsx          Root Stack (SettingsProvider → AuthProvider → AuthGate)
                       AuthGate: overlay that enforces auth/onboarding routing rules
  
  (auth)/
    _layout.tsx        Nested Stack, animation: fade
    welcome.tsx        Splash — Arabic wordmark, hadith, bilingual CTAs
    sign-in.tsx        Email + password (keeps spinner until AuthGate navigates)
    sign-up.tsx        Name + email + password → routes to onboarding step0
  
  (onboarding)/
    _layout.tsx        Nested Stack, slide_from_right, gestureEnabled
                       Wrapped in OnboardingProvider (in-memory state, destroyed on exit)
    step0.tsx          Language picker (EN / العربية / Auto) — has Sign in escape link
    step1.tsx          The Promise hadith — back + Sign in link in top bar
    step2.tsx          Your rhythm (wake/sleep)     — OnboardingShell 1/5
    step3.tsx          Honest assessment (🌱🌿🌳)   — OnboardingShell 2/5
    step4.tsx          Pick 1–3 sunnahs             — OnboardingShell 3/5
    step5.tsx          Choose anchor sunnah         — OnboardingShell 4/5
    step6.tsx          Commitment + account creation — full screen (no shell)
  
  (tabs)/
    _layout.tsx        Tabs bar (Today + Profile) — more tabs planned
    index.tsx          Today/Home: prayer strip, checklist, day progress + streak
    profile.tsx        Profile: name edit, schedule, practice level, sunnahs, settings
  
  sunnah/
    [id].tsx           Sunnah detail — root-level (hides tab bar, slide_from_right)
                       Shows hadith, stats, check button, remove option
                       Navigated via: router.push({ pathname: "/sunnah/[id]", params: { id } })
                       Home screen reloads on return via useFocusEffect(reload)
```

**Planned tabs (not yet built):**
```
adhkar.tsx      Dhikr session tap counter (morning/evening/custom)
streaks.tsx     30-day heatmap + milestones + personal bests
learn.tsx       Hadith of the day, Sunnah of the week, Collections
```

---

## 10. Localization Reference

All Hijri month names (transliterated):
```
Muḥarram · Ṣafar · Rabīʿ al-Awwal · Rabīʿ al-Thānī
Jumādā al-Ūlā · Jumādā al-Ākhirah · Rajab · Shaʿbān
Ramaḍān · Shawwāl · Dhū al-Qaʿdah · Dhū al-Ḥijjah
```

Arabic numerals in UI: always use Latin (0–9) for countdowns and numbers in mixed-language contexts to prevent mixed-script rendering issues.

Prayer name abbreviations:
```
English: Fajr · Dhr · Asr · Mgr · Isha
Arabic:  فجر · ظهر · عصر · مغرب · عشاء
```
