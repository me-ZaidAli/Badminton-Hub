import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Flag, VolumeX, Lock, ScrollText, Loader2, Shield, AlertTriangle,
  CheckCircle, XCircle, Users,
} from "lucide-react";
import { format } from "date-fns";

interface ModerationData {
  reports: {
    id: number;
    messageId: number;
    reporterId: number;
    reason: string;
    status: string;
    createdAt: string;
    reporterName: string;
    messageBody: string;
    messageSenderId: number;
    chatId: number;
  }[];
  mutedUsers: {
    memberId: number;
    userId: number;
    chatId: number;
    isMuted: boolean;
    mutedUntil: string | null;
    muteReason: string | null;
    userName: string;
    chatName: string;
  }[];
  lockedChats: {
    id: number;
    name: string;
    type: string;
    isLocked: boolean;
    createdAt: string;
  }[];
  auditLogs: {
    id: number;
    chatId: number;
    actorId: number;
    action: string;
    reason: string | null;
    metadata: any;
    createdAt: string;
    actorName: string;
    chatName: string;
  }[];
}

export default function ChatModeration() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolveReportId, setResolveReportId] = useState<number | null>(null);
  const [resolution, setResolution] = useState("");

  const { data: modData, isLoading } = useQuery<ModerationData>({
    queryKey: ["/api/chats/moderation/queue"],
    enabled: !!user && (user.role === "OWNER" || user.role === "ADMIN"),
    refetchInterval: 15000,
  });

  const resolveReportMutation = useMutation({
    mutationFn: async (data: { id: number; status: string; resolution: string }) => {
      await apiRequest("PATCH", `/api/chats/moderation/reports/${data.id}`, { status: data.status, resolution: data.resolution });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats/moderation/queue"] });
      setResolveDialogOpen(false);
      setResolution("");
      toast({ title: "Report resolved" });
    },
  });

  const unlockChatMutation = useMutation({
    mutationFn: async (chatId: number) => {
      await apiRequest("PATCH", `/api/chats/${chatId}/lock`, { locked: false, reason: "Unlocked by admin" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats/moderation/queue"] });
      toast({ title: "Chat unlocked" });
    },
  });

  const unmuteMutation = useMutation({
    mutationFn: async (data: { chatId: number; userId: number }) => {
      await apiRequest("PATCH", `/api/chats/${data.chatId}/mute/${data.userId}`, { muted: false, reason: "Unmuted by admin" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats/moderation/queue"] });
      toast({ title: "User unmuted" });
    },
  });

  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const reports = modData?.reports || [];
  const mutedUsers = modData?.mutedUsers || [];
  const lockedChats = modData?.lockedChats || [];
  const auditLogs = modData?.auditLogs || [];

  return (
    <div className="space-y-4" data-testid="chat-moderation-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-moderation-title">Chat Moderation</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {reports.length > 0 && (
            <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-open-reports">
              {reports.length} open reports
            </Badge>
          )}
          {mutedUsers.length > 0 && (
            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
              {mutedUsers.length} muted users
            </Badge>
          )}
          {lockedChats.length > 0 && (
            <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
              {lockedChats.length} locked chats
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList data-testid="moderation-tabs">
          <TabsTrigger value="reports" className="gap-1.5" data-testid="tab-reports">
            <Flag className="h-4 w-4" />Reports ({reports.length})
          </TabsTrigger>
          <TabsTrigger value="muted" className="gap-1.5" data-testid="tab-muted">
            <VolumeX className="h-4 w-4" />Muted ({mutedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="locked" className="gap-1.5" data-testid="tab-locked">
            <Lock className="h-4 w-4" />Locked ({lockedChats.length})
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5" data-testid="tab-audit">
            <ScrollText className="h-4 w-4" />Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-3">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No open reports</p>
              </CardContent>
            </Card>
          ) : (
            reports.map(report => (
              <Card key={report.id} data-testid={`report-item-${report.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate">
                          <AlertTriangle className="h-3 w-3 mr-1" />Reported
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(report.createdAt), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm"><span className="font-medium">Reported by:</span> {report.reporterName}</p>
                      <p className="text-sm"><span className="font-medium">Reason:</span> {report.reason}</p>
                      <div className="p-2 bg-muted rounded-md mt-2">
                        <p className="text-sm text-muted-foreground italic">"{report.messageBody}"</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setResolveReportId(report.id); setResolveDialogOpen(true); }}
                        data-testid={`button-resolve-report-${report.id}`}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => resolveReportMutation.mutate({ id: report.id, status: "DISMISSED", resolution: "Dismissed by admin" })}
                        data-testid={`button-dismiss-report-${report.id}`}
                      >
                        <XCircle className="h-3 w-3 mr-1" />Dismiss
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="muted" className="space-y-3">
          {mutedUsers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No muted users</p>
              </CardContent>
            </Card>
          ) : (
            mutedUsers.map(mu => (
              <Card key={mu.memberId} data-testid={`muted-user-${mu.userId}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{mu.userName}</p>
                      <p className="text-xs text-muted-foreground">Chat: {mu.chatName}</p>
                      {mu.muteReason && <p className="text-xs text-muted-foreground">Reason: {mu.muteReason}</p>}
                      {mu.mutedUntil && (
                        <p className="text-xs text-muted-foreground">Until: {format(new Date(mu.mutedUntil), "MMM d, yyyy h:mm a")}</p>
                      )}
                      {!mu.mutedUntil && <Badge variant="destructive" className="text-[9px] no-default-hover-elevate no-default-active-elevate">Permanent</Badge>}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unmuteMutation.mutate({ chatId: mu.chatId, userId: mu.userId })}
                      data-testid={`button-unmute-${mu.userId}`}
                    >
                      <VolumeX className="h-3 w-3 mr-1" />Unmute
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="locked" className="space-y-3">
          {lockedChats.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No locked chats</p>
              </CardContent>
            </Card>
          ) : (
            lockedChats.map(chat => (
              <Card key={chat.id} data-testid={`locked-chat-${chat.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{chat.name}</p>
                        <Badge variant="outline" className="text-[9px] no-default-hover-elevate no-default-active-elevate">{chat.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created: {format(new Date(chat.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unlockChatMutation.mutate(chat.id)}
                      data-testid={`button-unlock-chat-${chat.id}`}
                    >
                      <Lock className="h-3 w-3 mr-1" />Unlock
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-2">
          {auditLogs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <ScrollText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No audit logs yet</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-2">
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {auditLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 p-2 border-b last:border-0" data-testid={`audit-log-${log.id}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[9px] no-default-hover-elevate no-default-active-elevate">{log.action}</Badge>
                          <span className="text-xs text-muted-foreground">{format(new Date(log.createdAt), "MMM d, h:mm a")}</span>
                        </div>
                        <p className="text-xs mt-0.5">
                          <span className="font-medium">{log.actorName}</span> in <span className="font-medium">{log.chatName}</span>
                        </p>
                        {log.reason && <p className="text-xs text-muted-foreground">Reason: {log.reason}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="dialog-resolve-report">
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
            <DialogDescription>How was this report resolved?</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Resolution details..."
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            data-testid="input-resolution"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => resolveReportId && resolveReportMutation.mutate({ id: resolveReportId, status: "RESOLVED", resolution })}
              disabled={!resolution.trim() || resolveReportMutation.isPending}
              data-testid="button-confirm-resolve"
            >
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
