import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Clock, CheckCircle, XCircle, Mail, UserMinus, PoundSterling, Loader2, LogIn, LogOut, UserPlus, Calendar, ChevronDown, ChevronUp, ChevronRight, MessageSquare, Ban, Send, Bell, FileText } from "lucide-react";
import { format } from "date-fns";
import { SessionBanner, UsefulLinks } from "./SessionViews";

interface SessionDetailsModalProps {
  session: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function SessionDetailsModal({ session, open, onOpenChange, isAdmin }: SessionDetailsModalProps) {
  const { toast } = useToast();
  const { data: user } = useUser();
  const [expandedSection, setExpandedSection] = useState<string | null>("confirmed-secured");
  const [messageTarget, setMessageTarget] = useState<{ userId: number; name: string } | null>(null);
  const [messageText, setMessageText] = useState("");
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [addPlayerSearch, setAddPlayerSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [showPaymentReminder, setShowPaymentReminder] = useState(false);
  const [reminderText, setReminderText] = useState("");

  const { data: manageData, isLoading } = useQuery<any>({
    queryKey: ["/api/sessions", session.id, "manage-players"],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${session.id}/manage-players`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: open && isAdmin,
  });

  const { data: signups } = useQuery<any[]>({
    queryKey: ["/api/sessions", session.id, "signups"],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${session.id}/signups`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: open && !isAdmin,
  });

  const { data: clubMembers } = useQuery<any[]>({
    queryKey: ["/api/clubs", session.clubId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${session.clubId}/members`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: open && isAdmin && showAddPlayer,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ signupId, signupStatus }: { signupId: number; signupStatus: string }) => {
      const res = await apiRequest("PATCH", `/api/sessions/${session.id}/signups/${signupId}/status`, { signupStatus });
      try { return await res.json(); } catch { return {}; }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "manage-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "signups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      if (data?.actualStatus === "WAITING") {
        toast({ title: "Moved to waiting list", description: "Session is full - player added to waiting list instead" });
      } else {
        toast({ title: "Player status updated" });
      }
      setSelectedPlayer(null);
    },
  });

  const addToWaitingListMutation = useMutation({
    mutationFn: async (playerId: number) => {
      await apiRequest("POST", `/api/sessions/${session.id}/add-to-waiting-list`, { playerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "manage-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "signups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Player added to waiting list" });
      setShowAddPlayer(false);
      setAddPlayerSearch("");
    },
    onError: (err: any) => {
      toast({ title: "Could not add player", description: err.message || "Player may already be signed up", variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (signupId: number) => {
      await apiRequest("DELETE", `/api/sessions/${session.id}/signups/${signupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "manage-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "signups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Player removed from session" });
      setSelectedPlayer(null);
    },
    onError: () => {
      toast({ title: "Failed to remove player", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ recipientId, body }: { recipientId: number; body: string }) => {
      await apiRequest("POST", "/api/messages/send", { recipientId, body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      toast({ title: "Message sent" });
      setMessageTarget(null);
      setMessageText("");
      setShowPaymentReminder(false);
      setReminderText("");
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ signupId, updates }: { signupId: number; updates: any }) => {
      await apiRequest("PATCH", `/api/sessions/${session.id}/signups/${signupId}/payment-override`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "manage-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "signups"] });
      toast({ title: "Payment updated" });
    },
  });

  const playerStatusMutation = useMutation({
    mutationFn: async ({ action }: { action: string }) => {
      const res = await apiRequest("POST", `/api/sessions/${session.id}/player-status`, { action });
      try { return await res.json(); } catch { return {}; }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "manage-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "signups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      if (data?.addedToWaitingList) {
        toast({ title: "Added to waiting list", description: "The session is full. You've been placed on the waiting list." });
      } else {
        toast({ title: "Status updated" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update status", variant: "destructive" });
    },
  });

  const publishNowMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/sessions/${session.id}`, { publishAt: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "manage-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "signups"] });
      toast({ title: "Published", description: "Session is now open for signups." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to publish session.", variant: "destructive" });
    },
  });

  const allSignups = isAdmin ? [
    ...(manageData?.confirmed || []),
    ...(manageData?.waiting || []),
    ...(manageData?.invited || []),
    ...(manageData?.notAttending || []),
    ...(manageData?.cancelled || []),
  ] : (signups || []);

  const confirmedRaw = isAdmin ? (manageData?.confirmed || []) : (signups?.filter((s: any) => !s.signupStatus || s.signupStatus === "CONFIRMED") || []);
  const confirmed = [...confirmedRaw].sort((a: any, b: any) => {
    const aPaused = !!a.isPaused; const bPaused = !!b.isPaused;
    if (aPaused !== bPaused) return aPaused ? 1 : -1;
    const aName = a.player?.user?.fullName || a.user?.fullName || "";
    const bName = b.player?.user?.fullName || b.user?.fullName || "";
    return aName.localeCompare(bName, undefined, { sensitivity: "base" });
  });
  const confirmedSecured = confirmed.filter((s: any) => s.paymentStatus === "PAID");
  const confirmedProvisional = confirmed.filter((s: any) => s.paymentStatus !== "PAID");
  const waitingUnsorted = isAdmin ? (manageData?.waiting || []) : (signups?.filter((s: any) => s.signupStatus === "WAITING") || []);
  const waiting = [...waitingUnsorted].sort((a: any, b: any) => {
    const posA = a.waitingListPosition || 999;
    const posB = b.waitingListPosition || 999;
    if (posA !== posB) return posA - posB;
    return new Date(a.signupTime || 0).getTime() - new Date(b.signupTime || 0).getTime();
  });
  const invited = isAdmin ? (manageData?.invited || []) : (signups?.filter((s: any) => s.signupStatus === "INVITED") || []);
  const notAttending = isAdmin ? (manageData?.notAttending || []) : (signups?.filter((s: any) => s.signupStatus === "NOT_ATTENDING") || []);

  const getPlayerUserId = (signup: any) => {
    return signup.player?.userId || signup.playerProfile?.userId || signup.userId || null;
  };

  const mySignup = allSignups.find((s: any) => getPlayerUserId(s) === user?.id);
  const myStatus = mySignup?.signupStatus || null;
  const isFull = confirmed.length >= (session.maxPlayers || 999);

  const getPlayerName = (signup: any) => {
    if (signup.player?.user?.fullName) return signup.player.user.fullName;
    if (signup.playerProfile?.user?.fullName) return signup.playerProfile.user.fullName;
    if (signup.fullName) return signup.fullName;
    return `Player #${signup.playerId}`;
  };

  const getPlayerGrade = (signup: any) => {
    const profile = signup.player || signup.playerProfile;
    return profile?.grade || profile?.category || null;
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const openQuickMessage = (signup: any) => {
    const userId = getPlayerUserId(signup);
    const name = getPlayerName(signup);
    if (userId) {
      setMessageTarget({ userId, name });
      setMessageText("");
    }
  };

  const handleSendMessage = () => {
    if (!messageTarget || !messageText.trim()) return;
    sendMessageMutation.mutate({ recipientId: messageTarget.userId, body: messageText.trim() });
  };

  const openPaymentReminder = (signup: any) => {
    const userId = getPlayerUserId(signup);
    const name = getPlayerName(signup);
    if (!userId) return;
    const sessionDate = format(new Date(session.date), "EEE, MMM d");
    const feeText = session.sessionFee ? `${"\u00A3"}${(session.sessionFee / 100).toFixed(2)}` : "the session fee";
    const template = `Hi ${name.split(" ")[0]},\n\nThis is a friendly reminder that your payment of ${feeText} for the session "${session.title}" on ${sessionDate} is still outstanding.\n\nPlease make the payment at your earliest convenience.\n\nThank you!`;
    setMessageTarget({ userId, name });
    setReminderText(template);
    setShowPaymentReminder(true);
  };

  const handleSendReminder = () => {
    if (!messageTarget || !reminderText.trim()) return;
    sendMessageMutation.mutate({ recipientId: messageTarget.userId, body: reminderText.trim() });
  };

  const renderResponseSummary = () => (
    <div className="flex items-center justify-center gap-3 sm:gap-6 py-2 sm:py-3">
      <button onClick={() => toggleSection("confirmed-secured")} className="flex flex-col items-center gap-0.5 sm:gap-1" data-testid="summary-confirmed">
        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 font-bold text-sm sm:text-lg">
          {confirmed.length}
        </div>
        <span className="text-[9px] sm:text-xs text-muted-foreground">Going</span>
      </button>
      <button onClick={() => toggleSection("waiting")} className="flex flex-col items-center gap-0.5 sm:gap-1" data-testid="summary-waiting">
        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 font-bold text-sm sm:text-lg">
          {waiting.length}
        </div>
        <span className="text-[9px] sm:text-xs text-muted-foreground">Waiting</span>
      </button>
      <button onClick={() => toggleSection("invited")} className="flex flex-col items-center gap-0.5 sm:gap-1" data-testid="summary-invited">
        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-bold text-sm sm:text-lg">
          {invited.length}
        </div>
        <span className="text-[9px] sm:text-xs text-muted-foreground">Invited</span>
      </button>
      <button onClick={() => toggleSection("notAttending")} className="flex flex-col items-center gap-0.5 sm:gap-1" data-testid="summary-not-attending">
        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted text-muted-foreground font-bold text-sm sm:text-lg">
          {notAttending.length}
        </div>
        <span className="text-[9px] sm:text-xs text-muted-foreground">Out</span>
      </button>
    </div>
  );

  const renderPlayerRow = (signup: any, waitingPosition?: number) => {
    const name = getPlayerName(signup);
    const grade = getPlayerGrade(signup);
    const isMe = getPlayerUserId(signup) === user?.id;
    const isPaid = signup.paymentStatus === "PAID";
    const status = signup.signupStatus || "CONFIRMED";
    const isConfirmedStatus = status === "CONFIRMED";
    const showPayment = isAdmin && isConfirmedStatus;
    const isPending = statusMutation.isPending || removeMutation.isPending;

    const timeStamp = signup.signupTime ? (
      <span className="text-[10px] text-muted-foreground">
        {new Date(signup.signupTime).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} {new Date(signup.signupTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
      </span>
    ) : null;

    const playerInfo = (
      <>
        <Avatar className={`h-7 w-7 sm:h-8 sm:w-8 shrink-0 ${isMe ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}>
          <AvatarFallback className="text-[10px] sm:text-xs font-medium bg-muted">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <span className="font-medium text-xs sm:text-sm truncate" data-testid={`text-player-name-${signup.id}`}>{name}</span>
            {isMe && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">You</Badge>}
            {grade && <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{grade}</Badge>}
            {signup.signupStatus === "WAITING" && waitingPosition && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">#{waitingPosition}</Badge>
            )}
          </div>
          {timeStamp}
        </div>
      </>
    );

    if (isAdmin) {
      return (
        <div key={signup.id} className="flex items-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-1 rounded-md" data-testid={`player-row-${signup.id}`}>
          <button className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 text-left" onClick={() => setSelectedPlayer(signup)}>
            {playerInfo}
          </button>
          <div className="flex items-center shrink-0">
            {showPayment && (
              <div className="shrink-0 px-0.5" data-testid={`payment-icon-${signup.id}`}>
                {isPaid ? (
                  <PoundSterling className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <PoundSterling className="h-3.5 w-3.5 text-red-500" />
                )}
              </div>
            )}
            <div className="hidden sm:flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className={isConfirmedStatus ? "text-green-500" : "text-muted-foreground/40"}
                onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ signupId: signup.id, signupStatus: "CONFIRMED" }); }}
                disabled={isPending || isConfirmedStatus}
                title="Add to session"
                data-testid={`inline-confirm-${signup.id}`}
              >
                <CheckCircle className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={status === "WAITING" ? "text-yellow-500" : "text-muted-foreground/40"}
                onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ signupId: signup.id, signupStatus: "WAITING" }); }}
                disabled={isPending || status === "WAITING"}
                title="Add to waiting list"
                data-testid={`inline-waiting-${signup.id}`}
              >
                <Clock className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={status === "INVITED" ? "text-blue-500" : "text-muted-foreground/40"}
                onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ signupId: signup.id, signupStatus: "INVITED" }); }}
                disabled={isPending || status === "INVITED"}
                title="Set as invited"
                data-testid={`inline-invited-${signup.id}`}
              >
                <Mail className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={status === "NOT_ATTENDING" ? "text-muted-foreground" : "text-muted-foreground/40"}
                onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ signupId: signup.id, signupStatus: "NOT_ATTENDING" }); }}
                disabled={isPending || status === "NOT_ATTENDING"}
                title="Decline"
                data-testid={`inline-decline-${signup.id}`}
              >
                <Ban className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground/40"
                onClick={(e) => { e.stopPropagation(); removeMutation.mutate(signup.id); }}
                disabled={isPending}
                title="Remove from session"
                data-testid={`inline-remove-${signup.id}`}
              >
                <UserMinus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 sm:hidden" />
          </div>
        </div>
      );
    }

    return (
      <div key={signup.id} className="flex items-center gap-2 py-2.5 px-1" data-testid={`player-row-${signup.id}`}>
        {playerInfo}
      </div>
    );
  };

  const renderSection = (title: string, key: string, players: any[], color: string) => {
    const isExpanded = expandedSection === key;
    return (
      <div key={key} className="border-b border-border/50 last:border-b-0">
        <button
          onClick={() => toggleSection(key)}
          className="flex items-center justify-between gap-2 w-full py-2 sm:py-3 px-1 text-left"
          data-testid={`section-toggle-${key}`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${color}`} />
            <span className="font-medium text-xs sm:text-sm">{title}</span>
            <span className="text-xs sm:text-sm text-muted-foreground">({players.length})</span>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {isExpanded && (
          <div className="pb-2 px-1">
            {players.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No players</p>
            ) : (
              <div className="space-y-0.5">
                {players.map((s: any, idx: number) => renderPlayerRow(s, key === "waiting" ? idx + 1 : undefined))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPlayerActionBar = () => {
    if (!user) return null;
    const isPending = playerStatusMutation.isPending;

    const isNotPublished = session.publishAt && new Date(session.publishAt) > new Date();
    if (isNotPublished && !isAdmin) {
      return (
        <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm font-medium truncate">Signups open {format(new Date(session.publishAt), "d MMM")}</span>
          </div>
        </div>
      );
    }
    if (isNotPublished && isAdmin) {
      return (
        <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm font-medium truncate">Signups open {format(new Date(session.publishAt), "d MMM")}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
            onClick={() => publishNowMutation.mutate()}
            disabled={publishNowMutation.isPending}
            data-testid="button-publish-now-modal"
          >
            {publishNowMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
            Publish Now
          </Button>
        </div>
      );
    }

    if (myStatus === "CONFIRMED") {
      return (
        <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-sm font-medium truncate">You're going</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => playerStatusMutation.mutate({ action: "cancel" })} disabled={isPending} data-testid="button-player-cancel">
            {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <LogOut className="h-3 w-3 mr-1" />}
            Cancel
          </Button>
        </div>
      );
    }

    if (myStatus === "WAITING") {
      return (
        <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="h-4 w-4 text-yellow-600 shrink-0" />
            <span className="text-sm font-medium truncate">On waiting list</span>
            {(() => {
              const myIdx = waiting.findIndex((s: any) => s.id === mySignup?.id);
              return myIdx >= 0 ? <Badge variant="secondary" className="text-xs">#{myIdx + 1}</Badge> : null;
            })()}
          </div>
          <Button size="sm" variant="outline" onClick={() => playerStatusMutation.mutate({ action: "decline" })} disabled={isPending} data-testid="button-player-leave-waiting">
            {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
            Leave
          </Button>
        </div>
      );
    }

    if (myStatus === "INVITED") {
      return (
        <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="text-sm font-medium truncate">You're invited</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={() => playerStatusMutation.mutate({ action: "accept" })} disabled={isPending} data-testid="button-player-accept">
              {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
              {isFull ? "Wait" : "Accept"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => playerStatusMutation.mutate({ action: "decline" })} disabled={isPending} data-testid="button-player-decline">
              {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
              No
            </Button>
          </div>
        </div>
      );
    }

    if (myStatus === "NOT_ATTENDING") {
      return (
        <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50 border border-border">
          <div className="flex items-center gap-2 min-w-0">
            <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">Not attending</span>
          </div>
          <Button size="sm" onClick={() => playerStatusMutation.mutate({ action: "accept" })} disabled={isPending} data-testid="button-player-rejoin">
            {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <LogIn className="h-3 w-3 mr-1" />}
            {isFull ? "Wait" : "Re-join"}
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/30 border border-border">
        <span className="text-sm text-muted-foreground">Not responded yet</span>
        <Button size="sm" onClick={() => playerStatusMutation.mutate({ action: "join" })} disabled={isPending} data-testid="button-player-join">
          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserPlus className="h-3 w-3 mr-1" />}
          {isFull ? "Wait" : "Join"}
        </Button>
      </div>
    );
  };

  const renderPlayerOptionsDialog = () => {
    if (!selectedPlayer) return null;
    const signup = selectedPlayer;
    const name = getPlayerName(signup);
    const grade = getPlayerGrade(signup);
    const status = signup.signupStatus;
    const isConfirmed = status === "CONFIRMED" || !status;
    const isPaid = signup.paymentStatus === "PAID";
    const playerUserId = getPlayerUserId(signup);
    const isPending = statusMutation.isPending || removeMutation.isPending || paymentMutation.isPending;

    return (
      <Dialog open={!!selectedPlayer} onOpenChange={(open) => { if (!open) setSelectedPlayer(null); }}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Player Options</DialogTitle>
            <DialogDescription className="sr-only">Manage player actions</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 pb-3 border-b border-border/50">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-sm font-medium bg-muted">{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{name}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {grade && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{grade}</Badge>}
                {isConfirmed && (
                  <Badge variant={isPaid ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                    {isPaid ? "Paid" : "Unpaid"}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {status === "WAITING" ? "Waiting" : status === "INVITED" ? "Invited" : status === "NOT_ATTENDING" ? "Not attending" : "Confirmed"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-3 pb-1">Set Status</p>
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 ${isConfirmed ? "bg-green-50 dark:bg-green-900/20" : ""}`}
              onClick={() => statusMutation.mutate({ signupId: signup.id, signupStatus: "CONFIRMED" })}
              disabled={isPending || isConfirmed}
              data-testid={`option-confirm-${signup.id}`}
            >
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Add to Session</span>
              {isConfirmed && <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">Current</Badge>}
            </Button>

            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 ${status === "WAITING" ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}`}
              onClick={() => statusMutation.mutate({ signupId: signup.id, signupStatus: "WAITING" })}
              disabled={isPending || status === "WAITING"}
              data-testid={`option-waiting-${signup.id}`}
            >
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">Add to Waiting List</span>
              {status === "WAITING" && <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">Current</Badge>}
            </Button>

            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 ${status === "INVITED" ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
              onClick={() => statusMutation.mutate({ signupId: signup.id, signupStatus: "INVITED" })}
              disabled={isPending || status === "INVITED"}
              data-testid={`option-invited-${signup.id}`}
            >
              <Mail className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Set as Invited</span>
              {status === "INVITED" && <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">Current</Badge>}
            </Button>

            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 ${status === "NOT_ATTENDING" ? "bg-muted" : ""}`}
              onClick={() => statusMutation.mutate({ signupId: signup.id, signupStatus: "NOT_ATTENDING" })}
              disabled={isPending || status === "NOT_ATTENDING"}
              data-testid={`option-decline-${signup.id}`}
            >
              <Ban className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Decline / Not Attending</span>
              {status === "NOT_ATTENDING" && <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">Current</Badge>}
            </Button>

            <div className="border-t border-border/50 my-1" />

            {isConfirmed && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => {
                  paymentMutation.mutate({
                    signupId: signup.id,
                    updates: { paymentStatus: isPaid ? "UNPAID" : "PAID" },
                  });
                  setSelectedPlayer({ ...signup, paymentStatus: isPaid ? "UNPAID" : "PAID" });
                }}
                disabled={isPending}
                data-testid={`option-payment-toggle-${signup.id}`}
              >
                <PoundSterling className={`h-4 w-4 ${isPaid ? "text-red-500" : "text-green-500"}`} />
                <span className="text-sm">{isPaid ? "Mark as unpaid" : "Mark as paid"}</span>
              </Button>
            )}

            {isConfirmed && !isPaid && playerUserId && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => {
                  openPaymentReminder(signup);
                  setSelectedPlayer(null);
                }}
                data-testid={`option-remind-payment-${signup.id}`}
              >
                <Bell className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Send payment reminder</span>
              </Button>
            )}

            {playerUserId && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => {
                  openQuickMessage(signup);
                  setSelectedPlayer(null);
                }}
                data-testid={`option-message-${signup.id}`}
              >
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Send message</span>
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive"
              onClick={() => removeMutation.mutate(signup.id)}
              disabled={isPending}
              data-testid={`option-remove-${signup.id}`}
            >
              <UserMinus className="h-4 w-4" />
              <span className="text-sm">Remove from session</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const renderPaymentReminderDialog = () => {
    if (!showPaymentReminder || !messageTarget) return null;
    return (
      <Dialog open={showPaymentReminder} onOpenChange={(open) => { if (!open) { setShowPaymentReminder(false); setMessageTarget(null); setReminderText(""); } }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-500" />
              Payment Reminder
            </DialogTitle>
            <DialogDescription>Send a payment reminder to {messageTarget.name}. You can edit the message before sending.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              className="min-h-[160px] text-sm"
              data-testid="input-reminder-message"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowPaymentReminder(false); setMessageTarget(null); setReminderText(""); }} data-testid="button-cancel-reminder">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSendReminder} disabled={!reminderText.trim() || sendMessageMutation.isPending} data-testid="button-send-reminder">
                {sendMessageMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                Send Reminder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const renderAddPlayerDialog = () => {
    if (!showAddPlayer) return null;
    const allSignupPlayerIds = new Set(allSignups.map((s: any) => s.playerId));
    const availableMembers = (clubMembers || [])
      .filter((m: any) => !allSignupPlayerIds.has(m.id))
      .filter((m: any) => {
        if (!addPlayerSearch.trim()) return true;
        const name = m.user?.fullName?.toLowerCase() || "";
        return name.includes(addPlayerSearch.toLowerCase());
      })
      .sort((a: any, b: any) => (a.user?.fullName || "").localeCompare(b.user?.fullName || ""));

    return (
      <Dialog open={showAddPlayer} onOpenChange={(open) => { if (!open) { setShowAddPlayer(false); setAddPlayerSearch(""); } }}>
        <DialogContent className="sm:max-w-[400px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add to Waiting List
            </DialogTitle>
            <DialogDescription>Select a club member to add to the waiting list</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search members..."
              value={addPlayerSearch}
              onChange={(e) => setAddPlayerSearch(e.target.value)}
              data-testid="input-search-add-player"
            />
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {availableMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {clubMembers ? "No available members found" : "Loading..."}
                </p>
              ) : (
                availableMembers.map((member: any) => (
                  <button
                    key={member.id}
                    onClick={() => addToWaitingListMutation.mutate(member.id)}
                    disabled={addToWaitingListMutation.isPending}
                    className="flex items-center gap-2 w-full p-2 rounded-md text-left hover-elevate"
                    data-testid={`button-add-member-${member.id}`}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs font-medium bg-muted">
                        {getInitials(member.user?.fullName || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block">{member.user?.fullName || "Unknown"}</span>
                      {member.grade && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{member.grade}</Badge>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const renderQuickMessageDialog = () => {
    if (!messageTarget || showPaymentReminder) return null;
    return (
      <Dialog open={!!messageTarget} onOpenChange={(open) => { if (!open) { setMessageTarget(null); setMessageText(""); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Message {messageTarget.name}
            </DialogTitle>
            <DialogDescription>Send a quick message to this player</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="min-h-[100px] text-sm"
              data-testid="input-quick-message"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setMessageTarget(null); setMessageText(""); }} data-testid="button-cancel-message">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSendMessage} disabled={!messageText.trim() || sendMessageMutation.isPending} data-testid="button-send-message">
                {sendMessageMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const drawerContent = (
    <div className="px-2 sm:px-4 pb-4 sm:pb-6 overflow-y-auto max-h-[80vh]">
      {session.bannerMessage && (
        <div className="mb-3">
          <SessionBanner
            message={session.bannerMessage}
            color={session.bannerColor}
            sessionId={session.id}
            variant="modal"
          />
        </div>
      )}
      <div className="text-center mb-2 sm:mb-3">
        <h2 className="text-base sm:text-xl font-bold" data-testid="text-session-details-title">{session.title}</h2>
        <div className="flex items-center justify-center gap-2 sm:gap-3 mt-1 sm:mt-1.5 text-[11px] sm:text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {format(new Date(session.date), "EEE, MMM d")}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {session.startTime}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {confirmed.length}/{session.maxPlayers || "~"}
          </span>
        </div>
      </div>

      {session.sessionDetails && (
        <div className="mb-3" data-testid={`session-notes-modal-${session.id}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Session Notes</span>
          </div>
          <div className="rounded-lg border-l-4 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 shadow-sm">
            <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100 whitespace-pre-line">
              {session.sessionDetails}
            </p>
          </div>
        </div>
      )}

      {Array.isArray(session.customLinks) && session.customLinks.length > 0 && (
        <div className="mb-3">
          <UsefulLinks links={session.customLinks} sessionId={session.id} />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {renderResponseSummary()}
          {renderPlayerActionBar()}
          <div className="mt-2">
            {renderSection("Secured · payment confirmed", "confirmed-secured", confirmedSecured, "bg-emerald-500")}
            {renderSection("Provisional · awaiting payment", "confirmed-provisional", confirmedProvisional, "bg-amber-500")}
            {renderSection("Waiting", "waiting", waiting, "bg-yellow-500")}
            {renderSection("Invited", "invited", invited, "bg-blue-500")}
            {renderSection("Not attending", "notAttending", notAttending, "bg-muted-foreground")}
          </div>

          {isAdmin && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowAddPlayer(true)}
                data-testid="button-open-add-player"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Add player to waiting list
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{session.title}</DrawerTitle>
            <DrawerDescription>Session details and player responses</DrawerDescription>
          </DrawerHeader>
          {drawerContent}
        </DrawerContent>
      </Drawer>
      {renderPlayerOptionsDialog()}
      {renderQuickMessageDialog()}
      {renderPaymentReminderDialog()}
      {renderAddPlayerDialog()}
    </>
  );
}

interface SessionFinanceModalProps {
  session: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionFinanceModal({ session, open, onOpenChange }: SessionFinanceModalProps) {
  const { toast } = useToast();

  const { data: manageData, isLoading } = useQuery<any>({
    queryKey: ["/api/sessions", session.id, "manage-players"],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${session.id}/manage-players`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: open,
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ signupId, updates }: { signupId: number; updates: any }) => {
      await apiRequest("PATCH", `/api/sessions/${session.id}/signups/${signupId}/payment-override`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "manage-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "signups"] });
      toast({ title: "Payment updated" });
    },
  });

  const confirmed = manageData?.confirmed || [];
  const summary = manageData?.summary;

  const getPlayerName = (signup: any) => {
    if (signup.player?.user?.fullName) return signup.player.user.fullName;
    if (signup.playerProfile?.user?.fullName) return signup.playerProfile.user.fullName;
    if (signup.fullName) return signup.fullName;
    return `Player #${signup.playerId}`;
  };

  const togglePaymentStatus = (signup: any) => {
    const newStatus = signup.paymentStatus === "PAID" ? "UNPAID" : "PAID";
    paymentMutation.mutate({ signupId: signup.id, updates: { paymentStatus: newStatus } });
  };

  const updatePaymentMethod = (signupId: number, method: string) => {
    paymentMutation.mutate({ signupId, updates: { paymentMethod: method } });
  };

  const updatePaymentNotes = (signupId: number, notes: string) => {
    paymentMutation.mutate({ signupId, updates: { paymentNotes: notes } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-finance-title">
            <PoundSterling className="h-5 w-5" />
            Session Finances - {session.title}
          </DialogTitle>
          <DialogDescription>
            {format(new Date(session.date), "EEE, MMM d, yyyy")} at {session.startTime}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-green-600" data-testid="text-finance-paid">{summary.paid}</div>
                    <div className="text-xs text-muted-foreground">Paid</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-red-600" data-testid="text-finance-unpaid">{summary.unpaid}</div>
                    <div className="text-xs text-muted-foreground">Unpaid</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold" data-testid="text-finance-total-attendees">{summary.totalAttendees}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold" data-testid="text-finance-revenue">
                      {summary.totalRevenue != null ? `£${(summary.totalRevenue / 100).toFixed(2)}` : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="space-y-3">
              {confirmed.map((signup: any) => (
                <Card key={signup.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{getInitials(getPlayerName(signup))}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm truncate" data-testid={`text-finance-player-${signup.id}`}>{getPlayerName(signup)}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant={signup.paymentStatus === "PAID" ? "default" : "outline"}
                          onClick={() => togglePaymentStatus(signup)}
                          disabled={paymentMutation.isPending}
                          data-testid={`button-toggle-payment-${signup.id}`}
                        >
                          {signup.paymentStatus === "PAID" ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Paid</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Unpaid</>
                          )}
                        </Button>
                        <Select
                          value={signup.paymentMethod || ""}
                          onValueChange={(val) => updatePaymentMethod(signup.id, val)}
                        >
                          <SelectTrigger className="w-[110px]" data-testid={`select-payment-method-${signup.id}`}>
                            <SelectValue placeholder="Method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Online">Online</SelectItem>
                            <SelectItem value="Card">Card</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Membership Credit">Membership</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Input
                        placeholder="Payment notes..."
                        defaultValue={signup.paymentNotes || ""}
                        onBlur={(e) => {
                          if (e.target.value !== (signup.paymentNotes || "")) {
                            updatePaymentNotes(signup.id, e.target.value);
                          }
                        }}
                        className="text-sm"
                        data-testid={`input-payment-notes-${signup.id}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
