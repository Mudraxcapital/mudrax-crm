import * as SecureStore from "expo-secure-store";

const SESSION_TOKEN_KEY = "mudrax.sessionToken";
const PREFERRED_SIM_KEY = "mudrax.preferredSimSlot";
const THEME_KEY = "mudrax.themePreference";
const ACTIVE_CAMPAIGN_KEY = "mudrax.activeCampaignId";

export type ThemePreference = "light" | "dark" | "system";

export async function getSessionToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
}

export async function clearSessionToken(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
}

export async function getPreferredSimSlot(): Promise<number | null> {
  try {
    const value = await SecureStore.getItemAsync(PREFERRED_SIM_KEY);
    if (value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function setPreferredSimSlot(slot: number): Promise<void> {
  await SecureStore.setItemAsync(PREFERRED_SIM_KEY, String(slot));
}

export async function getThemePreference(): Promise<ThemePreference> {
  try {
    const value = await SecureStore.getItemAsync(THEME_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
    return "system";
  } catch {
    return "system";
  }
}

export async function setThemePreference(preference: ThemePreference): Promise<void> {
  await SecureStore.setItemAsync(THEME_KEY, preference);
}

export async function getActiveCampaignId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACTIVE_CAMPAIGN_KEY);
  } catch {
    return null;
  }
}

export async function setActiveCampaignId(campaignId: string | null): Promise<void> {
  if (!campaignId) {
    await SecureStore.deleteItemAsync(ACTIVE_CAMPAIGN_KEY);
    return;
  }
  await SecureStore.setItemAsync(ACTIVE_CAMPAIGN_KEY, campaignId);
}
