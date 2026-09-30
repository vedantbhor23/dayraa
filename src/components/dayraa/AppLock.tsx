import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyError } from "@/lib/friendly-error";
import { reauthenticate } from "@/lib/content";

// The app lock protects the Dayraa interface on this device. It never replaces account sign-in:
// the PIN is verified by the backend against a bcrypt hash. Designed so a biometric unlock can
// later call `unlock()` after a platform check.
type LockState = { enabled: boolean; minutes: number; hasPin: boolean };
type Ctx = LockState & { refresh: () => Promise<void>; lockNow: () => void; notice: string; clearNotice: () => void };
const LockCtx = createContext<Ctx | null>(null);
export const useAppLock = () => useContext(LockCtx);

const UNLOCK_KEY = "dayraa-unlocked";
const ACTIVE_KEY = "dayraa-last-active";

export function AppLockGate({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [state, setState] = useState<LockState | null>(null);
  const [locked, setLocked] = useState(false);
  const [notice, setNotice] = useState("");
  const minutesRef = useRef(0);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc("get_app_lock");
    const row = data?.[0];
    const s = { enabled: !!row?.enabled && !!row?.has_pin, minutes: row?.auto_lock_minutes ?? 5, hasPin: !!row?.has_pin };
    minutesRef.current = s.minutes; setState(s); return;
  }, []);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      if (localStorage.getItem("dayraa-reauth") === "pin") {
        localStorage.removeItem("dayraa-reauth");
        const { error } = await supabase.rpc("reset_app_pin_after_signin");
        setNotice(error ? friendlyError(error) : "Your old PIN was removed. Set a new one in Settings → Security.");
        sessionStorage.setItem(UNLOCK_KEY, "1");
      }
      const { data } = await supabase.rpc("get_app_lock");
      const row = data?.[0];
      const s = { enabled: !!row?.enabled && !!row?.has_pin, minutes: row?.auto_lock_minutes ?? 5, hasPin: !!row?.has_pin };
      minutesRef.current = s.minutes; setState(s);
      const last = Number(localStorage.getItem(ACTIVE_KEY) || 0);
      const idle = s.minutes > 0 && Date.now() - last > s.minutes * 60_000;
      if (s.enabled && (!sessionStorage.getItem(UNLOCK_KEY) || idle)) setLocked(true);
    })();
  }, [userId]);

  useEffect(() => {
    if (!state?.enabled) return;
    let lastWrite = 0;
    const touch = () => { const n = Date.now(); if (n - lastWrite > 15_000) { lastWrite = n; localStorage.setItem(ACTIVE_KEY, String(n)); } };
    touch();
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach(e => window.addEventListener(e, touch, { passive: true }));
    const timer = window.setInterval(() => {
      const m = minutesRef.current; if (!m) return;
      if (Date.now() - Number(localStorage.getItem(ACTIVE_KEY) || 0) > m * 60_000) { sessionStorage.removeItem(UNLOCK_KEY); setLocked(true); }
    }, 20_000);
    return () => { events.forEach(e => window.removeEventListener(e, touch)); window.clearInterval(timer); };
  }, [state?.enabled]);

  const lockNow = useCallback(() => { sessionStorage.removeItem(UNLOCK_KEY); setLocked(true); }, []);
  const ctx: Ctx = { ...(state ?? { enabled: false, minutes: 5, hasPin: false }), refresh, lockNow, notice, clearNotice: () => setNotice("") };

  if (userId && state === null) return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Opening your space…</div>;
  if (locked) return <LockScreen onUnlock={() => { sessionStorage.setItem(UNLOCK_KEY, "1"); localStorage.setItem(ACTIVE_KEY, String(Date.now())); setLocked(false); }} />;
  return <LockCtx.Provider value={ctx}>{children}</LockCtx.Provider>;
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (pin.length !== 4) return; setBusy(true); setMsg("");
    const { data, error } = await supabase.rpc("verify_app_pin", { _pin: pin });
    setBusy(false); setPin("");
    if (error) { setMsg(friendlyError(error)); return; }
    const r = data as { ok: boolean; locked_until?: string; attempts_left?: number };
    if (r.ok) onUnlock();
    else if (r.locked_until) setMsg(`Too many tries. Try again after ${new Date(r.locked_until).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    else setMsg(`That PIN isn't right. ${r.attempts_left ?? 0} ${r.attempts_left === 1 ? "try" : "tries"} left before a short pause.`);
  }
  return <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
    <form onSubmit={submit} className="w-full max-w-xs text-center">
      <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-wash text-coral"><LockKeyhole className="size-6" /></span>
      <h1 className="text-3xl">Dayraa is locked.</h1>
      <p className="mt-2 text-sm text-muted-foreground">Enter your 4-digit PIN.</p>
      <Input autoFocus inputMode="numeric" autoComplete="off" type="password" maxLength={4} aria-label="PIN" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} className="mx-auto mt-6 w-40 bg-card text-center text-2xl tracking-[0.6em]" />
      {msg && <p role="alert" className="mt-3 text-sm text-destructive">{msg}</p>}
      <Button type="submit" className="mt-5 w-40" disabled={busy || pin.length !== 4}>{busy ? "Checking…" : "Unlock"}</Button>
      <div className="mt-6 flex justify-center gap-4 text-xs">
        <Button type="button" variant="link" size="sm" onClick={() => { if (window.confirm("To reset your PIN you'll sign in to your account again. Continue?")) void reauthenticate("pin"); }}>Forgot PIN?</Button>
        <Button type="button" variant="link" size="sm" onClick={async () => { await supabase.auth.signOut(); window.location.assign("/auth"); }}>Sign out</Button>
      </div>
    </form>
  </div>;
}

