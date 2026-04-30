import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Building2, ArrowLeft, BadgeCheck, Briefcase } from "lucide-react";
import { ReviewsSection } from "@/components/ReviewsSection";
import { FollowButton } from "@/components/FollowButton";
import { useAuth } from "@/hooks/useAuth";

const PublicCompanyProfile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [c, setC] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ data: comp }, { data: js }] = await Promise.all([
        supabase.from("company_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("jobs").select("id, title, location, work_mode, is_open").eq("company_id", userId).eq("is_open", true).order("created_at", { ascending: false }).limit(10),
      ]);
      setC(comp);
      setJobs(js ?? []);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!c) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Company not found.</div>;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> SkillSync
        </Link>

        <Card className="p-7">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="h-20 w-20 rounded-2xl bg-muted overflow-hidden border-2 border-border flex items-center justify-center shrink-0">
              {c.logo_url ? <img src={c.logo_url} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-9 w-9 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-3xl font-bold">{c.company_name}</h1>
                {c.verified && <BadgeCheck className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground mt-2">
                {c.industry && <span>{c.industry}</span>}
                {c.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {c.location}</span>}
                {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">Website</a>}
              </div>
            </div>
            {user && <FollowButton companyId={userId!} />}
          </div>
          {c.description && <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed mt-5">{c.description}</p>}
        </Card>

        {jobs.length > 0 && (
          <Card className="p-6">
            <h2 className="font-display font-bold text-xl mb-3 inline-flex items-center gap-2"><Briefcase className="h-5 w-5" /> Open roles</h2>
            <div className="space-y-2">
              {jobs.map((j) => (
                <Link key={j.id} to={user ? `/jobs/${j.id}` : "/auth"} className="block p-3 rounded-lg border border-border hover:bg-muted/40 transition-smooth">
                  <div className="font-semibold">{j.title}</div>
                  <div className="text-xs text-muted-foreground">{j.location} · {j.work_mode}</div>
                </Link>
              ))}
            </div>
          </Card>
        )}

        <ReviewsSection companyId={userId!} />
      </div>
    </div>
  );
};

export default PublicCompanyProfile;
