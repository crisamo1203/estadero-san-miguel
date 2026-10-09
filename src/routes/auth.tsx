import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usuarioAEmail } from "@/lib/estadero";

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

function AuthPage() {
  const nav = useNavigate();
  const [modo, setModo] = useState<"in" | "up">("in");
  const [usuario, setUsuario] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[a-zA-Z0-9._-]{3,}$/.test(usuario.trim())) return toast.error("Usuario: mínimo 3 letras o números");
    if (!/^\d{6}$/.test(pin)) return toast.error("El PIN debe tener 6 dígitos");
    setBusy(true);
    const email = usuarioAEmail(usuario);
    const { error } =
      modo === "in"
        ? await supabase.auth.signInWithPassword({ email, password: pin })
        : await supabase.auth.signUp({ email, password: pin });
    setBusy(false);
    if (error) return toast.error(modo === "in" ? "Usuario o PIN incorrecto" : error.message);
    nav({ to: "/pos", replace: true });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-primary">Estadero</p>
      <h1 className="text-5xl font-extrabold leading-none">San Miguel</h1>
      <p className="mt-3 text-muted-foreground">{modo === "in" ? "Ingresa con tu usuario y PIN" : "Crea un usuario para el personal"}</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <input
          className="h-14 w-full rounded-2xl border border-input bg-card px-4 text-lg outline-none focus:ring-2 focus:ring-ring"
          placeholder="Usuario" autoCapitalize="none" value={usuario} onChange={(e) => setUsuario(e.target.value)}
        />
        <input
          className="h-14 w-full rounded-2xl border border-input bg-card px-4 text-center text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-ring"
          placeholder="PIN" inputMode="numeric" type="password" maxLength={6}
          value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        />
        <button disabled={busy} className="h-16 w-full rounded-2xl bg-primary text-xl font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-60">
          {busy ? "..." : modo === "in" ? "ENTRAR" : "CREAR USUARIO"}
        </button>
      </form>
      <button onClick={() => setModo(modo === "in" ? "up" : "in")} className="mt-6 text-sm text-muted-foreground underline">
        {modo === "in" ? "¿Nuevo empleado? Crear usuario" : "Ya tengo usuario"}
      </button>
    </main>
  );
}
