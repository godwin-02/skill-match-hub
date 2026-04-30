-- Messages table scoped to an application (student <-> company chat)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 4000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_application ON public.messages(application_id, created_at);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a participant of the application?
CREATE OR REPLACE FUNCTION public.is_application_participant(_application_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = _application_id
      AND (a.student_id = _user_id OR j.company_id = _user_id)
  )
$$;

CREATE POLICY messages_select_participants ON public.messages
FOR SELECT TO authenticated
USING (
  public.is_application_participant(application_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY messages_insert_participant ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_application_participant(application_id, auth.uid())
);

CREATE POLICY messages_update_recipient ON public.messages
FOR UPDATE TO authenticated
USING (
  public.is_application_participant(application_id, auth.uid())
);

CREATE POLICY messages_delete_sender ON public.messages
FOR DELETE TO authenticated
USING (auth.uid() = sender_id);

-- Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Notify the other party
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_uid UUID;
  company_uid UUID;
  job_title TEXT;
  recipient UUID;
BEGIN
  SELECT a.student_id, j.company_id, j.title
    INTO student_uid, company_uid, job_title
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = NEW.application_id;

  IF NEW.sender_id = student_uid THEN
    recipient := company_uid;
  ELSE
    recipient := student_uid;
  END IF;

  IF recipient IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      recipient,
      'new_message',
      'New message',
      'New message about "' || COALESCE(job_title,'an application') || '".',
      '/messages/' || NEW.application_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();