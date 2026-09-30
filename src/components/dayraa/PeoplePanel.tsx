import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyError } from "@/lib/friendly-error";
import { sharedWithMe } from "@/lib/content";
import { Textarea } from "@/components/ui/textarea";
import { PersonAvatar, useConnections, VisibilityBadge } from "./privacy";

type Found = { id: string; display_name: string; username: string | null; avatar_url: string | null };

export function PeoplePanel({ userId }: { userId: string | null }) {
  const qc = useQueryClient();
  const { data: people = [] } = useConnections(userId);
  const [q, setQ] = useState(""); const [found, setFound] = useState<Found[] | null>(null); const [msg, setMsg] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["connections", userId] });
  const { data: shared = [] } = useQuery({
    queryKey: ["shared-with-me", userId], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await sharedWithMe(userId!).order("occurred_on", { ascending: false });
      if (error) throw error; return data;
    },
  });

  const { data: canEdit = [] } = useQuery({ queryKey: ["my-edit-grants", userId], enabled: !!userId, queryFn: async () => { const { data } = await supabase.from("item_shares").select("item_id").eq("grantee_id", userId!).eq("can_edit", true); return (data ?? []).map(r => r.item_id); } });
  const [editId, setEditId] = useState<string | null>(null); const [eTitle, setETitle] = useState(""); const [eBody, setEBody] = useState("");
  async function saveShared() { if (!editId) return; const { error } = await supabase.from("life_items").update({ title: eTitle.trim(), body: eBody.trim() }).eq("id", editId); if (error) { setMsg(friendlyError(error)); return; } setEditId(null); setMsg("Saved. The owner will see your changes."); await qc.invalidateQueries({ queryKey: ["shared-with-me", userId] }); }
  async function search(e: FormEvent) {
    e.preventDefault(); setMsg("");
    const { data, error } = await supabase.rpc("search_people", { _q: q });
    if (error) setMsg(friendlyError(error)); else setFound(data ?? []);
  }
  async function connect(id: string) {
    if (!userId) return;
    const { error } = await supabase.from("connections").insert({ requester_id: userId, addressee_id: id });
    setMsg(error ? (error.code === "23505" ? "You already have a connection or request with this person." : friendlyError(error)) : "Request sent."); await refresh();
  }
  async function accept(id: string) { const { error } = await supabase.from("connections").update({ status: "accepted" }).eq("id", id); if (error) setMsg(friendlyError(error)); await refresh(); }
  async function remove(id: string, label: string) { if (!window.confirm(label)) return; const { error } = await supabase.from("connections").delete().eq("id", id); if (error) setMsg(friendlyError(error)); await refresh(); }

  const incoming = people.filter(p => p.status === "pending" && p.incoming);
  const outgoing = people.filter(p => p.status === "pending" && !p.incoming);
  const connected = people.filter(p => p.status === "accepted");
  const known = new Set(people.map(p => p.person_id));
  const nameOf = (id: string) => people.find(p => p.person_id === id)?.display_name ?? "Someone";

  return <>
    <p className="mb-3 text-xs font-bold uppercase text-coral">YOUR PEOPLE</p><h1 className="text-4xl">People.</h1>
    <p className="mt-3 max-w-xl text-sm text-muted-foreground">Connecting with someone never shows them your private entries. They see only what you choose to share with them, or make public.</p>
    {msg && <p role="status" className="mt-5 text-sm text-muted-foreground">{msg}</p>}
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl">Find people</h2>
        <form onSubmit={search} className="mt-4 flex gap-2"><div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input className="pl-8" value={q} onChange={e => setQ(e.target.value)} placeholder="Name or username" minLength={2} /></div><Button type="submit">Search</Button></form>
        <p className="mt-2 text-xs text-muted-foreground">Only people who allow others to find them will show up.</p>
        {found && <div className="mt-4 space-y-3">{found.length ? found.map(f => <div key={f.id} className="flex items-center gap-3"><PersonAvatar name={f.display_name} path={f.avatar_url} /><Link to="/people/$personId" params={{ personId: f.id }} className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{f.display_name || "Unnamed"}</span>{f.username && <span className="text-xs text-muted-foreground">@{f.username}</span>}</Link>{known.has(f.id) ? <span className="text-xs text-muted-foreground">Already added</span> : <Button size="sm" variant="outline" onClick={() => connect(f.id)}><UserPlus className="size-4" /> Connect</Button>}</div>) : <p className="text-sm text-muted-foreground">No one found.</p>}</div>}
      </section>
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl">Requests</h2>
        {!incoming.length && !outgoing.length && <p className="mt-4 text-sm text-muted-foreground">No pending requests.</p>}
        <div className="mt-4 space-y-3">
          {incoming.map(p => <div key={p.connection_id} className="flex items-center gap-3"><PersonAvatar name={p.display_name} path={p.avatar_url} /><span className="flex-1 text-sm font-semibold">{p.display_name}</span><Button size="sm" onClick={() => accept(p.connection_id)}>Accept</Button><Button size="sm" variant="ghost" onClick={() => remove(p.connection_id, "Decline this request?")}>Decline</Button></div>)}
          {outgoing.map(p => <div key={p.connection_id} className="flex items-center gap-3"><PersonAvatar name={p.display_name} path={p.avatar_url} /><span className="flex-1 text-sm">{p.display_name} <span className="text-xs text-muted-foreground">· waiting</span></span><Button size="sm" variant="ghost" onClick={() => remove(p.connection_id, "Cancel this request?")}>Cancel</Button></div>)}
        </div>
      </section>
    </div>
    <section className="mt-8 rounded-lg border border-border bg-card p-6">
      <h2 className="text-xl">Connections</h2>
      {connected.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{connected.map(p => <div key={p.connection_id} className="flex items-center gap-3"><PersonAvatar name={p.display_name} path={p.avatar_url} /><Link to="/people/$personId" params={{ personId: p.person_id }} className="flex-1 text-sm font-semibold hover:underline">{p.display_name}</Link><Button size="sm" variant="ghost" onClick={() => remove(p.connection_id, `Remove ${p.display_name}? Anything you shared with each other will stop being visible.`)}>Remove</Button></div>)}</div> : <p className="mt-4 text-sm text-muted-foreground">No connections yet.</p>}
    </section>
    <section className="mt-8 rounded-lg border border-border bg-card p-6">
      <h2 className="text-xl">Shared with you</h2>
      {shared.length ? <div className="mt-4 divide-y divide-border">{shared.map(item => <div key={item.id} className="py-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="capitalize">{item.kind}</span>· {nameOf(item.owner_id)} · {format(new Date(item.occurred_on + "T12:00:00"), "MMM d, yyyy")}<VisibilityBadge value={item.visibility} /></div>{editId === item.id ? <div className="mt-2 space-y-2"><Input value={eTitle} onChange={e => setETitle(e.target.value)} maxLength={180} /><Textarea value={eBody} onChange={e => setEBody(e.target.value)} /><div className="flex gap-2"><Button size="sm" onClick={saveShared}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button></div></div> : <><p className="mt-1 font-semibold">{item.title}</p>{item.body && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{item.body}</p>}{canEdit.includes(item.id) && <Button size="sm" variant="link" className="px-0" onClick={() => { setEditId(item.id); setETitle(item.title); setEBody(item.body); }}>Edit</Button>}</>}</div>)}</div> : <p className="mt-4 text-sm text-muted-foreground">Nothing has been shared with you yet.</p>}
    </section>
  </>;
}
