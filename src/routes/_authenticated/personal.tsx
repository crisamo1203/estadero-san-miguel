import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { crearUsuario, editarUsuario, listarUsuarios } from "@/lib/usuarios.functions";

export const Route = createFileRoute("/_authenticated/personal")({
  beforeLoad: ({ context }) => {
    if (!context.isAdmin) throw redirect({ to: "/pos" });
  },
  head: () => ({ meta: [{ title: "Usuarios — Estadero San Miguel" }, { name: "description", content: "Gestión de usuarios del personal." }] }),
  component: Personal,
});

type U = { id?: string; usuario: string; nombre: string; rol: "admin" | "staff"; activo: boolean };

function Personal() {
  const listar = useServerFn(listarUsuarios);
  const { data = [], isLoading } = useQuery({ queryKey: ["usuarios"], queryFn: () => listar() });
  const [edit, setEdit] = useState<U | null>(null);

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold">Usuarios</h2>
        <button onClick={() => setEdit({ usuario: "", nombre: "", rol: "staff", activo: true })}
          className="flex h-11 items-center gap-1 rounded-full bg-primary px-4 font-bold text-primary-foreground">
          <Plus className="h-5 w-5" /> Nuevo
        </button>
      </div>
      {isLoading && <p className="text-muted-foreground">Cargando...</p>}
      <ul className="space-y-2">
        {data.map((u) => (
          <li key={u.id}>
            <button onClick={() => setEdit(u)} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-card p-3 text-left">
              <div className="min-w-0">
                <p className="truncate font-bold">{u.nombre || u.usuario}</p>
                <p className="truncate text-sm text-muted-foreground">@{u.usuario} · {u.rol === "admin" ? "Administrador" : "Empleado"}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${u.activo ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                {u.activo ? "Activo" : "Inactivo"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {edit && <Editor u={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function Editor({ u, onClose }: { u: U; onClose: () => void }) {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const crear = useServerFn(crearUsuario);
  const editar = useServerFn(editarUsuario);
  const [f, setF] = useState(u);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const nuevo = !u.id;
  const propio = u.id === user.id;
  const field = "mt-1 h-12 w-full rounded-xl border border-input bg-background px-3 text-lg";

  async function guardar() {
    if (!f.nombre.trim()) { toast.error("Falta el nombre"); return; }
    if ((nuevo || pin) && !/^\d{6}$/.test(pin)) { toast.error("El PIN debe tener 6 dígitos"); return; }
    setBusy(true);
    try {
      if (nuevo) await crear({ data: { nombre: f.nombre, usuario: f.usuario.trim().toLowerCase(), pin, rol: f.rol } });
      else await editar({ data: { id: u.id!, nombre: f.nombre, rol: f.rol, activo: f.activo, pin: pin || undefined } });
      toast.success("Guardado");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const opt = (on: boolean) => `h-12 rounded-xl font-bold ${on ? "bg-primary text-primary-foreground" : "bg-secondary"}`;

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="pb-safe mx-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">{nuevo ? "Nuevo usuario" : "Editar usuario"}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-full bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <label className="block">Nombre<input className={field} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></label>
          {nuevo ? (
            <label className="block">Usuario (para ingresar)<input className={field} autoCapitalize="none" value={f.usuario} onChange={(e) => setF({ ...f, usuario: e.target.value })} /></label>
          ) : (
            <p className="text-muted-foreground">Usuario: @{u.usuario}</p>
          )}
          <label className="block">{nuevo ? "PIN (6 dígitos)" : "Nuevo PIN (deja vacío para no cambiarlo)"}
            <input className={field + " tracking-[0.4em]"} inputMode="numeric" type="password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
          </label>
          {!propio && (
            <>
              <div>Rol
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button className={opt(f.rol === "staff")} onClick={() => setF({ ...f, rol: "staff" })}>Empleado</button>
                  <button className={opt(f.rol === "admin")} onClick={() => setF({ ...f, rol: "admin" })}>Administrador</button>
                </div>
              </div>
              {!nuevo && (
                <div>Estado
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <button className={opt(f.activo)} onClick={() => setF({ ...f, activo: true })}>Activo</button>
                    <button className={opt(!f.activo)} onClick={() => setF({ ...f, activo: false })}>Inactivo</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <button disabled={busy} onClick={guardar} className="mt-5 h-14 w-full rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground disabled:opacity-60">
          {busy ? "Guardando..." : "GUARDAR"}
        </button>
      </div>
    </div>
  );
}
