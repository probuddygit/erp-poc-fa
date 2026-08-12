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
      crm_activities: {
        Row: {
          actor: string | null
          at: string | null
          created_at: string
          detail: string | null
          entity_id: string | null
          entity_kind: string | null
          extra: Json
          id: string
          owner_id: string
          title: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          actor?: string | null
          at?: string | null
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_kind?: string | null
          extra?: Json
          id: string
          owner_id?: string
          title?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          actor?: string | null
          at?: string | null
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_kind?: string | null
          extra?: Json
          id?: string
          owner_id?: string
          title?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_approvals: {
        Row: {
          approver: string | null
          at: string | null
          comment: string | null
          created_at: string
          entity_id: string | null
          entity_kind: string | null
          extra: Json
          id: string
          owner_id: string
          status: string | null
          step: string | null
          updated_at: string
        }
        Insert: {
          approver?: string | null
          at?: string | null
          comment?: string | null
          created_at?: string
          entity_id?: string | null
          entity_kind?: string | null
          extra?: Json
          id: string
          owner_id?: string
          status?: string | null
          step?: string | null
          updated_at?: string
        }
        Update: {
          approver?: string | null
          at?: string | null
          comment?: string | null
          created_at?: string
          entity_id?: string | null
          entity_kind?: string | null
          extra?: Json
          id?: string
          owner_id?: string
          status?: string | null
          step?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_customers: {
        Row: {
          annual_revenue: number | null
          cancel_reason: string | null
          cancelled_at: string | null
          code: string | null
          company_id: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_at_iso: string | null
          currency: string | null
          extra: Json
          gstin: string | null
          id: string
          name: string | null
          next_follow_up: string | null
          owner: string | null
          owner_id: string
          payment_terms: string | null
          region: string | null
          segment: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          annual_revenue?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_at_iso?: string | null
          currency?: string | null
          extra?: Json
          gstin?: string | null
          id: string
          name?: string | null
          next_follow_up?: string | null
          owner?: string | null
          owner_id?: string
          payment_terms?: string | null
          region?: string | null
          segment?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          annual_revenue?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_at_iso?: string | null
          currency?: string | null
          extra?: Json
          gstin?: string | null
          id?: string
          name?: string | null
          next_follow_up?: string | null
          owner?: string | null
          owner_id?: string
          payment_terms?: string | null
          region?: string | null
          segment?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_documents: {
        Row: {
          at: string | null
          created_at: string
          entity_id: string | null
          entity_kind: string | null
          extra: Json
          id: string
          kind: string | null
          name: string | null
          owner_id: string
          size: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_kind?: string | null
          extra?: Json
          id: string
          kind?: string | null
          name?: string | null
          owner_id?: string
          size?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_kind?: string | null
          extra?: Json
          id?: string
          kind?: string | null
          name?: string | null
          owner_id?: string
          size?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      crm_emails: {
        Row: {
          at: string | null
          created_at: string
          direction: string | null
          entity_id: string | null
          entity_kind: string | null
          extra: Json
          from_addr: string | null
          id: string
          owner_id: string
          preview: string | null
          subject: string | null
          to_addr: string | null
          updated_at: string
        }
        Insert: {
          at?: string | null
          created_at?: string
          direction?: string | null
          entity_id?: string | null
          entity_kind?: string | null
          extra?: Json
          from_addr?: string | null
          id: string
          owner_id?: string
          preview?: string | null
          subject?: string | null
          to_addr?: string | null
          updated_at?: string
        }
        Update: {
          at?: string | null
          created_at?: string
          direction?: string | null
          entity_id?: string | null
          entity_kind?: string | null
          extra?: Json
          from_addr?: string | null
          id?: string
          owner_id?: string
          preview?: string | null
          subject?: string | null
          to_addr?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_leads: {
        Row: {
          campaign: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          code: string | null
          company_id: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_at_iso: string | null
          customer_id: string | null
          customer_name: string | null
          est_value: number | null
          extra: Json
          id: string
          next_follow_up: string | null
          opportunity_id: string | null
          owner: string | null
          owner_id: string
          score: number | null
          source: string | null
          status: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          campaign?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_at_iso?: string | null
          customer_id?: string | null
          customer_name?: string | null
          est_value?: number | null
          extra?: Json
          id: string
          next_follow_up?: string | null
          opportunity_id?: string | null
          owner?: string | null
          owner_id?: string
          score?: number | null
          source?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          campaign?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_at_iso?: string | null
          customer_id?: string | null
          customer_name?: string | null
          est_value?: number | null
          extra?: Json
          id?: string
          next_follow_up?: string | null
          opportunity_id?: string | null
          owner?: string | null
          owner_id?: string
          score?: number | null
          source?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_notes: {
        Row: {
          at: string | null
          author: string | null
          body: string | null
          created_at: string
          entity_id: string | null
          entity_kind: string | null
          extra: Json
          id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          at?: string | null
          author?: string | null
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_kind?: string | null
          extra?: Json
          id: string
          owner_id?: string
          updated_at?: string
        }
        Update: {
          at?: string | null
          author?: string | null
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_kind?: string | null
          extra?: Json
          id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_oas: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          code: string | null
          company_id: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_at_iso: string | null
          customer_name: string | null
          extra: Json
          id: string
          next_follow_up: string | null
          owner: string | null
          owner_id: string
          po_date: string | null
          po_number: string | null
          project_id: string | null
          quotation_id: string | null
          sales_order_id: string | null
          status: string | null
          title: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_at_iso?: string | null
          customer_name?: string | null
          extra?: Json
          id: string
          next_follow_up?: string | null
          owner?: string | null
          owner_id?: string
          po_date?: string | null
          po_number?: string | null
          project_id?: string | null
          quotation_id?: string | null
          sales_order_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_at_iso?: string | null
          customer_name?: string | null
          extra?: Json
          id?: string
          next_follow_up?: string | null
          owner?: string | null
          owner_id?: string
          po_date?: string | null
          po_number?: string | null
          project_id?: string | null
          quotation_id?: string | null
          sales_order_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      crm_opportunities: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          code: string | null
          company_id: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_at_iso: string | null
          customer_id: string | null
          customer_name: string | null
          expected_close: string | null
          extra: Json
          id: string
          last_stage_at: string | null
          lead_id: string | null
          name: string | null
          next_follow_up: string | null
          owner: string | null
          owner_id: string
          probability: number | null
          stage: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_at_iso?: string | null
          customer_id?: string | null
          customer_name?: string | null
          expected_close?: string | null
          extra?: Json
          id: string
          last_stage_at?: string | null
          lead_id?: string | null
          name?: string | null
          next_follow_up?: string | null
          owner?: string | null
          owner_id?: string
          probability?: number | null
          stage?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_at_iso?: string | null
          customer_id?: string | null
          customer_name?: string | null
          expected_close?: string | null
          extra?: Json
          id?: string
          last_stage_at?: string | null
          lead_id?: string | null
          name?: string | null
          next_follow_up?: string | null
          owner?: string | null
          owner_id?: string
          probability?: number | null
          stage?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      crm_projects: {
        Row: {
          code: string | null
          created_at: string
          created_at_iso: string | null
          customer_name: string | null
          extra: Json
          id: string
          name: string | null
          oa_id: string | null
          owner_id: string
          status: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_at_iso?: string | null
          customer_name?: string | null
          extra?: Json
          id: string
          name?: string | null
          oa_id?: string | null
          owner_id?: string
          status?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string
          created_at_iso?: string | null
          customer_name?: string | null
          extra?: Json
          id?: string
          name?: string | null
          oa_id?: string | null
          owner_id?: string
          status?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      crm_proposals: {
        Row: {
          assumptions: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          code: string | null
          company_id: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_at_iso: string | null
          customer_name: string | null
          deliverables: string | null
          executive_summary: string | null
          extra: Json
          id: string
          methodology: string | null
          next_follow_up: string | null
          opportunity_id: string | null
          owner: string | null
          owner_id: string
          rfq_id: string | null
          scope: string | null
          status: string | null
          template: string | null
          terms: string | null
          timeline: string | null
          title: string | null
          updated_at: string
          value: number | null
          version: string | null
        }
        Insert: {
          assumptions?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_at_iso?: string | null
          customer_name?: string | null
          deliverables?: string | null
          executive_summary?: string | null
          extra?: Json
          id: string
          methodology?: string | null
          next_follow_up?: string | null
          opportunity_id?: string | null
          owner?: string | null
          owner_id?: string
          rfq_id?: string | null
          scope?: string | null
          status?: string | null
          template?: string | null
          terms?: string | null
          timeline?: string | null
          title?: string | null
          updated_at?: string
          value?: number | null
          version?: string | null
        }
        Update: {
          assumptions?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_at_iso?: string | null
          customer_name?: string | null
          deliverables?: string | null
          executive_summary?: string | null
          extra?: Json
          id?: string
          methodology?: string | null
          next_follow_up?: string | null
          opportunity_id?: string | null
          owner?: string | null
          owner_id?: string
          rfq_id?: string | null
          scope?: string | null
          status?: string | null
          template?: string | null
          terms?: string | null
          timeline?: string | null
          title?: string | null
          updated_at?: string
          value?: number | null
          version?: string | null
        }
        Relationships: []
      }
      crm_quotations: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          code: string | null
          company_id: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_at_iso: string | null
          currency: string | null
          customer_name: string | null
          delivery_terms: string | null
          discount_pct: number | null
          extra: Json
          freight: number | null
          id: string
          margin_pct: number | null
          next_follow_up: string | null
          opportunity_id: string | null
          owner: string | null
          owner_id: string
          payment_terms: string | null
          proposal_id: string | null
          revision: number | null
          status: string | null
          tax_pct: number | null
          title: string | null
          updated_at: string
          validity: string | null
          value: number | null
          views: number | null
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_at_iso?: string | null
          currency?: string | null
          customer_name?: string | null
          delivery_terms?: string | null
          discount_pct?: number | null
          extra?: Json
          freight?: number | null
          id: string
          margin_pct?: number | null
          next_follow_up?: string | null
          opportunity_id?: string | null
          owner?: string | null
          owner_id?: string
          payment_terms?: string | null
          proposal_id?: string | null
          revision?: number | null
          status?: string | null
          tax_pct?: number | null
          title?: string | null
          updated_at?: string
          validity?: string | null
          value?: number | null
          views?: number | null
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_at_iso?: string | null
          currency?: string | null
          customer_name?: string | null
          delivery_terms?: string | null
          discount_pct?: number | null
          extra?: Json
          freight?: number | null
          id?: string
          margin_pct?: number | null
          next_follow_up?: string | null
          opportunity_id?: string | null
          owner?: string | null
          owner_id?: string
          payment_terms?: string | null
          proposal_id?: string | null
          revision?: number | null
          status?: string | null
          tax_pct?: number | null
          title?: string | null
          updated_at?: string
          validity?: string | null
          value?: number | null
          views?: number | null
        }
        Relationships: []
      }
      crm_rfqs: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          code: string | null
          commercial_terms: string | null
          company_id: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_at_iso: string | null
          customer_name: string | null
          delivery_schedule: string | null
          due_date: string | null
          extra: Json
          extracted_from: string | null
          id: string
          next_follow_up: string | null
          opportunity_id: string | null
          owner: string | null
          owner_id: string
          scope: string | null
          status: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string | null
          commercial_terms?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_at_iso?: string | null
          customer_name?: string | null
          delivery_schedule?: string | null
          due_date?: string | null
          extra?: Json
          extracted_from?: string | null
          id: string
          next_follow_up?: string | null
          opportunity_id?: string | null
          owner?: string | null
          owner_id?: string
          scope?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string | null
          commercial_terms?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_at_iso?: string | null
          customer_name?: string | null
          delivery_schedule?: string | null
          due_date?: string | null
          extra?: Json
          extracted_from?: string | null
          id?: string
          next_follow_up?: string | null
          opportunity_id?: string | null
          owner?: string | null
          owner_id?: string
          scope?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_sales_orders: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          code: string | null
          company_id: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_at_iso: string | null
          customer_name: string | null
          delivery_date: string | null
          extra: Json
          id: string
          next_follow_up: string | null
          oa_id: string | null
          owner: string | null
          owner_id: string
          payment_terms: string | null
          po_number: string | null
          project_code: string | null
          project_id: string | null
          status: string | null
          title: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_at_iso?: string | null
          customer_name?: string | null
          delivery_date?: string | null
          extra?: Json
          id: string
          next_follow_up?: string | null
          oa_id?: string | null
          owner?: string | null
          owner_id?: string
          payment_terms?: string | null
          po_number?: string | null
          project_code?: string | null
          project_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          code?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_at_iso?: string | null
          customer_name?: string | null
          delivery_date?: string | null
          extra?: Json
          id?: string
          next_follow_up?: string | null
          oa_id?: string | null
          owner?: string | null
          owner_id?: string
          payment_terms?: string | null
          po_number?: string | null
          project_code?: string | null
          project_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
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
      get_primary_role: {
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
      app_role:
        | "admin"
        | "sales"
        | "projects"
        | "engineering"
        | "purchase"
        | "stores"
        | "production"
        | "quality"
        | "finance"
        | "hr"
        | "executives"
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
      app_role: [
        "admin",
        "sales",
        "projects",
        "engineering",
        "purchase",
        "stores",
        "production",
        "quality",
        "finance",
        "hr",
        "executives",
      ],
    },
  },
} as const
