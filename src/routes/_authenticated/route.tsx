import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, Package, PackagePlus, BarChart3, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

const tabs = [
  { to: "/pos", label: "POS", icon: ShoppingCart },
  { to: "/inventario", label: "Inventario", icon: Package },
  { to: "/compras", label: "Compras", icon: PackagePlus },
  { to: "/cierre", label: "Cierre", icon: BarChart3 },
] as const;

function Layout() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const nav = useNavigate();
  async function salir() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }
  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-extrabold">Estadero San Miguel</h1>
          <p className="truncate text-xs text-muted-foreground">{user.email?.replace("@estadero.local", "")}</p>
        </div>
        <button onClick={salir} aria-label="Cerrar sesión" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary">
          <LogOut className="h-5 w-5" />
        </button>
      </header>
      <Outlet />
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-card">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {tabs.map((t) => (
            <Link key={t.to} to={t.to}
              className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-muted-foreground"
              activeProps={{ className: "text-primary" }}>
              <t.icon className="h-6 w-6" />
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
