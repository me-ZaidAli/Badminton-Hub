import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, Clock, CheckCircle, XCircle, Mail, UserMinus, ArrowUp, PoundSterling, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface SessionDetailsModalProps {
  session: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}

export function SessionDetailsModal({ session, open, onOpenChange, isAdmin }: SessionDetailsModalProps) {
  const { toast } = useToast();
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

  const confirmed = isAdmin ? (manageData?.confirmed || []) : (signups?.filter((s: any) => !s.signupStatus || s.signupStatus === "CONFIRMED") || []);
  const waiting = isAdmin ? (manageData?.waiting || []) : (signups?.filter((s: any) => s.signupStatus === "WAITING") || []);
  const invited = isAdmin ? (manageData?.invited || []) : (signups?.filter((s: any) => s.signupStatus === "INVITED") || []);
  const notAttending = isAdmin ? (manageData?.notAttending || []) : (signups?.filter((s: any) => s.signupStatus === "NOT_ATTENDING") || []);

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
    <div key={signup.id} className="flex items-center justify-between py-2 px-3 rounded-md border border-border/50 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium truncate" data-testid={`text-player-name-${signup.id}`}>{getPlayerName(signup)}</span>
        {getPlayerGrade(signup) && (
          <Badge variant="outline" className="text-xs shrink-0">{getPlayerGrade(signup)}</Badge>
        )}
        {signup.signupStatus === "WAITING" && signup.waitingListPosition && (
          <Badge variant="secondary" className="text-xs shrink-0">#{signup.waitingListPosition}</Badge>
        )}
      </div>
      {showActions && isAdmin && (
        <div className="flex items-center gap-1 shrink-0">
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-session-details-title">
            {session.title}
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{format(new Date(session.date), "EEE, MMM d, yyyy")}</span>
            <span>{session.startTime}</span>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 gap-1">
              <TabsTrigger value="confirmed" className="text-xs" data-testid="tab-confirmed">
                Confirmed ({confirmed.length})
              </TabsTrigger>
              <TabsTrigger value="waiting" className="text-xs" data-testid="tab-waiting">
                Waiting ({waiting.length})
              </TabsTrigger>
              <TabsTrigger value="invited" className="text-xs" data-testid="tab-invited">
                Invited ({invited.length})
              </TabsTrigger>
              <TabsTrigger value="notAttending" className="text-xs" data-testid="tab-not-attending">
                Not Going ({notAttending.length})
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
          <div className="text-sm text-muted-foreground">
            {format(new Date(session.date), "EEE, MMM d, yyyy")} at {session.startTime}
          </div>
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