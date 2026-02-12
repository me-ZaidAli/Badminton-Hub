import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Mail,
  Send,
  Inbox as InboxIcon,
  Trash2,
  CheckCheck,
  Loader2,
  ArrowLeft,
  Search,
  MailOpen,
} from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

interface InternalMessage {
  id: number;
  senderId: number;
  recipientId: number;
  subject: string;
  body: string;
  clubId: number | null;
  readAt: string | null;
  createdAt: string;
  senderName?: string;
  senderEmail?: string;
  recipientName?: string;
  recipientEmail?: string;
}

export default function InboxPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("inbox");
  const [selectedMessage, setSelectedMessage] = useState<InternalMessage | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [composeForm, setComposeForm] = useState({
    recipientEmail: "",
    subject: "",
    body: "",
  });

  const { data: inboxMessages, isLoading: inboxLoading } = useQuery<InternalMessage[]>({
    queryKey: ["/api/messages/inbox"],
    enabled: !!user,
  });

  const { data: sentMessages, isLoading: sentLoading } = useQuery<InternalMessage[]>({
    queryKey: ["/api/messages/sent"],
    enabled: !!user,
  });

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/messages/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/messages/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      toast({ title: "All messages marked as read" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/messages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/sent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      toast({ title: "Message deleted" });
      setDeleteId(null);
      if (selectedMessage) setSelectedMessage(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { recipientEmail: string; subject: string; body: string }) => {
      await apiRequest("POST", "/api/messages/send", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/sent"] });
      toast({ title: "Message sent successfully" });
      setComposeOpen(false);
      setComposeForm({ recipientEmail: "", subject: "", body: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenMessage = (msg: InternalMessage) => {
    setSelectedMessage(msg);
    if (activeTab === "inbox" && !msg.readAt) {
      markReadMutation.mutate(msg.id);
    }
  };

  const handleBulkDelete = () => {
    selectedIds.forEach(id => deleteMutation.mutate(id));
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (userLoading) {
    return (
      <div className="h-32 flex items-center justify-center" data-testid="loading-auth">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" data-testid="access-denied">
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-lg font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground">Please log in to access your inbox.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentMessages = activeTab === "inbox" ? inboxMessages : sentMessages;
  const isLoading = activeTab === "inbox" ? inboxLoading : sentLoading;

  const filteredMessages = currentMessages?.filter(msg => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      msg.subject?.toLowerCase().includes(q) ||
      msg.body?.toLowerCase().includes(q) ||
      msg.senderName?.toLowerCase().includes(q) ||
      msg.recipientName?.toLowerCase().includes(q) ||
      msg.senderEmail?.toLowerCase().includes(q) ||
      msg.recipientEmail?.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-inbox-title">Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your internal messages
            {unreadCount && unreadCount.count > 0 && (
              <Badge variant="secondary" className="ml-2" data-testid="badge-unread-count">
                {unreadCount.count} unread
              </Badge>
            )}
          </p>
        </div>
        <Button onClick={() => setComposeOpen(true)} data-testid="button-compose">
          <Send className="w-4 h-4 mr-2" />
          Compose
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedIds(new Set()); }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList data-testid="tabs-inbox-sent">
            <TabsTrigger value="inbox" data-testid="tab-inbox">
              <InboxIcon className="w-4 h-4 mr-1" />
              Inbox
              {unreadCount && unreadCount.count > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{unreadCount.count}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" data-testid="tab-sent">
              <Send className="w-4 h-4 mr-1" />
              Sent
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === "inbox" && unreadCount && unreadCount.count > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Mark All Read
              </Button>
            )}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-48"
                data-testid="input-search-messages"
              />
            </div>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mt-3 p-3 bg-muted rounded-md flex-wrap">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              data-testid="button-bulk-delete"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              data-testid="button-clear-selection"
            >
              Clear
            </Button>
          </div>
        )}

        <TabsContent value="inbox" className="mt-4">
          <MessageList
            messages={filteredMessages}
            isLoading={isLoading}
            emptyIcon={<InboxIcon className="w-12 h-12" />}
            emptyText="Your inbox is empty"
            direction="inbox"
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onOpen={handleOpenMessage}
            onDelete={setDeleteId}
          />
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          <MessageList
            messages={filteredMessages}
            isLoading={isLoading}
            emptyIcon={<Send className="w-12 h-12" />}
            emptyText="No sent messages"
            direction="sent"
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onOpen={handleOpenMessage}
            onDelete={setDeleteId}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedMessage} onOpenChange={(open) => { if (!open) setSelectedMessage(null); }}>
        <DialogContent className="sm:max-w-[600px]" data-testid="dialog-message-detail">
          {selectedMessage && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{selectedMessage.subject || "(No Subject)"}</DialogTitle>
                <DialogDescription>
                  {activeTab === "inbox" ? (
                    <>From: {selectedMessage.senderName || "Unknown"} ({selectedMessage.senderEmail})</>
                  ) : (
                    <>To: {selectedMessage.recipientName || "Unknown"} ({selectedMessage.recipientEmail})</>
                  )}
                  {" · "}
                  {format(new Date(selectedMessage.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 min-h-[100px] whitespace-pre-wrap text-sm" data-testid="text-message-body">
                {selectedMessage.body}
              </div>

              {selectedMessage.clubId && (
                <div className="text-xs text-muted-foreground">
                  Club ID: {selectedMessage.clubId}
                </div>
              )}

              <DialogFooter className="gap-2 flex-wrap">
                {activeTab === "inbox" && selectedMessage.senderEmail && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedMessage(null);
                      setComposeForm({
                        recipientEmail: selectedMessage.senderEmail || "",
                        subject: `Re: ${selectedMessage.subject || ""}`,
                        body: "",
                      });
                      setComposeOpen(true);
                    }}
                    data-testid="button-reply"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Reply
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDeleteId(selectedMessage.id);
                    setSelectedMessage(null);
                  }}
                  data-testid="button-delete-message"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-compose">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>Send an internal message to another user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input
                placeholder="Enter recipient's email address"
                value={composeForm.recipientEmail}
                onChange={(e) => setComposeForm(p => ({ ...p, recipientEmail: e.target.value }))}
                data-testid="input-recipient-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder="Message subject"
                value={composeForm.subject}
                onChange={(e) => setComposeForm(p => ({ ...p, subject: e.target.value }))}
                data-testid="input-subject"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Write your message..."
                value={composeForm.body}
                onChange={(e) => setComposeForm(p => ({ ...p, body: e.target.value }))}
                rows={6}
                data-testid="input-body"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)} data-testid="button-cancel-compose">
              Cancel
            </Button>
            <Button
              onClick={() => sendMutation.mutate(composeForm)}
              disabled={sendMutation.isPending || !composeForm.recipientEmail || !composeForm.body}
              data-testid="button-send-message"
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MessageList({
  messages,
  isLoading,
  emptyIcon,
  emptyText,
  direction,
  selectedIds,
  onToggleSelect,
  onOpen,
  onDelete,
}: {
  messages: InternalMessage[];
  isLoading: boolean;
  emptyIcon: React.ReactNode;
  emptyText: string;
  direction: "inbox" | "sent";
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onOpen: (msg: InternalMessage) => void;
  onDelete: (id: number) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-5 w-1/3 bg-muted rounded mb-2" />
              <div className="h-4 w-2/3 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 text-muted-foreground opacity-50">{emptyIcon}</div>
          <p className="text-muted-foreground">{emptyText}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map(msg => {
        const isUnread = direction === "inbox" && !msg.readAt;
        return (
          <Card
            key={msg.id}
            className={`hover-elevate cursor-pointer ${isUnread ? "border-primary/30" : ""}`}
            data-testid={`message-card-${msg.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="pt-1">
                  <Checkbox
                    checked={selectedIds.has(msg.id)}
                    onCheckedChange={() => onToggleSelect(msg.id)}
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`checkbox-message-${msg.id}`}
                  />
                </div>
                <div
                  className="flex-1 min-w-0"
                  onClick={() => onOpen(msg)}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      {isUnread ? (
                        <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                      ) : (
                        <MailOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={`text-sm truncate ${isUnread ? "font-semibold" : "font-medium"}`}>
                        {direction === "inbox"
                          ? msg.senderName || "Unknown"
                          : `To: ${msg.recipientName || "Unknown"}`}
                      </span>
                      
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 truncate ${isUnread ? "font-medium" : "text-muted-foreground"}`}>
                    {msg.subject || "(No Subject)"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {msg.body?.substring(0, 100)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(msg.id);
                  }}
                  data-testid={`button-delete-${msg.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}