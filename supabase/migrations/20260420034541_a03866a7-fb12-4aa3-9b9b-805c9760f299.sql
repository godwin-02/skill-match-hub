
-- 1. Company logos bucket (public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Company logos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Company uploads own logo (path = {user_id}/...)
CREATE POLICY "Companies can upload their own logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Companies can update their own logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Companies can delete their own logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 2. Application status history
CREATE TABLE public.application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  status public.application_status NOT NULL,
  changed_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ash_application ON public.application_status_history(application_id, created_at);

ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Status history viewable by involved"
ON public.application_status_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    LEFT JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = application_status_history.application_id
      AND (a.student_id = auth.uid() OR j.company_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Trigger: log on insert + status change
CREATE OR REPLACE FUNCTION public.log_application_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.application_status_history (application_id, status, changed_by)
    VALUES (NEW.id, NEW.status, NEW.student_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.application_status_history (application_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_application_status_ins ON public.applications;
CREATE TRIGGER trg_log_application_status_ins
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.log_application_status();

DROP TRIGGER IF EXISTS trg_log_application_status_upd ON public.applications;
CREATE TRIGGER trg_log_application_status_upd
AFTER UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.log_application_status();

-- Re-attach notification triggers (they live on applications table already as functions, ensure triggers exist)
DROP TRIGGER IF EXISTS trg_notify_new_application ON public.applications;
CREATE TRIGGER trg_notify_new_application
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.notify_new_application();

DROP TRIGGER IF EXISTS trg_notify_application_status ON public.applications;
CREATE TRIGGER trg_notify_application_status
AFTER UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.notify_application_status();

-- Backfill: initial "applied" entry for existing apps
INSERT INTO public.application_status_history (application_id, status, changed_by, created_at)
SELECT a.id, 'applied'::public.application_status, a.student_id, a.applied_at
FROM public.applications a
WHERE NOT EXISTS (
  SELECT 1 FROM public.application_status_history h WHERE h.application_id = a.id
);
