import type { ReactNode } from "react";
import { QueryProvider } from "./query-provider";

/** Compose all client-side providers in one place. */
export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
