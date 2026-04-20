import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { MatchBar } from "@/components/MatchBar";
import { ApplicationTimeline } from "@/components/ApplicationTimeline";
import { Loader2, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

const MyApplications = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("applications")
        .select("*, jobs(id, title, location, company_profiles(company_name, logo_url))")
        .eq("student_id", user.id)
        .order("applied_at", { ascending: false });
      setApps(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <AppShell><div className="flex justify-center p-20"><Loader2 className="h-6 w-6 animate-spin"/></div></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold">My applications</h1>
          <p className="text-muted-foreground">{apps.length} total</p>
        </div>

        {apps.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50"/>
            You haven't applied to anything yet.
            <div className="mt-4"><Link to="/jobs" className="text-primary font-medium hover:underline">Browse open jobs →</Link></div>
          </Card>
        ) : (
          <div className="space-y-3">
            {apps.map((a) => {
              const open = expanded === a.id;
              const logo = a.jobs?.company_profiles?.logo_url;
              return (
                <Card key={a.id} className="p-5 hover:shadow-soft transition-smooth">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-muted/40 border border-border overflow-hidden shrink-0 flex items-center justify-center">
                      {logo ? (
                        <img src={logo} alt="" className="h-full w-full object-cover"/>
                      ) : (
                        <span className="font-display font-bold text-muted-foreground">
                          {(a.jobs?.company_profiles?.company_name ?? "?").charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/jobs/${a.jobs?.id}`} className="font-display font-bold text-lg hover:text-primary transition-smooth">
                        {a.jobs?.title}
                      </Link>
                      <div className="text-sm text-muted-foreground">
                        {a.jobs?.company_profiles?.company_name} · {a.jobs?.location ?? "Remote"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Applied {format(new Date(a.applied_at), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="w-32 shrink-0">
                      <MatchBar score={a.match_score}/>
                    </div>
                    <StatusBadge status={a.status}/>
                    <Button variant="ghost" size="icon" onClick={() => setExpanded(open ? null : a.id)} aria-label="Toggle timeline">
                      {open ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                    </Button>
                  </div>

                  {open && (
                    <div className="mt-5 pt-5 border-t border-border">
                      <div className="text-sm font-semibold mb-3">Application timeline</div>
                      <ApplicationTimeline applicationId={a.id}/>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default MyApplications;
