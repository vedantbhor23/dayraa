CREATE OR REPLACE FUNCTION public.my_connections() RETURNS TABLE (connection_id uuid, person_id uuid, display_name text, username text, avatar_url text, status text, incoming boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, p.id, p.display_name, p.username, p.avatar_url, c.status, c.addressee_id = auth.uid()
  FROM public.connections c
  JOIN public.profiles p ON p.id = CASE WHEN c.requester_id = auth.uid() THEN c.addressee_id ELSE c.requester_id END
  WHERE auth.uid() IN (c.requester_id, c.addressee_id)
  ORDER BY p.display_name
$$;
REVOKE EXECUTE ON FUNCTION public.my_connections() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_connections() TO authenticated;