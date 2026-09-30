-- ===== life_items: soft delete, metadata, custom moods =====
ALTER TABLE public.life_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.life_items ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
DO $$ DECLARE c text; BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.life_items'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%mood%' LOOP
    EXECUTE format('ALTER TABLE public.life_items DROP CONSTRAINT %I', c);
  END LOOP; END $$;
ALTER TABLE public.life_items ADD CONSTRAINT life_items_mood_len CHECK (mood IS NULL OR char_length(mood) BETWEEN 1 AND 40);
CREATE INDEX IF NOT EXISTS life_items_deleted_idx ON public.life_items (deleted_at) WHERE deleted_at IS NOT NULL;

-- ===== item_shares: future permission set =====
ALTER TABLE public.item_shares ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT ARRAY['view']::text[];

-- ===== profiles: deletion + contact discovery =====
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_discovery boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.can_view_profile(_owner uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _owner = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _owner AND p.deletion_requested_at IS NULL
    AND (p.profile_visibility = 'public' OR (p.profile_visibility = 'connections' AND public.are_connected(_owner, auth.uid()))))
$$;

CREATE OR REPLACE FUNCTION public.search_people(_q text) RETURNS TABLE(id uuid, display_name text, username text, avatar_url text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.username, CASE WHEN public.can_view_profile(p.id) THEN p.avatar_url END FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.id <> auth.uid() AND length(trim(_q)) >= 2 AND p.deletion_requested_at IS NULL
    AND (p.discoverability = 'everyone' OR (p.discoverability = 'contacts' AND public.are_connected(p.id, auth.uid())))
    AND (p.username ILIKE trim(_q) || '%' OR p.display_name ILIKE '%' || trim(_q) || '%')
  ORDER BY p.display_name LIMIT 20
$$;

-- ===== Central authorization helper =====
-- _perm: 'view' | 'edit' | 'complete' | owner-only: 'delete' | 'share' | 'visibility'
CREATE OR REPLACE FUNCTION public.item_access(_item uuid, _perm text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.life_items li WHERE li.id = _item AND (
    li.owner_id = auth.uid()
    OR (li.deleted_at IS NULL AND CASE
      WHEN _perm = 'view' THEN
        (li.visibility = 'public' AND public.can_view_profile(li.owner_id))
        OR (li.visibility = 'shared' AND public.are_connected(li.owner_id, auth.uid())
            AND EXISTS (SELECT 1 FROM public.item_shares s WHERE s.item_id = li.id AND s.grantee_id = auth.uid()))
      WHEN _perm IN ('edit','complete') THEN
        li.visibility = 'shared' AND public.are_connected(li.owner_id, auth.uid())
        AND EXISTS (SELECT 1 FROM public.item_shares s WHERE s.item_id = li.id AND s.grantee_id = auth.uid() AND s.can_edit)
      ELSE false END)))
$$;

DROP POLICY IF EXISTS life_items_owner_select ON public.life_items;
DROP POLICY IF EXISTS life_items_public_select ON public.life_items;
DROP POLICY IF EXISTS life_items_shared_select ON public.life_items;
DROP POLICY IF EXISTS life_items_shared_update ON public.life_items;
CREATE POLICY life_items_select ON public.life_items FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.item_access(id, 'view'));
CREATE POLICY life_items_shared_update ON public.life_items FOR UPDATE TO authenticated USING (owner_id <> auth.uid() AND public.item_access(id, 'edit')) WITH CHECK (visibility = 'shared' AND deleted_at IS NULL);

CREATE OR REPLACE FUNCTION public.guard_life_item_owner_fields() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.owner_id <> OLD.owner_id THEN RAISE EXCEPTION 'Ownership cannot change'; END IF;
  IF auth.uid() IS DISTINCT FROM OLD.owner_id AND (NEW.visibility <> OLD.visibility OR NEW.kind <> OLD.kind
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at OR NEW.metadata <> OLD.metadata) THEN
    RAISE EXCEPTION 'Only the owner can change this';
  END IF;
  RETURN NEW;
END $$;

-- ===== Attachments (attachment-level privacy ready) =====
CREATE TABLE public.item_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.life_items(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('photo','video','audio','file','location')),
  storage_path text,
  label text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility text NOT NULL DEFAULT 'inherit' CHECK (visibility IN ('inherit','private')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_attachments TO authenticated;
GRANT ALL ON public.item_attachments TO service_role;
ALTER TABLE public.item_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY attachments_owner_all ON public.item_attachments FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.life_items li WHERE li.id = item_id AND li.owner_id = auth.uid()));
CREATE POLICY attachments_viewer_select ON public.item_attachments FOR SELECT TO authenticated
  USING (visibility = 'inherit' AND public.item_access(item_id, 'view'));
CREATE TRIGGER item_attachments_touch_updated_at BEFORE UPDATE ON public.item_attachments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== App lock (PIN hashed with bcrypt, never readable by clients) =====
CREATE TABLE public.app_locks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text,
  enabled boolean NOT NULL DEFAULT false,
  auto_lock_minutes integer NOT NULL DEFAULT 5 CHECK (auto_lock_minutes IN (0,5,15,30)),
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_locks TO service_role;
ALTER TABLE public.app_locks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.recently_signed_in(_minutes integer DEFAULT 10) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM auth.sessions s WHERE s.id = NULLIF(auth.jwt() ->> 'session_id', '')::uuid AND s.user_id = auth.uid() AND s.created_at > now() - make_interval(mins => _minutes))
$$;

