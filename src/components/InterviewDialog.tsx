import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Loader2, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  applicationId: string;
  candidateName?: string;
  jobTitle?: string;
  existing?: any | null;
  onSaved?: () => void;
}

type IType = "online" | "onsite";

export const InterviewDialog = ({
  open, onOpenChange, applicationId, candidateName, jobTitle, existing, onSaved,
}: Props) => {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("30");
  const [type, setType] = useState<IType>("online");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      const d = new Date(existing.scheduled_at);
      setDate(d);
      setTime(format(d, "HH:mm"));
      setDuration(String(existing.duration_minutes ?? 30));
      setType((existing.type ?? "online") as IType);
      setLocation(existing.location ?? "");
      setNotes(existing.notes ?? "");
    } else {
      setDate(undefined);
      setTime("10:00");
      setDuration("30");
      setType("online");
      setLocation("");
      setNotes("");
    }
  }, [open, existing]);

  const save = async () => {
    if (!user) return;
    if (!date) {
      toast({ title: "Pick a date", variant: "destructive" });
      return;
    }
    const [hh, mm] = time.split(":").map((n) => parseInt(n, 10) || 0);
    const scheduled = new Date(date);
    scheduled.setHours(hh, mm, 0, 0);
    if (scheduled.getTime() < Date.now() - 60_000) {
      toast({ title: "Pick a future time", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      application_id: applicationId,
      scheduled_at: scheduled.toISOString(),
      duration_minutes: parseInt(duration, 10) || 30,
      type,
      location: location.trim() || null,
      notes: notes.trim() || null,
      created_by: user.id,
    };
    const { error } = existing
      ? await supabase.from("interviews").update(payload).eq("id", existing.id)
      : await supabase.from("interviews").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save interview", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: existing ? "Interview updated" : "Interview scheduled ✨" });
    onOpenChange(false);
    onSaved?.();
  };

  const cancel = async () => {
    if (!existing) return;
    if (!confirm("Cancel this interview?")) return;
    setRemoving(true);
    const { error } = await supabase.from("interviews").update({ status: "cancelled" }).eq("id", existing.id);
    setRemoving(false);
    if (error) {
      toast({ title: "Couldn't cancel", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Interview cancelled" });
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit interview" : "Schedule interview"}</DialogTitle>
          <DialogDescription>
            {candidateName ? `${candidateName} · ` : ""}{jobTitle ?? ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal w-full", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4"/>
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)}/>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Duration (min)</Label>
              <Input type="number" min={5} max={300} value={duration} onChange={(e) => setDuration(e.target.value)}/>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as IType)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{type === "online" ? "Platform / instructions" : "Address"}</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={type === "online" ? "Google Meet · link will be shared by email" : "123 Main St, Bangalore"}
              maxLength={250}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes for candidate (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500}/>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between gap-2">
          {existing && existing.status !== "cancelled" ? (
            <Button variant="ghost" onClick={cancel} disabled={removing} className="text-destructive hover:text-destructive">
              {removing ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Trash2 className="h-4 w-4 mr-1"/>Cancel interview</>}
            </Button>
          ) : <span/>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground border-0">
              {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : existing ? "Save changes" : "Schedule"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
