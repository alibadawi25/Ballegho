# Ballegho — Deferred TODO

Things intentionally postponed. Not blocking current releases.

---

## 🔒 Security / Auth — DEFERRED (low priority for now)

> Decision (2026-06-07): auth hardening is **not a priority yet** — the app holds
> little sensitive/stealable data at this stage. Revisit before a wider public
> launch or before storing anything sensitive.

- [ ] **Enable leaked-password protection** — Supabase dashboard → Authentication →
      Passwords (checks new passwords against HaveIBeenPwned). One toggle.
      (Flagged by Supabase security advisor.)
- [ ] **Harden `SECURITY DEFINER` RPCs that trust `p_user_id`.** Most app RPCs take
      a `p_user_id` argument and act on it as the table owner, so a signed-in user
      could pass *another* user's id (grief/abuse — e.g. spend/award/mutate another
      account). Options: use `auth.uid()` inside the functions instead of trusting
      the arg, or add `if p_user_id <> auth.uid() then raise ...`. Affects:
      `record_sunnah_completion`, `update_user_streak`, `recompute_*`,
      `assess_practice`, `sync_anchors`, `unlock_pick_sunnah`, `reduce_load`,
      `recover_practice`, `award_share_nur`, `unlock_cosmetic`.
      (NOTE: `award_nur_internal` is already locked — not callable via the API.)
- [ ] Re-run `get_advisors` (security) after the above and confirm clean.

---

## 🧹 Build / CI cleanliness (not a runtime blocker)

- [ ] **Add `@expo/vector-icons` as a direct dependency** so `tsc`/CI passes clean.
      It currently resolves only via `node_modules/expo/node_modules/...` (transitive),
      which Metro handles but `tsc` can't, producing ~27 "module not found" errors.
      Fix: `npx expo install @expo/vector-icons`.

---

## ✨ Optional product polish (nice-to-have)

- [ ] First-Today **"How Ballegho works"** one-time welcome tip (3 lines: do what you
      can · the app grows it for you · streaks never shame you). Reuse `lib/tips.ts`.
- [ ] More **Nūr sinks**: streak-grace / freeze (spend Nūr to protect a streak) and a
      sadaqah / charity tie-in. Currently the only sink is cosmetic share-card themes.
- [ ] More cosmetic unlocks / unlockable content as Nūr grows.
