import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession, fetchIsSuperAdmin } from "@/lib/auth";
import { companyAvailable } from "@/lib/company-management";

export type CompanyRow = {
  id: string; name: string; active: boolean; plan: string; expires_at: string | null; phone: string | null;
  role: "manager" | "accountant" | "worker" | null;
  archived_at?: string | null;
  suspension_message?: string | null;
};

export function companyUsable(c: CompanyRow) {
  return companyAvailable(c);
}

export function useWorkspace() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session) return;
    const uid = session.user.id;
    const [admin, comps, mems] = await Promise.all([
      fetchIsSuperAdmin(uid),
      supabase.from("companies").select("*").order("created_at"),
      supabase.from("company_members").select("company_id, role").eq("user_id", uid),
    ]);
    if (comps.error || mems.error) {
      setError("تعذّر تحميل الشركات. تحقق من الاتصال وحاول مرة أخرى.");
      setReady(true);
      return;
    }
    setError(null);
    const roleMap = new Map((mems.data ?? []).map((m) => [m.company_id, m.role]));
    setIsAdmin(admin);
    setCompanies((comps.data ?? []).filter((c) => !c.archived_at).map((c) => ({ ...c, role: (roleMap.get(c.id) ?? null) as CompanyRow["role"] })));
    setReady(true);
  }, [session]);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/", replace: true });
    if (session) reload();
  }, [loading, session, navigate, reload]);

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") void reload(); }, 15000);
    const refresh = () => { if (document.visibilityState === "visible") void reload(); };
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [session, reload]);

  return { session, isAdmin, companies, ready, reload, error };
}
