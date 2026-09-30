import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/dayraa/Workspace";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [
    { title: "Search — Dayraa" },
    { name: "description", content: "Search your Dayraa entries, things shared with you, and people." },
    { property: "og:title", content: "Search — Dayraa" },
    { property: "og:description", content: "Search your Dayraa entries, things shared with you, and people." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <Workspace view="search" />,
});
