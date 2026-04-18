import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export const useSavedJobs = () => {
  const { user, role } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || role !== "student") { setLoading(false); return; }
    const { data } = await supabase.from("saved_jobs").select("job_id").eq("student_id", user.id);
    setSavedIds(new Set((data ?? []).map((r) => r.job_id)));
    setLoading(false);
  }, [user, role]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = useCallback(async (jobId: string) => {
    if (!user) return;
    if (savedIds.has(jobId)) {
      const next = new Set(savedIds); next.delete(jobId); setSavedIds(next);
      const { error } = await supabase.from("saved_jobs").delete().eq("student_id", user.id).eq("job_id", jobId);
      if (error) {
        next.add(jobId); setSavedIds(new Set(next));
        toast({ title: "Couldn't unsave", description: error.message, variant: "destructive" });
      }
    } else {
      const next = new Set(savedIds); next.add(jobId); setSavedIds(next);
      const { error } = await supabase.from("saved_jobs").insert({ student_id: user.id, job_id: jobId });
      if (error) {
        next.delete(jobId); setSavedIds(new Set(next));
        toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Saved 💜", description: "Find it under Saved jobs." });
      }
    }
  }, [user, savedIds]);

  return { savedIds, isSaved: (id: string) => savedIds.has(id), toggle, loading, refresh };
};
