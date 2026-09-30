import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Reset your password — Dayraa" },
    { name: "description", content: "Choose a new password for your Dayraa account." },
    { property: "og:title", content: "Reset your password — Dayraa" },
    { property: "og:description", content: "Securely recover access to your Dayraa space." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: ResetPassword,
});
function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setRecovery(new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => { if (event === "PASSWORD_RECOVERY") setRecovery(true); });
    return () => subscription.unsubscribe();
  }, []);
  async function submit(e: FormEvent) { e.preventDefault(); const { error } = await supabase.auth.updateUser({ password }); if (error) setError(error.message); else setConfirmed(true); }
  return <main className="flex min-h-screen items-center justify-center bg-wash px-6"><div className="w-full max-w-sm"><div className="mb-10 font-display text-3xl text-primary">Dayraa</div><h1 className="text-4xl">A fresh start.</h1>{confirmed ? <><p className="my-6 text-muted-foreground">Your password has been changed.</p><Button onClick={() => navigate({ to: "/home" })}>Continue to Dayraa</Button></> : recovery ? <form className="mt-8 space-y-5" onSubmit={submit}><label className="block text-sm">New password<Input className="mt-2 h-11 bg-card" type="password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" className="w-full">Set new password</Button></form> : <p className="mt-6 text-muted-foreground">Open the password reset link from your email to continue.</p>}</div></main>;
}