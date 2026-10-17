import { useEffect, useRef, useState } from "react";
import { CloudCheck, CloudUpload, Eye, Loader2, Lock, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { companyUsable, type CompanyRow } from "@/lib/workspace";
import { roleLabels } from "@/lib/auth";
import { CloudQueue, isCompanyKey, pendingStorageKey, type CloudChange } from "@/lib/cloud-sync";
import { Button } from "@/components/ui/button";

type Bridge = { get: (key: string) => string | null; set: (key: string, value: string | null) => void; keys: () => string[] };
declare global { interface Window { __alsadiqCloud?: Bridge } }

export function CloudWorkspace({ company, isAdmin, userId }: { company: CompanyRow; isAdmin: boolean; userId: string }) {
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<"loading" | "saved" | "saving" | "error">("loading");
  const [frameKey, setFrameKey] = useState(0);
  const [frameReady, setFrameReady] = useState(false);
  const reload = useRef<(() => Promise<void>) | null>(null);
  const usable = isAdmin || companyUsable(company);
  const canWrite = usable && (isAdmin || company.role === "manager" || company.role === "accountant");

  useEffect(() => {
    if (!usable) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const values = new Map<string, string>();
    const storageKey = pendingStorageKey(userId, company.id);
    const queue = new CloudQueue(async (changes) => {
      const { error } = await supabase.rpc("sync_company_data", { _company: company.id, _changes: changes });
      if (error) throw error;
    }, (changes) => {
      if (changes.length) localStorage.setItem(storageKey, JSON.stringify(changes));
      else localStorage.removeItem(storageKey);
    });
    const flush = async () => {
      if (!canWrite || !queue.dirty) return true;
      if (active) setStatus("saving");
      try {
        await queue.flush();
        if (active) setStatus("saved");
        return true;
      } catch {
        if (active) setStatus("error");
        return false;
      }
    };
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (canWrite && Array.isArray(saved)) queue.restore(saved.filter((entry): entry is CloudChange =>
        entry && typeof entry.key === "string" && (entry.value === null || typeof entry.value === "string")));
    } catch { setStatus("error"); }

    const load = async () => {
      if (timer) clearTimeout(timer);
      if (!(await flush())) return;
      if (active) setStatus("loading");
      try {
        const rows: { key: string; value: string }[] = [];
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await supabase.from("company_data").select("key, value").eq("company_id", company.id).order("key").range(offset, offset + 499);
          if (error) throw error;
          rows.push(...data);
          if (data.length < 500) break;
        }
        if (!active) return;
        values.clear();
        for (const row of rows) if (isCompanyKey(row.key)) values.set(row.key, row.value);
        window.__alsadiqCloud = {
          get: (key) => values.get(key) ?? null,
          keys: () => [...values.keys()],
          set: (key, value) => {
            if (!active || !canWrite || !isCompanyKey(key) || (values.get(key) ?? null) === value) return;
            // Persist before accepting the edit, so a closed tab cannot discard it.
            queue.put(key, value);
            if (value === null) values.delete(key); else values.set(key, value);
            setStatus("saving");
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => { void flush(); }, 500);
          },
        };
        setLoaded(true);
        setFrameReady(false);
        setFrameKey((key) => key + 1);
        setStatus("saved");
      } catch { if (active) setStatus("error"); }
    };
    reload.current = load;
    const onOnline = () => { void (values.size || window.__alsadiqCloud ? flush() : load()); };
    const leave = (event: BeforeUnloadEvent) => {
      if (queue.dirty) { event.preventDefault(); event.returnValue = ""; void flush(); }
    };
    const interval = setInterval(() => { if (queue.dirty && navigator.onLine) void flush(); }, 10000);
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", leave);
    void load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", leave);
      delete window.__alsadiqCloud;
      reload.current = null;
      void flush();
    };
  }, [company.id, userId, canWrite, usable]);

  if (!usable) return <div className="flex flex-1 items-center justify-center p-6 text-center"><div><Lock className="mx-auto mb-3 size-8 text-destructive" /><h2 className="text-xl font-bold">الاشتراك متوقف</h2><p className="mt-2 text-muted-foreground">اشتراك «{company.name}» منتهٍ أو موقوف. تواصل مع مزوّد النظام لتجديده.</p></div></div>;
  return <>
    <div className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2 text-xs">
      <span className="font-bold">{company.name}</span>
      <span className="text-muted-foreground">{isAdmin && !company.role ? "مالك النظام" : roleLabels[company.role ?? ""]}</span>
      {!canWrite && <span className="flex items-center gap-1 text-muted-foreground"><Eye className="size-3.5" />عرض فقط</span>}
      <span role="status" className="ms-auto flex items-center gap-1">
        {status === "loading" ? <><Loader2 className="size-3.5 animate-spin" />تحميل البيانات…</> : status === "saving" ? <><CloudUpload className="size-3.5" />جارٍ الحفظ…</> : status === "error" ? <span className="text-destructive">تعذّر الاتصال — التعديلات بانتظار الحفظ</span> : <><CloudCheck className="size-3.5 text-success" />محفوظ في السحابة</>}
      </span>
      <Button size="sm" variant="ghost" disabled={status === "loading"} onClick={() => { void reload.current?.(); }}><RefreshCw className="size-3.5" />{status === "error" ? "إعادة المحاولة" : "تحديث"}</Button>
    </div>
    {!loaded ? <div className="flex flex-1 items-center justify-center p-6">{status === "error" ? <p className="text-destructive">تعذّر تحميل بيانات الشركة. اضغط إعادة المحاولة.</p> : <Loader2 className="size-8 animate-spin text-primary" />}</div> :
      <div className="relative flex min-h-0 flex-1">
        {!frameReady && <div className="absolute inset-0 flex items-center justify-center bg-background"><Loader2 className="size-8 animate-spin text-primary" /></div>}
        <iframe key={frameKey} src="/app/alsadiq.html" title="برنامج الصادق" className="h-full w-full border-0" onLoad={() => setFrameReady(true)} />
      </div>}
  </>;
}