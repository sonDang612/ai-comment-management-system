import { cookies } from "next/headers";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { COLOR_SCHEME_COOKIE, parseColorScheme } from "@/config/theme";
import { AntdProvider } from "./antd-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

/** Compose all client-side providers in one place. */
export async function AppProviders({ children }: { children: ReactNode }) {
  await connection();
  const initialScheme = parseColorScheme((await cookies()).get(COLOR_SCHEME_COOKIE)?.value);
  return (
    <QueryProvider>
      <ThemeProvider initialScheme={initialScheme}>
        <AntdProvider>{children}</AntdProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
