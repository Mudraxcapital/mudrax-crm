import { create } from "zustand";
import { getActiveCampaignId, setActiveCampaignId } from "@/core/storage";

export type LeadStatusFilterKey =
  | "ALL"
  | "Fresh"
  | "Ringing"
  | "Busy"
  | "Follow Up"
  | "Interested"
  | "Not Interested"
  | "Won"
  | "Lost"
  | "Callback"
  | "Invalid Number"
  | "No Answer";

interface LeadWorkflowState {
  selectedCampaignId: string | null;
  selectedCampaignName: string | null;
  assigneeUserId: string | null;
  statusFilter: LeadStatusFilterKey;
  searchText: string;
  queueScrollOffset: number;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSelectedCampaign: (campaignId: string | null, campaignName?: string | null) => void;
  /** @deprecated Prefer setSelectedCampaign */
  setSelectedCampaignId: (campaignId: string | null) => void;
  setAssigneeUserId: (userId: string | null) => void;
  setStatusFilter: (status: LeadStatusFilterKey) => void;
  setSearchText: (search: string) => void;
  setQueueScrollOffset: (offset: number) => void;
  resetFilters: () => void;
}

export const useLeadWorkflowStore = create<LeadWorkflowState>((set) => ({
  selectedCampaignId: null,
  selectedCampaignName: null,
  assigneeUserId: null,
  statusFilter: "ALL",
  searchText: "",
  queueScrollOffset: 0,
  isHydrated: false,

  async hydrate() {
    const campaignId = await getActiveCampaignId();
    set({ selectedCampaignId: campaignId, isHydrated: true });
  },

  setSelectedCampaign(campaignId, campaignName = null) {
    void setActiveCampaignId(campaignId);
    set({
      selectedCampaignId: campaignId,
      selectedCampaignName: campaignName,
      queueScrollOffset: 0,
    });
  },

  setSelectedCampaignId(campaignId) {
    void setActiveCampaignId(campaignId);
    set({
      selectedCampaignId: campaignId,
      queueScrollOffset: 0,
    });
  },

  setAssigneeUserId(userId) {
    set({ assigneeUserId: userId, queueScrollOffset: 0 });
  },

  setStatusFilter(status) {
    set({ statusFilter: status, queueScrollOffset: 0 });
  },

  setSearchText(search) {
    set({ searchText: search, queueScrollOffset: 0 });
  },

  setQueueScrollOffset(offset) {
    set({ queueScrollOffset: offset });
  },

  resetFilters() {
    set({
      assigneeUserId: null,
      statusFilter: "ALL",
      searchText: "",
      queueScrollOffset: 0,
    });
  },
}));
