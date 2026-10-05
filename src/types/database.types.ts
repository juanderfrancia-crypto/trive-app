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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          icon_name: string
          id: string
          min_rating: number | null
          min_recommendations_percent: number | null
          min_trips: number | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          icon_name: string
          id?: string
          min_rating?: number | null
          min_recommendations_percent?: number | null
          min_trips?: number | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          icon_name?: string
          id?: string
          min_rating?: number | null
          min_recommendations_percent?: number | null
          min_trips?: number | null
          name?: string
        }
        Relationships: []
      }
      admin_actions: {
        Row: {
          action: string | null
          admin_id: string
          created_at: string | null
          details: Json | null
          document_id: string | null
          id: string
          reason: string | null
          target_user_id: string | null
        }
        Insert: {
          action?: string | null
          admin_id: string
          created_at?: string | null
          details?: Json | null
          document_id?: string | null
          id?: string
          reason?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string | null
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          document_id?: string | null
          id?: string
          reason?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "driver_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      airport_offers: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          proposed_price: number | null
          request_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          proposed_price?: number | null
          request_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          proposed_price?: number | null
          request_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "airport_offers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "airport_offers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "airport_offers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "airport_offers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "airport_offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "airport_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      airport_requests: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          departure_time: string
          destination: string
          driver_accepted_at: string | null
          driver_id: string | null
          id: string
          initial_price: number
          notes: string | null
          offered_price: number
          origin: string
          passenger_id: string
          passengers: number
          price_updated_at: string | null
          status: string
          trip_notes: string | null
          trip_type: string | null
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          departure_time: string
          destination?: string
          driver_accepted_at?: string | null
          driver_id?: string | null
          id?: string
          initial_price?: number
          notes?: string | null
          offered_price: number
          origin: string
          passenger_id: string
          passengers?: number
          price_updated_at?: string | null
          status?: string
          trip_notes?: string | null
          trip_type?: string | null
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          departure_time?: string
          destination?: string
          driver_accepted_at?: string | null
          driver_id?: string | null
          id?: string
          initial_price?: number
          notes?: string | null
          offered_price?: number
          origin?: string
          passenger_id?: string
          passengers?: number
          price_updated_at?: string | null
          status?: string
          trip_notes?: string | null
          trip_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "airport_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "airport_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "airport_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "airport_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "airport_requests_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "airport_requests_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "airport_requests_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "airport_requests_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      archived_conversations: {
        Row: {
          archived_at: string | null
          id: string
          other_user_id: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          id?: string
          other_user_id: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          id?: string
          other_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "archived_conversations_other_user_id_fkey"
            columns: ["other_user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "archived_conversations_other_user_id_fkey"
            columns: ["other_user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "archived_conversations_other_user_id_fkey"
            columns: ["other_user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "archived_conversations_other_user_id_fkey"
            columns: ["other_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "archived_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "archived_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "archived_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_status: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          dropoff_point: string | null
          dropoff_point_custom: boolean | null
          id: string
          notes: string | null
          passenger_id: string
          payment_confirmed_at: string | null
          payment_marked_at: string | null
          payment_method: string | null
          payment_status: string | null
          price: number
          refund_amount: number | null
          refund_percentage: number | null
          reservation_code: string | null
          route_id: string
          seat_number: number
          updated_at: string | null
        }
        Insert: {
          booking_status?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          dropoff_point?: string | null
          dropoff_point_custom?: boolean | null
          id?: string
          notes?: string | null
          passenger_id: string
          payment_confirmed_at?: string | null
          payment_marked_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          price: number
          refund_amount?: number | null
          refund_percentage?: number | null
          reservation_code?: string | null
          route_id: string
          seat_number: number
          updated_at?: string | null
        }
        Update: {
          booking_status?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          dropoff_point?: string | null
          dropoff_point_custom?: boolean | null
          id?: string
          notes?: string | null
          passenger_id?: string
          payment_confirmed_at?: string | null
          payment_marked_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          price?: number
          refund_amount?: number | null
          refund_percentage?: number | null
          reservation_code?: string | null
          route_id?: string
          seat_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "bookings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "bookings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "bookings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_policy_flags: {
        Row: {
          created_at: string
          id: string
          reason: string
          request_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          request_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_policy_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "chat_policy_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "chat_policy_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "chat_policy_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_summaries: {
        Row: {
          id: string
          last_message: string | null
          last_message_time: string | null
          other_user_id: string
          unread_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          last_message?: string | null
          last_message_time?: string | null
          other_user_id: string
          unread_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          last_message?: string | null
          last_message_time?: string | null
          other_user_id?: string
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_other_user_id_fkey"
            columns: ["other_user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "conversation_summaries_other_user_id_fkey"
            columns: ["other_user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "conversation_summaries_other_user_id_fkey"
            columns: ["other_user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "conversation_summaries_other_user_id_fkey"
            columns: ["other_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "conversation_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "conversation_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "conversation_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_achievements: {
        Row: {
          achievement_id: string
          driver_id: string
          id: string
          unlocked_at: string | null
        }
        Insert: {
          achievement_id: string
          driver_id: string
          id?: string
          unlocked_at?: string | null
        }
        Update: {
          achievement_id?: string
          driver_id?: string
          id?: string
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_achievements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "driver_achievements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_achievements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_achievements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_documents: {
        Row: {
          created_at: string | null
          document_type: string
          driver_id: string
          expiry_date: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          rejection_reason: string | null
          status: string | null
          updated_at: string | null
          uploaded_at: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_type: string
          driver_id: string
          expiry_date?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          driver_id?: string
          expiry_date?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_payment_methods: {
        Row: {
          account_holder: string
          created_at: string | null
          driver_id: string
          id: string
          is_active: boolean | null
          payment_key: string | null
          phone_number: string | null
          type: string
        }
        Insert: {
          account_holder: string
          created_at?: string | null
          driver_id: string
          id?: string
          is_active?: boolean | null
          payment_key?: string | null
          phone_number?: string | null
          type: string
        }
        Update: {
          account_holder?: string
          created_at?: string | null
          driver_id?: string
          id?: string
          is_active?: boolean | null
          payment_key?: string | null
          phone_number?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_payment_methods_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "driver_payment_methods_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_payment_methods_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_payment_methods_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          average_rating: number | null
          created_at: string | null
          id: string
          license_expiry: string | null
          license_number: string | null
          national_id: string | null
          total_earnings: number | null
          total_trips: number | null
          updated_at: string | null
          vehicle_insurance_expiry: string | null
          vehicle_registration: string | null
          verified: boolean | null
        }
        Insert: {
          average_rating?: number | null
          created_at?: string | null
          id: string
          license_expiry?: string | null
          license_number?: string | null
          national_id?: string | null
          total_earnings?: number | null
          total_trips?: number | null
          updated_at?: string | null
          vehicle_insurance_expiry?: string | null
          vehicle_registration?: string | null
          verified?: boolean | null
        }
        Update: {
          average_rating?: number | null
          created_at?: string | null
          id?: string
          license_expiry?: string | null
          license_number?: string | null
          national_id?: string | null
          total_earnings?: number | null
          total_trips?: number | null
          updated_at?: string | null
          vehicle_insurance_expiry?: string | null
          vehicle_registration?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "drivers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "drivers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "drivers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings_transactions: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string | null
          description: string | null
          driver_id: string
          id: string
          status: string | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string | null
          description?: string | null
          driver_id: string
          id?: string
          status?: string | null
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string | null
          description?: string | null
          driver_id?: string
          id?: string
          status?: string | null
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earnings_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "cancellation_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "earnings_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "earnings_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "earnings_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_routes: {
        Row: {
          destination: string
          id: string
          notes: string | null
          origin: string
          route_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          destination: string
          id?: string
          notes?: string | null
          origin: string
          route_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          destination?: string
          id?: string
          notes?: string | null
          origin?: string
          route_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_routes_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_routes_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_duration: number | null
          audio_url: string | null
          booking_id: string | null
          created_at: string | null
          edited_at: string | null
          edited_by: string | null
          from_user_id: string
          id: string
          is_audio_listened: boolean | null
          is_pinned: boolean | null
          is_read: boolean | null
          message: string
          message_type: string | null
          read_at: string | null
          reply_to_id: string | null
          sequence_number: number
          to_user_id: string
          updated_at: string | null
        }
        Insert: {
          audio_duration?: number | null
          audio_url?: string | null
          booking_id?: string | null
          created_at?: string | null
          edited_at?: string | null
          edited_by?: string | null
          from_user_id: string
          id?: string
          is_audio_listened?: boolean | null
          is_pinned?: boolean | null
          is_read?: boolean | null
          message: string
          message_type?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sequence_number?: number
          to_user_id: string
          updated_at?: string | null
        }
        Update: {
          audio_duration?: number | null
          audio_url?: string | null
          booking_id?: string | null
          created_at?: string | null
          edited_at?: string | null
          edited_by?: string | null
          from_user_id?: string
          id?: string
          is_audio_listened?: boolean | null
          is_pinned?: boolean | null
          is_read?: boolean | null
          message?: string
          message_type?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sequence_number?: number
          to_user_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "cancellation_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_messages: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          is_read: boolean | null
          message_text: string
          message_type: string | null
          passenger_id: string
          request_id: string
          sent_by_user_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          is_read?: boolean | null
          message_text: string
          message_type?: string | null
          passenger_id: string
          request_id: string
          sent_by_user_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          is_read?: boolean | null
          message_text?: string
          message_type?: string | null
          passenger_id?: string
          request_id?: string
          sent_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_messages_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "negotiation_messages_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "negotiation_messages_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "negotiation_messages_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_messages_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "negotiation_messages_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "negotiation_messages_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "negotiation_messages_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "airport_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_by_user_fk"
            columns: ["sent_by_user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "sent_by_user_fk"
            columns: ["sent_by_user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "sent_by_user_fk"
            columns: ["sent_by_user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "sent_by_user_fk"
            columns: ["sent_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_payments: {
        Row: {
          amount: number
          created_at: string
          deducted_at: string | null
          driver_id: string
          id: string
          offer_id: string
          reason: string | null
          refunded_at: string | null
          request_id: string
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          deducted_at?: string | null
          driver_id: string
          id?: string
          offer_id: string
          reason?: string | null
          refunded_at?: string | null
          request_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deducted_at?: string | null
          driver_id?: string
          id?: string
          offer_id?: string
          reason?: string | null
          refunded_at?: string | null
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "negotiation_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "negotiation_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "negotiation_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_payments_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "airport_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "airport_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string
          last_four: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          last_four: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          last_four?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number | null
          created_at: string | null
          driver_active: boolean | null
          driver_verified: boolean | null
          driver_verified_at: string | null
          email: string | null
          emergency_contact: Json | null
          id: string
          is_admin: boolean | null
          is_driver: boolean | null
          is_driver_verified: boolean | null
          is_passenger: boolean | null
          last_seen: string | null
          membership_expiry: string | null
          membership_type: string | null
          name: string
          notification_preferences: Json | null
          phone: string | null
          preferred_municipality: string | null
          profile_photo_url: string | null
          push_token: string | null
          rating: number | null
          referral_code: string | null
          referred_by: string | null
          role: string | null
          total_spent: number | null
          total_trips: number | null
          updated_at: string | null
          vehicle_photo_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          balance?: number | null
          created_at?: string | null
          driver_active?: boolean | null
          driver_verified?: boolean | null
          driver_verified_at?: string | null
          email?: string | null
          emergency_contact?: Json | null
          id: string
          is_admin?: boolean | null
          is_driver?: boolean | null
          is_driver_verified?: boolean | null
          is_passenger?: boolean | null
          last_seen?: string | null
          membership_expiry?: string | null
          membership_type?: string | null
          name: string
          notification_preferences?: Json | null
          phone?: string | null
          preferred_municipality?: string | null
          profile_photo_url?: string | null
          push_token?: string | null
          rating?: number | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string | null
          total_spent?: number | null
          total_trips?: number | null
          updated_at?: string | null
          vehicle_photo_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          balance?: number | null
          created_at?: string | null
          driver_active?: boolean | null
          driver_verified?: boolean | null
          driver_verified_at?: string | null
          email?: string | null
          emergency_contact?: Json | null
          id?: string
          is_admin?: boolean | null
          is_driver?: boolean | null
          is_driver_verified?: boolean | null
          is_passenger?: boolean | null
          last_seen?: string | null
          membership_expiry?: string | null
          membership_type?: string | null
          name?: string
          notification_preferences?: Json | null
          phone?: string | null
          preferred_municipality?: string | null
          profile_photo_url?: string | null
          push_token?: string | null
          rating?: number | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string | null
          total_spent?: number | null
          total_trips?: number | null
          updated_at?: string | null
          vehicle_photo_url?: string | null
        }
        Relationships: []
      }
      rating_config: {
        Row: {
          id: string
          name: string
          updated_at: string | null
          weight_average: number | null
          weight_consistency: number | null
          weight_recency: number | null
          weight_recommendations: number | null
        }
        Insert: {
          id?: string
          name: string
          updated_at?: string | null
          weight_average?: number | null
          weight_consistency?: number | null
          weight_recency?: number | null
          weight_recommendations?: number | null
        }
        Update: {
          id?: string
          name?: string
          updated_at?: string | null
          weight_average?: number | null
          weight_consistency?: number | null
          weight_recency?: number | null
          weight_recommendations?: number | null
        }
        Relationships: []
      }
      rating_snapshots: {
        Row: {
          average_rating: number
          created_at: string
          date: string
          five_star_count: number | null
          four_star_count: number | null
          id: string
          one_star_count: number | null
          three_star_count: number | null
          total_reviews: number
          two_star_count: number | null
        }
        Insert: {
          average_rating?: number
          created_at?: string
          date?: string
          five_star_count?: number | null
          four_star_count?: number | null
          id?: string
          one_star_count?: number | null
          three_star_count?: number | null
          total_reviews?: number
          two_star_count?: number | null
        }
        Update: {
          average_rating?: number
          created_at?: string
          date?: string
          five_star_count?: number | null
          four_star_count?: number | null
          id?: string
          one_star_count?: number | null
          three_star_count?: number | null
          total_reviews?: number
          two_star_count?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          recommend: boolean | null
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          recommend?: boolean | null
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          recommend?: boolean | null
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "cancellation_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      route_templates: {
        Row: {
          created_at: string
          description: string | null
          destination: string
          driver_id: string
          id: string
          name: string
          origin: string
          price_per_seat: number
          total_seats: number
          vehicle_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          destination: string
          driver_id: string
          id?: string
          name: string
          origin: string
          price_per_seat: number
          total_seats: number
          vehicle_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          destination?: string
          driver_id?: string
          id?: string
          name?: string
          origin?: string
          price_per_seat?: number
          total_seats?: number
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_templates_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "route_templates_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "route_templates_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "route_templates_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          arrival_time: string
          available_seats: number
          created_at: string | null
          departure_time: string
          description: string | null
          destination: string
          driver_id: string
          id: string
          origin: string
          pickup_point: string | null
          pickup_point_custom: boolean | null
          price_per_seat: number
          status: string | null
          total_seats: number
          updated_at: string | null
          vehicle_color: string | null
          vehicle_id: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_photo_url: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
          vehicle_year: number | null
        }
        Insert: {
          arrival_time: string
          available_seats?: number
          created_at?: string | null
          departure_time: string
          description?: string | null
          destination: string
          driver_id: string
          id?: string
          origin: string
          pickup_point?: string | null
          pickup_point_custom?: boolean | null
          price_per_seat: number
          status?: string | null
          total_seats?: number
          updated_at?: string | null
          vehicle_color?: string | null
          vehicle_id?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_photo_url?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
          vehicle_year?: number | null
        }
        Update: {
          arrival_time?: string
          available_seats?: number
          created_at?: string | null
          departure_time?: string
          description?: string | null
          destination?: string
          driver_id?: string
          id?: string
          origin?: string
          pickup_point?: string | null
          pickup_point_custom?: boolean | null
          price_per_seat?: number
          status?: string | null
          total_seats?: number
          updated_at?: string | null
          vehicle_color?: string | null
          vehicle_id?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_photo_url?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_addresses: {
        Row: {
          address: string
          created_at: string | null
          id: string
          is_home: boolean | null
          is_work: boolean | null
          label: string
          latitude: number | null
          longitude: number | null
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string | null
          id?: string
          is_home?: boolean | null
          is_work?: boolean | null
          label: string
          latitude?: number | null
          longitude?: number | null
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string | null
          id?: string
          is_home?: boolean | null
          is_work?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          user_id?: string
        }
        Relationships: []
      }
      travel_preferences: {
        Row: {
          ac_preference: string | null
          avoid_routes: string | null
          created_at: string
          id: string
          luggage_restriction: string | null
          music_preference: string | null
          notifications_enabled: boolean | null
          preferred_routes: string | null
          preferred_times: string | null
          price_alert_threshold: number | null
          smoking_allowed: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ac_preference?: string | null
          avoid_routes?: string | null
          created_at?: string
          id?: string
          luggage_restriction?: string | null
          music_preference?: string | null
          notifications_enabled?: boolean | null
          preferred_routes?: string | null
          preferred_times?: string | null
          price_alert_threshold?: number | null
          smoking_allowed?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ac_preference?: string | null
          avoid_routes?: string | null
          created_at?: string
          id?: string
          luggage_restriction?: string | null
          music_preference?: string | null
          notifications_enabled?: boolean | null
          preferred_routes?: string | null
          preferred_times?: string | null
          price_alert_threshold?: number | null
          smoking_allowed?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_messages: {
        Row: {
          created_at: string | null
          from_user_id: string
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          to_user_id: string
          trip_id: string
        }
        Insert: {
          created_at?: string | null
          from_user_id: string
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          to_user_id: string
          trip_id: string
        }
        Update: {
          created_at?: string | null
          from_user_id?: string
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          to_user_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "trip_messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "trip_messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "trip_messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "trip_messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "trip_messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "trip_messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_preferences: {
        Row: {
          beverage_preference: string | null
          booking_id: string
          conversation_preference: string | null
          created_at: string
          eating_allowed: boolean | null
          id: string
          luggage_space_needed: number | null
          music_ok: boolean | null
          music_preference: string | null
          pets_allowed: boolean | null
          seat_preference: string | null
          silence_preferred: boolean | null
          smoking_allowed: boolean | null
          temperature_preference: string | null
          user_id: string | null
        }
        Insert: {
          beverage_preference?: string | null
          booking_id: string
          conversation_preference?: string | null
          created_at?: string
          eating_allowed?: boolean | null
          id?: string
          luggage_space_needed?: number | null
          music_ok?: boolean | null
          music_preference?: string | null
          pets_allowed?: boolean | null
          seat_preference?: string | null
          silence_preferred?: boolean | null
          smoking_allowed?: boolean | null
          temperature_preference?: string | null
          user_id?: string | null
        }
        Update: {
          beverage_preference?: string | null
          booking_id?: string
          conversation_preference?: string | null
          created_at?: string
          eating_allowed?: boolean | null
          id?: string
          luggage_space_needed?: number | null
          music_ok?: boolean | null
          music_preference?: string | null
          pets_allowed?: boolean | null
          seat_preference?: string | null
          silence_preferred?: boolean | null
          smoking_allowed?: boolean | null
          temperature_preference?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_preferences_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_preferences_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "cancellation_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "trip_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "trip_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "trip_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rated_id: string
          rater_id: string
          rating: number
          trip_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_id: string
          rater_id: string
          rating: number
          trip_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_id?: string
          rater_id?: string
          rating?: number
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_ratings_rated_id_fkey"
            columns: ["rated_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "trip_ratings_rated_id_fkey"
            columns: ["rated_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "trip_ratings_rated_id_fkey"
            columns: ["rated_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "trip_ratings_rated_id_fkey"
            columns: ["rated_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "trip_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "trip_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "trip_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_ratings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "airport_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          created_at: string | null
          from_user_id: string
          id: string
          to_user_id: string
        }
        Insert: {
          created_at?: string | null
          from_user_id: string
          id?: string
          to_user_id: string
        }
        Update: {
          created_at?: string | null
          from_user_id?: string
          id?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "typing_indicators_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "typing_indicators_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "typing_indicators_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "typing_indicators_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "typing_indicators_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "typing_indicators_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          action: string
          created_at: string | null
          device: string | null
          id: string
          ip_address: string | null
          location: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          device?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          device?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          id: string
          in_app_notifications: boolean | null
          push_notifications: boolean | null
          sms_notifications: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_name: string | null
          device_type: string | null
          id: string
          is_current: boolean
          last_active_at: string
          location: string | null
          os_version: string | null
          session_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          is_current?: boolean
          last_active_at?: string
          location?: string | null
          os_version?: string | null
          session_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          is_current?: boolean
          last_active_at?: string
          location?: string | null
          os_version?: string | null
          session_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string
          created_at: string
          driver_id: string
          id: string
          is_active: boolean
          make: string
          plate: string
          rejection_reason: string | null
          status: string
          updated_at: string
          verified_at: string | null
          year: number
        }
        Insert: {
          color: string
          created_at?: string
          driver_id: string
          id?: string
          is_active?: boolean
          make: string
          plate: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          year: number
        }
        Update: {
          color?: string
          created_at?: string
          driver_id?: string
          id?: string
          is_active?: boolean
          make?: string
          plate?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          status: string
          type: string
          user_id: string
          wompi_reference: string | null
          wompi_transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          status?: string
          type: string
          user_id: string
          wompi_reference?: string | null
          wompi_transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          status?: string
          type?: string
          user_id?: string
          wompi_reference?: string | null
          wompi_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      available_rides: {
        Row: {
          arrival_time: string | null
          available_seats: number | null
          created_at: string | null
          departure_time: string | null
          description: string | null
          destination: string | null
          driver_id: string | null
          driver_name: string | null
          driver_photo: string | null
          driver_rating: number | null
          driver_review_count: number | null
          driver_user_id: string | null
          id: string | null
          origin: string | null
          price_per_seat: number | null
          seats_available_count: number | null
          status: string | null
          total_seats: number | null
          updated_at: string | null
          vehicle_color: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_history: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          departure_time: string | null
          destination: string | null
          driver_id: string | null
          hours_until_departure: number | null
          id: string | null
          origin: string | null
          passenger_id: string | null
          refund_amount: number | null
          refund_percentage: number | null
          refund_type: string | null
          route_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "bookings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "bookings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "bookings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "available_rides"
            referencedColumns: ["driver_user_id"]
          },
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_earnings_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_reputation_summary"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_earnings_summary: {
        Row: {
          completed_trips: number | null
          driver_id: string | null
          email: string | null
          name: string | null
          pending_earnings: number | null
          this_month_earnings: number | null
          total_bookings: number | null
          total_earnings: number | null
          total_routes: number | null
        }
        Relationships: []
      }
      driver_reputation_summary: {
        Row: {
          achievement_codes: string[] | null
          achievement_count: number | null
          avg_rating: number | null
          completed_trips: number | null
          driver_id: string | null
          name: string | null
          rating_consistency: number | null
          recommend_percent: number | null
          total_reviews: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_airport_offer: { Args: { offer_id: string }; Returns: undefined }
      accept_request_direct: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      admin_credit_balance: {
        Args: { p_amount: number; p_note: string; p_user_id: string }
        Returns: number
      }
      anonymize_account: { Args: { p_uid: string }; Returns: undefined }
      approve_document_admin: {
        Args: { doc_id: string; exp_date?: string }
        Returns: boolean
      }
      approve_vehicle: { Args: { p_vehicle_id: string }; Returns: undefined }
      auto_confirm_expired_trips: { Args: never; Returns: number }
      can_view_profile: { Args: { p_target: string }; Returns: boolean }
      cancel_airport_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      cancel_booking: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: undefined
      }
      chat_contains_contact: { Args: { p_text: string }; Returns: string }
      check_all_documents_verified: {
        Args: { p_driver_id: string }
        Returns: boolean
      }
      check_seat_availability: {
        Args: { p_route_id: string; p_seats_needed: number }
        Returns: {
          available: boolean
          available_seats: number
          total_seats: number
        }[]
      }
      cleanup_old_trip_messages: { Args: never; Returns: undefined }
      complete_booking_internal: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      complete_trip: {
        Args: { v_request_id: string; v_trip_notes?: string }
        Returns: undefined
      }
      create_negotiation_payment: {
        Args: { v_amount?: number; v_offer_id: string }
        Returns: string
      }
      delete_conversation_messages: {
        Args: { other_user_id: string; user_id: string }
        Returns: undefined
      }
      driver_cancel_booking: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: undefined
      }
      driver_confirm_payment: {
        Args: { p_received: boolean; p_reservation_code: string }
        Returns: Json
      }
      driver_set_route_status: {
        Args: { p_route_id: string; p_status: string }
        Returns: undefined
      }
      finalize_bookings_atomic: {
        Args: { p_booking_ids: string[]; p_payment_method?: string }
        Returns: {
          message: string
          remaining_seats: number
          success: boolean
          updated_bookings_count: number
        }[]
      }
      generate_reservation_code: { Args: never; Returns: string }
      get_counterpart_phone: { Args: { p_user: string }; Returns: string }
      get_driver_earnings: {
        Args: { p_driver_id: string }
        Returns: {
          completed_trips: number
          pending_earnings: number
          this_month_earnings: number
          total_bookings: number
          total_earnings: number
        }[]
      }
      get_my_phone: { Args: never; Returns: string }
      get_pending_documents_for_admin: {
        Args: never
        Returns: {
          created_at: string
          document_type: string
          driver_id: string
          driver_name: string
          expiry_date: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          rejection_reason: string
          status: string
          updated_at: string
          uploaded_at: string
          verified_at: string
        }[]
      }
      get_processed_documents_for_admin: {
        Args: never
        Returns: {
          created_at: string
          document_type: string
          driver_id: string
          driver_name: string
          expiry_date: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          rejection_reason: string
          status: string
          updated_at: string
          uploaded_at: string
          verified_at: string
        }[]
      }
      get_route_passenger_phones: {
        Args: { p_route_id: string }
        Returns: {
          passenger_id: string
          phone: string
        }[]
      }
      has_accepted_trip_between: {
        Args: { p_a: string; p_b: string }
        Returns: boolean
      }
      increment_wallet_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      is_admin_user: { Args: never; Returns: boolean }
      is_membership_active: { Args: { user_id: string }; Returns: boolean }
      mark_chat_thread_read: {
        Args: { p_driver_id: string; p_request_id: string }
        Returns: number
      }
      mark_driver_unverified: {
        Args: { driver_id: string }
        Returns: undefined
      }
      mark_driver_verified: { Args: { driver_id: string }; Returns: undefined }
      membership_days_remaining: { Args: { user_id: string }; Returns: number }
      notify_user: {
        Args: {
          p_data?: Json
          p_message: string
          p_title: string
          p_type: string
          p_user: string
        }
        Returns: undefined
      }
      now_bogota: { Args: never; Returns: string }
      passenger_confirm_trip: {
        Args: { p_arrived: boolean; p_booking_id: string }
        Returns: undefined
      }
      passenger_mark_paid: {
        Args: { p_reservation_code: string }
        Returns: Json
      }
      post_wallet_movement: {
        Args: { p_amount: number; p_type: string; p_user: string }
        Returns: undefined
      }
      publish_route: {
        Args: { p_route: Json }
        Returns: {
          arrival_time: string
          available_seats: number
          created_at: string | null
          departure_time: string
          description: string | null
          destination: string
          driver_id: string
          id: string
          origin: string
          pickup_point: string | null
          pickup_point_custom: boolean | null
          price_per_seat: number
          status: string | null
          total_seats: number
          updated_at: string | null
          vehicle_color: string | null
          vehicle_id: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_photo_url: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
          vehicle_year: number | null
        }
        SetofOptions: {
          from: "*"
          to: "routes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      puede_conducir: { Args: { p_user: string }; Returns: boolean }
      rate_booking: {
        Args: {
          p_booking_id: string
          p_comment?: string
          p_rating: number
          p_recommend?: boolean
        }
        Returns: undefined
      }
      rate_trip: {
        Args: { v_comment?: string; v_rating: number; v_trip_id: string }
        Returns: undefined
      }
      register_vehicle: {
        Args: {
          p_color: string
          p_make: string
          p_plate: string
          p_year: number
        }
        Returns: {
          color: string
          created_at: string
          driver_id: string
          id: string
          is_active: boolean
          make: string
          plate: string
          rejection_reason: string | null
          status: string
          updated_at: string
          verified_at: string | null
          year: number
        }
        SetofOptions: {
          from: "*"
          to: "vehicles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_airport_offer: { Args: { p_offer_id: string }; Returns: undefined }
      reject_document_admin: {
        Args: { doc_id: string; reason: string }
        Returns: boolean
      }
      reject_vehicle: {
        Args: { p_reason: string; p_vehicle_id: string }
        Returns: undefined
      }
      release_vehicle: { Args: { p_vehicle_id: string }; Returns: undefined }
      repeated_driver_passenger_pairs: {
        Args: { p_min_trips?: number }
        Returns: {
          accepted_trips: number
          driver_id: string
          flags: number
          last_trip: string
          passenger_id: string
        }[]
      }
      reserve_seats: {
        Args: {
          p_dropoff_custom?: boolean
          p_dropoff_point?: string
          p_payment_method?: string
          p_route_id: string
          p_seat_numbers: number[]
        }
        Returns: {
          booking_status: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          dropoff_point: string | null
          dropoff_point_custom: boolean | null
          id: string
          notes: string | null
          passenger_id: string
          payment_confirmed_at: string | null
          payment_marked_at: string | null
          payment_method: string | null
          payment_status: string | null
          price: number
          refund_amount: number | null
          refund_percentage: number | null
          reservation_code: string | null
          route_id: string
          seat_number: number
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      route_occupied_seats: { Args: { p_route_id: string }; Returns: number[] }
      send_chat_message: {
        Args: {
          p_driver_id: string
          p_request_id: string
          p_text: string
          p_type?: string
        }
        Returns: Json
      }
      set_booking_dropoff: {
        Args: {
          p_booking_ids: string[]
          p_dropoff_custom?: boolean
          p_dropoff_point: string
        }
        Returns: number
      }
      set_driver_identity: {
        Args: { p_national_id: string }
        Returns: undefined
      }
      start_trip: { Args: { v_request_id: string }; Returns: undefined }
      update_airport_request_price: {
        Args: { new_price: number; request_id: string }
        Returns: undefined
      }
      update_completed_bookings: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
