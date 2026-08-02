import { useHomeDashboard } from "@/features/home/hooks/useDashboard";
import { useLeadWorkflowStore } from "@/features/leads/store/leadWorkflowStore";
import { EmptyState, LoadingState, Screen } from "@/shared/ui";
import { CallerHomeDashboard } from "./CallerHomeDashboard";
import { StaffHomeDashboard } from "./StaffHomeDashboard";

export function HomeScreen() {
  const selectedCampaignId = useLeadWorkflowStore((s) => s.selectedCampaignId);
  const { data, isLoading, isError, refetch, isRefetching, error } =
    useHomeDashboard(selectedCampaignId);

  if (isLoading && !data) {
    return (
      <Screen>
        <LoadingState label="Loading dashboard…" />
      </Screen>
    );
  }

  if (isError && !data) {
    return (
      <Screen>
        <EmptyState
          title="Couldn't load dashboard"
          description={error instanceof Error ? error.message : "Please try again."}
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <EmptyState title="No dashboard data" description="Pull to refresh or try again later." />
      </Screen>
    );
  }

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
      {data.kind === "caller" ? (
        <CallerHomeDashboard data={data} />
      ) : (
        <StaffHomeDashboard data={data} />
      )}
    </Screen>
  );
}
