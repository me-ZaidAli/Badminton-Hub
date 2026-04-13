import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Star, Users, Heart, Trash2, Send, Plus, MapPin, Calendar, Loader2,
  ChevronLeft, Clock, Utensils, MessageCircle, Check, X, ArrowLeft, Image, UserPlus, Search, Edit
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

const COUNTRIES = [
  { name: "Bangladesh", flag: "🇧🇩" }, { name: "China", flag: "🇨🇳" }, { name: "India", flag: "🇮🇳" },
  { name: "Indonesia", flag: "🇮🇩" }, { name: "Italy", flag: "🇮🇹" }, { name: "Jamaica", flag: "🇯🇲" },
  { name: "Japan", flag: "🇯🇵" }, { name: "Korea", flag: "🇰🇷" }, { name: "Malaysia", flag: "🇲🇾" },
  { name: "Mexico", flag: "🇲🇽" }, { name: "Nigeria", flag: "🇳🇬" }, { name: "Pakistan", flag: "🇵🇰" },
  { name: "Philippines", flag: "🇵🇭" }, { name: "Thailand", flag: "🇹🇭" }, { name: "Turkey", flag: "🇹🇷" },
  { name: "UK", flag: "🇬🇧" }, { name: "Vietnam", flag: "🇻🇳" }, { name: "Other", flag: "🌍" },
];

const ALLERGENS = ["Nuts", "Dairy", "Gluten", "Shellfish", "Eggs", "Soy", "Fish", "Sesame", "Celery", "Mustard", "Lupin", "Sulphites"];

