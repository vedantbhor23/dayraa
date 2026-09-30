import { createFileRoute } from "@tanstack/react-router";

// Nightly job (called by the database scheduler) that permanently removes accounts
// whose 30-day recovery window has ended. Caller must present the internal job token.
export const Route = createFileRoute("/api/public/purge-accounts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-job-token") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: tok } = await supabaseAdmin.from("internal_job_tokens").select("token").eq("name", "purge").maybeSingle();
        const { createHash, timingSafeEqual } = await import("node:crypto");
        const h = (v: string) => createHash("sha256").update(v).digest();
        if (!tok?.token || !provided || !timingSafeEqual(h(provided), h(tok.token))) return new Response("Unauthorized", { status: 401 });

        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: due, error } = await supabaseAdmin.from("profiles").select("id").lt("deletion_requested_at", cutoff).limit(100);
        if (error) { console.error("purge lookup failed", error); return new Response("error", { status: 500 }); }
        let removed = 0;
        for (const { id } of due ?? []) {
          for (const bucket of ["avatars"]) {
            const { data: files } = await supabaseAdmin.storage.from(bucket).list(id, { limit: 1000 });
            if (files?.length) await supabaseAdmin.storage.from(bucket).remove(files.map(f => `${id}/${f.name}`));
          }
          // Deleting the account cascades to profile, entries, shares, connections, attachments and app lock.
          const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(id);
          if (delErr) console.error("purge delete failed", id, delErr.message); else removed++;
        }
        return Response.json({ removed });
      },
    },
  },
});
