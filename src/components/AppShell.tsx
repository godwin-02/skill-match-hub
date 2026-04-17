import { Link, NavLink, useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Briefcase, FileText, User, Building2,
  PlusCircle, Users, LogOut, Sparkles, Menu,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem { to: string; label: string; icon: typeof LayoutDashboard; }

const studentNav: NavItem[] = [
  { to: "/student", label: "Dashboard", icon: LayoutDashboard },
  { to: "/jobs", label: "Browse jobs", icon: Briefcase },
  { to: "/applications", label: "My applications", icon: FileText },
  { to: "/profile", label: "My profile", icon: User },
];
const companyNav: NavItem[] = [
  { to: "/company", label: "Dashboard", icon: LayoutDashboard },
  { to: "/company/jobs", label: "Manage jobs", icon: Briefcase },
  { to: "/company/jobs/new", label: "Post a job", icon: PlusCircle },
  { to: "/company/profile", label: "Company profile", icon: Building2 },
];

const NavList = ({ items, onClick }: { items: NavItem[]; onClick?: () => void }) => (
  <nav className="flex flex-col gap-1">
    {items.map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        end
        onClick={onClick}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-smooth",
            isActive
              ? "bg-primary text-primary-foreground shadow-soft"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )
        }
      >
        <Icon className="h-4 w-4" />
        {label}
      </NavLink>
    ))}
  </nav>
);

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { role, user, signOut } = useAuth();
  const nav = useNavigate();
  const items = role === "company" ? companyNav : studentNav;

  const handleSignOut = async () => {
    await signOut();
    nav("/");
  };

  const Sidebar = ({ onItemClick }: { onItemClick?: () => void }) => (
    <div className="flex flex-col h-full p-4">
      <Link to="/" className="flex items-center gap-2 px-2 py-3 mb-4">
        <div className="h-9 w-9 rounded-xl gradient-hero flex items-center justify-center shadow-glow">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <span className="font-display font-bold text-xl">SkillSync</span>
      </Link>
      <NavList items={items} onClick={onItemClick} />
      <div className="mt-auto pt-4 border-t border-border">
        <div className="px-3 py-2 text-xs text-muted-foreground truncate">
          {user?.email}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-sidebar shrink-0">
        <Sidebar />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-40">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-hero flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-bold">SkillSync</span>
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
