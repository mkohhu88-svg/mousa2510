const YEAR = new Date().getFullYear();

export function CopyrightText({ className = "" }: { className?: string }) {
  return (
    <span className={className} dir="rtl">
      © {YEAR} الصادق — جميع حقوق النشر والملكية محفوظة
    </span>
  );
}

export function CopyrightBar() {
  return (
    <div className="border-t border-navy-foreground/10 bg-navy-foreground/5 px-4 py-1 text-center">
      <CopyrightText className="text-[11px] font-semibold opacity-80" />
    </div>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-navy-foreground/10 bg-navy-foreground/5 py-5 text-center">
      <div className="mx-auto max-w-6xl px-5">
        <img src="/icon-512.png" alt="" width={32} height={32} className="mx-auto mb-2 rounded-lg" />
        <div className="text-lg font-black">الصادق</div>
        <p className="mt-1 text-xs opacity-70">نظام المحاسبة وإدارة المبيعات للشركات</p>
        <div className="mt-3">
          <CopyrightText className="text-xs opacity-80" />
        </div>
      </div>
    </footer>
  );
}
