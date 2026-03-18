import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { PremiumFeatureGate } from "@/components/PremiumFeatureGate";

const GroupChats = lazy(() => import("./GroupChats"));
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  User,
  Users,
  Smile,
  Clock,
  CreditCard,
  CalendarCheck,
  Info,
  X,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

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
  return format(date, "EEE");
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

function getAvatarColor(name: string) {
  const colors = [
    "bg-violet-600", "bg-rose-600", "bg-amber-600", "bg-emerald-600",
    "bg-blue-600", "bg-pink-600", "bg-teal-600", "bg-indigo-600",
    "bg-orange-600", "bg-cyan-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const BASIC_EMOJIS = [
  "😊", "😂", "❤️", "👍", "👎", "🎉", "🔥", "💪",
  "👏", "🙏", "😍", "🤔", "😢", "😮", "🤗", "😎",
  "✅", "❌", "⭐", "💯", "🏸", "🎾", "🏓", "💰",
  "📅", "⏰", "🏆", "🥇", "🥈", "🥉", "👋", "🙌",
];

export default function InboxPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [archiveDialogContact, setArchiveDialogContact] = useState<Conversation | null>(null);
  const [deleteDialogContact, setDeleteDialogContact] = useState<Conversation | null>(null);
  const [conversationLimitPrompt, setConversationLimitPrompt] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [initialRecipientHandled, setInitialRecipientHandled] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [threadCursor, setThreadCursor] = useState<number | null>(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const loadThread = useCallback(async (contactId: number, before?: number) => {
    const url = before
      ? `/api/messages/thread/${contactId}?limit=15&before=${before}`
      : `/api/messages/thread/${contactId}?limit=15`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch thread");
    const data = await res.json();
    return data as { messages: ThreadMessage[]; nextCursor: number | null };
  }, []);

  const loadGenerationRef = useRef(0);

  useEffect(() => {
    if (!activeConversation || !user) {
      setThreadMessages([]);
      setThreadCursor(null);
      setHasOlderMessages(false);
      return;
    }
    const generation = ++loadGenerationRef.current;
    setThreadLoading(true);
    loadThread(activeConversation).then(data => {
      if (loadGenerationRef.current !== generation) return;
      setThreadMessages(data.messages);
      setThreadCursor(data.nextCursor);
      setHasOlderMessages(data.nextCursor !== null);
      setThreadLoading(false);
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
    }).catch(() => {
      if (loadGenerationRef.current === generation) setThreadLoading(false);
    });
  }, [activeConversation, user, loadThread]);

  const pollGenerationRef = useRef(0);

  useEffect(() => {
    if (!activeConversation || !user) return;
    const generation = ++pollGenerationRef.current;
    const interval = setInterval(async () => {
      if (pollGenerationRef.current !== generation) return;
      try {
        const data = await loadThread(activeConversation);
        if (pollGenerationRef.current !== generation) return;
        setThreadMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = data.messages.filter(m => !existingIds.has(m.id));
          const readUpdates = new Map(data.messages.filter(m => m.readAt).map(m => [m.id, m.readAt]));
          let updated = prev;
          if (readUpdates.size > 0) {
            updated = updated.map(msg => {
              const newReadAt = readUpdates.get(msg.id);
              return !msg.readAt && newReadAt ? { ...msg, readAt: newReadAt } : msg;
            });
          }
          if (newMsgs.length > 0) {
            return [...updated, ...newMsgs];
          }
          return updated === prev ? prev : updated;
        });
      } catch {}
    }, 5000);
    return () => { clearInterval(interval); };
  }, [activeConversation, user, loadThread]);

  const handleLoadOlder = useCallback(async () => {
    if (!activeConversation || !threadCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const data = await loadThread(activeConversation, threadCursor);
      setThreadMessages(prev => [...data.messages, ...prev]);
      setThreadCursor(data.nextCursor);
      setHasOlderMessages(data.nextCursor !== null);
    } catch {}
    setLoadingOlder(false);
  }, [activeConversation, threadCursor, loadingOlder, loadThread]);

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
      const res = await apiRequest("POST", "/api/messages/send", data);
      return await res.json();
    },
    onSuccess: (newMsg: any) => {
      if (newMsg && newMsg.id) {
        setThreadMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
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
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" data-testid="access-denied">
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-white/20" />
          <h2 className="text-lg font-semibold mb-2 text-white">Login Required</h2>
          <p className="text-white/50">Please log in to access your messages.</p>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("chat") ? "group" : "direct";
  });

  const showConversationList = !mobileShowThread || !activeConversation;

  return (
    <PremiumFeatureGate featureName="In-App Messaging" description="Send direct messages and group chats with your club members. Upgrade to Premium to unlock messaging.">
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-80px)]" data-testid="chat-container">

      <div className="flex border-b border-white/[0.06] bg-background">
        <button
          onClick={() => { setActiveTab("direct"); setMobileShowThread(false); setActiveConversation(null); }}
          className={cn(
            "flex-1 py-3 text-sm font-semibold transition-colors relative",
            activeTab === "direct"
              ? "text-white"
              : "text-white/40 hover:text-white/60"
          )}
          data-testid="tab-direct-messages"
        >
          <div className="flex items-center justify-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span>Messages</span>
          </div>
          {activeTab === "direct" && (
            <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("group")}
          className={cn(
            "flex-1 py-3 text-sm font-semibold transition-colors relative",
            activeTab === "group"
              ? "text-white"
              : "text-white/40 hover:text-white/60"
          )}
          data-testid="tab-group-chats"
        >
          <div className="flex items-center justify-center gap-2">
            <Users className="h-4 w-4" />
            <span>Group Chats</span>
          </div>
          {activeTab === "group" && (
            <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      </div>

      {activeTab === "group" ? (
        <div className="flex-1 overflow-y-auto">
          <Suspense fallback={<div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>}>
            <GroupChats />
          </Suspense>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex">

          <div className={cn(
            "w-full md:w-96 lg:w-[420px] flex-shrink-0 flex flex-col md:border-r border-white/[0.06]",
            mobileShowThread ? "hidden md:flex" : "flex"
          )}>
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-foreground" data-testid="text-chats-title">Messages</h1>
                <div className="flex items-center gap-2">
                  {unreadCount && unreadCount.count > 0 && (
                    <Badge variant="default" className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-total-unread">
                      {unreadCount.count}
                    </Badge>
                  )}
                  <button
                    onClick={() => setSearchOpen(!searchOpen)}
                    className="h-9 w-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
                    data-testid="button-toggle-search"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {searchOpen && (
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-10 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 transition-colors"
                    autoFocus
                    data-testid="input-search-conversations"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {[
                  { value: "ALL", label: "All" },
                  { value: "PAYMENT", label: "Payments" },
                ].map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setCategoryFilter(cat.value)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
                      categoryFilter === cat.value
                        ? "bg-white text-black"
                        : "bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white/70"
                    )}
                    data-testid={`filter-category-${cat.value.toLowerCase()}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}>
              {convoLoading ? (
                <div className="px-5 space-y-4 py-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center gap-3.5 animate-pulse">
                      <div className="h-12 w-12 rounded-full bg-white/[0.06]" />
                      <div className="flex-1">
                        <div className="h-3.5 w-28 bg-white/[0.06] rounded mb-2" />
                        <div className="h-3 w-44 bg-white/[0.04] rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <div className="h-16 w-16 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-white/20" />
                  </div>
                  <p className="text-sm font-medium text-white/50 mb-1">No conversations yet</p>
                  <p className="text-xs text-white/30 mb-4">Start chatting with a club member</p>
                  <button
                    onClick={handleStartNewChat}
                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:opacity-90 transition-opacity"
                    data-testid="button-start-chat-empty"
                  >
                    Start a conversation
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {filteredConversations.map(convo => (
                    <button
                      key={convo.contactId}
                      className={cn(
                        "w-full flex items-center gap-3.5 px-5 py-3.5 transition-colors text-left active:bg-white/[0.04]",
                        activeConversation === convo.contactId
                          ? "bg-white/[0.06]"
                          : "hover:bg-white/[0.03]"
                      )}
                      onClick={() => handleOpenConversation(convo)}
                      data-testid={`conversation-item-${convo.contactId}`}
                    >
                      <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm",
                        getAvatarColor(convo.contactName)
                      )}>
                        {getInitials(convo.contactName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-semibold text-[15px] text-foreground truncate flex items-center gap-1.5" data-testid={`text-contact-name-${convo.contactId}`}>
                            {convo.contactName}
                            {convo.contactRole === "OWNER" && (
                              <Shield className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                            )}
                          </span>
                          <span className="text-xs text-white/35 flex-shrink-0">
                            {formatMessageTime(convo.lastMessageAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] text-white/40 truncate">
                            {convo.lastMessage}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {convo.hasPaymentMessages && (
                              <PoundSterling className="h-3 w-3 text-amber-500" />
                            )}
                            {convo.unreadCount > 0 && (
                              <div className="min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-[11px] font-bold rounded-full flex items-center justify-center" data-testid={`badge-unread-${convo.contactId}`}>
                                {convo.unreadCount}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 flex justify-end">
              <button
                onClick={handleStartNewChat}
                className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 flex items-center justify-center hover:opacity-90 transition-opacity active:scale-95"
                data-testid="button-new-chat"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className={cn(
            "flex-1 min-h-0 flex flex-col",
            !mobileShowThread ? "hidden md:flex" : "flex"
          )}>
            {activeConversation && activeContact ? (
              <>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-background/95 backdrop-blur-sm">
                  <button
                    onClick={() => { setMobileShowThread(false); setActiveConversation(null); }}
                    className="h-9 w-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors md:hidden"
                    data-testid="button-back-to-list"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm",
                    getAvatarColor(activeContact.name)
                  )}>
                    {getInitials(activeContact.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[15px] text-foreground truncate" data-testid="text-active-contact-name">{activeContact.name}</h3>
                    <p className="text-xs text-white/35">
                      {activeContact.role === "OWNER" ? "Super Admin" : "Direct Message"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const convo = conversations.find(c => c.contactId === activeConversation);
                      if (convo) setArchiveDialogContact(convo);
                    }}
                    className="h-9 w-9 rounded-full flex items-center justify-center text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                    data-testid="button-archive-conversation"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>

                <div
                  className="flex-1 min-h-0 overflow-y-auto px-4 py-4"
                  style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
                  data-testid="chat-messages-area"
                >
                  {threadLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-white/30" />
                    </div>
                  ) : threadMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <div className={cn(
                          "h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl",
                          getAvatarColor(activeContact.name)
                        )}>
                          {getInitials(activeContact.name)}
                        </div>
                        <p className="text-sm font-medium text-white/60 mb-1">{activeContact.name}</p>
                        <p className="text-xs text-white/30">Start the conversation</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {hasOlderMessages && (
                        <div className="flex justify-center mb-4">
                          <button
                            onClick={handleLoadOlder}
                            disabled={loadingOlder}
                            className="text-xs text-white/30 hover:text-white/50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                            data-testid="button-load-older"
                          >
                            {loadingOlder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                            Load older messages
                          </button>
                        </div>
                      )}
                      {groupedMessages.map((group, gi) => (
                        <div key={group.date}>
                          <div className="flex justify-center my-5">
                            <span className="text-[11px] text-white/30 px-3 py-1" data-testid={`text-date-separator-${gi}`}>
                              {formatDateSeparator(group.date)}
                            </span>
                          </div>
                          {group.messages.map((msg) => {
                            const isMine = msg.senderId === user.id;
                            const isSystem = msg.messageCategory && msg.messageCategory !== "GENERAL";
                            const systemIcon = msg.messageCategory === "PAYMENT" ? <CreditCard className="h-3 w-3" /> :
                                              msg.messageCategory === "SESSION" ? <CalendarCheck className="h-3 w-3" /> :
                                              isSystem ? <Info className="h-3 w-3" /> : null;
                            const systemLabel = msg.messageCategory === "PAYMENT" ? "Payment" :
                                               msg.messageCategory === "SESSION" ? "Session" :
                                               isSystem ? msg.messageCategory : null;
                            return (
                              <div
                                key={msg.id}
                                className={cn("flex mb-3 items-end gap-2", isMine ? "justify-end" : "justify-start")}
                                data-testid={`message-bubble-${msg.id}`}
                              >
                                {!isMine && (
                                  <div className={cn(
                                    "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 text-[9px] font-bold text-white",
                                    getAvatarColor(activeContact.name)
                                  )}>
                                    {getInitials(activeContact.name)}
                                  </div>
                                )}
                                <div
                                  className={cn(
                                    "max-w-[75%] px-3.5 py-2.5 text-sm",
                                    isMine
                                      ? "bg-white/[0.12] text-white rounded-2xl rounded-br-sm"
                                      : "bg-white/[0.06] text-white/90 rounded-2xl rounded-bl-sm",
                                    isSystem && !isMine && "border-l-2 border-l-amber-500/50",
                                    isSystem && isMine && "ring-1 ring-amber-400/30"
                                  )}
                                >
                                  {isSystem && systemIcon && (
                                    <div className={cn(
                                      "flex items-center gap-1 mb-1 text-[10px] font-medium",
                                      isMine ? "text-white/50" : "text-amber-400/70"
                                    )}>
                                      {systemIcon}
                                      {systemLabel}
                                    </div>
                                  )}
                                  <p className="whitespace-pre-wrap break-words leading-relaxed" data-testid={`text-message-body-${msg.id}`}>{msg.body}</p>
                                  <div className={cn("flex items-center gap-1.5 mt-1", isMine ? "justify-end" : "justify-start")}>
                                    <span className="text-[10px] text-white/30">
                                      {formatChatTime(msg.createdAt)}
                                    </span>
                                    {isMine && (
                                      msg.readAt ? (
                                        <CheckCheck className="h-3.5 w-3.5 text-blue-400/70" />
                                      ) : (
                                        <Check className="h-3 w-3 text-white/30" />
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-white/[0.06] p-3 pb-4 bg-background relative flex-shrink-0">
                  {emojiPickerOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 mx-3 bg-[#1a1a2e] border border-white/[0.08] rounded-xl shadow-2xl p-3 z-20" data-testid="emoji-picker">
                      <div className="grid grid-cols-8 gap-1">
                        {BASIC_EMOJIS.map((emoji, idx) => (
                          <button
                            key={emoji}
                            type="button"
                            className="h-9 w-9 flex items-center justify-center text-lg rounded-lg transition-colors hover:bg-white/[0.08] active:scale-90"
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
                    <button
                      onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white/30 hover:text-white/50 hover:bg-white/[0.06] transition-colors flex-shrink-0"
                      data-testid="button-emoji-picker"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setEmojiPickerOpen(false)}
                        className="w-full h-10 px-4 rounded-full bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/25 outline-none focus:border-white/15 transition-colors"
                        data-testid="input-message"
                      />
                    </div>
                    <button
                      onClick={handleSend}
                      disabled={!messageInput.trim() || sendMutation.isPending}
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                        messageInput.trim()
                          ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
                          : "text-white/20"
                      )}
                      data-testid="button-send-message"
                    >
                      {sendMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <div className="h-20 w-20 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-10 w-10 text-white/15" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1 text-foreground">Your Messages</h3>
                  <p className="text-sm text-white/35 mb-4">Select a conversation or start a new chat</p>
                  <button
                    onClick={handleStartNewChat}
                    className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:opacity-90 transition-opacity"
                    data-testid="button-start-chat-main"
                  >
                    <Plus className="h-4 w-4 mr-2 inline" />
                    New Chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#1a1a2e] border-white/[0.08]" data-testid="dialog-new-chat">
          <DialogHeader>
            <DialogTitle className="text-white">New Chat</DialogTitle>
            <DialogDescription className="text-white/40">Select a club member to start a conversation</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Command className="border border-white/[0.08] rounded-xl bg-white/[0.03]">
              <CommandInput placeholder="Search by name..." data-testid="input-search-contacts" />
              <CommandList className="max-h-[300px]">
                <CommandEmpty className="text-white/40">No contacts found</CommandEmpty>
                <CommandGroup heading="Super Admins">
                  {contacts.filter(c => c.role === "OWNER").map(contact => (
                    <CommandItem
                      key={contact.id}
                      onSelect={() => handleSelectContact(contact)}
                      className="cursor-pointer gap-3"
                      data-testid={`contact-item-${contact.id}`}
                    >
                      <div className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs",
                        getAvatarColor(contact.fullName)
                      )}>
                        {getInitials(contact.fullName)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-white">{contact.fullName}</span>
                        <Shield className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup heading="Members">
                  {contacts.filter(c => c.role !== "OWNER").map(contact => (
                    <CommandItem
                      key={contact.id}
                      onSelect={() => handleSelectContact(contact)}
                      className="cursor-pointer gap-3"
                      data-testid={`contact-item-${contact.id}`}
                    >
                      <div className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs",
                        getAvatarColor(contact.fullName)
                      )}>
                        {getInitials(contact.fullName)}
                      </div>
                      <span className="text-sm font-medium text-white">{contact.fullName}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiveDialogContact} onOpenChange={(open) => { if (!open) setArchiveDialogContact(null); }}>
        <AlertDialogContent className="bg-[#1a1a2e] border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Archive Conversation?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              This will archive your conversation with {archiveDialogContact?.contactName}. You can find it later in archived messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.06] text-white border-white/[0.08] hover:bg-white/[0.1]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiveDialogContact && archiveMutation.mutate(archiveDialogContact.contactId)}
              className="bg-primary text-primary-foreground"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteDialogContact} onOpenChange={(open) => { if (!open) setDeleteDialogContact(null); }}>
        <AlertDialogContent className="bg-[#1a1a2e] border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              This will permanently delete your conversation with {deleteDialogContact?.contactName}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.06] text-white border-white/[0.08] hover:bg-white/[0.1]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialogContact && deleteConversationMutation.mutate(deleteDialogContact.contactId)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={conversationLimitPrompt} onOpenChange={setConversationLimitPrompt}>
        <AlertDialogContent className="bg-[#1a1a2e] border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Conversation Limit</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              You have reached the maximum of 5 conversations. Please delete an existing conversation to start a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.06] text-white border-white/[0.08] hover:bg-white/[0.1]">OK</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </PremiumFeatureGate>
  );
}
