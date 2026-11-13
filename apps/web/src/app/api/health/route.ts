import { connection } from "next/server";

/** Liveness probe for the web server itself (used by the Docker healthcheck). */
export async function GET() {
  await connection(); // evaluate per request instead of prerendering at build time
  return Response.json({ status: "ok", service: "web" });
}
