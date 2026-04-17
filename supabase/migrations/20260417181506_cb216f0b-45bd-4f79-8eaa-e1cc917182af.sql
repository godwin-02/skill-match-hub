-- ==========================================
-- ENUMS
-- ==========================================
CREATE TYPE public.app_role AS ENUM ('student', 'company', 'admin');
CREATE TYPE public.application_status AS ENUM ('applied', 'shortlisted', 'interview', 'accepted', 'rejected');
CREATE TYPE public.experience_level AS ENUM ('entry', 'junior', 'mid', 'senior');

-- ==========================================
-- UPDATED_AT TRIGGER FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ==========================================
-- PROFILES (basic info, mirrors auth.users)
-- ==========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- USER ROLES (separate, secure)
-- ==========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- get current user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- ==========================================
-- STUDENT PROFILES
-- ==========================================
CREATE TABLE public.student_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  headline TEXT,
  bio TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  education TEXT,
  projects TEXT,
  experience_level experience_level NOT NULL DEFAULT 'entry',
  preferred_roles TEXT[] NOT NULL DEFAULT '{}',
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER student_profiles_updated_at BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- COMPANY PROFILES
-- ==========================================
CREATE TABLE public.company_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT '',
  industry TEXT,
  location TEXT,
  website TEXT,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER company_profiles_updated_at BEFORE UPDATE ON public.company_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- JOBS
-- ==========================================
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  preferred_roles TEXT[] NOT NULL DEFAULT '{}',
  experience_level experience_level NOT NULL DEFAULT 'entry',
  location TEXT,
  salary_min INT,
  salary_max INT,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_jobs_company ON public.jobs(company_id);
CREATE INDEX idx_jobs_open ON public.jobs(is_open);
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- APPLICATIONS
-- ==========================================
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_score INT NOT NULL DEFAULT 0,
  status application_status NOT NULL DEFAULT 'applied',
  cover_note TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, student_id)
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_apps_job ON public.applications(job_id);
CREATE INDEX idx_apps_student ON public.applications(student_id);
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- AUTO-CREATE PROFILE + ROLE ON SIGNUP
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'::app_role);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  IF _role = 'student' THEN
    INSERT INTO public.student_profiles (user_id) VALUES (NEW.id);
  ELSIF _role = 'company' THEN
    INSERT INTO public.company_profiles (user_id, company_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.raw_user_meta_data->>'full_name', ''));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- profiles: anyone authenticated can read; only self can update
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles: user can see own; admins see all; no client-side mutations
CREATE POLICY "user_roles_select_self" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- student_profiles
CREATE POLICY "student_profiles_select_authenticated" ON public.student_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "student_profiles_insert_self" ON public.student_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "student_profiles_update_self" ON public.student_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- company_profiles
CREATE POLICY "company_profiles_select_authenticated" ON public.company_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "company_profiles_insert_self" ON public.company_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "company_profiles_update_self" ON public.company_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- jobs
CREATE POLICY "jobs_select_open_or_owner" ON public.jobs
  FOR SELECT TO authenticated USING (is_open = true OR auth.uid() = company_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "jobs_insert_company" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = company_id AND public.has_role(auth.uid(), 'company'));
CREATE POLICY "jobs_update_owner" ON public.jobs
  FOR UPDATE TO authenticated USING (auth.uid() = company_id);
CREATE POLICY "jobs_delete_owner" ON public.jobs
  FOR DELETE TO authenticated USING (auth.uid() = company_id);

-- applications
CREATE POLICY "applications_select_involved" ON public.applications
  FOR SELECT TO authenticated USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.company_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "applications_insert_student" ON public.applications
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = student_id AND public.has_role(auth.uid(), 'student')
  );
CREATE POLICY "applications_update_company" ON public.applications
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.company_id = auth.uid())
  );
