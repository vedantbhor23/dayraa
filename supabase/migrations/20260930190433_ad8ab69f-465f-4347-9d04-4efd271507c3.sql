DROP POLICY life_items_shared_select ON public.life_items;
DROP POLICY life_items_shared_update ON public.life_items;
CREATE POLICY life_items_shared_select ON public.life_items FOR SELECT TO authenticated USING (visibility = 'shared' AND EXISTS (SELECT 1 FROM public.item_shares s WHERE s.item_id = life_items.id AND s.grantee_id = auth.uid()));
CREATE POLICY life_items_shared_update ON public.life_items FOR UPDATE TO authenticated
  USING (visibility = 'shared' AND EXISTS (SELECT 1 FROM public.item_shares s WHERE s.item_id = life_items.id AND s.grantee_id = auth.uid() AND s.can_edit))
  WITH CHECK (visibility = 'shared' AND EXISTS (SELECT 1 FROM public.item_shares s WHERE s.item_id = life_items.id AND s.grantee_id = auth.uid() AND s.can_edit));