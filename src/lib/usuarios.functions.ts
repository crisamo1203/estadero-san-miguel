import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const usuarioRe = /^[a-z0-9._-]{3,30}$/;
const pinSchema = z.string().regex(/^\d{6}$/, "El PIN debe tener 6 dígitos");
const emailDe = (u: string) => `${u}@estadero.local`;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function asegurarAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Solo administradores");
}

async function crear(nombre: string, usuario: string, pin: string, rol: "admin" | "staff") {
  const sb = await admin();
  const { data, error } = await sb.auth.admin.createUser({
    email: emailDe(usuario),
    password: pin,
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (error || !data.user) {
    const msg = error?.message ?? "";
    if (/already|registered|exists/i.test(msg)) throw new Error("Ese usuario ya existe");
    if (/pwned|leak|weak/i.test(msg)) throw new Error("PIN demasiado común, elige otro");
    throw new Error("No se pudo crear el usuario");
  }
  const roles = rol === "admin" ? ["admin", "staff"] : ["staff"];
  await sb.from("user_roles").insert(roles.map((r) => ({ user_id: data.user!.id, role: r as "admin" | "staff" })));
  return data.user.id;
}

const nuevoSchema = z.object({
  nombre: z.string().trim().min(1).max(60),
  usuario: z.string().trim().toLowerCase().regex(usuarioRe, "Usuario: 3-30 letras/números"),
  pin: pinSchema,
});

// Public: only works while no administrator exists (first-time setup).
export const hayAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { count } = await sb.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return { hayAdmin: (count ?? 0) > 0 };
});

export const crearPrimerAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => nuevoSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { count } = await sb.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Ya existe un administrador");
    await crear(data.nombre, data.usuario, data.pin, "admin");
    return { ok: true };
  });

export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await asegurarAdmin(context.supabase, context.userId);
    const sb = await admin();
    const [{ data: perfiles }, { data: roles }] = await Promise.all([
      sb.from("profiles").select("id,usuario,nombre,activo,created_at").order("created_at"),
      sb.from("user_roles").select("user_id,role"),
    ]);
    return (perfiles ?? []).map((p) => ({
      ...p,
      rol: (roles ?? []).some((r) => r.user_id === p.id && r.role === "admin") ? ("admin" as const) : ("staff" as const),
    }));
  });

export const crearUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => nuevoSchema.extend({ rol: z.enum(["admin", "staff"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await asegurarAdmin(context.supabase, context.userId);
    await crear(data.nombre, data.usuario, data.pin, data.rol);
    return { ok: true };
  });

export const editarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      nombre: z.string().trim().min(1).max(60),
      rol: z.enum(["admin", "staff"]),
      activo: z.boolean(),
      pin: pinSchema.optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await asegurarAdmin(context.supabase, context.userId);
    const propio = data.id === context.userId;
    if (propio && (!data.activo || data.rol !== "admin")) throw new Error("No puedes quitarte el acceso de administrador");
    const sb = await admin();
    const attrs: Record<string, unknown> = { ban_duration: data.activo ? "none" : "876000h" };
    if (data.pin) attrs['password'] = data.pin;
    const { error } = await sb.auth.admin.updateUserById(data.id, attrs);
    if (error) {
      if (/pwned|leak|weak/i.test(error.message)) throw new Error("PIN demasiado común, elige otro");
      throw new Error("No se pudo actualizar el usuario");
    }
    await sb.from("profiles").update({ nombre: data.nombre, activo: data.activo }).eq("id", data.id);
    await sb.from("user_roles").upsert({ user_id: data.id, role: "staff" }, { onConflict: "user_id,role" });
    if (data.rol === "admin") {
      await sb.from("user_roles").upsert({ user_id: data.id, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      await sb.from("user_roles").delete().eq("user_id", data.id).eq("role", "admin");
    }
    return { ok: true };
  });
