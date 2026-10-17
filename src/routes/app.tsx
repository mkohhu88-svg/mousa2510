import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { CloudWorkspace } from "@/components/CloudWorkspace";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "البرنامج — الصادق" },
      { name: "description", content: "برنامج الصادق للفواتير والمخزون والحسابات." },
      { property: "og:title", content: "البرنامج — الصادق" },
      { property: "og:description", content: "برنامج الصادق للفواتير والمخزون والحسابات." },
    ],
  }),
  component: AppPage,
});

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
          {company && session && <CloudWorkspace key={company.id} company={company} isAdmin={isAdmin} userId={session.user.id} />}
        </>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-4">{children}</div>;
}

