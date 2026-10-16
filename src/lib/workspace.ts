import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession, fetchIsSuperAdmin } from "@/lib/auth";

export type CompanyRow = {
  id: string; name: string; active: boolean; plan: string; expires_at: string | null; phone: string | null;
  role: "manager" | "accountant" | "worker" | null;
};

export function companyUsable(c: CompanyRow) {
  return c.active && (!c.expires_at || c.expires_at >= new Date().toISOString().slice(0, 10));
}

export function useWorkspace() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!session) return;
    const uid = session.user.id;
    const [admin, comps, mems] = await Promise.all([
      fetchIsSuperAdmin(uid),
      supabase.from("companies").select("*").order("created_at"),
      supabase.from("company_members").select("company_id, role").eq("user_id", uid),
    ]);
    const roleMap = new Map((mems.data ?? []).map((m) => [m.company_id, m.role]));
    setIsAdmin(admin);
    setCompanies((comps.data ?? []).map((c) => ({ ...c, role: (roleMap.get(c.id) ?? null) as CompanyRow["role"] })));
    setReady(true);
  }, [session]);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/", replace: true });
    if (session) reload();
  }, [loading, session, navigate, reload]);

  return { session, isAdmin, companies, ready, reload };
}
