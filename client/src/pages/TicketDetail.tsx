import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Loader2, ShieldAlert, Clock, User, MessageSquare,
  AlertCircle, Send, FileText, History, StickyNote, ArrowRight,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  UNDER_REVIEW: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  RESPONDED: "bg-green-500/10 text-green-700 dark:text-green-400",
  AWAITING_USER: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  RESOLVED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  CLOSED: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  MEDIUM: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  HIGH: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  URGENT: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const STATUS_OPTIONS = ["SUBMITTED", "UNDER_REVIEW", "RESPONDED", "AWAITING_USER", "RESOLVED", "CLOSED"] as const;

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={`text-[10px] ${STATUS_COLORS[status] || ""}`} data-testid={`badge-status-${status}`}>
      {formatStatus(status)}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant="secondary" className={`text-[10px] ${PRIORITY_COLORS[priority] || ""}`} data-testid={`badge-priority-${priority}`}>
      {priority}
    </Badge>
  );
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const ticketId = parseInt(id!, 10);
  const [, navigate] = useLocation();
  const { data: user } = useUser();
  const { toast } = useToast();

  const isAdmin = user?.role === "OWNER" || (user?.playerProfiles || []).some((p: any) => p.clubRole === "ADMIN" || p.clubRole === "OWNER");

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/tickets", ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${ticketId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load ticket");
      return res.json();
    },
    enabled: !isNaN(ticketId),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-lg font-semibold">Ticket Not Found</span>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Unable to load ticket</p>
            <p className="text-sm mt-1">{(error as Error)?.message || "Ticket not found."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { replies, auditLogs, internalNotes, creatorName, assigneeName, ...ticket } = data;

  return (
    <div className="space-y-6">
      <TicketHeader
        ticket={ticket}
        creatorName={creatorName}
        assigneeName={assigneeName}
        isAdmin={isAdmin}
        ticketId={ticketId}
        onBack={() => navigate("/tickets")}
      />

      <Card>
        <CardContent className="p-4">
          <div className="text-sm whitespace-pre-wrap" data-testid="text-ticket-description">
            {ticket.description}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="conversation">
        <TabsList data-testid="tabs-ticket-detail">
          <TabsTrigger value="conversation" data-testid="tab-conversation">
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Conversation
          </TabsTrigger>
          <TabsTrigger value="timeline" data-testid="tab-timeline">
            <History className="h-3.5 w-3.5 mr-1.5" /> Timeline
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="notes" data-testid="tab-notes">
              <StickyNote className="h-3.5 w-3.5 mr-1.5" /> Internal Notes
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="conversation">
          <ConversationTab replies={replies || []} ticketId={ticketId} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineTab auditLogs={auditLogs || []} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="notes">
            <InternalNotesTab notes={internalNotes || []} ticketId={ticketId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function TicketHeader({
  ticket,
  creatorName,
  assigneeName,
  isAdmin,
  ticketId,
  onBack,
}: {
  ticket: any;
  creatorName: string;
  assigneeName: string | null;
  isAdmin: boolean;
  ticketId: number;
  onBack: () => void;
}) {
  const { toast } = useToast();

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest("PATCH", `/api/tickets/${ticketId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      toast({ title: "Status Updated", description: "Ticket status has been changed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update status", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono text-muted-foreground" data-testid="text-ticket-number">
              #{ticket.ticketNumber}
            </span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            {ticket.category && (
              <Badge variant="outline" className="text-[10px]" data-testid="badge-category">{ticket.category.replace(/_/g, " ")}</Badge>
            )}
            {ticket.isConfidential && (
              <ShieldAlert className="h-4 w-4 text-red-500" data-testid="icon-confidential" />
            )}
          </div>
          <h1 className="text-xl font-bold mt-1 truncate" data-testid="text-ticket-subject">
            {ticket.subject}
          </h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" /> {creatorName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </span>
            {assigneeName && (
              <span className="flex items-center gap-1" data-testid="text-assignee">
                Assigned to: <span className="font-medium">{assigneeName}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-3 flex-wrap" data-testid="admin-ticket-controls">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select
              value={ticket.status}
              onValueChange={(value) => statusMutation.mutate(value)}
              disabled={statusMutation.isPending}
            >
              <SelectTrigger className="w-[180px]" data-testid="select-change-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

function ConversationTab({ replies, ticketId }: { replies: any[]; ticketId: number }) {
  const [body, setBody] = useState("");
  const { toast } = useToast();

  const replyMutation = useMutation({
    mutationFn: async (replyBody: string) => {
      await apiRequest("POST", `/api/tickets/${ticketId}/replies`, { body: replyBody });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      setBody("");
      toast({ title: "Reply Sent", description: "Your reply has been added." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to send reply", variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    replyMutation.mutate(body.trim());
  }

  return (
    <div className="space-y-4 mt-4">
      {replies.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No replies yet</p>
            <p className="text-sm mt-1">Start the conversation below.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="replies-list">
          {replies.map((reply: any) => (
            <Card
              key={reply.id}
              className={reply.isStaff ? "border-l-2 border-l-blue-500" : ""}
              data-testid={`reply-${reply.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-medium" data-testid={`text-reply-author-${reply.id}`}>
                    {reply.authorName}
                  </span>
                  {reply.isStaff && (
                    <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-400">
                      Staff
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(reply.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap" data-testid={`text-reply-body-${reply.id}`}>
                  {reply.body}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3" data-testid="form-reply">
            <Textarea
              placeholder="Type your reply..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              data-testid="input-reply-body"
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={replyMutation.isPending || !body.trim()} data-testid="button-send-reply">
                {replyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Reply
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineTab({ auditLogs }: { auditLogs: any[] }) {
  if (auditLogs.length === 0) {
    return (
      <Card className="border-dashed mt-4">
        <CardContent className="py-8 text-center text-muted-foreground">
          <History className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="font-medium">No activity yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-4 relative" data-testid="audit-timeline">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-4">
        {auditLogs.map((log: any) => (
          <div key={log.id} className="relative pl-10" data-testid={`audit-log-${log.id}`}>
            <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-muted border-2 border-border" />
            <div className="text-sm">
              <span className="font-medium" data-testid={`text-audit-actor-${log.id}`}>{log.actorName || "System"}</span>
              <span className="text-muted-foreground ml-1" data-testid={`text-audit-action-${log.id}`}>{log.action}</span>
              {log.fromStatus && log.toStatus && (
                <span className="ml-1 text-muted-foreground">
                  <StatusBadge status={log.fromStatus} />
                  <ArrowRight className="h-3 w-3 inline mx-1" />
                  <StatusBadge status={log.toStatus} />
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
            {log.metadata && (
              <div className="text-xs text-muted-foreground mt-0.5 italic">
                {typeof log.metadata === "string" ? log.metadata : JSON.stringify(log.metadata)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function InternalNotesTab({ notes, ticketId }: { notes: any[]; ticketId: number }) {
  const [body, setBody] = useState("");
  const { toast } = useToast();

  const noteMutation = useMutation({
    mutationFn: async (noteBody: string) => {
      await apiRequest("POST", `/api/tickets/${ticketId}/notes`, { body: noteBody });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      setBody("");
      toast({ title: "Note Added", description: "Internal note has been saved." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to add note", variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    noteMutation.mutate(body.trim());
  }

  return (
    <div className="space-y-4 mt-4">
      {notes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <StickyNote className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No internal notes</p>
            <p className="text-sm mt-1">Add a private note visible only to staff.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="notes-list">
          {notes.map((note: any) => (
            <Card key={note.id} className="bg-amber-500/5" data-testid={`note-${note.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-medium" data-testid={`text-note-author-${note.id}`}>
                    {note.authorName}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">Internal</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap" data-testid={`text-note-body-${note.id}`}>
                  {note.body}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3" data-testid="form-note">
            <Textarea
              placeholder="Add an internal note..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              data-testid="input-note-body"
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={noteMutation.isPending || !body.trim()} data-testid="button-add-note">
                {noteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <StickyNote className="h-4 w-4 mr-2" />
                )}
                Add Note
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
