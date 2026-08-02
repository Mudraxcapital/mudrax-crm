import { create } from "zustand";
import { getPreferredSimSlot, setPreferredSimSlot } from "@/core/storage";
import { detectSimCards } from "@/features/calling/services/nativeDialer";
import type { SimCardInfo } from "@/features/calling/domain/sim";

interface SimPreferenceState {
  sims: SimCardInfo[];
  preferredSlot: number | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPreferredSlot: (slot: number) => Promise<void>;
}

export const useSimPreferenceStore = create<SimPreferenceState>((set) => ({
  sims: [],
  preferredSlot: null,
  hydrated: false,

  async hydrate() {
    const [sims, preferredSlot] = await Promise.all([
      detectSimCards(),
      getPreferredSimSlot(),
    ]);
    set({
      sims,
      preferredSlot: preferredSlot ?? sims[0]?.slotIndex ?? null,
      hydrated: true,
    });
  },

  async setPreferredSlot(slot) {
    await setPreferredSimSlot(slot);
    set({ preferredSlot: slot });
  },
}));
