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
      admin_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          after: Json | null
          before: Json | null
          correlation_id: string | null
          created_at: string
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          after?: Json | null
          before?: Json | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          after?: Json | null
          before?: Json | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      consultations: {
        Row: {
          assigned_rep: string | null
          challenge: string | null
          created_at: string
          goal: string | null
          id: string
          member_notes: string | null
          mode: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["consultation_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_rep?: string | null
          challenge?: string | null
          created_at?: string
          goal?: string | null
          id?: string
          member_notes?: string | null
          mode?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["consultation_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_rep?: string | null
          challenge?: string | null
          created_at?: string
          goal?: string | null
          id?: string
          member_notes?: string | null
          mode?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["consultation_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          key: string
          label: string
          status: Database["public"]["Enums"]["publication_status"]
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          label: string
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          label?: string
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      directory_startups: {
        Row: {
          collaboration: string[]
          created_at: string
          description: string
          founder: Json
          id: string
          industry: string
          logo_url: string | null
          name: string
          slug: string
          status: Database["public"]["Enums"]["publication_status"]
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          collaboration?: string[]
          created_at?: string
          description?: string
          founder?: Json
          id?: string
          industry?: string
          logo_url?: string | null
          name: string
          slug: string
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          collaboration?: string[]
          created_at?: string
          description?: string
          founder?: Json
          id?: string
          industry?: string
          logo_url?: string | null
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          attendance: Database["public"]["Enums"]["attendance_status"]
          created_at: string
          event_id: string
          goal: string | null
          id: string
          payment: Database["public"]["Enums"]["payment_status"]
          reference: string
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          attendance?: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          event_id: string
          goal?: string | null
          id?: string
          payment?: Database["public"]["Enums"]["payment_status"]
          reference: string
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          attendance?: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          event_id?: string
          goal?: string | null
          id?: string
          payment?: Database["public"]["Enums"]["payment_status"]
          reference?: string
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          admission: string
          capacity: number | null
          category: string
          cover_image: string | null
          created_at: string
          description: string
          ends_at: string
          featured: boolean
          id: string
          location: string
          registration_deadline: string | null
          registration_state: string
          slug: string
          starts_at: string
          status: Database["public"]["Enums"]["publication_status"]
          title: string
          venue: string | null
        }
        Insert: {
          admission?: string
          capacity?: number | null
          category: string
          cover_image?: string | null
          created_at?: string
          description?: string
          ends_at: string
          featured?: boolean
          id?: string
          location: string
          registration_deadline?: string | null
          registration_state?: string
          slug: string
          starts_at: string
          status?: Database["public"]["Enums"]["publication_status"]
          title: string
          venue?: string | null
        }
        Update: {
          admission?: string
          capacity?: number | null
          category?: string
          cover_image?: string | null
          created_at?: string
          description?: string
          ends_at?: string
          featured?: boolean
          id?: string
          location?: string
          registration_deadline?: string | null
          registration_state?: string
          slug?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["publication_status"]
          title?: string
          venue?: string | null
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          alt_text: string | null
          category: string
          created_at: string
          filename: string
          height: number | null
          id: string
          size_bytes: number | null
          storage_path: string | null
          type: string | null
          visibility: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          category?: string
          created_at?: string
          filename: string
          height?: number | null
          id?: string
          size_bytes?: number | null
          storage_path?: string | null
          type?: string | null
          visibility?: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          category?: string
          created_at?: string
          filename?: string
          height?: number | null
          id?: string
          size_bytes?: number | null
          storage_path?: string | null
          type?: string | null
          visibility?: string
          width?: number | null
        }
        Relationships: []
      }
      membership_claims: {
        Row: {
          applicant_type: string
          declaration_accurate: boolean
          designation: Database["public"]["Enums"]["member_designation"]
          full_name: string
          id: string
          linked_account_email: string
          reference: string | null
          startup_affiliation: string | null
          status: Database["public"]["Enums"]["membership_status"]
          submitted_at: string
          user_id: string
          whatsapp: string
        }
        Insert: {
          applicant_type: string
          declaration_accurate?: boolean
          designation: Database["public"]["Enums"]["member_designation"]
          full_name: string
          id?: string
          linked_account_email: string
          reference?: string | null
          startup_affiliation?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          submitted_at?: string
          user_id: string
          whatsapp: string
        }
        Update: {
          applicant_type?: string
          declaration_accurate?: boolean
          designation?: Database["public"]["Enums"]["member_designation"]
          full_name?: string
          id?: string
          linked_account_email?: string
          reference?: string | null
          startup_affiliation?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          submitted_at?: string
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          issued_at: string | null
          member_number: string | null
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          member_number?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          member_number?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          channel: string
          created_at: string
          id: string
          payload: Json | null
          recipient: string | null
          sent_at: string | null
          status: string
          type: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          payload?: Json | null
          recipient?: string | null
          sent_at?: string | null
          status?: string
          type: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          payload?: Json | null
          recipient?: string | null
          sent_at?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          consent: Json
          created_at: string
          designations: Database["public"]["Enums"]["member_designation"][]
          display_name: string | null
          email: string | null
          full_name: string | null
          goals: Database["public"]["Enums"]["community_goal"][]
          id: string
          profile_completion: number
          skills: string[]
          startup: Json | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          consent?: Json
          created_at?: string
          designations?: Database["public"]["Enums"]["member_designation"][]
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          goals?: Database["public"]["Enums"]["community_goal"][]
          id: string
          profile_completion?: number
          skills?: string[]
          startup?: Json | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          consent?: Json
          created_at?: string
          designations?: Database["public"]["Enums"]["member_designation"][]
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          goals?: Database["public"]["Enums"]["community_goal"][]
          id?: string
          profile_completion?: number
          skills?: string[]
          startup?: Json | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          kind: string
          moderation: Database["public"]["Enums"]["review_moderation_status"]
          rating: number
          review: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          kind?: string
          moderation?: Database["public"]["Enums"]["review_moderation_status"]
          rating: number
          review: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          kind?: string
          moderation?: Database["public"]["Enums"]["review_moderation_status"]
          rating?: number
          review?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_testimonials: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          designation: string | null
          id: string | null
          name: string | null
          rating: number | null
          review: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      next_member_number: { Args: never; Returns: string }
    }
    Enums: {
      attendance_status: "not_attended" | "checked_in" | "no_show"
      community_goal:
        | "networking"
        | "technical_collaboration"
        | "finding_co_founder"
        | "mentorship"
        | "product_development"
        | "marketing"
        | "funding_connections"
        | "hiring"
        | "startup_learning"
        | "community_participation"
      consultation_status:
        | "submitted"
        | "under_review"
        | "more_info_required"
        | "approved"
        | "scheduled"
        | "completed"
        | "declined"
        | "cancelled"
      member_designation:
        | "startup_founder"
        | "co_founder"
        | "team_member"
        | "developer"
        | "student_entrepreneur"
        | "designer"
        | "marketing"
        | "investor"
        | "mentor"
        | "aspiring_entrepreneur"
        | "other"
      membership_status:
        | "not_started"
        | "profile_incomplete"
        | "claim_submitted"
        | "pending_verification"
        | "approved"
        | "active"
        | "rejected"
        | "suspended"
        | "revoked"
        | "expired"
      payment_status: "not_required" | "pending" | "paid" | "refunded"
      publication_status: "draft" | "pending" | "published" | "archived"
      registration_status:
        | "draft"
        | "pending"
        | "pending_review"
        | "pending_payment"
        | "payment_verification"
        | "confirmed"
        | "waitlisted"
        | "cancelled"
        | "refunded"
        | "checked_in"
      review_moderation_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
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
      attendance_status: ["not_attended", "checked_in", "no_show"],
      community_goal: [
        "networking",
        "technical_collaboration",
        "finding_co_founder",
        "mentorship",
        "product_development",
        "marketing",
        "funding_connections",
        "hiring",
        "startup_learning",
        "community_participation",
      ],
      consultation_status: [
        "submitted",
        "under_review",
        "more_info_required",
        "approved",
        "scheduled",
        "completed",
        "declined",
        "cancelled",
      ],
      member_designation: [
        "startup_founder",
        "co_founder",
        "team_member",
        "developer",
        "student_entrepreneur",
        "designer",
        "marketing",
        "investor",
        "mentor",
        "aspiring_entrepreneur",
        "other",
      ],
      membership_status: [
        "not_started",
        "profile_incomplete",
        "claim_submitted",
        "pending_verification",
        "approved",
        "active",
        "rejected",
        "suspended",
        "revoked",
        "expired",
      ],
      payment_status: ["not_required", "pending", "paid", "refunded"],
      publication_status: ["draft", "pending", "published", "archived"],
      registration_status: [
        "draft",
        "pending",
        "pending_review",
        "pending_payment",
        "payment_verification",
        "confirmed",
        "waitlisted",
        "cancelled",
        "refunded",
        "checked_in",
      ],
      review_moderation_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
      ],
    },
  },
} as const
