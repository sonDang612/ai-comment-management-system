import { createStore } from "zustand/vanilla";
import type { ColorScheme } from "@/config/theme";

export interface ThemeState {
  scheme: ColorScheme;
  toggleScheme: () => void;
}

export type ThemeStore = ReturnType<typeof createThemeStore>;

export function createThemeStore(initialScheme: ColorScheme) {
  return createStore<ThemeState>()((set) => ({
    scheme: initialScheme,
    toggleScheme: () => set((state) => ({ scheme: state.scheme === "dark" ? "light" : "dark" })),
  }));
}
