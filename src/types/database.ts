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
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      app_role: 'admin' | 'player';
      dominant_foot: 'right' | 'left' | 'both';
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];
