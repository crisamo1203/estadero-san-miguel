import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { productosQuery } from "@/lib/queries";
import { brandClass, cop, stockTexto, type Producto } from "@/lib/estadero";

export const Route = createFileRoute("/_authenticated/inventario")({
  head: () => ({ meta: [{ title: "Inventario — Estadero San Miguel" }, { name: "description", content: "Stock de productos." }] }),
  component: Inventario,
});

function Inventario() {
  const { data: productos = [] } = useQuery(productosQuery);
  const [edit, setEdit] = useState<Partial<Producto> | null>(null);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-2xl font-extrabold">Inventario</h2>
        <button onClick={() => setEdit({ marca_color: "neutral", unidades_por_canasta: 30, activo: true })}
          className="flex h-11 items-center gap-1 rounded-full bg-primary px-4 font-bold text-primary-foreground">
          <Plus className="h-5 w-5" /> Nuevo
        </button>
      </div>
      <ul className="space-y-2">
        {productos.map((p) => {
          const bajo = p.stock_unidades < 30;
          return (
            <li key={p.id}>
              <button onClick={() => setEdit(p)} className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left">
                <span className={`h-12 w-2 shrink-0 rounded-full ${brandClass[p.marca_color] ?? brandClass["neutral"]}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold">{p.nombre}</span>
                    {!p.activo && <span className="text-xs text-muted-foreground">(inactivo)</span>}
                  </div>
                  <p className={`text-sm ${bajo ? "text-warning" : "text-muted-foreground"}`}>
                    {stockTexto(p.stock_unidades, p.unidades_por_canasta)}
                  </p>
                  <p className="text-xs text-muted-foreground">{cop(p.precio_unidad)} / {cop(p.precio_canasta)} canasta</p>
                </div>
                {bajo && <AlertTriangle className="h-6 w-6 shrink-0 text-warning" aria-label="Stock bajo" />}
              </button>
            </li>
          );
        })}
      </ul>
      {edit && <Editor p={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function Editor({ p, onClose }: { p: Partial<Producto>; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState(p);
  const set = (k: keyof Producto, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const num = (k: keyof Producto) => (
    <input inputMode="numeric" value={String(f[k] ?? "")} onChange={(e) => set(k, Number(e.target.value.replace(/\D/g, "")))}
      className="h-12 w-full rounded-xl border border-input bg-background px-3 text-lg" />
  );
  async function guardar() {
    if (!f.nombre?.trim()) { toast.error("Falta el nombre"); return; }
    const row = {
      nombre: f.nombre.trim(), marca_color: f.marca_color ?? "neutral",
      precio_unidad: f.precio_unidad ?? 0, precio_canasta: f.precio_canasta ?? 0, costo_unidad: f.costo_unidad ?? 0,
      unidades_por_canasta: f.unidades_por_canasta || 30, stock_unidades: f.stock_unidades ?? 0, activo: f.activo ?? true,
    };
    const { error } = f.id ? await supabase.from("productos").update(row).eq("id", f.id) : await supabase.from("productos").insert(row);
    if (error) { toast.error(error.message); return; }
    toast.success("Guardado");
    qc.invalidateQueries({ queryKey: ["productos"] });
    onClose();
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="pb-safe mx-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">{f.id ? "Editar" : "Nuevo"} producto</h2>
          <button onClick={onClose} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-full bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <label className="block">Nombre<input value={f.nombre ?? ""} onChange={(e) => set("nombre", e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3 text-lg" /></label>
          <div>Color
            <div className="mt-1 grid grid-cols-4 gap-2">
              {Object.keys(brandClass).map((c) => (
                <button key={c} onClick={() => set("marca_color", c)}
                  className={`h-11 rounded-xl text-xs font-bold capitalize ${brandClass[c]} ${f.marca_color === c ? "ring-2 ring-ring ring-offset-2 ring-offset-card" : ""}`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label>Precio botella{num("precio_unidad")}</label>
            <label>Precio canasta{num("precio_canasta")}</label>
            <label>Costo botella{num("costo_unidad")}</label>
            <label>Unid. por canasta{num("unidades_por_canasta")}</label>
          </div>
          {!f.id && <label className="block">Stock inicial (unidades){num("stock_unidades")}</label>}
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.activo ?? true} onChange={(e) => set("activo", e.target.checked)} className="h-5 w-5" /> Activo en POS</label>
        </div>
        <button onClick={guardar} className="mt-5 h-14 w-full rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground">GUARDAR</button>
      </div>
    </div>
  );
}
