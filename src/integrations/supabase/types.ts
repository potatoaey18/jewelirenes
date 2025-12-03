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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_email: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_email: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bank_checks: {
        Row: {
          amount: number
          bank: string
          branch: string
          check_date: string
          check_number: string
          created_at: string
          created_by: string
          customer_id: string
          date_received: string
          expiry_date: string | null
          id: string
          invoice_number: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank: string
          branch: string
          check_date: string
          check_number: string
          created_at?: string
          created_by: string
          customer_id: string
          date_received?: string
          expiry_date?: string | null
          id?: string
          invoice_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank?: string
          branch?: string
          check_date?: string
          check_number?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          date_received?: string
          expiry_date?: string | null
          id?: string
          invoice_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_checks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          amount_paid: number
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          payment_plan_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_plan_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_files: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          file_id: string
          id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          file_id: string
          id?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          file_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_files_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          tier: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          tier?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string | null
          expense_date: string
          id: string
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      files: {
        Row: {
          created_at: string
          file_size: number | null
          file_type: string
          folder_id: string | null
          id: string
          name: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_type: string
          folder_id?: string | null
          id?: string
          name: string
          storage_path: string
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_type?: string
          folder_id?: string | null
          id?: string
          name?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      finished_items: {
        Row: {
          created_at: string
          date_manufactured: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          selling_price: number
          sku: string
          stock: number
          total_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_manufactured: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          selling_price?: number
          sku: string
          stock?: number
          total_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_manufactured?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          selling_price?: number
          sku?: string
          stock?: number
          total_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          path: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          path: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      item_labor: {
        Row: {
          amount_per_piece: number | null
          created_at: string
          fixed_cost: number | null
          id: string
          item_id: string
          labor_type: Database["public"]["Enums"]["labor_type"]
          pieces: number | null
          staff_member: string | null
          total_cost: number
        }
        Insert: {
          amount_per_piece?: number | null
          created_at?: string
          fixed_cost?: number | null
          id?: string
          item_id: string
          labor_type: Database["public"]["Enums"]["labor_type"]
          pieces?: number | null
          staff_member?: string | null
          total_cost: number
        }
        Update: {
          amount_per_piece?: number | null
          created_at?: string
          fixed_cost?: number | null
          id?: string
          item_id?: string
          labor_type?: Database["public"]["Enums"]["labor_type"]
          pieces?: number | null
          staff_member?: string | null
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_labor_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "finished_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_materials: {
        Row: {
          cost_at_time: number
          created_at: string
          id: string
          item_id: string
          material_id: string
          quantity_used: number
          subtotal: number
        }
        Insert: {
          cost_at_time: number
          created_at?: string
          id?: string
          item_id: string
          material_id: string
          quantity_used: number
          subtotal: number
        }
        Update: {
          cost_at_time?: number
          created_at?: string
          id?: string
          item_id?: string
          material_id?: string
          quantity_used?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_materials_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "finished_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          amount_paid: number
          balance: number
          created_at: string
          created_by: string
          customer_id: string
          id: string
          status: string
          total_amount: number
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          balance: number
          created_at?: string
          created_by: string
          customer_id: string
          id?: string
          status?: string
          total_amount: number
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          balance?: number
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          status?: string
          total_amount?: number
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          carat: string | null
          category: string
          cost_price: number | null
          created_at: string
          description: string | null
          gemstone: string | null
          id: string
          image_url: string | null
          metal: string | null
          name: string
          price: number
          sku: string
          stock: number
          updated_at: string
          weight: string | null
        }
        Insert: {
          carat?: string | null
          category: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          gemstone?: string | null
          id?: string
          image_url?: string | null
          metal?: string | null
          name: string
          price?: number
          sku: string
          stock?: number
          updated_at?: string
          weight?: string | null
        }
        Update: {
          carat?: string | null
          category?: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          gemstone?: string | null
          id?: string
          image_url?: string | null
          metal?: string | null
          name?: string
          price?: number
          sku?: string
          stock?: number
          updated_at?: string
          weight?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      raw_materials: {
        Row: {
          cost_per_unit: number
          created_at: string
          id: string
          name: string
          other_description: string | null
          quantity_on_hand: number
          type: Database["public"]["Enums"]["material_type"]
          unit: string
          updated_at: string
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          name: string
          other_description?: string | null
          quantity_on_hand?: number
          type: Database["public"]["Enums"]["material_type"]
          unit: string
          updated_at?: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          name?: string
          other_description?: string | null
          quantity_on_hand?: number
          type?: Database["public"]["Enums"]["material_type"]
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      transaction_items: {
        Row: {
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          subtotal: number
          transaction_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          subtotal: number
          transaction_id: string
          unit_price: number
        }
        Update: {
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          transaction_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          customer_id: string
          discount: number | null
          id: string
          invoice_image_url: string | null
          notes: string | null
          payment_type: string | null
          tax: number | null
          total_amount: number
          transaction_type: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          discount?: number | null
          id?: string
          invoice_image_url?: string | null
          notes?: string | null
          payment_type?: string | null
          tax?: number | null
          total_amount?: number
          transaction_type: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          discount?: number | null
          id?: string
          invoice_image_url?: string | null
          notes?: string | null
          payment_type?: string | null
          tax?: number | null
          total_amount?: number
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      labor_type: "diamond_setting" | "tubog"
      material_type:
        | "gold"
        | "diamond"
        | "gem"
        | "south_sea_pearl"
        | "other"
        | "silver"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      labor_type: ["diamond_setting", "tubog"],
      material_type: [
        "gold",
        "diamond",
        "gem",
        "south_sea_pearl",
        "other",
        "silver",
      ],
    },
  },
} as const
