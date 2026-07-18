import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Receipt, History, LineChart, LogOut, X } from "lucide-react";
import logoUrl from "@/assets/aarika-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { Role } from "@/lib/types";
import { logout } from "@/lib/auth";
import { toast } from "sonner";

type Item = { title: string; url: string; icon: React.ElementType; ownerOnly?: boolean };

const items: Item[] = [
  { title: "Billing Panel", url: "/billing", icon: Receipt },
  { title: "Order History", url: "/orders", icon: History, ownerOnly: true },
  { title: "Analytics Dashboard", url: "/dashboard", icon: LineChart, ownerOnly: true },
];

export function AppSidebar({ role }: { role: Role }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const nav = useNavigate();
  const { setOpenMobile, isMobile } = useSidebar();

  const visible = items.filter((i) => (i.ownerOnly ? role === "owner" : true));

  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to log out?")) return;
    logout();
    toast.success("Signed out");
    nav({ to: "/" });
  };

return (
  <Sidebar collapsible="offcanvas" className="border-r-0">

    <SidebarHeader className="border-b border-sidebar-border/60 pb-4">
      <div className="flex items-center gap-3 px-2 pt-1">
        <div className="h-11 w-11 rounded-xl overflow-hidden ring-2 ring-gold/40 shrink-0">
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-serif text-lg text-gold leading-tight truncate">
            Aarika Looms
          </div>
        </div>

        {isMobile && (
          <button
            onClick={() => setOpenMobile(false)}
            className="p-1 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}

      </div>
    </SidebarHeader>


    <SidebarContent className="pt-4">
      <SidebarMenu className="px-2 gap-1">

        {visible.map((item) => {
          const active = path === item.url;

          return (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={active}
                className="h-11 data-[active=true]:bg-sidebar-accent data-[active=true]:text-gold data-[active=true]:border-l-2 data-[active=true]:border-gold rounded-md text-sidebar-foreground/85"
              >
                <Link
                  to={item.url}
                  onClick={() => isMobile && setOpenMobile(false)}
                >
                  <item.icon className="h-4 w-4" />

                  <span className="text-sm font-medium tracking-wide">
                    {item.title}
                  </span>

                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}


        {/* Logout below Analytics Dashboard */}
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={handleLogout}
            className="h-11 rounded-md text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-gold"
          >
            <LogOut className="h-4 w-4" />

            <span className="text-sm font-medium tracking-wide">
              Log Out
            </span>

          </SidebarMenuButton>
        </SidebarMenuItem>


      </SidebarMenu>
    </SidebarContent>



    {/* Bottom Version */}
    <SidebarFooter className="p-4">

      <div className="flex items-center gap-2 rounded-md bg-maroon px-3 py-1.5 text-maroon-foreground shrink-0">

        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-gold-foreground">
          U
        </span>

        <span className="text-sm font-medium tracking-wide whitespace-nowrap">
          V2.1.0 · PREMIUM POS
        </span>

      </div>

    </SidebarFooter>


  </Sidebar>
);
}