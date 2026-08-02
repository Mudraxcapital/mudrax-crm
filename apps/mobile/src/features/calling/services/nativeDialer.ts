import { Linking, Platform } from "react-native";
import * as IntentLauncher from "expo-intent-launcher";
import type { SimCardInfo } from "@/features/calling/domain/sim";

function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

/**
 * Best-effort SIM discovery. Expo Go / many devices cannot enumerate SIMs;
 * we always expose SIM 1 / SIM 2 fallbacks so callers can pick a preference.
 */
export async function detectSimCards(): Promise<SimCardInfo[]> {
  if (Platform.OS !== "android") {
    return [{ slotIndex: 0, label: "Default line" }];
  }

  // Without a custom native module, Android does not expose a stable JS API
  // for subscription info in Expo Go. Provide dual-SIM choices that map to
  // common OEM intent extras; placing the call still falls back gracefully.
  return [
    { slotIndex: 0, label: "SIM 1", subscriptionId: 0 },
    { slotIndex: 1, label: "SIM 2", subscriptionId: 1 },
  ];
}

/** OEM extras used by common Android dialers for dual-SIM slot hints. */
function simIntentExtras(preferredSlot: number): Record<string, number> {
  return {
    "com.android.phone.extra.slot": preferredSlot,
    "com.android.phone.force.slot": preferredSlot,
    "com.android.phone.extra.slot_id": preferredSlot,
    slot: preferredSlot,
    slotId: preferredSlot,
    simslot: preferredSlot,
    simSlot: preferredSlot,
    simSlotIndex: preferredSlot,
    subscription: preferredSlot,
    Subscription: preferredSlot,
    subscription_id: preferredSlot,
  };
}

/**
 * Opens the phone dial pad with the lead number pre-filled.
 *
 * Flow (Android):
 * 1. Prefer ACTION_DIAL + selected-SIM extras (OEM-dependent).
 * 2. Fall back to `tel:` which always opens the dialer with the number filled.
 *
 * The system dialer may still show a SIM picker when the user taps Call —
 * that is expected and acceptable.
 */
export async function placeNativeCall(
  phone: string,
  preferredSlot: number | null,
): Promise<{ usedSimSelection: boolean; mode: "intent" | "dialer" }> {
  const number = sanitizePhone(phone);
  if (!number) {
    throw new Error("Phone number is missing.");
  }

  const telUrl = `tel:${number}`;

  if (Platform.OS === "android") {
    try {
      await IntentLauncher.startActivityAsync("android.intent.action.DIAL", {
        data: telUrl,
        extra: preferredSlot != null ? simIntentExtras(preferredSlot) : undefined,
      });
      return {
        usedSimSelection: preferredSlot != null,
        mode: "intent",
      };
    } catch {
      // Fall through to Linking.openURL.
    }
  }

  const canOpen = await Linking.canOpenURL(telUrl);
  if (!canOpen) {
    throw new Error("Unable to open the phone dialer on this device.");
  }
  await Linking.openURL(telUrl);
  return { usedSimSelection: false, mode: "dialer" };
}
