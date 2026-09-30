import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/dayraa/AuthScreen";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in or join — Dayraa" },
    { name: "description", content: "Welcome to your private Dayraa space. Sign in or create your account." },
    { property: "og:title", content: "Sign in or join — Dayraa" },
    { property: "og:description", content: "A private space for your life, thoughts, and memories." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthScreen,
});