import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { type PrayerKey } from "@/hooks/usePrayerTimes";
import { usePrayerCtx } from "@/contexts/PrayerTimesContext";
import { useLang } from "@/hooks/useLang";

function formatCountdown(seconds: number, isRTL: boolean): string {
  if (seconds <= 0) return isRTL ? "الآن" : "now";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const underHour = seconds < 3600;

  if (isRTL) {
    if (h > 0)        return m > 0 ? `${h} س ${m} د` : `${h} س`;
    if (underHour)    return s > 0 ? `${m} د ${s} ث` : `${m} د`;
    return `${m} د`;
  }

  if (h > 0)       return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (underHour)   return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${m}m`;
}

// Minutes elapsed since the adhān, e.g. "7m ago" / "منذ ٧ د". Mirrors the
// countdown's compact, Western-digit style used elsewhere in the strip.
function formatSince(minutes: number, isRTL: boolean): string {
  if (minutes <= 0) return isRTL ? "الآن" : "now";
  return isRTL ? `منذ ${minutes} د` : `${minutes}m ago`;
}

export interface StripColors {
  surface: string;
  divider: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  gold: string;
  bg: string;
}

const PRAYER_ORDER: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function PrayerStrip({ c }: { c: StripColors }) {
  const { t, isRTL } = useLang();
  const { prayers, nextPrayer, currentPrayer, minutesSincePrayer, secondsUntil, city, loading, permissionDenied, retry } = usePrayerCtx();
  const countdown = formatCountdown(secondsUntil, isRTL);

  if (loading) {
    return (
      <View style={[baseCard(c), { justifyContent: "center", paddingVertical: 22 }]}>
        <ActivityIndicator size="small" color={c.gold} />
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <TouchableOpacity
        onPress={retry}
        activeOpacity={0.7}
        style={[baseCard(c), { flexDirection: "row", gap: 8, paddingVertical: 18, alignItems: "center" }]}
      >
        <Feather name="map-pin" size={14} color={c.inkMuted} />
        <Text style={{ fontSize: 12, color: c.inkMuted, flex: 1 }}>{t.locationNeeded}</Text>
        <Text style={{ fontSize: 11, color: c.gold }}>{t.tapToRetry}</Text>
      </TouchableOpacity>
    );
  }

  // The featured (centre) prayer is the just-entered one for 30 min after its
  // adhān, otherwise the upcoming next. `upcomingIndex` (the real next prayer)
  // still drives the progress dots.
  const featured      = currentPrayer ?? nextPrayer;
  const featuredIndex = featured   ? PRAYER_ORDER.indexOf(featured.key)   : -1;
  const upcomingIndex = nextPrayer ? PRAYER_ORDER.indexOf(nextPrayer.key) : -1;

  // Surrounding prayers (prev ← featured → after), with day wrap-around.
  const prevEntry  = featuredIndex === 0
    ? { key: "isha" as PrayerKey, time: prayers[4]?.time }   // before Fajr → today's Isha
    : featuredIndex > 0 ? prayers[featuredIndex - 1] : null;
  const afterEntry = featuredIndex < 4 ? prayers[featuredIndex + 1] : nextPrayer; // after Isha → tomorrow's Fajr

  const featuredName = featured ? t.prayers[featured.key].name : "—";
  const featuredTime = featured ? formatTime(featured.time)    : "—";
  const prevName  = prevEntry  ? t.prayers[prevEntry.key].name  : null;
  const afterName = featuredIndex === 4
    ? t.prayers["fajr"].name   // after Isha, "after" is Fajr
    : afterEntry ? t.prayers[afterEntry.key].name : null;

  return (
    <View style={baseCard(c)}>

      {/* Top row: "Next" label ←→ city name — compact */}
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
      }}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 4 }}>
          <Feather name={currentPrayer ? "bell" : "compass"} size={10} color={c.gold} />
          <Text style={{
            fontSize: 9, fontWeight: "600",
            textTransform: isRTL ? "none" : "uppercase",
            ...(isRTL ? {} : { letterSpacing: 1.1 }),
            color: c.gold,
          }}>
            {currentPrayer ? t.prayerNow : t.nextPrayer}
          </Text>
        </View>
        {city ? (
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 3 }}>
            <Feather name="map-pin" size={8} color={c.inkFaint} />
            <Text style={{ fontSize: 9, color: c.inkFaint }}>{city}</Text>
          </View>
        ) : null}
      </View>

      {/* Middle: prev → next → after */}
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        gap: 0,
      }}>

        {/* Previous prayer — muted, left */}
        <View style={{ flex: 1, alignItems: isRTL ? "flex-end" : "flex-start" }}>
          {prevName ? (
            <>
              <Text style={{
                fontSize: 11,
                color: c.inkFaint,
                textDecorationLine: "line-through",
                textDecorationColor: c.inkFaint,
                textAlign: isRTL ? "right" : "left",
              }}>
                {prevName}
              </Text>
              <Text style={{ fontSize: 9, color: c.inkFaint, marginTop: 1 }}>
                {prevEntry ? formatTime(prevEntry.time) : ""}
              </Text>
            </>
          ) : (
            <Text style={{ fontSize: 11, color: c.inkFaint }}>—</Text>
          )}
        </View>

        {/* Divider arrow */}
        <View style={{ paddingHorizontal: 10, opacity: 0.25 }}>
          <Feather
            name={isRTL ? "chevron-left" : "chevron-right"}
            size={13}
            color={c.inkMuted}
          />
        </View>

        {/* Featured prayer — center, compact */}
        <View style={{ alignItems: "center", flex: 1.6 }}>
          <Text style={{
            fontFamily: isRTL ? undefined : "Georgia",
            fontSize: isRTL ? 17 : 17,
            fontWeight: isRTL ? "600" : "400",
            color: c.gold,
            marginBottom: 1,
          }}>
            {featuredName}
          </Text>
          <Text style={{ fontFamily: "Georgia", fontSize: 14, color: c.ink }}>
            {featuredTime}
          </Text>
          {/* When the adhān has just come, show how long ago instead of a
              countdown — so a glance tells you it's already in. */}
          <Text style={{ fontSize: 10, color: currentPrayer ? c.gold : c.inkMuted, marginTop: 1 }}>
            {currentPrayer ? formatSince(minutesSincePrayer, isRTL) : countdown}
          </Text>
        </View>

        {/* Divider arrow */}
        <View style={{ paddingHorizontal: 10, opacity: 0.25 }}>
          <Feather
            name={isRTL ? "chevron-left" : "chevron-right"}
            size={13}
            color={c.inkMuted}
          />
        </View>

        {/* After prayer — faint, right */}
        <View style={{ flex: 1, alignItems: isRTL ? "flex-start" : "flex-end" }}>
          {afterName ? (
            <>
              <Text style={{
                fontSize: 11,
                color: c.inkFaint,
                textAlign: isRTL ? "left" : "right",
              }}>
                {afterName}
              </Text>
              <Text style={{ fontSize: 9, color: c.inkFaint, marginTop: 1, textAlign: isRTL ? "left" : "right" }}>
                {afterEntry ? formatTime(afterEntry.time) : ""}
              </Text>
            </>
          ) : (
            <Text style={{ fontSize: 11, color: c.inkFaint, textAlign: isRTL ? "left" : "right" }}>—</Text>
          )}
        </View>

      </View>

      {/* Bottom: thin progress dots */}
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        gap: 4,
        marginTop: 10,
        justifyContent: "center",
      }}>
        {PRAYER_ORDER.map((key, i) => {
          // upcomingIndex === -1 means all 5 done (next is tomorrow's Fajr)
          const allDone   = upcomingIndex === -1 || (nextPrayer?.key === "fajr" && prayers[4]?.time < new Date());
          const isDone    = allDone || upcomingIndex > i;
          const isCurrent = !allDone && upcomingIndex === i;
          return (
            <View key={key} style={{
              height: 3,
              flex: 1,
              borderRadius: 2,
              backgroundColor: isDone
                ? c.gold
                : isCurrent
                ? c.gold + "60"
                : c.divider,
            }} />
          );
        })}
      </View>

    </View>
  );
}

const baseCard = (c: StripColors) => ({
  padding: 12,
  borderRadius: 14,
  backgroundColor: c.surface,
  borderWidth: 0.5,
  borderColor: c.divider,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 4,
  elevation: 1,
});
