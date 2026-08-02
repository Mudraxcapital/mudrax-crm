import "./global.css";
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/core/errors/ErrorBoundary";
import { createAppQueryClient } from "@/core/query/queryClient";
import { ThemeProvider } from "@/core/theme";
import { RootNavigator } from "@/navigation";

export default function App() {
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary onReset={() => queryClient.clear()}>
            <QueryClientProvider client={queryClient}>
              <RootNavigator />
            </QueryClientProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
