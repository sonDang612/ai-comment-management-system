import type { Metadata } from "next";
import { CommentsPage } from "@/features/comments";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.comments.title} | ${dict.meta.title}` };
}

export default function CommentsRoutePage() {
  return <CommentsPage />;
}
