import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Loader2, BarChart3, Users, FileCheck, Trophy, Clock, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type Status = "applied" | "shortlisted" | "interview" | "accepted" | "rejected";

const STAGES: { key: Status; label: string; tone: string }[] = [
  { key: "applied", label: "Applied", tone: "bg-primary" },
  { key: "shortlisted", label: "Shortlisted", tone: "bg-accent" },
  { key: "interview", label: "Interview", tone: "bg-warning" },
  { key: "accepted", label: "Hired", tone: "bg-success" },
];

const CompanyAnalytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: js } = await supabase
        .from("jobs")
        .select("id, title, is_open, created_at")
        .eq("company_id", user.id);
      const ids = (js ?? []).map((j) => j.id);
      let appsData: any[] = [];
      if (ids.length) {
        const { data } = await supabase
          .from("applications")
          .select("id, job_id, status, ats_score, match_score, applied_at, updated_at")
          .in("job_id", ids);
        appsData = data ?? [];
      }
      setJobs(js ?? []);
      setApps(appsData);
      setLoading(false);
    })();
  }, [user]);

  const stats = useMemo(() => {
    const total = apps.length;
    const byStatus = STAGES.reduce<Record<string, number>>((acc, s) => {
      acc[s.key] = apps.filter((a) => a.status === s.key).length;
      return acc;
    }, {});
    byStatus.rejected = apps.filter((a) => a.status === "rejected").length;
    const accepted = apps.filter((a) => a.status === "accepted");
    const avgAts = total > 0 ? Math.round(apps.reduce((s, a) => s + (a.ats_score || 0), 0) / total) : 0;
    const avgMatch = total > 0 ? Math.round(apps.reduce((s, a) => s + (a.match_score || 0), 0) / total) : 0;
    const ttHireDays =
      accepted.length > 0
        ? Math.round(
            accepted.reduce(
              (s, a) =>
                s +
                (new Date(a.updated_at).getTime() - new Date(a.applied_at).getTime()) /
                  (1000 * 60 * 60 * 24),
              0,
            ) / accepted.length,
          )
        : null;
    const conv = total > 0 ? Math.round((accepted.length / total) * 100) : 0;
    return { total, byStatus, avgAts, avgMatch, ttHireDays, conv, accepted: accepted.length };
  }, [apps]);

  const perJob = useMemo(() => {
    return jobs
      .map((j) => {
        const ja = apps.filter((a) => a.job_id === j.id);
        return {
          ...j,
          total: ja.length,
          hired: ja.filter((a) => a.status === "accepted").length,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [jobs, apps]);

  if (loading) return <AppShell><div className="flex justify-center p-20"><Loader2 className="h-6 w-6 animate-spin"/></div></AppShell>;

  if (jobs.length === 0) {
    return (
      <AppShell>
        <Card className="p-12 text-center text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50"/>
          Post your first job to see analytics.
          <div className="mt-4">
            <Link to="/company/jobs/new" className="text-primary font-medium hover:underline">Post a job →</Link>
          </div>
        </Card>
      </AppShell>
    );
  }

  const max = Math.max(stats.byStatus.applied, 1);

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-4xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Performance across all your jobs.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={Users} label="Applicants" value={stats.total} tone="primary"/>
          <Stat icon={Trophy} label="Hired" value={stats.accepted} tone="success"/>
          <Stat icon={FileCheck} label="Avg ATS" value={`${stats.avgAts}%`} tone="accent"/>
          <Stat
            icon={Clock}
            label="Time to hire"
            value={stats.ttHireDays !== null ? `${stats.ttHireDays}d` : "—"}
            tone="warning"
          />
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-2xl font-bold">Application funnel</h2>
              <p className="text-sm text-muted-foreground">Conversion rate to hire: <span className="font-semibold text-success">{stats.conv}%</span></p>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground"/>
          </div>
          <div className="space-y-4">
            {STAGES.map((s) => {
              const count = stats.byStatus[s.key] ?? 0;
              const pct = Math.round((count / max) * 100);
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-muted-foreground tabular-nums">{count}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${s.tone} transition-all`} style={{ width: `${pct}%` }}/>
                  </div>
                </div>
              );
            })}
            <div className="pt-1 text-xs text-muted-foreground">
              Rejected: <span className="font-semibold">{stats.byStatus.rejected}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-2xl font-bold mb-5">Top jobs by applicants</h2>
          {perJob.every((j) => j.total === 0) ? (
            <div className="text-sm text-muted-foreground">No applicants yet.</div>
          ) : (
            <div className="space-y-3">
              {perJob.map((j) => {
                const pct = stats.total > 0 ? Math.round((j.total / Math.max(perJob[0].total, 1)) * 100) : 0;
                return (
                  <Link key={j.id} to={`/company/jobs/${j.id}/applicants`} className="block p-3 rounded-xl border border-border hover:border-primary/40 hover:shadow-soft transition-smooth">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="font-medium truncate">{j.title}</div>
                      <div className="text-sm text-muted-foreground tabular-nums shrink-0">
                        {j.total} applicant{j.total !== 1 && "s"} · {j.hired} hired
                      </div>
                    </div>
                    <Progress value={pct} className="h-2"/>
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

const Stat = ({ icon: Icon, label, value, tone }: any) => {
  const bg =
    tone === "primary" ? "gradient-primary" :
    tone === "accent" ? "gradient-accent" :
    tone === "warning" ? "bg-warning" : "bg-success";
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <Icon className={`h-6 w-6 ${tone === "accent" ? "text-accent-foreground" : tone === "warning" ? "text-warning-foreground" : "text-white"}`}/>
      </div>
      <div>
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</div>
        <div className="font-display text-2xl font-bold">{value}</div>
      </div>
    </Card>
  );
};

export default CompanyAnalytics;
