export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      compras: {
        Row: {
          created_at: string
          id: string
          proveedor: string
          total: number
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          proveedor: string
          total?: number
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          proveedor?: string
          total?: number
          usuario_id?: string | null
        }
        Relationships: []
      }
      compras_detalle: {
        Row: {
          cantidad: number
          compra_id: string
          costo: number
          id: string
          producto_id: string
          subtotal: number
          tipo: string
          unidades_totales: number
        }
        Insert: {
          cantidad: number
          compra_id: string
          costo?: number
          id?: string
          producto_id: string
          subtotal?: number
          tipo: string
          unidades_totales: number
        }
        Update: {
          cantidad?: number
          compra_id?: string
          costo?: number
          id?: string
          producto_id?: string
          subtotal?: number
          tipo?: string
          unidades_totales?: number
        }
        Relationships: [
          {
            foreignKeyName: "compras_detalle_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_detalle_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean
          costo_unidad: number
          created_at: string
          id: string
          marca_color: string
          nombre: string
          precio_canasta: number
          precio_unidad: number
          stock_unidades: number
          unidades_por_canasta: number
        }
        Insert: {
          activo?: boolean
          costo_unidad?: number
          created_at?: string
          id?: string
          marca_color?: string
          nombre: string
          precio_canasta?: number
          precio_unidad?: number
          stock_unidades?: number
          unidades_por_canasta?: number
        }
        Update: {
          activo?: boolean
          costo_unidad?: number
          created_at?: string
          id?: string
          marca_color?: string
          nombre?: string
          precio_canasta?: number
          precio_unidad?: number
          stock_unidades?: number
          unidades_por_canasta?: number
        }
        Relationships: []
      }
      ventas: {
        Row: {
          cambio: number | null
          created_at: string
          id: string
          metodo_pago: string
          recibido: number | null
          total: number
          usuario_id: string | null
        }
        Insert: {
          cambio?: number | null
          created_at?: string
          id?: string
          metodo_pago: string
          recibido?: number | null
          total?: number
          usuario_id?: string | null
        }
        Update: {
          cambio?: number | null
          created_at?: string
          id?: string
          metodo_pago?: string
          recibido?: number | null
          total?: number
          usuario_id?: string | null
        }
        Relationships: []
      }
      ventas_detalle: {
        Row: {
          cantidad: number
          id: string
          precio: number
          producto_id: string
          subtotal: number
          tipo: string
          unidades_totales: number
          venta_id: string
        }
        Insert: {
          cantidad: number
          id?: string
          precio: number
          producto_id: string
          subtotal: number
          tipo: string
          unidades_totales: number
          venta_id: string
        }
        Update: {
          cantidad?: number
          id?: string
          precio?: number
          producto_id?: string
          subtotal?: number
          tipo?: string
          unidades_totales?: number
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ventas_detalle_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_detalle_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      registrar_compra: {
        Args: { _items: Json; _proveedor: string }
        Returns: string
      }
      registrar_venta: {
        Args: { _items: Json; _metodo: string; _recibido: number }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
