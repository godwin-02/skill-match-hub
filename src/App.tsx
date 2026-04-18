import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

import StudentDashboard from "./pages/student/StudentDashboard";
import StudentProfilePage from "./pages/student/StudentProfilePage";
import JobsBrowse from "./pages/student/JobsBrowse";
import JobDetail from "./pages/student/JobDetail";
import MyApplications from "./pages/student/MyApplications";
import SavedJobs from "./pages/student/SavedJobs";

import CompanyDashboard from "./pages/company/CompanyDashboard";
import CompanyProfilePage from "./pages/company/CompanyProfilePage";
import NewJobPage from "./pages/company/NewJobPage";
import ManageJobs from "./pages/company/ManageJobs";
import ApplicantsPage from "./pages/company/ApplicantsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />

            {/* Student */}
            <Route path="/student" element={<ProtectedRoute requireRole="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute requireRole="student"><StudentProfilePage /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute requireRole="student"><JobsBrowse /></ProtectedRoute>} />
            <Route path="/jobs/:id" element={<ProtectedRoute requireRole="student"><JobDetail /></ProtectedRoute>} />
            <Route path="/applications" element={<ProtectedRoute requireRole="student"><MyApplications /></ProtectedRoute>} />
            <Route path="/saved" element={<ProtectedRoute requireRole="student"><SavedJobs /></ProtectedRoute>} />

            {/* Company */}
            <Route path="/company" element={<ProtectedRoute requireRole="company"><CompanyDashboard /></ProtectedRoute>} />
            <Route path="/company/profile" element={<ProtectedRoute requireRole="company"><CompanyProfilePage /></ProtectedRoute>} />
            <Route path="/company/jobs" element={<ProtectedRoute requireRole="company"><ManageJobs /></ProtectedRoute>} />
            <Route path="/company/jobs/new" element={<ProtectedRoute requireRole="company"><NewJobPage /></ProtectedRoute>} />
            <Route path="/company/jobs/:id/applicants" element={<ProtectedRoute requireRole="company"><ApplicantsPage /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
