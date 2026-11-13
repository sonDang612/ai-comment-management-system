import { HealthStatus } from "@/features/health";
import { getDictionary } from "@/i18n/server";

export default async function HomePage() {
  const dict = await getDictionary();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">{dict.common.appName}</h1>
      <HealthStatus />
    </main>
  );
}
