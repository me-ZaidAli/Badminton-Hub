import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const GroupChats = lazy(() => import("./GroupChats"));
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  MessageCircle,
  Send,
  Loader2,
  Search,
  Archive,
  Trash2,
  Plus,
  ArrowLeft,
  Check,
  CheckCheck,
  PoundSterling,
  Shield,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  Smile,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function getRoleColor(role: string) {
  if (role === "OWNER") return "bg-blue-500 text-white";
  return "bg-emerald-500 text-white";
}

interface Conversation {
  contactId: number;
  contactName: string;
  contactRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isArchived: boolean;
  hasPaymentMessages?: boolean;
}

interface ThreadMessage {
  id: number;
  senderId: number;
  recipientId: number;
  body: string;
  readAt: string | null;
  createdAt: string;
  messageCategory?: string;
}

interface Contact {
  id: number;
  fullName: string;
  role: string;
}

function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

function formatChatTime(dateStr: string) {
  const date = new Date(dateStr);
  return format(date, "h:mm a");
}

function formatDateSeparator(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d, yyyy");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export default function InboxPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveDialogContact, setArchiveDialogContact] = useState<Conversation | null>(null);
  const [deleteDialogContact, setDeleteDialogContact] = useState<Conversation | null>(null);
  const [conversationLimitPrompt, setConversationLimitPrompt] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [initialRecipientHandled, setInitialRecipientHandled] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [chatListCollapsed, setChatListCollapsed] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const BASIC_EMOJIS = [
    "😊", "😂", "❤️", "👍", "👎", "🎉", "🔥", "💪",
    "👏", "🙏", "😍", "🤔", "😢", "😮", "🤗", "😎",
    "✅", "❌", "⭐", "💯", "🏸", "🎾", "🏓", "💰",
    "📅", "⏰", "🏆", "🥇", "🥈", "🥉", "👋", "🙌",
  ];

  const { data: conversations = [], isLoading: convoLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
    enabled: !!user,
    refetchInterval: 10000,
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/messages/contacts"],
    enabled: !!user,
  });

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    enabled: !!user,
    refetchInterval: 10000,
  });

  const { data: threadMessages = [], isLoading: threadLoading } = useQuery<ThreadMessage[]>({
    queryKey: ["/api/messages/thread", activeConversation],
    queryFn: async () => {
      if (!activeConversation) return [];
      const res = await fetch(`/api/messages/thread/${activeConversation}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch thread");
      return res.json();
    },
    enabled: !!user && !!activeConversation,
    refetchInterval: 5000,
  });

  const activeContact = useMemo(() => {
    if (!activeConversation) return null;
    const fromConvo = conversations.find(c => c.contactId === activeConversation);
    if (fromConvo) return { id: fromConvo.contactId, name: fromConvo.contactName, role: fromConvo.contactRole };
    const fromContacts = contacts.find(c => c.id === activeConversation);
    if (fromContacts) return { id: fromContacts.id, name: fromContacts.fullName, role: fromContacts.role };
    return null;
  }, [activeConversation, conversations, contacts]);

  useEffect(() => {
    if (threadMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [threadMessages]);

  useEffect(() => {
    if (activeConversation && threadMessages.length > 0) {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
    }
  }, [activeConversation, threadMessages.length]);

  useEffect(() => {
    if (initialRecipientHandled || !user) return;
    const params = new URLSearchParams(window.location.search);
    const recipientId = params.get("recipientId");
    if (recipientId) {
      const id = Number(recipientId);
      if (!isNaN(id) && id !== user.id) {
        setActiveConversation(id);
        setMobileShowThread(true);
        setInitialRecipientHandled(true);
        window.history.replaceState({}, "", "/inbox");
      }
    }
  }, [user, initialRecipientHandled]);

  const sendMutation = useMutation({
    mutationFn: async (data: { recipientId: number; body: string }) => {
      await apiRequest("POST", "/api/messages/send", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/thread", activeConversation] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
      setMessageInput("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (contactId: number) => {
      await apiRequest("POST", `/api/messages/archive-conversation/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
      toast({ title: "Conversation archived" });
      setArchiveDialogContact(null);
      if (activeConversation === archiveDialogContact?.contactId) {
        setActiveConversation(null);
        setMobileShowThread(false);
      }
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (contactId: number) => {
      await apiRequest("DELETE", `/api/messages/conversation/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
      toast({ title: "Conversation deleted" });
      setDeleteDialogContact(null);
      setConversationLimitPrompt(false);
      if (activeConversation === deleteDialogContact?.contactId) {
        setActiveConversation(null);
        setMobileShowThread(false);
      }
    },
  });

  const handleSend = () => {
    if (!messageInput.trim() || !activeConversation) return;
    sendMutation.mutate({ recipientId: activeConversation, body: messageInput.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setActiveConversation(contact.id);
    setNewChatOpen(false);
    setContactPickerOpen(false);
    setMobileShowThread(true);
  };

  const handleOpenConversation = (convo: Conversation) => {
    setActiveConversation(convo.contactId);
    setMobileShowThread(true);
  };

  const handleStartNewChat = () => {
    if (conversations.length >= 5) {
      setConversationLimitPrompt(true);
    } else {
      setNewChatOpen(true);
    }
  };

  const filteredConversations = useMemo(() => {
    let result = conversations;
    if (categoryFilter === "PAYMENT") {
      result = result.filter(c => c.hasPaymentMessages);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.contactName.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q));
    }
    return result;
  }, [conversations, searchQuery, categoryFilter]);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: ThreadMessage[] }[] = [];
    let currentDate = "";
    threadMessages.forEach(msg => {
      const dateKey = format(new Date(msg.createdAt), "yyyy-MM-dd");
      if (dateKey !== currentDate) {
        currentDate = dateKey;
        groups.push({ date: msg.createdAt, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    });
    return groups;
  }, [threadMessages]);

  if (userLoading) {
    return (
      <div className="h-32 flex items-center justify-center" data-testid="loading-auth">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" data-testid="access-denied">
        <Card>
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-lg font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground">Please log in to access your messages.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("chat") ? "group" : "direct";
  });

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col" data-testid="chat-container">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-3 mt-2 w-fit" data-testid="inbox-tabs">
          <TabsTrigger value="direct" className="gap-1.5" data-testid="tab-direct-messages">
            <MessageCircle className="h-4 w-4" />Direct Messages
          </TabsTrigger>
          <TabsTrigger value="group" className="gap-1.5" data-testid="tab-group-chats">
            <Users className="h-4 w-4" />Group Chats
          </TabsTrigger>
        </TabsList>
        <TabsContent value="group" className="flex-1 min-h-0 mt-2 mx-0">
          <Suspense fallback={<div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
            <GroupChats />
          </Suspense>
        </TabsContent>
        <TabsContent value="direct" className="flex-1 min-h-0 mt-2 mx-0">
      <div className="flex flex-1 min-h-0 border rounded-md overflow-hidden relative">
        <div className={`${chatListCollapsed ? "w-0 overflow-hidden border-r-0" : "w-full md:w-80 lg:w-96"} flex-shrink-0 border-r flex flex-col bg-background transition-all duration-300 ${mobileShowThread ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-lg" data-testid="text-chats-title">Chats</h2>
              <div className="flex items-center gap-1">
                {unreadCount && unreadCount.count > 0 && (
                  <Badge variant="default" className="no-default-hover-elevate no-default-active-elevate unread-badge-pulse" data-testid="badge-total-unread">
                    {unreadCount.count}
                  </Badge>
                )}
                <Button size="icon" variant="ghost" onClick={handleStartNewChat} data-testid="button-new-chat">
                  <Plus className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setChatListCollapsed(true)}
                  className="hidden md:flex"
                  title="Collapse chat list"
                  data-testid="button-collapse-chat-list"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 rounded-full"
                data-testid="input-search-conversations"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { value: "ALL", label: "All" },
                { value: "PAYMENT", label: "Payments" },
              ].map(cat => (
                <Button
                  key={cat.value}
                  size="sm"
                  variant={categoryFilter === cat.value ? "default" : "outline"}
                  className="h-6 text-xs px-2.5 rounded-full"
                  onClick={() => setCategoryFilter(cat.value)}
                  data-testid={`filter-category-${cat.value.toLowerCase()}`}
                >
                  {cat.label}
                  {cat.value === "PAYMENT" && conversations.some(c => c.hasPaymentMessages) && (
                    <PoundSterling className="h-3 w-3 ml-1" />
                  )}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {convoLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse px-3 py-3">
                    <div className="h-11 w-11 rounded-full bg-muted" />
                    <div className="flex-1">
                      <div className="h-4 w-24 bg-muted rounded mb-1.5" />
                      <div className="h-3 w-40 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-7 w-7 text-primary/50" />
                </div>
                <p className="text-sm font-medium mb-1">No conversations yet</p>
                <p className="text-xs text-muted-foreground mb-3">Start chatting with a club member</p>
                <Button variant="outline" size="sm" className="mt-1" onClick={handleStartNewChat} data-testid="button-start-chat-empty">
                  Start a conversation
                </Button>
              </div>
            ) : (
              filteredConversations.map(convo => (
                <div
                  key={convo.contactId}
                  className={`flex items-center gap-3 px-3 py-3 cursor-pointer chat-list-item hover-elevate ${activeConversation === convo.contactId ? "bg-primary/5 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"}`}
                  onClick={() => handleOpenConversation(convo)}
                  data-testid={`conversation-item-${convo.contactId}`}
                >
                  <Avatar className="h-11 w-11 flex-shrink-0">
                    <AvatarFallback className={`text-xs font-semibold ${getRoleColor(convo.contactRole)}`}>
                      {getInitials(convo.contactName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate flex items-center gap-1.5" data-testid={`text-contact-name-${convo.contactId}`}>
                        {convo.contactName}
                        {convo.contactRole === "OWNER" && (
                          <Shield className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                        )}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {formatMessageTime(convo.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground truncate">{convo.lastMessage}</p>
                        {convo.hasPaymentMessages && (
                          <PoundSterling className="h-3 w-3 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      {convo.unreadCount > 0 && (
                        <Badge variant="default" className="text-[10px] min-w-[20px] h-5 flex items-center justify-center rounded-full no-default-hover-elevate no-default-active-elevate unread-badge-pulse" data-testid={`badge-unread-${convo.contactId}`}>
                          {convo.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {chatListCollapsed && (
          <button
            onClick={() => setChatListCollapsed(false)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-6 rounded-l-none rounded-r-md bg-muted/80 border border-l-0 shadow-sm hidden md:flex items-center justify-center hover-elevate cursor-pointer"
            title="Expand chat list"
            data-testid="button-expand-chat-list"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <div className={`flex-1 flex flex-col ${!mobileShowThread ? "hidden md:flex" : "flex"}`}>
          {activeConversation && activeContact ? (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b chat-header-gradient">
                <Button
                  size="icon"
                  variant="ghost"
                  className="md:hidden"
                  onClick={() => { setMobileShowThread(false); setActiveConversation(null); }}
                  data-testid="button-back-to-list"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={`text-xs font-semibold ${getRoleColor(activeContact.role)}`}>
                    {getInitials(activeContact.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-sm truncate" data-testid="text-active-contact-name">{activeContact.name}</h3>
                    {activeContact.role === "OWNER" && (
                      <Shield className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {activeContact.role === "OWNER" ? "Super Admin" : "Direct Message"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const convo = conversations.find(c => c.contactId === activeConversation);
                      if (convo) setArchiveDialogContact(convo);
                    }}
                    data-testid="button-archive-conversation"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 chat-bg-default" data-testid="chat-messages-area">
                {threadLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : threadMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                    <div>
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <MessageCircle className="h-8 w-8 text-primary/40" />
                      </div>
                      <p className="text-sm font-medium mb-1">No messages yet</p>
                      <p className="text-xs text-muted-foreground">Say hello to start the conversation</p>
                    </div>
                  </div>
                ) : (
                  groupedMessages.map((group, gi) => (
                    <div key={gi}>
                      <div className="flex justify-center my-4">
                        <span className="text-[11px] text-muted-foreground bg-muted/80 px-4 py-1 rounded-full shadow-sm" data-testid={`text-date-separator-${gi}`}>
                          {formatDateSeparator(group.date)}
                        </span>
                      </div>
                      {group.messages.map((msg) => {
                        const isMine = msg.senderId === user.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex mb-3 items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                            data-testid={`message-bubble-${msg.id}`}
                          >
                            {!isMine && activeContact && (
                              <Avatar className="h-7 w-7 flex-shrink-0 mb-0.5">
                                <AvatarFallback className={`text-[10px] font-semibold ${getRoleColor(activeContact.role)}`}>
                                  {getInitials(activeContact.name)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div
                              className={`max-w-[75%] px-3.5 py-2.5 text-sm shadow-sm ${
                                isMine
                                  ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm chat-bubble-right"
                                  : "bg-card border rounded-2xl rounded-bl-sm chat-bubble-left"
                              } ${msg.messageCategory === "PAYMENT" ? (isMine ? "ring-1 ring-amber-400/50" : "border-amber-300 dark:border-amber-700") : ""}`}
                            >
                              {msg.messageCategory === "PAYMENT" && (
                                <div className={`flex items-center gap-1 mb-1 text-[10px] font-medium ${isMine ? "text-primary-foreground/70" : "text-amber-600 dark:text-amber-400"}`}>
                                  <PoundSterling className="h-3 w-3" />
                                  Payment
                                </div>
                              )}
                              <p className="whitespace-pre-wrap break-words" data-testid={`text-message-body-${msg.id}`}>{msg.body}</p>
                              <div className={`flex items-center gap-1.5 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                                <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                  {formatChatTime(msg.createdAt)}
                                </span>
                                {isMine && (
                                  msg.readAt ? (
                                    <CheckCheck className={`h-3.5 w-3.5 text-primary-foreground/70`} />
                                  ) : (
                                    <Check className={`h-3 w-3 text-primary-foreground/50`} />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t p-3 pb-4 bg-background relative">
                {emojiPickerOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 mx-3 bg-popover border rounded-lg shadow-lg p-3 z-20" data-testid="emoji-picker">
                    <div className="grid grid-cols-8 gap-1">
                      {BASIC_EMOJIS.map((emoji, idx) => (
                        <button
                          key={emoji}
                          type="button"
                          className="h-8 w-8 flex items-center justify-center text-lg rounded-md transition-colors cursor-pointer hover-elevate"
                          onClick={() => {
                            setMessageInput(prev => prev + emoji);
                            setEmojiPickerOpen(false);
                          }}
                          data-testid={`emoji-btn-${idx}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full flex-shrink-0"
                    onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                    data-testid="button-emoji-picker"
                  >
                    <Smile className="h-5 w-5 text-muted-foreground" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setEmojiPickerOpen(false)}
                    className="flex-1 rounded-full"
                    data-testid="input-message"
                  />
                  <Button
                    size="icon"
                    className="rounded-full flex-shrink-0"
                    onClick={handleSend}
                    disabled={!messageInput.trim() || sendMutation.isPending}
                    data-testid="button-send-message"
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground chat-bg-default">
              <div>
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-10 w-10 text-primary/30" />
                </div>
                <h3 className="text-lg font-semibold mb-1 text-foreground">Your Messages</h3>
                <p className="text-sm mb-4">Select a conversation or start a new chat</p>
                <Button onClick={handleStartNewChat} data-testid="button-start-chat-main">
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="dialog-new-chat">
          <DialogHeader>
            <DialogTitle>New Chat</DialogTitle>
            <DialogDescription>Select a club member or super admin to start a conversation</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Command className="border rounded-md">
              <CommandInput placeholder="Search by name..." data-testid="input-search-contacts" />
              <CommandList className="max-h-[300px]">
                <CommandEmpty>No contacts found</CommandEmpty>
                <CommandGroup heading="Super Admins">
                  {contacts.filter(c => c.role === "OWNER").map(contact => (
                    <CommandItem
                      key={contact.id}
                      value={contact.fullName}
                      onSelect={() => handleSelectContact(contact)}
                      className="cursor-pointer"
                      data-testid={`contact-item-${contact.id}`}
                    >
                      <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{contact.fullName}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] no-default-hover-elevate no-default-active-elevate">Admin</Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup heading="Club Members">
                  {contacts.filter(c => c.role !== "OWNER").map(contact => (
                    <CommandItem
                      key={contact.id}
                      value={contact.fullName}
                      onSelect={() => handleSelectContact(contact)}
                      className="cursor-pointer"
                      data-testid={`contact-item-${contact.id}`}
                    >
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{contact.fullName}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiveDialogContact} onOpenChange={(open) => { if (!open) setArchiveDialogContact(null); }}>
        <AlertDialogContent data-testid="dialog-archive-conversation">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Archive your conversation with {archiveDialogContact?.contactName}? You can start a new conversation with them anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-archive">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiveDialogContact && archiveMutation.mutate(archiveDialogContact.contactId)}
              data-testid="button-confirm-archive"
            >
              {archiveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteDialogContact} onOpenChange={(open) => { if (!open) setDeleteDialogContact(null); }}>
        <AlertDialogContent data-testid="dialog-delete-conversation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete your conversation with {deleteDialogContact?.contactName}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialogContact && deleteConversationMutation.mutate(deleteDialogContact.contactId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteConversationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={conversationLimitPrompt} onOpenChange={setConversationLimitPrompt}>
        <DialogContent className="sm:max-w-[450px]" data-testid="dialog-conversation-limit">
          <DialogHeader>
            <DialogTitle>Too Many Conversations</DialogTitle>
            <DialogDescription>
              You have {conversations.length} active conversations. Please delete or archive a conversation before starting a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-[300px] overflow-y-auto">
            {conversations.map(convo => (
              <div key={convo.contactId} className="flex items-center justify-between gap-2 p-2 rounded-md border" data-testid={`limit-convo-${convo.contactId}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs">{getInitials(convo.contactName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{convo.contactName}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setConversationLimitPrompt(false);
                      setArchiveDialogContact(convo);
                    }}
                    data-testid={`button-archive-limit-${convo.contactId}`}
                  >
                    <Archive className="h-3 w-3 mr-1" />
                    Archive
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setConversationLimitPrompt(false);
                      setDeleteDialogContact(convo);
                    }}
                    data-testid={`button-delete-limit-${convo.contactId}`}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConversationLimitPrompt(false)} data-testid="button-close-limit">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
