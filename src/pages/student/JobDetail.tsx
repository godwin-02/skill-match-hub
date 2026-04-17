import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchBar } from "@/components/MatchBar";
import { Loader2, MapPin, ArrowLeft, CheckCircle2, Building2 } from "lucide-react";
import { computeMatchScore, matchBreakdown, type StudentMatchInput, type ExperienceLevel } from "@/lib/match";
import { toast } from "@/hooks/use-toast";

const JobDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [student, setStudent] = useState<StudentMatchInput | null>(null);
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const [{ data: j }, { data: sp }, { data: app }] = await Promise.all([
        supabase.from("jobs").select("*, company_profiles(company_name, industry, location, description)").eq("id", id).maybeSingle(),
        supabase.from("student_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("applications").select("id").eq("job_id", id).eq("student_id", user.id).maybeSingle(),
      ]);
      setJob(j);
      setStudent({
        skills: sp?.skills ?? [],
        preferred_roles: sp?.preferred_roles ?? [],
        experience_level: (sp?.experience_level ?? "entry") as ExperienceLevel,
        location: sp?.location ?? null,
      });
      setApplied(!!app);
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
      job_id: job.id, student_id: user.id, match_score: score, status: "applied",
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
                {(job.salary_min || job.salary_max) && (
                  <span>${(job.salary_min ?? 0).toLocaleString()}–${(job.salary_max ?? 0).toLocaleString()}</span>
                )}
              </div>
            </div>
            <div className="text-center px-5 py-3 rounded-xl gradient-card border-2 border-primary/20">
              <div className="text-xs text-muted-foreground">Your match</div>
              <div className="font-display font-bold text-4xl text-gradient">{breakdown?.total ?? 0}%</div>
            </div>
          </div>

          {applied ? (
            <Button disabled className="w-full sm:w-auto bg-success text-success-foreground">
              <CheckCircle2 className="h-4 w-4 mr-2"/> Applied
            </Button>
          ) : (
            <Button onClick={apply} disabled={applying} size="lg" className="w-full sm:w-auto gradient-primary text-primary-foreground border-0 shadow-soft hover:shadow-glow transition-smooth">
              {applying ? <Loader2 className="h-4 w-4 animate-spin"/> : "Apply now"}
            </Button>
          )}
        </Card>

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
