import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyError, loadErrorText } from "@/lib/friendly-error";
import { reauthenticate, TRASH_DAYS, trashedItems } from "@/lib/content";

export function TrashSection({ userId }: { userId: string }) {
  const qc = useQueryClient(); const [msg, setMsg] = useState("");
  const { data = [], error } = useQuery({ queryKey: ["trash", userId], queryFn: async () => { const { data, error } = await trashedItems(userId); if (error) throw error; return data; } });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["trash", userId] }), qc.invalidateQueries({ queryKey: ["life-items", userId] })]);
  async function restore(id: string) { const { error } = await supabase.from("life_items").update({ deleted_at: null }).eq("id", id); setMsg(error ? friendlyError(error) : "Restored."); await refresh(); }
  async function destroy(id: string) { if (!window.confirm("Delete this forever? This can't be undone.")) return; const { error } = await supabase.from("life_items").delete().eq("id", id); setMsg(error ? friendlyError(error) : "Deleted forever."); await refresh(); }
  return <section className="border-t border-border pt-7">
    <h2 className="text-xl">Trash</h2>
    <p className="mt-1 text-sm text-muted-foreground">Deleted entries stay here for {TRASH_DAYS} days, hidden from everyone, then disappear for good.</p>
    {error && <p className="mt-3 text-sm text-destructive">{loadErrorText}</p>}
    {msg && <p role="status" className="mt-3 text-sm text-muted-foreground">{msg}</p>}
    {data.length ? <div className="mt-4 divide-y divide-border rounded-lg border border-border bg-card px-4">{data.map(item => {
      const left = Math.max(0, TRASH_DAYS - differenceInCalendarDays(new Date(), new Date(item.deleted_at!)));
      return <div key={item.id} className="flex flex-wrap items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title || "Untitled"}</p><p className="text-xs capitalize text-muted-foreground">{item.kind} · deleted {format(new Date(item.deleted_at!), "MMM d")} · {left} {left === 1 ? "day" : "days"} left</p></div><Button size="sm" variant="outline" onClick={() => restore(item.id)}>Restore</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => destroy(item.id)}>Delete forever</Button></div>;
    })}</div> : <p className="mt-4 text-sm text-muted-foreground">Trash is empty. Nice and tidy.</p>}
  </section>;
}

const exportKinds = [["diary", "Diary"], ["task", "Tasks"], ["goal", "Goals"], ["note", "Notes"], ["memory", "Memories"], ["event", "Events"], ["account", "Account data"], ["all", "Everything"]] as const;
type ExportKind = typeof exportKinds[number][0];

// Export only includes data the user OWNS — never content others shared with them.
async function buildExport(userId: string, what: ExportKind) {
  const out: Record<string, unknown> = { app: "Dayraa", format: "dayraa-export-v1", exported_at: new Date().toISOString(), scope: what };
  if (what === "account" || what === "all") {
    const [{ data: profile }, { data: { user } }, { data: connections }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(), supabase.auth.getUser(),
      supabase.from("connections").select("id,requester_id,addressee_id,status,created_at"),
    ]);
    out["account"] = { id: userId, email: user?.email, created_at: user?.created_at, profile, connections };
  }
  if (what !== "account") {
    let q = supabase.from("life_items").select("*").eq("owner_id", userId).is("deleted_at", null);
    if (what !== "all") q = q.eq("kind", what);
    const { data: items, error } = await q.order("occurred_on");
    if (error) throw error;
    const ids = (items ?? []).map(i => i.id);
    const { data: shares } = ids.length ? await supabase.from("item_shares").select("item_id,grantee_id,can_edit,created_at").eq("owner_id", userId).in("item_id", ids) : { data: [] };
    out["entries"] = items; out["sharing"] = shares;
  }
  return out;
}

