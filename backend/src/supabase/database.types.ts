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
          id: string
          name: string
          notes: string | null
          price_cents: number | null
          protected_until: string | null
          purchase_date: string
          statutory_until: string | null
          store: string | null
          updated_at: string
          user_id: string
          warranty_months: number
          warranty_until: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          id?: string
          name: string
          notes?: string | null
          price_cents?: number | null
          protected_until?: string | null
          purchase_date: string
          statutory_until?: string | null
          store?: string | null
          updated_at?: string
          user_id?: string
          warranty_months?: number
          warranty_until?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          id?: string
          name?: string
          notes?: string | null
          price_cents?: number | null
          protected_until?: string | null
          purchase_date?: string
          statutory_until?: string | null
          store?: string | null
          updated_at?: string
          user_id?: string
          warranty_months?: number
          warranty_until?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          device_id: string | null
          extracted: Json | null
          extracted_at: string | null
          id: string
          kind: Database["public"]["Enums"]["document_kind"]
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
          mime_type?: string
          raw_text?: string | null
          search?: unknown
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_device_id_user_id_fkey"
            columns: ["device_id", "user_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id", "user_id"]
          },
        ]
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
    }
    Enums: {
      document_kind: "receipt" | "warranty_card" | "invoice" | "other"
      reminder_kind: "warranty" | "statutory"
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
      document_kind: ["receipt", "warranty_card", "invoice", "other"],
      reminder_kind: ["warranty", "statutory"],
    },
  },
} as const
