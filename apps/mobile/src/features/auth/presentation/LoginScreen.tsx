import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import { loginCredentialsSchema, type LoginCredentialsInput } from "@mudrax/shared";
import { API_BASE_URL } from "@/core/config/env";
import { useTheme } from "@/core/theme";
import { useSessionStore } from "@/features/auth/store/sessionStore";
import { AppButton, TextField } from "@/shared/ui";

export function LoginScreen() {
  const { colors } = useTheme();
  const signIn = useSessionStore((s) => s.signIn);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<LoginCredentialsInput>({
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const parsed = loginCredentialsSchema.safeParse({
      email: values.email.trim(),
      password: values.password,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 24,
          }}
        >
          <Text
            style={{ fontSize: 32, fontWeight: "800", color: colors.primary, marginBottom: 6 }}
          >
            Mudrax CRM
          </Text>
          <Text style={{ fontSize: 15, color: colors.onSurfaceVariant, marginBottom: 8 }}>
            Sign in with your CRM account.
          </Text>
          <Text
            style={{ fontSize: 11, color: colors.onSurfaceVariant, marginBottom: 28 }}
            numberOfLines={2}
          >
            API: {API_BASE_URL}
          </Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!submitting}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Password"
                secureTextEntry
                autoComplete="password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!submitting}
              />
            )}
          />

          {error ? (
            <Text style={{ color: colors.error, marginBottom: 12, fontSize: 13 }}>{error}</Text>
          ) : null}

          <View style={{ marginTop: 8 }}>
            <AppButton label="Sign in" loading={submitting} onPress={() => void onSubmit()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
