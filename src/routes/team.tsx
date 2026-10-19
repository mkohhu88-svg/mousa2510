import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace, type CompanyRow } from "@/lib/workspace";
import { roleLabels } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/team")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "الفريق والصلاحيات — الصادق" },
      { name: "description", content: "إدارة موظفي الشركة وصلاحياتهم." },
      { property: "og:title", content: "الفريق والصلاحيات — الصادق" },
      { property: "og:description", content: "إدارة موظفي الشركة وصلاحياتهم." },
    ],
  }),
  component: TeamPage,
});

type Member = { id: string; user_id: string; role: "manager" | "accountant" | "worker"; email?: string | null | undefined; name?: string | null | undefined };

export function TeamPanel({ company, canManage, selfId }: { company: CompanyRow; canManage: boolean; selfId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Member["role"]>("worker");

  const load = async () => {
    const { data } = await supabase.from("company_members").select("id, user_id, role").eq("company_id", company.id);
    const ids = (data ?? []).map((m) => m.user_id);
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id, email, full_name").in("id", ids) : { data: [] };
    const pm = new Map((profs ?? []).map((p) => [p.id, p]));
    setMembers((data ?? []).map((m) => ({ ...m, email: pm.get(m.user_id)?.email, name: pm.get(m.user_id)?.full_name })));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [company.id]);

  const add = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const { data, error } = await supabase.rpc("add_member_by_email", { _company: company.id, _email: email, _role: role });
    if (error) { toast.error(error.message); return; }
    if (data === "not_found") { toast.error("هذا البريد غير مسجّل. اطلب من الموظف إنشاء حساب أولاً."); return; }
    toast.success("تمت الإضافة");
    setEmail("");
    load();
  };
  const changeRole = async (m: Member, r: Member["role"]) => {
    const { error } = await supabase.from("company_members").update({ role: r }).eq("id", m.id);
    if (error) toast.error(error.message); else load();
  };
  const remove = async (m: Member) => {
    if (!confirm("إزالة هذا العضو من الشركة؟")) return;
    const { error } = await supabase.from("company_members").delete().eq("id", m.id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <h3 className="mb-4 text-lg font-black">فريق «{company.name}»</h3>
      <div className="divide-y">
        {members.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="font-bold">{m.name || "—"}</div>
              <div className="truncate text-sm text-muted-foreground" dir="ltr">{m.email}</div>
            </div>
            {canManage && m.user_id !== selfId ? (
              <>
                <select value={m.role} onChange={(e) => changeRole(m, e.target.value as Member["role"])} className="rounded-md border bg-background px-2 py-1.5 text-sm">
                  {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <Button size="icon" variant="ghost" onClick={() => remove(m)}><Trash2 className="size-4 text-destructive" /></Button>
              </>
            ) : (
              <span className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">{roleLabels[m.role]}</span>
            )}
          </div>
        ))}
        {members.length === 0 && <p className="py-4 text-sm text-muted-foreground">لا يوجد أعضاء بعد.</p>}
      </div>
      {canManage && (
        <form onSubmit={add} className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          <Input type="email" dir="ltr" placeholder="بريد الموظف" value={email} onChange={(e) => setEmail(e.target.value)} required className="min-w-48 flex-1" />
          <select value={role} onChange={(e) => setRole(e.target.value as Member["role"])} className="rounded-md border bg-background px-2 text-sm">
            {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Button type="submit"><UserPlus className="size-4" /> إضافة</Button>
        </form>
      )}
    </div>
  );
}

function TeamPage() {
  const { session, isAdmin, companies, ready } = useWorkspace();
  const mine = companies.filter((c) => c.role || isAdmin);
  return (
    <div className="min-h-dvh">
      <AppHeader isAdmin={isAdmin} email={session?.user.email} />
      <main className="mx-auto max-w-3xl space-y-6 p-4">
        <div className="rounded-2xl bg-card p-5 text-sm shadow-card">
          <h2 className="mb-2 text-lg font-black">الصلاحيات</h2>
          <ul className="space-y-1 text-muted-foreground">
            <li><b className="text-foreground">مدير الشركة:</b> كل شيء + إدارة الموظفين.</li>
            <li><b className="text-foreground">محاسب:</b> الفواتير والحسابات والمخزون وحفظ التعديلات.</li>
            <li><b className="text-foreground">موظف ورشة:</b> عرض الشيتات والملصقات فقط دون حفظ تعديلات.</li>
          </ul>
        </div>
        {ready && session && mine.map((c) => (
          <TeamPanel key={c.id} company={c} canManage={isAdmin || c.role === "manager"} selfId={session.user.id} />
        ))}
      </main>
    </div>
  );
}
