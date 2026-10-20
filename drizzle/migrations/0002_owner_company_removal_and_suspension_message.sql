ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS suspension_message text;
CREATE TABLE public.company_owner_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), actor_id uuid NOT NULL, action text NOT NULL, message text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.company_owner_events TO authenticated;
GRANT ALL ON public.company_owner_events TO service_role;
ALTER TABLE public.company_owner_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads company events" ON public.company_owner_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE OR REPLACE FUNCTION public.manage_company_subscription(_company uuid, _action text, _message text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 IF _action NOT IN ('archive','suspend','activate','message') OR _action IS NULL THEN RAISE EXCEPTION 'Invalid action'; END IF;
 IF length(coalesce(_message,'')) > 2000 THEN RAISE EXCEPTION 'Message too long'; END IF;
 PERFORM 1 FROM public.companies WHERE id=_company AND archived_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Company not found'; END IF;
 IF _action='archive' THEN UPDATE public.companies SET active=false, archived_at=now() WHERE id=_company;
 ELSIF _action='suspend' THEN UPDATE public.companies SET active=false, suspension_message=nullif(trim(_message),'') WHERE id=_company;
 ELSIF _action='activate' THEN UPDATE public.companies SET active=true WHERE id=_company;
 ELSE UPDATE public.companies SET suspension_message=nullif(trim(_message),'') WHERE id=_company;
 END IF;
 INSERT INTO public.company_owner_events(company_id,actor_id,action,message) VALUES(_company,auth.uid(),_action,nullif(trim(_message),''));
END;
$$;
REVOKE ALL ON FUNCTION public.manage_company_subscription(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_company_subscription(uuid,text,text) TO authenticated, service_role;