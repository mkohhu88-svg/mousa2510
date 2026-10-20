import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Cloud, ShieldCheck, Smartphone, Building2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordRecoveryRequest } from "@/components/PasswordRecoveryRequest";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "الصادق — نظام المحاسبة وإدارة المبيعات للشركات" },
      { name: "description", content: "نظام سحابي للفواتير والمخزون والحسابات وشيتات الورشة، يعمل على الهاتف والكمبيوتر مع صلاحيات للمدير والموظفين." },
      { property: "og:title", content: "الصادق — نظام المحاسبة وإدارة المبيعات" },
      { property: "og:description", content: "فواتير، مخزون، حسابات وصلاحيات لكل شركة — على الهاتف والكمبيوتر." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Cloud, t: "بيانات سحابية", d: "كل بياناتك محفوظة ومتزامنة بين كل الأجهزة." },
  { icon: ShieldCheck, t: "صلاحيات", d: "مدير، محاسب، وموظف ورشة لكل شركة." },
  { icon: Smartphone, t: "هاتف وكمبيوتر", d: "ثبّته كتطبيق على أي جهاز." },
  { icon: Building2, t: "عدة شركات", d: "كل شركة بياناتها منفصلة تماماً." },
];

function Landing() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [recover, setRecover] = useState(false);

  useEffect(() => {
    if (session && !recover) navigate({ to: "/app" });
  }, [session, navigate, recover]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("بيانات الدخول غير صحيحة");
      else if (data.session) await navigate({ to: "/app", replace: true });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
      });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("تم إنشاء الحساب. افتح بريدك لتأكيد الحساب ثم سجّل الدخول.");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-gradient-navy text-navy-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-2 lg:items-center lg:py-20">
        <div>
          <img src="/icon-512.png" alt="شعار الصادق" width={72} height={72} className="mb-6 rounded-2xl" />
          <h1 className="text-4xl font-black leading-tight md:text-5xl">
            نظام <span className="bg-gradient-gold bg-clip-text text-transparent">الصادق</span><br />للمحاسبة وإدارة المبيعات
          </h1>
          <p className="mt-4 max-w-lg text-lg opacity-80">فواتير، قياسات، مخزون، حسابات زبائن وشيتات ورشة — لشركات الكوارتز والمرمر، على الهاتف والكمبيوتر.</p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {features.map((f) => (
              <div key={f.t} className="rounded-xl border border-navy-foreground/10 bg-navy-foreground/5 p-4">
                <f.icon className="mb-2 size-5 text-primary" />
                <div className="font-bold">{f.t}</div>
                <div className="text-sm opacity-70">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
        {recover ? <section className="rounded-lg bg-card p-6 text-card-foreground shadow-card md:p-8"><h2 className="mb-6 text-2xl font-black">استعادة كلمة المرور</h2><PasswordRecoveryRequest initialEmail={email} /><Button type="button" variant="ghost" className="mt-4 w-full" onClick={() => setRecover(false)}>العودة لتسجيل الدخول</Button></section> : <form onSubmit={submit} className="rounded-2xl bg-card p-6 text-card-foreground shadow-card md:p-8">
          <h2 className="mb-1 text-2xl font-black">{mode === "in" ? "تسجيل الدخول" : "إنشاء حساب"}</h2>
          <p className="mb-6 text-sm text-muted-foreground">{mode === "in" ? "ادخل إلى حساب شركتك" : "بعد التسجيل يضيفك مدير شركتك إلى الفريق"}</p>
          {mode === "up" && (
            <div className="mb-4 space-y-1.5"><Label>الاسم</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          )}
          <div className="mb-4 space-y-1.5"><Label>البريد الإلكتروني</Label><Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="mb-6 space-y-1.5"><Label>كلمة المرور</Label><Input type="password" dir="ltr" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button type="submit" disabled={busy} className="w-full bg-gradient-gold font-bold" size="lg">{mode === "in" ? "دخول" : "إنشاء الحساب"}</Button>
          {mode === "in" && <Button type="button" variant="link" className="mt-2 w-full" onClick={() => setRecover(true)}>نسيت كلمة المرور؟</Button>}
          <a href="https://t.me/K268888885" target="_blank" rel="noopener noreferrer" className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-navy-foreground/20 py-2 text-sm font-semibold hover:bg-navy-foreground/10"><Send className="size-4" />تواصل مع الدعم عبر تلجرام</a>
          <Button type="button" variant="ghost" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground">
            {mode === "in" ? "ليس لديك حساب؟ أنشئ حساباً" : "لديك حساب؟ سجّل الدخول"}
          </Button>
        </form>}
      </div>
    </div>
  );
}
