import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/dayraa/Workspace";

export const Route = createFileRoute("/_authenticated/people/$personId")({
  head: () => ({ meta: [
    { title: "Profile — Dayraa" },
    { name: "description", content: "A Dayraa profile and its public entries." },
    { property: "og:title", content: "Profile — Dayraa" },
    { property: "og:description", content: "A Dayraa profile and its public entries." },
    { property: "og:type", content: "profile" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PersonPage,
});

function PersonPage() {
  const { personId } = Route.useParams();
  return <Workspace view="person" personId={personId} />;
}
