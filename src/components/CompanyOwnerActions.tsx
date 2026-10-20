import { useState } from "react";
import { MessageSquare, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { CompanyRow } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";

export function CompanyOwnerActions({ company, onChanged }: { company: CompanyRow; onChanged: () => Promise<void> }) {
  const [action, setAction] = useState<"archive" | "suspend" | "message" | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const open = (next: "archive" | "suspend" | "message") => { setMessage(company.suspension_message ?? ""); setAction(next); };
  const save = async (next: "archive" | "suspend" | "activate" | "message") => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("manage_company_subscription", { _company: company.id, _action: next, _message: message });
      if (error) throw error;
      setAction(null);
      toast.success(next === "archive" ? "تم حذف الشركة من القائمة مع حفظ بياناتها" : next === "activate" ? "تم تفعيل الاشتراك" : "تم حفظ رسالة إيقاف الاشتراك");
      await onChanged();
    } catch { toast.error("تعذّر تنفيذ العملية. تحقق من الصلاحية والاتصال وحاول مجدداً."); }
    finally { setBusy(false); }
  };
  return <>
    <Button size="sm" disabled={busy} variant={company.active ? "outline" : "default"} onClick={() => company.active ? open("suspend") : void save("activate")}>{company.active ? "إيقاف" : "تفعيل"}</Button>
    <Button size="icon" variant="outline" disabled={busy} title="رسالة إيقاف الاشتراك" aria-label={`رسالة إيقاف اشتراك ${company.name}`} onClick={() => open("message")}><MessageSquare className="size-4" /></Button>
    <Button size="icon" variant="destructive" disabled={busy} title="حذف الشركة" aria-label={`حذف شركة ${company.name}`} onClick={() => open("archive")}><Trash2 className="size-4" /></Button>
    <AlertDialog open={action !== null} onOpenChange={(value) => { if (!value && !busy) setAction(null); }}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg" dir="rtl">
        <AlertDialogTitle>{action === "archive" ? `حذف شركة «${company.name}»؟` : action === "suspend" ? `إيقاف اشتراك «${company.name}»` : `رسالة اشتراك «${company.name}»`}</AlertDialogTitle>
        <AlertDialogDescription>{action === "archive" ? "ستختفي الشركة من القائمة ويتوقف الوصول إليها. ستبقى بياناتها وفواتيرها محفوظة ولن تُحذف نهائياً." : "تظهر هذه الرسالة لأعضاء الشركة عند فتح البرنامج والاشتراك موقوف أو منتهٍ."}</AlertDialogDescription>
        {action !== "archive" && <div className="space-y-2"><label htmlFor={`message-${company.id}`} className="text-sm font-bold">رسالتك للشركة</label><Textarea id={`message-${company.id}`} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={4} /></div>}
        <AlertDialogFooter className="gap-2"><AlertDialogCancel disabled={busy}>إلغاء</AlertDialogCancel><Button disabled={busy} variant={action === "archive" ? "destructive" : "default"} onClick={() => { if (action) void save(action); }}>{busy && <Loader2 className="size-4 animate-spin" />}{action === "archive" ? "تأكيد الحذف" : action === "suspend" ? "إيقاف وإرسال الرسالة" : "حفظ الرسالة"}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}