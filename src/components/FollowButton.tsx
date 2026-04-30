import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Heart, HeartOff, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const FollowButton = ({ companyId }: { companyId: string }) => {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const [{ data: f }, { count: c }] = await Promise.all([
        user
          ? supabase.from("company_follows").select("id").eq("company_id", companyId).eq("follower_id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("company_follows").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      ]);
      setFollowing(!!f);
      setCount(c ?? 0);
      setLoading(false);
    })();
  }, [companyId, user]);

  const toggle = async () => {
    if (!user) return;
    if (following) {
      const { error } = await supabase.from("company_follows").delete().eq("company_id", companyId).eq("follower_id", user.id);
      if (error) return toast({ title: "Couldn't unfollow", description: error.message, variant: "destructive" });
      setFollowing(false);
      setCount((c) => Math.max(0, c - 1));
    } else {
      const { error } = await supabase.from("company_follows").insert({ company_id: companyId, follower_id: user.id });
      if (error) return toast({ title: "Couldn't follow", description: error.message, variant: "destructive" });
      setFollowing(true);
      setCount((c) => c + 1);
    }
  };

  if (loading) return <Button variant="outline" disabled><Loader2 className="h-4 w-4 animate-spin" /></Button>;
  return (
    <Button variant={following ? "default" : "outline"} onClick={toggle} className="gap-2">
      {following ? <HeartOff className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
      {following ? "Following" : "Follow"}
      <span className="text-xs opacity-70">· {count}</span>
    </Button>
  );
};
