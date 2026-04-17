import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sparkles, Target, Briefcase, GraduationCap, Building2,
  ArrowRight, Zap, TrendingUp, CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Landing = () => {
  const { user, role } = useAuth();
  const dashHref = role === "company" ? "/company" : "/student";

  return (
    <div className="min-h-screen overflow-hidden">
      {/* NAV */}
      <header className="absolute top-0 inset-x-0 z-20">
        <div className="container flex items-center justify-between py-5">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl gradient-hero flex items-center justify-center shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl">SkillSync</span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild><Link to={dashHref}>Open dashboard</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
                <Button asChild className="gradient-primary text-primary-foreground border-0 shadow-soft hover:shadow-glow transition-smooth">
                  <Link to="/auth?mode=signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-32 pb-24">
        {/* Background blobs */}
        <div aria-hidden className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl animate-blob" />
        <div aria-hidden className="absolute top-32 -right-20 h-96 w-96 rounded-full bg-accent/40 blur-3xl animate-blob" style={{ animationDelay: "5s" }}/>

        <div className="container relative grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-7 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card border border-border shadow-sm text-sm font-medium">
              <Zap className="h-4 w-4 text-accent-foreground fill-accent" />
              Skill-based job matching for the next gen
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05]">
              Land the job that <span className="text-gradient">actually fits</span> you.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              SkillSync matches students to roles based on real skills, not buzzwords.
              See your match % on every job — and apply with one click.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="gradient-primary text-primary-foreground border-0 h-12 px-7 text-base shadow-soft hover:shadow-glow transition-smooth">
                <Link to="/auth?mode=signup&role=student">
                  <GraduationCap className="mr-1" /> I'm a student
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base border-2 hover:bg-accent hover:text-accent-foreground hover:border-accent transition-smooth">
                <Link to="/auth?mode=signup&role=company">
                  <Building2 className="mr-1" /> I'm hiring
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-sm text-muted-foreground">
              {["Free for students", "Smart skill matching", "Track every application"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Floating preview */}
          <div className="relative animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <Card className="glass-card p-6 shadow-lift relative z-10 animate-float">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-muted-foreground">FRONTEND ENGINEER · INTERN</div>
                  <div className="font-display font-bold text-lg">Northwind Labs</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-display font-bold text-gradient">94%</div>
                  <div className="text-xs text-muted-foreground">match</div>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {[
                  ["Skills", 95], ["Role fit", 100], ["Experience", 80], ["Location", 100],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex items-center gap-3 text-sm">
                    <span className="w-20 text-muted-foreground">{k}</span>
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full gradient-primary rounded-full" style={{ width: `${v}%` }}/>
                    </div>
                    <span className="w-10 text-right font-semibold">{v}%</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["React", "TypeScript", "Tailwind", "REST"].map((s) => (
                  <span key={s} className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{s}</span>
                ))}
              </div>
            </Card>
            <Card className="glass-card p-4 shadow-soft absolute -bottom-6 -left-6 hidden md:block animate-float" style={{ animationDelay: "1.5s" }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full gradient-accent flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-accent-foreground"/>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="font-display font-bold text-sm">Interview scheduled</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-3">How it works</h2>
          <p className="text-muted-foreground">Three steps. Zero fluff.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Target, title: "Tell us your skills", desc: "Build a quick profile with your skills, education, and what you want to do." },
            { icon: Briefcase, title: "See your match %", desc: "Every job shows how well it fits, scored on skills, role, experience and location." },
            { icon: Sparkles, title: "Apply & track", desc: "One-click apply. Watch your status move from Applied to Interview to Accepted." },
          ].map(({ icon: Icon, title, desc }, i) => (
            <Card key={title} className="p-7 border-2 hover:border-primary/40 transition-smooth hover:shadow-soft group">
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-bounce shadow-soft">
                <Icon className="h-6 w-6 text-primary-foreground"/>
              </div>
              <div className="text-xs font-display font-bold text-muted-foreground mb-1">STEP {i+1}</div>
              <h3 className="font-display font-bold text-xl mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* TWO PATHS */}
      <section className="container py-20">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-8 lg:p-10 border-0 gradient-primary text-primary-foreground overflow-hidden relative">
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"/>
            <GraduationCap className="h-10 w-10 mb-5"/>
            <h3 className="font-display text-3xl font-bold mb-3">For students</h3>
            <p className="opacity-90 mb-6">Browse curated jobs ranked by your real fit. Track applications. Stand out with your skills, not your CV format.</p>
            <Button asChild variant="secondary" className="bg-white text-primary hover:bg-white/90">
              <Link to="/auth?mode=signup&role=student">Create student account <ArrowRight className="ml-1 h-4 w-4"/></Link>
            </Button>
          </Card>
          <Card className="p-8 lg:p-10 border-2 border-accent bg-card relative overflow-hidden">
            <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-accent/30 blur-2xl"/>
            <Building2 className="h-10 w-10 mb-5 text-primary"/>
            <h3 className="font-display text-3xl font-bold mb-3">For companies</h3>
            <p className="text-muted-foreground mb-6">Post a role. Get applicants ranked by match score. Move them through your pipeline in clicks.</p>
            <Button asChild className="gradient-accent text-accent-foreground border-0 hover:opacity-90">
              <Link to="/auth?mode=signup&role=company">Hire on SkillSync <ArrowRight className="ml-1 h-4 w-4"/></Link>
            </Button>
          </Card>
        </div>
      </section>

      <footer className="container py-10 text-center text-sm text-muted-foreground border-t border-border mt-10">
        Built with ❤️ on SkillSync · The smarter way to match talent.
      </footer>
    </div>
  );
};

export default Landing;
