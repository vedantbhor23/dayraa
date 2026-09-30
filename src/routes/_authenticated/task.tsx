import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/dayraa/Workspace";

export const Route = createFileRoute("/_authenticated/task")({
  head: () => ({ meta: [
    { title: "Tasks — Dayraa" },
    { name: "description", content: "Your private tasks in Dayraa." },
    { property: "og:title", content: "Tasks — Dayraa" },
    { property: "og:description", content: "Your private tasks in Dayraa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <Workspace view="task" />,
});
