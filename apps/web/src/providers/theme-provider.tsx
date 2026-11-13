"use client";

import { createContext, type ReactNode, use, useEffect, useState } from "react";
import { useStore } from "zustand";
import { type ColorScheme, colorSchemeCookie, DARK_CLASS } from "@/config/theme";
import { createThemeStore, type ThemeState, type ThemeStore } from "@/stores/theme-store";

const ThemeStoreContext = createContext<ThemeStore | null>(null);

export function ThemeProvider({
  initialScheme,
  children,
}: {
  initialScheme: ColorScheme;
  children: ReactNode;
}) {
  const [store] = useState(() => createThemeStore(initialScheme));
  const scheme = useStore(store, (state) => state.scheme);

  useEffect(() => {
    document.documentElement.classList.toggle(DARK_CLASS, scheme === "dark");
    document.documentElement.style.colorScheme = scheme;
    document.cookie = colorSchemeCookie(scheme);
  }, [scheme]);

  return <ThemeStoreContext value={store}>{children}</ThemeStoreContext>;
}

export function useTheme<T>(selector: (state: ThemeState) => T): T {
  const store = use(ThemeStoreContext);
  if (!store) throw new Error("useTheme must be used inside <ThemeProvider>");
  return useStore(store, selector);
}
