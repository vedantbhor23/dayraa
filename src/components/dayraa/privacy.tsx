import { useQuery } from "@tanstack/react-query";
import { Globe, LockKeyhole, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type Visibility = "private" | "shared" | "public";
export const visibilityOptions: { value: Visibility; label: string; hint: string; icon: typeof Globe }[] = [
  { value: "private", label: "Only me", hint: "Nobody else can see this.", icon: LockKeyhole },
  { value: "shared", label: "Selected people", hint: "Only connections you pick.", icon: UserRound },
  { value: "public", label: "Public", hint: "Anyone who can see your profile.", icon: Globe },
];

export function VisibilityBadge({ value }: { value: string }) {
  const opt = visibilityOptions.find(o => o.value === value) ?? visibilityOptions[0];
  const Icon = opt.icon;
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"><Icon className="size-3" />{opt.label}</span>;
}

export type Person = { connection_id: string; person_id: string; display_name: string; username: string | null; avatar_url: string | null; status: string; incoming: boolean };

export function useConnections(userId: string | null) {
  return useQuery({
    queryKey: ["connections", userId], enabled: !!userId,
    queryFn: async () => { const { data, error } = await supabase.rpc("my_connections"); if (error) throw error; return (data ?? []) as Person[]; },
  });
}

export function useAvatarUrl(path: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ["avatar", path], enabled: !!path, staleTime: 50 * 60 * 1000,
    queryFn: async () => (await supabase.storage.from("avatars").createSignedUrl(path!, 3600)).data?.signedUrl ?? null,
  });
  return path ? data ?? null : null;
}

export function PersonAvatar({ name, path, size = "size-10 text-lg" }: { name: string; path: string | null | undefined; size?: string }) {
  const url = useAvatarUrl(path);
  return url ? <img src={url} alt="" className={`${size} shrink-0 rounded-full object-cover`} /> : <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-wash font-display text-primary`}>{name.charAt(0).toUpperCase() || "?"}</span>;
}
