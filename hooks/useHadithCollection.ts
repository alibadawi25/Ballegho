/**
 * useHadithCollection — loads a read-only hadith set from public.hadiths.
 *
 * Used by the collection screen for hadith-backed collections (e.g. "The 40",
 * collection key 'nawawi40'). Public reference content, ordered by number.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface Hadith {
  id:        string;
  number:    number;
  arabic:    string;
  english:   string | null;
  reference: string | null;
}

export function useHadithCollection(collection: string | undefined) {
  const [items,   setItems]   = useState<Hadith[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!collection) { setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase
        .from("hadiths")
        .select("id, number, arabic, english, reference")
        .eq("collection", collection)
        .order("number");
      if (!alive) return;
      if (error) console.error("[useHadithCollection] failed:", error.message);
      setItems((data ?? []) as Hadith[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [collection]);

  return { items, loading };
}
