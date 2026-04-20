
-- 1. verified flag on companies
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

-- Admin can update any company profile (verify)
DROP POLICY IF EXISTS "company_profiles_update_admin" ON public.company_profiles;
CREATE POLICY "company_profiles_update_admin"
ON public.company_profiles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Student can delete (withdraw) own application
DROP POLICY IF EXISTS "applications_delete_student" ON public.applications;
CREATE POLICY "applications_delete_student"
ON public.applications FOR DELETE
TO authenticated
USING (auth.uid() = student_id);

-- Admin can delete jobs / applications too
DROP POLICY IF EXISTS "jobs_delete_admin" ON public.jobs;
CREATE POLICY "jobs_delete_admin"
ON public.jobs FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "jobs_update_admin" ON public.jobs;
CREATE POLICY "jobs_update_admin"
ON public.jobs FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Interviews table
CREATE TYPE public.interview_type AS ENUM ('online', 'onsite');
CREATE TYPE public.interview_status AS ENUM ('scheduled', 'completed', 'cancelled');

CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  type public.interview_type NOT NULL DEFAULT 'online',
  location TEXT,
  notes TEXT,
  status public.interview_status NOT NULL DEFAULT 'scheduled',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interviews_application ON public.interviews(application_id);
CREATE INDEX idx_interviews_scheduled ON public.interviews(scheduled_at);

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interviews_select_involved"
ON public.interviews FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    LEFT JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = interviews.application_id
      AND (a.student_id = auth.uid() OR j.company_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "interviews_insert_company"
ON public.interviews FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = interviews.application_id AND j.company_id = auth.uid()
  )
);

CREATE POLICY "interviews_update_company"
ON public.interviews FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = interviews.application_id AND j.company_id = auth.uid()
  )
);

CREATE POLICY "interviews_delete_company"
ON public.interviews FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = interviews.application_id AND j.company_id = auth.uid()
  )
);

CREATE TRIGGER trg_interviews_updated_at
BEFORE UPDATE ON public.interviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Notify on interview lifecycle
CREATE OR REPLACE FUNCTION public.notify_interview()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_uid UUID;
  job_title TEXT;
  fmt_when TEXT;
BEGIN
  SELECT a.student_id, j.title
    INTO student_uid, job_title
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = NEW.application_id;

  IF student_uid IS NULL THEN
    RETURN NEW;
  END IF;

  fmt_when := to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'Mon DD, YYYY HH24:MI') || ' UTC';

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      student_uid, 'interview_scheduled',
      'Interview scheduled',
      'You have an interview for "' || COALESCE(job_title,'a job') || '" on ' || fmt_when || '.',
      '/applications'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (student_uid, 'interview_cancelled', 'Interview cancelled',
        'Your interview for "' || COALESCE(job_title,'a job') || '" was cancelled.', '/applications');
    ELSIF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (student_uid, 'interview_rescheduled', 'Interview rescheduled',
        'New time for "' || COALESCE(job_title,'a job') || '": ' || fmt_when || '.', '/applications');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_interview_ins
AFTER INSERT ON public.interviews
FOR EACH ROW EXECUTE FUNCTION public.notify_interview();

CREATE TRIGGER trg_notify_interview_upd
AFTER UPDATE ON public.interviews
FOR EACH ROW EXECUTE FUNCTION public.notify_interview();

-- 5. Auto-close expired jobs (lightweight: function callable from app or cron)
CREATE OR REPLACE FUNCTION public.close_expired_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE public.jobs
  SET is_open = false
  WHERE is_open = true
    AND expires_at IS NOT NULL
    AND expires_at < now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_expired_jobs() TO authenticated;
