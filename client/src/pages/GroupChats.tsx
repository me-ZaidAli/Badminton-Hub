import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MessageCircle, Send, Loader2, Search, Plus, ArrowLeft, Users, Lock, Pin,
  MoreVertical, Volume2, VolumeX, UserPlus, UserMinus, Shield, Flag,
  Trash2, Settings, AlertTriangle, Star, Info, X, SmilePlus, ChevronDown,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ChatItem {
  id: number;
  name: string;
  type: string;
  isLocked: boolean;
  isReadOnlyForPlayers: boolean;
  isJuniorLinked: boolean;
  myRole: string;
  isMuted: boolean;
  memberCount: number;
  lastMessage: { body: string; createdAt: string; senderName: string | null; messageType: string } | null;
  unreadCount: number;
  pinnedMessage: { id: number; body: string; senderName: string | null } | null;
  createdAt: string;
}

interface ChatDetail {
  id: number;
  name: string;
  type: string;
  description: string | null;
  isLocked: boolean;
  isReadOnlyForPlayers: boolean;
  isJuniorLinked: boolean;
  myRole: string;
  members: ChatDetailMember[];
  pinnedMessage: { id: number; body: string; senderName: string | null; createdAt: string } | null;
}

interface ChatDetailMember {
  id: number;
  userId: number;
  role: string;
  isMuted: boolean;
  mutedUntil: string | null;
  muteReason: string | null;
  joinedAt: string;
  fullName: string;
  userRole: string;
}

interface ChatMsg {
  id: number;
  chatId: number;
  senderId: number | null;
  body: string;
  messageType: string;
  systemEventType: string | null;
  isPinned: boolean;
  deletedAt: string | null;
  createdAt: string;
  senderName: string | null;
  senderRole: string | null;
  chatRole: string | null;
  reactions: { id: number; messageId: number; userId: number; emoji: string; userName: string }[];
}

function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

function formatChatTime(dateStr: string) {
  return format(new Date(dateStr), "h:mm a");
}

function formatDateSeparator(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d, yyyy");
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
}

function getRoleBadge(role: string | null, userRole?: string | null) {
  if (role === "ADMIN" || userRole === "OWNER") return { label: "Admin", icon: Shield, variant: "default" as const };
  if (role === "ORGANISER") return { label: "Organiser", icon: Settings, variant: "secondary" as const };
  if (role === "COACH") return { label: "Coach", icon: Star, variant: "outline" as const };
  return null;
}

