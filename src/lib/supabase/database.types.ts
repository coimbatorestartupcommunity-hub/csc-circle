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
      attendance_checkins: {
        Row: {
          checked_in_at: string
          event_id: string
          id: string
          registration_id: string
          staff_id: string
        }
        Insert: {
          checked_in_at?: string
          event_id: string
          id?: string
          registration_id: string
          staff_id: string
        }
        Update: {
          checked_in_at?: string
          event_id?: string
          id?: string
          registration_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_checkins_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
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
      collaboration_media: {
        Row: {
          alt_text: string | null
          caption: string | null
          collaboration_id: string
          created_at: string
          display_order: number
          id: string
          media_path: string
          media_type: string
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          collaboration_id: string
          created_at?: string
          display_order?: number
          id?: string
          media_path: string
          media_type?: string
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          collaboration_id?: string
          created_at?: string
          display_order?: number
          id?: string
          media_path?: string
          media_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_media_collaboration_id_fkey"
            columns: ["collaboration_id"]
            isOneToOne: false
            referencedRelation: "collaborations"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_organizations: {
        Row: {
          approved_social_urls: Json
          created_at: string
          description: string | null
          id: string
          logo_path: string | null
          name: string
          organization_type: string
          publication_status: Database["public"]["Enums"]["publication_status"]
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          approved_social_urls?: Json
          created_at?: string
          description?: string | null
          id?: string
          logo_path?: string | null
          name: string
          organization_type?: string
          publication_status?: Database["public"]["Enums"]["publication_status"]
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          approved_social_urls?: Json
          created_at?: string
          description?: string | null
          id?: string
          logo_path?: string | null
          name?: string
          organization_type?: string
          publication_status?: Database["public"]["Enums"]["publication_status"]
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      collaboration_partners: {
        Row: {
          collaboration_id: string
          created_at: string
          display_order: number
          id: string
          organization_id: string
          participation_role: string | null
        }
        Insert: {
          collaboration_id: string
          created_at?: string
          display_order?: number
          id?: string
          organization_id: string
          participation_role?: string | null
        }
        Update: {
          collaboration_id?: string
          created_at?: string
          display_order?: number
          id?: string
          organization_id?: string
          participation_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_partners_collaboration_id_fkey"
            columns: ["collaboration_id"]
            isOneToOne: false
            referencedRelation: "collaborations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_partners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "collaboration_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborations: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          event_date: string | null
          event_id: string | null
          featured_image_path: string | null
          highlights: Json
          id: string
          meta_description: string | null
          publication_status: Database["public"]["Enums"]["publication_status"]
          published_at: string | null
          seo_title: string | null
          slug: string
          status: string
          story: string | null
          summary: string | null
          tagline: string | null
          title: string
          updated_at: string
          updated_by: string | null
          venue_address: string | null
          venue_name: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          event_id?: string | null
          featured_image_path?: string | null
          highlights?: Json
          id?: string
          meta_description?: string | null
          publication_status?: Database["public"]["Enums"]["publication_status"]
          published_at?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          story?: string | null
          summary?: string | null
          tagline?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          venue_address?: string | null
          venue_name?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          event_id?: string | null
          featured_image_path?: string | null
          highlights?: Json
          id?: string
          meta_description?: string | null
          publication_status?: Database["public"]["Enums"]["publication_status"]
          published_at?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          story?: string | null
          summary?: string | null
          tagline?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          venue_address?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
          created_by: string | null
          deleted_at: string | null
          key: string
          label: string
          status: Database["public"]["Enums"]["publication_status"]
          updated_at: string
          updated_by: string | null
          value: string
          visible_from: string | null
          visible_until: string | null
        }
        Insert: {
          created_by?: string | null
          deleted_at?: string | null
          key: string
          label: string
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
          updated_by?: string | null
          value?: string
          visible_from?: string | null
          visible_until?: string | null
        }
        Update: {
          created_by?: string | null
          deleted_at?: string | null
          key?: string
          label?: string
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
          updated_by?: string | null
          value?: string
          visible_from?: string | null
          visible_until?: string | null
        }
        Relationships: []
      }
      directory_startups: {
        Row: {
          collaboration: string[]
          created_at: string
          description: string
          details: Json
          directory_image_path: string | null
          founder: Json
          id: string
          industry: string
          logo_url: string | null
          name: string
          publication_consent: boolean
          publication_consent_at: string | null
          revision_version: number
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
          details?: Json
          directory_image_path?: string | null
          founder?: Json
          id?: string
          industry?: string
          logo_url?: string | null
          name: string
          publication_consent?: boolean
          publication_consent_at?: string | null
          revision_version?: number
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
          details?: Json
          directory_image_path?: string | null
          founder?: Json
          id?: string
          industry?: string
          logo_url?: string | null
          name?: string
          publication_consent?: boolean
          publication_consent_at?: string | null
          revision_version?: number
          slug?: string
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      directory_startup_private_details: {
        Row: { created_at: string; details: Json; startup_id: string; updated_at: string; user_id: string }
        Insert: { created_at?: string; details?: Json; startup_id: string; updated_at?: string; user_id: string }
        Update: { created_at?: string; details?: Json; startup_id?: string; updated_at?: string; user_id?: string }
        Relationships: []
      }
      directory_startup_revisions: {
        Row: { base_version: number; created_at: string; id: string; proposed_data: Json; proposed_private_details: Json; review_reason: string | null; reviewed_at: string | null; reviewed_by: string | null; startup_id: string; status: string; submitted_at: string | null; submitted_by: string; updated_at: string }
        Insert: { base_version: number; created_at?: string; id?: string; proposed_data: Json; proposed_private_details?: Json; review_reason?: string | null; reviewed_at?: string | null; reviewed_by?: string | null; startup_id: string; status?: string; submitted_at?: string | null; submitted_by: string; updated_at?: string }
        Update: { base_version?: number; created_at?: string; id?: string; proposed_data?: Json; proposed_private_details?: Json; review_reason?: string | null; reviewed_at?: string | null; reviewed_by?: string | null; startup_id?: string; status?: string; submitted_at?: string | null; submitted_by?: string; updated_at?: string }
        Relationships: []
      }
      event_registration_import_metadata: {
        Row: { created_at: string; metadata: Json; registration_id: string }
        Insert: { created_at?: string; metadata?: Json; registration_id: string }
        Update: { created_at?: string; metadata?: Json; registration_id?: string }
        Relationships: [{ foreignKeyName: "event_registration_import_metadata_registration_id_fkey"; columns: ["registration_id"]; isOneToOne: true; referencedRelation: "event_registrations"; referencedColumns: ["id"] }]
      }
      event_registrations: {
        Row: {
          attendee_name: string | null
          paid_registration_id: string | null
          source: string
          source_email: string | null
          source_timestamp: string | null
          source_parent_registration_id: string | null
          attendance: Database["public"]["Enums"]["attendance_status"]
          created_at: string
          event_id: string
          goal: string | null
          id: string
          pass_token: string | null
          payment: Database["public"]["Enums"]["payment_status"]
          reference: string
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          attendee_name?: string | null
          paid_registration_id?: string | null
          source?: string
          source_email?: string | null
          source_timestamp?: string | null
          source_parent_registration_id?: string | null
          attendance?: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          event_id: string
          goal?: string | null
          id?: string
          pass_token?: string | null
          payment?: Database["public"]["Enums"]["payment_status"]
          reference: string
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          attendee_name?: string | null
          paid_registration_id?: string | null
          source?: string
          source_email?: string | null
          source_timestamp?: string | null
          source_parent_registration_id?: string | null
          attendance?: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          event_id?: string
          goal?: string | null
          id?: string
          pass_token?: string | null
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
          {
            foreignKeyName: "event_registrations_paid_registration_id_fkey"
            columns: ["paid_registration_id"]
            isOneToOne: false
            referencedRelation: "paid_event_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_source_parent_registration_id_fkey"
            columns: ["source_parent_registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff: {
        Row: {
          event_id: string
          user_id: string
        }
        Insert: {
          event_id: string
          user_id: string
        }
        Update: {
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_event_id_fkey"
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
          approval_mode: string
          capacity: number | null
          category: string
          cover_image: string | null
          cover_image_alt: string | null
          created_at: string
          description: string
          ends_at: string
          featured: boolean
          format: string
          id: string
          location: string
          maps_url: string | null
          max_attendees_per_registration: number
          organizer: string
          price_minor: number
          price_per_attendee: number | null
          payment_note: string | null
          registration_deadline: string | null
          registration_mode: Database["public"]["Enums"]["event_registration_mode"]
          registration_state: string
          settings: Json
          slug: string
          starts_at: string
          summary: string
          status: Database["public"]["Enums"]["publication_status"]
          title: string
          upi_payee_name: string | null
          upi_qr_path: string | null
          upi_vpa: string | null
          venue: string | null
        }
        Insert: {
          admission?: string
          approval_mode?: string
          capacity?: number | null
          category: string
          cover_image?: string | null
          cover_image_alt?: string | null
          created_at?: string
          description?: string
          ends_at: string
          featured?: boolean
          format?: string
          id?: string
          location: string
          maps_url?: string | null
          max_attendees_per_registration?: number
          organizer?: string
          price_minor?: number
          price_per_attendee?: number | null
          payment_note?: string | null
          registration_deadline?: string | null
          registration_mode?: Database["public"]["Enums"]["event_registration_mode"]
          registration_state?: string
          settings?: Json
          slug: string
          starts_at: string
          summary?: string
          status?: Database["public"]["Enums"]["publication_status"]
          title: string
          upi_payee_name?: string | null
          upi_qr_path?: string | null
          upi_vpa?: string | null
          venue?: string | null
        }
        Update: {
          admission?: string
          approval_mode?: string
          capacity?: number | null
          category?: string
          cover_image?: string | null
          cover_image_alt?: string | null
          created_at?: string
          description?: string
          ends_at?: string
          featured?: boolean
          format?: string
          id?: string
          location?: string
          maps_url?: string | null
          max_attendees_per_registration?: number
          organizer?: string
          price_minor?: number
          price_per_attendee?: number | null
          payment_note?: string | null
          registration_deadline?: string | null
          registration_mode?: Database["public"]["Enums"]["event_registration_mode"]
          registration_state?: string
          settings?: Json
          slug?: string
          starts_at?: string
          summary?: string
          status?: Database["public"]["Enums"]["publication_status"]
          title?: string
          upi_payee_name?: string | null
          upi_qr_path?: string | null
          upi_vpa?: string | null
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
          verification_token: string | null
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
          verification_token?: string | null
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
          verification_token?: string | null
        }
        Relationships: []
      }
      notification_deliveries: {
        Row: {
          accepted_at: string | null
          error_code: string | null
          notification_id: string
          recipient_digest: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          error_code?: string | null
          notification_id: string
          recipient_digest: string
          status: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          error_code?: string | null
          notification_id?: string
          recipient_digest?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_worker_state: {
        Row: {
          locked_until: string | null
          singleton: boolean
          worker_id: string | null
        }
        Insert: {
          locked_until?: string | null
          singleton?: boolean
          worker_id?: string | null
        }
        Update: {
          locked_until?: string | null
          singleton?: boolean
          worker_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          accepted_at: string | null
          action_url: string | null
          attempts: number
          audience: string
          available_at: string
          channel: string
          created_at: string
          delivered_at: string | null
          dedupe_key: string | null
          id: string
          last_error: string | null
          lease_id: string | null
          locked_until: string | null
          max_attempts: number
          message: string | null
          payload: Json | null
          recipient: string | null
          recipient_user_id: string | null
          read_at: string | null
          related_record_id: string | null
          related_record_type: string | null
          sent_at: string | null
          status: string
          title: string | null
          template_key: string | null
          template_version: number
          type: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          action_url?: string | null
          attempts?: number
          audience?: string
          available_at?: string
          channel: string
          created_at?: string
          delivered_at?: string | null
          dedupe_key?: string | null
          id?: string
          last_error?: string | null
          lease_id?: string | null
          locked_until?: string | null
          max_attempts?: number
          message?: string | null
          payload?: Json | null
          recipient?: string | null
          recipient_user_id?: string | null
          read_at?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          sent_at?: string | null
          status?: string
          title?: string | null
          template_key?: string | null
          template_version?: number
          type: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          action_url?: string | null
          attempts?: number
          audience?: string
          available_at?: string
          channel?: string
          created_at?: string
          delivered_at?: string | null
          dedupe_key?: string | null
          id?: string
          last_error?: string | null
          lease_id?: string | null
          locked_until?: string | null
          max_attempts?: number
          message?: string | null
          payload?: Json | null
          recipient?: string | null
          recipient_user_id?: string | null
          read_at?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          sent_at?: string | null
          status?: string
          title?: string | null
          template_key?: string | null
          template_version?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          evidence_path: string | null
          id: string
          reference: string | null
          registration_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency?: string
          evidence_path?: string | null
          id?: string
          reference?: string | null
          registration_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          evidence_path?: string | null
          id?: string
          reference?: string | null
          registration_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about_me: string
          avatar_url: string | null
          city: string | null
          directory_photo_path: string | null
          consent: Json
          created_at: string
          designations: Database["public"]["Enums"]["member_designation"][]
          display_name: string | null
          email: string | null
          full_name: string | null
          goals: Database["public"]["Enums"]["community_goal"][]
          id: string
          profile_completion: number
          portrait_original_path: string | null
          portrait_path: string | null
          portrait_public: boolean
          skills: string[]
          startup: Json | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          about_me?: string
          avatar_url?: string | null
          city?: string | null
          directory_photo_path?: string | null
          consent?: Json
          created_at?: string
          designations?: Database["public"]["Enums"]["member_designation"][]
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          goals?: Database["public"]["Enums"]["community_goal"][]
          id: string
          profile_completion?: number
          portrait_original_path?: string | null
          portrait_path?: string | null
          portrait_public?: boolean
          skills?: string[]
          startup?: Json | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          about_me?: string
          avatar_url?: string | null
          city?: string | null
          directory_photo_path?: string | null
          consent?: Json
          created_at?: string
          designations?: Database["public"]["Enums"]["member_designation"][]
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          goals?: Database["public"]["Enums"]["community_goal"][]
          id?: string
          profile_completion?: number
          portrait_original_path?: string | null
          portrait_path?: string | null
          portrait_public?: boolean
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
          publication_consent: boolean
          publication_consent_at: string | null
          publication_consent_version: string | null
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
          publication_consent?: boolean
          publication_consent_at?: string | null
          publication_consent_version?: string | null
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
          publication_consent?: boolean
          publication_consent_at?: string | null
          publication_consent_version?: string | null
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
      paid_event_registrations: {
        Row: { member_registration_id: string | null; pass_token: string | null; reference: string; user_id: string | null; additional_attendee_names: string | null; attendee_count: number; consent_contact: boolean; consent_payment_terms: boolean; created_at: string; dietary_accessibility_notes: string | null; email: string; event_id: string; full_name: string; id: string; organization: string; payment_screenshot_path: string; referral_source: Database["public"]["Enums"]["paid_registration_referral"] | null; reviewed_at: string | null; reviewed_by: string | null; review_note: string | null; role: Database["public"]["Enums"]["paid_registration_role"]; status: Database["public"]["Enums"]["paid_registration_status"]; total_amount_paid: number; upi_transaction_ref: string; whatsapp: string }
        Insert: { member_registration_id?: string | null; pass_token?: string | null; reference?: string; user_id?: string | null; additional_attendee_names?: string | null; attendee_count: number; consent_contact: boolean; consent_payment_terms: boolean; created_at?: string; dietary_accessibility_notes?: string | null; email: string; event_id: string; full_name: string; id?: string; organization: string; payment_screenshot_path: string; referral_source?: Database["public"]["Enums"]["paid_registration_referral"] | null; reviewed_at?: string | null; reviewed_by?: string | null; review_note?: string | null; role: Database["public"]["Enums"]["paid_registration_role"]; status?: Database["public"]["Enums"]["paid_registration_status"]; total_amount_paid: number; upi_transaction_ref: string; whatsapp: string }
        Update: { member_registration_id?: string | null; pass_token?: string | null; reference?: string; user_id?: string | null; additional_attendee_names?: string | null; attendee_count?: number; consent_contact?: boolean; consent_payment_terms?: boolean; created_at?: string; dietary_accessibility_notes?: string | null; email?: string; event_id?: string; full_name?: string; id?: string; organization?: string; payment_screenshot_path?: string; referral_source?: Database["public"]["Enums"]["paid_registration_referral"] | null; reviewed_at?: string | null; reviewed_by?: string | null; review_note?: string | null; role?: Database["public"]["Enums"]["paid_registration_role"]; status?: Database["public"]["Enums"]["paid_registration_status"]; total_amount_paid?: number; upi_transaction_ref?: string; whatsapp?: string }
        Relationships: [{ foreignKeyName: "paid_event_registrations_event_id_fkey"; columns: ["event_id"]; isOneToOne: false; referencedRelation: "events"; referencedColumns: ["id"] }, { foreignKeyName: "paid_event_registrations_member_registration_id_fkey"; columns: ["member_registration_id"]; isOneToOne: false; referencedRelation: "event_registrations"; referencedColumns: ["id"] }]
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
      get_member_resume: { Args: never; Returns: Json }
      save_member_resume: { Args: { p_resume_data: Json }; Returns: string }
      save_member_startup: { Args: { p_private_details?: Json; p_startup: Json }; Returns: string }
      get_member_profile_sharing_state: { Args: never; Returns: Json }
      set_member_profile_sharing: { Args: { p_enabled: boolean; p_preferences?: Json }; Returns: Json }
      update_member_profile_preferences: { Args: { p_consent: Json }; Returns: undefined }
      submit_startup_revision: { Args: { p_private_details: Json; p_proposed: Json; p_revision_id: string; p_startup_id: string; p_submit?: boolean }; Returns: string }
      review_startup_revision: { Args: { p_decision: string; p_reason?: string; p_revision_id: string }; Returns: Json }
      list_discoverable_members: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: { about_me: string | null; city: string | null; designation: string | null; display_name: string; has_photo: boolean; member_id: string; skills: string[]; startup_name: string | null; whatsapp: string | null }[]
      }
      get_discoverable_member: {
        Args: { p_member_id: string }
        Returns: { about_me: string | null; city: string | null; designation: string | null; display_name: string; has_photo: boolean; member_id: string; skills: string[]; startup_name: string | null; startup_website: string | null; whatsapp: string | null }[]
      }
      get_directory_startup_contacts: { Args: { p_startup_id: string }; Returns: Json }
      csc_save_collaboration_organization: { Args: { payload: Json }; Returns: string }
      csc_save_collaboration: { Args: { payload: Json }; Returns: string }
      csc_accept_admin_role_invitation_in_app: { Args: { p_invitation_id: string }; Returns: Json }
      csc_admin_action: {
        Args: { decision: string; kind: string; reason: string; target: string }
        Returns: Json
      }
      csc_resend_event_pass: { Args: { p_registration_id: string }; Returns: boolean }
      csc_begin_email_delivery: {
        Args: { digest: string; job: string; lease: string }
        Returns: boolean
      }
      csc_check_in: { Args: { event: string; token: string }; Returns: Json }
      csc_claim_notifications: {
        Args: { batch?: number; worker?: string }
        Returns: {
          accepted_at: string | null
          action_url: string | null
          attempts: number
          audience: string
          available_at: string
          channel: string
          created_at: string
          delivered_at: string | null
          dedupe_key: string | null
          id: string
          last_error: string | null
          lease_id: string | null
          locked_until: string | null
          max_attempts: number
          message: string | null
          payload: Json | null
          recipient: string | null
          recipient_user_id: string | null
          read_at: string | null
          related_record_id: string | null
          related_record_type: string | null
          sent_at: string | null
          status: string
          title: string | null
          template_key: string | null
          template_version: number
          type: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }

      csc_email_budget_available: { Args: never; Returns: boolean }
      csc_ensure_profile: { Args: never; Returns: undefined }
      csc_finish_email_delivery: {
        Args: {
          code: string
          digest: string
          job: string
          lease: string
          outcome: string
        }
        Returns: undefined
      }
      csc_finish_notification: {
        Args: { code: string; job: string; lease: string; outcome: string }
        Returns: undefined
      }
      csc_notification_recipient: { Args: { member: string }; Returns: string }
      csc_register_event: {
        Args: { event: string; objective: string }
        Returns: Json
      }
      csc_release_notification_dispatch: {
        Args: { worker: string }
        Returns: undefined
      }
      csc_retry_notification: {
        Args: { acknowledge_ambiguous?: boolean; job: string; reason: string }
        Returns: undefined
      }
      csc_save_content: {
        Args: { content_key: string; content_value: string; publish: boolean }
        Returns: undefined
      }
      csc_manage_content: {
        Args: { action: string; content_key: string; content_value: string; visible_from?: string | null; visible_until?: string | null }
        Returns: Json
      }
      csc_save_event: {
        Args: { payload: Json; target?: string }
        Returns: string
      }
      csc_schedule_event_reminders: { Args: never; Returns: number }
      csc_verify_membership: { Args: { token: string }; Returns: boolean }
      csc_validate_member_session: { Args: never; Returns: boolean }
      csc_member_notification_inbox: { Args: never; Returns: Json }
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
      event_registration_mode: "rsvp" | "paid_upi"
      paid_registration_status: "pending_verification" | "confirmed" | "rejected" | "cancelled"
      paid_registration_role: "Startup Founder / Co-Founder" | "Entrepreneur / Business Owner" | "Working Professional" | "Student" | "Freelancer / Creator" | "Aspiring Entrepreneur" | "Other"
      paid_registration_referral: "Instagram" | "WhatsApp" | "LinkedIn" | "Friends / Referral" | "CSC Community" | "Other"
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
      event_registration_mode: ["rsvp", "paid_upi"],
      paid_registration_status: ["pending_verification", "confirmed", "rejected", "cancelled"],
      paid_registration_role: ["Startup Founder / Co-Founder", "Entrepreneur / Business Owner", "Working Professional", "Student", "Freelancer / Creator", "Aspiring Entrepreneur", "Other"],
      paid_registration_referral: ["Instagram", "WhatsApp", "LinkedIn", "Friends / Referral", "CSC Community", "Other"],
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
