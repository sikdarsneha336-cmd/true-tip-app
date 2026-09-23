-- Extend the role enum with an administrator role (used only via server code)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

-- Activity history for reports: status changes and officer notes
CREATE TABLE IF NOT EXISTS public.report_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  officer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  officer_label text NOT NULL DEFAULT 'Staff',
  kind text NOT NULL CHECK (kind IN ('status_change','note')),
  old_status text,
  new_status text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_updates_report_idx ON public.report_updates (report_id, created_at DESC);

GRANT ALL ON public.report_updates TO service_role;

ALTER TABLE public.report_updates ENABLE ROW LEVEL SECURITY;
-- No policies: direct client access is denied; all access flows through
-- service-role server functions that verify the caller's staff role first.