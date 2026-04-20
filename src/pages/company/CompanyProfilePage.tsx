import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Upload, Building2, Trash2 } from "lucide-react";

const CompanyProfilePage = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

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
        setLogoUrl(data.logo_url ?? null);
      }
      setLoading(false);
    })();
  }, [user]);

  const onUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Image only", description: "Upload PNG, JPG or WEBP.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 2MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("company-logos").upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("company-logos").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase.from("company_profiles").upsert({
        user_id: user.id,
        company_name: name || "Company",
        logo_url: url,
      });
      if (updErr) throw updErr;
      setLogoUrl(url);
      toast({ title: "Logo updated 🎉" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeLogo = async () => {
    if (!user) return;
    const { error } = await supabase.from("company_profiles").update({ logo_url: null }).eq("user_id", user.id);
    if (error) toast({ title: "Remove failed", description: error.message, variant: "destructive" });
    else { setLogoUrl(null); toast({ title: "Logo removed" }); }
  };

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

        <Card className="p-6">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-2xl border-2 border-border bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt={`${name || "Company"} logo`} className="h-full w-full object-cover"/>
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground"/>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold">Company logo</div>
              <p className="text-sm text-muted-foreground">PNG, JPG or WEBP · max 2MB · square works best.</p>
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onUploadLogo}/>
            <div className="flex gap-2">
              {logoUrl && (
                <Button variant="ghost" size="icon" onClick={removeLogo} title="Remove">
                  <Trash2 className="h-4 w-4"/>
                </Button>
              )}
              <Button onClick={() => fileRef.current?.click()} disabled={uploading} variant="outline" className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
                {logoUrl ? "Replace" : "Upload"}
              </Button>
            </div>
          </div>
        </Card>

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
