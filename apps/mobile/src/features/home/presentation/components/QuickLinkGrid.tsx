import { Pressable, Text, View } from "react-native";
import type { HomeQuickLink } from "@mudrax/types";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/core/theme";
import type { MainTabParamList } from "@/navigation/types";

type TabNav = BottomTabNavigationProp<MainTabParamList>;

/** Map web dashboard quick-link hrefs to mobile tabs where available. */
function resolveTab(href: string): keyof MainTabParamList | null {
  if (href === "/" || href === "/crm") return "Home";
  if (href.startsWith("/campaigns")) return "Campaigns";
  if (href.startsWith("/leads") || href.startsWith("/caller/leads")) return "LeadQueue";
  if (href.startsWith("/follow-ups")) return "Followups";
  if (href.startsWith("/leaderboard") || href.startsWith("/reports")) return "Leaderboard";
  if (href.startsWith("/users") || href.startsWith("/profile") || href.startsWith("/caller/profile")) {
    return "Profile";
  }
  return null;
}

export function QuickLinkGrid({ links }: { links: HomeQuickLink[] }) {
  const { colors } = useTheme();
  const navigation = useNavigation<TabNav>();

  if (links.length === 0) {
    return (
      <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
        No quick actions for your permissions.
      </Text>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {links.map((link) => {
        const tab = resolveTab(link.href);
        return (
          <Pressable
            key={link.href}
            disabled={!tab}
            onPress={() => {
              if (tab) navigation.navigate(tab);
            }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.88 : tab ? 1 : 0.55,
              borderWidth: 1,
              borderColor: colors.outline,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: colors.surface,
            })}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ color: colors.onSurface, fontWeight: "700", fontSize: 14 }}>
                {link.label}
              </Text>
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                {link.desc}
              </Text>
            </View>
            <Text style={{ color: colors.secondary, fontWeight: "700" }}>{tab ? "→" : "·"}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
