import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MatchBar } from "@/components/MatchBar";
import { Loader2, MapPin, ArrowLeft, CheckCircle2, Building2, Sparkles, Bookmark, BookmarkCheck, AlertCircle } from "lucide-react";
import { computeMatchScore, matchBreakdown, type StudentMatchInput, type ExperienceLevel } from "@/lib/match";
import { toast } from "@/hooks/use-toast";
import { useSavedJobs } from "@/hooks/useSavedJobs";

const JobDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { isSaved, toggle } = useSavedJobs();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [student, setStudent] = useState<StudentMatchInput | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [ats, setAts] = useState<{ ats_score: number; missing_skills: string[]; matched_skills: string[]; suggestions: string; summary: string } | null>(null);
  const [scoring, setScoring] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const [{ data: j }, { data: sp }, { data: app }] = await Promise.all([
        supabase.from("jobs").select("*, company_profiles(company_name, industry, location, description)").eq("id", id).maybeSingle(),
        supabase.from("student_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("applications").select("id, ats_score, missing_skills, suggestions").eq("job_id", id).eq("student_id", user.id).maybeSingle(),
      ]);
      setJob(j);
      setStudent({
        skills: sp?.skills ?? [],
        preferred_roles: sp?.preferred_roles ?? [],
        experience_level: (sp?.experience_level ?? "entry") as ExperienceLevel,
        location: sp?.location ?? null,
      });
      setResumeText(sp?.resume_text ?? "");
      setApplied(!!app);
      if (app?.ats_score) {
        setAts({
          ats_score: app.ats_score,
          missing_skills: app.missing_skills ?? [],
          matched_skills: [],
          suggestions: app.suggestions ?? "",
          summary: "",
        });
      }
      setLoading(false);
    })();
  }, [id, user]);

  const breakdown = useMemo(() => {
    if (!job || !student) return null;
    return matchBreakdown(student, {
      required_skills: job.required_skills ?? [],
      preferred_roles: job.preferred_roles ?? [],
      experience_level: job.experience_level,
      location: job.location,
      title: job.title,
    });
  }, [job, student]);

  const runAts = async () => {
    if (!resumeText) {
      toast({ title: "Upload your resume first", description: "Go to your profile and upload a PDF.", variant: "destructive" });
      return;
    }
    setScoring(true);
    const { data, error } = await supabase.functions.invoke("ats-score", {
      body: {
        resume_text: resumeText,
        job: {
          title: job.title,
          description: job.description,
          required_skills: job.required_skills,
          preferred_roles: job.preferred_roles,
          experience_level: job.experience_level,
        },
      },
    });
    setScoring(false);
    if (error || (data as any)?.error) {
      toast({ title: "ATS scoring failed", description: error?.message ?? (data as any)?.error, variant: "destructive" });
      return;
    }
    setAts(data as any);
  };

  const apply = async () => {
    if (!user || !job || !student) return;
    setApplying(true);
    const score = computeMatchScore(student, {
      required_skills: job.required_skills ?? [],
      preferred_roles: job.preferred_roles ?? [],
      experience_level: job.experience_level,
      location: job.location,
      title: job.title,
    });
    const { error } = await supabase.from("applications").insert({
      job_id: job.id,
      student_id: user.id,
      match_score: score,
      status: "applied",
      cover_note: coverNote.trim() || null,
      ats_score: ats?.ats_score ?? 0,
      missing_skills: ats?.missing_skills ?? [],
      suggestions: ats?.suggestions ?? null,
    });
    setApplying(false);
    if (error) {
      toast({ title: "Couldn't apply", description: error.message, variant: "destructive" });
    } else {
      setApplied(true);
      toast({ title: "Application sent ✨", description: "Track its status from My applications." });
    }
  };

  if (loading) return <AppShell><div className="flex justify-center p-20"><Loader2 className="h-6 w-6 animate-spin"/></div></AppShell>;
  if (!job) return <AppShell><div className="text-center p-12">Job not found.</div></AppShell>;

  const saved = isSaved(job.id);

  return (
    <AppShell>
      <div className="max-w-4xl space-y-6">
        <Button variant="ghost" onClick={() => nav(-1)} className="-ml-3"><ArrowLeft className="h-4 w-4 mr-1"/>Back</Button>

        <Card className="p-7">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
            <div className="min-w-0">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {job.company_profiles?.company_name ?? "Company"}
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground mt-2">
                {job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4"/>{job.location}</span>}
                <span className="capitalize">{job.experience_level}</span>
                {job.work_mode && <span className="capitalize">{job.work_mode}</span>}
                {job.job_type && <span className="capitalize">{String(job.job_type).replace("_"," ")}</span>}
                {(job.salary_min || job.salary_max) && (
                  <span>${(job.salary_min ?? 0).toLocaleString()}–${(job.salary_max ?? 0).toLocaleString()}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => toggle(job.id)} aria-label={saved ? "Unsave" : "Save"}>
                {saved ? <BookmarkCheck className="h-4 w-4 text-primary"/> : <Bookmark className="h-4 w-4"/>}
              </Button>
              <div className="text-center px-5 py-3 rounded-xl gradient-card border-2 border-primary/20">
                <div className="text-xs text-muted-foreground">Your match</div>
                <div className="font-display font-bold text-4xl text-gradient">{breakdown?.total ?? 0}%</div>
              </div>
            </div>
          </div>

          {!applied && (
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="cover">Cover note (optional)</Label>
                <Textarea id="cover" value={coverNote} onChange={(e) => setCoverNote(e.target.value)} rows={3} maxLength={1500} placeholder="Why are you a great fit?"/>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={apply} disabled={applying} size="lg" className="gradient-primary text-primary-foreground border-0 shadow-soft hover:shadow-glow transition-smooth">
                  {applying ? <Loader2 className="h-4 w-4 animate-spin"/> : "Apply now"}
                </Button>
                <Button onClick={runAts} disabled={scoring} variant="outline" size="lg" className="gap-2">
                  {scoring ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4 text-primary"/>}
                  {ats ? "Re-run AI ATS check" : "Check my ATS score"}
                </Button>
              </div>
            </div>
          )}
          {applied && (
            <Button disabled className="bg-success text-success-foreground">
              <CheckCircle2 className="h-4 w-4 mr-2"/> Applied
            </Button>
          )}
        </Card>

        {ats && (
          <Card className="p-6 border-2 border-primary/30">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display font-bold text-xl inline-flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary"/>AI ATS evaluation
                </h2>
                {ats.summary && <p className="text-sm text-muted-foreground mt-1">{ats.summary}</p>}
              </div>
              <div className="text-center px-4 py-2 rounded-xl gradient-primary text-primary-foreground shrink-0">
                <div className="text-[10px] uppercase tracking-wide opacity-80">ATS</div>
                <div className="font-display font-bold text-3xl">{ats.ats_score}</div>
              </div>
            </div>
            {ats.missing_skills.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-semibold mb-2 inline-flex items-center gap-1.5"><AlertCircle className="h-4 w-4 text-warning"/>Missing skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {ats.missing_skills.map((s) => (
                    <Badge key={s} variant="outline" className="bg-warning/10 text-warning border-warning/30">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {ats.suggestions && (
              <div>
                <div className="text-sm font-semibold mb-1">Suggestions</div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ats.suggestions}</p>
              </div>
            )}
          </Card>
        )}

        {breakdown && (
          <Card className="p-6">
            <h2 className="font-display font-bold text-xl mb-4">Match breakdown</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { k: "Skills", v: breakdown.skills, w: "60%" },
                { k: "Role fit", v: breakdown.role, w: "20%" },
                { k: "Experience", v: breakdown.experience, w: "10%" },
                { k: "Location", v: breakdown.location, w: "10%" },
              ].map((b) => (
                <div key={b.k}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{b.k}</span>
                    <span className="text-muted-foreground">weight {b.w}</span>
                  </div>
                  <MatchBar score={b.v} showLabel={false}/>
                  <div className="text-xs text-muted-foreground mt-1">{b.v}%</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="font-display font-bold text-xl mb-3">Required skills</h2>
          <div className="flex flex-wrap gap-2">
            {(job.required_skills ?? []).map((s: string) => {
              const has = student?.skills.map((x) => x.toLowerCase()).includes(s.toLowerCase());
              return (
                <Badge key={s} variant="outline" className={has
                  ? "bg-success/10 text-success border-success/30"
                  : "bg-muted text-muted-foreground"}>
                  {has && <CheckCircle2 className="h-3 w-3 mr-1"/>}{s}
                </Badge>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display font-bold text-xl mb-3">About the role</h2>
          <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{job.description || "No description provided."}</p>
        </Card>

        {job.company_profiles && (
          <Card className="p-6">
            <h2 className="font-display font-bold text-xl mb-3 flex items-center gap-2"><Building2 className="h-5 w-5"/>About the company</h2>
            <div className="text-sm text-muted-foreground space-y-1">
              {job.company_profiles.industry && <div>{job.company_profiles.industry}</div>}
              {job.company_profiles.location && <div>{job.company_profiles.location}</div>}
              {job.company_profiles.description && <p className="mt-2 whitespace-pre-wrap">{job.company_profiles.description}</p>}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
};

export default JobDetail;
