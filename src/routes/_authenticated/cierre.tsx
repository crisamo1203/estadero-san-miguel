import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cop, metodos } from "@/lib/estadero";

export const Route = createFileRoute("/_authenticated/cierre")({
  head: () => ({ meta: [{ title: "Cierre de caja — Estadero San Miguel" }, { name: "description", content: "Arqueo diario." }] }),
  component: Cierre,
});

const hoy = () => new Date().toLocaleDateString("en-CA");

function Cierre() {
  const [dia, setDia] = useState(hoy());
  const { data, isLoading } = useQuery({
    queryKey: ["cierre", dia],
    queryFn: async () => {
      const ini = new Date(`${dia}T00:00:00`);
      const fin = new Date(ini.getTime() + 86400000);
      const { data: ventas, error } = await supabase
        .from("ventas")
        .select("id,total,metodo_pago,ventas_detalle(unidades_totales,subtotal,productos(nombre))")
        .gte("created_at", ini.toISOString()).lt("created_at", fin.toISOString());
      if (error) throw error;
      const porMetodo: Record<string, number> = {};
      const porMarca: Record<string, { u: number; v: number }> = {};
      for (const v of ventas ?? []) {
        porMetodo[v.metodo_pago] = (porMetodo[v.metodo_pago] ?? 0) + Number(v.total);
        for (const d of v.ventas_detalle ?? []) {
          const n = (d.productos as { nombre: string } | null)?.nombre ?? "?";
          porMarca[n] ??= { u: 0, v: 0 };
          porMarca[n].u += d.unidades_totales;
          porMarca[n].v += Number(d.subtotal);
        }
      }
      return { n: ventas?.length ?? 0, porMetodo, porMarca };
    },
  });
  const total = Object.values(data?.porMetodo ?? {}).reduce((a, b) => a + b, 0);
  const efectivo = data?.porMetodo.efectivo ?? 0;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-extrabold">Cierre de caja</h2>
        <input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className="h-11 rounded-xl border border-input bg-card px-2" />
      </div>
      {isLoading ? <p className="text-muted-foreground">Cargando...</p> : (
        <>
          <div className="rounded-3xl bg-primary p-5 text-primary-foreground">
            <p className="text-sm font-medium opacity-80">Total del día · {data?.n} ventas</p>
            <p className="text-4xl font-extrabold">{cop(total)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-card p-4">
              <p className="text-sm text-muted-foreground">Efectivo en caja</p>
              <p className="text-2xl font-extrabold text-success">{cop(efectivo)}</p>
            </div>
            <div className="rounded-3xl bg-card p-4">
              <p className="text-sm text-muted-foreground">Digital / Tarjeta</p>
              <p className="text-2xl font-extrabold">{cop(total - efectivo)}</p>
            </div>
          </div>
          <div className="rounded-3xl bg-card p-4">
            <h3 className="mb-2 font-bold">Por método</h3>
            {metodos.map((m) => (
              <div key={m.id} className="flex justify-between py-1"><span>{m.label}</span><span className="font-bold">{cop(data?.porMetodo[m.id] ?? 0)}</span></div>
            ))}
          </div>
          <div className="rounded-3xl bg-card p-4">
            <h3 className="mb-2 font-bold">Botellas vendidas por marca</h3>
            {Object.keys(data?.porMarca ?? {}).length === 0 && <p className="text-sm text-muted-foreground">Sin ventas.</p>}
            {Object.entries(data?.porMarca ?? {}).map(([n, x]) => (
              <div key={n} className="flex justify-between py-1"><span>{n}</span><span><b>{x.u}</b> bot. · {cop(x.v)}</span></div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
