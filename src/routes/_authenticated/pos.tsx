import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Minus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { productosQuery } from "@/lib/queries";
import { brandClass, cop, metodos, type Producto } from "@/lib/estadero";

export const Route = createFileRoute("/_authenticated/pos")({
  head: () => ({ meta: [{ title: "POS — Estadero San Miguel" }, { name: "description", content: "Registrar ventas." }] }),
  component: Pos,
});

type Linea = { producto: Producto; tipo: "unidad" | "canasta"; cantidad: number };

function Pos() {
  const { data: productos = [], isLoading } = useQuery(productosQuery);
  const qc = useQueryClient();
  const [carrito, setCarrito] = useState<Linea[]>([]);
  const [cobrando, setCobrando] = useState(false);

  const add = (p: Producto, tipo: Linea["tipo"]) =>
    setCarrito((c) => {
      const i = c.findIndex((l) => l.producto.id === p.id && l.tipo === tipo);
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, cantidad: l.cantidad + 1 } : l));
      return [...c, { producto: p, tipo, cantidad: 1 }];
    });
  const quitar = (i: number) =>
    setCarrito((c) => c.flatMap((l, j) => (j !== i ? [l] : l.cantidad > 1 ? [{ ...l, cantidad: l.cantidad - 1 }] : [])));

  const precio = (l: Linea) => (l.tipo === "canasta" ? l.producto.precio_canasta : l.producto.precio_unidad);
  const total = useMemo(() => carrito.reduce((s, l) => s + precio(l) * l.cantidad, 0), [carrito]);

  return (
    <div className="p-4">
      {isLoading && <p className="text-muted-foreground">Cargando...</p>}
      <div className="grid grid-cols-1 gap-3">
        {productos.filter((p) => p.activo).map((p) => (
          <div key={p.id} className={`rounded-3xl p-4 ${brandClass[p.marca_color] ?? brandClass.neutral}`}>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="truncate text-2xl font-extrabold">{p.nombre}</h2>
              <span className="shrink-0 text-sm font-medium opacity-80">Stock {p.stock_unidades}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => add(p, "unidad")} className="rounded-2xl bg-background/20 py-4 font-bold active:scale-95">
                +1 Botella<span className="block text-sm font-medium opacity-80">{cop(p.precio_unidad)}</span>
              </button>
              <button onClick={() => add(p, "canasta")} className="rounded-2xl bg-background/30 py-4 font-bold active:scale-95">
                +1 Canasta<span className="block text-sm font-medium opacity-80">{cop(p.precio_canasta)}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {carrito.length > 0 && (
        <div className="fixed inset-x-0 bottom-[68px] z-20 px-3">
          <div className="mx-auto max-w-lg rounded-3xl border bg-card p-3 shadow-2xl">
            <ul className="max-h-36 space-y-1 overflow-y-auto">
              {carrito.map((l, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{l.cantidad}× {l.producto.nombre} ({l.tipo === "canasta" ? "canasta" : "botella"})</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {cop(precio(l) * l.cantidad)}
                    <button onClick={() => quitar(i)} aria-label="Quitar" className="grid h-8 w-8 place-items-center rounded-full bg-secondary"><Minus className="h-4 w-4" /></button>
                  </span>
                </li>
              ))}
            </ul>
            <button onClick={() => setCobrando(true)} className="mt-3 flex h-16 w-full items-center justify-between rounded-2xl bg-primary px-5 text-xl font-extrabold text-primary-foreground active:scale-[0.98]">
              <span>COBRAR</span><span>{cop(total)}</span>
            </button>
          </div>
        </div>
      )}

      {cobrando && (
        <Cobro total={total} onClose={() => setCobrando(false)} onConfirm={async (metodo, recibido) => {
          const { error } = await supabase.rpc("registrar_venta", {
            _items: carrito.map((l) => ({ producto_id: l.producto.id, tipo: l.tipo, cantidad: l.cantidad })),
            _metodo: metodo, _recibido: recibido as number,
          });
          if (error) return toast.error("No se pudo registrar: " + error.message);
          toast.success("Venta registrada");
          setCarrito([]); setCobrando(false);
          qc.invalidateQueries();
        }} />
      )}
    </div>
  );
}

function Cobro({ total, onClose, onConfirm }: { total: number; onClose: () => void; onConfirm: (m: string, r: number | null) => Promise<void> }) {
  const [metodo, setMetodo] = useState<string>("efectivo");
  const [recibido, setRecibido] = useState("");
  const [busy, setBusy] = useState(false);
  const rec = Number(recibido || 0);
  const cambio = rec - total;
  const rapidos = [total, Math.ceil(total / 10000) * 10000, Math.ceil(total / 50000) * 50000, 100000].filter((v, i, a) => v >= total && a.indexOf(v) === i);
  const valido = metodo !== "efectivo" || rec >= total;

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="pb-safe mx-auto w-full max-w-lg rounded-t-3xl bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">Cobrar {cop(total)}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-full bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {metodos.map((m) => (
            <button key={m.id} onClick={() => setMetodo(m.id)}
              className={`h-14 rounded-2xl text-lg font-bold ${metodo === m.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
              {m.label}
            </button>
          ))}
        </div>
        {metodo === "efectivo" && (
          <div className="mt-4">
            <input inputMode="numeric" placeholder="Recibido" value={recibido}
              onChange={(e) => setRecibido(e.target.value.replace(/\D/g, ""))}
              className="h-14 w-full rounded-2xl border border-input bg-background px-4 text-2xl font-bold outline-none focus:ring-2 focus:ring-ring" />
            <div className="mt-2 flex flex-wrap gap-2">
              {rapidos.map((v) => (
                <button key={v} onClick={() => setRecibido(String(v))} className="rounded-full bg-secondary px-3 py-2 text-sm font-medium">{cop(v)}</button>
              ))}
            </div>
            <p className={`mt-3 text-xl font-bold ${cambio >= 0 ? "text-success" : "text-destructive"}`}>
              {cambio >= 0 ? `Devuelta: ${cop(cambio)}` : `Faltan ${cop(-cambio)}`}
            </p>
          </div>
        )}
        <button disabled={!valido || busy}
          onClick={async () => { setBusy(true); await onConfirm(metodo, metodo === "efectivo" ? rec : null); setBusy(false); }}
          className="mt-5 h-16 w-full rounded-2xl bg-primary text-xl font-extrabold text-primary-foreground disabled:opacity-50">
          {busy ? "Registrando..." : "CONFIRMAR VENTA"}
        </button>
      </div>
    </div>
  );
}