export default function CommunityEventDetail() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/community/event/:id");
  const eventId = Number(params?.id);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [showAddFood, setShowAddFood] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [newPostContent, setNewPostContent] = useState("");

  const [foodStep, setFoodStep] = useState(1);
  const [foodForm, setFoodForm] = useState({
    dishName: "", country: "", countryFlag: "", category: "",
    isHalal: false, isVegetarian: false, isVegan: false, containsAlcohol: false,
    allergens: [] as string[], ingredients: "", imageUrl: "",
  });

  const { data: adminClubs } = useMyAdminClubs(!!user);

  const { data: event, isLoading } = useQuery<any>({
    queryKey: ["/api/community/events", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/community/events/${eventId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!eventId,
  });

  const { data: foodItems = [] } = useQuery<any[]>({
    queryKey: ["/api/community/events", eventId, "food"],
    queryFn: async () => {
      const res = await fetch(`/api/community/events/${eventId}/food`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!eventId && !!event?.isFoodEnabled,
  });

  const { data: eventPosts = [] } = useQuery<any[]>({
    queryKey: ["/api/community/posts", { clubId: event?.clubId, eventId }],
    queryFn: async () => {
      const res = await fetch(`/api/community/posts?clubId=${event?.clubId}&eventId=${eventId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!event?.clubId,
  });

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ["/api/community/reviews", { eventId }],
    queryFn: async () => {
      const res = await fetch(`/api/community/reviews?eventId=${eventId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!eventId,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/community/events/${eventId}/join`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/events", eventId] });
      toast({ title: "Joined!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/community/events/${eventId}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/events", eventId] });
      toast({ title: "Left event" });
    },
  });

  const addFoodMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/community/food", {
        eventId,
        clubId: event.clubId,
        ...foodForm,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/events", eventId, "food"] });
      setShowAddFood(false);
      setFoodStep(1);
      setFoodForm({ dishName: "", country: "", countryFlag: "", category: "", isHalal: false, isVegetarian: false, isVegan: false, containsAlcohol: false, allergens: [], ingredients: "", imageUrl: "" });
      toast({ title: "Dish Added!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const interestMutation = useMutation({
    mutationFn: async (foodId: number) => {
      const res = await apiRequest("POST", `/api/community/food/${foodId}/interest`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/events", eventId, "food"] });
    },
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/community/reviews", {
        clubId: event.clubId,
        eventId,
        rating: reviewRating,
        comment: reviewComment || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/events", eventId] });
      setShowReview(false);
      setReviewRating(0);
      setReviewComment("");
      toast({ title: "Review Submitted" });
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/community/posts", {
        clubId: event.clubId,
        eventId,
        content: newPostContent,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      setNewPostContent("");
      toast({ title: "Posted!" });
    },
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

  const addUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/community/events/${eventId}/add-user`, { userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/events", eventId] });
      toast({ title: "Member Added" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/community/events/${eventId}/remove-user/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/events", eventId] });
      toast({ title: "Member Removed" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!event) {
    return <div className="text-center py-20 text-muted-foreground">Event not found</div>;
  }

  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN" ||
    (adminClubs && adminClubs.some((c: any) => c.id === event?.clubId));

  const tabList = ["overview", "people"];
  if (event.isFoodEnabled) tabList.push("food");
  tabList.push("feed");

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="relative h-52 sm:h-64 bg-gradient-to-br from-indigo-600 to-purple-700">
        {event.coverImage && (
          <img src={event.coverImage} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <button
          className="absolute top-4 left-4 bg-black/30 backdrop-blur-sm rounded-full p-2 text-white"
          onClick={() => navigate("/community")}
          data-testid="btn-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {isAdmin && (
          <button
            className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm rounded-full p-2 text-white"
            onClick={() => setShowEditEvent(true)}
            data-testid="btn-edit-event"
          >
            <Edit className="h-5 w-5" />
          </button>
        )}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-white font-bold text-xl sm:text-2xl">{event.title}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {event.rating.count > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-white text-sm font-medium">{event.rating.avg}</span>
                <span className="text-white/60 text-xs">({event.rating.count})</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-white/70" />
              <span className="text-white text-sm">{event.participantCount} joined</span>
            </div>
            {event.eventDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-white/70" />
                <span className="text-white text-sm">{format(new Date(event.eventDate), "EEE, d MMM · HH:mm")}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-white/70" />
                <span className="text-white text-sm">{event.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 relative z-10">
        <Card className="rounded-2xl shadow-lg border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {(event.participants || []).slice(0, 8).map((p: any) => (
                  <Avatar key={p.id} className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="text-[10px]">{getInitials(p.fullName || "?")}</AvatarFallback>
                  </Avatar>
                ))}
                {event.participantCount > 8 && (
                  <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-[10px] font-medium">+{event.participantCount - 8}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowReview(true)} data-testid="btn-review">
                  <Star className="h-3.5 w-3.5 mr-1" /> Review
                </Button>
                {event.isJoined ? (
                  <Button size="sm" variant="outline" onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending} data-testid="btn-leave">
                    Leave
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending} data-testid="btn-join">
                    {joinMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                    Join
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            {tabList.map(t => (
              <TabsTrigger key={t} value={t} className="flex-1 capitalize text-xs" data-testid={`tab-${t}`}>{t}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {event.description && (
              <Card className="rounded-xl border-border/40">
                <CardContent className="p-4">
                  <p className="text-sm whitespace-pre-wrap">{event.description}</p>
                </CardContent>
              </Card>
            )}
            <Card className="rounded-xl border-border/40">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm">Details</h3>
                {event.eventDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {format(new Date(event.eventDate), "EEEE, d MMMM yyyy · HH:mm")}
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {event.location}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {event.participantCount}{event.maxParticipants ? ` / ${event.maxParticipants}` : ""} participants
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Created by {event.creatorName}
                </div>
              </CardContent>
            </Card>

            {reviews.length > 0 && (
              <Card className="rounded-xl border-border/40">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm">Reviews ({reviews.length})</h3>
                  {reviews.slice(0, 5).map((r: any) => (
                    <div key={r.id} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-[10px]">{getInitials(r.authorName || "?")}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{r.authorName}</span>
                          <StarRating rating={r.rating} />
                        </div>
                        {r.comment && <p className="text-xs text-muted-foreground mt-0.5">{r.comment}</p>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="people" className="mt-4 space-y-4">
            {isAdmin && (
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{event.participantCount} Participant{event.participantCount !== 1 ? "s" : ""}</h3>
                <Button size="sm" onClick={() => setShowAddUser(true)} data-testid="btn-add-user">
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Members
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(event.participants || []).map((p: any) => (
                <Card key={p.id} className="rounded-xl border-border/40" data-testid={`participant-${p.id}`}>
                  <CardContent className="p-4 flex flex-col items-center text-center relative">
                    {isAdmin && (
                      <Button
                        size="icon" variant="ghost"
                        className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeUserMutation.mutate(p.userId)}
                        data-testid={`remove-user-${p.userId}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Avatar className="h-14 w-14 mb-2">
                      <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">{getInitials(p.fullName || "?")}</AvatarFallback>
                    </Avatar>
                    <p className="font-medium text-sm truncate w-full">{p.fullName}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {(!event.participants || event.participants.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-8">No participants yet. Be the first to join!</p>
            )}
          </TabsContent>

          {event.isFoodEnabled && (
            <TabsContent value="food" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-amber-500" /> Dishes ({foodItems.length})
                </h3>
                <Button size="sm" onClick={() => setShowAddFood(true)} data-testid="btn-add-food">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Dish
                </Button>
              </div>

              {foodItems.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No dishes shared yet. Add yours!</p>
              ) : (
                <div className="space-y-3">
                  {foodItems.map((food: any) => (
                    <Card key={food.id} className="rounded-2xl shadow-md border-border/40 overflow-hidden" data-testid={`food-card-${food.id}`}>
                      {food.imageUrl && (
                        <div className="h-48 relative">
                          <img src={food.imageUrl} alt={food.dishName} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-base flex items-center gap-2">
                              {food.countryFlag && <span>{food.countryFlag}</span>}
                              {food.dishName}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[8px]">{getInitials(food.creatorName || "?")}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">{food.creatorName}</span>
                            </div>
                          </div>
                          {food.rating.count > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              <span className="text-sm font-medium">{food.rating.avg}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                          {food.isHalal && <Badge variant="secondary" className="text-[10px]">Halal</Badge>}
                          {food.isVegetarian && <Badge variant="secondary" className="text-[10px]">Vegetarian</Badge>}
                          {food.isVegan && <Badge variant="secondary" className="text-[10px]">Vegan</Badge>}
                          {food.containsAlcohol && <Badge variant="destructive" className="text-[10px]">Alcohol</Badge>}
                          {food.allergens && food.allergens.length > 0 && food.allergens.map((a: string) => (
                            <Badge key={a} variant="outline" className="text-[10px] text-amber-600 border-amber-300">{a}</Badge>
                          ))}
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                          <button
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${food.isInterested ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" : "bg-muted/50 text-muted-foreground hover:bg-amber-50 hover:text-amber-600"}`}
                            onClick={() => interestMutation.mutate(food.id)}
                            data-testid={`btn-bite-${food.id}`}
                          >
                            <Utensils className="h-3.5 w-3.5" />
                            {food.isInterested ? "Want a bite ✓" : "I want a bite"}
                          </button>
                          {food.interestCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {food.interestCount} {food.interestCount === 1 ? "person wants" : "people want"} a bite
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="feed" className="mt-4 space-y-3">
            <Card className="rounded-xl border-border/40">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Textarea
                    value={newPostContent}
                    onChange={e => setNewPostContent(e.target.value)}
                    placeholder="Share something about this event..."
                    className="min-h-[60px] text-sm"
                    data-testid="input-event-post"
                  />
                  <Button
                    size="sm" className="shrink-0 h-full"
                    onClick={() => createPostMutation.mutate()}
                    disabled={!newPostContent.trim() || createPostMutation.isPending}
                    data-testid="btn-event-post"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {eventPosts.map((post: any) => (
              <Card key={post.id} className="rounded-xl border-border/40" data-testid={`event-post-${post.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs">{getInitials(post.authorName || "?")}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{post.authorName}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(post.createdAt), "d MMM, HH:mm")}</p>
                      <p className="text-sm mt-2">{post.content}</p>
                      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/30">
                        <button
                          className={`flex items-center gap-1 text-xs ${post.isLiked ? "text-red-500" : "text-muted-foreground"}`}
                          onClick={() => likeMutation.mutate(post.id)}
                        >
                          <Heart className={`h-3.5 w-3.5 ${post.isLiked ? "fill-red-500" : ""}`} />
                          {post.likeCount > 0 && <span>{post.likeCount}</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {eventPosts.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">No posts yet for this event.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showAddFood} onOpenChange={setShowAddFood}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Your Dish</DialogTitle>
            <DialogDescription>Step {foodStep} of 6</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {foodStep === 1 && (
              <>
                <div>
                  <Label>Dish Name</Label>
                  <Input value={foodForm.dishName} onChange={e => setFoodForm(p => ({ ...p, dishName: e.target.value }))} placeholder="Chicken Biryani" data-testid="input-dish-name" />
                </div>
                <div>
                  <Label>Country of Origin</Label>
                  <Select value={foodForm.country} onValueChange={v => {
                    const c = COUNTRIES.find(c => c.name === v);
                    setFoodForm(p => ({ ...p, country: v, countryFlag: c?.flag || "" }));
                  }}>
                    <SelectTrigger data-testid="select-country"><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.name} value={c.name}>{c.flag} {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {foodStep === 2 && (
              <div>
                <Label>Category</Label>
                <Select value={foodForm.category} onValueChange={v => setFoodForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger data-testid="select-food-cat"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="main">Main Course</SelectItem>
                    <SelectItem value="side">Side Dish</SelectItem>
                    <SelectItem value="dessert">Dessert</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                    <SelectItem value="drink">Drink</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {foodStep === 3 && (
              <div className="space-y-4">
                <Label>Dietary Info</Label>
                {[
                  { key: "isHalal", label: "Halal" },
                  { key: "isVegetarian", label: "Vegetarian" },
                  { key: "isVegan", label: "Vegan" },
                  { key: "containsAlcohol", label: "Contains Alcohol" },
                ].map(d => (
                  <div key={d.key} className="flex items-center justify-between">
                    <Label>{d.label}</Label>
                    <Switch
                      checked={(foodForm as any)[d.key]}
                      onCheckedChange={v => setFoodForm(p => ({ ...p, [d.key]: v }))}
                      data-testid={`switch-${d.key}`}
                    />
                  </div>
                ))}
              </div>
            )}
            {foodStep === 4 && (
              <div>
                <Label>Allergens</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ALLERGENS.map(a => (
                    <button
                      key={a}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${foodForm.allergens.includes(a) ? "bg-amber-100 dark:bg-amber-900/30 border-amber-400 text-amber-700 dark:text-amber-300" : "border-border bg-background hover:bg-muted"}`}
                      onClick={() => setFoodForm(p => ({
                        ...p,
                        allergens: p.allergens.includes(a) ? p.allergens.filter(x => x !== a) : [...p.allergens, a],
                      }))}
                      data-testid={`chip-allergen-${a}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {foodStep === 5 && (
              <div>
                <Label>Ingredients</Label>
                <Textarea
                  value={foodForm.ingredients}
                  onChange={e => setFoodForm(p => ({ ...p, ingredients: e.target.value }))}
                  placeholder="List the main ingredients..."
                  className="min-h-[100px]"
                  data-testid="input-ingredients"
                />
              </div>
            )}
            {foodStep === 6 && (
              <div>
                <Label>Image URL</Label>
                <Input
                  value={foodForm.imageUrl}
                  onChange={e => setFoodForm(p => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="https://..."
                  data-testid="input-food-image"
                />
                {foodForm.imageUrl && (
                  <div className="mt-3 rounded-xl overflow-hidden">
                    <img src={foodForm.imageUrl} alt="Preview" className="w-full h-40 object-cover" />
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between gap-2">
            {foodStep > 1 && (
              <Button variant="outline" onClick={() => setFoodStep(s => s - 1)} data-testid="btn-food-prev">
                Back
              </Button>
            )}
            <div className="flex-1" />
            {foodStep < 6 ? (
              <Button
                onClick={() => setFoodStep(s => s + 1)}
                disabled={foodStep === 1 && !foodForm.dishName.trim()}
                data-testid="btn-food-next"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={() => addFoodMutation.mutate()}
                disabled={!foodForm.dishName.trim() || !foodForm.ingredients.trim() || addFoodMutation.isPending}
                data-testid="btn-food-submit"
              >
                {addFoodMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Dish
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate This Event</DialogTitle>
            <DialogDescription>Share your experience</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <StarRating rating={reviewRating} onRate={setReviewRating} size="md" />
            </div>
            <Textarea
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              placeholder="Write a comment (optional)"
              data-testid="input-review-comment"
            />
          </div>
          <DialogFooter>
            <Button onClick={() => submitReview.mutate()} disabled={reviewRating === 0 || submitReview.isPending} data-testid="btn-submit-review">
              {submitReview.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isAdmin && event && (
        <AddMembersDialog
          open={showAddUser}
          onOpenChange={setShowAddUser}
          clubId={event.clubId}
          existingUserIds={(event.participants || []).map((p: any) => p.userId)}
          onAdd={(userId: number) => addUserMutation.mutate(userId)}
          isPending={addUserMutation.isPending}
        />
      )}

      {isAdmin && event && (
        <EditCommunityEventDialog
          open={showEditEvent}
          onOpenChange={setShowEditEvent}
          event={event}
          eventId={eventId}
        />
      )}
    </div>
  );
}

function AddMembersDialog({ open, onOpenChange, clubId, existingUserIds, onAdd, isPending }: {
  open: boolean; onOpenChange: (v: boolean) => void; clubId: number;
  existingUserIds: number[]; onAdd: (userId: number) => void; isPending: boolean;
}) {
  const [search, setSearch] = useState("");

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/clubs", clubId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/members`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: open && !!clubId,
  });

  const available = members.filter((m: any) => {
    const userId = m.userId;
    if (!userId || existingUserIds.includes(userId)) return false;
    if (!search) return true;
    const name = (m.user?.fullName || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Add Members</DialogTitle>
          <DialogDescription>Select club members to add to this event</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search members..."
            className="pl-9"
            data-testid="input-search-members"
          />
        </div>
        <div className="space-y-1 max-h-[50vh] overflow-y-auto">
          {available.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              {members.length === 0 ? "No club members found" : "All members already added"}
            </p>
          ) : (
            available.map((m: any) => {
              const userId = m.userId;
              const name = m.user?.fullName || "Unknown";
              return (
                <div key={userId} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{name}</p>
                      {m.grade && <p className="text-[10px] text-muted-foreground">Grade: {m.grade}</p>}
                    </div>
                  </div>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => onAdd(userId)}
                    disabled={isPending}
                    data-testid={`btn-add-member-${userId}`}
                  >
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                    Add
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditCommunityEventDialog({ open, onOpenChange, event, eventId }: {
  open: boolean; onOpenChange: (v: boolean) => void; event: any; eventId: number;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: event.title || "",
    description: event.description || "",
    eventType: event.eventType || "social",
    eventDate: event.eventDate ? format(new Date(event.eventDate), "yyyy-MM-dd'T'HH:mm") : "",
    location: event.location || "",
    maxParticipants: String(event.maxParticipants || ""),
    coverImage: event.coverImage || "",
    isFoodEnabled: event.isFoodEnabled || false,
    isFeatured: event.isFeatured || false,
    tags: (event.tags || []).join(", "),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        title: form.title,
        description: form.description || null,
        eventType: form.eventType,
        location: form.location || null,
        coverImage: form.coverImage || null,
        isFoodEnabled: form.isFoodEnabled,
        isFeatured: form.isFeatured,
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null,
        tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : null,
      };
      if (form.eventDate) body.eventDate = form.eventDate;
      const res = await apiRequest("PATCH", `/api/community/events/${eventId}`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/events"] });
      onOpenChange(false);
      toast({ title: "Event Updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>Update event details and cover image</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} data-testid="input-edit-title" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} data-testid="input-edit-desc" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.eventType} onValueChange={v => setForm(p => ({ ...p, eventType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="tournament">Tournament</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date & Time</Label>
              <Input type="datetime-local" value={form.eventDate} onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))} data-testid="input-edit-date" />
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} data-testid="input-edit-location" />
          </div>
          <div>
            <Label>Max Participants</Label>
            <Input type="number" value={form.maxParticipants} onChange={e => setForm(p => ({ ...p, maxParticipants: e.target.value }))} placeholder="Unlimited" />
          </div>
          <div>
            <Label className="flex items-center gap-2"><Image className="h-4 w-4" /> Cover Image URL</Label>
            <Input value={form.coverImage} onChange={e => setForm(p => ({ ...p, coverImage: e.target.value }))} placeholder="https://..." data-testid="input-edit-cover" />
            {form.coverImage && (
              <div className="mt-2 rounded-lg overflow-hidden border border-border/40 h-32">
                <img src={form.coverImage} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <div>
            <Label>Tags (comma separated)</Label>
            <Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="fun, social, weekend" />
          </div>
          <div className="flex items-center justify-between">
            <Label>Enable Food Experience</Label>
            <Switch checked={form.isFoodEnabled} onCheckedChange={v => setForm(p => ({ ...p, isFoodEnabled: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Featured Event</Label>
            <Switch checked={form.isFeatured} onCheckedChange={v => setForm(p => ({ ...p, isFeatured: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.title.trim() || mutation.isPending} data-testid="btn-save-edit">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
