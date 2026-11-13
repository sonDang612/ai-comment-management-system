import { CommentForm, CommentList } from "@/features/comments";
import { HealthStatus } from "@/features/health";
import { getDictionary } from "@/i18n/server";

export default async function HomePage() {
  const dict = await getDictionary();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{dict.comments.title}</h1>
      <CommentForm />
      <CommentList />
      <HealthStatus />
    </main>
  );
}
