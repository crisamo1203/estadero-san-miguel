import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { productosQuery } from "@/lib/queries";
import { cop } from "@/lib/estadero";

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({ meta: [{ title: "Compras — Estadero San Miguel" }, { name: "description", content: "Entrada de mercancía." }] }),
  component: Compras,
});

type Item = { producto_id: string; tipo: "canasta" | "unidad"; cantidad: number; costo: number };

function Compras() {
  const { data: productos = [] } = useQuery(productosQuery);
  const qc = useQueryClient();
  const [proveedor, setProveedor] = useState("Bavaria");
  const [items, setItems] = useState<Item[]>([]);
  const [prod, setProd] = useState("");
  const [tipo, setTipo] = useState<Item["tipo"]>("canasta");
  const [cant, setCant] = useState("1");
  const [costo, setCosto] = useState("");
  const [busy, setBusy] = useState(false);

  const recientes = useQuery({
    queryKey: ["compras"],
    queryFn: async () => (await supabase.from("compras").select("*").order("created_at", { ascending: false }).limit(5)).data ?? [],
  });

  function agregar() {
    const n = Number(cant);
    if (!prod || !n) return toast.error("Elige producto y cantidad");
    setItems((x) => [...x, { producto_id: prod, tipo, cantidad: n, costo: Number(costo || 0) }]);
    setCant("1"); setCosto("");
  }
  async function guardar() {
    if (!items.length) return;
    setBusy(true);
    const { error } = await supabase.rpc("registrar_compra", { _proveedor: proveedor, _items: items });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Compra registrada, stock actualizado");
    setItems([]);
    qc.invalidateQueries();
  }
  const nombre = (id: string) => productos.find((p) => p.id === id)?.nombre ?? "";
  const total = items.reduce((s, i) => s + i.costo * i.cantidad, 0);
  const field = "h-14 w-full rounded-2xl border border-input bg-card px-4 text-lg outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-extrabold">Entrada de mercancía</h2>
      <input className={field} placeholder="Proveedor" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
      <div className="space-y-3 rounded-3xl bg-card p-4">
        <select className={field + " bg-background"} value={prod} onChange={(e) => setProd(e.target.value)}>
          <option value="">Producto...</option>
          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          {(["canasta", "unidad"] as const).map((t) => (
            <button key={t} onClick={() => setTipo(t)}
              className={`h-14 rounded-2xl text-lg font-bold ${tipo === t ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
              {t === "canasta" ? "Canastas" : "Unidades"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className={field + " bg-background"} inputMode="numeric" placeholder="Cantidad" value={cant} onChange={(e) => setCant(e.target.value.replace(/\D/g, ""))} />
          <input className={field + " bg-background"} inputMode="numeric" placeholder={`Costo c/${tipo === "canasta" ? "canasta" : "unidad"}`} value={costo} onChange={(e) => setCosto(e.target.value.replace(/\D/g, ""))} />
        </div>
        <button onClick={agregar} className="h-14 w-full rounded-2xl bg-secondary text-lg font-bold">+ Agregar</button>
      </div>
      {items.length > 0 && (
        <div className="rounded-3xl bg-card p-4">
          <ul className="space-y-2">
            {items.map((i, k) => (
              <li key={k} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">{i.cantidad} {i.tipo === "canasta" ? "canasta(s)" : "unid."} · {nombre(i.producto_id)}</span>
                <span className="flex shrink-0 items-center gap-2">{cop(i.costo * i.cantidad)}
                  <button aria-label="Quitar" onClick={() => setItems((x) => x.filter((_, j) => j !== k))}><Trash2 className="h-5 w-5 text-destructive" /></button>
                </span>
              </li>
            ))}
          </ul>
          <button disabled={busy} onClick={guardar} className="mt-4 flex h-16 w-full items-center justify-between rounded-2xl bg-primary px-5 text-xl font-extrabold text-primary-foreground disabled:opacity-60">
            <span>REGISTRAR</span><span>{cop(total)}</span>
          </button>
        </div>
      )}
      <div>
        <h3 className="mb-2 font-bold text-muted-foreground">Últimas compras</h3>
        <ul className="space-y-1 text-sm">
          {(recientes.data ?? []).map((c) => (
            <li key={c.id} className="flex justify-between rounded-xl bg-card px-3 py-2">
              <span>{c.proveedor} · {new Date(c.created_at).toLocaleDateString("es-CO")}</span><span>{cop(Number(c.total))}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
