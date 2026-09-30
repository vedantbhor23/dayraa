// Turns technical errors into calm, human messages. Technical details go to the console only.
const custom: Record<string, string> = {
  pin_wrong: "That PIN isn't right.",
  pin_format: "Your PIN needs to be exactly 4 digits.",
  reauth_required: "For your safety, please sign in again first.",
  not_signed_in: "Please sign in again.",
};

export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  const e = error as { message?: string; code?: string };
  const msg = e.message ?? String(error);
  if (import.meta.env.DEV) console.warn("[Dayraa]", error);
  for (const key of Object.keys(custom)) if (msg.includes(key)) return custom[key]!;
  if (e.code === "42501" || /row-level security|permission denied|Only the owner|Ownership cannot/i.test(msg)) return "You don't have permission to do that.";
  if (e.code === "23505") return "That already exists.";
  if (/Failed to fetch|NetworkError|network|Load failed/i.test(msg)) return "We couldn't reach Dayraa. Check your connection and try again — nothing you typed was lost.";
  return fallback;
}

export const loadErrorText = "We couldn't load this right now. Please try again.";
