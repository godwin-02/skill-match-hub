import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchBar } from "@/components/MatchBar";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Loader2, ArrowLeft, Users, Mail, MapPin, GraduationCap, ChevronDown, ChevronUp, Download,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toCsv, downloadCsv } from "@/lib/csv";
import { format } from "date-fns";

type Status = "applied" | "shortlisted" | "interview" | "accepted" | "rejected";

const ApplicantsPage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const { data: j } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
    setJob(j);
    const { data: appsData } = await supabase
      .from("applications")
      .select("*, profiles:student_id(full_name, email, avatar_url), student_profiles:student_id(headline, skills, education, location, experience_level, projects, bio, phone)")
      .eq("job_id", id)
      .order("match_score", { ascending: false });
    setApps(appsData ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const setStatus = async (appId: string, status: Status) => {
    const { error } = await supabase.from("applications").update({ status }).eq("id", appId);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { toast({ title: `Marked as ${status}` }); load(); }
  };

  const exportCsv = () => {
    if (apps.length === 0) {
      toast({ title: "No applicants to export" });
      return;
    }
    const rows = apps.map((a) => ({
      name: a.profiles?.full_name ?? "",
      email: a.profiles?.email ?? "",
      phone: a.student_profiles?.phone ?? "",
      headline: a.student_profiles?.headline ?? "",
      location: a.student_profiles?.location ?? "",
      experience_level: a.student_profiles?.experience_level ?? "",
      education: a.student_profiles?.education ?? "",
      skills: (a.student_profiles?.skills ?? []).join("; "),
      match_score: a.match_score ?? 0,
      ats_score: a.ats_score ?? 0,
      status: a.status,
      applied_at: a.applied_at ? format(new Date(a.applied_at), "yyyy-MM-dd HH:mm") : "",
    }));
    const csv = toCsv(rows, [
      "name", "email", "phone", "headline", "location", "experience_level",
      "education", "skills", "match_score", "ats_score", "status", "applied_at",
    ]);
    const safe = (job?.title ?? "applicants").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    downloadCsv(`${safe}-applicants-${format(new Date(), "yyyyMMdd")}.csv`, csv);
    toast({ title: `Exported ${rows.length} applicants` });
  };

  if (loading) return <AppShell><div className="flex justify-center p-20"><Loader2 className="h-6 w-6 animate-spin"/></div></AppShell>;
  if (!job) return <AppShell><div className="text-center p-12">Job not found.</div></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6">
        <Button variant="ghost" asChild className="-ml-3">
          <Link to="/company/jobs"><ArrowLeft className="h-4 w-4 mr-1"/>All jobs</Link>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Applicants for</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">{job.title}</h1>
            <p className="text-muted-foreground inline-flex items-center gap-2 mt-1">
              <Users className="h-4 w-4"/>{apps.length} applicant{apps.length !== 1 && "s"} · sorted by match
            </p>
          </div>
          <Button onClick={exportCsv} variant="outline" className="gap-2" disabled={apps.length === 0}>
            <Download className="h-4 w-4"/> Export CSV
          </Button>
        </div>

        {apps.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-50"/>
            No applicants yet.
          </Card>
        ) : (
          <div className="space-y-3">
            {apps.map((a) => {
              const open = expanded === a.id;
              const sp = a.student_profiles;
              return (
                <Card key={a.id} className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-lg">{a.profiles?.full_name || "Unnamed"}</div>
                      <div className="text-sm text-muted-foreground inline-flex items-center gap-3 flex-wrap">
                        {a.profiles?.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3"/>{a.profiles.email}</span>}
                        {sp?.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3"/>{sp.location}</span>}
                        {sp?.experience_level && <span className="capitalize">{sp.experience_level}</span>}
                      </div>
                      {sp?.headline && <div className="text-sm mt-1">{sp.headline}</div>}
                    </div>
                    <div className="w-32 shrink-0"><MatchBar score={a.match_score}/></div>
                    <StatusBadge status={a.status}/>
                    <Select value={a.status} onValueChange={(v) => setStatus(a.id, v as Status)}>
                      <SelectTrigger className="w-[150px]"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="applied">Applied</SelectItem>
                        <SelectItem value="shortlisted">Shortlist</SelectItem>
                        <SelectItem value="interview">Interview</SelectItem>
                        <SelectItem value="accepted">Accept</SelectItem>
                        <SelectItem value="rejected">Reject</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" onClick={() => setExpanded(open ? null : a.id)}>
                      {open ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                    </Button>
                  </div>

                  {open && sp && (
                    <div className="mt-5 pt-5 border-t border-border space-y-4 text-sm">
                      {sp.bio && <p className="text-muted-foreground">{sp.bio}</p>}
                      {sp.education && (
                        <div className="inline-flex items-center gap-2"><GraduationCap className="h-4 w-4 text-muted-foreground"/>{sp.education}</div>
                      )}
                      {sp.skills?.length > 0 && (
                        <div>
                          <div className="font-semibold mb-2">Skills</div>
                          <div className="flex flex-wrap gap-1.5">
                            {sp.skills.map((s: string) => {
                              const has = (job.required_skills ?? []).map((x: string) => x.toLowerCase()).includes(s.toLowerCase());
                              return (
                                <Badge key={s} variant="outline" className={has
                                  ? "bg-success/10 text-success border-success/30"
                                  : "bg-muted/40"}>{s}</Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {sp.projects && (
                        <div>
                          <div className="font-semibold mb-1">Projects</div>
                          <p className="text-muted-foreground whitespace-pre-wrap">{sp.projects}</p>
                        </div>
                      )}
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

export default ApplicantsPage;
