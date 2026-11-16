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
      admin_emails: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          code: string
          qty: number
          user_id: string
        }
        Insert: {
          code: string
          qty: number
          user_id: string
        }
        Update: {
          code?: string
          qty?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["code"]
          },
        ]
      }
      mystery_claims: {
        Row: {
          code: string
          id: string
          size: string | null
          used: boolean
          visit: string
        }
        Insert: {
          code: string
          id?: string
          size?: string | null
          used?: boolean
          visit: string
        }
        Update: {
          code?: string
          id?: string
          size?: string | null
          used?: boolean
          visit?: string
        }
        Relationships: [
          {
            foreignKeyName: "mystery_claims_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["code"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          dedication: Json
          discount: number
          discount_qar: number
          email: string
          id: string
          is_ghost: boolean
          items: Json
          order_no: string
          promotions: Json
          shipping: Json
          status: string
          subtotal: number
          subtotal_qar: number
          total: number
          total_qar: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dedication?: Json
          discount?: number
          discount_qar?: number
          email: string
          id?: string
          is_ghost?: boolean
          items?: Json
          order_no: string
          promotions?: Json
          shipping?: Json
          status?: string
          subtotal?: number
          subtotal_qar?: number
          total?: number
          total_qar?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dedication?: Json
          discount?: number
          discount_qar?: number
          email?: string
          id?: string
          is_ghost?: boolean
          items?: Json
          order_no?: string
          promotions?: Json
          shipping?: Json
          status?: string
          subtotal?: number
          subtotal_qar?: number
          total?: number
          total_qar?: number
          user_id?: string | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          base_stock: number
          code: string
          size: string
          stock: number
        }
        Insert: {
          base_stock?: number
          code: string
          size: string
          stock?: number
        }
        Update: {
          base_stock?: number
          code?: string
          size?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["code"]
          },
        ]
      }
      products: {
        Row: {
          base_stock: number
          code: string
          description: string
          name: string
          price: number
          sort_order: number
          stock: number
          tag: string | null
        }
        Insert: {
          base_stock?: number
          code: string
          description?: string
          name: string
          price: number
          sort_order?: number
          stock?: number
          tag?: string | null
        }
        Update: {
          base_stock?: number
          code?: string
          description?: string
          name?: string
          price?: number
          sort_order?: number
          stock?: number
          tag?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          topic: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string
          name: string
          topic: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          topic?: string
        }
        Relationships: []
      }
      restock_alerts: {
        Row: {
          code: string
          created_at: string
          email: string
          id: string
          notified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          id?: string
          notified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          id?: string
          notified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "restock_alerts_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["code"]
          },
        ]
      }
      saved_items: {
        Row: {
          code: string
          user_id: string
        }
        Insert: {
          code: string
          user_id: string
        }
        Update: {
          code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["code"]
          },
        ]
      }
      shopping_cart: {
        Row: {
          line_key: string
          qty: number
          user_id: string
        }
        Insert: {
          line_key: string
          qty: number
          user_id: string
        }
        Update: {
          line_key?: string
          qty?: number
          user_id?: string
        }
        Relationships: []
      }
      station_events: {
        Row: {
          area: string | null
          code: string
          created_at: string
          id: string
          kind: string
        }
        Insert: {
          area?: string | null
          code: string
          created_at?: string
          id?: string
          kind: string
        }
        Update: {
          area?: string | null
          code?: string
          created_at?: string
          id?: string
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_events_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["code"]
          },
        ]
      }
      station_state: {
        Row: {
          ghost_listeners: number
          id: number
          listeners_updated_at: string
          next_ghost_at: string
        }
        Insert: {
          ghost_listeners?: number
          id?: number
          listeners_updated_at?: string
          next_ghost_at?: string
        }
        Update: {
          ghost_listeners?: number
          id?: number
          listeners_updated_at?: string
          next_ghost_at?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_restock_all: { Args: never; Returns: undefined }
      admin_set_stock: {
        Args: { _code: string; _stock: number }
        Returns: undefined
      }
      claim_orders: { Args: { p_ids: string[] }; Returns: number }
      dead_hours: { Args: { t?: string }; Returns: boolean }
      ghost_tick: { Args: never; Returns: undefined }
      guest_orders: {
        Args: { p_ids: string[] }
        Returns: {
          created_at: string
          dedication: Json
          discount: number
          discount_qar: number
          email: string
          id: string
          is_ghost: boolean
          items: Json
          order_no: string
          promotions: Json
          shipping: Json
          status: string
          subtotal: number
          subtotal_qar: number
          total: number
          total_qar: number
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mystery_drop: { Args: { p_visit: string }; Returns: Json }
      place_order:
        | {
            Args: {
              p_email: string
              p_items: Json
              p_kicked: boolean
              p_shipping: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_email: string
              p_items: Json
              p_kicked: boolean
              p_secret: boolean
              p_shipping: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_dedication: Json
              p_email: string
              p_items: Json
              p_kicked: boolean
              p_secret: boolean
              p_shipping: Json
            }
            Returns: Json
          }
      refill_all: { Args: never; Returns: undefined }
      station_audience: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
