import type { Metadata } from "next";
import { SettingsPage } from "@/features/settings";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.settings.title} | ${dict.meta.title}` };
}

export default function SettingsRoutePage() {
  return <SettingsPage />;
}
