import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GraduationCap, Calendar, Clock, MapPin, User, MessageSquare, Check, X, Loader2, BookOpen } from "lucide-react";

interface LessonRequest {
  id: number;
  playerId: number;
  coachId: number;
  status: string;
  lessonType: string;
  preferredDate: string;
  preferredTime: string;
  durationMinutes: number;
  location: string | null;
  playerMessage: string | null;
  coachResponse: string | null;
  agreedPrice: number | null;
  createdAt: string;
  updatedAt: string;
  coach?: { fullName: string; email: string; phone?: string; city?: string; sessionPrices?: string };
  player?: { id: number; fullName: string; email: string };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  ACCEPTED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  DECLINED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || ""}`} data-testid={`badge-status-${status}`}>
      {status}
    </span>
  );
}

function PlayerLessonsView() {
  const { data: requests, isLoading, isError } = useQuery<LessonRequest[]>({
    queryKey: ["/api/lesson-requests/my"],
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/lesson-requests/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request cancelled" });
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-requests/my"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to cancel", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>;
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-error-requests">
          <p className="font-medium">Failed to load lesson requests</p>
          <p className="text-sm mt-1">Please try refreshing the page.</p>
        </CardContent>
      </Card>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-requests">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No lesson requests yet</p>
          <p className="text-sm mt-1">Visit the Coach Finder to browse coaches and request a lesson.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3" data-testid="list-player-lessons">
      {requests.map((req) => (
        <Card key={req.id} data-testid={`card-lesson-${req.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold" data-testid={`text-coach-name-${req.id}`}>
                    <GraduationCap className="w-4 h-4 inline mr-1" />
                    {req.coach?.fullName || "Coach"}
                  </h3>
                  <StatusBadge status={req.status} />
                  <Badge variant="outline" className="text-xs">
                    {req.lessonType === "ONE_TO_ONE" ? "Private" : "Group"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {req.preferredDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {req.preferredTime} ({req.durationMinutes}min)
                  </span>
                  {req.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {req.location}
                    </span>
                  )}
                </div>
                {req.playerMessage && (
                  <p className="text-sm mt-2 text-muted-foreground" data-testid={`text-player-message-${req.id}`}>
                    <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                    {req.playerMessage}
                  </p>
                )}
                {req.coachResponse && (
                  <p className="text-sm mt-1 text-foreground bg-muted/50 rounded px-2 py-1" data-testid={`text-coach-response-${req.id}`}>
                    <strong>Coach:</strong> {req.coachResponse}
                  </p>
                )}
                {req.agreedPrice != null && (
                  <p className="text-sm mt-1 font-medium" data-testid={`text-agreed-price-${req.id}`}>
                    Agreed price: £{(req.agreedPrice / 100).toFixed(2)}
                  </p>
                )}
              </div>
              {req.status === "PENDING" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelMutation.mutate(req.id)}
                  disabled={cancelMutation.isPending}
                  data-testid={`button-cancel-${req.id}`}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CoachLessonsView() {
  const { data: requests, isLoading, isError } = useQuery<LessonRequest[]>({
    queryKey: ["/api/lesson-requests/coach"],
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [respondDialog, setRespondDialog] = useState<LessonRequest | null>(null);
  const [coachResponse, setCoachResponse] = useState("");
  const [agreedPrice, setAgreedPrice] = useState("");

  const respondMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/lesson-requests/${id}/respond`, {
        status,
        coachResponse: coachResponse || null,
        agreedPrice: agreedPrice ? Math.round(parseFloat(agreedPrice) * 100) : null,
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({ title: variables.status === "ACCEPTED" ? "Lesson accepted" : "Lesson declined" });
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-requests/coach"] });
      setRespondDialog(null);
      setCoachResponse("");
      setAgreedPrice("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to respond", description: err.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/lesson-requests/${id}/complete`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Lesson marked as completed" });
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-requests/coach"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to complete", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>;
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p className="font-medium">Failed to load lesson requests</p>
          <p className="text-sm mt-1">Please try refreshing the page.</p>
        </CardContent>
      </Card>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-coach-requests">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No lesson requests received</p>
          <p className="text-sm mt-1">When players request lessons with you, they will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3" data-testid="list-coach-lessons">
        {requests.map((req) => (
          <Card key={req.id} data-testid={`card-coach-lesson-${req.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold" data-testid={`text-player-name-${req.id}`}>
                      <User className="w-4 h-4 inline mr-1" />
                      {req.player?.fullName || "Player"}
                    </h3>
                    <StatusBadge status={req.status} />
                    <Badge variant="outline" className="text-xs">
                      {req.lessonType === "ONE_TO_ONE" ? "Private" : "Group"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {req.preferredDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {req.preferredTime} ({req.durationMinutes}min)
                    </span>
                    {req.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {req.location}
                      </span>
                    )}
                  </div>
                  {req.playerMessage && (
                    <p className="text-sm mt-2 bg-muted/50 rounded px-2 py-1" data-testid={`text-player-msg-${req.id}`}>
                      <strong>Player:</strong> {req.playerMessage}
                    </p>
                  )}
                  {req.coachResponse && (
                    <p className="text-sm mt-1 text-muted-foreground" data-testid={`text-coach-resp-${req.id}`}>
                      <strong>Your response:</strong> {req.coachResponse}
                    </p>
                  )}
                  {req.agreedPrice != null && (
                    <p className="text-sm mt-1 font-medium">
                      Agreed price: £{(req.agreedPrice / 100).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {req.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          setRespondDialog(req);
                          setCoachResponse("");
                          setAgreedPrice("");
                        }}
                        data-testid={`button-accept-${req.id}`}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Respond
                      </Button>
                    </>
                  )}
                  {req.status === "ACCEPTED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => completeMutation.mutate(req.id)}
                      disabled={completeMutation.isPending}
                      data-testid={`button-complete-${req.id}`}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!respondDialog} onOpenChange={(v) => { if (!v) setRespondDialog(null); }}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-respond-lesson">
          <DialogHeader>
            <DialogTitle>Respond to Lesson Request</DialogTitle>
          </DialogHeader>
          {respondDialog && (
            <div className="space-y-4 mt-2">
              <div className="text-sm space-y-1">
                <p><strong>Player:</strong> {respondDialog.player?.fullName}</p>
                <p><strong>Date:</strong> {respondDialog.preferredDate} at {respondDialog.preferredTime}</p>
                <p><strong>Duration:</strong> {respondDialog.durationMinutes} minutes</p>
                <p><strong>Type:</strong> {respondDialog.lessonType === "ONE_TO_ONE" ? "Private" : "Group"}</p>
                {respondDialog.location && <p><strong>Location:</strong> {respondDialog.location}</p>}
                {respondDialog.playerMessage && <p><strong>Message:</strong> {respondDialog.playerMessage}</p>}
              </div>
              <div>
                <Label>Your Response Message</Label>
                <Textarea
                  placeholder="Add a message for the player..."
                  value={coachResponse}
                  onChange={(e) => setCoachResponse(e.target.value)}
                  rows={3}
                  data-testid="input-coach-response"
                />
              </div>
              <div>
                <Label>Agreed Price (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 25.00"
                  value={agreedPrice}
                  onChange={(e) => setAgreedPrice(e.target.value)}
                  data-testid="input-agreed-price"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => respondMutation.mutate({ id: respondDialog.id, status: "ACCEPTED" })}
                  disabled={respondMutation.isPending}
                  data-testid="button-confirm-accept"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Accept
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => respondMutation.mutate({ id: respondDialog.id, status: "DECLINED" })}
                  disabled={respondMutation.isPending}
                  data-testid="button-confirm-decline"
                >
                  <X className="w-4 h-4 mr-1" />
                  Decline
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function MyLessons() {
  const { data: coachRequests } = useQuery<LessonRequest[]>({
    queryKey: ["/api/lesson-requests/coach"],
  });

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="My Lessons"
        description="Manage your private lesson requests"
        icon={<GraduationCap className="w-7 h-7 text-primary" />}
      />

      <Tabs defaultValue="player" className="w-full">
        <TabsList className="w-full" data-testid="tabs-lessons">
          <TabsTrigger value="player" className="flex-1" data-testid="tab-my-requests">My Requests</TabsTrigger>
          <TabsTrigger value="coach" className="flex-1" data-testid="tab-coach-requests">
            Coach Inbox
            {coachRequests && coachRequests.filter(r => r.status === "PENDING").length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] text-xs">
                {coachRequests.filter(r => r.status === "PENDING").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="player" className="mt-4">
          <PlayerLessonsView />
        </TabsContent>
        <TabsContent value="coach" className="mt-4">
          <CoachLessonsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
