import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Appearance, StatusBar, useColorScheme } from "react-native";
import { darkColors, lightColors, type ColorScheme, type ThemeColors } from "./colors";
import { getThemePreference, setThemePreference, type ThemePreference } from "@/core/storage";

interface ThemeContextValue {
  colors: ThemeColors;
  scheme: ColorScheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void getThemePreference().then((value) => {
      setPreferenceState(value);
      setReady(true);
    });
  }, []);

  const scheme: ColorScheme =
    preference === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  const colors = scheme === "dark" ? darkColors : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors,
      scheme,
      preference,
      setPreference: async (next) => {
        setPreferenceState(next);
        await setThemePreference(next);
        if (next !== "system") {
          Appearance.setColorScheme(next);
        } else {
          Appearance.setColorScheme(null);
        }
      },
    }),
    [colors, scheme, preference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.surface}
      />
      {ready ? children : null}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
