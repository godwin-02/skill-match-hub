import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MatchBar } from "@/components/MatchBar";
import { StatusBadge } from "@/components/StatusBadge";
import { InterviewDialog } from "@/components/InterviewDialog";
import {
  Loader2, ArrowLeft, Users, Mail, MapPin, GraduationCap, ChevronDown, ChevronUp,
  Download, CalendarPlus, CalendarClock,
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
  const [interviewsByApp, setInterviewsByApp] = useState<Record<string, any>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<Status | "">("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const [iv, setIv] = useState<{ open: boolean; appId: string; existing: any | null; name?: string } | null>(null);

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
    setSelected(new Set());

    const ids = (appsData ?? []).map((a: any) => a.id);
    if (ids.length) {
      const { data: ints } = await supabase
        .from("interviews")
        .select("*")
        .in("application_id", ids)
        .neq("status", "cancelled")
        .order("scheduled_at", { ascending: true });
      const map: Record<string, any> = {};
      (ints ?? []).forEach((i: any) => { if (!map[i.application_id]) map[i.application_id] = i; });
      setInterviewsByApp(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const setStatus = async (appId: string, status: Status) => {
    const { error } = await supabase.from("applications").update({ status }).eq("id", appId);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { toast({ title: `Marked as ${status}` }); load(); }
  };

  const allChecked = useMemo(() => apps.length > 0 && selected.size === apps.length, [apps, selected]);

  const toggleAll = () => {
    setSelected(allChecked ? new Set() : new Set(apps.map((a) => a.id)));
  };

  const toggleOne = (appId: string) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(appId) ? next.delete(appId) : next.add(appId);
      return next;
    });
  };

  const applyBulk = async () => {
    if (!bulkStatus || selected.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selected);
    const { error } = await supabase.from("applications").update({ status: bulkStatus }).in("id", ids);
    setBulkBusy(false);
    if (error) toast({ title: "Bulk update failed", description: error.message, variant: "destructive" });
    else { toast({ title: `${ids.length} updated to ${bulkStatus}` }); setBulkStatus(""); load(); }
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

        {apps.length > 0 && (
          <Card className="p-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Select all"/>
              <span className="text-sm text-muted-foreground">
                {selected.size > 0 ? `${selected.size} selected` : "Select all"}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as Status)} disabled={selected.size === 0}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Bulk action…"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shortlisted">Shortlist</SelectItem>
                  <SelectItem value="interview">Move to interview</SelectItem>
                  <SelectItem value="accepted">Accept / hire</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={applyBulk} disabled={!bulkStatus || selected.size === 0 || bulkBusy} size="sm">
                {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin"/> : "Apply"}
              </Button>
            </div>
          </Card>
        )}

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
              const interview = interviewsByApp[a.id];
              return (
                <Card key={a.id} className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <Checkbox
                      checked={selected.has(a.id)}
                      onCheckedChange={() => toggleOne(a.id)}
                      aria-label="Select applicant"
                      className="shrink-0"
                    />
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
                    <Button
                      size="sm"
                      variant={interview ? "secondary" : "outline"}
                      onClick={() => setIv({ open: true, appId: a.id, existing: interview ?? null, name: a.profiles?.full_name })}
                      className="gap-1.5"
                    >
                      {interview ? <CalendarClock className="h-4 w-4"/> : <CalendarPlus className="h-4 w-4"/>}
                      {interview ? format(new Date(interview.scheduled_at), "MMM d, h:mm a") : "Schedule"}
                    </Button>
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
                      {a.cover_note && (
                        <div>
                          <div className="font-semibold mb-1">Cover note</div>
                          <p className="text-muted-foreground whitespace-pre-wrap">{a.cover_note}</p>
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

      {iv && (
        <InterviewDialog
          open={iv.open}
          onOpenChange={(v) => setIv((cur) => (cur ? { ...cur, open: v } : cur))}
          applicationId={iv.appId}
          existing={iv.existing}
          candidateName={iv.name}
          jobTitle={job.title}
          onSaved={load}
        />
      )}
    </AppShell>
  );
};

export default ApplicantsPage;
