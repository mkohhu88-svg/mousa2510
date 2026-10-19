import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordRecoveryRequest({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const { error: failure } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (failure && (failure.status === 429 || !failure.status || failure.status >= 500)) {
        setError("تعذّر معالجة الطلب الآن. انتظر قليلاً ثم حاول مجدداً.");
      } else setSent(true);
    } catch { setError("تعذّر الاتصال. تحقق من الإنترنت وحاول مجدداً."); }
    finally { setBusy(false); }
  };
  if (sent) return <div role="status" className="space-y-4"><Mail className="size-8 text-primary" /><p>إذا كان البريد مسجّلاً ويمكن إرسال الرسالة، فستصلك تعليمات إعادة تعيين كلمة المرور. تحقق من البريد غير المرغوب فيه أيضاً.</p><Button variant="outline" onClick={() => setSent(false)}>طلب رابط آخر</Button></div>;
  return <form onSubmit={submit} className="space-y-4">
    <div className="space-y-2"><Label htmlFor="recovery-email">البريد الإلكتروني</Label><Input id="recovery-email" type="email" autoComplete="email" dir="ltr" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button disabled={busy} type="submit" className="w-full">{busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}إرسال رابط الاستعادة</Button>
  </form>;
}