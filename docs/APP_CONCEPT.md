# Ballegho — App Concept & Vision

---

## What is Ballegho?

**Ballegho** (بَلِّغُوا) is an Islamic habit-formation app that helps Muslims practice the Sunnah consistently in their daily lives.

The name comes from the hadith:
> *"Convey from me, even if it is one verse."* — The Prophet ﷺ · Bukhārī

The word بَلِّغُوا means "convey" or "spread." It reflects both the act of practising and sharing — a Muslim who lives the Sunnah naturally spreads it.

---

## The Core Problem

Muslims want to practice the Sunnah. They know the hadith. They know the rewards. But they face:

1. **Overwhelm** — They try to do 10 things at once, life gets busy, they fail, they quit everything
2. **Guilt loops** — Missing a day feels like failure, which causes more disengagement
3. **Generic apps** — Every Islamic app treats every user identically. No adaptation.
4. **Disconnection from reward** — The spiritual value of each sunnah is hidden behind checklists
5. **All-or-nothing mindset** — "I didn't finish my full list, so I failed today"

---

## The North Star Hadith

Everything in this app is built around one hadith:

> **أحبُّ الأعمالِ إلى اللّهِ أدومُها وإنْ قَلَّ**
> *"The most beloved deeds to Allah are those done most consistently, even if they are few."*
> — Bukhārī & Muslim

This is not just the app tagline. It is the design axiom behind every UX decision:
- Why we cap sunnahs at 3 to start
- Why streaks never reset to 0
- Why the anchor sunnah exists
- Why we celebrate small completions loudly

---

## The Solution: Consistency Over Completeness

Ballegho's philosophy is a direct challenge to every other productivity and habit app:

| Other apps say | Ballegho says |
|---|---|
| "Complete your daily list" | "Do even one thing — that's enough" |
| "You missed 3 sunnahs" | "You did 2 today" |
| "Streak broken — 0 days" | "Your streak is paused — pick up where you left off" |
| "Add more habits" | "Master these 3 before adding more" |
| "You failed today" | "The chain isn't broken. It's waiting for you." |

---

## The Personalization Philosophy

The Prophet ﷺ gave different advice to different companions based on who they were. He told one man *"don't get angry"* three times because that was his specific struggle. He told another to fast. Another to pray more.

**This is the Islamic justification for personalization.** Ballegho treats each user as an individual — not a category.

### What the app learns about each user:

| Signal | What it reveals |
|---|---|
| When they open the app | Morning person vs. night owl |
| Which sunnahs they complete fast | What feels natural to them |
| Which sunnahs they skip | What feels hard or situationally impossible |
| Session duration | How deep they engage |
| Day-of-week patterns | Work/life schedule shape |
| Self-reported difficulty (Day 7 prompt) | Explicit struggle areas |
| Wake/sleep time (onboarding) | Daily rhythm boundaries |

### The adaptive engine outputs:

- **Confidence score per sunnah** — predicts if this user will succeed at this sunnah
- **Habit stacking suggestions** — "You always open the app after Fajr. Want to attach morning adhkār to that moment?"
- **Load balancing** — if completion rate < 50% this week, gently suggest reducing to just the anchor
- **ZPD unlocks** — always suggest the next sunnah at the edge of comfort zone (not too easy, not too hard)
- **Time-aware ordering** — show morning sunnahs first at 7am, sleep sunnahs first at 11pm

---

## Target Users

**Primary:** Arabic-speaking Muslims, 18–40, moderate to practicing level, iOS and Android

**Secondary:** Non-Arabic Muslims who want the Islamic identity but accessible language

**Key insight:** Many users keep their phone in English but want an app that feels deeply Islamic. Many users keep their phone in Arabic but are open to bilingual content. Language must be user-controlled from the first screen.

---

## Core Features (full picture)

### Today Screen (Home)
- Greeting with user's name + Hijri date
- Prayer strip (next prayer + countdown + all 5 status)
- 7-day consistency row (weekly view, not daily pressure)
- Occasion banner (Friday, Ayyām al-Bīḍ, Ramadan, etc.)
- Grouped sunnah checklist (Morning / Daily / Evening)
- Quick tick cards (horizontal scroll for fastest habits)
- Anchor sunnah highlighted at top

