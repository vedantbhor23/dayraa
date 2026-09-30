import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import logo from "@/assets/dayraa-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/home", replace: true }); });
  }, [navigate]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setNotice("If an account exists for that email, a reset link is on its way.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() } } });
        if (error) throw error;
        if (data.user && data.session) {
          await supabase.from("profiles").upsert({ id: data.user.id, display_name: name.trim() });
          navigate({ to: "/home", replace: true });
        } else setNotice("Check your email to confirm your account, then come back to sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/home", replace: true });
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  async function googleSignIn() {
    setBusy(true); setError("");
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
      if (!result.redirected) navigate({ to: "/home", replace: true });
    } catch (e) { setError(e instanceof Error ? e.message : "Google sign-in could not start."); setBusy(false); }
  }

  return <main className="min-h-screen bg-background lg:grid lg:grid-cols-[1.05fr_.95fr]">
    <div className="relative flex min-h-[290px] flex-col justify-between overflow-hidden bg-wash px-7 py-7 sm:px-12 lg:min-h-screen lg:px-16 lg:py-12">
      <div className="flex items-center gap-2 text-lg font-semibold text-primary"><span className="font-display text-3xl">D.</span> dayraa</div>
      <div className="mx-auto w-full max-w-md text-center lg:max-w-xl">
        <img src={logo.url} alt="Dayraa illustrated logo with a journal and shared memories" className="mx-auto w-40 drop-shadow-sm sm:w-56 lg:w-[350px]" />
        <h1 className="mt-1 text-3xl leading-tight sm:text-4xl lg:text-5xl">A little space for your whole life.</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-muted-foreground sm:text-base">The ordinary days, the big dreams, and everything worth remembering. Keep them close, in your own way.</p>
      </div>
      <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex"><LockKeyhole className="size-3.5" /> Private by default. Always yours.</div>
    </div>
    <div className="flex items-center justify-center px-6 py-12 sm:px-12 lg:px-20"><div className="w-full max-w-sm">
      <div className="mb-8 hidden items-center gap-2 text-xs text-muted-foreground lg:flex"><span className="h-px w-8 bg-coral" /> YOUR SPACE STARTS HERE</div>
      <h2 className="text-3xl sm:text-4xl">{mode === "signup" ? "Make yourself at home." : mode === "forgot" ? "Find your way back." : "Welcome back."}</h2>
      <p className="mt-3 text-sm text-muted-foreground">{mode === "signup" ? "Start collecting the days that make you, you." : mode === "forgot" ? "We'll send a reset link to your email." : "A good place to pick up where you left off."}</p>
      <form onSubmit={submit} className="mt-9 space-y-5">
        {mode === "signup" && <label className="block text-sm font-medium">Your name<Input className="mt-2 h-11 bg-card" value={name} onChange={e => setName(e.target.value)} required placeholder="What should we call you?" /></label>}
        <label className="block text-sm font-medium">Email address<Input className="mt-2 h-11 bg-card" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" /></label>
        {mode !== "forgot" && <label className="block text-sm font-medium">Password<Input className="mt-2 h-11 bg-card" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} value={password} onChange={e => setPassword(e.target.value)} required placeholder="At least 6 characters" /></label>}
        {mode === "signin" && <Button type="button" variant="link" size="sm" className="ml-auto flex px-0" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}>Forgot password?</Button>}
        {error && <p role="alert" className="rounded-md bg-accent px-3 py-2 text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="rounded-md bg-leaf px-3 py-2 text-sm text-leaf-foreground">{notice}</p>}
        <Button type="submit" disabled={busy} className="h-11 w-full justify-between px-5">{busy ? "Please wait…" : mode === "signup" ? "Create my space" : mode === "forgot" ? "Send reset link" : "Sign in"}<ArrowRight /></Button>
      </form>
      {mode !== "forgot" && <><div className="my-6 flex items-center gap-4 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">or</div><Button variant="outline" className="h-11 w-full bg-card" disabled={busy} onClick={googleSignIn}>Continue with Google</Button></>}
      <p className="mt-8 text-center text-sm text-muted-foreground">{mode === "signin" ? "New to Dayraa?" : mode === "signup" ? "Already have a space?" : "Remembered your password?"} <Button type="button" variant="link" className="h-auto px-1 py-0 font-semibold" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setNotice(""); }}>{mode === "signin" ? "Create an account" : "Sign in"}</Button></p>
      <p className="mt-10 text-center text-xs text-muted-foreground">Your story stays yours. Nothing is shared unless you choose to.</p>
    </div></div>
  </main>;
}