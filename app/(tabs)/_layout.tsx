import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useLang } from "@/hooks/useLang";
import { PrayerTimesProvider } from "@/contexts/PrayerTimesContext";

export default function TabsLayout() {
  const { t, isDark } = useLang();

  const gold    = isDark ? "#d4af37" : "#b8892a";
  const muted   = isDark ? "#8a8876" : "#7a8193";
  const bg      = isDark ? "#0a1422" : "#f5efe2";
  const divider = isDark ? "rgba(244,236,216,0.08)" : "rgba(14,26,43,0.1)";

  return (
    <PrayerTimesProvider>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: gold,
        tabBarInactiveTintColor: muted,
        tabBarStyle: {
          backgroundColor: bg,
          borderTopColor: divider,
          borderTopWidth: 0.5,
          height: 76,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabToday,
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sunnah"
        options={{
          title: t.tabSunnah,
          tabBarIcon: ({ color, size }) => (
            <Feather name="list" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="streaks"
        options={{
          title: t.tabStreaks,
          tabBarIcon: ({ color, size }) => (
            <Feather name="bar-chart-2" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: t.tabLearn,
          tabBarIcon: ({ color, size }) => (
            <Feather name="book-open" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabProfile,
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size ?? 22} color={color} />
          ),
        }}
      />
    </Tabs>
    </PrayerTimesProvider>
  );
}
