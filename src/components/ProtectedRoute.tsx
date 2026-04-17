import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  requireRole?: AppRole;
}

export const ProtectedRoute = ({ children, requireRole }: Props) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (requireRole && role && role !== requireRole && role !== "admin") {
    return <Navigate to={role === "company" ? "/company" : "/student"} replace />;
  }
  return <>{children}</>;
};
