import { DEFAULT_COMMENT_STATS_DAYS } from "@acms/shared";
import { create } from "zustand";

interface DashboardUiState {
  days: number;
  setDays: (days: number) => void;
}

export const useDashboardUiStore = create<DashboardUiState>()((set) => ({
  days: DEFAULT_COMMENT_STATS_DAYS,
  setDays: (days) => set({ days }),
}));
