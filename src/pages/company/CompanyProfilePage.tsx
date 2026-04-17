import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

const CompanyProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("company_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setName(data.company_name ?? "");
        setIndustry(data.industry ?? "");
        setLocation(data.location ?? "");
        setWebsite(data.website ?? "");
        setDescription(data.description ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (!name.trim()) { toast({ title: "Company name required", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("company_profiles").upsert({
      user_id: user.id,
      company_name: name.trim(),
      industry: industry.trim() || null,
      location: location.trim() || null,
      website: website.trim() || null,
      description: description.trim() || null,
    });
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Profile saved 🎉" });
  };

  if (loading) return <AppShell><div className="flex justify-center p-20"><Loader2 className="h-6 w-6 animate-spin"/></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Company profile</h1>
          <p className="text-muted-foreground">Shown to students on every job you post.</p>
        </div>
        <Card className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Company name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={150}/>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="SaaS, Fintech, Healthcare…" maxLength={100}/>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bangalore, India" maxLength={100}/>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." maxLength={255}/>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={2000}/>
          </div>
          <Button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground border-0 shadow-soft hover:shadow-glow transition-smooth">
            {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Save className="h-4 w-4 mr-2"/>Save</>}
          </Button>
        </Card>
      </div>
    </AppShell>
  );
};

export default CompanyProfilePage;
