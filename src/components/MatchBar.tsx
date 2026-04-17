import { cn } from "@/lib/utils";

interface Props {
  score: number;
  className?: string;
  showLabel?: boolean;
}

export const MatchBar = ({ score, className, showLabel = true }: Props) => {
  const clamped = Math.max(0, Math.min(100, score));
  const tone =
    clamped >= 75 ? "from-success to-accent"
    : clamped >= 50 ? "from-primary to-primary-glow"
    : clamped >= 25 ? "from-warning to-accent"
    : "from-muted-foreground to-muted-foreground";

  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-muted-foreground">Match</span>
          <span className="font-display font-bold text-foreground">{clamped}%</span>
        </div>
      )}
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", tone)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
