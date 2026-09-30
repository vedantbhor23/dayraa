ALTER TABLE public.profiles
  ADD COLUMN profile_visibility text NOT NULL DEFAULT 'private' CHECK (profile_visibility IN ('private','connections','public')),
  ADD COLUMN discoverability text NOT NULL DEFAULT 'nobody' CHECK (discoverability IN ('nobody','contacts','everyone')),
  ADD COLUMN default_visibility text NOT NULL DEFAULT 'private' CHECK (default_visibility IN ('private','shared','public'));

ALTER TABLE public.life_items
  ADD COLUMN visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','shared','public'));

CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_id <> addressee_id)
);
CREATE UNIQUE INDEX connections_pair_uniq ON public.connections (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO authenticated;
GRANT ALL ON public.connections TO service_role;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY connections_select ON public.connections FOR SELECT TO authenticated USING (auth.uid() IN (requester_id, addressee_id));
CREATE POLICY connections_insert ON public.connections FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid() AND status = 'pending');
CREATE POLICY connections_accept ON public.connections FOR UPDATE TO authenticated USING (addressee_id = auth.uid()) WITH CHECK (addressee_id = auth.uid() AND status = 'accepted');
CREATE POLICY connections_delete ON public.connections FOR DELETE TO authenticated USING (auth.uid() IN (requester_id, addressee_id));
CREATE TRIGGER connections_touch_updated_at BEFORE UPDATE ON public.connections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.are_connected(_a uuid, _b uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.connections WHERE status = 'accepted' AND ((requester_id = _a AND addressee_id = _b) OR (requester_id = _b AND addressee_id = _a)))
$$;
CREATE OR REPLACE FUNCTION public.can_view_profile(_owner uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _owner = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _owner AND (p.profile_visibility = 'public' OR (p.profile_visibility = 'connections' AND public.are_connected(_owner, auth.uid()))))
$$;
REVOKE EXECUTE ON FUNCTION public.are_connected(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.are_connected(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated;

CREATE POLICY profiles_visible_select ON public.profiles FOR SELECT TO authenticated USING (public.can_view_profile(id));

CREATE OR REPLACE FUNCTION public.search_people(_q text) RETURNS TABLE (id uuid, display_name text, username text, avatar_url text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.id <> auth.uid() AND length(trim(_q)) >= 2
    AND (p.discoverability = 'everyone' OR (p.discoverability = 'contacts' AND public.are_connected(p.id, auth.uid())))
    AND (p.username ILIKE trim(_q) || '%' OR p.display_name ILIKE '%' || trim(_q) || '%')
  ORDER BY p.display_name LIMIT 20
$$;
REVOKE EXECUTE ON FUNCTION public.search_people(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.search_people(text) TO authenticated;

CREATE TABLE public.item_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.life_items(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grantee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, grantee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_shares TO authenticated;
GRANT ALL ON public.item_shares TO service_role;
ALTER TABLE public.item_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY item_shares_select ON public.item_shares FOR SELECT TO authenticated USING (auth.uid() IN (owner_id, grantee_id));
CREATE POLICY item_shares_insert ON public.item_shares FOR INSERT TO authenticated WITH CHECK (
  owner_id = auth.uid() AND grantee_id <> auth.uid() AND public.are_connected(owner_id, grantee_id)
  AND EXISTS (SELECT 1 FROM public.life_items li WHERE li.id = item_id AND li.owner_id = auth.uid()));
CREATE POLICY item_shares_update ON public.item_shares FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY item_shares_delete ON public.item_shares FOR DELETE TO authenticated USING (owner_id = auth.uid() OR grantee_id = auth.uid());
CREATE INDEX item_shares_grantee_idx ON public.item_shares (grantee_id);

CREATE POLICY life_items_public_select ON public.life_items FOR SELECT TO authenticated USING (visibility = 'public' AND public.can_view_profile(owner_id));
CREATE POLICY life_items_shared_select ON public.life_items FOR SELECT TO authenticated USING (visibility = 'shared' AND EXISTS (SELECT 1 FROM public.item_shares s WHERE s.item_id = id AND s.grantee_id = auth.uid()));
CREATE POLICY life_items_shared_update ON public.life_items FOR UPDATE TO authenticated
  USING (visibility = 'shared' AND EXISTS (SELECT 1 FROM public.item_shares s WHERE s.item_id = id AND s.grantee_id = auth.uid() AND s.can_edit))
  WITH CHECK (visibility = 'shared' AND EXISTS (SELECT 1 FROM public.item_shares s WHERE s.item_id = id AND s.grantee_id = auth.uid() AND s.can_edit));

-- editors cannot change ownership or visibility
CREATE OR REPLACE FUNCTION public.guard_life_item_owner_fields() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.owner_id <> OLD.owner_id THEN RAISE EXCEPTION 'Ownership cannot change'; END IF;
  IF auth.uid() IS DISTINCT FROM OLD.owner_id AND (NEW.visibility <> OLD.visibility OR NEW.kind <> OLD.kind) THEN RAISE EXCEPTION 'Only the owner can change visibility'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER life_items_guard_owner BEFORE UPDATE ON public.life_items FOR EACH ROW EXECUTE FUNCTION public.guard_life_item_owner_fields();

CREATE POLICY avatars_visible_select ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars' AND public.can_view_profile(((storage.foldername(name))[1])::uuid));