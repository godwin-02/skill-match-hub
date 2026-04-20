import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Loader2, Shield, BadgeCheck, Search, Trash2, Lock, Unlock, Building2, Users, Briefcase,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const AdminPanel = () => {
  const [tab, setTab] = useState("companies");
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary"/>
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Admin panel</h1>
            <p className="text-sm text-muted-foreground">Lightweight moderation tools.</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="companies"><Building2 className="h-4 w-4 mr-1.5"/>Companies</TabsTrigger>
            <TabsTrigger value="jobs"><Briefcase className="h-4 w-4 mr-1.5"/>Jobs</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1.5"/>Users</TabsTrigger>
          </TabsList>

          <TabsContent value="companies"><CompaniesTab/></TabsContent>
          <TabsContent value="jobs"><JobsTab/></TabsContent>
          <TabsContent value="users"><UsersTab/></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};

/* -------- Companies -------- */
const CompaniesTab = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("company_profiles")
      .select("user_id, company_name, industry, location, verified, logo_url, created_at")
      .order("created_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleVerify = async (uid: string, cur: boolean) => {
    const { error } = await supabase.from("company_profiles").update({ verified: !cur }).eq("user_id", uid);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: !cur ? "Company verified ✓" : "Verification removed" }); load(); }
  };

  const filtered = rows.filter((r) =>
    !q.trim() ||
    r.company_name?.toLowerCase().includes(q.toLowerCase()) ||
    r.industry?.toLowerCase().includes(q.toLowerCase()),
  );

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin"/></div>;

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
        <Input className="pl-10" placeholder="Search companies…" value={q} onChange={(e) => setQ(e.target.value)}/>
      </div>
      <Card className="divide-y divide-border">
        {filtered.map((c) => (
          <div key={c.user_id} className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-muted/40 border border-border overflow-hidden shrink-0 flex items-center justify-center">
              {c.logo_url ? <img src={c.logo_url} alt="" className="h-full w-full object-cover"/> :
                <Building2 className="h-5 w-5 text-muted-foreground"/>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate flex items-center gap-2">
                {c.company_name || "(no name)"}
                {c.verified && <Badge className="bg-primary/10 text-primary border-primary/30 gap-1"><BadgeCheck className="h-3 w-3"/>Verified</Badge>}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {c.industry || "—"} · {c.location || "—"} · {format(new Date(c.created_at), "MMM d, yyyy")}
              </div>
            </div>
            <Button size="sm" variant={c.verified ? "outline" : "default"} onClick={() => toggleVerify(c.user_id, c.verified)}>
              {c.verified ? "Unverify" : "Verify"}
            </Button>
          </div>
        ))}
        {filtered.length === 0 && <div className="p-12 text-center text-muted-foreground">No companies.</div>}
      </Card>
    </div>
  );
};

/* -------- Jobs -------- */
const JobsTab = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("jobs")
      .select("id, title, is_open, created_at, location, company_profiles(company_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleOpen = async (id: string, cur: boolean) => {
    const { error } = await supabase.from("jobs").update({ is_open: !cur }).eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: !cur ? "Job opened" : "Job closed" }); load(); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Job deleted" }); load(); }
  };

  const filtered = rows.filter((r) =>
    !q.trim() ||
    r.title?.toLowerCase().includes(q.toLowerCase()) ||
    r.company_profiles?.company_name?.toLowerCase().includes(q.toLowerCase()),
  );

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin"/></div>;

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
        <Input className="pl-10" placeholder="Search jobs…" value={q} onChange={(e) => setQ(e.target.value)}/>
      </div>
      <Card className="divide-y divide-border">
        {filtered.map((j) => (
          <div key={j.id} className="p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{j.title}</div>
              <div className="text-xs text-muted-foreground truncate">
                {j.company_profiles?.company_name ?? "—"} · {j.location ?? "Remote"} · {format(new Date(j.created_at), "MMM d, yyyy")}
              </div>
            </div>
            <Badge className={j.is_open ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground"}>
              {j.is_open ? "Open" : "Closed"}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => toggleOpen(j.id, j.is_open)} className="gap-1.5">
              {j.is_open ? <><Lock className="h-3.5 w-3.5"/>Close</> : <><Unlock className="h-3.5 w-3.5"/>Open</>}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="Delete">
                  <Trash2 className="h-4 w-4 text-destructive"/>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete job?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes "{j.title}" and all its applications. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => remove(j.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
        {filtered.length === 0 && <div className="p-12 text-center text-muted-foreground">No jobs.</div>}
      </Card>
    </div>
  );
};

/* -------- Users -------- */
const UsersTab = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: profs }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, created_at").order("created_at", { ascending: false }).limit(200),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap = new Map<string, string>();
      (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));
      setRows((profs ?? []).map((p: any) => ({ ...p, role: roleMap.get(p.id) ?? "—" })));
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    !q.trim() ||
    r.full_name?.toLowerCase().includes(q.toLowerCase()) ||
    r.email?.toLowerCase().includes(q.toLowerCase()),
  );

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin"/></div>;

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
        <Input className="pl-10" placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)}/>
      </div>
      <Card className="divide-y divide-border">
        {filtered.map((u) => (
          <div key={u.id} className="p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{u.full_name || "(no name)"}</div>
              <div className="text-xs text-muted-foreground truncate">
                {u.email} · joined {format(new Date(u.created_at), "MMM d, yyyy")}
              </div>
            </div>
            <Badge variant="outline" className="capitalize">{u.role}</Badge>
          </div>
        ))}
        {filtered.length === 0 && <div className="p-12 text-center text-muted-foreground">No users.</div>}
      </Card>
    </div>
  );
};

export default AdminPanel;
