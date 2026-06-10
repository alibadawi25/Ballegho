/**
 * useFavorites — the user's saved items (sunnahs/hadiths now; adhkār later).
 *
 * Backed by the generic `user_favorites` table (user_id, item_type, item_id).
 * Today everything is `item_type = 'sunnah'` — a saved sunnah also represents
 * its hadith, since hadiths live on the `sunnahs` rows. When the Adhkār tab
 * lands, pass `item_type = 'adhkar'` to the same API and it just works.
 *
 * The hook keeps a single in-memory Set of "type:id" keys so any screen can
 * cheaply ask `isFavorite(id)` and `toggle(id)` with optimistic updates.
 */

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSync, useSyncEffect } from "@/contexts/SyncContext";
import { supabase } from "@/lib/supabase";

export type FavoriteType = "sunnah" | "hadith" | "adhkar";

const keyOf = (type: FavoriteType, id: string) => `${type}:${id}`;

export function useFavorites() {
  const { user } = useAuth();
  const { emit } = useSync();
  const [keys,    setKeys]    = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setKeys(new Set()); setLoading(false); return; }

    const { data, error } = await supabase
      .from("user_favorites")
      .select("item_type, item_id")
      .eq("user_id", user.id);

    if (error) console.error("[useFavorites] load failed:", error.message);

    setKeys(new Set((data ?? []).map((r: any) => keyOf(r.item_type, r.item_id))));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // Keep every useFavorites instance (library list, detail page, profile
  // shortcut) in agreement — a heart toggled on one reloads the others.
  useSyncEffect(["favorites"], load);

  const isFavorite = useCallback(
    (id: string, type: FavoriteType = "sunnah") => keys.has(keyOf(type, id)),
    [keys],
  );

  /** Optimistically add/remove a favorite and sync to Supabase. */
  const toggle = useCallback(async (id: string, type: FavoriteType = "sunnah") => {
    if (!user) return;
    const k        = keyOf(type, id);
    const wasFav   = keys.has(k);

    // Optimistic update
    setKeys((prev) => {
      const next = new Set(prev);
      if (wasFav) next.delete(k); else next.add(k);
      return next;
    });

    if (wasFav) {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("item_type", type)
        .eq("item_id", id);
      if (error) {
        console.error("[useFavorites] remove failed:", error.message);
        setKeys((prev) => new Set(prev).add(k)); // rollback
      } else {
        emit("favorites");
      }
    } else {
      const { error } = await supabase
        .from("user_favorites")
        .insert({ user_id: user.id, item_type: type, item_id: id });
      if (error) {
        console.error("[useFavorites] add failed:", error.message);
        setKeys((prev) => { const n = new Set(prev); n.delete(k); return n; }); // rollback
      } else {
        emit("favorites");
      }
    }
  }, [user?.id, keys, emit]);

  /** All saved item ids of a given type (e.g. to filter the library). */
  const idsOfType = useCallback((type: FavoriteType = "sunnah") => {
    const prefix = `${type}:`;
    const out = new Set<string>();
    for (const k of keys) if (k.startsWith(prefix)) out.add(k.slice(prefix.length));
    return out;
  }, [keys]);

  return { loading, isFavorite, toggle, idsOfType, count: keys.size, reload: load };
}
