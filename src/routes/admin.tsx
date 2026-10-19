import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, CheckCircle2, Plus, XCircle, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace, companyUsable } from "@/lib/workspace";
import { AppHeader } from "@/components/AppHeader";
import { TeamPanel } from "./team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "لوحة مالك النظام — الصادق" },
      { name: "description", content: "إدارة الشركات المشتركة واشتراكاتها." },
      { property: "og:title", content: "لوحة مالك النظام — الصادق" },
      { property: "og:description", content: "إدارة الشركات المشتركة واشتراكاتها." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { session, isAdmin, companies, ready, reload, error } = useWorkspace();
  const [name, setName] = useState("");
  const [expires, setExpires] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  if (!ready) return <div className="min-h-dvh"><AppHeader email={session?.user.email} /><main className="flex justify-center p-10" role="status"><Loader2 className="size-8 animate-spin text-primary" /></main></div>;
  if (error) return <div className="min-h-dvh"><AppHeader email={session?.user.email} /><main className="space-y-4 p-8 text-center"><p role="alert">{error}</p><Button onClick={() => void reload()}>إعادة المحاولة</Button></main></div>;

  if (ready && !isAdmin) {
    return (
      <div className="min-h-dvh"><AppHeader email={session?.user.email} />
        <div className="p-8 text-center">هذه الصفحة لمالك النظام فقط. <Link to="/app" className="text-primary underline">العودة</Link></div>
      </div>
    );
  }

  const create = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!isAdmin || !name.trim() || busy) return;
    setBusy(true);
    const { error } = await supabase.from("companies").insert({ name, expires_at: expires || null });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم إنشاء الشركة");
    setName(""); setExpires(""); reload();
  };
  const update = async (id: string, patch: { active?: boolean; expires_at?: string | null }) => {
    const { error } = await supabase.from("companies").update(patch).eq("id", id);
    if (error) toast.error(error.message); else reload();
  };

  const activeCount = companies.filter(companyUsable).length;
  const filtered = companies.filter((company) => company.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) && (filter === "all" || (filter === "active" ? companyUsable(company) : !companyUsable(company)))).sort((a, b) => sort === "expiry" ? (a.expires_at ?? "9999").localeCompare(b.expires_at ?? "9999") : a.name.localeCompare(b.name, "ar"));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10);

  return (
    <div className="min-h-dvh">
      <AppHeader isAdmin email={session?.user.email} />
      <main className="mx-auto max-w-5xl space-y-6 p-4">
        <div><h1 className="text-2xl font-black">إدارة الشركات</h1><p className="mt-1 text-sm text-muted-foreground">الشركات والاشتراكات والفرق</p></div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="كل الشركات" value={companies.length} />
          <Stat label="اشتراك فعّال" value={activeCount} />
          <Stat label="متوقف / منتهٍ" value={companies.length - activeCount} />
        </div>

        <form onSubmit={create} className="flex flex-wrap items-end gap-3 border-y py-5">
          <div className="min-w-48 flex-1"><label className="mb-1 block text-sm font-bold">اسم الشركة الجديدة</label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><label className="mb-1 block text-sm font-bold">ينتهي الاشتراك في</label><Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></div>
          <Button type="submit" disabled={busy} className="bg-gradient-gold">{busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} إنشاء شركة</Button>
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-48 flex-1"><Search className="pointer-events-none absolute start-3 top-3 size-4 text-muted-foreground" /><Input aria-label="البحث عن شركة" placeholder="البحث عن شركة…" className="ps-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
          <select aria-label="حالة الشركة" className="rounded-md border bg-background px-3 py-2 text-sm" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}><option value="all">كل الحالات</option><option value="active">فعّالة</option><option value="inactive">متوقفة / منتهية</option></select>
          <select aria-label="ترتيب الشركات" className="rounded-md border bg-background px-3 py-2 text-sm" value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">حسب الاسم</option><option value="expiry">حسب انتهاء الاشتراك</option></select>
        </div>
        <div className="space-y-3">
          {visible.map((c) => {
            const ok = companyUsable(c);
            return (
              <div key={c.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Building2 className="size-5 text-primary" />
                  <div className="flex-1 font-black">{c.name}</div>
                  <span className={`flex items-center gap-1 text-sm ${ok ? "text-success" : "text-destructive"}`}>
                    {ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}{ok ? "فعّال" : "متوقف"}
                  </span>
                  <Input type="date" className="w-40" value={c.expires_at ?? ""} onChange={(e) => update(c.id, { expires_at: e.target.value || null })} />
                  <Button size="sm" variant={c.active ? "outline" : "default"} onClick={() => update(c.id, { active: !c.active })}>{c.active ? "إيقاف" : "تفعيل"}</Button>
                  <Button size="sm" variant="secondary" onClick={() => setOpen(open === c.id ? null : c.id)}>الفريق</Button>
                </div>
                {open === c.id && session && <div className="mt-4"><TeamPanel company={c} canManage selfId={session.user.id} /></div>}
              </div>
            );
          })}
          {!filtered.length && <p role="status" className="py-10 text-center text-muted-foreground">لا توجد شركات مطابقة.</p>}
        </div>
        <div className="flex items-center justify-between border-t pt-4"><span className="text-sm text-muted-foreground">{filtered.length} شركة · صفحة {currentPage} من {pageCount}</span><div className="flex gap-2"><Button size="icon" variant="outline" aria-label="الصفحة السابقة" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronRight className="size-4" /></Button><Button size="icon" variant="outline" aria-label="الصفحة التالية" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}><ChevronLeft className="size-4" /></Button></div></div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-gradient-navy p-4 text-navy-foreground shadow-card">
      <div className="text-3xl font-black">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}
