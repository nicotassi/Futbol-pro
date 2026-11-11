/**
 * Tipos de la base de datos (formato de `supabase gen types typescript`).
 *
 * Por ahora cubre las tablas que usa la app en la Fase 2. Con el proyecto
 * vinculado se regeneran completos con:  npm run db:types
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: { display_name?: string };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          first_name: string;
          last_name: string | null;
          birth_date: string | null;
          position: string;
          dominant_foot: Database['public']['Enums']['dominant_foot'] | null;
          club: string | null;
          category: string | null;
          avatar_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: {
          first_name?: string;
          last_name?: string | null;
          birth_date?: string | null;
          position?: string;
          dominant_foot?: Database['public']['Enums']['dominant_foot'] | null;
          club?: string | null;
          category?: string | null;
          avatar_path?: string | null;
        };
        Relationships: [];
      };
      player_access: {
        Row: {
          user_id: string;
          player_id: string;
          role: Database['public']['Enums']['app_role'];
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'player_access_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
        ];
      };
      exercises: {
        Row: {
          id: string;
          player_id: string;
          name: string;
          category: Database['public']['Enums']['exercise_category'];
          objective: string | null;
          description: string | null;
          difficulty: number;
          est_minutes: number | null;
          materials: string[];
          steps: string[];
          common_mistakes: string[];
          precautions: string | null;
          result_indicator: string | null;
          media_path: string | null;
          media_url: string | null;
          is_custom: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          player_id: string;
          name: string;
          category: Database['public']['Enums']['exercise_category'];
          objective?: string | null;
          description?: string | null;
          difficulty?: number;
          est_minutes?: number | null;
          materials?: string[];
          steps?: string[];
          common_mistakes?: string[];
          precautions?: string | null;
          result_indicator?: string | null;
          media_url?: string | null;
          is_custom?: boolean;
        };
        Update: Partial<Database['public']['Tables']['exercises']['Insert']>;
        Relationships: [];
      };
      exercise_favorites: {
        Row: { user_id: string; exercise_id: string; player_id: string; created_at: string };
        Insert: { user_id: string; exercise_id: string; player_id: string };
        Update: never;
        Relationships: [];
      };
      workout_templates: {
        Row: {
          id: string;
          player_id: string;
          name: string;
          objective: string | null;
          notes: string | null;
          est_minutes: number | null;
          is_template: boolean;
          scheduled_for: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      workout_items: {
        Row: {
          id: string;
          template_id: string;
          player_id: string;
          exercise_id: string;
          position: number;
          sets: number | null;
          reps: number | null;
          duration_sec: number | null;
          rest_sec: number | null;
          instructions: string | null;
          removed: boolean;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          id: string;
          player_id: string;
          template_id: string | null;
          title: string;
          started_at: string;
          ended_at: string | null;
          status: Database['public']['Enums']['session_status'];
          actual_minutes: number | null;
          rpe: number | null;
          notes: string | null;
          post_state: number | null;
          client_id: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      session_results: {
        Row: {
          id: string;
          session_id: string;
          player_id: string;
          workout_item_id: string | null;
          exercise_id: string | null;
          completed: boolean;
          sets_done: number | null;
          reps_done: number | null;
          value: number | null;
          unit: string | null;
          notes: string | null;
          removed: boolean;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          player_id: string;
          played_on: string;
          opponent: string;
          competition: string | null;
          goals_for: number | null;
          goals_against: number | null;
          position: string | null;
          minutes: number | null;
          starter: boolean | null;
          notes: string | null;
          client_id: string;
          removed: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: { removed?: boolean };
        Relationships: [];
      };
      match_statistics: {
        Row: {
          match_id: string;
          player_id: string;
          goals: number | null;
          assists: number | null;
          passes_ok: number | null;
          passes_failed: number | null;
          recoveries: number | null;
          interceptions: number | null;
          shots: number | null;
          shots_on_target: number | null;
          duels_won: number | null;
          losses: number | null;
          fouls: number | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      match_reflections: {
        Row: {
          match_id: string;
          player_id: string;
          physical: number | null;
          focus: number | null;
          decisions: number | null;
          offered_support: number | null;
          helped_recover: number | null;
          rating: number | null;
          did_well: string | null;
          to_improve: string | null;
          best_play_what: string | null;
          best_play_decision: string | null;
          best_play_good: string | null;
          best_play_different: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      wellness_logs: {
        Row: {
          id: string;
          player_id: string;
          log_date: string;
          sleep_hours: number | null;
          sleep_quality: number | null;
          energy: number | null;
          soreness: number | null;
          discomfort: string | null;
          motivation: number | null;
          overall: number | null;
          hydration: number | null;
          pain_level: number;
          sick: boolean;
          traffic_light: Database['public']['Enums']['traffic_light'] | null;
          notes: string | null;
          client_id: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          player_id: string;
          name: string;
          description: string | null;
          start_date: string;
          target_date: string | null;
          progress: number;
          status: Database['public']['Enums']['goal_status'];
          notes: string | null;
          approved: boolean;
          proposed_by: string | null;
          removed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          player_id: string;
          name: string;
          description?: string | null;
          start_date?: string;
          target_date?: string | null;
          progress?: number;
          status?: Database['public']['Enums']['goal_status'];
          approved?: boolean;
        };
        Update: Partial<{
          name: string;
          description: string | null;
          target_date: string | null;
          progress: number;
          status: Database['public']['Enums']['goal_status'];
          approved: boolean;
          removed: boolean;
        }>;
        Relationships: [];
      };
      assessments: {
        Row: {
          id: string;
          player_id: string;
          assessed_on: string;
          dimension: Database['public']['Enums']['skill_dimension'];
          test_name: string;
          value: number | null;
          unit: string | null;
          score: number | null;
          notes: string | null;
          removed: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          player_id: string;
          assessed_on: string;
          dimension: Database['public']['Enums']['skill_dimension'];
          test_name: string;
          value?: number | null;
          unit?: string | null;
          score?: number | null;
          notes?: string | null;
        };
        Update: { removed?: boolean };
        Relationships: [];
      };
      watch_uploads: {
        Row: {
          id: string;
          player_id: string;
          workout_session_id: string;
          image_path: string;
          original_filename: string | null;
          image_sha256: string;
          uploaded_at: string;
          processing_status: 'queued' | 'processing' | 'done' | 'failed';
          processing_error: string | null;
          review_status: 'pending' | 'reviewed';
        };
        Insert: {
          player_id: string;
          workout_session_id: string;
          image_path: string;
          original_filename?: string | null;
          image_sha256: string;
        };
        Update: never;
        Relationships: [];
      };
      watch_metrics: {
        Row: {
          id: string;
          upload_id: string | null;
          player_id: string;
          workout_session_id: string;
          metric_type: Database['public']['Enums']['watch_metric_type'];
          metric_value: string;
          metric_unit: string | null;
          source: string | null;
          confidence: number | null;
          validation_status: 'pending' | 'confirmed' | 'corrected' | 'rejected';
          confirmed_value: string | null;
          confirmed_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      calendar_events: {
        Row: {
          id: string;
          player_id: string;
          title: string;
          category: Database['public']['Enums']['calendar_category'];
          event_date: string;
          start_time: string | null;
          est_minutes: number | null;
          description: string | null;
          status: Database['public']['Enums']['event_status'];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          player_id: string;
          title: string;
          category: Database['public']['Enums']['calendar_category'];
          event_date: string;
          start_time?: string | null;
          est_minutes?: number | null;
          description?: string | null;
        };
        Update: { status?: Database['public']['Enums']['event_status'] };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      save_workout: { Args: { p_workout: Json; p_items: Json }; Returns: string };
      finish_session: { Args: { p_session: Json; p_results: Json }; Returns: string };
      save_match: { Args: { p_match: Json; p_stats: Json; p_reflection: Json }; Returns: string };
      save_wellness: { Args: { p_log: Json }; Returns: string };
      review_watch_metric: {
        Args: { p_id: string; p_action: string; p_value: string };
        Returns: undefined;
      };
      add_watch_metric: {
        Args: {
          p_player: string;
          p_session: string;
          p_type: Database['public']['Enums']['watch_metric_type'];
          p_value: string;
          p_unit: string;
        };
        Returns: string;
      };
    };
    Enums: {
      app_role: 'admin' | 'player';
      dominant_foot: 'right' | 'left' | 'both';
      exercise_category:
        'speed' | 'technique' | 'strength' | 'endurance' | 'coordination' | 'tactics';
      session_status: 'in_progress' | 'completed' | 'abandoned';
      traffic_light: 'green' | 'yellow' | 'red';
      calendar_category:
        'club_training' | 'extra_training' | 'match' | 'assessment' | 'rest' | 'goal' | 'special';
      event_status: 'planned' | 'done' | 'cancelled';
      watch_metric_type:
        | 'duration'
        | 'heart_rate_avg'
        | 'heart_rate_max'
        | 'hr_zone_1'
        | 'hr_zone_2'
        | 'hr_zone_3'
        | 'hr_zone_4'
        | 'hr_zone_5'
        | 'calories'
        | 'distance'
        | 'speed_avg'
        | 'speed_max'
        | 'pace_avg'
        | 'steps'
        | 'activity_datetime'
        | 'activity_type';
      goal_status: 'pending' | 'in_progress' | 'completed';
      skill_dimension: 'control' | 'passing' | 'speed' | 'endurance' | 'coordination' | 'vision';
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];
