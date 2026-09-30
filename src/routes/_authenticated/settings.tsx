import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/dayraa/Workspace";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [
    { title: "Settings — Dayraa" },
    { name: "description", content: "Your private settings in Dayraa." },
    { property: "og:title", content: "Settings — Dayraa" },
    { property: "og:description", content: "Your private settings in Dayraa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <Workspace view="settings" />,
});
