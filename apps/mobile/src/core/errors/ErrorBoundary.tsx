import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { lightColors } from "@/core/theme";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary", error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            backgroundColor: lightColors.surface,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: lightColors.onSurface,
              marginBottom: 8,
            }}
          >
            Something went wrong
          </Text>
          <Text style={{ color: lightColors.onSurfaceVariant, marginBottom: 20 }}>
            {this.state.error.message || "An unexpected error occurred."}
          </Text>
          <Pressable
            onPress={this.handleReset}
            style={{
              backgroundColor: lightColors.primary,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: lightColors.onPrimary, fontWeight: "600" }}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
