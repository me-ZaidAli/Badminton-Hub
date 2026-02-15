import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, Clock, CheckCircle, XCircle, Mail, UserMinus, ArrowUp, PoundSterling, Loader2, LogIn, LogOut, UserPlus } from "lucide-react";
import { format } from "date-fns";

interface SessionDetailsModalProps {
  session: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}

export function SessionDetailsModal({ session, open, onOpenChange, isAdmin }: SessionDetailsModalProps) {
  const { toast } = useToast();
  const { data: user } = useUser();
  const [activeTab, setActiveTab] = useState("confirmed");

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

  const statusMutation = useMutation({
    mutationFn: async ({ signupId, signupStatus }: { signupId: number; signupStatus: string }) => {
      await apiRequest("PATCH", `/api/sessions/${session.id}/signups/${signupId}/status`, { signupStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "manage-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "signups"] });
      toast({ title: "Player status updated" });
    },
  });

  const playerStatusMutation = useMutation({
    mutationFn: async ({ action }: { action: string }) => {
      const res = await apiRequest("POST", `/api/sessions/${session.id}/player-status`, { action });
      try {
        return await res.json();
      } catch {
        return {};
      }
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

  const allSignups = isAdmin ? [
    ...(manageData?.confirmed || []),
    ...(manageData?.waiting || []),
    ...(manageData?.invited || []),
    ...(manageData?.notAttending || []),
    ...(manageData?.cancelled || []),
  ] : (signups || []);

  const confirmed = isAdmin ? (manageData?.confirmed || []) : (signups?.filter((s: any) => !s.signupStatus || s.signupStatus === "CONFIRMED") || []);
  const waiting = isAdmin ? (manageData?.waiting || []) : (signups?.filter((s: any) => s.signupStatus === "WAITING") || []);
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

  const renderPlayerRow = (signup: any, showActions: boolean) => (
    <div key={signup.id} className="py-2 px-3 rounded-md border border-border/50">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate text-sm" data-testid={`text-player-name-${signup.id}`}>{getPlayerName(signup)}</span>
          {getPlayerGrade(signup) && (
            <Badge variant="outline" className="text-xs shrink-0">{getPlayerGrade(signup)}</Badge>
          )}
          {signup.signupStatus === "WAITING" && signup.waitingListPosition && (
            <Badge variant="secondary" className="text-xs shrink-0">#{signup.waitingListPosition}</Badge>
          )}
          {getPlayerUserId(signup) === user?.id && (
            <Badge variant="secondary" className="text-xs shrink-0">You</Badge>
          )}
        </div>
      </div>
      {showActions && isAdmin && (
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {signup.signupStatus === "WAITING" && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => statusMutation.mutate({ signupId: signup.id, signupStatus: "CONFIRMED" })}
                disabled={statusMutation.isPending}
                data-testid={`button-promote-${signup.id}`}
              >
                <ArrowUp className="h-3 w-3 mr-1" />
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => statusMutation.mutate({ signupId: signup.id, signupStatus: "INVITED" })}
                disabled={statusMutation.isPending}
                data-testid={`button-invite-waiting-${signup.id}`}
              >
                <Mail className="h-3 w-3 mr-1" />
                Invite
              </Button>
            </>
          )}
          {signup.signupStatus === "INVITED" && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => statusMutation.mutate({ signupId: signup.id, signupStatus: "CONFIRMED" })}
                disabled={statusMutation.isPending}
                data-testid={`button-confirm-invited-${signup.id}`}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => statusMutation.mutate({ signupId: signup.id, signupStatus: "NOT_ATTENDING" })}
                disabled={statusMutation.isPending}
                data-testid={`button-decline-invited-${signup.id}`}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Decline
              </Button>
            </>
          )}
          {(signup.signupStatus === "CONFIRMED" || !signup.signupStatus) && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => statusMutation.mutate({ signupId: signup.id, signupStatus: "WAITING" })}
                disabled={statusMutation.isPending}
                data-testid={`button-to-waiting-${signup.id}`}
              >
                <Clock className="h-3 w-3 mr-1" />
                Wait
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => statusMutation.mutate({ signupId: signup.id, signupStatus: "INVITED" })}
                disabled={statusMutation.isPending}
                data-testid={`button-invite-confirmed-${signup.id}`}
              >
                <Mail className="h-3 w-3 mr-1" />
                Invite
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => statusMutation.mutate({ signupId: signup.id, signupStatus: "NOT_ATTENDING" })}
                disabled={statusMutation.isPending}
                data-testid={`button-not-attending-${signup.id}`}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Out
              </Button>
            </>
          )}
          {signup.signupStatus === "NOT_ATTENDING" && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => statusMutation.mutate({ signupId: signup.id, signupStatus: "CONFIRMED" })}
                disabled={statusMutation.isPending}
                data-testid={`button-reconfirm-${signup.id}`}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => statusMutation.mutate({ signupId: signup.id, signupStatus: "INVITED" })}
                disabled={statusMutation.isPending}
                data-testid={`button-reinvite-${signup.id}`}
              >
                <Mail className="h-3 w-3 mr-1" />
                Invite
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );

  const renderPlayerActionBar = () => {
    if (!user) return null;
    const isPending = playerStatusMutation.isPending;

    if (myStatus === "CONFIRMED") {
      return (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">You are confirmed for this session</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => playerStatusMutation.mutate({ action: "cancel" })}
                disabled={isPending}
                data-testid="button-player-cancel"
              >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <LogOut className="h-3 w-3 mr-1" />}
                Cancel Attendance
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (myStatus === "WAITING") {
      return (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">You are on the waiting list</span>
                {mySignup?.waitingListPosition && (
                  <Badge variant="secondary" className="text-xs">Position #{mySignup.waitingListPosition}</Badge>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => playerStatusMutation.mutate({ action: "decline" })}
                disabled={isPending}
                data-testid="button-player-leave-waiting"
              >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                Leave Waiting List
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (myStatus === "INVITED") {
      return (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">You have been invited</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => playerStatusMutation.mutate({ action: "accept" })}
                  disabled={isPending}
                  data-testid="button-player-accept"
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                  {isFull ? "Join Waiting List" : "Accept"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => playerStatusMutation.mutate({ action: "decline" })}
                  disabled={isPending}
                  data-testid="button-player-decline"
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                  Decline
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (myStatus === "NOT_ATTENDING") {
      return (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">You are not attending</span>
              </div>
              <Button
                size="sm"
                onClick={() => playerStatusMutation.mutate({ action: "accept" })}
                disabled={isPending}
                data-testid="button-player-rejoin"
              >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <LogIn className="h-3 w-3 mr-1" />}
                {isFull ? "Join Waiting List" : "Re-join Session"}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">You have not responded to this session yet</span>
            <Button
              size="sm"
              onClick={() => playerStatusMutation.mutate({ action: "join" })}
              disabled={isPending}
              data-testid="button-player-join"
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserPlus className="h-3 w-3 mr-1" />}
              {isFull ? "Join Waiting List" : "Join Session"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl" data-testid="text-session-details-title">
            {session.title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
              <span>{format(new Date(session.date), "EEE, MMM d, yyyy")}</span>
              <span className="hidden sm:inline">&middot;</span>
              <span>{session.startTime}</span>
              <span className="hidden sm:inline">&middot;</span>
              <span>{confirmed.length}/{session.maxPlayers || "~"} confirmed</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {renderPlayerActionBar()}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
                <TabsTrigger value="confirmed" className="text-xs px-2" data-testid="tab-confirmed">
                  In ({confirmed.length})
                </TabsTrigger>
                <TabsTrigger value="waiting" className="text-xs px-2" data-testid="tab-waiting">
                  Wait ({waiting.length})
                </TabsTrigger>
                <TabsTrigger value="invited" className="text-xs px-2" data-testid="tab-invited">
                  Invited ({invited.length})
                </TabsTrigger>
                <TabsTrigger value="notAttending" className="text-xs px-2" data-testid="tab-not-attending">
                  Out ({notAttending.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="confirmed" className="space-y-2 mt-4">
                {confirmed.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No confirmed players yet</p>
                ) : (
                  confirmed.map((s: any) => renderPlayerRow(s, true))
                )}
              </TabsContent>

              <TabsContent value="waiting" className="space-y-2 mt-4">
                {waiting.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No players on waiting list</p>
                ) : (
                  waiting.map((s: any) => renderPlayerRow(s, true))
                )}
              </TabsContent>

              <TabsContent value="invited" className="space-y-2 mt-4">
                {invited.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No invited players</p>
                ) : (
                  invited.map((s: any) => renderPlayerRow(s, true))
                )}
              </TabsContent>

              <TabsContent value="notAttending" className="space-y-2 mt-4">
                {notAttending.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No players marked as not attending</p>
                ) : (
                  notAttending.map((s: any) => renderPlayerRow(s, true))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
                    <div className="text-2xl font-bold text-green-600" data-testid="text-finance-collected">
                      £{((summary.totalCollected || 0) / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">Collected</div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Confirmed Players</h4>
              {confirmed.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No confirmed players</p>
              ) : (
                confirmed.map((signup: any) => (
                  <FinancePlayerRow
                    key={signup.id}
                    signup={signup}
                    playerName={getPlayerName(signup)}
                    onTogglePayment={() => togglePaymentStatus(signup)}
                    onUpdateMethod={(method) => updatePaymentMethod(signup.id, method)}
                    onUpdateNotes={(notes) => updatePaymentNotes(signup.id, notes)}
                    isPending={paymentMutation.isPending}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FinancePlayerRow({
  signup,
  playerName,
  onTogglePayment,
  onUpdateMethod,
  onUpdateNotes,
  isPending,
}: {
  signup: any;
  playerName: string;
  onTogglePayment: () => void;
  onUpdateMethod: (method: string) => void;
  onUpdateNotes: (notes: string) => void;
  isPending: boolean;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(signup.paymentNotes || "");

  return (
    <div className="border border-border/50 rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate" data-testid={`text-finance-player-${signup.id}`}>{playerName}</span>
          <Badge variant="outline" className="text-xs shrink-0">
            £{((signup.fee || 0) / 100).toFixed(2)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant={signup.paymentStatus === "PAID" ? "default" : "outline"}
            onClick={onTogglePayment}
            disabled={isPending}
            data-testid={`button-toggle-payment-${signup.id}`}
          >
            {signup.paymentStatus === "PAID" ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Paid</>
            ) : (
              <><XCircle className="h-3 w-3 mr-1" /> Unpaid</>
            )}
          </Button>
          <Select
            value={signup.paymentMethod || "NONE"}
            onValueChange={onUpdateMethod}
          >
            <SelectTrigger className="w-[120px]" data-testid={`select-payment-method-${signup.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">No Method</SelectItem>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="ONLINE">Online</SelectItem>
              <SelectItem value="CARD">Card</SelectItem>
              <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
              <SelectItem value="MEMBERSHIP_CREDIT">Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="text-xs"
          onClick={() => setShowNotes(!showNotes)}
          data-testid={`button-toggle-notes-${signup.id}`}
        >
          {signup.paymentNotes ? "Edit Note" : "Add Note"}
        </Button>
        {signup.paymentNotes && !showNotes && (
          <span className="text-xs text-muted-foreground truncate">{signup.paymentNotes}</span>
        )}
      </div>
      {showNotes && (
        <div className="flex gap-2">
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment notes..."
            className="text-sm"
            data-testid={`input-payment-notes-${signup.id}`}
          />
          <Button
            size="sm"
            onClick={() => { onUpdateNotes(notes); setShowNotes(false); }}
            disabled={isPending}
            data-testid={`button-save-notes-${signup.id}`}
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
