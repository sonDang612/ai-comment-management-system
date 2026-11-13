import type { Metadata } from "next";
import { HealthStatus } from "@/features/health";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.health.title} | ${dict.meta.title}` };
}

export default function StatusPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <HealthStatus />
    </main>
  );
}
