import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
}

const Stars = ({ value, onChange, size = 18 }: { value: number; onChange?: (n: number) => void; size?: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        disabled={!onChange}
        onClick={() => onChange?.(n)}
        className={onChange ? "transition-smooth hover:scale-110" : ""}
        aria-label={`${n} stars`}
      >
        <Star
          style={{ width: size, height: size }}
          className={n <= value ? "fill-warning text-warning" : "text-muted-foreground/40"}
        />
      </button>
    ))}
  </div>
);

export const ReviewsSection = ({ companyId }: { companyId: string }) => {
  const { user, role } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const myReview = useMemo(() => reviews.find((r) => r.reviewer_id === user?.id), [reviews, user]);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const load = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Review[];
    setReviews(list);
    const ids = Array.from(new Set(list.map((r) => r.reviewer_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => (map[p.id] = p.full_name ?? "Anonymous"));
      setAuthors(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!companyId) return;
    load();
  }, [companyId]);

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setTitle(myReview.title ?? "");
      setBody(myReview.body ?? "");
    }
  }, [myReview]);

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    const payload = { company_id: companyId, reviewer_id: user.id, rating, title: title.trim() || null, body: body.trim() || null };
    const { error } = myReview
      ? await supabase.from("reviews").update(payload).eq("id", myReview.id)
      : await supabase.from("reviews").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save review", description: error.message, variant: "destructive" });
    } else {
      toast({ title: myReview ? "Review updated" : "Review posted ✨" });
      load();
    }
  };

  const remove = async () => {
    if (!myReview) return;
    const { error } = await supabase.from("reviews").delete().eq("id", myReview.id);
    if (error) return toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
    setRating(5); setTitle(""); setBody("");
    load();
  };

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-xl">Reviews</h2>
          <p className="text-sm text-muted-foreground">{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</p>
        </div>
        {reviews.length > 0 && (
          <div className="text-right">
            <div className="font-display text-3xl font-bold">{avg.toFixed(1)}</div>
            <Stars value={Math.round(avg)} />
          </div>
        )}
      </div>

      {role === "student" && (
        <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
          <Label>{myReview ? "Edit your review" : "Leave a review"}</Label>
          <Stars value={rating} onChange={setRating} size={22} />
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline (optional)" maxLength={120} />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What was your experience?" rows={3} maxLength={1000} />
          <div className="flex gap-2">
            <Button onClick={submit} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : myReview ? "Update" : "Post review"}
            </Button>
            {myReview && <Button onClick={remove} variant="ghost" size="sm">Delete</Button>}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-border pb-3 last:border-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="font-semibold text-sm">{authors[r.reviewer_id] ?? "Student"}</div>
                <Stars value={r.rating} size={14} />
              </div>
              {r.title && <div className="font-medium text-sm">{r.title}</div>}
              {r.body && <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{r.body}</p>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
