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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          locale: string
          message: string
          name: string
          status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          locale?: string
          message: string
          name: string
          status?: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          locale?: string
          message?: string
          name?: string
          status?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: []
      }
      chunks: {
        Row: {
          content: string
          created_at: string
          embedding: unknown
          embedding_model: string
          embedding_provider: string
          id: number
          location: Json
          notebook_id: string
          ordinal: number
          owner_id: string
          pipeline_version: string
          search_vector: unknown
          source_id: string
          token_count: number
        }
        Insert: {
          content: string
          created_at?: string
          embedding: unknown
          embedding_model: string
          embedding_provider: string
          id?: never
          location?: Json
          notebook_id: string
          ordinal: number
          owner_id: string
          pipeline_version: string
          search_vector?: unknown
          source_id: string
          token_count: number
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: unknown
          embedding_model?: string
          embedding_provider?: string
          id?: never
          location?: Json
          notebook_id?: string
          ordinal?: number
          owner_id?: string
          pipeline_version?: string
          search_vector?: unknown
          source_id?: string
          token_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "chunks_source_id_owner_id_notebook_id_fkey"
            columns: ["source_id", "owner_id", "notebook_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id", "owner_id", "notebook_id"]
          },
        ]
      }
      conversations: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          notebook_id: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          notebook_id: string
          owner_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          notebook_id?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_notebook_id_owner_id_fkey"
            columns: ["notebook_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      ingestion_jobs: {
        Row: {
          attempt: number
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_detail: string | null
          id: string
          idempotency_key: string
          notebook_id: string
          owner_id: string
          source_id: string
          stage: Database["public"]["Enums"]["ingestion_stage"]
          started_at: string | null
          updated_at: string
        }
        Insert: {
          attempt?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_detail?: string | null
          id?: string
          idempotency_key: string
          notebook_id: string
          owner_id: string
          source_id: string
          stage?: Database["public"]["Enums"]["ingestion_stage"]
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          attempt?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_detail?: string | null
          id?: string
          idempotency_key?: string
          notebook_id?: string
          owner_id?: string
          source_id?: string
          stage?: Database["public"]["Enums"]["ingestion_stage"]
          started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_jobs_source_id_owner_id_notebook_id_fkey"
            columns: ["source_id", "owner_id", "notebook_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id", "owner_id", "notebook_id"]
          },
        ]
      }
      message_citations: {
        Row: {
          chunk_id: number
          created_at: string
          id: number
          message_id: string
          ordinal: number
          owner_id: string
          quote: string
        }
        Insert: {
          chunk_id: number
          created_at?: string
          id?: never
          message_id: string
          ordinal: number
          owner_id: string
          quote: string
        }
        Update: {
          chunk_id?: number
          created_at?: string
          id?: never
          message_id?: string
          ordinal?: number
          owner_id?: string
          quote?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_citations_chunk_id_owner_id_fkey"
            columns: ["chunk_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "chunks"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "message_citations_message_id_owner_id_fkey"
            columns: ["message_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      message_feedback: {
        Row: {
          comment: string | null
          created_at: string
          helpful: boolean
          message_id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          helpful: boolean
          message_id: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          helpful?: boolean
          message_id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_feedback_message_id_owner_id_fkey"
            columns: ["message_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          error_code: string | null
          id: string
          model_effective: string | null
          model_requested: string | null
          notebook_id: string
          owner_id: string
          role: Database["public"]["Enums"]["message_role"]
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          error_code?: string | null
          id?: string
          model_effective?: string | null
          model_requested?: string | null
          notebook_id: string
          owner_id: string
          role: Database["public"]["Enums"]["message_role"]
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          error_code?: string | null
          id?: string
          model_effective?: string | null
          model_requested?: string | null
          notebook_id?: string
          owner_id?: string
          role?: Database["public"]["Enums"]["message_role"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_owner_id_notebook_id_fkey"
            columns: ["conversation_id", "owner_id", "notebook_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id", "owner_id", "notebook_id"]
          },
        ]
      }
      notebooks: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          locale: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          locale?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          locale?: string
          updated_at?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          byte_size: number | null
          content_hash: string | null
          created_at: string
          error_code: string | null
          error_detail: string | null
          extracted_characters: number | null
          extracted_text: string | null
          id: string
          kind: Database["public"]["Enums"]["source_kind"]
          mime_type: string | null
          notebook_id: string
          owner_id: string
          page_count: number | null
          status: Database["public"]["Enums"]["source_status"]
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          byte_size?: number | null
          content_hash?: string | null
          created_at?: string
          error_code?: string | null
          error_detail?: string | null
          extracted_characters?: number | null
          extracted_text?: string | null
          id?: string
          kind: Database["public"]["Enums"]["source_kind"]
          mime_type?: string | null
          notebook_id: string
          owner_id: string
          page_count?: number | null
          status?: Database["public"]["Enums"]["source_status"]
          storage_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          byte_size?: number | null
          content_hash?: string | null
          created_at?: string
          error_code?: string | null
          error_detail?: string | null
          extracted_characters?: number | null
          extracted_text?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["source_kind"]
          mime_type?: string | null
          notebook_id?: string
          owner_id?: string
          page_count?: number | null
          status?: Database["public"]["Enums"]["source_status"]
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_notebook_id_owner_id_fkey"
            columns: ["notebook_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_owned_notebook: {
        Args: { p_name: string }
        Returns: Json
      }
      finalize_source_ingestion: {
        Args: {
          p_chunks: Json
          p_embedding_model: string
          p_embedding_provider: string
          p_job_id: string
          p_notebook_id: string
          p_pipeline_version: string
          p_source_id: string
        }
        Returns: undefined
      }
      hybrid_search_chunks: {
        Args: {
          p_lexical_limit?: number
          p_notebook_id: string
          p_query_embedding: string
          p_query_text: string
          p_rrf_k?: number
          p_semantic_limit?: number
          p_source_ids: string[]
        }
        Returns: {
          chunk_id: number
          content: string
          lexical_rank: number | null
          lexical_score: number | null
          location: Json
          ordinal: number
          rrf_score: number
          semantic_rank: number | null
          semantic_score: number | null
          source_id: string
          source_title: string
          token_count: number
        }[]
      }
      requeue_source_ingestion: {
        Args: {
          p_daily_limit?: number
          p_notebook_id: string
          p_source_id: string
        }
        Returns: Json
      }
      reserve_ingestion_source: {
        Args: {
          p_byte_size?: number | null
          p_content_hash: string
          p_daily_limit?: number
          p_extracted_text?: string | null
          p_kind: Database["public"]["Enums"]["source_kind"]
          p_mime_type?: string | null
          p_notebook_id: string
          p_title: string
        }
        Returns: Json
      }
    }
    Enums: {
      ingestion_stage:
        | "queued"
        | "extracting"
        | "chunking"
        | "embedding"
        | "persisting"
        | "completed"
        | "failed"
      message_role: "user" | "assistant"
      request_status: "pending" | "reviewed" | "approved" | "rejected"
      source_kind: "txt" | "md" | "pdf" | "pasted_text"
      source_status:
        | "pending"
        | "processing"
        | "ready"
        | "retryable_error"
        | "permanent_error"
        | "deleted"
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
      ingestion_stage: [
        "queued",
        "extracting",
        "chunking",
        "embedding",
        "persisting",
        "completed",
        "failed",
      ],
      message_role: ["user", "assistant"],
      request_status: ["pending", "reviewed", "approved", "rejected"],
      source_kind: ["txt", "md", "pdf", "pasted_text"],
      source_status: [
        "pending",
        "processing",
        "ready",
        "retryable_error",
        "permanent_error",
        "deleted",
      ],
    },
  },
} as const

