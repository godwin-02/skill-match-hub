import { useEffect, useState } from "react";
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
import { Loader2, Save } from "lucide-react";

type Level = "entry" | "junior" | "mid" | "senior";

const StudentProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [education, setEducation] = useState("");
  const [projects, setProjects] = useState("");
  const [level, setLevel] = useState<Level>("entry");
  const [roles, setRoles] = useState<string[]>([]);
  const [location, setLocation] = useState("");

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
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const [a, b] = await Promise.all([
      supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id),
      supabase.from("student_profiles").upsert({
        user_id: user.id,
        headline, bio, skills, education, projects,
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
          <div className="space-y-1.5">
            <Label>Headline</Label>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="CS undergrad · Aspiring frontend engineer" maxLength={150}/>
          </div>
          <div className="space-y-1.5">
            <Label>Short bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500}/>
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
              <Label>Education</Label>
              <Input value={education} onChange={(e) => setEducation(e.target.value)} placeholder="BTech CSE · IIT Madras" maxLength={200}/>
            </div>
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
