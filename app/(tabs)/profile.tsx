/**
 * Profile screen — settings-list layout.
 *
 * Main screen: compact header + grouped rows (icon, label, current value,
 *   chevron). Clean and scannable.
 *
 * Each row opens a modal sheet with the actual editor:
 *   • Schedule      — wake / sleep time pickers
 *   • Practice level— consistency segment
 *   • My Sunnahs   — anchor + remove management
 *   • Language      — lang segment
 *   • Appearance    — theme segment
 *   • Prayer times  — calc-method list
 */

import {
  Text, View, TouchableOpacity, ScrollView, Alert,
  TextInput, Modal, Platform, ActivityIndicator, StyleSheet, Switch,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLang } from "@/hooks/useLang";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useSettings } from "@/contexts/SettingsContext";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { supabase } from "@/lib/supabase";
import { localizeNumber } from "@/lib/arabicNumerals";
import type { LangPref, ThemePref, CalcMethod, NotifKey } from "@/contexts/SettingsContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConsistencyLevel = "beginner" | "some" | "consistent";
type ModalType = "name" | "schedule" | "practice" | "sunnahs" | "language" | "appearance" | "prayer" | "reminders" | null;

interface BehavioralProfile {
  wake_time:         string; // "HH:MM"
  sleep_time:        string;
  consistency_level: ConsistencyLevel;
}

interface ProfileSunnah {
  user_sunnah_id: string;
  sunnah_id:      string;
  name_en:        string;
  name_ar:        string;
  time_of_day:    string;
  is_anchor:      boolean;
  position:       number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeStrToDate(str: string): Date {
  const [h, m] = str.split(":").map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0); return d;
}
function dateToTimeStr(d: Date) {
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
const AR_DIGS = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
const toArN = (n: number, pad = 0) =>
  String(n).padStart(pad, "0").replace(/[0-9]/g, d => AR_DIGS[+d]);

function fmtTime(str: string, isRTL = false) {
  const [h, m] = str.split(":").map(Number);
  const h12  = h % 12 || 12;
  const mins = String(m).padStart(2, "0");
  if (isRTL) {
    const period = h >= 12 ? "م" : "ص";
    return `${toArN(h12)}:${mins.replace(/[0-9]/g, d => AR_DIGS[+d])} ${period}`;
  }
  return `${h12}:${mins} ${h >= 12 ? "PM" : "AM"}`;
}

// ─── Palette ──────────────────────────────────────────────────────────────────

function mkC(isDark: boolean) {
  return {
    bg:         isDark ? "#0a1422" : "#f5efe2",
    surface:    isDark ? "#122236" : "#ffffff",
    surfaceDim: isDark ? "#0f1d31" : "#ede4d0",
    ink:        isDark ? "#f4ecd8" : "#0e1a2b",
    inkMuted:   isDark ? "#8a8876" : "#7a8193",
    inkFaint:   isDark ? "#4a5362" : "#b9bcc4",
    gold:       isDark ? "#d4af37" : "#b8892a",
    rose:       isDark ? "#d27866" : "#a84a3d",
    divider:    isDark ? "rgba(244,236,216,0.08)" : "rgba(14,26,43,0.1)",
  };
}
type C = ReturnType<typeof mkC>;

// ─── Reusable building blocks ─────────────────────────────────────────────────

/** Section heading */
function SectionHead({ label, c }: { label: string; c: C }) {
  const { isRTL } = useLang();
  return (
    <Text style={{
      fontSize: isRTL ? 13 : 11,
      fontWeight: "600",
      ...(isRTL
        ? { fontFamily: "Amiri_400Regular", textAlign: "right", writingDirection: "rtl" }
        : { textTransform: "uppercase", letterSpacing: 1.2 }),
      color: c.inkMuted,
      marginBottom: 6,
      marginLeft: isRTL ? 0 : 4,
      marginRight: isRTL ? 4 : 0,
    }}>
      {label}
    </Text>
  );
}

/** A single settings row */
function Row({
  icon, iconColor, label, value, onPress, isRTL, c, last = false,
}: {
  icon: string; iconColor?: string; label: string; value?: string;
  onPress: () => void; isRTL: boolean; c: C; last?: boolean;
}) {
  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[s.row, isRTL && { flexDirection: "row-reverse" }]}
      >
        <View style={[s.rowIcon, { backgroundColor: (iconColor ?? c.gold) + "20" }]}>
          <Feather name={icon as any} size={16} color={iconColor ?? c.gold} />
        </View>
        <Text style={[s.rowLabel, { color: c.ink }, isRTL && s.rowLabelAr]}>{label}</Text>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
          {value ? (
            <Text style={{ fontSize: 13, color: c.inkMuted }}>{value}</Text>
          ) : null}
          <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={c.inkFaint} />
        </View>
      </TouchableOpacity>
      {!last && <View style={[s.insetDivider, { backgroundColor: c.divider }]} />}
    </>
  );
}

