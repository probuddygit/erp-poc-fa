-- Phase 1: Revenue Lifecycle (CRM) cloud tables, per-user sandbox

CREATE TABLE public.crm_customers (
  id text NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, name text, segment text, region text, owner text, status text,
  annual_revenue numeric, gstin text, payment_terms text, currency text,
  contact_person text, contact_email text, contact_phone text, next_follow_up text,
  cancelled_at text, cancel_reason text, company_id text, created_at_iso text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);

CREATE TABLE public.crm_leads (
  id text NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, title text, customer_id text, customer_name text, source text, campaign text,
  owner text, est_value numeric, score numeric, status text, opportunity_id text,
  contact_person text, contact_email text, contact_phone text, next_follow_up text,
  cancelled_at text, cancel_reason text, company_id text, created_at_iso text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);

CREATE TABLE public.crm_opportunities (
  id text NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, name text, customer_id text, customer_name text, lead_id text,
  value numeric, probability numeric, stage text, owner text, expected_close text, last_stage_at text,
  contact_person text, contact_email text, contact_phone text, next_follow_up text,
  cancelled_at text, cancel_reason text, company_id text, created_at_iso text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);

CREATE TABLE public.crm_rfqs (
  id text NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, opportunity_id text, customer_name text, title text, due_date text, owner text,
  scope text, delivery_schedule text, commercial_terms text, extracted_from text, status text,
  contact_person text, contact_email text, contact_phone text, next_follow_up text,
  cancelled_at text, cancel_reason text, company_id text, created_at_iso text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);

CREATE TABLE public.crm_proposals (
  id text NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, rfq_id text, opportunity_id text, customer_name text, title text, version text,
  template text, executive_summary text, scope text, deliverables text, methodology text,
  timeline text, assumptions text, terms text, value numeric, owner text, status text,
  contact_person text, contact_email text, contact_phone text, next_follow_up text,
  cancelled_at text, cancel_reason text, company_id text, created_at_iso text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);

CREATE TABLE public.crm_quotations (
  id text NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, proposal_id text, opportunity_id text, customer_name text, title text,
  value numeric, discount_pct numeric, tax_pct numeric, freight numeric, margin_pct numeric,
  currency text, payment_terms text, delivery_terms text, validity text, revision numeric,
  views numeric, owner text, status text,
  contact_person text, contact_email text, contact_phone text, next_follow_up text,
  cancelled_at text, cancel_reason text, company_id text, created_at_iso text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);

CREATE TABLE public.crm_oas (
  id text NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, quotation_id text, customer_name text, title text, value numeric,
  po_number text, po_date text, owner text, status text, sales_order_id text, project_id text,
  contact_person text, contact_email text, contact_phone text, next_follow_up text,
  cancelled_at text, cancel_reason text, company_id text, created_at_iso text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);

CREATE TABLE public.crm_sales_orders (
  id text NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, oa_id text, customer_name text, title text, value numeric, po_number text,
  delivery_date text, payment_terms text, owner text, project_code text, project_id text, status text,
  contact_person text, contact_email text, contact_phone text, next_follow_up text,
  cancelled_at text, cancel_reason text, company_id text, created_at_iso text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);

CREATE TABLE public.crm_activities (
  id text NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_kind text, entity_id text, type text, title text, detail text, actor text, at text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);

CREATE TABLE public.crm_notes (
  id text NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_kind text, entity_id text, body text, author text, at text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);

CREATE TABLE public.crm_emails (
  id text NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_kind text, entity_id text, direction text, subject text, preview text,
  from_addr text, to_addr text, at text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);

CREATE TABLE public.crm_documents (
  id text NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_kind text, entity_id text, name text, kind text, size text, uploaded_by text, at text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);

CREATE TABLE public.crm_approvals (
  id text NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_kind text, entity_id text, step text, approver text, status text, comment text, at text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);

CREATE TABLE public.crm_projects (
  id text NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, name text, customer_name text, value numeric, oa_id text, status text,
  created_at_iso text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'crm_customers','crm_leads','crm_opportunities','crm_rfqs','crm_proposals',
    'crm_quotations','crm_oas','crm_sales_orders','crm_activities','crm_notes',
    'crm_emails','crm_documents','crm_approvals','crm_projects'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "Users manage own rows" ON public.%I FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())', t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at()', t, t);
  END LOOP;
END;
$$;