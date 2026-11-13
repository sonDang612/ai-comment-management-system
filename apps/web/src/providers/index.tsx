import type { ReactNode } from "react";
import { AntdProvider } from "./antd-provider";
import { QueryProvider } from "./query-provider";

/** Compose all client-side providers in one place. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AntdProvider>{children}</AntdProvider>
    </QueryProvider>
  );
}
