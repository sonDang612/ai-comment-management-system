import { notFound } from "next/navigation";

// Unknown paths under a locale (e.g. `/en/nope`) render `[lang]/not-found.tsx` inside the
// localized layout. Real routes are more specific and always win over this catch-all.
export default function CatchAll() {
  notFound();
}
