import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Briefcase, Users, FileCheck, PlusCircle, ArrowRight, AlertCircle, BarChart3 } from "lucide-react";

const CompanyDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ jobs: 0, openJobs: 0, applicants: 0 });
  const [profileEmpty, setProfileEmpty] = useState(false);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: cp }, { data: jobs }] = await Promise.all([
        supabase.from("company_profiles").select("company_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("jobs").select("id, title, is_open, created_at, location").eq("company_id", user.id).order("created_at", { ascending: false }),
      ]);
      const ids = (jobs ?? []).map((j) => j.id);
      let applicants = 0;
      if (ids.length) {
        const { count } = await supabase.from("applications").select("id", { count: "exact", head: true }).in("job_id", ids);
        applicants = count ?? 0;
      }
      setStats({
        jobs: jobs?.length ?? 0,
        openJobs: (jobs ?? []).filter((j) => j.is_open).length,
        applicants,
      });
      setRecentJobs((jobs ?? []).slice(0, 5));
      setProfileEmpty(!cp?.company_name);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <AppShell><div className="flex justify-center p-20"><Loader2 className="h-6 w-6 animate-spin"/></div></AppShell>;

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl font-bold">Company dashboard</h1>
            <p className="text-muted-foreground">Post jobs. Find your next great hire.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/company/analytics"><BarChart3 className="h-4 w-4 mr-2"/>Analytics</Link></Button>
            <Button asChild className="gradient-primary text-primary-foreground border-0 shadow-soft hover:shadow-glow transition-smooth">
              <Link to="/company/jobs/new"><PlusCircle className="h-4 w-4 mr-2"/>Post a job</Link>
            </Button>
          </div>
        </div>

        {profileEmpty && (
          <Card className="p-5 border-2 border-warning/50 bg-warning/10 flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-warning-foreground shrink-0 mt-0.5"/>
            <div className="flex-1">
              <div className="font-semibold mb-1">Complete your company profile</div>
              <div className="text-sm text-muted-foreground">Helps students learn about you on every job post.</div>
            </div>
            <Button asChild size="sm" variant="outline"><Link to="/company/profile">Edit profile</Link></Button>
          </Card>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard icon={Briefcase} label="Total jobs" value={stats.jobs} tone="primary"/>
          <StatCard icon={FileCheck} label="Open" value={stats.openJobs} tone="accent"/>
          <StatCard icon={Users} label="Applicants" value={stats.applicants} tone="success"/>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl font-bold">Recent jobs</h2>
            <Button asChild variant="ghost"><Link to="/company/jobs">All jobs <ArrowRight className="ml-1 h-4 w-4"/></Link></Button>
          </div>
          {recentJobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50"/>
              No jobs yet — post your first opening!
            </div>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((j) => (
                <Link key={j.id} to={`/company/jobs/${j.id}/applicants`}
                  className="block p-4 rounded-xl border border-border hover:border-primary/40 hover:shadow-soft transition-smooth">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-display font-bold truncate">{j.title}</div>
                      <div className="text-sm text-muted-foreground truncate">{j.location ?? "Remote"}</div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${j.is_open ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {j.is_open ? "Open" : "Closed"}
                    </div>
                  </div>
                </Link>
              ))}
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

export default CompanyDashboard;