export function DataExportSection({ userId }: { userId: string }) {
  const [busy, setBusy] = useState<string | null>(null); const [msg, setMsg] = useState("");
  async function run(what: ExportKind) {
    setBusy(what); setMsg("");
    try {
      const data = await buildExport(userId, what);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `dayraa-${what}-${format(new Date(), "yyyy-MM-dd")}.json`; a.click(); URL.revokeObjectURL(a.href);
      setMsg("Your download has started.");
    } catch (e) { setMsg(friendlyError(e)); }
    setBusy(null);
  }
  return <section className="border-t border-border pt-7">
    <h2 className="text-xl">Your data</h2>
    <p className="mt-1 text-sm text-muted-foreground">Download what you own as a file. Things other people shared with you aren't included — they belong to them.</p>
    <div className="mt-4 flex flex-wrap gap-2">{exportKinds.map(([k, l]) => <Button key={k} size="sm" variant={k === "all" ? "default" : "outline"} disabled={!!busy} onClick={() => run(k)}>{busy === k ? "Preparing…" : l}</Button>)}</div>
    <p className="mt-2 text-xs text-muted-foreground">Exports are a readable data file (JSON). Photos and PDF backups will come with media.</p>
    {msg && <p role="status" className="mt-3 text-sm text-muted-foreground">{msg}</p>}
  </section>;
}

export function useDeletionStatus(userId: string | null) {
  return useQuery({ queryKey: ["deletion", userId], enabled: !!userId, queryFn: async () => {
    const { data } = await supabase.from("profiles").select("deletion_requested_at").eq("id", userId!).maybeSingle();
    return data?.deletion_requested_at ?? null;
  } });
}

export function DeletionBanner({ userId }: { userId: string }) {
  const qc = useQueryClient(); const { data: requested } = useDeletionStatus(userId);
  if (!requested) return null;
  const on = new Date(new Date(requested).getTime() + 30 * 86400000);
  async function restore() { const { error } = await supabase.rpc("cancel_account_deletion"); if (!error) await qc.invalidateQueries({ queryKey: ["deletion", userId] }); }
  return <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-card px-4 py-3 text-sm"><span className="flex-1">Your account is scheduled for deletion on <strong>{format(on, "MMMM d, yyyy")}</strong>. Nobody else can see your profile until then.</span><Button size="sm" onClick={restore}>Keep my account</Button></div>;
}

export function DeleteAccountSection({ userId }: { userId: string }) {
  const qc = useQueryClient(); const { data: requested } = useDeletionStatus(userId);
  const [open, setOpen] = useState(false); const [typed, setTyped] = useState(""); const [msg, setMsg] = useState(""); const [needsReauth, setNeedsReauth] = useState(false);
  useEffect(() => { if (localStorage.getItem("dayraa-reauth") === "delete") { localStorage.removeItem("dayraa-reauth"); setOpen(true); setMsg("Thanks for signing in again. You can continue now."); } }, []);
  async function confirmDelete() {
    setMsg(""); const { error } = await supabase.rpc("request_account_deletion");
    if (error) { setMsg(friendlyError(error)); setNeedsReauth(error.message.includes("reauth_required")); return; }
    setOpen(false); setTyped(""); await qc.invalidateQueries({ queryKey: ["deletion", userId] });
  }
  if (requested) return <section className="border-t border-border pt-7"><h2 className="text-xl">Delete account</h2><p className="mt-1 text-sm text-muted-foreground">Deletion is scheduled. Use "Keep my account" at the top of the page to cancel.</p></section>;
  return <section className="border-t border-border pt-7">
    <h2 className="text-xl">Delete account</h2>
    {!open ? <><p className="mt-1 text-sm text-muted-foreground">Remove your account and everything you own.</p><Button variant="outline" className="mt-4 text-destructive" onClick={() => setOpen(true)}>Delete my account…</Button></> : <div className="mt-3 space-y-3 rounded-lg border border-destructive/40 bg-card p-4 text-sm">
      <p className="font-semibold">Here's what happens:</p>
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground"><li>Your profile is hidden from everyone right away.</li><li>You have 30 days to change your mind — just sign in and tap "Keep my account".</li><li>After 30 days, your profile, entries, pictures, sharing and connections are permanently deleted.</li><li>Things other people own are not deleted.</li></ul>
      <p>For your safety, this needs a recent sign-in. Type <strong>DELETE</strong> to confirm.</p>
      <Input value={typed} onChange={e => setTyped(e.target.value)} className="w-40 bg-background" aria-label="Type DELETE to confirm" />
      {msg && <p role="status" className="text-muted-foreground">{msg}</p>}
      <div className="flex flex-wrap gap-2"><Button variant="destructive" disabled={typed !== "DELETE"} onClick={confirmDelete}>Delete my account</Button>{needsReauth && <Button variant="outline" onClick={() => reauthenticate("delete")}>Sign in again</Button>}<Button variant="ghost" onClick={() => { setOpen(false); setTyped(""); setMsg(""); }}>Cancel</Button></div>
    </div>}
  </section>;
}
