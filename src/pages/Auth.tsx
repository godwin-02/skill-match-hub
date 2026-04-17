import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, GraduationCap, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const signupSchema = z.object({
  full_name: z.string().trim().min(1, "Required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
});
const loginSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Required").max(72),
});

const Auth = () => {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const mode = params.get("mode") === "signup" ? "signup" : "login";
  const initialRole = (params.get("role") === "company" ? "company" : "student") as "student" | "company";

  const [pickedRole, setPickedRole] = useState<"student" | "company">(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // After login: redirect to the right dashboard
  useEffect(() => {
    if (!authLoading && user && role) {
      nav(role === "company" ? "/company" : "/student", { replace: true });
    }
  }, [user, role, authLoading, nav]);

  const switchMode = (next: "signup" | "login") => {
    const np = new URLSearchParams(params);
    np.set("mode", next);
    setParams(np, { replace: true });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse({ full_name: name, email, password });
        if (!parsed.success) {
          toast({ title: "Check your details", description: parsed.error.issues[0].message, variant: "destructive" });
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: parsed.data.full_name,
              role: pickedRole,
              company_name: pickedRole === "company" ? parsed.data.full_name : undefined,
            },
          },
        });
        if (error) throw error;
        toast({ title: "Welcome to SkillSync 🎉", description: "Your account is ready." });
      } else {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast({ title: "Check your details", description: parsed.error.issues[0].message, variant: "destructive" });
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      toast({ title: "Auth error", description: err.message ?? "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="container py-5">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl gradient-hero flex items-center justify-center shadow-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl">SkillSync</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-lift glass-card">
          <h1 className="font-display text-3xl font-bold mb-1">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signup" ? "Join SkillSync in seconds." : "Sign in to continue."}
          </p>

          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-2 mb-5 p-1 rounded-xl bg-secondary">
              {([
                { v: "student", icon: GraduationCap, label: "Student" },
                { v: "company", icon: Building2, label: "Company" },
              ] as const).map(({ v, icon: Icon, label }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPickedRole(v)}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-smooth",
                    pickedRole === v
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">{pickedRole === "company" ? "Company name" : "Full name"}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100}/>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255}/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={72}/>
            </div>
            <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground border-0 h-11 shadow-soft hover:shadow-glow transition-smooth">
              {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "signup" ? "Already have an account?" : "New to SkillSync?"}{" "}
            <button onClick={() => switchMode(mode === "signup" ? "login" : "signup")}
              className="text-primary font-medium hover:underline">
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
