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
    };
    Views: { [_ in never]: never };
    Functions: {
      save_workout: { Args: { p_workout: Json; p_items: Json }; Returns: string };
      finish_session: { Args: { p_session: Json; p_results: Json }; Returns: string };
    };
    Enums: {
      app_role: 'admin' | 'player';
      dominant_foot: 'right' | 'left' | 'both';
      exercise_category:
        'speed' | 'technique' | 'strength' | 'endurance' | 'coordination' | 'tactics';
      session_status: 'in_progress' | 'completed' | 'abandoned';
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
