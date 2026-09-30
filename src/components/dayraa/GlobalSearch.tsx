import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { loadErrorText } from "@/lib/friendly-error";
import { safeTerm, searchItems } from "@/lib/content";
import { PersonAvatar, VisibilityBadge } from "./privacy";

// Global search uses the exact same database access rules as every other screen,
// so private or trashed entries can never appear in results or counts.
export function GlobalSearch({ userId, onOpenOwn }: { userId: string | null; onOpenOwn: (id: string) => void }) {
  const [q, setQ] = useState(""); const [term, setTerm] = useState("");
  useEffect(() => { const t = setTimeout(() => setTerm(safeTerm(q)), 300); return () => clearTimeout(t); }, [q]);
  const enabled = !!userId && term.length >= 2;
  const items = useQuery({ queryKey: ["search-items", term], enabled, queryFn: () => searchItems(term) });
  const people = useQuery({ queryKey: ["search-people", term], enabled, queryFn: async () => { const { data, error } = await supabase.rpc("search_people", { _q: term }); if (error) throw error; return data ?? []; } });
  const own = (items.data ?? []).filter(i => i.owner_id === userId);
  const others = (items.data ?? []).filter(i => i.owner_id !== userId);
  return <>
    <p className="mb-3 text-xs font-bold uppercase text-coral">FIND ANYTHING</p><h1 className="text-4xl">Search.</h1>
    <div className="relative mt-6 max-w-xl"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input autoFocus className="h-10 bg-card pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder="Search your entries and people" aria-label="Search everything" /></div>
    <p className="mt-2 text-xs text-muted-foreground">Only shows what you're allowed to see: your own entries, things shared with you, and public entries.</p>
    {(items.error || people.error) && <p className="mt-6 text-sm text-destructive">{loadErrorText}</p>}
    {!enabled ? <p className="mt-10 text-sm text-muted-foreground">Type at least two letters.</p> : items.isLoading ? <p className="mt-10 text-sm text-muted-foreground">Looking…</p> : <div className="mt-8 space-y-8">
      <section><h2 className="text-xl">Your entries</h2>{own.length ? <div className="mt-3 divide-y divide-border rounded-lg border border-border bg-card px-5">{own.map(i => <button key={i.id} onClick={() => onOpenOwn(i.id)} className="block w-full py-3 text-left hover:text-primary"><span className="flex items-center gap-2 text-xs capitalize text-muted-foreground">{i.kind} · {format(new Date(i.occurred_on + "T12:00:00"), "MMM d, yyyy")}<VisibilityBadge value={i.visibility} /></span><span className="block text-sm font-semibold">{i.title}</span>{i.body && <span className="line-clamp-1 text-xs text-muted-foreground">{i.body}</span>}</button>)}</div> : <p className="mt-3 text-sm text-muted-foreground">Nothing of yours matches.</p>}</section>
      {others.length > 0 && <section><h2 className="text-xl">From other people</h2><div className="mt-3 divide-y divide-border rounded-lg border border-border bg-card px-5">{others.map(i => <Link key={i.id} to="/people/$personId" params={{ personId: i.owner_id }} className="block py-3 hover:text-primary"><span className="flex items-center gap-2 text-xs capitalize text-muted-foreground">{i.kind} · {format(new Date(i.occurred_on + "T12:00:00"), "MMM d, yyyy")}<VisibilityBadge value={i.visibility} /></span><span className="block text-sm font-semibold">{i.title}</span></Link>)}</div></section>}
      <section><h2 className="text-xl">People</h2>{people.data?.length ? <div className="mt-3 space-y-3">{people.data.map(p => <Link key={p.id} to="/people/$personId" params={{ personId: p.id }} className="flex items-center gap-3 hover:text-primary"><PersonAvatar name={p.display_name} path={p.avatar_url} /><span className="text-sm font-semibold">{p.display_name || "Unnamed"}</span>{p.username && <span className="text-xs text-muted-foreground">@{p.username}</span>}</Link>)}</div> : <p className="mt-3 text-sm text-muted-foreground">No people match.</p>}</section>
    </div>}
  </>;
}
