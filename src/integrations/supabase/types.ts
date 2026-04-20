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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      application_status_history: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_at: string
          ats_score: number
          cover_note: string | null
          id: string
          job_id: string
          match_score: number
          missing_skills: string[]
          status: Database["public"]["Enums"]["application_status"]
          student_id: string
          suggestions: string | null
          updated_at: string
        }
        Insert: {
          applied_at?: string
          ats_score?: number
          cover_note?: string | null
          id?: string
          job_id: string
          match_score?: number
          missing_skills?: string[]
          status?: Database["public"]["Enums"]["application_status"]
          student_id: string
          suggestions?: string | null
          updated_at?: string
        }
        Update: {
          applied_at?: string
          ats_score?: number
          cover_note?: string | null
          id?: string
          job_id?: string
          match_score?: number
          missing_skills?: string[]
          status?: Database["public"]["Enums"]["application_status"]
          student_id?: string
          suggestions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          company_name: string
          created_at: string
          description: string | null
          industry: string | null
          location: string | null
          logo_url: string | null
          updated_at: string
          user_id: string
          verified: boolean
          website: string | null
        }
        Insert: {
          company_name?: string
          created_at?: string
          description?: string | null
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          description?: string | null
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      interviews: {
        Row: {
          application_id: string
          created_at: string
          created_by: string
          duration_minutes: number
          id: string
          location: string | null
          notes: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["interview_status"]
          type: Database["public"]["Enums"]["interview_type"]
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by: string
          duration_minutes?: number
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["interview_status"]
          type?: Database["public"]["Enums"]["interview_type"]
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string
          duration_minutes?: number
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["interview_status"]
          type?: Database["public"]["Enums"]["interview_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company_id: string
          created_at: string
          description: string
          experience_level: Database["public"]["Enums"]["experience_level"]
          expires_at: string | null
          id: string
          is_open: boolean
          job_type: Database["public"]["Enums"]["job_type"]
          location: string | null
          preferred_roles: string[]
          required_skills: string[]
          salary_max: number | null
          salary_min: number | null
          title: string
          updated_at: string
          work_mode: Database["public"]["Enums"]["work_mode"]
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string
          experience_level?: Database["public"]["Enums"]["experience_level"]
          expires_at?: string | null
          id?: string
          is_open?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: string | null
          preferred_roles?: string[]
          required_skills?: string[]
          salary_max?: number | null
          salary_min?: number | null
          title: string
          updated_at?: string
          work_mode?: Database["public"]["Enums"]["work_mode"]
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          experience_level?: Database["public"]["Enums"]["experience_level"]
          expires_at?: string | null
          id?: string
          is_open?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: string | null
          preferred_roles?: string[]
          required_skills?: string[]
          salary_max?: number | null
          salary_min?: number | null
          title?: string
          updated_at?: string
          work_mode?: Database["public"]["Enums"]["work_mode"]
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          student_id?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          bio: string | null
          created_at: string
          education: string | null
          experience_level: Database["public"]["Enums"]["experience_level"]
          headline: string | null
          location: string | null
          phone: string | null
          preferred_roles: string[]
          projects: string | null
          resume_text: string | null
          resume_url: string | null
          skills: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          education?: string | null
          experience_level?: Database["public"]["Enums"]["experience_level"]
          headline?: string | null
          location?: string | null
          phone?: string | null
          preferred_roles?: string[]
          projects?: string | null
          resume_text?: string | null
          resume_url?: string | null
          skills?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          education?: string | null
          experience_level?: Database["public"]["Enums"]["experience_level"]
          headline?: string | null
          location?: string | null
          phone?: string | null
          preferred_roles?: string[]
          projects?: string | null
          resume_text?: string | null
          resume_url?: string | null
          skills?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      close_expired_jobs: { Args: never; Returns: number }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "company" | "admin"
      application_status:
        | "applied"
        | "shortlisted"
        | "interview"
        | "accepted"
        | "rejected"
      experience_level: "entry" | "junior" | "mid" | "senior"
      interview_status: "scheduled" | "completed" | "cancelled"
      interview_type: "online" | "onsite"
      job_type: "full_time" | "part_time" | "internship" | "contract"
      work_mode: "remote" | "hybrid" | "onsite"
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
      app_role: ["student", "company", "admin"],
      application_status: [
        "applied",
        "shortlisted",
        "interview",
        "accepted",
        "rejected",
      ],
      experience_level: ["entry", "junior", "mid", "senior"],
      interview_status: ["scheduled", "completed", "cancelled"],
      interview_type: ["online", "onsite"],
      job_type: ["full_time", "part_time", "internship", "contract"],
      work_mode: ["remote", "hybrid", "onsite"],
    },
  },
} as const
