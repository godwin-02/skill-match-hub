import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Props {
  label?: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  hint?: string;
}

export const TagInput = ({ label, value, onChange, placeholder, hint }: Props) => {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const v = raw.trim().replace(/,$/, "");
    if (!v) return;
    if (value.map((s) => s.toLowerCase()).includes(v.toLowerCase())) return;
    onChange([...value, v]);
    setDraft("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-input bg-background min-h-[48px]">
        {value.map((t) => (
          <Badge
            key={t}
            variant="secondary"
            className="gap-1.5 pr-1 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
          >
            {t}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="rounded-full hover:bg-primary/20 p-0.5"
              aria-label={`Remove ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => add(draft)}
          placeholder={placeholder ?? "Type and press Enter"}
          className="flex-1 min-w-[140px] border-0 shadow-none focus-visible:ring-0 px-1 h-7"
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
};
