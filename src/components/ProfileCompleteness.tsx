import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import type { CompletenessField } from "@/lib/profileCompleteness";

interface Props {
  percent: number;
  fields: CompletenessField[];
}

export const ProfileCompleteness = ({ percent, fields }: Props) => {
  const missing = fields.filter((f) => !f.done);
  const tone =
    percent >= 80 ? "text-success" : percent >= 50 ? "text-warning-foreground" : "text-destructive";

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Profile completeness
          </div>
          <div className={`font-display text-3xl font-bold ${tone}`}>{percent}%</div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/profile">
            Complete profile <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <Progress value={percent} className="h-2" />

      {missing.length > 0 ? (
        <div>
          <div className="text-xs text-muted-foreground mb-2">
            Add {missing.length} more to boost your matches:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missing.slice(0, 6).map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1 text-xs bg-muted/60 rounded-full px-2.5 py-1"
              >
                <Circle className="h-3 w-3" /> {f.label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> Your profile is fully filled. Nice work!
        </div>
      )}
    </Card>
  );
};
