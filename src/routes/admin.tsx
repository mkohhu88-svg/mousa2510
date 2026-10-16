import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, CheckCircle2, Plus, XCircle } from "lucide-react";
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
      { title: "لوحة مالك النظام — الصادق" },
      { name: "description", content: "إدارة الشركات المشتركة واشتراكاتها." },
      { property: "og:title", content: "لوحة مالك النظام — الصادق" },
      { property: "og:description", content: "إدارة الشركات المشتركة واشتراكاتها." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { session, isAdmin, companies, ready, reload } = useWorkspace();
  const [name, setName] = useState("");
  const [expires, setExpires] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  if (ready && !isAdmin) {
    return (
      <div className="min-h-dvh"><AppHeader email={session?.user.email} />
        <div className="p-8 text-center">هذه الصفحة لمالك النظام فقط. <Link to="/app" className="text-primary underline">العودة</Link></div>
      </div>
    );
  }

  const create = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const { error } = await supabase.from("companies").insert({ name, expires_at: expires || null });
    if (error) { toast.error(error.message); return; }
    toast.success("تم إنشاء الشركة");
    setName(""); setExpires(""); reload();
  };
  const update = async (id: string, patch: { active?: boolean; expires_at?: string | null }) => {
    const { error } = await supabase.from("companies").update(patch).eq("id", id);
    if (error) toast.error(error.message); else reload();
  };

  const activeCount = companies.filter(companyUsable).length;

  return (
    <div className="min-h-dvh">
      <AppHeader isAdmin email={session?.user.email} />
      <main className="mx-auto max-w-5xl space-y-6 p-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="كل الشركات" value={companies.length} />
          <Stat label="اشتراك فعّال" value={activeCount} />
          <Stat label="متوقف / منتهٍ" value={companies.length - activeCount} />
        </div>

        <form onSubmit={create} className="flex flex-wrap items-end gap-3 rounded-2xl bg-card p-5 shadow-card">
          <div className="min-w-48 flex-1"><label className="mb-1 block text-sm font-bold">اسم الشركة الجديدة</label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><label className="mb-1 block text-sm font-bold">ينتهي الاشتراك في</label><Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></div>
          <Button type="submit" className="bg-gradient-gold"><Plus className="size-4" /> إنشاء شركة</Button>
        </form>

        <div className="space-y-3">
          {companies.map((c) => {
            const ok = companyUsable(c);
            return (
              <div key={c.id} className="rounded-2xl bg-card p-4 shadow-card">
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
                {open === c.id && <div className="mt-4"><TeamPanel company={c} canManage selfId={session!.user.id} /></div>}
              </div>
            );
          })}
        </div>
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
