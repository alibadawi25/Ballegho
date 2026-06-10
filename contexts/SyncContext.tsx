/**
 * SyncContext — a tiny app-wide signal bus ("when X changes, refresh whatever
 * depends on X").
 *
 * ─── Why this exists ──────────────────────────────────────────────────────────
 *
 *   Data lives in several independent hook instances that each hold their own
 *   copy: the Today screen's `useSunnahs`, the Library's `useSunnahLibrary`, a
 *   `useFavorites` on both the library and the detail page, etc. When one of
 *   them mutates the database (the coach unlocks a sunnah, a heart is toggled),
 *   the *others* had no way to know — so the Library's "active" count and badges
 *   went stale until you happened to re-focus the tab and a `useFocusEffect`
 *   fired. That's fragile and easy to forget.
 *
 *   This bus replaces "hope the screen re-focuses" with "broadcast a signal the
 *   instant the data changes". A mutation calls `emit("sunnahs")`; every hook
 *   that subscribed to "sunnahs" reloads immediately — even on a background tab,
 *   as long as it's mounted. `useFocusEffect` reloads can stay as a backstop.
 *
 * ─── Usage ────────────────────────────────────────────────────────────────────
 *
 *   // After a mutation:
 *   const { emit } = useSync();
 *   await supabase.rpc("unlock_pick_sunnah", …);
 *   emit("sunnahs");
 *
 *   // To stay fresh when others mutate:
 *   useSyncEffect(["sunnahs", "favorites"], reload);
 *
 * It's a ref-backed emitter, so `emit` never re-renders the provider tree — only
 * the specific subscribers' handlers run.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";

/** The kinds of data changes screens care about. Add new topics as features grow. */
export type SyncTopic =
  | "sunnahs"      // the user's active practice list changed (add / pause / recover)
  | "completions"  // a daily completion was toggled (affects streaks, progress)
  | "favorites"    // the saved/favorites set changed
  | "nur"          // Nūr balance or unlocks changed
  | "profile";     // behavioral profile / settings changed

type Listener = () => void;

interface SyncBus {
  /** Broadcast one or more topics to every current subscriber. */
  emit: (...topics: SyncTopic[]) => void;
  /** Subscribe `fn` to all `topics`. Returns an unsubscribe function. */
  subscribe: (topics: SyncTopic[], fn: Listener) => () => void;
}

const Ctx = createContext<SyncBus | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  // topic → set of listeners. A ref so emitting never re-renders the tree.
  const listeners = useRef<Map<SyncTopic, Set<Listener>>>(new Map());

  const emit = useCallback((...topics: SyncTopic[]) => {
    for (const topic of topics) {
      const set = listeners.current.get(topic);
      if (!set) continue;
      // Copy before iterating so a handler that (un)subscribes can't mutate the
      // set mid-loop.
      for (const fn of [...set]) {
        try { fn(); } catch (e) { console.error("[sync] listener for", topic, "threw:", e); }
      }
    }
  }, []);

  const subscribe = useCallback((topics: SyncTopic[], fn: Listener) => {
    for (const topic of topics) {
      let set = listeners.current.get(topic);
      if (!set) { set = new Set(); listeners.current.set(topic, set); }
      set.add(fn);
    }
    return () => {
      for (const topic of topics) listeners.current.get(topic)?.delete(fn);
    };
  }, []);

  return <Ctx.Provider value={{ emit, subscribe }}>{children}</Ctx.Provider>;
}

export function useSync(): SyncBus {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSync must be used inside <SyncProvider>");
  return ctx;
}

/**
 * Run `handler` whenever any of `topics` is emitted. Does NOT run on mount —
 * it's purely a "react to other screens' changes" hook, so it won't fight your
 * normal initial-load effect. `handler` is read through a ref, so you can pass
 * an inline closure without causing re-subscribes.
 */
export function useSyncEffect(topics: SyncTopic[], handler: Listener) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSyncEffect must be used inside <SyncProvider>");
  const { subscribe } = ctx;

  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  // Join the topics into a stable string so re-renders with the same topic list
  // (a fresh array literal each time) don't churn the subscription.
  const key = topics.join("|");

  useEffect(() => {
    return subscribe(topics, () => handlerRef.current());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, subscribe]);
}
