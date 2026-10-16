import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CloudCheck, CloudUpload, Eye, Loader2, RefreshCw, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace, companyUsable, type CompanyRow } from "@/lib/workspace";
import { roleLabels } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "البرنامج — الصادق" },
      { name: "description", content: "برنامج الصادق للفواتير والمخزون والحسابات." },
      { property: "og:title", content: "البرنامج — الصادق" },
      { property: "og:description", content: "برنامج الصادق للفواتير والمخزون والحسابات." },
    ],
  }),
  component: AppPage,
});

declare global {
  interface Window { __alsadiqSync?: (k: string, v: string | null) => void }
}

function AppPage() {
  const { session, isAdmin, companies, ready } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || selectedId) return;
    const saved = localStorage.getItem("alsadiq_active_company");
    const pick = companies.find((c) => c.id === saved) ?? companies[0];
    if (pick) setSelectedId(pick.id);
  }, [ready, companies, selectedId]);

  const company = companies.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader isAdmin={isAdmin} email={session?.user.email} />
      {!ready ? (
        <Center><Loader2 className="size-8 animate-spin text-primary" /></Center>
      ) : companies.length === 0 ? (
        <Center>
          <div className="max-w-md rounded-2xl bg-card p-8 text-center shadow-card">
            <h2 className="mb-2 text-xl font-black">لا توجد شركة مرتبطة بحسابك</h2>
            <p className="text-muted-foreground">
              {isAdmin ? "أنشئ أول شركة من لوحة المالك." : "اطلب من مدير شركتك إضافة بريدك "}
              {!isAdmin && <b dir="ltr">{session?.user.email}</b>}
            </p>
            {isAdmin && <Button asChild className="mt-4"><Link to="/admin">لوحة المالك</Link></Button>}
          </div>
        </Center>
      ) : (
        <>
          {companies.length > 1 && (
            <div className="flex gap-2 overflow-x-auto border-b bg-card px-3 py-2">
              {companies.map((c) => (
                <Button key={c.id} size="sm" variant={c.id === selectedId ? "default" : "outline"}
                  onClick={() => { localStorage.setItem("alsadiq_active_company", c.id); setSelectedId(c.id); }}>
                  {c.name}
                </Button>
              ))}
            </div>
          )}
          {company && <Workspace key={company.id} company={company} isAdmin={isAdmin} userId={session!.user.id} />}
        </>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-4">{children}</div>;
}

function Workspace({ company, isAdmin, userId }: { company: CompanyRow; isAdmin: boolean; userId: string }) {
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [frameKey, setFrameKey] = useState(0);
  const pending = useRef(new Map<string, string | null>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const usable = isAdmin || companyUsable(company);
  const canWrite = usable && (isAdmin || company.role === "manager" || company.role === "accountant");

  const flush = useMemo(() => async () => {
    const items = [...pending.current.entries()];
    pending.current.clear();
    if (!items.length) return;
    setStatus("saving");
    const upserts = items.filter(([, v]) => v !== null).map(([key, value]) => ({ company_id: company.id, key, value: value!, updated_by: userId, updated_at: new Date().toISOString() }));
    const deletes = items.filter(([, v]) => v === null).map(([k]) => k);
    const r1 = upserts.length ? await supabase.from("company_data").upsert(upserts) : { error: null };
    const r2 = deletes.length ? await supabase.from("company_data").delete().eq("company_id", company.id).in("key", deletes) : { error: null };
    if (r1.error || r2.error) { setStatus("error"); toast.error("تعذّر الحفظ في السحابة"); } else setStatus("saved");
  }, [company.id, userId]);

  const loadFromCloud = async () => {
    setLoaded(false);
    Object.keys(localStorage).filter((k) => k.startsWith("alsadiq_") && k !== "alsadiq_active_company").forEach((k) => localStorage.removeItem(k));
    const { data, error } = await supabase.from("company_data").select("key, value").eq("company_id", company.id);
    if (error) toast.error("تعذّر تحميل البيانات");
    (data ?? []).forEach((r) => localStorage.setItem(r.key, r.value));
    setLoaded(true);
    setFrameKey((k) => k + 1);
  };

  useEffect(() => {
    window.__alsadiqSync = (k, v) => {
      if (!canWrite) return;
      pending.current.set(k, v);
      if (timer.current) clearTimeout(timer.current);
      setStatus("saving");
      timer.current = setTimeout(flush, 800);
    };
    const beforeUnload = () => { flush(); };
    window.addEventListener("beforeunload", beforeUnload);
    loadFromCloud();
    return () => { window.removeEventListener("beforeunload", beforeUnload); flush(); delete window.__alsadiqSync; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id, canWrite]);

  if (!usable) {
    return (
      <Center>
        <div className="max-w-md rounded-2xl bg-card p-8 text-center shadow-card">
          <Lock className="mx-auto mb-3 size-8 text-destructive" />
          <h2 className="mb-2 text-xl font-black">الاشتراك متوقف</h2>
          <p className="text-muted-foreground">اشتراك «{company.name}» منتهٍ أو موقوف. تواصل مع مزوّد النظام لتجديده.</p>
        </div>
      </Center>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b bg-card px-3 py-1.5 text-xs">
        <span className="font-bold">{company.name}</span>
        <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">{isAdmin && !company.role ? "مالك النظام" : roleLabels[company.role ?? ""]}</span>
        {!canWrite && <span className="flex items-center gap-1 text-muted-foreground"><Eye className="size-3.5" /> عرض فقط — التعديلات لن تُحفظ</span>}
        <span className="ms-auto flex items-center gap-1 text-muted-foreground">
          {status === "saving" ? <><CloudUpload className="size-3.5" /> جارٍ الحفظ…</> : status === "error" ? <span className="text-destructive">فشل الحفظ</span> : <><CloudCheck className="size-3.5 text-success" /> محفوظ</>}
        </span>
        <Button size="sm" variant="ghost" className="h-7" onClick={loadFromCloud}><RefreshCw className="size-3.5" /> تحديث</Button>
      </div>
      {loaded ? (
        <iframe key={frameKey} src="/app/alsadiq.html" title="برنامج الصادق" className="w-full flex-1 border-0" />
      ) : (
        <Center><Loader2 className="size-8 animate-spin text-primary" /></Center>
      )}
    </>
  );
}
