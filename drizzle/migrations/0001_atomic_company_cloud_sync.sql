CREATE OR REPLACE FUNCTION public.sync_company_data(_company uuid, _changes jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE item jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'super_admin') OR (public.company_role_of(auth.uid(), _company) IN ('manager', 'accountant') AND public.company_is_active(_company))) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(_changes) <> 'array' OR jsonb_array_length(_changes) > 100 THEN
    RAISE EXCEPTION 'Invalid changes';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_company::text, 0));
  FOR item IN SELECT value FROM jsonb_array_elements(_changes) LOOP
    IF jsonb_typeof(item->'key') IS DISTINCT FROM 'string' OR item->>'key' NOT LIKE 'alsadiq\_%' ESCAPE '\' OR item->>'key' = 'alsadiq_active_company' OR length(item->>'key') > 200 OR NOT (item ? 'value') OR jsonb_typeof(item->'value') NOT IN ('string', 'null') THEN
      RAISE EXCEPTION 'Invalid storage entry';
    END IF;
    IF item->'value' = 'null'::jsonb THEN
      DELETE FROM public.company_data WHERE company_id = _company AND key = item->>'key';
    ELSE
      INSERT INTO public.company_data(company_id, key, value, updated_by, updated_at)
      VALUES (_company, item->>'key', item->>'value', auth.uid(), now())
      ON CONFLICT (company_id, key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at;
    END IF;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_company_data(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_company_data(uuid,jsonb) TO authenticated;
ALTER POLICY "delete data" ON public.company_data USING (public.has_role(auth.uid(),'super_admin') OR (public.company_role_of(auth.uid(), company_id) IN ('manager','accountant') AND public.company_is_active(company_id)));