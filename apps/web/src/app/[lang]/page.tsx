import { redirect } from "next/navigation";
import { HOME_ROUTE, localizedRoute } from "@/config/routes";
import { getLocale } from "@/i18n/server";

export default async function LocaleRootPage() {
  redirect(localizedRoute(await getLocale(), HOME_ROUTE));
}
