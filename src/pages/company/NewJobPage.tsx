import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/TagInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Level = "entry" | "junior" | "mid" | "senior";
type WorkMode = "remote" | "hybrid" | "onsite";
type JobType = "full_time" | "part_time" | "internship" | "contract";

const NewJobPage = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [level, setLevel] = useState<Level>("entry");
  const [workMode, setWorkMode] = useState<WorkMode>("onsite");
  const [jobType, setJobType] = useState<JobType>("full_time");
  const [location, setLocation] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) { toast({ title: "Job title required", variant: "destructive" }); return; }
    setSaving(true);
    const { data, error } = await supabase.from("jobs").insert({
      company_id: user.id,
      title: title.trim(),
      description: description.trim(),
      required_skills: skills,
      preferred_roles: roles,
      experience_level: level,
      work_mode: workMode,
      job_type: jobType,
      location: location.trim() || null,
      salary_min: salaryMin ? parseInt(salaryMin, 10) : null,
      salary_max: salaryMax ? parseInt(salaryMax, 10) : null,
      is_open: true,
    }).select().single();
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't post job", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job posted 🚀" });
      nav(`/company/jobs/${data.id}/applicants`);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Post a new job</h1>
          <p className="text-muted-foreground">More details = better matches.</p>
        </div>
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Job title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={150} placeholder="Frontend Engineer Intern"/>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Experience level</Label>
                <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry / Fresher</SelectItem>
                    <SelectItem value="junior">Junior (0–2 yrs)</SelectItem>
                    <SelectItem value="mid">Mid (2–5 yrs)</SelectItem>
                    <SelectItem value="senior">Senior (5+ yrs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Remote / Bangalore" maxLength={100}/>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Work mode</Label>
                <Select value={workMode} onValueChange={(v) => setWorkMode(v as WorkMode)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Job type</Label>
                <Select value={jobType} onValueChange={(v) => setJobType(v as JobType)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Salary min (optional)</Label>
                <Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="20000"/>
              </div>
              <div className="space-y-1.5">
                <Label>Salary max (optional)</Label>
                <Input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="40000"/>
              </div>
            </div>

            <TagInput label="Required skills" value={skills} onChange={setSkills} placeholder="React, TypeScript…" hint="These drive 60% of the match score."/>
            <TagInput label="Preferred roles" value={roles} onChange={setRoles} placeholder="Frontend Engineer, Web Developer…"/>

            <div className="space-y-1.5">
              <Label>Job description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} maxLength={5000} placeholder="What will the candidate do? What's the team like?"/>
            </div>

            <Button type="submit" disabled={saving} className="gradient-primary text-primary-foreground border-0 shadow-soft hover:shadow-glow transition-smooth">
              {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : "Post job"}
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
};

export default NewJobPage;
