import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MatchBar } from "@/components/MatchBar";
import { ProfileCompleteness } from "@/components/ProfileCompleteness";
import { computeMatchScore, type StudentMatchInput, type ExperienceLevel } from "@/lib/match";
import { computeStudentCompleteness, type CompletenessField } from "@/lib/profileCompleteness";
import { Briefcase, FileText, Sparkles, TrendingUp, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

const StudentDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentMatchInput | null>(null);
  const [completeness, setCompleteness] = useState<{ percent: number; fields: CompletenessField[] }>({ percent: 0, fields: [] });
  const [profileEmpty, setProfileEmpty] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [appsCount, setAppsCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: sp }, { data: prof }, { data: js }, { count }] = await Promise.all([
        supabase.from("student_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("jobs").select("*, company_profiles(company_name, logo_url)").eq("is_open", true).order("created_at", { ascending: false }).limit(20),
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("student_id", user.id),
      ]);
      const s: StudentMatchInput = {
        skills: sp?.skills ?? [],
        preferred_roles: sp?.preferred_roles ?? [],
        experience_level: (sp?.experience_level ?? "entry") as ExperienceLevel,
        location: sp?.location ?? null,
      };
      setStudent(s);
      setCompleteness(
        computeStudentCompleteness({
          full_name: prof?.full_name,
          headline: sp?.headline,
          bio: sp?.bio,
          skills: sp?.skills,
          education: sp?.education,
          preferred_roles: sp?.preferred_roles,
          location: sp?.location,
          resume_url: sp?.resume_url,
          projects: sp?.projects,
        }),
      );
      setProfileEmpty((sp?.skills ?? []).length === 0);
      setJobs(js ?? []);
      setAppsCount(count ?? 0);
      setLoading(false);
    })();
  }, [user]);

  const ranked = useMemo(() => {
    if (!student) return [];
    return jobs
      .map((j) => ({
        ...j,
        match: computeMatchScore(student, {
          required_skills: j.required_skills ?? [],
          preferred_roles: j.preferred_roles ?? [],
          experience_level: j.experience_level,
          location: j.location,
          title: j.title,
        }),
      }))
      .sort((a, b) => b.match - a.match)
      .slice(0, 5);
  }, [jobs, student]);

  if (loading) return <AppShell><div className="flex justify-center p-20"><Loader2 className="h-6 w-6 animate-spin"/></div></AppShell>;

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-4xl font-bold">Hey there 👋</h1>
          <p className="text-muted-foreground">Here are your top job matches today.</p>
        </div>

        {profileEmpty && (
          <Card className="p-5 border-2 border-warning/50 bg-warning/10 flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-warning-foreground shrink-0 mt-0.5"/>
            <div className="flex-1">
              <div className="font-semibold mb-1">Add your skills to unlock matching</div>
              <div className="text-sm text-muted-foreground">Without skills, every job shows a 0% match.</div>
            </div>
            <Button asChild size="sm"><Link to="/profile">Complete profile</Link></Button>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid sm:grid-cols-3 gap-4">
            <StatCard icon={Briefcase} label="Open jobs" value={jobs.length} tone="primary"/>
            <StatCard icon={FileText} label="Applications" value={appsCount} tone="accent"/>
            <StatCard icon={TrendingUp} label="Top match" value={`${ranked[0]?.match ?? 0}%`} tone="success"/>
          </div>
          <ProfileCompleteness percent={completeness.percent} fields={completeness.fields}/>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-2xl font-bold">Top matches for you</h2>
              <p className="text-sm text-muted-foreground">Sorted by your skills, role and experience.</p>
            </div>
            <Button asChild variant="ghost"><Link to="/jobs">See all <ArrowRight className="ml-1 h-4 w-4"/></Link></Button>
          </div>
          {ranked.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50"/>
              No jobs posted yet. Check back soon!
            </div>
          ) : (
            <div className="space-y-3">
              {ranked.map((j) => {
                const logo = j.company_profiles?.logo_url;
                return (
                  <Link key={j.id} to={`/jobs/${j.id}`}
                    className="block p-4 rounded-xl border border-border hover:border-primary/40 hover:shadow-soft transition-smooth">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-muted/40 border border-border overflow-hidden shrink-0 flex items-center justify-center">
                        {logo ? (
                          <img src={logo} alt="" className="h-full w-full object-cover"/>
                        ) : (
                          <span className="font-display font-bold text-sm text-muted-foreground">
                            {(j.company_profiles?.company_name ?? "?").charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-bold truncate">{j.title}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {j.company_profiles?.company_name ?? "Company"} · {j.location ?? "Remote"}
                        </div>
                      </div>
                      <div className="w-32 shrink-0"><MatchBar score={j.match}/></div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
};

const StatCard = ({ icon: Icon, label, value, tone }: any) => (
  <Card className="p-5 flex items-center gap-4">
    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
      tone === "primary" ? "gradient-primary" : tone === "accent" ? "gradient-accent" : "bg-success"
    }`}>
      <Icon className={`h-6 w-6 ${tone === "accent" ? "text-accent-foreground" : "text-white"}`}/>
    </div>
    <div>
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</div>
      <div className="font-display text-2xl font-bold">{value}</div>
    </div>
  </Card>
);

export default StudentDashboard;
