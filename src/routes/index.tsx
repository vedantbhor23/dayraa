import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/dayraa/AuthScreen";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Dayraa — A little space for your whole life" },
    { name: "description", content: "Keep your days, thoughts, plans, and memories together in your own private space." },
    { property: "og:title", content: "Dayraa — A little space for your whole life" },
    { property: "og:description", content: "A private home for the moments and plans that make up your life." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthScreen,
});