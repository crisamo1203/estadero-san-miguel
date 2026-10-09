import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/pos" });
  },
  head: () => ({
    meta: [
      { title: "Estadero San Miguel — Caja" },
      { name: "description", content: "App de caja y bodega del Estadero San Miguel." },
      { property: "og:title", content: "Estadero San Miguel — Caja" },
      { property: "og:description", content: "App de caja y bodega del Estadero San Miguel." },
    ],
  }),
});
