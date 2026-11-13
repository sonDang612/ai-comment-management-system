import { connection } from "next/server";
import type { ReactNode } from "react";
import { AntdProvider } from "./antd-provider";
import { QueryProvider } from "./query-provider";

/** Compose all client-side providers in one place. */
export async function AppProviders({ children }: { children: ReactNode }) {
  await connection();
  return (
    <QueryProvider>
      <AntdProvider>{children}</AntdProvider>
    </QueryProvider>
  );
}
