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
  const { prayers, nextPrayer, secondsUntil, city, loading, permissionDenied, retry } = usePrayerCtx();
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

  const nextIndex = nextPrayer ? PRAYER_ORDER.indexOf(nextPrayer.key) : -1;

  // Circular: before Fajr → prev is Isha (yesterday); after Isha → next is Fajr (tomorrow)
  const prevKey: PrayerKey = nextIndex === 0
    ? "isha"   // before Fajr → yesterday's Isha
    : PRAYER_ORDER[nextIndex - 1];
  const afterKey: PrayerKey = nextIndex === 4
    ? "fajr"   // after Isha → tomorrow's Fajr (already set in hook)
    : PRAYER_ORDER[nextIndex + 1];

  const prevEntry  = nextIndex === 0
    ? { key: "isha" as PrayerKey, time: prayers[4]?.time }   // show today's Isha time as "previous"
    : nextIndex > 0 ? prayers[nextIndex - 1] : null;
  const afterEntry = nextIndex < 4 ? prayers[nextIndex + 1] : nextPrayer; // nextPrayer IS tomorrow's Fajr

  const nextName  = nextPrayer ? t.prayers[nextPrayer.key].name : "—";
  const prevName  = prevEntry  ? t.prayers[prevEntry.key].name  : null;
  const afterName = nextIndex === 4
    ? t.prayers["fajr"].name   // after Isha, "after" is Fajr
    : afterEntry ? t.prayers[afterEntry.key].name : null;
  const nextTime  = nextPrayer  ? formatTime(nextPrayer.time)     : "—";

  return (
    <View style={baseCard(c)}>

      {/* Top row: "Next" label ←→ city name */}
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}>
        {/* "Next" */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 5 }}>
          <Feather name="compass" size={11} color={c.gold} />
          <Text style={{
            fontSize: 10,
            fontWeight: "600",
            textTransform: isRTL ? "none" : "uppercase",
            ...(isRTL ? {} : { letterSpacing: 1.1 }),
            color: c.gold,
          }}>
            {t.nextPrayer}
          </Text>
        </View>

        {/* City name */}
        {city ? (
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 4 }}>
            <Feather name="map-pin" size={9} color={c.inkFaint} />
            <Text style={{
              fontSize: 10,
              color: c.inkMuted,
            }}>
              {city}
            </Text>
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

        {/* Next prayer — center, prominent */}
        <View style={{ alignItems: "center", flex: 1.6 }}>
          <Text style={{
            fontFamily: isRTL ? undefined : "Georgia",
            fontSize: isRTL ? 20 : 19,
            fontWeight: isRTL ? "600" : "400",
            color: c.gold,
            marginBottom: 2,
          }}>
            {nextName}
          </Text>
          <Text style={{
            fontFamily: "Georgia",
            fontSize: 15,
            color: c.ink,
            fontWeight: "400",
          }}>
            {nextTime}
          </Text>
          <Text style={{ fontSize: 10, color: c.inkMuted, marginTop: 2 }}>
            {countdown}
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
        gap: 5,
        marginTop: 14,
        justifyContent: "center",
      }}>
        {PRAYER_ORDER.map((key, i) => {
          // nextIndex === -1 means all 5 done (next is tomorrow's Fajr)
          const allDone   = nextIndex === -1 || (nextPrayer?.key === "fajr" && prayers[4]?.time < new Date());
          const isDone    = allDone || nextIndex > i;
          const isCurrent = !allDone && nextIndex === i;
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
  padding: 16,
  borderRadius: 16,
  backgroundColor: c.surface,
  borderWidth: 0.5,
  borderColor: c.divider,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 4,
  elevation: 1,
});
