import type { Metadata } from "next";
import { DashboardPage } from "@/features/dashboard";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.dashboard.title} | ${dict.meta.title}` };
}

export default function DashboardRoutePage() {
  return <DashboardPage />;
}
