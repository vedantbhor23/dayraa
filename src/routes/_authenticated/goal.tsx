import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/dayraa/Workspace";

export const Route = createFileRoute("/_authenticated/goal")({
  head: () => ({ meta: [
    { title: "Goals — Dayraa" },
    { name: "description", content: "Your private goals in Dayraa." },
    { property: "og:title", content: "Goals — Dayraa" },
    { property: "og:description", content: "Your private goals in Dayraa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <Workspace view="goal" />,
});
