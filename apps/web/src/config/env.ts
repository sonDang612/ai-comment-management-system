/**
 * Centralized, typed access to environment variables.
 * `NEXT_PUBLIC_*` values are inlined at build time, so they must be referenced literally.
 */
export const env = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/+$/, ""),
  isProduction: process.env.NODE_ENV === "production",
} as const;