export function AppLockSettings() {
  const lock = useAppLock();
  const [mode, setMode] = useState<"idle" | "create" | "change" | "disable">("idle");
  const [current, setCurrent] = useState(""); const [pin, setPin] = useState(""); const [confirm, setConfirm] = useState(""); const [msg, setMsg] = useState("");
  if (!lock) return null;
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);
  const reset = () => { setMode("idle"); setCurrent(""); setPin(""); setConfirm(""); };
  async function save(e: FormEvent) {
    e.preventDefault(); setMsg("");
    if (mode === "disable") { const { error } = await supabase.rpc("disable_app_lock", { _pin: current }); if (error) { setMsg(friendlyError(error)); return; } setMsg("App lock turned off."); reset(); await lock!.refresh(); return; }
    if (pin.length !== 4) { setMsg("Your PIN needs to be exactly 4 digits."); return; }
    if (pin !== confirm) { setMsg("Those PINs don't match."); return; }
    const { error } = await supabase.rpc("set_app_pin", mode === "change" ? { _pin: pin, _current: current } : { _pin: pin });
    if (error) { setMsg(friendlyError(error)); return; }
    sessionStorage.setItem(UNLOCK_KEY, "1"); localStorage.setItem(ACTIVE_KEY, String(Date.now()));
    setMsg(mode === "change" ? "PIN changed." : "App lock is on."); reset(); await lock!.refresh();
  }
  async function setMinutes(m: number) { const { error } = await supabase.rpc("set_app_lock_minutes", { _minutes: m }); setMsg(error ? friendlyError(error) : "Auto-lock updated."); await lock!.refresh(); }
  const pinField = (label: string, v: string, set: (s: string) => void) => <label className="block text-sm font-medium">{label}<Input type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={v} onChange={e => set(digits(e.target.value))} className="mt-1 w-32 bg-card tracking-[0.4em]" /></label>;
  return <section className="border-t border-border pt-7">
    <h2 className="text-xl">Security · App lock</h2>
    <p className="mt-1 text-sm text-muted-foreground">A 4-digit PIN that locks Dayraa on this device. It's separate from your account password and is stored only as a secure scramble.</p>
    {lock.notice && <p role="status" className="mt-3 text-sm text-primary">{lock.notice}</p>}
    {mode === "idle" && <div className="mt-4 flex flex-wrap gap-2">
      {lock.enabled ? <>
        <Button size="sm" variant="outline" onClick={() => setMode("change")}>Change PIN</Button>
        <Button size="sm" variant="outline" onClick={lock.lockNow}>Lock now</Button>
        <Button size="sm" variant="ghost" onClick={() => setMode("disable")}>Turn off</Button>
        <Button size="sm" variant="link" onClick={() => { if (window.confirm("To reset your PIN you'll sign in to your account again. Continue?")) void reauthenticate("pin"); }}>Forgot PIN?</Button>
      </> : <Button size="sm" onClick={() => { lock.clearNotice(); setMode("create"); }}>Enable app lock</Button>}
    </div>}
    {mode !== "idle" && <form onSubmit={save} className="mt-4 space-y-3">
      {(mode === "change" || mode === "disable") && pinField("Current PIN", current, setCurrent)}
      {mode !== "disable" && <>{pinField(mode === "change" ? "New PIN" : "Choose a PIN", pin, setPin)}{pinField("Confirm PIN", confirm, setConfirm)}</>}
      <div className="flex gap-2"><Button type="submit" size="sm">{mode === "disable" ? "Turn off app lock" : "Save PIN"}</Button><Button type="button" size="sm" variant="ghost" onClick={reset}>Cancel</Button></div>
    </form>}
    {lock.enabled && <><p className="mt-5 text-sm font-medium">Lock automatically after</p><div className="mt-2 flex flex-wrap gap-2">{([[0, "Never"], [5, "5 minutes"], [15, "15 minutes"], [30, "30 minutes"]] as const).map(([m, l]) => <Button key={m} size="sm" variant={lock.minutes === m ? "default" : "outline"} onClick={() => setMinutes(m)}>{l}</Button>)}</div><p className="mt-2 text-xs text-muted-foreground">Dayraa also locks each time you open it in a new tab or window.</p></>}
    {msg && <p role="status" className="mt-3 text-sm text-muted-foreground">{msg}</p>}
  </section>;
}
