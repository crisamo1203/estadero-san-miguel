import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { crearPrimerAdmin, hayAdmin, ingresar } from "@/lib/usuarios.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — Estadero San Miguel" },
      { name: "description", content: "Ingreso del personal con usuario y PIN." },
      { property: "og:title", content: "Ingresar — Estadero San Miguel" },
      { property: "og:description", content: "Ingreso del personal con usuario y PIN." },
    ],
  }),
  component: AuthPage,
});

const field = "h-14 w-full rounded-2xl border border-input bg-card px-4 text-lg outline-none focus:ring-2 focus:ring-ring";

function AuthPage() {
  const nav = useNavigate();
  const checkAdmin = useServerFn(hayAdmin);
  const primerAdmin = useServerFn(crearPrimerAdmin);
  const login = useServerFn(ingresar);
  const [setup, setSetup] = useState(false);
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    checkAdmin().then((r) => setSetup(!r.hayAdmin)).catch(() => {});
  }, [checkAdmin]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[a-zA-Z0-9._-]{3,}$/.test(usuario.trim())) { toast.error("Usuario: mínimo 3 letras o números"); return; }
    if (!/^\d{6}$/.test(pin)) { toast.error("El PIN debe tener 6 dígitos"); return; }
    setBusy(true);
    try {
      if (setup) {
        if (!nombre.trim()) { toast.error("Escribe tu nombre"); return; }
        await primerAdmin({ data: { nombre, usuario: usuario.trim().toLowerCase(), pin } });
      }
      const tokens = await login({ data: { usuario: usuario.trim().toLowerCase(), pin } });
      const { error } = await supabase.auth.setSession(tokens);
      if (error) { toast.error("No se pudo iniciar sesión"); return; }
      nav({ to: "/pos", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-primary">Estadero</p>
      <h1 className="text-5xl font-extrabold leading-none">San Miguel</h1>
      <p className="mt-3 text-muted-foreground">
        {setup ? "Primera vez: crea la cuenta del administrador" : "Ingresa con tu usuario y PIN"}
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {setup && <input className={field} placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />}
        <input className={field} placeholder="Usuario" autoCapitalize="none" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
        <input
          className={field + " text-center text-2xl tracking-[0.5em]"}
          placeholder="PIN" inputMode="numeric" type="password" maxLength={6}
          value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        />
        <button disabled={busy} className="h-16 w-full rounded-2xl bg-primary text-xl font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-60">
          {busy ? "..." : setup ? "CREAR ADMINISTRADOR" : "ENTRAR"}
        </button>
      </form>
      {!setup && <p className="mt-6 text-center text-sm text-muted-foreground">¿No tienes usuario? Pídeselo al administrador.</p>}
    </main>
  );
}
