/** Material Design 3–inspired tokens for light / dark schemes. */

export type ColorScheme = "light" | "dark";

export interface ThemeColors {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  surface: string;
  surfaceVariant: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  error: string;
  onError: string;
  success: string;
  warning: string;
  badgePending: string;
  badgeActive: string;
  badgeClosed: string;
  call: string;
  onCall: string;
}

export const lightColors: ThemeColors = {
  primary: "#0F172A",
  onPrimary: "#FFFFFF",
  primaryContainer: "#E2E8F0",
  onPrimaryContainer: "#0F172A",
  secondary: "#0284C7",
  onSecondary: "#FFFFFF",
  surface: "#F8FAFC",
  surfaceVariant: "#FFFFFF",
  onSurface: "#0F172A",
  onSurfaceVariant: "#64748B",
  outline: "#CBD5E1",
  error: "#DC2626",
  onError: "#FFFFFF",
  success: "#16A34A",
  warning: "#D97706",
  badgePending: "#0284C7",
  badgeActive: "#D97706",
  badgeClosed: "#64748B",
  call: "#16A34A",
  onCall: "#FFFFFF",
};

export const darkColors: ThemeColors = {
  primary: "#38BDF8",
  onPrimary: "#0F172A",
  primaryContainer: "#1E293B",
  onPrimaryContainer: "#E2E8F0",
  secondary: "#7DD3FC",
  onSecondary: "#0F172A",
  surface: "#0F172A",
  surfaceVariant: "#1E293B",
  onSurface: "#F1F5F9",
  onSurfaceVariant: "#94A3B8",
  outline: "#334155",
  error: "#F87171",
  onError: "#0F172A",
  success: "#4ADE80",
  warning: "#FBBF24",
  badgePending: "#38BDF8",
  badgeActive: "#FBBF24",
  badgeClosed: "#94A3B8",
  call: "#22C55E",
  onCall: "#052E16",
};

/** @deprecated Prefer useTheme().colors */
export const colors = {
  brand: lightColors.primary,
  accent: lightColors.secondary,
  muted: lightColors.onSurfaceVariant,
  surface: lightColors.surface,
  danger: lightColors.error,
  border: lightColors.outline,
  text: lightColors.onSurface,
  textInverse: lightColors.onPrimary,
} as const;
