// Central content-access layer. The database (RLS + item_access) is the real authority;
// these helpers make sure every screen asks for content the same way and never shows trashed items.
import { supabase } from "@/integrations/supabase/client";

export const TRASH_DAYS = 30;

/** Items the user owns and hasn't trashed. */
export function ownItems(userId: string) {
  return supabase.from("life_items").select("*").eq("owner_id", userId).is("deleted_at", null);
}

/** Items the user owns that are in the trash. */
export function trashedItems(userId: string) {
  return supabase.from("life_items").select("*").eq("owner_id", userId).not("deleted_at", "is", null).order("deleted_at", { ascending: false });
}

/** Items other people explicitly shared with the user. */
export function sharedWithMe(userId: string) {
  return supabase.from("life_items").select("*").eq("visibility", "shared").neq("owner_id", userId).is("deleted_at", null);
}

/** Another person's public items (only returned when their profile is viewable). */
export function publicItemsOf(ownerId: string) {
  return supabase.from("life_items").select("*").eq("owner_id", ownerId).eq("visibility", "public").is("deleted_at", null);
}

/** Strip characters that have meaning inside PostgREST filter expressions. */
export function safeTerm(q: string) {
  return q.replace(/[,()%*\\:"']/g, " ").trim().slice(0, 80);
}

/** Search every item the user is allowed to see: own, shared-with-me, and viewable public items. */
export async function searchItems(q: string) {
  const term = safeTerm(q);
  if (term.length < 2) return [];
  const { data, error } = await supabase.from("life_items").select("*").is("deleted_at", null)
    .or(`title.ilike.%${term}%,body.ilike.%${term}%`).order("occurred_on", { ascending: false }).limit(50);
  if (error) throw error;
  return data ?? [];
}

export const moodOptions = ["great", "good", "okay", "sad", "angry", "tired", "loved", "excited", "anxious"] as const;

export function draftKey(userId: string, scope: string) { return `dayraa-draft:${userId}:${scope}`; }
export function readDraft(key: string): { title: string; body: string } | null {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
export function writeDraft(key: string, d: { title: string; body: string }) {
  try { if (d.title || d.body) localStorage.setItem(key, JSON.stringify(d)); else localStorage.removeItem(key); } catch { /* storage full or blocked */ }
}
export function clearDraft(key: string) { try { localStorage.removeItem(key); } catch { /* ignore */ } }

/** Ask the user to sign in again for a sensitive action; the flag is picked up after sign-in. */
export async function reauthenticate(reason: "pin" | "delete") {
  localStorage.setItem("dayraa-reauth", reason);
  await supabase.auth.signOut();
  window.location.assign("/auth");
}