function getChatTypeLabel(type: string) {
  switch (type) {
    case "SESSION": return "Session";
    case "CLUB": return "Club";
    case "PREMIUM": return "Premium";
    case "STAFF": return "Staff";
    case "EVENT": return "Event";
    case "CUSTOM": return "Custom";
    default: return type;
  }
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🏸", "💪"];

export default function GroupChats() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [createChatOpen, setCreateChatOpen] = useState(false);
  const [chatInfoOpen, setChatInfoOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportMessageId, setReportMessageId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [muteDialogOpen, setMuteDialogOpen] = useState(false);
  const [muteTargetUserId, setMuteTargetUserId] = useState<number | null>(null);
  const [muteReason, setMuteReason] = useState("");
  const [muteDuration, setMuteDuration] = useState("60");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteMessageId, setDeleteMessageId] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [lockReason, setLockReason] = useState("");
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<number | null>(null);
  const [newChatName, setNewChatName] = useState("");
  const [newChatType, setNewChatType] = useState("CUSTOM");
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: chatList = [], isLoading: chatsLoading } = useQuery<ChatItem[]>({
    queryKey: ["/api/chats"],
    enabled: !!user,
    refetchInterval: 10000,
  });

  const { data: chatDetail } = useQuery<ChatDetail>({
    queryKey: ["/api/chats", activeChat],
    queryFn: async () => {
      const res = await fetch(`/api/chats/${activeChat}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user && !!activeChat,
    refetchInterval: 15000,
  });

  const { data: chatMessages = [], isLoading: messagesLoading } = useQuery<ChatMsg[]>({
    queryKey: ["/api/chats", activeChat, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/chats/${activeChat}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user && !!activeChat,
    refetchInterval: 5000,
  });

  const { data: availableUsers = [] } = useQuery<{ id: number; fullName: string; role: string }[]>({
    queryKey: ["/api/chats", activeChat, "available-users"],
    queryFn: async () => {
      const res = await fetch(`/api/chats/${activeChat}/available-users`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user && !!activeChat && addMemberOpen,
  });

  useEffect(() => {
    if (chatMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chatId = params.get("chat");
    if (chatId) {
      setActiveChat(Number(chatId));
      setMobileShowThread(true);
    }
  }, []);

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      await apiRequest("POST", `/api/chats/${activeChat}/messages`, { body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChat, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setMessageInput("");
    },
    onError: (error: Error) => {
      toast({ title: "Cannot post", description: error.message, variant: "destructive" });
    },
  });

  const createChatMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/chats", data);
      return res.json();
    },
    onSuccess: (chat: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setCreateChatOpen(false);
      setNewChatName("");
      setActiveChat(chat.id);
      setMobileShowThread(true);
      toast({ title: "Chat created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("POST", `/api/chats/${activeChat}/members`, { userIds: [userId] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChat] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChat, "available-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChat, "messages"] });
      toast({ title: "Member added" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/chats/${activeChat}/members/${userId}`, { reason: "Removed by admin" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChat] });
      toast({ title: "Member removed" });
    },
  });

  const pinMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest("PATCH", `/api/chats/${activeChat}/pin/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChat] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
    },
  });

  const lockMutation = useMutation({
    mutationFn: async (data: { locked: boolean; reason: string }) => {
      await apiRequest("PATCH", `/api/chats/${activeChat}/lock`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChat] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChat, "messages"] });
      setLockDialogOpen(false);
      setLockReason("");
    },
  });

  const selfMuteMutation = useMutation({
    mutationFn: async (muted: boolean) => {
      await apiRequest("PATCH", `/api/chats/${activeChat}/self-mute`, { muted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
    },
  });

  const muteMemberMutation = useMutation({
    mutationFn: async (data: { userId: number; muted: boolean; reason: string; duration: number }) => {
      await apiRequest("PATCH", `/api/chats/${activeChat}/mute/${data.userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChat] });
      setMuteDialogOpen(false);
      setMuteReason("");
      toast({ title: "User muted" });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (data: { messageId: number; reason: string }) => {
      await apiRequest("DELETE", `/api/chats/${activeChat}/messages/${data.messageId}`, { reason: data.reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChat, "messages"] });
      setDeleteDialogOpen(false);
      setDeleteReason("");
      toast({ title: "Message deleted" });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (data: { messageId: number; reason: string }) => {
      await apiRequest("POST", `/api/chats/${activeChat}/report`, data);
    },
    onSuccess: () => {
      setReportDialogOpen(false);
      setReportReason("");
      toast({ title: "Message reported" });
    },
  });

  const reactionMutation = useMutation({
    mutationFn: async (data: { messageId: number; emoji: string }) => {
      await apiRequest("POST", `/api/chats/${activeChat}/messages/${data.messageId}/reactions`, { emoji: data.emoji });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChat, "messages"] });
      setReactionPickerMsgId(null);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (data: { userId: number; role: string }) => {
      await apiRequest("PATCH", `/api/chats/${activeChat}/members/${data.userId}/role`, { role: data.role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeChat] });
      toast({ title: "Role updated" });
    },
  });

  const handleSend = () => {
    if (!messageInput.trim() || !activeChat) return;
    sendMutation.mutate(messageInput.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isAdmin = chatDetail?.myRole === "ADMIN" || chatDetail?.myRole === "ORGANISER" || user?.role === "OWNER";

  const canPost = useMemo(() => {
    if (!chatDetail || !user) return false;
    if (chatDetail.isLocked) return false;
    if (chatDetail.isReadOnlyForPlayers && chatDetail.myRole === "MEMBER") return false;
    const myMembership = chatDetail.members.find(m => m.userId === user.id);
    if (myMembership?.isMuted) return false;
    return true;
  }, [chatDetail, user]);

  const postBlockReason = useMemo(() => {
    if (!chatDetail) return null;
    if (chatDetail.isLocked) return "This chat is locked by an admin";
    if (chatDetail.isReadOnlyForPlayers && chatDetail.myRole === "MEMBER") return "This chat is read-only for players — only coaches and admins can post";
    const myMembership = chatDetail?.members.find(m => m.userId === user?.id);
    if (myMembership?.isMuted) return "You are currently muted in this chat";
    return null;
  }, [chatDetail, user]);

  const filteredChats = useMemo(() => {
    if (!searchQuery) return chatList;
    const q = searchQuery.toLowerCase();
    return chatList.filter(c => c.name.toLowerCase().includes(q));
  }, [chatList, searchQuery]);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: ChatMsg[] }[] = [];
    let currentDate = "";
    chatMessages.forEach(msg => {
      const dateKey = format(new Date(msg.createdAt), "yyyy-MM-dd");
      if (dateKey !== currentDate) {
        currentDate = dateKey;
        groups.push({ date: msg.createdAt, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    });
    return groups;
  }, [chatMessages]);

  const filteredAvailableUsers = useMemo(() => {
    if (!addMemberSearch) return availableUsers;
    const q = addMemberSearch.toLowerCase();
    return availableUsers.filter(u => u.fullName.toLowerCase().includes(q));
  }, [availableUsers, addMemberSearch]);

  const currentChatItem = chatList.find(c => c.id === activeChat);

  if (!user) return null;

  return (
    <div className="h-full flex flex-col" data-testid="group-chat-container">
      <div className="flex flex-1 min-h-0 border rounded-md overflow-hidden">
        {/* Chat List Panel */}
        <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r flex flex-col bg-background ${mobileShowThread ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-lg" data-testid="text-group-chats-title">Group Chats</h2>
              <div className="flex items-center gap-1">
                {(user.role === "OWNER" || user.role === "ADMIN" || user.role === "ORGANISER") && (
                  <Button size="icon" variant="ghost" onClick={() => setCreateChatOpen(true)} data-testid="button-create-group-chat">
                    <Plus className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search group chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                data-testid="input-search-group-chats"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {chatsLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="flex-1"><div className="h-4 w-24 bg-muted rounded mb-1" /><div className="h-3 w-40 bg-muted rounded" /></div>
                  </div>
                ))}
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No group chats yet</p>
                {(user.role === "OWNER" || user.role === "ADMIN" || user.role === "ORGANISER") && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateChatOpen(true)} data-testid="button-create-chat-empty">
                    Create a group chat
                  </Button>
                )}
              </div>
            ) : (
              filteredChats.map(chat => (
                <div
                  key={chat.id}
                  className={`flex items-center gap-3 px-3 py-3 cursor-pointer hover-elevate ${activeChat === chat.id ? "bg-accent/50" : ""}`}
                  onClick={() => { setActiveChat(chat.id); setMobileShowThread(true); }}
                  data-testid={`group-chat-item-${chat.id}`}
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="text-xs">
                      {chat.isLocked ? <Lock className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <span className="font-medium text-sm truncate" data-testid={`text-chat-name-${chat.id}`}>{chat.name}</span>
                        {chat.isMuted && <VolumeX className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                        {chat.isLocked && <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge variant="secondary" className="text-[9px] no-default-hover-elevate no-default-active-elevate">{getChatTypeLabel(chat.type)}</Badge>
                        {chat.lastMessage && (
                          <span className="text-[11px] text-muted-foreground">{formatMessageTime(chat.lastMessage.createdAt)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground truncate">
                        {chat.lastMessage
                          ? chat.lastMessage.messageType === "SYSTEM"
                            ? chat.lastMessage.body
                            : `${chat.lastMessage.senderName || "Unknown"}: ${chat.lastMessage.body}`
                          : `${chat.memberCount} members`}
                      </p>
                      {chat.unreadCount > 0 && (
                        <Badge variant="default" className="text-[10px] min-w-[20px] h-5 flex items-center justify-center no-default-hover-elevate no-default-active-elevate" data-testid={`badge-group-unread-${chat.id}`}>
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Thread Panel */}
        <div className={`flex-1 flex flex-col bg-background ${!mobileShowThread ? "hidden md:flex" : "flex"}`}>
          {activeChat && chatDetail ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
                <Button size="icon" variant="ghost" className="md:hidden" onClick={() => { setMobileShowThread(false); setActiveChat(null); }} data-testid="button-back-to-chat-list">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs"><Users className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm truncate" data-testid="text-active-chat-name">{chatDetail.name}</h3>
                    {chatDetail.isJuniorLinked && (
                      <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                        <Shield className="h-3 w-3 mr-1" />Safeguarded
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{chatDetail.members.length} members</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setChatInfoOpen(true)} data-testid="button-chat-info">
                    <Info className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid="button-chat-actions">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        const chatItem = chatList.find(c => c.id === activeChat);
                        selfMuteMutation.mutate(!chatItem?.isMuted);
                      }} data-testid="button-self-mute">
                        {currentChatItem?.isMuted ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
                        {currentChatItem?.isMuted ? "Unmute notifications" : "Mute notifications"}
                      </DropdownMenuItem>
                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setAddMemberOpen(true)} data-testid="button-add-member">
                            <UserPlus className="h-4 w-4 mr-2" />Add members
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setLockDialogOpen(true)} data-testid="button-lock-chat">
                            <Lock className="h-4 w-4 mr-2" />{chatDetail.isLocked ? "Unlock chat" : "Lock chat"}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Pinned Message Banner */}
              {chatDetail.pinnedMessage && (
                <div className="flex items-center gap-2 px-4 py-2 border-b bg-accent/30" data-testid="pinned-message-banner">
                  <Pin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground truncate flex-1">
                    <span className="font-medium">{chatDetail.pinnedMessage.senderName || "System"}:</span> {chatDetail.pinnedMessage.body}
                  </p>
                </div>
              )}

              {/* Locked Banner */}
              {chatDetail.isLocked && (
                <div className="flex items-center gap-2 px-4 py-2 border-b bg-destructive/10" data-testid="locked-chat-banner">
                  <Lock className="h-4 w-4 text-destructive flex-shrink-0" />
                  <p className="text-xs text-destructive">This chat is locked — only admins can unlock it</p>
                </div>
              )}

              {/* Read-only Banner */}
              {chatDetail.isReadOnlyForPlayers && !chatDetail.isLocked && chatDetail.myRole === "MEMBER" && (
                <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/50" data-testid="readonly-banner">
                  <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">This is a safeguarded chat — only coaches and admins can post</p>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--muted)) 1px, transparent 0)", backgroundSize: "24px 24px" }} data-testid="group-chat-messages-area">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                    <div>
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No messages yet in this group</p>
                    </div>
                  </div>
                ) : (
                  groupedMessages.map((group, gi) => (
                    <div key={gi}>
                      <div className="flex justify-center my-3">
                        <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                          {formatDateSeparator(group.date)}
                        </span>
                      </div>
                      {group.messages.map(msg => {
                        if (msg.messageType === "SYSTEM") {
                          return (
                            <div key={msg.id} className="flex justify-center my-2" data-testid={`system-message-${msg.id}`}>
                              <div className="bg-muted/80 px-4 py-2 rounded-lg max-w-[85%] text-center">
                                <p className="text-xs text-muted-foreground">{msg.body}</p>
                              </div>
                            </div>
                          );
                        }

                        const isMine = msg.senderId === user.id;
                        const roleBadge = getRoleBadge(msg.chatRole, msg.senderRole);

                        return (
                          <div key={msg.id} className={`flex mb-2 ${isMine ? "justify-end" : "justify-start"}`} data-testid={`group-message-${msg.id}`}>
                            <div className="max-w-[75%]">
                              {!isMine && (
                                <div className="flex items-center gap-1 mb-0.5 ml-1">
                                  <span className="text-[11px] font-medium text-muted-foreground">{msg.senderName || "Unknown"}</span>
                                  {roleBadge && (
                                    <Badge variant={roleBadge.variant} className="text-[9px] h-4 no-default-hover-elevate no-default-active-elevate">
                                      {roleBadge.label}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              <div className={`group relative px-3 py-2 rounded-lg text-sm ${
                                isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"
                              }`}>
                                {msg.isPinned && (
                                  <Pin className={`absolute -top-1 -right-1 h-3 w-3 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`} />
                                )}
                                <p className="whitespace-pre-wrap break-words">{msg.body}</p>

                                {/* Reactions */}
                                {msg.reactions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {Object.entries(msg.reactions.reduce((acc: Record<string, { count: number; users: string[] }>, r) => {
                                      if (!acc[r.emoji]) acc[r.emoji] = { count: 0, users: [] };
                                      acc[r.emoji].count++;
                                      acc[r.emoji].users.push(r.userName);
                                      return acc;
                                    }, {})).map(([emoji, data]) => (
                                      <button
                                        key={emoji}
                                        onClick={() => reactionMutation.mutate({ messageId: msg.id, emoji })}
                                        className={`text-[11px] px-1.5 py-0.5 rounded-full border ${
                                          msg.reactions.some(r => r.emoji === emoji && r.userId === user.id) ? "bg-accent border-accent" : "bg-background"
                                        }`}
                                        title={data.users.join(", ")}
                                        data-testid={`reaction-${msg.id}-${emoji}`}
                                      >
                                        {emoji} {data.count}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                                  <span className={`text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                    {formatChatTime(msg.createdAt)}
                                  </span>
                                </div>

                                {/* Message Actions */}
                                <div className="invisible group-hover:visible absolute -top-2 right-0 flex items-center gap-0.5 bg-background border rounded-md shadow-sm p-0.5">
                                  <button
                                    onClick={() => setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id)}
                                    className="p-1 rounded hover-elevate"
                                    data-testid={`button-react-${msg.id}`}
                                  >
                                    <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
                                  </button>
                                  {!isMine && (
                                    <button
                                      onClick={() => { setReportMessageId(msg.id); setReportDialogOpen(true); }}
                                      className="p-1 rounded hover-elevate"
                                      data-testid={`button-report-${msg.id}`}
                                    >
                                      <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                                    </button>
                                  )}
                                  {isAdmin && (
                                    <>
                                      <button
                                        onClick={() => pinMutation.mutate(msg.id)}
                                        className="p-1 rounded hover-elevate"
                                        data-testid={`button-pin-${msg.id}`}
                                      >
                                        <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                                      </button>
                                      <button
                                        onClick={() => { setDeleteMessageId(msg.id); setDeleteDialogOpen(true); }}
                                        className="p-1 rounded hover-elevate"
                                        data-testid={`button-delete-msg-${msg.id}`}
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Reaction Picker */}
                              {reactionPickerMsgId === msg.id && (
                                <div className="flex flex-wrap gap-1 mt-1 bg-background border rounded-md p-1.5 shadow-sm" data-testid={`reaction-picker-${msg.id}`}>
                                  {REACTION_EMOJIS.map(emoji => (
                                    <button
                                      key={emoji}
                                      onClick={() => reactionMutation.mutate({ messageId: msg.id, emoji })}
                                      className="text-sm p-1 rounded hover-elevate"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              {canPost ? (
                <div className="border-t p-3 bg-background">
                  <div className="flex items-end gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1"
                      data-testid="input-group-message"
                    />
                    <Button size="icon" onClick={handleSend} disabled={!messageInput.trim() || sendMutation.isPending} data-testid="button-send-group-message">
                      {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ) : postBlockReason ? (
                <div className="border-t p-3 bg-muted/30">
                  <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span>{postBlockReason}</span>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <div>
                <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-1">Group Chats</h3>
                <p className="text-sm mb-4">Select a group chat to view messages</p>
                {(user.role === "OWNER" || user.role === "ADMIN" || user.role === "ORGANISER") && (
                  <Button onClick={() => setCreateChatOpen(true)} data-testid="button-create-chat-main">
                    <Plus className="h-4 w-4 mr-2" />Create Group Chat
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Chat Dialog */}
      <Dialog open={createChatOpen} onOpenChange={setCreateChatOpen}>
        <DialogContent className="sm:max-w-[450px]" data-testid="dialog-create-chat">
          <DialogHeader>
            <DialogTitle>Create Group Chat</DialogTitle>
            <DialogDescription>Create a new group chat for your club members</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Chat Name</label>
              <Input
                placeholder="e.g. Monday Session Chat"
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
                data-testid="input-new-chat-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Chat Type</label>
              <Select value={newChatType} onValueChange={setNewChatType}>
                <SelectTrigger data-testid="select-chat-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLUB">Club Chat</SelectItem>
                  <SelectItem value="PREMIUM">Premium Members</SelectItem>
                  <SelectItem value="STAFF">Staff / Organisers</SelectItem>
                  <SelectItem value="EVENT">Event Chat</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateChatOpen(false)} data-testid="button-cancel-create-chat">Cancel</Button>
            <Button
              onClick={() => createChatMutation.mutate({ name: newChatName, type: newChatType })}
              disabled={!newChatName.trim() || createChatMutation.isPending}
              data-testid="button-confirm-create-chat"
            >
              {createChatMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Info Dialog */}
      <Dialog open={chatInfoOpen} onOpenChange={setChatInfoOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto" data-testid="dialog-chat-info">
          <DialogHeader>
            <DialogTitle>{chatDetail?.name}</DialogTitle>
            <DialogDescription>
              {getChatTypeLabel(chatDetail?.type || "")} chat
              {chatDetail?.isJuniorLinked && " (Safeguarded)"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Members ({chatDetail?.members.length || 0})</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {chatDetail?.members.map(member => {
                  const roleBadge = getRoleBadge(member.role, member.userRole);
                  return (
                    <div key={member.userId} className="flex items-center justify-between gap-2 p-2 rounded-md border" data-testid={`member-item-${member.userId}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-xs">{getInitials(member.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-sm font-medium truncate">{member.fullName}</span>
                            {roleBadge && (
                              <Badge variant={roleBadge.variant} className="text-[9px] h-4 no-default-hover-elevate no-default-active-elevate">{roleBadge.label}</Badge>
                            )}
                            {member.isMuted && (
                              <Badge variant="destructive" className="text-[9px] h-4 no-default-hover-elevate no-default-active-elevate">Muted</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {isAdmin && member.userId !== user.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`button-member-actions-${member.userId}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: member.userId, role: member.role === "ADMIN" ? "MEMBER" : "ADMIN" })}>
                              <Shield className="h-4 w-4 mr-2" />
                              {member.role === "ADMIN" ? "Remove admin" : "Make admin"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: member.userId, role: member.role === "COACH" ? "MEMBER" : "COACH" })}>
                              <Star className="h-4 w-4 mr-2" />
                              {member.role === "COACH" ? "Remove coach" : "Make coach"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setMuteTargetUserId(member.userId); setMuteDialogOpen(true); }} data-testid={`button-mute-member-${member.userId}`}>
                              <VolumeX className="h-4 w-4 mr-2" />{member.isMuted ? "Unmute" : "Mute"}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => removeMemberMutation.mutate(member.userId)} data-testid={`button-remove-member-${member.userId}`}>
                              <UserMinus className="h-4 w-4 mr-2" />Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="sm:max-w-[450px]" data-testid="dialog-add-member">
          <DialogHeader>
            <DialogTitle>Add Members</DialogTitle>
            <DialogDescription>Search and add members to this chat</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Search users..."
              value={addMemberSearch}
              onChange={(e) => setAddMemberSearch(e.target.value)}
              data-testid="input-search-add-member"
            />
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {filteredAvailableUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between gap-2 p-2 rounded-md border" data-testid={`available-user-${u.id}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">{getInitials(u.fullName)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">{u.fullName}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addMemberMutation.mutate(u.id)}
                    disabled={addMemberMutation.isPending}
                    data-testid={`button-add-user-${u.id}`}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />Add
                  </Button>
                </div>
              ))}
              {filteredAvailableUsers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No users available to add</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="dialog-report-message">
          <DialogHeader>
            <DialogTitle>Report Message</DialogTitle>
            <DialogDescription>Why are you reporting this message?</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe the issue..."
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            data-testid="input-report-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => reportMessageId && reportMutation.mutate({ messageId: reportMessageId, reason: reportReason })}
              disabled={!reportReason.trim() || reportMutation.isPending}
              data-testid="button-confirm-report"
            >
              Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mute User Dialog */}
      <Dialog open={muteDialogOpen} onOpenChange={setMuteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="dialog-mute-user">
          <DialogHeader>
            <DialogTitle>Mute User</DialogTitle>
            <DialogDescription>Mute this user from posting in this chat</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration</label>
              <Select value={muteDuration} onValueChange={setMuteDuration}>
                <SelectTrigger data-testid="select-mute-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="1440">24 hours</SelectItem>
                  <SelectItem value="10080">7 days</SelectItem>
                  <SelectItem value="0">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Reason for muting (required)..."
              value={muteReason}
              onChange={(e) => setMuteReason(e.target.value)}
              data-testid="input-mute-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMuteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => muteTargetUserId && muteMemberMutation.mutate({
                userId: muteTargetUserId,
                muted: true,
                reason: muteReason,
                duration: parseInt(muteDuration),
              })}
              disabled={!muteReason.trim() || muteMemberMutation.isPending}
              data-testid="button-confirm-mute"
            >
              Mute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Message Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-message">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>This message will be removed. A record will be kept in audit logs.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for deletion (required)..."
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            data-testid="input-delete-reason"
          />
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-msg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMessageId && deleteMessageMutation.mutate({ messageId: deleteMessageId, reason: deleteReason })}
              disabled={!deleteReason.trim()}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-msg"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lock/Unlock Dialog */}
      <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="dialog-lock-chat">
          <DialogHeader>
            <DialogTitle>{chatDetail?.isLocked ? "Unlock Chat" : "Lock Chat"}</DialogTitle>
            <DialogDescription>
              {chatDetail?.isLocked
                ? "Unlocking will allow members to post again"
                : "Locking prevents all members from posting new messages"}
            </DialogDescription>
          </DialogHeader>
          {!chatDetail?.isLocked && (
            <Textarea
              placeholder="Reason for locking (optional)..."
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              data-testid="input-lock-reason"
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => lockMutation.mutate({ locked: !chatDetail?.isLocked, reason: lockReason })}
              disabled={lockMutation.isPending}
              data-testid="button-confirm-lock"
            >
              {chatDetail?.isLocked ? "Unlock" : "Lock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
