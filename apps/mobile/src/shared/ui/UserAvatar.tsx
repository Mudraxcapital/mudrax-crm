import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { getApi } from "@/core/api";
import { useTheme } from "@/core/theme";

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function resolveFetchPath(userId: string, profilePhotoUrl: string): string | null {
  if (profilePhotoUrl.startsWith("storage:")) {
    return `/api/users/${userId}/photo?v=${encodeURIComponent(profilePhotoUrl)}`;
  }
  if (profilePhotoUrl.startsWith("/api/users/")) {
    return profilePhotoUrl;
  }
  return null;
}

interface UserAvatarProps {
  userId: string;
  name: string;
  profilePhotoUrl?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Loads profile photos with the session cookie (RN Image cannot attach Cookie headers).
 */
export function UserAvatar({
  userId,
  name,
  profilePhotoUrl,
  size = 40,
  style,
}: UserAvatarProps) {
  const { colors } = useTheme();
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [remoteUri, setRemoteUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataUri(null);
    setRemoteUri(null);

    if (!profilePhotoUrl) return;

    if (profilePhotoUrl.startsWith("http") && !profilePhotoUrl.includes("/api/users/")) {
      setRemoteUri(profilePhotoUrl);
      return;
    }

    const path = resolveFetchPath(userId, profilePhotoUrl);
    if (!path) {
      if (profilePhotoUrl.startsWith("http")) setRemoteUri(profilePhotoUrl);
      return;
    }

    void (async () => {
      try {
        const response = await getApi().client.http.get<ArrayBuffer>(path, {
          responseType: "arraybuffer",
          // Photo may redirect to an external CDN.
          maxRedirects: 5,
          headers: { Accept: "image/*,application/octet-stream" },
        });
        if (cancelled) return;
        const contentType =
          (response.headers["content-type"] as string | undefined)?.split(";")[0]?.trim() ||
          "image/jpeg";
        const base64 = arrayBufferToBase64(response.data);
        setDataUri(`data:${contentType};base64,${base64}`);
      } catch {
        if (!cancelled) setDataUri(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, profilePhotoUrl]);

  const uri = dataUri ?? remoteUri;
  const dim = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[dim, style as object]} />;
  }

  return (
    <View
      style={[
        dim,
        styles.fallback,
        { backgroundColor: colors.primaryContainer },
        style,
      ]}
    >
      <Text
        style={{
          color: colors.onPrimaryContainer,
          fontWeight: "800",
          fontSize: Math.max(11, size * 0.28),
        }}
      >
        {initialsFromName(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
});
