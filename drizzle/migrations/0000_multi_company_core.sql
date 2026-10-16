CREATE TYPE public.app_role AS ENUM ('super_admin');
CREATE TYPE public.company_role AS ENUM ('manager','accountant','worker');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  active boolean NOT NULL DEFAULT true,
  plan text NOT NULL DEFAULT 'basic',
  expires_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role company_role NOT NULL DEFAULT 'worker',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.company_data (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_data TO authenticated;
GRANT ALL ON public.company_data TO service_role;
ALTER TABLE public.company_data ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE OR REPLACE FUNCTION public.company_role_of(_user_id uuid, _company uuid)
RETURNS company_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.company_members WHERE user_id=_user_id AND company_id=_company
$$;

CREATE OR REPLACE FUNCTION public.company_is_active(_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.companies WHERE id=_company AND active AND (expires_at IS NULL OR expires_at >= current_date))
$$;

-- user_roles
CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

-- profiles
CREATE POLICY "read profiles" ON public.profiles FOR SELECT TO authenticated USING (
  id = auth.uid() OR public.has_role(auth.uid(),'super_admin')
  OR EXISTS (SELECT 1 FROM public.company_members m1 JOIN public.company_members m2 ON m1.company_id=m2.company_id WHERE m1.user_id=auth.uid() AND m2.user_id=profiles.id)
);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- companies
CREATE POLICY "read companies" ON public.companies FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'super_admin') OR public.company_role_of(auth.uid(), id) IS NOT NULL);
CREATE POLICY "admin insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admin update companies" ON public.companies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admin delete companies" ON public.companies FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

-- members
CREATE POLICY "read members" ON public.company_members FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'super_admin') OR public.company_role_of(auth.uid(), company_id) IS NOT NULL);
CREATE POLICY "manage members" ON public.company_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.company_role_of(auth.uid(), company_id) = 'manager')
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.company_role_of(auth.uid(), company_id) = 'manager');

-- data
CREATE POLICY "read data" ON public.company_data FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'super_admin') OR (public.company_role_of(auth.uid(), company_id) IS NOT NULL AND public.company_is_active(company_id)));
CREATE POLICY "insert data" ON public.company_data FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'super_admin') OR (public.company_role_of(auth.uid(), company_id) IN ('manager','accountant') AND public.company_is_active(company_id)));
CREATE POLICY "update data" ON public.company_data FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'super_admin') OR (public.company_role_of(auth.uid(), company_id) IN ('manager','accountant') AND public.company_is_active(company_id)));
CREATE POLICY "delete data" ON public.company_data FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'super_admin') OR public.company_role_of(auth.uid(), company_id) = 'manager');

-- signup trigger: profile + first user becomes super_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, email, full_name) VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role='super_admin') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'super_admin');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- add member by email (manager or super admin)
CREATE OR REPLACE FUNCTION public.add_member_by_email(_company uuid, _email text, _role company_role)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'super_admin') OR public.company_role_of(auth.uid(), _company) = 'manager') THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;
  SELECT id INTO uid FROM public.profiles WHERE lower(email) = lower(trim(_email));
  IF uid IS NULL THEN RETURN 'not_found'; END IF;
  INSERT INTO public.company_members(company_id, user_id, role) VALUES (_company, uid, _role)
  ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  RETURN 'ok';
END $$;
REVOKE EXECUTE ON FUNCTION public.add_member_by_email(uuid,text,company_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_member_by_email(uuid,text,company_role) TO authenticated;