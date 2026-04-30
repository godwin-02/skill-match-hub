import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, MessagesSquare, Building2, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type Conversation = {
  application_id: string;
  job_title: string;
  other_name: string;
  other_id: string;
  last_message?: string;
  last_at?: string;
  unread: number;
};

type Message = {
  id: string;
  application_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

const Messages = () => {
  const { applicationId } = useParams();
  const { user, role } = useAuth();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string | null>(applicationId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversation list (one per application the user participates in)
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      let appsQuery = supabase
        .from("applications")
        .select("id, student_id, job_id, jobs(title, company_id, company_profiles(company_name)), profiles:student_id(full_name, email)")
        .order("applied_at", { ascending: false });

      if (role === "student") appsQuery = appsQuery.eq("student_id", user.id);
      // companies: filter via jobs.company_id using a follow-up filter
      const { data: apps } = await appsQuery;

      const filtered = (apps ?? []).filter((a: any) => {
        if (role === "student") return a.student_id === user.id;
        if (role === "company") return a.jobs?.company_id === user.id;
        return true; // admin
      });

      const ids = filtered.map((a: any) => a.id);
      let lastByApp: Record<string, Message> = {};
      let unreadByApp: Record<string, number> = {};
      if (ids.length) {
        const { data: msgs } = await supabase
          .from("messages")
          .select("*")
          .in("application_id", ids)
          .order("created_at", { ascending: false });
        for (const m of msgs ?? []) {
          if (!lastByApp[m.application_id]) lastByApp[m.application_id] = m as Message;
          if (!m.read_at && m.sender_id !== user.id) {
            unreadByApp[m.application_id] = (unreadByApp[m.application_id] ?? 0) + 1;
          }
        }
      }

      const list: Conversation[] = filtered.map((a: any) => {
        const isStudent = role === "student";
        const other_name = isStudent
          ? (a.jobs?.company_profiles?.company_name ?? "Company")
          : (a.profiles?.full_name || a.profiles?.email || "Candidate");
        const other_id = isStudent ? a.jobs?.company_id : a.student_id;
        const last = lastByApp[a.id];
        return {
          application_id: a.id,
          job_title: a.jobs?.title ?? "Job",
          other_name,
          other_id,
          last_message: last?.body,
          last_at: last?.created_at,
          unread: unreadByApp[a.id] ?? 0,
        };
      });
      list.sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? ""));
      setConvos(list);
      setLoading(false);
      if (!active && list.length) setActive(list[0].application_id);
    })();
  }, [user, role]);

  // Load messages for active conversation + subscribe to realtime
  useEffect(() => {
    if (!active || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("application_id", active)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setMessages((data ?? []) as Message[]);
      // Mark incoming as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("application_id", active)
        .neq("sender_id", user.id)
        .is("read_at", null);
      setConvos((cs) => cs.map((c) => c.application_id === active ? { ...c, unread: 0 } : c));
    })();

    const channel = supabase
      .channel(`messages:${active}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `application_id=eq.${active}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
          if (m.sender_id !== user.id) {
            supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", m.id);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [active, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const activeConvo = useMemo(() => convos.find((c) => c.application_id === active), [convos, active]);

  const send = async () => {
    if (!user || !active || !draft.trim()) return;
    setSending(true);
    const body = draft.trim();
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      application_id: active,
      sender_id: user.id,
      body,
    });
    setSending(false);
    if (error) {
      toast({ title: "Couldn't send", description: error.message, variant: "destructive" });
      setDraft(body);
    }
  };

  return (
    <AppShell>
      <div className="h-[calc(100vh-9rem)] grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
        {/* Conversation list */}
        <Card className="flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <MessagesSquare className="h-4 w-4 text-primary"/>
            <h1 className="font-display font-bold">Messages</h1>
          </div>
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin"/></div>
            ) : convos.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">
                No conversations yet. Apply to a job (or receive an application) to start chatting.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {convos.map((c) => (
                  <li key={c.application_id}>
                    <button
                      onClick={() => setActive(c.application_id)}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-muted/40 transition-smooth flex gap-3 items-start",
                        active === c.application_id && "bg-muted/60",
                      )}
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {role === "student" ? <Building2 className="h-4 w-4 text-primary"/> : <UserIcon className="h-4 w-4 text-primary"/>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{c.other_name}</span>
                          {c.unread > 0 && (
                            <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">{c.unread}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{c.job_title}</div>
                        {c.last_message && (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">{c.last_message}</div>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </Card>

        {/* Chat panel */}
        <Card className="flex flex-col overflow-hidden">
          {!activeConvo ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8 text-center">
              Select a conversation to start messaging.
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{activeConvo.other_name}</div>
                  <div className="text-xs text-muted-foreground truncate">about “{activeConvo.job_title}”</div>
                </div>
                {activeConvo.other_id && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={role === "student" ? `/c/${activeConvo.other_id}` : `/u/${activeConvo.other_id}`}>
                      View profile
                    </Link>
                  </Button>
                )}
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-2 bg-muted/20">
                {messages.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground pt-8">No messages yet — say hi 👋</div>
                )}
                {messages.map((m, i) => {
                  const mine = m.sender_id === user?.id;
                  const prev = messages[i - 1];
                  const newGroup = !prev || prev.sender_id !== m.sender_id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start", newGroup ? "mt-3" : "mt-0.5")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm whitespace-pre-wrap break-words",
                          mine
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-card border border-border rounded-bl-md",
                        )}
                      >
                        {m.body}
                        <div className={cn("text-[10px] mt-1 opacity-70", mine ? "text-primary-foreground" : "text-muted-foreground")}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); send(); }}
                className="p-3 border-t border-border flex items-center gap-2 bg-background"
              >
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  maxLength={4000}
                  disabled={sending}
                />
                <Button type="submit" disabled={!draft.trim() || sending} size="icon" className="gradient-primary text-primary-foreground border-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
};

export default Messages;
