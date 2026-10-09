export type Producto = {
  id: string;
  nombre: string;
  marca_color: string;
  precio_unidad: number;
  precio_canasta: number;
  costo_unidad: number;
  unidades_por_canasta: number;
  stock_unidades: number;
  activo: boolean;
};

export const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);

export function stockTexto(unidades: number, porCanasta: number) {
  const neg = unidades < 0;
  const u = Math.abs(unidades);
  const c = Math.floor(u / (porCanasta || 30));
  const r = u % (porCanasta || 30);
  return `${neg ? "-" : ""}${u} Botellas (${c} Canasta${c === 1 ? "" : "s"} + ${r} Unidad${r === 1 ? "" : "es"})`;
}

export const brandClass: Record<string, string> = {
  poker: "bg-poker text-poker-foreground",
  aguila: "bg-aguila text-aguila-foreground",
  club: "bg-club text-club-foreground",
  neutral: "bg-neutral-brand text-neutral-brand-foreground",
};

export const metodos = [
  { id: "efectivo", label: "Efectivo" },
  { id: "nequi", label: "Nequi" },
  { id: "daviplata", label: "Daviplata" },
  { id: "tarjeta", label: "Tarjeta" },
] as const;

export const usuarioAEmail = (u: string) =>
  `${u.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@estadero.local`;
