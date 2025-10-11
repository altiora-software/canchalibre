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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      court_availability: {
        Row: {
          court_id: string | null
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
          updated_at: string
        }
        Insert: {
          court_id?: string | null
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean | null
          start_time: string
          updated_at?: string
        }
        Update: {
          court_id?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_availability_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "sport_courts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          external_payment_id: string | null
          id: string
          payment_date: string | null
          payment_method: string
          reservation_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          external_payment_id?: string | null
          id?: string
          payment_date?: string | null
          payment_method: string
          reservation_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          external_payment_id?: string | null
          id?: string
          payment_date?: string | null
          payment_method?: string
          reservation_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          complex_id: string | null
          court_id: string | null
          created_at: string
          deposit_amount: number | null
          deposit_paid: boolean | null
          end_time: string
          id: string
          mercadopago_payment_id: string | null
          notes: string | null
          payment_method: string
          payment_status: string
          reservation_date: string
          start_time: string
          total_price: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          complex_id?: string | null
          court_id?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          end_time: string
          id?: string
          mercadopago_payment_id?: string | null
          notes?: string | null
          payment_method: string
          payment_status?: string
          reservation_date: string
          start_time: string
          total_price: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          complex_id?: string | null
          court_id?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          end_time?: string
          id?: string
          mercadopago_payment_id?: string | null
          notes?: string | null
          payment_method?: string
          payment_status?: string
          reservation_date?: string
          start_time?: string
          total_price?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "sport_complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "sport_courts"
            referencedColumns: ["id"]
          },
        ]
      }
      sport_complexes: {
        Row: {
          address: string
          amenities: string[] | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_approved: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          neighborhood: string | null
          opening_hours: Json | null
          owner_id: string
          payment_status: string | null
          phone: string | null
          photos: string[] | null
          subscription_expires_at: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          neighborhood?: string | null
          opening_hours?: Json | null
          owner_id: string
          payment_status?: string | null
          phone?: string | null
          photos?: string[] | null
          subscription_expires_at?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          neighborhood?: string | null
          opening_hours?: Json | null
          owner_id?: string
          payment_status?: string | null
          phone?: string | null
          photos?: string[] | null
          subscription_expires_at?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sport_complexes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sport_courts: {
        Row: {
          complex_id: string
          created_at: string
          has_lighting: boolean | null
          has_roof: boolean | null
          hourly_price: number | null
          id: string
          is_active: boolean | null
          name: string
          photos: string[] | null
          players_capacity: number
          sport: Database["public"]["Enums"]["sport_type"]
          surface_type: string | null
          updated_at: string
        }
        Insert: {
          complex_id: string
          created_at?: string
          has_lighting?: boolean | null
          has_roof?: boolean | null
          hourly_price?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          photos?: string[] | null
          players_capacity: number
          sport: Database["public"]["Enums"]["sport_type"]
          surface_type?: string | null
          updated_at?: string
        }
        Update: {
          complex_id?: string
          created_at?: string
          has_lighting?: boolean | null
          has_roof?: boolean | null
          hourly_price?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          photos?: string[] | null
          players_capacity?: number
          sport?: Database["public"]["Enums"]["sport_type"]
          surface_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sport_courts_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "sport_complexes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
      Views: {
        // extensions schema (system / contrib views)
        pg_stat_statements: {
          Row: any
          Relationships: []
        }
        pg_stat_statements_info: {
          Row: any
          Relationships: []
        }

        // public schema views
        reservations_with_names: {
          Row: any
          Relationships: []
        }
        reservations_with_profiles: {
          Row: any
          Relationships: []
        }

        // sport_complexes public view (no contact fields)
        sport_complexes_public: {
          Row: {
            id: string
            name: string
            description: string | null
            address: string
            neighborhood: string | null
            latitude: number | null
            longitude: number | null
            website: string | null
            photos: string[] | null
            amenities: string[] | null
            opening_hours: Json | null
            is_active: boolean | null
            is_approved: boolean | null
          }
          Relationships: []
        }

        // sport_complexes public view that includes contact (only for authenticated access)
        sport_complexes_public_with_contact: {
          Row: {
            id: string
            name: string
            description: string | null
            address: string
            neighborhood: string | null
            latitude: number | null
            longitude: number | null
            website: string | null
            photos: string[] | null
            amenities: string[] | null
            opening_hours: Json | null
            is_active: boolean | null
            is_approved: boolean | null
            phone: string | null
            whatsapp: string | null
            email: string | null
          }
          Relationships: []
        }

        // vault schema
        decrypted_secrets: {
          Row: any
          Relationships: []
        }
      }

    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      sport_type:
        | "futbol"
        | "basquet"
        | "tenis"
        | "voley"
        | "handball"
        | "skate"
        | "padle"
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
      sport_type: ["futbol", "basquet", "tenis", "voley", "handball", "skate", "padle"],
    },
  },
} as const
