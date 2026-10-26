// Generated from the Supabase schema (project dalorgewa). Regenerate after migrations:
//   supabase gen types typescript --project-id lunokowximvnzefgfnib > src/supabase/database.types.ts

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
      devices: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string
          currency: string
          ean: string | null
          id: string
          imei: string | null
          kind: Database["public"]["Enums"]["device_kind"]
          maintenance_interval_months: number | null
          name: string
          notes: string | null
          price_cents: number | null
          protected_until: string | null
          purchase_date: string
          serial_number: string | null
          source_document_id: string | null
          statutory_until: string | null
          store: string | null
          updated_at: string
          user_id: string
          valid_until: string | null
          warranty_months: number
          warranty_until: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          ean?: string | null
          id?: string
          imei?: string | null
          kind?: Database["public"]["Enums"]["device_kind"]
          maintenance_interval_months?: number | null
          name: string
          notes?: string | null
          price_cents?: number | null
          protected_until?: string | null
          purchase_date: string
          serial_number?: string | null
          source_document_id?: string | null
          statutory_until?: string | null
          store?: string | null
          updated_at?: string
          user_id?: string
          valid_until?: string | null
          warranty_months?: number
          warranty_until?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          ean?: string | null
          id?: string
          imei?: string | null
          kind?: Database["public"]["Enums"]["device_kind"]
          maintenance_interval_months?: number | null
          name?: string
          notes?: string | null
          price_cents?: number | null
          protected_until?: string | null
          purchase_date?: string
          serial_number?: string | null
          source_document_id?: string | null
          statutory_until?: string | null
          store?: string | null
          updated_at?: string
          user_id?: string
          valid_until?: string | null
          warranty_months?: number
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_source_document_fkey"
            columns: ["source_document_id", "user_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          device_id: string | null
          extracted: Json | null
          extracted_at: string | null
          id: string
          kind: Database["public"]["Enums"]["document_kind"]
          luxury_item_id: string | null
          mime_type: string
          raw_text: string | null
          search: unknown
          size_bytes: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          extracted?: Json | null
          extracted_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["document_kind"]
          luxury_item_id?: string | null
          mime_type: string
          raw_text?: string | null
          search?: unknown
          size_bytes?: number | null
          storage_path: string
          user_id?: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          extracted?: Json | null
          extracted_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          luxury_item_id?: string | null
          mime_type?: string
          raw_text?: string | null
          search?: unknown
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_luxury_item_fkey"
            columns: ["luxury_item_id", "user_id"]
            isOneToOne: false
            referencedRelation: "luxury_items"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "documents_device_id_user_id_fkey"
            columns: ["device_id", "user_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      luxury_items: {
        Row: {
          brand: string
          category: string
          created_at: string
          currency: string
          has_box_papers: boolean
          photo_order: string[]
          id: string
          model: string
          notes: string | null
          purchase_date: string | null
          purchase_price_cents: number | null
          reference_number: string | null
          serial_number: string | null
          store: string | null
          updated_at: string
          user_id: string
          value_cents: number | null
        }
        Insert: {
          brand: string
          category: string
          created_at?: string
          currency?: string
          has_box_papers?: boolean
          photo_order?: string[]
          id?: string
          model: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price_cents?: number | null
          reference_number?: string | null
          serial_number?: string | null
          store?: string | null
          updated_at?: string
          user_id?: string
          value_cents?: number | null
        }
        Update: {
          brand?: string
          category?: string
          created_at?: string
          currency?: string
          has_box_papers?: boolean
          photo_order?: string[]
          id?: string
          model?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price_cents?: number | null
          reference_number?: string | null
          serial_number?: string | null
          store?: string | null
          updated_at?: string
          user_id?: string
          value_cents?: number | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          platform: string
          token: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          calls: number
          day: string
          kind: string
          user_id: string
        }
        Insert: {
          calls?: number
          day?: string
          kind: string
          user_id: string
        }
        Update: {
          calls?: number
          day?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          plan: string
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          plan: string
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          plan?: string
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      reminder_settings: {
        Row: {
          days_before: number[]
          hour: number
          updated_at: string
          user_id: string
        }
        Insert: {
          days_before?: number[]
          hour?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          days_before?: number[]
          hour?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          days_before: number
          device_id: string
          due_date: string
          id: string
          kind: Database["public"]["Enums"]["reminder_kind"]
          remind_at: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          days_before: number
          device_id: string
          due_date: string
          id?: string
          kind: Database["public"]["Enums"]["reminder_kind"]
          remind_at: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          days_before?: number
          device_id?: string
          due_date?: string
          id?: string
          kind?: Database["public"]["Enums"]["reminder_kind"]
          remind_at?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_device_id_user_id_fkey"
            columns: ["device_id", "user_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      terms_acceptances: {
        Row: {
          accepted_at: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          user_id?: string
          version: string
        }
        Update: {
          accepted_at?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      warranty_requests: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string
          currency: string | null
          document_id: string | null
          id: string
          kind: string
          luxury_item_id: string | null
          message: string | null
          price_cents: number | null
          product_name: string
          purchase_date: string | null
          serial_number: string | null
          status: string
          store: string | null
          user_id: string
          value_cents: number | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string
          currency?: string | null
          document_id?: string | null
          id?: string
          kind?: string
          luxury_item_id?: string | null
          message?: string | null
          price_cents?: number | null
          product_name: string
          purchase_date?: string | null
          serial_number?: string | null
          status?: string
          store?: string | null
          user_id?: string
          value_cents?: number | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string
          currency?: string | null
          document_id?: string | null
          id?: string
          kind?: string
          luxury_item_id?: string | null
          message?: string | null
          price_cents?: number | null
          product_name?: string
          purchase_date?: string | null
          serial_number?: string | null
          status?: string
          store?: string | null
          user_id?: string
          value_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "warranty_requests_luxury_item_fkey"
            columns: ["luxury_item_id", "user_id"]
            isOneToOne: false
            referencedRelation: "luxury_items"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "warranty_requests_document_id_user_id_fkey"
            columns: ["document_id", "user_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_due_reminders: {
        Args: { batch_size?: number }
        Returns: {
          days_before: number
          device_id: string
          device_name: string
          due_date: string
          id: string
          kind: Database["public"]["Enums"]["reminder_kind"]
          user_id: string
        }[]
      }
      consume_ai_quota: {
        Args: { call_kind: string }
        Returns: boolean
      }
      my_plan: {
        Args: Record<PropertyKey, never>
        Returns: {
          devices_used: number
          device_limit: number
          plan: string
        }[]
      }
    }
    Enums: {
      device_kind: "statutory" | "warranty" | "maintenance" | "vignette"
      document_kind: "receipt" | "warranty_card" | "invoice" | "other" | "product_photo"
      reminder_kind: "warranty" | "statutory" | "maintenance" | "vignette" | "burden_of_proof"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"]
export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      device_kind: ["statutory", "warranty", "maintenance", "vignette"],
      document_kind: ["receipt", "warranty_card", "invoice", "other", "product_photo"],
      reminder_kind: ["warranty", "statutory", "maintenance", "vignette", "burden_of_proof"],
    },
  },
} as const
