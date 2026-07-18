export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex items-center justify-between gap-4 border-t border-border bg-card px-3 py-2 text-[11px] text-muted-foreground">
      

      <div className="hidden sm:block text-center">
        © {year} All rights reserved. Aarika Looms.
      </div>

      <div className="shrink-0 whitespace-nowrap">
        Powered by <span className="text-primary font-semibold">Cenexa Systems</span> ©{year}
      </div>
    </footer>
  );
}
