import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/dayraa/Workspace";

export const Route = createFileRoute("/_authenticated/people/")({
  head: () => ({ meta: [
    { title: "People — Dayraa" },
    { name: "description", content: "Find people, manage connections, and see what's shared with you." },
    { property: "og:title", content: "People — Dayraa" },
    { property: "og:description", content: "Find people, manage connections, and see what's shared with you." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <Workspace view="people" />,
});
