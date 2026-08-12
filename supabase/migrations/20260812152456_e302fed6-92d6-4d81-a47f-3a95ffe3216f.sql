-- Phase 2: Projects + Engineering (PLM) cloud tables, per-user sandbox

CREATE TABLE public.prj_projects (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, name text, customer_name text, oa_id text, value numeric, budget numeric, spent numeric,
  start_date text, end_date text, status text, progress numeric, rag text, manager text, created_at_iso text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.prj_wbs (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text, parent_id text, code text, name text, owner text, start text, "end" text,
  progress numeric, status text, weight numeric,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.prj_milestones (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text, name text, due text, status text, billing numeric,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.prj_risks (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text, title text, category text, probability numeric, impact numeric,
  mitigation text, owner text, status text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.prj_issues (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text, title text, severity text, raised_by text, assignee text, status text, raised_at text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.prj_changes (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text, code text, title text, impact_cost numeric, impact_days numeric,
  status text, raised_by text, raised_at text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.prj_docs (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text, name text, kind text, size text, uploaded_by text, at text, version text,
  notes text, file_url text, file_url_name text, file_url_type text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.prj_team (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text, name text, role text, allocation_pct numeric, email text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.prj_events (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text, title text, date text, kind text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.prj_budget (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text, category text, planned numeric, committed numeric, actual numeric,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.eng_items (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, name text, type text, uom text, rev text, std_cost numeric, make_buy text,
  lifecycle text, created_at_iso text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.eng_parts (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, name text, category text, supplier text, material text, weight numeric, rev text, created_at_iso text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.eng_drawings (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  number text, title text, item_code text, rev text, format text, size text, uploaded_by text,
  released_at text, status text, project_code text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.eng_bom (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text, parent_id text, item_code text, item_name text, qty numeric, uom text, rev text,
  ref_des text, procurement text, root_id text, project_code text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.eng_ecns (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, title text, item_code text, from_rev text, to_rev text, reason text, effectivity text,
  status text, raised_by text, created_at_iso text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.eng_ecrs (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, title text, item_code text, description text, priority text, status text,
  raised_by text, created_at_iso text, linked_ecn text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.eng_reviews (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, title text, item_code text, reviewers jsonb, scheduled text, outcome text, actions numeric,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.eng_design_docs (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, title text, category text, project_code text, item_code text, bom_root_id text,
  ecr_code text, ecn_code text, owner text, discipline text, status text, version text,
  created_at_iso text, updated_at_iso text, file_url text, file_url_name text, file_url_type text,
  size text, notes text, versions jsonb, audit jsonb,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

CREATE TABLE public.eng_work_orders (
  id text NOT NULL, owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text, item_code text, item_name text, qty numeric, uom text, project_code text,
  bom_root_id text, bom_node_id text, work_center text, planned_start text, planned_end text,
  status text, est_cost numeric, reserved_value numeric, created_at_iso text, source text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'prj_projects','prj_wbs','prj_milestones','prj_risks','prj_issues','prj_changes','prj_docs',
    'prj_team','prj_events','prj_budget','eng_items','eng_parts','eng_drawings','eng_bom',
    'eng_ecns','eng_ecrs','eng_reviews','eng_design_docs','eng_work_orders'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Users manage own rows" ON public.%I FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())', t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at()', t, t);
  END LOOP;
END;
$$;