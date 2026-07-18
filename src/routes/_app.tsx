import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppFooter } from "@/components/app-footer";
import { useSession } from "@/lib/auth";
import { useHydrated } from "@/lib/store";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const hydrated = useHydrated();
  const session = useSession();
  const nav = useNavigate();

  useEffect(() => {
    if (hydrated && !session) {
      nav({ to: "/" });
    }
  }, [hydrated, session, nav]);

  if (!hydrated || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar role={session.role} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border bg-card/60 backdrop-blur-sm px-4 md:px-6 sticky top-0 z-30">
            <SidebarTrigger className="text-foreground" />
            <div className="font-serif text-lg text-primary">
              Aarika Looms
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden">
            <Outlet />
          </main>

          <AppFooter />
        </div>
      </div>
    </SidebarProvider>
  );
}