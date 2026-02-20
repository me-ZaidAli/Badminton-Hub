import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Eye, Archive, Inbox, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

type MessageStatus = "UNREAD" | "READ" | "ARCHIVED";

interface ContactMessage {
  id: number;
  senderUserId: number | null;
  senderName: string | null;
  senderEmail: string | null;
  clubId: number | null;
  subject: string;
  message: string;
  status: MessageStatus;
  createdAt: string;
  sender?: { id: number; fullName: string; email: string };
  club?: { id: number; name: string };
}

function getStatusVariant(status: MessageStatus): "default" | "secondary" | "outline" {
  switch (status) {
    case "UNREAD":
      return "outline";
    case "READ":
      return "default";
    case "ARCHIVED":
      return "secondary";
  }
}

function getStatusClass(status: MessageStatus): string {
  if (status === "UNREAD") {
    return "border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30";
  }
  return "";
}

export default function Messages() {
  const { data: user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: messages, isLoading } = useQuery<ContactMessage[]>({
    queryKey: ["/api/admin/messages"],
    enabled: !!user && (user.role === "OWNER" || user.role === "ADMIN"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: MessageStatus }) => {
      await apiRequest("PATCH", `/api/admin/messages/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update message status",
        variant: "destructive",
      });
    },
  });

  if (userLoading) {
    return (
      <div className="h-32 flex items-center justify-center" data-testid="loading-auth">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" data-testid="access-denied">
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You do not have permission to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredMessages = messages?.filter((msg) => {
    if (activeTab === "ALL") return true;
    return msg.status === activeTab;
  }) ?? [];

  const unreadCount = messages?.filter((msg) => msg.status === "UNREAD").length ?? 0;

  function handleToggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleMarkRead(id: number) {
    updateStatusMutation.mutate({ id, status: "READ" });
  }

  function handleArchive(id: number) {
    updateStatusMutation.mutate({ id, status: "ARCHIVED" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2" data-testid="page-title">
            <Mail className="h-6 w-6 text-blue-500" />
            Contact Messages
          </h1>
          <p className="text-muted-foreground" data-testid="text-unread-count">
            {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-filter">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="ALL" data-testid="tab-all">
            All
          </TabsTrigger>
          <TabsTrigger value="UNREAD" data-testid="tab-unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-1.5" data-testid="badge-unread-count">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="READ" data-testid="tab-read">
            Read
          </TabsTrigger>
          <TabsTrigger value="ARCHIVED" data-testid="tab-archived">
            Archived
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3" data-testid="messages-list">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center" data-testid="loading-messages">
            <div className="animate-pulse text-muted-foreground">Loading messages...</div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <Card className="border-dashed" data-testid="empty-messages">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No {activeTab !== "ALL" ? activeTab.toLowerCase() : ""} messages found.</p>
            </CardContent>
          </Card>
        ) : (
          filteredMessages.map((msg) => {
            const isExpanded = expandedId === msg.id;
            const senderDisplay = msg.sender?.fullName || msg.senderName || "Unknown";
            const emailDisplay = msg.sender?.email || msg.senderEmail || "";
            return (
              <Card
                key={msg.id}
                className={msg.status === "UNREAD" ? "border-l-2 border-l-yellow-500" : ""}
                data-testid={`card-message-${msg.id}`}
              >
                <CardContent className="py-4">
                  <div
                    className="cursor-pointer"
                    onClick={() => handleToggleExpand(msg.id)}
                    data-testid={`message-header-${msg.id}`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold truncate" data-testid={`text-subject-${msg.id}`}>
                            {msg.subject}
                          </span>
                          {msg.club && (
                            <Badge variant="outline" data-testid={`badge-club-${msg.id}`}>
                              {msg.club.name}
                            </Badge>
                          )}
                          <Badge
                            variant={getStatusVariant(msg.status)}
                            className={getStatusClass(msg.status)}
                            data-testid={`badge-status-${msg.id}`}
                          >
                            {msg.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <span data-testid={`text-sender-${msg.id}`}>{senderDisplay}</span>
                          {emailDisplay && (
                            <>
                              <span>-</span>
                              <span data-testid={`text-email-${msg.id}`}>{emailDisplay}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground" data-testid={`text-date-${msg.id}`}>
                          {format(new Date(msg.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-4" data-testid={`message-body-${msg.id}`}>
                      <div className="border-t pt-4">
                        <p className="whitespace-pre-wrap text-sm" data-testid={`text-message-${msg.id}`}>
                          {msg.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {msg.status === "UNREAD" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRead(msg.id);
                            }}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-mark-read-${msg.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1.5" />
                            Mark as Read
                          </Button>
                        )}
                        {msg.status !== "ARCHIVED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(msg.id);
                            }}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-archive-${msg.id}`}
                          >
                            <Archive className="h-4 w-4 mr-1.5" />
                            Archive
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
