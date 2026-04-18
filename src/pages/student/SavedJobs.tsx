import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Bookmark, MapPin, BookmarkX } from "lucide-react";
import { useSavedJobs } from "@/hooks/useSavedJobs";

const SavedJobs = () => {
  const { user } = useAuth();
  const { savedIds, toggle, loading: savedLoading } = useSavedJobs();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || savedLoading) return;
    if (savedIds.size === 0) { setJobs([]); setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("*, company_profiles(company_name)")
        .in("id", Array.from(savedIds));
      setJobs(data ?? []);
      setLoading(false);
    })();
  }, [user, savedIds, savedLoading]);

  if (loading) return <AppShell><div className="flex justify-center p-20"><Loader2 className="h-6 w-6 animate-spin"/></div></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold inline-flex items-center gap-3">
            <Bookmark className="h-8 w-8 text-primary"/>Saved jobs
          </h1>
          <p className="text-muted-foreground">{jobs.length} bookmarked</p>
        </div>

        {jobs.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Bookmark className="h-10 w-10 mx-auto mb-3 opacity-50"/>
            No saved jobs yet. Bookmark interesting roles from the Browse page.
            <div className="mt-4">
              <Button asChild className="gradient-primary text-primary-foreground border-0"><Link to="/jobs">Browse jobs</Link></Button>
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {jobs.map((j) => (
              <Card key={j.id} className="p-5 border-2 hover:border-primary/40 transition-smooth">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      {j.company_profiles?.company_name ?? "Company"}
                    </div>
                    <Link to={`/jobs/${j.id}`} className="font-display font-bold text-lg leading-tight hover:text-primary transition-smooth">
                      {j.title}
                    </Link>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => toggle(j.id)} aria-label="Unsave">
                    <BookmarkX className="h-4 w-4 text-muted-foreground"/>
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                  {j.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3"/>{j.location}</span>}
                  <span className="capitalize">{j.experience_level}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(j.required_skills ?? []).slice(0, 5).map((s: string) => (
                    <Badge key={s} variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">{s}</Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default SavedJobs;
