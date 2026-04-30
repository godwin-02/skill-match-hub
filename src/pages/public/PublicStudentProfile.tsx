import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, GraduationCap, Sparkles, Mail, ArrowLeft, BadgeCheck } from "lucide-react";

const PublicStudentProfile = () => {
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [sp, setSp] = useState<any>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
        supabase.from("student_profiles").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      setProfile(p);
      setSp(s);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!sp) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Profile not found.</div>;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> SkillSync
        </Link>

        <Card className="p-7">
          <div className="flex items-start gap-5">
            <div className="h-20 w-20 rounded-2xl bg-muted overflow-hidden border-2 border-border flex items-center justify-center shrink-0">
              {sp.avatar_url ? (
                <img src={sp.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-2xl font-bold text-muted-foreground">
                  {(profile?.full_name ?? "?").slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-3xl font-bold">{profile?.full_name ?? "Student"}</h1>
                {sp.open_to_work && (
                  <Badge className="bg-success/15 text-success border-success/30 gap-1">
                    <BadgeCheck className="h-3 w-3" /> Open to work
                  </Badge>
                )}
              </div>
              {sp.headline && <p className="text-lg text-muted-foreground mt-1">{sp.headline}</p>}
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground mt-3">
                {sp.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {sp.location}</span>}
                {sp.education && <span className="inline-flex items-center gap-1"><GraduationCap className="h-4 w-4" /> {sp.education}</span>}
                <span className="capitalize inline-flex items-center gap-1"><Sparkles className="h-4 w-4" /> {sp.experience_level}</span>
              </div>
            </div>
          </div>
        </Card>

        {sp.bio && (
          <Card className="p-6">
            <h2 className="font-display font-bold text-xl mb-2">About</h2>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{sp.bio}</p>
          </Card>
        )}

        {sp.skills?.length > 0 && (
          <Card className="p-6">
            <h2 className="font-display font-bold text-xl mb-3">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {sp.skills.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
            </div>
          </Card>
        )}

        {sp.preferred_roles?.length > 0 && (
          <Card className="p-6">
            <h2 className="font-display font-bold text-xl mb-3">Looking for</h2>
            <div className="flex flex-wrap gap-2">
              {sp.preferred_roles.map((r: string) => <Badge key={r} variant="outline">{r}</Badge>)}
            </div>
          </Card>
        )}

        {sp.projects && (
          <Card className="p-6">
            <h2 className="font-display font-bold text-xl mb-2">Projects</h2>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{sp.projects}</p>
          </Card>
        )}

        <div className="text-center pt-4">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/auth"><Mail className="h-4 w-4" /> Connect on SkillSync</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PublicStudentProfile;
