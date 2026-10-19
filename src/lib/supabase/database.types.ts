export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type OperationalTable<R> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: [] }

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      notification_deliveries: OperationalTable<{ notification_id: string; recipient_digest: string; status: string; error_code: string | null; accepted_at: string | null; updated_at: string }>

      payments: OperationalTable<{ id: string; registration_id: string; amount_minor: number; currency: string; status: string; reference: string | null; evidence_path: string | null; reviewed_by: string | null; reviewed_at: string | null; created_at: string }>
      event_staff: OperationalTable<{ event_id: string; user_id: string }>
      attendance_checkins: OperationalTable<{ id: string; registration_id: string; event_id: string; staff_id: string; checked_in_at: string }>

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
      consultation_submissions: {
        Row: {
          assigned_rep: string | null
          challenge: string | null
          consent: boolean
          created_at: string
          email: string
          full_name: string
          goal: string | null
          id: string
          member_notes: string | null
          scheduled_at: string | null
          startup: string | null
          status: Database["public"]["Enums"]["consultation_status"]
          updated_at: string
          whatsapp: string
        }
        Insert: {
          assigned_rep?: string | null
          challenge?: string | null
          consent?: boolean
          created_at?: string
          email: string
          full_name: string
          goal?: string | null
          id?: string
          member_notes?: string | null
          scheduled_at?: string | null
          startup?: string | null
          status?: Database["public"]["Enums"]["consultation_status"]
          updated_at?: string
          whatsapp: string
        }
        Update: {
          assigned_rep?: string | null
          challenge?: string | null
          consent?: boolean
          created_at?: string
          email?: string
          full_name?: string
          goal?: string | null
          id?: string
          member_notes?: string | null
          scheduled_at?: string | null
          startup?: string | null
          status?: Database["public"]["Enums"]["consultation_status"]
          updated_at?: string
          whatsapp?: string
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
          pass_token: string | null
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
          price_minor: number
          settings: Json
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
          verification_token: string | null
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
          template_key: string | null
          template_version: number
          recipient_user_id: string | null
          audience: string
          related_record_type: string | null
          related_record_id: string | null
          max_attempts: number
          attempts: number
          available_at: string
          locked_until: string | null
          lease_id: string | null
          accepted_at: string | null
          last_error: string | null
          dedupe_key: string | null
          updated_at: string
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
      rsvp_submissions: {
        Row: {
          consent: boolean
          created_at: string
          email: string
          event_id: string | null
          event_label: string | null
          full_name: string
          goal: string | null
          id: string
          startup: string | null
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          consent?: boolean
          created_at?: string
          email: string
          event_id?: string | null
          event_label?: string | null
          full_name: string
          goal?: string | null
          id?: string
          startup?: string | null
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          consent?: boolean
          created_at?: string
          email?: string
          event_id?: string | null
          event_label?: string | null
          full_name?: string
          goal?: string | null
          id?: string
          startup?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_submissions_event_id_fkey"
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
      csc_claim_notifications: { Args: { batch: number; worker: string }; Returns: Database["public"]["Tables"]["notifications"]["Row"][] }
      csc_begin_email_delivery: { Args: { job: string; lease: string; digest: string }; Returns: boolean }
      csc_finish_email_delivery: { Args: { job: string; lease: string; digest: string; outcome: string; code: string }; Returns: undefined }
      csc_finish_notification: { Args: { job: string; lease: string; outcome: string; code: string }; Returns: undefined }
      csc_notification_recipient: { Args: { member: string }; Returns: string }
      csc_release_notification_dispatch: { Args: { worker: string }; Returns: undefined }
      csc_email_budget_available: { Args: Record<string, never>; Returns: boolean }
      csc_retry_notification: { Args: { job: string; reason: string; acknowledge_ambiguous: boolean }; Returns: undefined }
      csc_schedule_event_reminders: { Args: Record<string, never>; Returns: number }

      csc_save_content: { Args: { content_key: string; content_value: string; publish: boolean }; Returns: undefined }
      csc_admin_action: { Args: { kind: string; target: string; decision: string; reason: string }; Returns: Json }
      csc_register_event: { Args: { event: string; objective: string }; Returns: Json }
      csc_check_in: { Args: { event: string; token: string }; Returns: Json }
      csc_save_event: { Args: { payload: Json; target?: string | null }; Returns: string }
      csc_verify_membership: { Args: { token: string }; Returns: boolean }
      csc_ensure_profile: { Args: Record<string, never>; Returns: undefined }

      is_admin: { Args: never; Returns: boolean }
      next_member_number: { Args: never; Returns: string }
      submit_consultation: {
        Args: {
          p_challenge: string
          p_email: string
          p_full_name: string
          p_startup: string
          p_whatsapp: string
        }
        Returns: string
      }
      submit_rsvp: {
        Args: {
          p_email: string
          p_event_id: string
          p_event_label: string
          p_full_name: string
          p_goal: string
          p_startup: string
          p_whatsapp: string
        }
        Returns: string
      }
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
