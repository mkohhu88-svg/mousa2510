import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { initialRecoveryLink, recoveryLinkState } from "@/lib/password-recovery";
import { supabase } from "@/integrations/supabase/client";
import { PasswordRecoveryRequest } from "@/components/PasswordRecoveryRequest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "تعيين كلمة مرور جديدة — الصادق" },
    { name: "description", content: "استعادة آمنة لحسابك في نظام الصادق باستخدام رابط البريد الإلكتروني." },
    { property: "og:title", content: "استعادة حساب الصادق" },
    { property: "og:description", content: "تعيين كلمة مرور جديدة لحساب الصادق." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [state, setState] = useState<"checking" | "invalid" | "ready" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const validate = async () => {
      try {
        const { data, error: failure } = await supabase.auth.getUser();
        if (active) setState(data.user && !failure ? "ready" : "invalid");
      } catch { if (active) setState("invalid"); }
    };
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setTimeout(() => { if (active) void validate(); }, 0);
    });
    const link = recoveryLinkState(window.location.hash, window.location.search);
    if (link === "invalid" || initialRecoveryLink === "invalid") setState("invalid");
    else if (link === "recovery" || initialRecoveryLink === "recovery") void validate();
    else setState("invalid");
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    if (password !== confirmation) { setError("كلمتا المرور غير متطابقتين."); return; }
    if (state !== "ready") return;
    setBusy(true);
    try {
      const { error: failure } = await supabase.auth.updateUser({ password });
      if (failure) {
        if (failure.status === 401 || failure.status === 403) setState("invalid");
        else setError("تعذّر تعيين كلمة المرور. تحقق من متطلبات كلمة المرور أو اطلب رابطاً جديداً.");
      } else {
        await supabase.auth.signOut();
        setState("done");
      }
    } catch { setError("تعذّر الاتصال. حاول مجدداً."); }
    finally { setBusy(false); }
  };
  return <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
    <section className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-card">
      <div className="flex items-center gap-3"><img src="/icon-512.png" width={48} height={48} alt="الصادق" className="rounded-lg" /><h1 className="text-xl font-bold">تعيين كلمة مرور جديدة</h1></div>
      {state === "checking" ? <div role="status" className="flex items-center gap-2"><Loader2 className="size-5 animate-spin" />التحقق من الرابط…</div> : state === "invalid" ? <><p role="alert" className="text-destructive">رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.</p><PasswordRecoveryRequest /></> : state === "done" ? <p role="status">تم تحديث كلمة المرور. يمكنك تسجيل الدخول بكلمة المرور الجديدة.</p> : <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="new-password">كلمة المرور الجديدة</Label><Input id="new-password" type="password" autoComplete="new-password" dir="ltr" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="confirm-password">تأكيد كلمة المرور</Label><Input id="confirm-password" type="password" autoComplete="new-password" dir="ltr" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" type="submit" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}حفظ كلمة المرور</Button>
      </form>}
      <Button asChild variant="ghost" className="w-full"><Link to="/">العودة لتسجيل الدخول</Link></Button>
    </section>
  </main>;
}