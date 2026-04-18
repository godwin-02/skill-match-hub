import { useEffect, useRef, useState } from "react";
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
import { Loader2, Save, Upload, FileText, CheckCircle2 } from "lucide-react";
import { extractPdfText } from "@/lib/pdfText";

type Level = "entry" | "junior" | "mid" | "senior";

const StudentProfilePage = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [education, setEducation] = useState("");
  const [projects, setProjects] = useState("");
  const [level, setLevel] = useState<Level>("entry");
  const [roles, setRoles] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prof }, { data: sp }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("student_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setFullName(prof?.full_name ?? "");
      if (sp) {
        setHeadline(sp.headline ?? "");
        setBio(sp.bio ?? "");
        setSkills(sp.skills ?? []);
        setEducation(sp.education ?? "");
        setProjects(sp.projects ?? "");
        setLevel((sp.experience_level ?? "entry") as Level);
        setRoles(sp.preferred_roles ?? []);
        setLocation(sp.location ?? "");
        setPhone((sp as any).phone ?? "");
        setResumeUrl((sp as any).resume_url ?? null);
        setResumeText((sp as any).resume_text ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.type !== "application/pdf") {
      toast({ title: "PDF only", description: "Please upload a PDF resume.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const text = await extractPdfText(file);
      const path = `${user.id}/resume.pdf`;
      const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase.from("student_profiles").upsert({
        user_id: user.id, resume_url: path, resume_text: text,
      });
      if (updErr) throw updErr;
      setResumeUrl(path);
      setResumeText(text);
      toast({ title: "Resume uploaded ✨", description: "We extracted the text for AI matching." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const downloadResume = async () => {
    if (!resumeUrl) return;
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(resumeUrl, 60);
    if (error || !data) {
      toast({ title: "Couldn't open file", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const [a, b] = await Promise.all([
      supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id),
      supabase.from("student_profiles").upsert({
        user_id: user.id,
        headline, bio, skills, education, projects, phone,
        experience_level: level, preferred_roles: roles, location,
      }),
    ]);
    setSaving(false);
    if (a.error || b.error) {
      toast({ title: "Save failed", description: (a.error ?? b.error)?.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved 🎉" });
    }
  };

  if (loading) return <AppShell><div className="flex justify-center p-20"><Loader2 className="h-6 w-6 animate-spin"/></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">My profile</h1>
          <p className="text-muted-foreground">The richer your profile, the better your matches.</p>
        </div>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-6 w-6 text-primary"/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold">Resume (PDF)</div>
              <p className="text-sm text-muted-foreground">Powers AI ATS scoring on every job. Max 5MB.</p>
              {resumeUrl && (
                <div className="mt-2 inline-flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4"/> Resume uploaded
                  <Button variant="link" className="h-auto p-0 text-sm" onClick={downloadResume}>View</Button>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={onUpload}/>
            <Button onClick={() => fileRef.current?.click()} disabled={uploading} variant="outline" className="gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
              {resumeUrl ? "Replace" : "Upload"}
            </Button>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100}/>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bangalore, India / Remote" maxLength={100}/>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Phone (optional)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30}/>
            </div>
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
          </div>
          <div className="space-y-1.5">
            <Label>Headline</Label>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="CS undergrad · Aspiring frontend engineer" maxLength={150}/>
          </div>
          <div className="space-y-1.5">
            <Label>Short bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500}/>
          </div>
          <div className="space-y-1.5">
            <Label>Education</Label>
            <Input value={education} onChange={(e) => setEducation(e.target.value)} placeholder="BTech CSE · IIT Madras" maxLength={200}/>
          </div>

          <TagInput label="Skills" value={skills} onChange={setSkills} placeholder="React, Python, MySQL…" hint="Press Enter or comma after each skill."/>
          <TagInput label="Preferred roles" value={roles} onChange={setRoles} placeholder="Frontend Engineer, Data Analyst…"/>

          <div className="space-y-1.5">
            <Label>Projects</Label>
            <Textarea value={projects} onChange={(e) => setProjects(e.target.value)} rows={4} placeholder="Briefly describe 1–3 projects you're proud of." maxLength={1500}/>
          </div>

          <Button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground border-0 shadow-soft hover:shadow-glow transition-smooth">
            {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Save className="h-4 w-4 mr-2"/>Save profile</>}
          </Button>
        </Card>
      </div>
    </AppShell>
  );
};

export default StudentProfilePage;
