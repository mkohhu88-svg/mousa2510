import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Shield, Users, LayoutGrid, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CopyrightBar } from "@/components/Copyright";


export const SUPPORT_TELEGRAM_URL = "https://t.me/K268888885";

export function AppHeader({ isAdmin, email }: { isAdmin?: boolean | undefined; email?: string | undefined }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };
  return (
    <header className="bg-gradient-navy text-navy-foreground">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <img src="/icon-512.png" alt="" width={36} height={36} className="rounded-lg" />
        <span className="text-lg font-black">الصادق</span>
        <nav className="ms-4 hidden gap-1 sm:flex">
          <Link to="/app" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-navy-foreground/10" activeProps={{ className: "bg-navy-foreground/15" }}>
            <LayoutGrid className="me-1 inline size-4" />البرنامج
          </Link>
          <Link to="/team" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-navy-foreground/10" activeProps={{ className: "bg-navy-foreground/15" }}>
            <Users className="me-1 inline size-4" />الفريق
          </Link>
          {isAdmin && (
            <Link to="/admin" className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-navy-foreground/10" activeProps={{ className: "bg-navy-foreground/15" }}>
              <Shield className="me-1 inline size-4" />لوحة المالك
            </Link>
          )}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <span className="hidden text-xs opacity-70 md:inline">{email}</span>
          <a
            href={SUPPORT_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-navy-foreground/10 px-3 py-1.5 text-sm font-semibold hover:bg-navy-foreground/20"
            title="تواصل مع الدعم عبر تلجرام"
          >
            <Send className="size-4" />الدعم
          </a>
          <Button size="sm" variant="secondary" onClick={signOut}><LogOut className="size-4" /> خروج</Button>
        </div>
      </div>
      <nav className="flex justify-around border-t border-navy-foreground/10 py-1 text-xs sm:hidden">
        <Link to="/app" className="px-3 py-1">البرنامج</Link>
        <Link to="/team" className="px-3 py-1">الفريق</Link>
        {isAdmin && <Link to="/admin" className="px-3 py-1">لوحة المالك</Link>}
        <a href={SUPPORT_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center px-3 py-1"><Send className="mb-0.5 size-4" />الدعم</a>
      </nav>
      <CopyrightBar />
    </header>

  );
}