### Sunnah Library
- Browse all 42+ sunnahs by category and time
- Personal difficulty rating per sunnah
- Stats: my streak, my completion rate, my best streak
- Add/remove from active list
- Detail view: full hadith + explanation + personal stats

### Adhkār
- Session-based dhikr (Morning, Evening, Custom)
- Reward callout for each dhikr (the spiritual why)
- Tap counter with haptic feedback
- Session completion screen with mascot

### Streaks
- Global streak + personal bests
- 30-day heatmap
- Milestones: 7 / 21 / 40 / 100 days
- Most consistent sunnahs list
- Streak grace (frozen, not broken)

### Learn & Convey
- Hadith of the day
- Sunnah of the week
- Collections (The 40 Nawawī, Ḥiṣn al-Muslim, Akhlāq, Adab)
- Share sheet — the Ballegh feature (share hadith as beautiful card)

### Profile
- User avatar (initials in gold circle)
- Personal stats
- Language / Appearance / Prayer method settings
- Sign out

---

## The Mascots

### Fanous (فانوس) — The Lantern
A traditional Islamic lantern. Represents light, guidance, the Sunnah.
5 moods: `idle` · `happy` · `sleeping` · `empty` · `streak`

**Used for:** Empty states, streak celebrations, loading screens, onboarding splash

### Galabeya Character
A faceless silhouette in traditional Islamic robe with kufi cap. No facial features — respects Islamic scholarly positions on figurative art.
6 poses: `idle` · `happy` · `praying` (sujud) · `reading` · `dua` (arms raised) · `sleeping`

**Used for:** Completion moments, onboarding commitment screen, emotional feedback

### Mascot mood mapping to user state:
| User state | Mascot |
|---|---|
| Anchor sunnah completed | Happy |
| Long streak active | Streak (blazing) |
| Hard week / few completions | Idle (never sad) |
| After Isha / late night | Sleeping |
| No sunnahs added yet | Empty |
| Duʿāʾ/Adhkār screen | Duʿāʾ pose |

---

## Language & Tone

### Two languages, one soul
- English: formal but warm, serif typography (Georgia), academic transliterations (ṣalāh, adhkār)
- Arabic: RTL, Amiri font for display/hadith, system font for UI labels

### Tone principles:
- Never clinical ("configure your preferences" → "tell us about your day")
- Never guilty ("you missed 3" → "you did 2")
- Always encouraging but never hollow ("great job!" is banned)
- Islamic without being preachy — let the hadith speak

### Arabic text rules (critical):
- **No `letterSpacing`** — breaks letter connections and ligatures
- **No `textTransform: uppercase`** — meaningless and distorts Arabic
- **No `fontWeight > "400"` on system font** — synthesized bold distorts glyphs
- **Always `writingDirection: "rtl"`** for Arabic content
- **Split Arabic words across separate `<Text>` nodes** breaks text shaping

---

## Roadmap

### Phase 1 — Core Loop ✅ In Progress
- Authentication + onboarding ✅
- Database schema + 42 sunnahs seeded ✅
- Prayer strip with live countdown ✅
- Profile + settings ✅
- Today screen checklist 🔲
- Streak tracking 🔲
- Emotional success moment 🔲

### Phase 2 — Personalization Engine
- Usage session tracking
- Confidence scoring per sunnah
- Adaptive unlock algorithm
- Habit stacking suggestions
- Weekly AI reflection (Claude API)
- Time-aware home screen ordering

### Phase 3 — Full Content
- Sunnah library tab
- Adhkār session tab
- Streaks tab (heatmap + milestones)
- Learn & Convey tab
- Occasions system (Friday, Ramadan, etc.)

### Phase 4 — Advanced
- Push notifications (requires EAS Build)
- Apple Health integration (wake/sleep auto-detection)
- Share sheet (Ballegh feature)
- EAS Build (APK + IPA distribution)

---

## Technical Foundation

- **Frontend:** Expo SDK 54 · React Native · TypeScript
- **Navigation:** Expo Router (file-based)
- **Styling:** NativeWind v4 (Tailwind CSS)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Prayer times:** adhan library + expo-location
- **Fonts:** Amiri, Scheherazade New (Arabic) · Georgia (English display) · System (UI)

See `docs/DESIGN_SYSTEM.md` for full design tokens and component architecture.
See `docs/AI_DEVELOPMENT_GUIDE.md` for development patterns and conventions.
