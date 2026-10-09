import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/personal")({
  beforeLoad: ({ context }) => {
    if (!context.isAdmin) throw redirect({ to: "/pos" });
  },
  head: () => ({ meta: [{ title: "Personal — Estadero San Miguel" }, { name: "description", content: "Aprobar usuarios del personal." }] }),
  component: Personal,
});

function Personal() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["personal"],
    queryFn: async () => {
      const [{ data: perfiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      return (perfiles ?? []).map((p) => ({
        ...p,
        staff: (roles ?? []).some((r) => r.user_id === p.id && r.role === "staff"),
        admin: (roles ?? []).some((r) => r.user_id === p.id && r.role === "admin"),
      }));
    },
  });

  async function cambiar(id: string, aprobado: boolean) {
    const { error } = await supabase.rpc("set_staff", { _user_id: id, _aprobado: aprobado });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["personal"] });
  }

  return (
    <div className="space-y-3 p-4">
      <h2 className="text-2xl font-extrabold">Personal</h2>
      <ul className="space-y-2">
        {data.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3">
            <div className="min-w-0">
              <p className="truncate font-bold">{p.usuario}{p.admin ? " · admin" : ""}</p>
              <p className={`text-sm ${p.staff ? "text-success" : "text-warning"}`}>{p.staff ? "Aprobado" : "Pendiente"}</p>
            </div>
            {p.id !== user.id && (
              <button onClick={() => cambiar(p.id, !p.staff)}
                className={`h-11 shrink-0 rounded-full px-4 font-bold ${p.staff ? "bg-secondary" : "bg-primary text-primary-foreground"}`}>
                {p.staff ? "Quitar acceso" : "Aprobar"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
