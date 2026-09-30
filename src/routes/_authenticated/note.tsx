import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/dayraa/Workspace";

export const Route = createFileRoute("/_authenticated/note")({
  head: () => ({ meta: [
    { title: "Notes — Dayraa" },
    { name: "description", content: "Your private notes in Dayraa." },
    { property: "og:title", content: "Notes — Dayraa" },
    { property: "og:description", content: "Your private notes in Dayraa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <Workspace view="note" />,
});
