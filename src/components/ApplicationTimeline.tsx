import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, CheckCircle2, Clock, XCircle, Calendar, Trophy, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "applied" | "shortlisted" | "interview" | "accepted" | "rejected";

interface Entry {
  id: string;
  status: Status;
  created_at: string;
  note: string | null;
}

const meta: Record<Status, { icon: any; tone: string; label: string }> = {
  applied: { icon: Send, tone: "bg-primary text-primary-foreground", label: "Applied" },
  shortlisted: { icon: CheckCircle2, tone: "bg-accent text-accent-foreground", label: "Shortlisted" },
  interview: { icon: Calendar, tone: "bg-warning text-warning-foreground", label: "Interview" },
  accepted: { icon: Trophy, tone: "bg-success text-success-foreground", label: "Accepted" },
  rejected: { icon: XCircle, tone: "bg-destructive text-destructive-foreground", label: "Rejected" },
};

export const ApplicationTimeline = ({ applicationId }: { applicationId: string }) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("application_status_history")
        .select("id, status, created_at, note")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: true });
      setEntries((data as Entry[]) ?? []);
      setLoading(false);
    })();
  }, [applicationId]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );

  if (entries.length === 0)
    return (
      <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
        <Clock className="h-4 w-4" /> No history yet.
      </div>
    );

  return (
    <ol className="relative border-l-2 border-border pl-5 space-y-4">
      {entries.map((e, idx) => {
        const m = meta[e.status];
        const Icon = m.icon;
        const isLast = idx === entries.length - 1;
        return (
          <li key={e.id} className="relative">
            <span
              className={cn(
                "absolute -left-[30px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background",
                m.tone,
                isLast && "ring-primary/20",
              )}
            >
              <Icon className="h-3 w-3" />
            </span>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold">{m.label}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(e.created_at), "MMM d, yyyy · h:mm a")}
              </span>
            </div>
            {e.note && <p className="text-sm text-muted-foreground mt-0.5">{e.note}</p>}
          </li>
        );
      })}
    </ol>
  );
};
