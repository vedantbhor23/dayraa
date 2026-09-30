import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ChevronLeft, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { publicItemsOf } from "@/lib/content";
import { PersonAvatar, VisibilityBadge } from "./privacy";

export function PersonProfile({ personId }: { personId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["person", personId],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("id,display_name,username,avatar_url,bio").eq("id", personId).maybeSingle();
      if (!profile) return null;
      const { data: items } = await publicItemsOf(personId).order("occurred_on", { ascending: false });
      return { profile, items: items ?? [] };
    },
  });
  return <>
    <Link to="/people" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> People</Link>
    {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !data ? <div className="rounded-lg border border-dashed border-border p-10 text-center"><LockKeyhole className="mx-auto mb-3 size-6 text-coral" /><p className="font-display text-xl">This profile is private.</p><p className="mt-1 text-sm text-muted-foreground">Only what this person chooses to share can be seen.</p></div> : <>
      <div className="flex flex-wrap items-center gap-5"><PersonAvatar name={data.profile.display_name} path={data.profile.avatar_url} size="size-20 text-4xl" /><div><h1 className="text-4xl">{data.profile.display_name || "Unnamed"}</h1>{data.profile.username && <p className="text-sm text-muted-foreground">@{data.profile.username}</p>}</div></div>
      {data.profile.bio && <p className="mt-5 max-w-xl whitespace-pre-wrap text-sm leading-6">{data.profile.bio}</p>}
      <h2 className="mt-10 text-xl">Public entries</h2>
      {data.items.length ? <div className="mt-4 divide-y divide-border rounded-lg border border-border bg-card px-5">{data.items.map(item => <div key={item.id} className="py-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="capitalize">{item.kind}</span>· {format(new Date(item.occurred_on + "T12:00:00"), "MMM d, yyyy")}<VisibilityBadge value={item.visibility} /></div><p className="mt-1 font-semibold">{item.title}</p>{item.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.body}</p>}</div>)}</div> : <p className="mt-4 text-sm text-muted-foreground">Nothing public yet.</p>}
    </>}
  </>;
}
