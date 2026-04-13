import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Flame, Utensils, Users, PartyPopper, MessageCircle, Star, Heart, Trash2, Send,
  Plus, MapPin, Calendar, Loader2, Image, ChevronRight, Sparkles, Clock, Settings,
  Eye, EyeOff, Check, X, Shield
} from "lucide-react";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function StarRating({ rating, onRate, size = "sm" }: { rating: number; onRate?: (r: number) => void; size?: "sm" | "md" }) {
  const sz = size === "md" ? "h-6 w-6" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} onClick={() => onRate?.(i)} disabled={!onRate} className="disabled:cursor-default" data-testid={`star-${i}`}>
          <Star className={`${sz} ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} transition-colors`} />
        </button>
      ))}
    </div>
  );
}

export default function CommunityHub() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("all");
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [newPost, setNewPost] = useState("");

  const [eventForm, setEventForm] = useState({
    title: "", description: "", eventType: "social", location: "",
    maxParticipants: "", isFoodEnabled: false, isFeatured: false,
    coverImage: "", tags: "",
    eventDate: "",
  });

  const { data: clubs } = useQuery<any[]>({
    queryKey: ["/api/my-clubs"],
    enabled: !!user,
  });

  useEffect(() => {
    if (clubs && clubs.length > 0 && !selectedClubId) {
      setSelectedClubId(String(clubs[0].id));
    }
  }, [clubs]);

  const clubId = selectedClubId ? Number(selectedClubId) : null;

  const { data: events = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/community/events", { clubId }],
    queryFn: async () => {
      const res = await fetch(`/api/community/events?clubId=${clubId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!clubId,
  });

  const { data: teamEventsData = [] } = useQuery<any[]>({
    queryKey: ["/api/team-events", { clubId }],
    queryFn: async () => {
      const res = await fetch(`/api/team-events?clubId=${clubId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!clubId,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<any[]>({
    queryKey: ["/api/community/posts", { clubId }],
    queryFn: async () => {
      const res = await fetch(`/api/community/posts?clubId=${clubId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!clubId,
  });

  const { data: adminClubs } = useMyAdminClubs(!!user);
  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN" ||
    (adminClubs && adminClubs.some((c: any) => c.id === clubId));

  const createEventMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/community/events", {
        clubId,
        title: eventForm.title,
        description: eventForm.description,
        eventType: eventForm.eventType,
        location: eventForm.location || null,
        maxParticipants: eventForm.maxParticipants ? Number(eventForm.maxParticipants) : null,
        isFoodEnabled: eventForm.isFoodEnabled,
        isFeatured: eventForm.isFeatured,
        coverImage: eventForm.coverImage || null,
        tags: eventForm.tags ? eventForm.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
        eventDate: eventForm.eventDate ? new Date(eventForm.eventDate).toISOString() : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/events"] });
      setShowCreateEvent(false);
      setEventForm({ title: "", description: "", eventType: "social", location: "", maxParticipants: "", isFoodEnabled: false, isFeatured: false, coverImage: "", tags: "", eventDate: "" });
      toast({ title: "Event Created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/community/posts", {
        clubId,
        content: newPost,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      setNewPost("");
      setShowCreatePost(false);
      toast({ title: "Posted!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await apiRequest("POST", `/api/community/posts/${postId}/like`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      await apiRequest("DELETE", `/api/community/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      toast({ title: "Post Deleted" });
    },
  });

  const normalizedTeamEvents = teamEventsData.map((te: any) => ({
    id: `team-${te.id}`,
    _teamEventId: te.id,
    _isTeamEvent: true,
    title: te.title,
    description: te.description,
    eventType: "team",
    eventDate: te.date,
    location: te.location || te.meetingPoint,
    coverImage: null,
    tags: [te.eventType?.toLowerCase() || "social"],
    isFoodEnabled: false,
    isFeatured: false,
    isVisible: true,
    participantCount: te.signupCount || 0,
    maxParticipants: te.maxParticipants,
    rating: { avg: 0, count: 0 },
    creatorName: te.creatorName || "Unknown",
    status: te.status,
  }));

  const allEvents = [...events, ...normalizedTeamEvents];
  const featured = events.filter((e: any) => e.isFeatured);
  const foodEvents = events.filter((e: any) => e.isFoodEnabled);
  const communityTeamEvents = events.filter((e: any) => e.eventType === "team");
  const teamActivities = [...communityTeamEvents, ...normalizedTeamEvents];
  const socialEvents = events.filter((e: any) => e.eventType === "social");

  const eventTypeColors: Record<string, string> = {
    social: "from-pink-500 to-rose-600",
    team: "from-blue-500 to-indigo-600",
    food: "from-amber-500 to-orange-600",
    tournament: "from-emerald-500 to-teal-600",
  };

  const renderEventCard = (event: any, featured = false) => (
    <div
      key={event.id}
      className={`group relative overflow-hidden rounded-2xl shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${featured ? "min-w-[300px] sm:min-w-[340px]" : "w-full"}`}
      onClick={() => event._isTeamEvent ? navigate("/sessions?tab=team-events") : navigate(`/community/event/${event.id}`)}
      data-testid={`event-card-${event.id}`}
    >
      <div className={`${featured ? "h-48 sm:h-56" : "h-40 sm:h-48"} bg-gradient-to-br ${eventTypeColors[event.eventType] || "from-slate-600 to-slate-800"} relative`}>
        {event.coverImage && (
          <img src={event.coverImage} alt={event.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {(event.tags && event.tags.length > 0 ? event.tags : [event.eventType]).map((tag: string, i: number) => (
            <Badge key={i} className="text-[10px] bg-white/20 backdrop-blur-sm border-0 text-white">
              {tag}
            </Badge>
          ))}
          {event.isFoodEnabled && (
            <Badge className="text-[10px] bg-amber-500/80 backdrop-blur-sm border-0 text-white">
              <Utensils className="h-2.5 w-2.5 mr-0.5" /> Food
            </Badge>
          )}
          {event._isTeamEvent && (
            <Badge className="text-[10px] bg-blue-500/80 backdrop-blur-sm border-0 text-white">
              <Users className="h-2.5 w-2.5 mr-0.5" /> Team Event
            </Badge>
          )}
          {event._isTeamEvent && event.status && (
            <Badge className={`text-[10px] backdrop-blur-sm border-0 text-white ${event.status === "UPCOMING" ? "bg-green-500/80" : event.status === "COMPLETED" ? "bg-gray-500/80" : "bg-yellow-500/80"}`}>
              {event.status}
            </Badge>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-bold text-sm sm:text-base truncate">{event.title}</h3>
          <div className="flex items-center gap-3 mt-1">
            {event.rating.count > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-white/90 text-xs">{event.rating.avg}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-white/70" />
              <span className="text-white/90 text-xs">{event.participantCount} joined</span>
            </div>
            {event.eventDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-white/70" />
                <span className="text-white/90 text-xs">{format(new Date(event.eventDate), "d MMM")}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPostCard = (post: any) => (
    <Card key={post.id} className="rounded-2xl shadow-md border-border/40 overflow-hidden" data-testid={`post-card-${post.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
              {getInitials(post.authorName || "?")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{post.authorName}</p>
                <p className="text-[10px] text-muted-foreground">{format(new Date(post.createdAt), "d MMM, HH:mm")}</p>
              </div>
              {(post.userId === user?.id || isAdmin) && (
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={(e) => { e.stopPropagation(); deletePostMutation.mutate(post.id); }} data-testid={`delete-post-${post.id}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <p className="text-sm mt-2 whitespace-pre-wrap">{post.content}</p>
            {post.images && post.images.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
                {post.images.map((img: string, i: number) => (
                  <img key={i} src={img} alt="" className="w-full h-32 object-cover" loading="lazy" />
                ))}
              </div>
            )}
            <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/30">
              <button
                className={`flex items-center gap-1.5 text-xs transition-colors ${post.isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
                onClick={() => likeMutation.mutate(post.id)}
                data-testid={`like-post-${post.id}`}
              >
                <Heart className={`h-4 w-4 ${post.isLiked ? "fill-red-500" : ""}`} />
                {post.likeCount > 0 && <span>{post.likeCount}</span>}
              </button>
              <PostComments postId={post.id} commentCount={post.commentCount} userId={user?.id} isAdmin={isAdmin} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!clubs || clubs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <Sparkles className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold">Join a club to access Community Hub</h2>
        <p className="text-sm text-muted-foreground mt-1">The Community Hub is where your club's social life happens.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Community Hub
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {(clubs && clubs.length > 1) && (
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger className="w-[140px] h-8 text-xs" data-testid="select-club">
                  <SelectValue placeholder="Select club" />
                </SelectTrigger>
                <SelectContent>
                  {clubs.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {isAdmin && (
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowAdmin(true)} data-testid="btn-admin">
                <Shield className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6 mt-4">
        {featured.length > 0 && (
          <section>
            <h2 className="text-base font-bold flex items-center gap-2 mb-3">
              <Flame className="h-4 w-4 text-orange-500" /> Featured
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
              {featured.map((e: any) => renderEventCard(e, true))}
            </div>
          </section>
        )}

        {foodEvents.length > 0 && (
          <section>
            <h2 className="text-base font-bold flex items-center gap-2 mb-3">
              <Utensils className="h-4 w-4 text-amber-500" /> Food Experiences
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {foodEvents.slice(0, 4).map((e: any) => renderEventCard(e))}
            </div>
          </section>
        )}

        {teamActivities.length > 0 && (
          <section>
            <h2 className="text-base font-bold flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-blue-500" /> Team Activities
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teamActivities.slice(0, 4).map((e: any) => renderEventCard(e))}
            </div>
          </section>
        )}

        {socialEvents.length > 0 && (
          <section>
            <h2 className="text-base font-bold flex items-center gap-2 mb-3">
              <PartyPopper className="h-4 w-4 text-pink-500" /> Social Moments
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {socialEvents.slice(0, 4).map((e: any) => renderEventCard(e))}
            </div>
          </section>
        )}

        {events.length === 0 && teamActivities.length === 0 && !eventsLoading && (
          <div className="text-center py-10">
            <PartyPopper className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No community events yet.</p>
            {isAdmin && <p className="text-xs text-muted-foreground mt-1">Create your first event to get started!</p>}
          </div>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-indigo-500" /> Community Feed
            </h2>
          </div>

          <Card className="rounded-2xl shadow-sm border-border/40 mb-4" data-testid="create-post-area">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {getInitials(user?.fullName || "?")}
                  </AvatarFallback>
                </Avatar>
                <button
                  className="flex-1 text-left text-sm text-muted-foreground bg-muted/50 rounded-full px-4 py-2 hover:bg-muted transition-colors"
                  onClick={() => setShowCreatePost(true)}
                  data-testid="btn-open-create-post"
                >
                  Share something with your club...
                </button>
              </div>
            </CardContent>
          </Card>

          {postsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-3">
              {posts.map((post: any) => renderPostCard(post))}
              {posts.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">No posts yet. Be the first to share!</p>
              )}
            </div>
          )}
        </section>
      </div>

      {isAdmin && (
        <Button
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-xl z-30"
          onClick={() => setShowCreateEvent(true)}
          data-testid="btn-create-event-fab"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Community Event</DialogTitle>
            <DialogDescription>Set up a new activity for your club</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))} placeholder="Summer BBQ Night" data-testid="input-event-title" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))} placeholder="What's this event about?" data-testid="input-event-desc" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={eventForm.eventType} onValueChange={v => setEventForm(p => ({ ...p, eventType: v }))}>
                  <SelectTrigger data-testid="select-event-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="team">Team Activity</SelectItem>
                    <SelectItem value="food">Food Event</SelectItem>
                    <SelectItem value="tournament">Tournament</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date & Time</Label>
                <Input type="datetime-local" value={eventForm.eventDate} onChange={e => setEventForm(p => ({ ...p, eventDate: e.target.value }))} data-testid="input-event-date" />
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={eventForm.location} onChange={e => setEventForm(p => ({ ...p, location: e.target.value }))} placeholder="Club hall, Park, etc." data-testid="input-event-location" />
            </div>
            <div>
              <Label>Cover Image URL</Label>
              <Input value={eventForm.coverImage} onChange={e => setEventForm(p => ({ ...p, coverImage: e.target.value }))} placeholder="https://..." data-testid="input-event-image" />
            </div>
            <div>
              <Label>Tags (comma separated)</Label>
              <Input value={eventForm.tags} onChange={e => setEventForm(p => ({ ...p, tags: e.target.value }))} placeholder="food, social, outdoor" data-testid="input-event-tags" />
            </div>
            <div>
              <Label>Max Participants (optional)</Label>
              <Input type="number" value={eventForm.maxParticipants} onChange={e => setEventForm(p => ({ ...p, maxParticipants: e.target.value }))} placeholder="Leave blank for unlimited" data-testid="input-event-max" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Enable Food Experience</Label>
              <Switch checked={eventForm.isFoodEnabled} onCheckedChange={v => setEventForm(p => ({ ...p, isFoodEnabled: v }))} data-testid="switch-food" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Featured Event</Label>
              <Switch checked={eventForm.isFeatured} onCheckedChange={v => setEventForm(p => ({ ...p, isFeatured: v }))} data-testid="switch-featured" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => createEventMutation.mutate()} disabled={!eventForm.title.trim() || createEventMutation.isPending} data-testid="btn-create-event">
              {createEventMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
            <DialogDescription>Share something with your club community</DialogDescription>
          </DialogHeader>
          <Textarea
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            placeholder="What's on your mind?"
            className="min-h-[120px]"
            data-testid="input-post-content"
          />
          <DialogFooter>
            <Button onClick={() => createPostMutation.mutate()} disabled={!newPost.trim() || createPostMutation.isPending} data-testid="btn-create-post">
              {createPostMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminPanel open={showAdmin} onOpenChange={setShowAdmin} clubId={clubId} events={events} />
    </div>
  );
}

function PostComments({ postId, commentCount, userId, isAdmin }: { postId: number; commentCount: number; userId?: number; isAdmin: boolean }) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: comments = [] } = useQuery<any[]>({
    queryKey: ["/api/community/posts", postId, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/community/posts/${postId}/comments`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: showComments,
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/community/posts/${postId}/comments`, { content: newComment });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", postId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      setNewComment("");
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/community/comments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", postId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
    },
  });

  return (
    <div>
      <button
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        onClick={() => setShowComments(!showComments)}
        data-testid={`toggle-comments-${postId}`}
      >
        <MessageCircle className="h-4 w-4" />
        {commentCount > 0 && <span>{commentCount}</span>}
      </button>
      {showComments && (
        <div className="mt-3 space-y-2">
          {comments.map((c: any) => (
            <div key={c.id} className="flex items-start gap-2 bg-muted/30 rounded-lg p-2">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="text-[9px]">{getInitials(c.authorName || "?")}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{c.authorName}</p>
                <p className="text-xs text-muted-foreground">{c.content}</p>
              </div>
              {(c.userId === userId || isAdmin) && (
                <button onClick={() => deleteComment.mutate(c.id)} className="text-muted-foreground hover:text-destructive shrink-0" data-testid={`delete-comment-${c.id}`}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="h-8 text-xs"
              onKeyDown={e => { if (e.key === "Enter" && newComment.trim()) addComment.mutate(); }}
              data-testid={`input-comment-${postId}`}
            />
            <Button size="sm" className="h-8 px-3" onClick={() => addComment.mutate()} disabled={!newComment.trim() || addComment.isPending} data-testid={`btn-comment-${postId}`}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPanel({ open, onOpenChange, clubId, events }: { open: boolean; onOpenChange: (v: boolean) => void; clubId: number | null; events: any[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleVisibility = useMutation({
    mutationFn: async ({ eventId, isVisible }: { eventId: number; isVisible: boolean }) => {
      const res = await apiRequest("PATCH", `/api/community/events/${eventId}`, { isVisible });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/events"] });
      toast({ title: "Updated" });
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ eventId, isFeatured }: { eventId: number; isFeatured: boolean }) => {
      const res = await apiRequest("PATCH", `/api/community/events/${eventId}`, { isFeatured });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/events"] });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: number) => {
      await apiRequest("DELETE", `/api/community/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/events"] });
      toast({ title: "Event Deleted" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Admin Panel</DialogTitle>
          <DialogDescription>Manage community events and content</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Activity Control</h3>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <div className="space-y-2">
              {events.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{e.eventType}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => toggleFeatured.mutate({ eventId: e.id, isFeatured: !e.isFeatured })}
                      title={e.isFeatured ? "Unfeature" : "Feature"}
                    >
                      <Star className={`h-3.5 w-3.5 ${e.isFeatured ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => toggleVisibility.mutate({ eventId: e.id, isVisible: !e.isVisible })}
                      title={e.isVisible ? "Hide" : "Show"}
                    >
                      {e.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => deleteEvent.mutate(e.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
