import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MatchBar } from "@/components/MatchBar";
import {
  Loader2, Search, MapPin, Briefcase, Bookmark, BookmarkCheck, SlidersHorizontal, Clock, BadgeCheck,
} from "lucide-react";
import { computeMatchScore, type StudentMatchInput, type ExperienceLevel } from "@/lib/match";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { cn } from "@/lib/utils";
import { getRecentJobIds } from "@/lib/recentJobs";

const JobsBrowse = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentMatchInput | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [workMode, setWorkMode] = useState<string>("any");
  const [jobType, setJobType] = useState<string>("any");
  const [expLevel, setExpLevel] = useState<string>("any");
  const [minSalary, setMinSalary] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const { isSaved, toggle } = useSavedJobs();

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Auto-close expired jobs (lightweight; safe to run for any user)
      await supabase.rpc("close_expired_jobs").catch(() => {});
      const [{ data: sp }, { data: js }] = await Promise.all([
        supabase.from("student_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("jobs").select("*, company_profiles(company_name, logo_url, verified)").eq("is_open", true).order("created_at", { ascending: false }),
      ]);
      setStudent({
        skills: sp?.skills ?? [],
        preferred_roles: sp?.preferred_roles ?? [],
        experience_level: (sp?.experience_level ?? "entry") as ExperienceLevel,
        location: sp?.location ?? null,
      });
      setJobs(js ?? []);

      // Recently viewed
      const ids = getRecentJobIds().slice(0, 4);
      if (ids.length) {
        const { data: rv } = await supabase
          .from("jobs")
          .select("id, title, location, company_profiles(company_name, logo_url)")
          .in("id", ids)
          .eq("is_open", true);
        const ordered = ids.map((id) => rv?.find((j: any) => j.id === id)).filter(Boolean);
        setRecent(ordered as any[]);
      }
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
    const minSal = minSalary ? parseInt(minSalary, 10) : 0;
    const filtered = scored.filter((j) => {
      if (filt && !(
        j.title.toLowerCase().includes(filt) ||
        j.location?.toLowerCase().includes(filt) ||
        (j.required_skills ?? []).some((s: string) => s.toLowerCase().includes(filt)) ||
        j.company_profiles?.company_name?.toLowerCase().includes(filt)
      )) return false;
      if (workMode !== "any" && j.work_mode !== workMode) return false;
      if (jobType !== "any" && j.job_type !== jobType) return false;
      if (expLevel !== "any" && j.experience_level !== expLevel) return false;
      if (minSal && (j.salary_max ?? j.salary_min ?? 0) < minSal) return false;
      return true;
    });
    return filtered.sort((a, b) => b.match - a.match);
  }, [jobs, student, q, workMode, jobType, expLevel, minSalary]);

  const activeFilters = [workMode !== "any", jobType !== "any", expLevel !== "any", !!minSalary].filter(Boolean).length;

  if (loading) return <AppShell><div className="flex justify-center p-20"><Loader2 className="h-6 w-6 animate-spin"/></div></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold">Browse jobs</h1>
          <p className="text-muted-foreground">{ranked.length} of {jobs.length} jobs · sorted by your match</p>
        </div>

        {recent.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Clock className="h-3.5 w-3.5"/> Recently viewed
            </div>
            <div className="flex flex-wrap gap-2">
              {recent.map((r: any) => (
                <Link
                  key={r.id}
                  to={`/jobs/${r.id}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-sm transition-smooth"
                >
                  <span className="font-medium truncate max-w-[180px]">{r.title}</span>
                  <span className="text-xs text-muted-foreground">· {r.company_profiles?.company_name ?? "Company"}</span>
                </Link>
              ))}
            </div>
          </Card>
        )}

        <div className="flex gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input
              placeholder="Search title, skill, location…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <Button variant="outline" className="h-11 gap-2 relative" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal className="h-4 w-4"/>Filters
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <Card className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Work mode</div>
              <Select value={workMode} onValueChange={setWorkMode}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Job type</div>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="full_time">Full-time</SelectItem>
                  <SelectItem value="part_time">Part-time</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Experience</div>
              <Select value={expLevel} onValueChange={setExpLevel}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="entry">Entry</SelectItem>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="mid">Mid</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Min salary</div>
              <Input type="number" placeholder="e.g. 30000" value={minSalary} onChange={(e) => setMinSalary(e.target.value)}/>
            </div>
          </Card>
        )}

        {ranked.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50"/>
            No jobs match your filters.
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {ranked.map((j) => {
              const saved = isSaved(j.id);
              const logo = j.company_profiles?.logo_url;
              const verified = j.company_profiles?.verified;
              return (
                <Card key={j.id} className="p-5 h-full border-2 hover:border-primary/40 hover:shadow-soft transition-smooth relative group">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(j.id); }}
                    className={cn(
                      "absolute top-3 right-3 z-10 h-9 w-9 rounded-lg flex items-center justify-center transition-smooth",
                      saved ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary",
                    )}
                    aria-label={saved ? "Unsave job" : "Save job"}
                  >
                    {saved ? <BookmarkCheck className="h-4 w-4"/> : <Bookmark className="h-4 w-4"/>}
                  </button>
                  <Link to={`/jobs/${j.id}`} className="block">
                    <div className="flex items-start gap-3 mb-3 pr-10">
                      <div className="h-11 w-11 rounded-lg bg-muted/40 border border-border overflow-hidden shrink-0 flex items-center justify-center">
                        {logo ? (
                          <img src={logo} alt="" className="h-full w-full object-cover"/>
                        ) : (
                          <span className="font-display font-bold text-sm text-muted-foreground">
                            {(j.company_profiles?.company_name ?? "?").charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5 inline-flex items-center gap-1">
                          {j.company_profiles?.company_name ?? "Company"}
                          {verified && <BadgeCheck className="h-3.5 w-3.5 text-primary"/>}
                        </div>
                        <h3 className="font-display font-bold text-lg leading-tight">{j.title}</h3>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                      {j.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3"/>{j.location}</span>}
                      <span className="capitalize">{j.experience_level}</span>
                      {j.work_mode && <span className="capitalize">{j.work_mode}</span>}
                      {j.job_type && <span className="capitalize">{String(j.job_type).replace("_"," ")}</span>}
                      {(j.salary_min || j.salary_max) && (
                        <span>${(j.salary_min ?? 0).toLocaleString()}–${(j.salary_max ?? 0).toLocaleString()}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(j.required_skills ?? []).slice(0, 5).map((s: string) => (
                        <Badge key={s} variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">{s}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-display font-bold text-2xl text-gradient">{j.match}%</div>
                      <div className="flex-1"><MatchBar score={j.match} showLabel={false}/></div>
                    </div>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default JobsBrowse;
