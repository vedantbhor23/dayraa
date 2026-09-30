import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/dayraa/Workspace";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [
    { title: "Profile — Dayraa" },
    { name: "description", content: "Your private profile in Dayraa." },
    { property: "og:title", content: "Profile — Dayraa" },
    { property: "og:description", content: "Your private profile in Dayraa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <Workspace view="profile" />,
});