/** Wrapper used by every modal sheet */
function Sheet({
  visible, title, onClose, c, children,
}: {
  visible: boolean; title: string; onClose: () => void; c: C; children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "overFullScreen"}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {/* drag handle */}
        <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.inkFaint + "60" }} />
        </View>
        {/* sheet header */}
        <View style={[s.sheetHeader, { borderBottomColor: c.divider }]}>
          <Text style={[s.sheetTitle, { color: c.ink }]}>{title}</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={s.sheetClose}>
            <Feather name="x" size={20} color={c.inkMuted} />
          </TouchableOpacity>
        </View>
        {children}
      </View>
    </Modal>
  );
}

/** Segment control used in multiple sheets */
function Seg<T extends string>({
  opts, value, onChange, c,
}: {
  opts: { value: T; labelEn: string; labelAr: string }[];
  value: T; onChange: (v: T) => void; c: C;
}) {
  const { isRTL } = useLang();
  return (
    <View style={{ flexDirection: "row", backgroundColor: c.surfaceDim, borderRadius: 12, padding: 3, gap: 3 }}>
      {opts.map((o) => {
        const on = o.value === value;
        return (
          <TouchableOpacity
            key={o.value} onPress={() => onChange(o.value)} activeOpacity={0.8}
            style={{
              flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: "center",
              backgroundColor: on ? c.surface : "transparent",
              shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
              shadowOpacity: on ? 0.08 : 0, shadowRadius: 2, elevation: on ? 2 : 0,
            }}
          >
            <Text style={{ fontSize: 13, color: on ? c.gold : c.inkMuted }}>
              {isRTL ? o.labelAr : o.labelEn}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Modal sheets ─────────────────────────────────────────────────────────────

function NameSheet({
  visible, initial, c, onSave, onClose,
}: {
  visible: boolean; initial: string; c: C;
  onSave: (n: string) => void; onClose: () => void;
}) {
  const { isRTL } = useLang();
  const [draft, setDraft] = useState(initial);
  useEffect(() => { if (visible) setDraft(initial); }, [visible, initial]);

  return (
    <Sheet visible={visible} title={isRTL ? "الاسم" : "Edit name"} onClose={onClose} c={c}>
      <View style={{ padding: 20, gap: 14 }}>
        <TextInput
          value={draft} onChangeText={setDraft}
          autoFocus autoCapitalize="words"
          style={[s.textInput, { backgroundColor: c.surface, color: c.ink, borderColor: c.divider, textAlign: isRTL ? "right" : "left" }]}
          placeholderTextColor={c.inkFaint}
          placeholder={isRTL ? "اسمك" : "Your name"}
        />
        <TouchableOpacity
          onPress={() => draft.trim() && onSave(draft.trim())}
          activeOpacity={0.85}
          style={[s.primaryBtn, { backgroundColor: draft.trim() ? c.gold : c.inkFaint }]}
        >
          <Text style={[s.primaryBtnText, { color: "#0e1a2b" }]}>{isRTL ? "حفظ" : "Save"}</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
}

function ScheduleSheet({
  visible, profile, c, onUpdate, onClose,
}: {
  visible: boolean; profile: BehavioralProfile | null; c: C;
  onUpdate: (field: "wake_time" | "sleep_time", val: string) => void;
  onClose: () => void;
}) {
  const { isRTL, isDark } = useLang();
  const [picking, setPicking] = useState<"wake" | "sleep" | null>(null);

  function handlePick(_: any, date?: Date) {
    if (!date || !profile) { setPicking(null); return; }
    onUpdate(picking === "wake" ? "wake_time" : "sleep_time", dateToTimeStr(date));
    if (Platform.OS === "android") setPicking(null);
  }

  const rows = profile ? [
    { key: "wake" as const, emoji: "🌅", labelEn: "Wake up",    labelAr: "الاستيقاظ",  time: profile.wake_time },
    { key: "sleep" as const, emoji: "🌙", labelEn: "Sleep",     labelAr: "النوم",       time: profile.sleep_time },
  ] : [];

  return (
    <Sheet visible={visible} title={isRTL ? "الجدول اليومي" : "Daily schedule"} onClose={onClose} c={c}>
      <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {!profile ? (
          <ActivityIndicator color={c.gold} style={{ marginTop: 40 }} />
        ) : rows.map((row, i) => (
          <View key={row.key}>
            <TouchableOpacity
              onPress={() => setPicking((p) => p === row.key ? null : row.key)}
              activeOpacity={0.7}
              style={[s.schedRow, isRTL && { flexDirection: "row-reverse" },
                { backgroundColor: c.surface, borderColor: picking === row.key ? c.gold : c.divider }]}
            >
              <View style={[s.schedIcon, { backgroundColor: c.surfaceDim }]}>
                <Text style={{ fontSize: 20 }}>{row.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[{ color: c.ink, fontSize: 14, fontWeight: "500", marginBottom: 2 }, isRTL && { fontFamily: "Amiri_400Regular", fontSize: 16, fontWeight: "400", textAlign: "right" }]}>
                  {isRTL ? row.labelAr : row.labelEn}
                </Text>
              </View>
              <Text style={[s.schedTime, { color: c.gold }]}>{fmtTime(row.time, isRTL)}</Text>
            </TouchableOpacity>

            {picking === row.key && (
              <View style={[s.pickerBox, { backgroundColor: c.surfaceDim, borderColor: c.divider }]}>
                <DateTimePicker
                  value={timeStrToDate(row.time)}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handlePick}
                  textColor={c.ink}
                  themeVariant={isDark ? "dark" : "light"}
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    onPress={() => setPicking(null)}
                    activeOpacity={0.85}
                    style={[s.doneBtn, { backgroundColor: c.gold }]}
                  >
                    <Text style={[s.doneBtnText, { color: isDark ? "#0a1422" : "#0e1a2b" }]}>
                      {isRTL ? "تم" : "Done"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {i < rows.length - 1 && <View style={{ height: 12 }} />}
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

function PracticeSheet({
  visible, profile, c, onUpdate, onClose,
}: {
  visible: boolean; profile: BehavioralProfile | null; c: C;
  onUpdate: (level: ConsistencyLevel) => void; onClose: () => void;
}) {
  const { isRTL } = useLang();
  const opts: { value: ConsistencyLevel; emoji: string; labelEn: string; labelAr: string; subEn: string; subAr: string }[] = [
    { value: "beginner",   emoji: "🌱", labelEn: "Just starting",    labelAr: "أبدأ للتو",       subEn: "Building from scratch",         subAr: "أبني من الصفر" },
    { value: "some",       emoji: "🌿", labelEn: "Some habits",      labelAr: "بعض العادات",     subEn: "A few things, not consistently", subAr: "بعض الأشياء بدون انتظام" },
    { value: "consistent", emoji: "🌳", labelEn: "Looking to deepen",labelAr: "أتطلع للتعمق",   subEn: "Consistent, want to grow",      subAr: "منتظم وأريد أن أنمو" },
  ];

  return (
    <Sheet visible={visible} title={isRTL ? "مستوى الالتزام" : "Practice level"} onClose={onClose} c={c}>
      <View style={{ padding: 20, gap: 10 }}>
        {!profile ? (
          <ActivityIndicator color={c.gold} style={{ marginTop: 40 }} />
        ) : opts.map((o) => {
          const active = profile.consistency_level === o.value;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => { onUpdate(o.value); onClose(); }}
              activeOpacity={0.8}
              style={[s.practiceCard, isRTL && { flexDirection: "row-reverse" },
                { backgroundColor: c.surface, borderColor: active ? c.gold : c.divider }]}
            >
              <Text style={{ fontSize: 26 }}>{o.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 15, color: active ? c.gold : c.ink, fontWeight: "500", marginBottom: 2 },
                  isRTL && { fontFamily: "Amiri_400Regular", fontWeight: "400", fontSize: 17, textAlign: "right", writingDirection: "rtl" }]}>
                  {isRTL ? o.labelAr : o.labelEn}
                </Text>
                <Text style={[{ fontSize: 12, color: c.inkMuted },
                  isRTL && { fontFamily: "Amiri_400Regular", fontSize: 14, textAlign: "right", writingDirection: "rtl" }]}>
                  {isRTL ? o.subAr : o.subEn}
                </Text>
              </View>
              <View style={[s.radio, active && { borderColor: c.gold, backgroundColor: c.gold }]}>
                {active && <View style={[s.radioDot, { backgroundColor: "#0e1a2b" }]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Sheet>
  );
}

function SunnahsSheet({
  visible, sunnahs, c, onToggleAnchor, onRemove, onClose,
}: {
  visible: boolean; sunnahs: ProfileSunnah[]; c: C;
  onToggleAnchor: (id: string) => void;
  onRemove:       (s: ProfileSunnah) => void;
  onClose:        () => void;
}) {
  const { isRTL } = useLang();

  return (
    <Sheet visible={visible} title={isRTL ? "سنني" : "My sunnahs"} onClose={onClose} c={c}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {sunnahs.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text style={{ fontSize: 13, color: c.inkMuted }}>
              {isRTL ? "لا توجد سنن نشطة" : "No active sunnahs"}
            </Text>
          </View>
        ) : (
          <View style={{ margin: 20, backgroundColor: c.surface, borderRadius: 16, borderWidth: 0.5, borderColor: c.divider, overflow: "hidden" }}>
            {sunnahs.map((sn, idx) => (
              <View key={sn.sunnah_id}>
                {idx > 0 && <View style={[s.insetDivider, { backgroundColor: c.divider, marginLeft: 0 }]} />}
                <View style={[s.sunnahRow, isRTL && { flexDirection: "row-reverse" }]}>
                  {/* Anchor */}
                  <TouchableOpacity
                    onPress={() => onToggleAnchor(sn.sunnah_id)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="anchor" size={16} color={sn.is_anchor ? c.gold : c.inkFaint} />
                  </TouchableOpacity>

                  {/* Names */}
                  <View style={{ flex: 1 }}>
                    <Text style={[{ fontFamily: "Amiri_400Regular", fontSize: 15, color: c.gold, textAlign: "right", writingDirection: "rtl", lineHeight: 22 }]}>
                      {sn.name_ar}
                    </Text>
                    <Text style={{ fontSize: 11, color: c.inkMuted, marginTop: 1 }}>{sn.name_en}</Text>
                  </View>

                  {/* Remove */}
                  <TouchableOpacity
                    onPress={() => onRemove(sn)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="trash-2" size={15} color={sn.is_anchor ? c.inkFaint : c.rose + "aa"} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Hint */}
        <Text style={{ fontSize: 11, color: c.inkFaint, textAlign: "center", paddingBottom: 24, paddingHorizontal: 24 }}>
          {isRTL
            ? "اضغط على ⚓ لتحديد سننك المرساة — وهي ما تحمي سلسلتك. أبقِ واحدة على الأقل."
            : "Tap ⚓ to set your anchors — the core sunnahs that protect your streak. Keep at least one."}
        </Text>
      </ScrollView>
    </Sheet>
  );
}

function LanguageSheet({
  visible, c, onClose,
}: { visible: boolean; c: C; onClose: () => void }) {
  const { isRTL } = useLang();
  const { langPref, setLangPref } = useSettings();
  const opts: { value: LangPref; labelEn: string; labelAr: string; sub: string }[] = [
    { value: "en",     labelEn: "English",  labelAr: "الإنجليزية", sub: "English"     },
    { value: "ar",     labelEn: "Arabic",   labelAr: "العربية",    sub: "العربية"     },
    { value: "system", labelEn: "Auto",     labelAr: "تلقائي",     sub: "Device language / لغة الجهاز" },
  ];
  return (
    <Sheet visible={visible} title={isRTL ? "اللغة" : "Language"} onClose={onClose} c={c}>
      <View style={{ padding: 20, gap: 10 }}>
        {opts.map((o) => {
          const active = langPref === o.value;
          return (
            <TouchableOpacity key={o.value} onPress={() => { setLangPref(o.value); onClose(); }}
              activeOpacity={0.8}
              style={[s.choiceCard, { backgroundColor: c.surface, borderColor: active ? c.gold : c.divider }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: active ? c.gold : c.ink, fontWeight: active ? "600" : "400" }}>
                  {isRTL ? o.labelAr : o.labelEn}
                </Text>
                <Text style={{ fontSize: 11, color: c.inkMuted, marginTop: 2 }}>{o.sub}</Text>
              </View>
              {active && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.gold }} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </Sheet>
  );
}

function AppearanceSheet({
  visible, c, onClose,
}: { visible: boolean; c: C; onClose: () => void }) {
  const { isRTL } = useLang();
  const { themePref, setThemePref } = useSettings();
  const opts: { value: ThemePref; labelEn: string; labelAr: string; icon: string }[] = [
    { value: "light",  labelEn: "Light",  labelAr: "فاتح",   icon: "sun"      },
    { value: "dark",   labelEn: "Dark",   labelAr: "داكن",   icon: "moon"     },
    { value: "system", labelEn: "Auto",   labelAr: "تلقائي", icon: "smartphone" },
  ];
  return (
    <Sheet visible={visible} title={isRTL ? "المظهر" : "Appearance"} onClose={onClose} c={c}>
      <View style={{ padding: 20, gap: 10 }}>
        {opts.map((o) => {
          const active = themePref === o.value;
          return (
            <TouchableOpacity key={o.value} onPress={() => { setThemePref(o.value); onClose(); }}
              activeOpacity={0.8}
              style={[s.choiceCard, isRTL && { flexDirection: "row-reverse" },
                { backgroundColor: c.surface, borderColor: active ? c.gold : c.divider }]}>
              <View style={[s.rowIcon, { backgroundColor: c.gold + "18", marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }]}>
                <Feather name={o.icon as any} size={16} color={c.gold} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: active ? c.gold : c.ink, fontWeight: active ? "600" : "400" }}>
                {isRTL ? o.labelAr : o.labelEn}
              </Text>
              {active && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.gold }} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </Sheet>
  );
}

function RemindersSheet({
  visible, c, onClose,
}: { visible: boolean; c: C; onClose: () => void }) {
  const { isRTL } = useLang();
  const { notifPrefs, setNotifPref } = useSettings();

  // Per-type rows (gated by the master switch).
  const rows: { key: NotifKey; icon: string; en: string; ar: string; subEn: string; subAr: string }[] = [
    { key: "morning",  icon: "sunrise",  en: "Morning",        ar: "الصباح",       subEn: "After Fajr",        subAr: "بعد الفجر" },
    { key: "evening",  icon: "sunset",   en: "Evening adhkār", ar: "أذكار المساء", subEn: "After ʿAṣr",        subAr: "بعد العصر" },
    { key: "night",    icon: "moon",     en: "Before sleep",   ar: "قبل النوم",     subEn: "After ʿIshāʾ",      subAr: "بعد العشاء" },
    { key: "streak",   icon: "zap",      en: "Seal your streak", ar: "أتمّ يومك",  subEn: "Before Maghrib",    subAr: "قبل المغرب" },
    { key: "occasion", icon: "calendar", en: "Friday & fasting", ar: "الجمعة والصيام", subEn: "al-Kahf · fast eves", subAr: "الكهف · ليالي الصيام" },
  ];

  const master = notifPrefs.enabled;

  return (
    <Sheet visible={visible} title={isRTL ? "التذكيرات" : "Reminders"} onClose={onClose} c={c}>
      <View style={{ padding: 20, gap: 10 }}>
        {/* Master toggle */}
        <View style={[s.choiceCard, isRTL && { flexDirection: "row-reverse" },
          { backgroundColor: c.surface, borderColor: master ? c.gold : c.divider }]}>
          <View style={[s.rowIcon, { backgroundColor: c.gold + "18", marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }]}>
            <Feather name="bell" size={16} color={c.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, color: c.ink, fontWeight: "600", textAlign: isRTL ? "right" : "left" }}>
              {isRTL ? "كل التذكيرات" : "All reminders"}
            </Text>
            <Text style={{ fontSize: 11, color: c.inkMuted, marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
              {isRTL ? "تنبيهات لطيفة مرتبطة بأوقات الصلاة" : "Gentle nudges anchored to prayer times"}
            </Text>
          </View>
          <Switch
            value={master}
            onValueChange={(v) => setNotifPref("enabled", v)}
            trackColor={{ false: c.divider, true: c.gold }}
            thumbColor="#fff"
          />
        </View>

        {/* Per-type toggles — dimmed + disabled when master is off */}
        <View style={{ opacity: master ? 1 : 0.4, gap: 10 }} pointerEvents={master ? "auto" : "none"}>
          {rows.map((r) => (
            <View key={r.key} style={[s.choiceCard, isRTL && { flexDirection: "row-reverse" },
              { backgroundColor: c.surface, borderColor: c.divider }]}>
              <View style={[s.rowIcon, { backgroundColor: c.gold + "14", marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }]}>
                <Feather name={r.icon as any} size={15} color={c.inkMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: c.ink, textAlign: isRTL ? "right" : "left" }}>
                  {isRTL ? r.ar : r.en}
                </Text>
                <Text style={{ fontSize: 11, color: c.inkMuted, marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
                  {isRTL ? r.subAr : r.subEn}
                </Text>
              </View>
              <Switch
                value={notifPrefs[r.key]}
                onValueChange={(v) => setNotifPref(r.key, v)}
                trackColor={{ false: c.divider, true: c.gold }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 11, color: c.inkFaint, textAlign: "center", marginTop: 4, lineHeight: 16 }}>
          {isRTL
            ? "تُرسَل التذكيرات على هذا الجهاز فقط حسب أوقات صلاتك."
            : "Reminders are sent on this device only, based on your prayer times."}
        </Text>
      </View>
    </Sheet>
  );
}

const CALC_OPTS = [
  { value: "auto",              en: "Auto (by location)",   ar: "تلقائي (حسب الموقع)"   },
  { value: "MuslimWorldLeague", en: "Muslim World League",  ar: "رابطة العالم الإسلامي" },
  { value: "UmmAlQura",         en: "Umm Al-Qura (Mecca)",  ar: "أم القرى (مكة)"        },
  { value: "Egyptian",          en: "Egyptian Authority",   ar: "الهيئة المصرية"         },
  { value: "Kuwait",            en: "Kuwait",               ar: "الكويت"                 },
  { value: "Qatar",             en: "Qatar",                ar: "قطر"                    },
  { value: "Dubai",             en: "Dubai",                ar: "دبي"                    },
  { value: "Turkey",            en: "Turkey (Diyanet)",     ar: "تركيا (ديانت)"          },
  { value: "Karachi",           en: "Karachi (S. Asia)",    ar: "كراتشي (جنوب آسيا)"    },
  { value: "NorthAmerica",      en: "North America (ISNA)", ar: "أمريكا الشمالية"        },
  { value: "Singapore",         en: "Singapore",            ar: "سنغافورة"               },
  { value: "Tehran",            en: "Tehran (Iran)",        ar: "طهران (إيران)"          },
] as { value: CalcMethod; en: string; ar: string }[];

function PrayerSheet({
  visible, c, onClose,
}: { visible: boolean; c: C; onClose: () => void }) {
  const { isRTL } = useLang();
  const { calcMethod, setCalcMethod } = useSettings();
  const { resolvedMethod } = usePrayerTimes();

  return (
    <Sheet visible={visible} title={isRTL ? "طريقة الصلاة" : "Prayer times"} onClose={onClose} c={c}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ margin: 20, backgroundColor: c.surface, borderRadius: 16, borderWidth: 0.5, borderColor: c.divider, overflow: "hidden" }}>
          {CALC_OPTS.map((opt, i) => {
            const active = calcMethod === opt.value;
            const detected = opt.value === "auto" && resolvedMethod && resolvedMethod !== "auto"
              ? CALC_OPTS.find((o) => o.value === resolvedMethod)?.[isRTL ? "ar" : "en"] : null;
            return (
              <View key={opt.value}>
                {i > 0 && <View style={[s.insetDivider, { backgroundColor: c.divider, marginLeft: 0 }]} />}
                <TouchableOpacity
                  onPress={() => { setCalcMethod(opt.value); onClose(); }}
                  activeOpacity={0.7}
                  style={[{ paddingHorizontal: 18, paddingVertical: 13,
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center", justifyContent: "space-between",
                    backgroundColor: active ? c.gold + "0e" : "transparent" }]}
                >
                  <View style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
                    <Text style={{ fontSize: 13, color: active ? c.gold : c.ink, fontWeight: active ? "500" : "400" }}>
                      {isRTL ? opt.ar : opt.en}
                    </Text>
                    {detected && (
                      <Text style={{ fontSize: 10, color: c.inkMuted, marginTop: 1 }}>
                        {isRTL ? `تم اكتشاف: ${detected}` : `Detected: ${detected}`}
                      </Text>
                    )}
                  </View>
                  {active && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.gold }} />}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Sheet>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { t, isRTL, isDark } = useLang();
  const { user, signOut } = useAuth();
  const { count: savedCount, reload: reloadFavs } = useFavorites();
  useFocusEffect(useCallback(() => { reloadFavs(); }, [reloadFavs]));
  const { langPref, themePref, calcMethod, notifPrefs } = useSettings();
  const c = mkC(isDark);

  const [modal, setModal] = useState<ModalType>(null);

  // ── Identity ──────────────────────────────────────────────────────────────
  // Use || (not ??) so empty strings also fall through to the next fallback.
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || ""
  );
  const email   = user?.email ?? "—";
  // Fallback: first letter of email if name is empty, then "?" as last resort.
  const initial = displayName.charAt(0).toUpperCase()
    || user?.email?.charAt(0).toUpperCase()
    || "?";

  // ── Behavioral profile ────────────────────────────────────────────────────
  const [profile, setProfile] = useState<BehavioralProfile | null>(null);
  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_behavioral_profile")
      .select("wake_time, sleep_time, consistency_level")
      .eq("user_id", user.id)
      .single();
    if (data) setProfile(data as BehavioralProfile);
  }, [user?.id]);

  // ── Sunnahs ───────────────────────────────────────────────────────────────
  const [sunnahs, setSunnahs] = useState<ProfileSunnah[]>([]);
  const loadSunnahs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_sunnahs")
      .select("id, sunnah_id, is_anchor, position, sunnahs(name_en, name_ar, time_of_day)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("position");
    if (data) {
      setSunnahs(data.map((row: any) => {
        const sn = Array.isArray(row.sunnahs) ? row.sunnahs[0] : row.sunnahs;
        return {
          user_sunnah_id: row.id,
          sunnah_id:      row.sunnah_id,
          name_en:        sn?.name_en ?? "",
          name_ar:        sn?.name_ar ?? "",
          time_of_day:    sn?.time_of_day ?? "anytime",
          is_anchor:      row.is_anchor,
          position:       row.position,
        };
      }));
    }
  }, [user?.id]);

  useEffect(() => { loadProfile(); loadSunnahs(); }, [loadProfile, loadSunnahs]);

  // ── Save: name ────────────────────────────────────────────────────────────
  async function saveName(name: string) {
    setDisplayName(name);
    setModal(null);
    await Promise.all([
      supabase.auth.updateUser({ data: { full_name: name } }),
      supabase.from("profiles").update({ name }).eq("id", user!.id),
    ]);
  }

  // ── Save: time ────────────────────────────────────────────────────────────
  function saveTime(field: "wake_time" | "sleep_time", val: string) {
    if (!profile) return;
    setProfile({ ...profile, [field]: val });
    supabase.from("user_behavioral_profile").update({
      [field]: val,
      ...(field === "wake_time" ? { is_morning_person: parseInt(val) < 8 } : {}),
    }).eq("user_id", user!.id);
  }

  // ── Save: practice level ──────────────────────────────────────────────────
  function saveLevel(level: ConsistencyLevel) {
    if (!profile) return;
    setProfile({ ...profile, consistency_level: level });
    supabase.from("user_behavioral_profile")
      .update({ consistency_level: level }).eq("user_id", user!.id);
  }

  // ── Toggle an anchor ───────────────────────────────────────────────────────
  // Anchors are a small core (one or more). Tapping ⚓ adds/removes — but at
  // least one anchor must always remain to protect the streak.
  async function toggleAnchor(sunnahId: string) {
    const sn = sunnahs.find((s) => s.sunnah_id === sunnahId);
    if (!sn) return;
    const next = !sn.is_anchor;

    if (!next) {
      const anchorCount = sunnahs.filter((s) => s.is_anchor).length;
      if (anchorCount <= 1) {
        Alert.alert(
          isRTL ? "أبقِ مرساةً واحدة" : "Keep one anchor",
          isRTL ? "يجب أن تبقى سنة مرساة واحدة على الأقل لحماية سلسلتك."
                : "Keep at least one anchor to protect your streak.",
          [{ text: "OK" }],
        );
        return;
      }
    }

    setSunnahs((p) => p.map((s) => (s.sunnah_id === sunnahId ? { ...s, is_anchor: next } : s)));
    await supabase.from("user_sunnahs").update({ is_anchor: next })
      .eq("user_id", user!.id).eq("sunnah_id", sunnahId);
  }

  // ── Save: remove sunnah ───────────────────────────────────────────────────
  function removeSunnah(sn: ProfileSunnah) {
    if (sn.is_anchor) {
      Alert.alert(
        isRTL ? "لا يمكن الإزالة" : "Cannot remove",
        isRTL ? "هذه سنة مرساة. ألغِ تثبيتها أولاً (اضغط ⚓)." : "This is an anchor. Un-anchor it first (tap ⚓).",
        [{ text: "OK" }],
      );
      return;
    }
    Alert.alert(
      isRTL ? "إزالة السنة" : "Remove sunnah",
      isRTL ? `إزالة "${sn.name_ar}"؟` : `Remove "${sn.name_en}"?`,
      [
        { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
        {
          text: isRTL ? "إزالة" : "Remove", style: "destructive",
          onPress: async () => {
            setSunnahs((p) => p.filter((x) => x.sunnah_id !== sn.sunnah_id));
            await supabase.from("user_sunnahs")
              .update({ is_active: false })
              .eq("user_id", user!.id).eq("sunnah_id", sn.sunnah_id);
          },
        },
      ],
    );
  }

  // ── Sign out ──────────────────────────────────────────────────────────────
  function handleSignOut() {
    Alert.alert(
      isRTL ? "تسجيل الخروج" : "Sign out",
      isRTL ? "ستحتاج إلى تسجيل الدخول من جديد." : "You'll need to sign back in.",
      [
        { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
        { text: isRTL ? "خروج" : "Sign out", style: "destructive",
          onPress: async () => { await signOut(); router.replace("/(auth)/welcome"); } },
      ],
    );
  }

  // ── Current-value labels (shown in the rows) ──────────────────────────────
  const scheduleValue = profile
    ? `${fmtTime(profile.wake_time, isRTL)} – ${fmtTime(profile.sleep_time, isRTL)}`
    : "—";
  const levelValue = !profile ? "—"
    : profile.consistency_level === "beginner" ? (isRTL ? "مبتدئ" : "Beginner")
    : profile.consistency_level === "some"     ? (isRTL ? "بعض العادات" : "Some habits")
    : (isRTL ? "متمكّن" : "Deep");
  const langValue = langPref === "en" ? "English" : langPref === "ar" ? "العربية" : (isRTL ? "تلقائي" : "Auto");
  const themeValue = themePref === "light" ? (isRTL ? "فاتح" : "Light")
    : themePref === "dark" ? (isRTL ? "داكن" : "Dark") : (isRTL ? "تلقائي" : "Auto");
  const prayerValue = CALC_OPTS.find((o) => o.value === calcMethod)?.[isRTL ? "ar" : "en"] ?? "—";
  const reminderValue = !notifPrefs.enabled
    ? (isRTL ? "متوقّفة" : "Off")
    : (() => {
        const on = (["morning","evening","night","streak","occasion"] as const).filter((k) => notifPrefs[k]).length;
        return on === 5 ? (isRTL ? "مفعّلة" : "On") : `${localizeNumber(on, isRTL)}/${localizeNumber(5, isRTL)}`;
      })();

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile header ─────────────────────────────────────────── */}
        <View style={[s.header, {
          paddingTop: 20,
          backgroundColor: c.surface,
          borderBottomColor: c.divider,
        }]}>
          <View style={[s.avatar, { backgroundColor: c.gold + "22", borderColor: c.gold + "60" }]}>
            <Text style={{ fontFamily: "Georgia", fontSize: 28, color: c.gold }}>{initial}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setModal("name")}
            activeOpacity={0.7}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}
          >
            <Text style={{
              fontFamily: isRTL ? undefined : "Georgia",
              fontSize: isRTL ? 22 : 20, color: c.ink,
            }}>{displayName || "—"}</Text>
            <Feather name="edit-2" size={13} color={c.inkFaint} />
          </TouchableOpacity>
          <Text style={{ fontSize: 12, color: c.inkMuted }}>{email}</Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 28, gap: 24 }}>

          {/* ── My practice ──────────────────────────────────────────── */}
          <View>
            <SectionHead label={isRTL ? "ممارستي" : "My practice"} c={c} />
            <View style={[s.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
              <Row icon="clock" label={isRTL ? "الجدول اليومي" : "Schedule"}
                value={scheduleValue} onPress={() => setModal("schedule")}
                isRTL={isRTL} c={c} />
              <Row icon="activity" label={isRTL ? "مستوى الالتزام" : "Practice level"}
                value={levelValue} onPress={() => setModal("practice")}
                isRTL={isRTL} c={c} />
              <Row icon="bookmark" label={isRTL ? "سنني" : "My sunnahs"}
                value={`${sunnahs.length} ${isRTL ? "نشطة" : "active"}`}
                onPress={() => setModal("sunnahs")}
                isRTL={isRTL} c={c} />
              <Row icon="heart" label={t.favorites.profileRow}
                value={savedCount > 0 ? String(savedCount) : undefined}
                onPress={() => router.push("/favorites")}
                isRTL={isRTL} c={c} last />
            </View>
          </View>

          {/* ── Preferences ──────────────────────────────────────────── */}
          <View>
            <SectionHead label={isRTL ? "التفضيلات" : "Preferences"} c={c} />
            <View style={[s.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
              <Row icon="globe" label={isRTL ? "اللغة" : "Language"}
                value={langValue} onPress={() => setModal("language")}
                isRTL={isRTL} c={c} />
              <Row icon="moon" label={isRTL ? "المظهر" : "Appearance"}
                value={themeValue} onPress={() => setModal("appearance")}
                isRTL={isRTL} c={c} />
              <Row icon="bell" label={isRTL ? "التذكيرات" : "Reminders"}
                value={reminderValue} onPress={() => setModal("reminders")}
                isRTL={isRTL} c={c} />
              <Row icon="compass" label={isRTL ? "أوقات الصلاة" : "Prayer times"}
                value={prayerValue.length > 14 ? prayerValue.slice(0,14) + "…" : prayerValue}
                onPress={() => setModal("prayer")}
                isRTL={isRTL} c={c} last />
            </View>
          </View>

          {/* ── Account ──────────────────────────────────────────────── */}
          <View>
            <SectionHead label={isRTL ? "الحساب" : "Account"} c={c} />
            <View style={[s.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
              <TouchableOpacity
                onPress={handleSignOut} activeOpacity={0.7}
                style={[s.row, isRTL && { flexDirection: "row-reverse" }]}
              >
                <View style={[s.rowIcon, { backgroundColor: c.rose + "20" }]}>
                  <Feather name="log-out" size={16} color={c.rose} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowLabel, { color: c.rose }, isRTL && s.rowLabelAr]}>
                    {isRTL ? "تسجيل الخروج" : "Sign out"}
                  </Text>
                  <Text style={{ fontSize: 11, color: c.inkFaint, marginTop: 1 }} numberOfLines={1}>
                    {email}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Version ──────────────────────────────────────────────── */}
          <Text style={{
            fontSize: 11, color: c.inkFaint,
            textAlign: "center", paddingBottom: 8,
          }}>
            Ballegho v1.0
          </Text>

        </View>
      </ScrollView>

      {/* ── Modal sheets ─────────────────────────────────────────────── */}
      <NameSheet
        visible={modal === "name"} initial={displayName} c={c}
        onSave={saveName} onClose={() => setModal(null)}
      />
      <ScheduleSheet
        visible={modal === "schedule"} profile={profile} c={c}
        onUpdate={saveTime} onClose={() => setModal(null)}
      />
      <PracticeSheet
        visible={modal === "practice"} profile={profile} c={c}
        onUpdate={saveLevel} onClose={() => setModal(null)}
      />
      <SunnahsSheet
        visible={modal === "sunnahs"} sunnahs={sunnahs} c={c}
        onToggleAnchor={toggleAnchor} onRemove={removeSunnah} onClose={() => setModal(null)}
      />
      <LanguageSheet   visible={modal === "language"}   c={c} onClose={() => setModal(null)} />
      <AppearanceSheet visible={modal === "appearance"} c={c} onClose={() => setModal(null)} />
      <RemindersSheet  visible={modal === "reminders"}  c={c} onClose={() => setModal(null)} />
      <PrayerSheet     visible={modal === "prayer"}     c={c} onClose={() => setModal(null)} />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Header
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomWidth: 0.5,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },

  // Card shell
  card: {
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: "hidden",
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  rowIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  rowLabel: {
    flex: 1, fontSize: 15,
  },
  rowLabelAr: {
    fontFamily: "Amiri_400Regular",
    fontSize: 17,
    textAlign: "right",
    writingDirection: "rtl",
  },
  insetDivider: {
    height: 0.5,
    marginLeft: 60,
  },

  // Sheet
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  sheetTitle: {
    fontFamily: "Georgia",
    fontSize: 18,
  },
  sheetClose: {
    width: 32, height: 32,
    alignItems: "center", justifyContent: "center",
  },

  // Name modal
  textInput: {
    borderRadius: 12, borderWidth: 0.5,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16,
  },
  primaryBtn: {
    borderRadius: 12, paddingVertical: 15,
    alignItems: "center",
  },
  primaryBtnText: {
    fontFamily: "Georgia", fontSize: 16,
  },

  // Schedule sheet
  schedRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 14, borderWidth: 0.5,
  },
  schedIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  schedTime: {
    fontFamily: "Georgia", fontSize: 17,
  },
  pickerBox: {
    borderRadius: 14, borderWidth: 0.5, marginTop: 8, overflow: "hidden",
    paddingBottom: 4,
  },
  doneBtn: {
    margin: 12,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    fontFamily: "Georgia",
    fontSize: 17,
    fontWeight: "400",
  },

  // Practice sheet
  practiceCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 14, borderWidth: 1,
  },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: "#4a5362",
    alignItems: "center", justifyContent: "center",
  },
  radioDot: {
    width: 8, height: 8, borderRadius: 4,
  },

  // Choice card (language / appearance)
  choiceCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 1,
  },

  // Sunnahs sheet
  sunnahRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
});
