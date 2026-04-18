-- =========================
-- Saved jobs
-- =========================
CREATE TABLE public.saved_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  job_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, job_id)
);
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_jobs_select_self" ON public.saved_jobs
FOR SELECT TO authenticated USING (auth.uid() = student_id);

CREATE POLICY "saved_jobs_insert_self" ON public.saved_jobs
FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id AND public.has_role(auth.uid(), 'student'));

CREATE POLICY "saved_jobs_delete_self" ON public.saved_jobs
FOR DELETE TO authenticated USING (auth.uid() = student_id);

CREATE INDEX idx_saved_jobs_student ON public.saved_jobs(student_id);

-- =========================
-- Notifications
-- =========================
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_self" ON public.notifications
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_self" ON public.notifications
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_self" ON public.notifications
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- inserts come from triggers / server / RLS-bypassing role; allow self-insert too
CREATE POLICY "notifications_insert_self_or_system" ON public.notifications
FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.applications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;

-- =========================
-- Application enrichments
-- =========================
ALTER TABLE public.applications
  ADD COLUMN ats_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN missing_skills TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN suggestions TEXT;

-- =========================
-- Student profile resume fields
-- =========================
ALTER TABLE public.student_profiles
  ADD COLUMN resume_url TEXT,
  ADD COLUMN resume_text TEXT,
  ADD COLUMN phone TEXT;

-- =========================
-- Jobs: filters
-- =========================
DO $$ BEGIN
  CREATE TYPE public.work_mode AS ENUM ('remote','hybrid','onsite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.job_type AS ENUM ('full_time','part_time','internship','contract');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.jobs
  ADD COLUMN work_mode public.work_mode NOT NULL DEFAULT 'onsite',
  ADD COLUMN job_type public.job_type NOT NULL DEFAULT 'full_time',
  ADD COLUMN expires_at TIMESTAMPTZ;

-- =========================
-- Notify trigger when application status changes
-- =========================
CREATE OR REPLACE FUNCTION public.notify_application_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_title TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT title INTO job_title FROM public.jobs WHERE id = NEW.job_id;
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.student_id,
      'application_status',
      'Application ' || NEW.status::text,
      'Your application for "' || COALESCE(job_title,'a job') || '" is now ' || NEW.status::text || '.',
      '/applications'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_application_status ON public.applications;
CREATE TRIGGER trg_notify_application_status
AFTER UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.notify_application_status();

-- =========================
-- Notify trigger when a new application arrives (notify company)
-- =========================
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_uid UUID;
  job_title TEXT;
BEGIN
  SELECT company_id, title INTO company_uid, job_title FROM public.jobs WHERE id = NEW.job_id;
  IF company_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      company_uid,
      'new_application',
      'New applicant',
      'A new candidate applied to "' || COALESCE(job_title,'your job') || '".',
      '/company/jobs/' || NEW.job_id || '/applicants'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_application ON public.applications;
CREATE TRIGGER trg_notify_new_application
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.notify_new_application();

-- =========================
-- Storage: resumes bucket (private)
-- =========================
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Students manage own files at resumes/<uid>/...
CREATE POLICY "resumes_owner_select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "resumes_owner_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "resumes_owner_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "resumes_owner_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Companies can read resumes of users who applied to their jobs
CREATE POLICY "resumes_company_read_applicants" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'resumes'
  AND EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE j.company_id = auth.uid()
      AND a.student_id::text = (storage.foldername(name))[1]
  )
);