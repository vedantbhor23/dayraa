import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/dayraa/Workspace";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [
    { title: "Your space — Dayraa" },
    { name: "description", content: "Your private home for memories, plans, and everyday moments in Dayraa." },
    { property: "og:title", content: "Your space — Dayraa" },
    { property: "og:description", content: "Your private home for memories, plans, and everyday moments in Dayraa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <Workspace view="home" />,
});
