import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Producto } from "./estadero";

export const productosQuery = queryOptions({
  queryKey: ["productos"],
  queryFn: async () => {
    const { data, error } = await supabase.from("productos").select("*").order("nombre");
    if (error) throw error;
    return data as unknown as Producto[];
  },
});
