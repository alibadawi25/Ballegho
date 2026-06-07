/**
 * One-time tips — remembers which first-run tutorials a user has already seen,
 * so each contextual tip fires exactly once (per device). Backed by the same
 * AsyncStorage the rest of the app uses.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "@ballegho/tip:";

export async function hasSeenTip(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREFIX + key)) === "1";
  } catch {
    return false;
  }
}

export async function markTipSeen(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, "1");
  } catch {
    /* non-fatal — worst case the tip shows again */
  }
}
