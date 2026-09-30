import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/dayraa/Workspace";

export const Route = createFileRoute("/_authenticated/event")({
  head: () => ({ meta: [
    { title: "Events — Dayraa" },
    { name: "description", content: "Your private events in Dayraa." },
    { property: "og:title", content: "Events — Dayraa" },
    { property: "og:description", content: "Your private events in Dayraa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <Workspace view="event" />,
});
