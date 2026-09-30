import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/dayraa/Workspace";

export const Route = createFileRoute("/_authenticated/diary")({
  head: () => ({ meta: [
    { title: "Diary — Dayraa" },
    { name: "description", content: "Your private diary in Dayraa." },
    { property: "og:title", content: "Diary — Dayraa" },
    { property: "og:description", content: "Your private diary in Dayraa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <Workspace view="diary" />,
});
