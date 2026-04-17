import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "applied" | "shortlisted" | "interview" | "accepted" | "rejected";

const map: Record<Status, { label: string; cls: string }> = {
  applied:    { label: "Applied",     cls: "bg-info/15 text-info border-info/30" },
  shortlisted:{ label: "Shortlisted", cls: "bg-primary/15 text-primary border-primary/30" },
  interview:  { label: "Interview",   cls: "bg-warning/20 text-warning-foreground border-warning/40" },
  accepted:   { label: "Accepted",    cls: "bg-success/15 text-success border-success/30" },
  rejected:   { label: "Rejected",    cls: "bg-destructive/10 text-destructive border-destructive/30" },
};

export const StatusBadge = ({ status, className }: { status: Status; className?: string }) => {
  const m = map[status];
  return (
    <Badge variant="outline" className={cn("font-medium border", m.cls, className)}>
      {m.label}
    </Badge>
  );
};
