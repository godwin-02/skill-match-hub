import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MatchBar } from "@/components/MatchBar";
import { Loader2, Search, MapPin, Briefcase } from "lucide-react";
import { computeMatchScore, type StudentMatchInput, type ExperienceLevel } from "@/lib/match";

const JobsBrowse = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentMatchInput | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: sp }, { data: js }] = await Promise.all([
        supabase.from("student_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("jobs").select("*, company_profiles(company_name)").eq("is_open", true).order("created_at", { ascending: false }),
      ]);
      setStudent({
        skills: sp?.skills ?? [],
        preferred_roles: sp?.preferred_roles ?? [],
        experience_level: (sp?.experience_level ?? "entry") as ExperienceLevel,
        location: sp?.location ?? null,
      });
      setJobs(js ?? []);
      setLoading(false);
    })();
  }, [user]);

  const ranked = useMemo(() => {
    if (!student) return [];
    const scored = jobs.map((j) => ({
      ...j,
      match: computeMatchScore(student, {
        required_skills: j.required_skills ?? [],
        preferred_roles: j.preferred_roles ?? [],
        experience_level: j.experience_level,
        location: j.location,
        title: j.title,
      }),
    }));
    const filt = q.trim().toLowerCase();
    const filtered = filt
      ? scored.filter((j) =>
          j.title.toLowerCase().includes(filt) ||
          j.location?.toLowerCase().includes(filt) ||
          (j.required_skills ?? []).some((s: string) => s.toLowerCase().includes(filt)) ||
          j.company_profiles?.company_name?.toLowerCase().includes(filt))
      : scored;
    return filtered.sort((a, b) => b.match - a.match);
  }, [jobs, student, q]);

  if (loading) return <AppShell><div className="flex justify-center p-20"><Loader2 className="h-6 w-6 animate-spin"/></div></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold">Browse jobs</h1>
          <p className="text-muted-foreground">{ranked.length} open · sorted by your match</p>
        </div>

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <Input
            placeholder="Search title, skill, location…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {ranked.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50"/>
            No jobs match your search.
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {ranked.map((j) => (
              <Link key={j.id} to={`/jobs/${j.id}`}>
                <Card className="p-5 h-full border-2 hover:border-primary/40 hover:shadow-soft transition-smooth">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        {j.company_profiles?.company_name ?? "Company"}
                      </div>
                      <h3 className="font-display font-bold text-lg leading-tight">{j.title}</h3>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display font-bold text-2xl text-gradient">{j.match}%</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                    {j.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3"/>{j.location}</span>}
                    <span className="capitalize">{j.experience_level}</span>
                    {(j.salary_min || j.salary_max) && (
                      <span>${(j.salary_min ?? 0).toLocaleString()}–${(j.salary_max ?? 0).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(j.required_skills ?? []).slice(0, 5).map((s: string) => (
                      <Badge key={s} variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">{s}</Badge>
                    ))}
                  </div>
                  <MatchBar score={j.match} showLabel={false}/>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default JobsBrowse;
