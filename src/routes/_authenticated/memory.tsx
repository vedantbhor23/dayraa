import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/dayraa/Workspace";

export const Route = createFileRoute("/_authenticated/memory")({
  head: () => ({ meta: [
    { title: "Memories — Dayraa" },
    { name: "description", content: "Your private memories in Dayraa." },
    { property: "og:title", content: "Memories — Dayraa" },
    { property: "og:description", content: "Your private memories in Dayraa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <Workspace view="memory" />,
});