CREATE OR REPLACE FUNCTION public.get_app_lock() RETURNS TABLE(enabled boolean, auto_lock_minutes integer, has_pin boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(a.enabled, false), COALESCE(a.auto_lock_minutes, 5), a.pin_hash IS NOT NULL
  FROM (SELECT auth.uid() AS uid) u LEFT JOIN public.app_locks a ON a.user_id = u.uid WHERE u.uid IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.set_app_pin(_pin text, _current text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE r public.app_locks;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_signed_in'; END IF;
  IF _pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'pin_format'; END IF;
  SELECT * INTO r FROM public.app_locks WHERE user_id = auth.uid();
  IF r.pin_hash IS NOT NULL AND (_current IS NULL OR extensions.crypt(_current, r.pin_hash) <> r.pin_hash) THEN RAISE EXCEPTION 'pin_wrong'; END IF;
  INSERT INTO public.app_locks (user_id, pin_hash, enabled, failed_attempts, locked_until)
  VALUES (auth.uid(), extensions.crypt(_pin, extensions.gen_salt('bf', 10)), true, 0, NULL)
  ON CONFLICT (user_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, enabled = true, failed_attempts = 0, locked_until = NULL, updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.verify_app_pin(_pin text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE r public.app_locks;
BEGIN
  SELECT * INTO r FROM public.app_locks WHERE user_id = auth.uid() FOR UPDATE;
  IF r.pin_hash IS NULL THEN RETURN jsonb_build_object('ok', true); END IF;
  IF r.locked_until IS NOT NULL AND r.locked_until > now() THEN RETURN jsonb_build_object('ok', false, 'locked_until', r.locked_until); END IF;
  IF extensions.crypt(_pin, r.pin_hash) = r.pin_hash THEN
    UPDATE public.app_locks SET failed_attempts = 0, locked_until = NULL WHERE user_id = auth.uid();
    RETURN jsonb_build_object('ok', true);
  END IF;
  IF r.failed_attempts + 1 >= 5 THEN
    UPDATE public.app_locks SET failed_attempts = 0, locked_until = now() + interval '5 minutes' WHERE user_id = auth.uid();
    RETURN jsonb_build_object('ok', false, 'locked_until', now() + interval '5 minutes');
  END IF;
  UPDATE public.app_locks SET failed_attempts = r.failed_attempts + 1 WHERE user_id = auth.uid();
  RETURN jsonb_build_object('ok', false, 'attempts_left', 4 - r.failed_attempts);
END $$;

CREATE OR REPLACE FUNCTION public.set_app_lock_minutes(_minutes integer) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.app_locks SET auto_lock_minutes = _minutes, updated_at = now() WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.disable_app_lock(_pin text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE r public.app_locks;
BEGIN
  SELECT * INTO r FROM public.app_locks WHERE user_id = auth.uid();
  IF r.pin_hash IS NOT NULL AND extensions.crypt(_pin, r.pin_hash) <> r.pin_hash THEN RAISE EXCEPTION 'pin_wrong'; END IF;
  UPDATE public.app_locks SET pin_hash = NULL, enabled = false, failed_attempts = 0, locked_until = NULL, updated_at = now() WHERE user_id = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.reset_app_pin_after_signin() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.recently_signed_in(10) THEN RAISE EXCEPTION 'reauth_required'; END IF;
  UPDATE public.app_locks SET pin_hash = NULL, enabled = false, failed_attempts = 0, locked_until = NULL, updated_at = now() WHERE user_id = auth.uid();
END $$;

-- ===== Account deletion with 30-day recovery =====
CREATE OR REPLACE FUNCTION public.request_account_deletion() RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_signed_in'; END IF;
  IF NOT public.recently_signed_in(10) THEN RAISE EXCEPTION 'reauth_required'; END IF;
  UPDATE public.profiles SET deletion_requested_at = now() WHERE id = auth.uid();
  RETURN now() + interval '30 days';
END $$;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET deletion_requested_at = NULL WHERE id = auth.uid()
$$;

-- ===== Function execute permissions =====
REVOKE ALL ON FUNCTION public.item_access(uuid, text), public.recently_signed_in(integer), public.get_app_lock(), public.set_app_pin(text, text),
  public.verify_app_pin(text), public.set_app_lock_minutes(integer), public.disable_app_lock(text), public.reset_app_pin_after_signin(),
  public.request_account_deletion(), public.cancel_account_deletion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.item_access(uuid, text), public.recently_signed_in(integer), public.get_app_lock(), public.set_app_pin(text, text),
  public.verify_app_pin(text), public.set_app_lock_minutes(integer), public.disable_app_lock(text), public.reset_app_pin_after_signin(),
  public.request_account_deletion(), public.cancel_account_deletion() TO authenticated;

-- ===== Nightly clean-up =====
CREATE TABLE public.internal_job_tokens (name text PRIMARY KEY, token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'));
GRANT ALL ON public.internal_job_tokens TO service_role;
ALTER TABLE public.internal_job_tokens ENABLE ROW LEVEL SECURITY;
INSERT INTO public.internal_job_tokens (name) VALUES ('purge') ON CONFLICT DO NOTHING;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule('dayraa-purge-trash', '17 3 * * *', $c$DELETE FROM public.life_items WHERE deleted_at < now() - interval '30 days'$c$);
SELECT cron.schedule('dayraa-purge-accounts', '27 3 * * *', $c$SELECT net.http_post(
  url := 'https://project--565b300c-56fd-4d0a-9b7c-097d949f56b4.lovable.app/api/public/purge-accounts',
  headers := jsonb_build_object('Content-Type','application/json','x-job-token',(SELECT token FROM public.internal_job_tokens WHERE name = 'purge')),
  body := '{}'::jsonb)$c$);