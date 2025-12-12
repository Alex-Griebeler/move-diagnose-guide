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
      anamnesis_responses: {
        Row: {
          activity_duration_minutes: number | null
          activity_frequency: number | null
          activity_types: Json | null
          assessment_id: string
          birth_date: string | null
          created_at: string
          has_red_flags: boolean | null
          height_cm: number | null
          id: string
          laterality: Database["public"]["Enums"]["laterality"] | null
          lgpd_consent: boolean | null
          lgpd_consent_date: string | null
          objectives: string | null
          occupation: string | null
          pain_history: Json | null
          red_flags: Json | null
          sedentary_hours_per_day: number | null
          sleep_hours: number | null
          sleep_quality: number | null
          sports: Json | null
          surgeries: Json | null
          time_horizon: string | null
          updated_at: string
          weight_kg: number | null
          work_type: string | null
        }
        Insert: {
          activity_duration_minutes?: number | null
          activity_frequency?: number | null
          activity_types?: Json | null
          assessment_id: string
          birth_date?: string | null
          created_at?: string
          has_red_flags?: boolean | null
          height_cm?: number | null
          id?: string
          laterality?: Database["public"]["Enums"]["laterality"] | null
          lgpd_consent?: boolean | null
          lgpd_consent_date?: string | null
          objectives?: string | null
          occupation?: string | null
          pain_history?: Json | null
          red_flags?: Json | null
          sedentary_hours_per_day?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          sports?: Json | null
          surgeries?: Json | null
          time_horizon?: string | null
          updated_at?: string
          weight_kg?: number | null
          work_type?: string | null
        }
        Update: {
          activity_duration_minutes?: number | null
          activity_frequency?: number | null
          activity_types?: Json | null
          assessment_id?: string
          birth_date?: string | null
          created_at?: string
          has_red_flags?: boolean | null
          height_cm?: number | null
          id?: string
          laterality?: Database["public"]["Enums"]["laterality"] | null
          lgpd_consent?: boolean | null
          lgpd_consent_date?: string | null
          objectives?: string | null
          occupation?: string | null
          pain_history?: Json | null
          red_flags?: Json | null
          sedentary_hours_per_day?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          sports?: Json | null
          surgeries?: Json | null
          time_horizon?: string | null
          updated_at?: string
          weight_kg?: number | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_drafts: {
        Row: {
          assessment_id: string
          current_step: number | null
          draft_data: Json
          id: string
          step_type: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          current_step?: number | null
          draft_data?: Json
          id?: string
          step_type: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          current_step?: number | null
          draft_data?: Json
          id?: string
          step_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_drafts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          professional_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["assessment_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          professional_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          professional_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          body_region: string
          created_at: string
          created_by: string | null
          description: string | null
          fabrik_phase: Database["public"]["Enums"]["fabrik_phase"]
          id: string
          is_active: boolean | null
          name: string
          progression_criteria: string | null
          target_classifications: Json | null
          target_muscles: Json | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          body_region: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          fabrik_phase: Database["public"]["Enums"]["fabrik_phase"]
          id?: string
          is_active?: boolean | null
          name: string
          progression_criteria?: string | null
          target_classifications?: Json | null
          target_muscles?: Json | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          body_region?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          fabrik_phase?: Database["public"]["Enums"]["fabrik_phase"]
          id?: string
          is_active?: boolean | null
          name?: string
          progression_criteria?: string | null
          target_classifications?: Json | null
          target_muscles?: Json | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      functional_findings: {
        Row: {
          assessment_id: string
          associated_injuries: Json | null
          biomechanical_importance: number | null
          body_region: string
          classification_tag: string
          context_weight: number | null
          created_at: string
          hyperactive_muscles: Json | null
          hypoactive_muscles: Json | null
          id: string
          priority_score: number | null
          severity: Database["public"]["Enums"]["severity_level"]
        }
        Insert: {
          assessment_id: string
          associated_injuries?: Json | null
          biomechanical_importance?: number | null
          body_region: string
          classification_tag: string
          context_weight?: number | null
          created_at?: string
          hyperactive_muscles?: Json | null
          hypoactive_muscles?: Json | null
          id?: string
          priority_score?: number | null
          severity?: Database["public"]["Enums"]["severity_level"]
        }
        Update: {
          assessment_id?: string
          associated_injuries?: Json | null
          biomechanical_importance?: number | null
          body_region?: string
          classification_tag?: string
          context_weight?: number | null
          created_at?: string
          hyperactive_muscles?: Json | null
          hypoactive_muscles?: Json | null
          id?: string
          priority_score?: number | null
          severity?: Database["public"]["Enums"]["severity_level"]
        }
        Relationships: [
          {
            foreignKeyName: "functional_findings_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      global_test_results: {
        Row: {
          anterior_view: Json | null
          assessment_id: string
          created_at: string
          id: string
          lateral_view: Json | null
          left_side: Json | null
          media_urls: Json | null
          notes: string | null
          posterior_view: Json | null
          right_side: Json | null
          test_name: string
          updated_at: string
        }
        Insert: {
          anterior_view?: Json | null
          assessment_id: string
          created_at?: string
          id?: string
          lateral_view?: Json | null
          left_side?: Json | null
          media_urls?: Json | null
          notes?: string | null
          posterior_view?: Json | null
          right_side?: Json | null
          test_name: string
          updated_at?: string
        }
        Update: {
          anterior_view?: Json | null
          assessment_id?: string
          created_at?: string
          id?: string
          lateral_view?: Json | null
          left_side?: Json | null
          media_urls?: Json | null
          notes?: string | null
          posterior_view?: Json | null
          right_side?: Json | null
          test_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_test_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_students: {
        Row: {
          created_at: string
          id: string
          professional_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          professional_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          professional_id?: string
          student_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      progress_logs: {
        Row: {
          completed_at: string
          difficulty_rating: number | null
          exercise_id: string
          id: string
          notes: string | null
          protocol_id: string
          student_id: string
        }
        Insert: {
          completed_at?: string
          difficulty_rating?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          protocol_id: string
          student_id: string
        }
        Update: {
          completed_at?: string
          difficulty_rating?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          protocol_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_logs_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocols: {
        Row: {
          assessment_id: string
          completion_percentage: number | null
          created_at: string
          duration_weeks: number | null
          exercises: Json
          frequency_per_week: number | null
          id: string
          name: string | null
          next_review_date: string | null
          phase: number | null
          priority_level: Database["public"]["Enums"]["priority_level"]
          updated_at: string
        }
        Insert: {
          assessment_id: string
          completion_percentage?: number | null
          created_at?: string
          duration_weeks?: number | null
          exercises?: Json
          frequency_per_week?: number | null
          id?: string
          name?: string | null
          next_review_date?: string | null
          phase?: number | null
          priority_level?: Database["public"]["Enums"]["priority_level"]
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          completion_percentage?: number | null
          created_at?: string
          duration_weeks?: number | null
          exercises?: Json
          frequency_per_week?: number | null
          id?: string
          name?: string | null
          next_review_date?: string | null
          phase?: number | null
          priority_level?: Database["public"]["Enums"]["priority_level"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocols_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_protocol_sessions: {
        Row: {
          affected_side: string | null
          assessment_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          intervention_applied: Json | null
          primary_deficit: string | null
          professional_id: string
          protocol_type: string
          retest_feedback: string | null
          retest_result: string | null
          secondary_deficits: Json | null
          status: string
          student_id: string
          test_results: Json
          updated_at: string
        }
        Insert: {
          affected_side?: string | null
          assessment_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          intervention_applied?: Json | null
          primary_deficit?: string | null
          professional_id: string
          protocol_type?: string
          retest_feedback?: string | null
          retest_result?: string | null
          secondary_deficits?: Json | null
          status?: string
          student_id: string
          test_results?: Json
          updated_at?: string
        }
        Update: {
          affected_side?: string | null
          assessment_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          intervention_applied?: Json | null
          primary_deficit?: string | null
          professional_id?: string
          protocol_type?: string
          retest_feedback?: string | null
          retest_result?: string | null
          secondary_deficits?: Json | null
          status?: string
          student_id?: string
          test_results?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_protocol_sessions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      segmental_test_results: {
        Row: {
          assessment_id: string
          body_region: string
          created_at: string
          cutoff_value: number | null
          id: string
          left_value: number | null
          media_urls: Json | null
          notes: string | null
          pass_fail_left: boolean | null
          pass_fail_right: boolean | null
          right_value: number | null
          test_name: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          assessment_id: string
          body_region: string
          created_at?: string
          cutoff_value?: number | null
          id?: string
          left_value?: number | null
          media_urls?: Json | null
          notes?: string | null
          pass_fail_left?: boolean | null
          pass_fail_right?: boolean | null
          right_value?: number | null
          test_name: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          body_region?: string
          created_at?: string
          cutoff_value?: number | null
          id?: string
          left_value?: number | null
          media_urls?: Json | null
          notes?: string | null
          pass_fail_left?: boolean | null
          pass_fail_right?: boolean | null
          right_value?: number | null
          test_name?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "segmental_test_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
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
      app_role: "professional" | "student"
      assessment_status: "draft" | "in_progress" | "completed" | "archived"
      fabrik_phase:
        | "mobility"
        | "inhibition"
        | "activation"
        | "stability"
        | "strength"
        | "integration"
      laterality: "right" | "left" | "ambidextrous"
      priority_level: "critical" | "high" | "medium" | "low" | "maintenance"
      severity_level: "none" | "mild" | "moderate" | "severe"
      test_type: "global" | "segmental"
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
      app_role: ["professional", "student"],
      assessment_status: ["draft", "in_progress", "completed", "archived"],
      fabrik_phase: [
        "mobility",
        "inhibition",
        "activation",
        "stability",
        "strength",
        "integration",
      ],
      laterality: ["right", "left", "ambidextrous"],
      priority_level: ["critical", "high", "medium", "low", "maintenance"],
      severity_level: ["none", "mild", "moderate", "severe"],
      test_type: ["global", "segmental"],
    },
  },
} as const
