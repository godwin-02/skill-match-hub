import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Briefcase, Trash2, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ManageJobs = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("jobs")
      .select("*, applications(count)")
      .eq("company_id", user.id)
      .order("created_at", { ascending: false });
    setJobs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const toggle = async (id: string, open: boolean) => {
    const { error } = await supabase.from("jobs").update({ is_open: open }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { toast({ title: open ? "Job opened" : "Job closed" }); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this job and all its applications?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Job deleted" }); load(); }
  };

  if (loading) return <AppShell><div className="flex justify-center p-20"><Loader2 className="h-6 w-6 animate-spin"/></div></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold">Manage jobs</h1>
            <p className="text-muted-foreground">{jobs.length} total</p>
          </div>
          <Button asChild className="gradient-primary text-primary-foreground border-0 shadow-soft hover:shadow-glow transition-smooth">
            <Link to="/company/jobs/new">Post new job</Link>
          </Button>
        </div>

        {jobs.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50"/>
            No jobs yet. Post your first one!
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => (
              <Card key={j.id} className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-lg">{j.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {j.location ?? "Remote"} · <span className="capitalize">{j.experience_level}</span>
                    </div>
                  </div>
                  <Link to={`/company/jobs/${j.id}/applicants`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    <Users className="h-4 w-4"/> {j.applications?.[0]?.count ?? 0} applicants
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{j.is_open ? "Open" : "Closed"}</span>
                    <Switch checked={j.is_open} onCheckedChange={(v) => toggle(j.id, v)}/>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(j.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4 text-destructive"/>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default ManageJobs;
