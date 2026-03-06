import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import {
  Megaphone, Plus, Archive, ArchiveRestore, Trash2, Pencil, Image as ImageIcon,
  Link as LinkIcon, Loader2, ExternalLink, Calendar, User, Building2, Eye,
  MessageCircle, SmilePlus, Send, Reply, ChevronDown, ChevronUp, X
} from "lucide-react";

interface AnnouncementWithAuthor {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  clubId: number | null;
  visibleTo: string;
  authorId: number;
  createdAt: string;
  author: { id: number; fullName: string; role: string; profilePictureUrl?: string };
}

interface ReactionGroup {
  emoji: string;
  count: number;
  userIds: number[];
}

interface CommentWithUser {
  id: number;
  announcementId: number;
  userId: number;
  content: string;
  parentId: number | null;
  createdAt: string;
  user: { id: number; fullName: string; profilePictureUrl: string | null };
}

export default function Announcements() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementWithAuthor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const { data: announcements, isLoading } = useQuery<AnnouncementWithAuthor[]>({
    queryKey: ["/api/announcements"],
  });

  const { data: archivedIds } = useQuery<number[]>({
    queryKey: ["/api/announcements/my-archives"],
    enabled: !!user,
  });

  const { data: clubs } = useQuery<any[]>({
    queryKey: ["/api/clubs"],
  });

  const archivedSet = new Set(archivedIds || []);

  const activeAnnouncements = (announcements || []).filter(a => !archivedSet.has(a.id));
  const archivedAnnouncements = (announcements || []).filter(a => archivedSet.has(a.id));
  const displayList = showArchived ? archivedAnnouncements : activeAnnouncements;

  const archiveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/announcements/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/my-archives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
      toast({ title: "Announcement archived" });
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/announcements/${id}/unarchive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/my-archives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
      toast({ title: "Announcement restored" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
      setDeleteTarget(null);
      toast({ title: "Announcement deleted" });
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Announcements"
        description={`${activeAnnouncements.length} active announcement${activeAnnouncements.length !== 1 ? "s" : ""}`}
        action={isAdmin ? (
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-announcement">
            <Plus className="h-4 w-4 mr-1" /> New Announcement
          </Button>
        ) : undefined}
      />

      <div className="flex items-center gap-2">
        <Button
          variant={!showArchived ? "default" : "outline"}
          size="sm"
          onClick={() => setShowArchived(false)}
          data-testid="button-tab-active"
        >
          <Megaphone className="h-3 w-3 mr-1" /> Active ({activeAnnouncements.length})
        </Button>
        <Button
          variant={showArchived ? "default" : "outline"}
          size="sm"
          onClick={() => setShowArchived(true)}
          data-testid="button-tab-archived"
        >
          <Archive className="h-3 w-3 mr-1" /> Archived ({archivedAnnouncements.length})
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : displayList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-medium text-muted-foreground">
              {showArchived ? "No archived announcements" : "No announcements yet"}
            </p>
            {!showArchived && isAdmin && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)} data-testid="button-create-announcement-empty">
                <Plus className="h-3 w-3 mr-1" /> Create one
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayList.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              isAdmin={isAdmin}
              isArchived={archivedSet.has(announcement.id)}
              clubs={clubs}
              onArchive={() => archiveMutation.mutate(announcement.id)}
              onUnarchive={() => unarchiveMutation.mutate(announcement.id)}
              onEdit={() => setEditingAnnouncement(announcement)}
              onDelete={() => setDeleteTarget(announcement.id)}
              archiving={archiveMutation.isPending}
              userId={user?.id}
            />
          ))}
        </div>
      )}

      {(createOpen || editingAnnouncement) && (
        <AnnouncementFormDialog
          open={createOpen || !!editingAnnouncement}
          onOpenChange={(open) => {
            if (!open) { setCreateOpen(false); setEditingAnnouncement(null); }
          }}
          announcement={editingAnnouncement}
          clubs={clubs || []}
        />
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this announcement for all users.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)} data-testid="button-confirm-delete">
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "👏", "🔥"];

function AnnouncementCard({
  announcement, isAdmin, isArchived, clubs, onArchive, onUnarchive, onEdit, onDelete, archiving, userId
}: {
  announcement: AnnouncementWithAuthor;
  isAdmin: boolean;
  isArchived: boolean;
  clubs: any[] | undefined;
  onArchive: () => void;
  onUnarchive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  archiving: boolean;
  userId: number | undefined;
}) {
  const clubName = announcement.clubId ? clubs?.find(c => c.id === announcement.clubId)?.name : null;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const { data: reactions } = useQuery<ReactionGroup[]>({
    queryKey: ["/api/announcements", announcement.id, "reactions"],
    queryFn: async () => {
      const res = await fetch(`/api/announcements/${announcement.id}/reactions`);
      return res.json();
    },
  });

  const { data: comments } = useQuery<CommentWithUser[]>({
    queryKey: ["/api/announcements", announcement.id, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/announcements/${announcement.id}/comments`);
      return res.json();
    },
  });

  const reactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      await apiRequest("POST", `/api/announcements/${announcement.id}/reactions`, { emoji });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements", announcement.id, "reactions"] });
    },
  });

  const commentCount = comments?.length || 0;
  const totalReactions = (reactions || []).reduce((sum, r) => sum + r.count, 0);

  return (
    <Card className="overflow-visible" data-testid={`announcement-card-${announcement.id}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
            <Megaphone className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-bold text-base sm:text-lg" data-testid={`text-announcement-title-${announcement.id}`}>
                  {announcement.title}
                </h3>
                <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {announcement.author.fullName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(announcement.createdAt), "MMM d, yyyy")}
                  </span>
                  {clubName && (
                    <Badge variant="outline" className="text-[10px]">
                      <Building2 className="h-2.5 w-2.5 mr-0.5" />
                      {clubName}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {isArchived ? (
                  <Button variant="outline" size="sm" onClick={onUnarchive} disabled={archiving} data-testid={`button-unarchive-${announcement.id}`}>
                    <ArchiveRestore className="h-3 w-3 mr-1" /> Restore
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={onArchive} disabled={archiving} data-testid={`button-archive-${announcement.id}`}>
                    <Archive className="h-3 w-3 mr-1" /> Archive
                  </Button>
                )}
                {isAdmin && (
                  <>
                    <Button variant="ghost" size="icon" onClick={onEdit} data-testid={`button-edit-${announcement.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onDelete} data-testid={`button-delete-${announcement.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            <p className="mt-2 sm:mt-3 text-sm whitespace-pre-wrap" data-testid={`text-announcement-content-${announcement.id}`}>
              {announcement.content}
            </p>

            {announcement.imageUrl && (
              <div className="mt-3">
                <img
                  src={announcement.imageUrl}
                  alt={announcement.title}
                  className="rounded-md max-h-64 w-auto object-cover"
                  data-testid={`img-announcement-${announcement.id}`}
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
              </div>
            )}

            {announcement.linkUrl && (
              <div className="mt-3">
                <a
                  href={announcement.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  data-testid={`link-announcement-${announcement.id}`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {announcement.linkText || announcement.linkUrl}
                </a>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-border/40">
              <div className="flex items-center gap-1.5 flex-wrap">
                {(reactions || []).map((r) => (
                  <button
                    key={r.emoji}
                    onClick={() => userId && reactionMutation.mutate(r.emoji)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                      userId && r.userIds.includes(userId)
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted/50 border-border/40 text-muted-foreground hover:bg-muted"
                    }`}
                    data-testid={`reaction-${r.emoji}-${announcement.id}`}
                  >
                    <span>{r.emoji}</span>
                    <span>{r.count}</span>
                  </button>
                ))}

                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-full text-muted-foreground"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    data-testid={`button-add-reaction-${announcement.id}`}
                  >
                    <SmilePlus className="h-3.5 w-3.5" />
                  </Button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-lg p-1.5 flex items-center gap-0.5 z-20">
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            if (userId) reactionMutation.mutate(emoji);
                            setShowEmojiPicker(false);
                          }}
                          className="hover:bg-muted rounded p-1 text-base transition-colors"
                          data-testid={`emoji-pick-${emoji}-${announcement.id}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1" />

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground px-2"
                  onClick={() => setCommentsOpen(!commentsOpen)}
                  data-testid={`button-toggle-comments-${announcement.id}`}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {commentCount > 0 && <span>{commentCount}</span>}
                  {commentsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            {commentsOpen && (
              <CommentsSection
                announcementId={announcement.id}
                comments={comments || []}
                userId={userId}
                isAdmin={isAdmin}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CommentsSection({
  announcementId, comments, userId, isAdmin
}: {
  announcementId: number;
  comments: CommentWithUser[];
  userId: number | undefined;
  isAdmin: boolean;
}) {
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: number; userName: string } | null>(null);

  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId: number | null }) => {
      await apiRequest("POST", `/api/announcements/${announcementId}/comments`, { content, parentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements", announcementId, "comments"] });
      setNewComment("");
      setReplyTo(null);
    },
    onError: () => {
      toast({ title: "Failed to post comment", variant: "destructive" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/announcements/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements", announcementId, "comments"] });
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim() || !userId) return;
    addCommentMutation.mutate({ content: newComment.trim(), parentId: replyTo?.id || null });
  };

  const topLevelComments = comments.filter(c => !c.parentId);
  const repliesMap = new Map<number, CommentWithUser[]>();
  for (const c of comments) {
    if (c.parentId) {
      if (!repliesMap.has(c.parentId)) repliesMap.set(c.parentId, []);
      repliesMap.get(c.parentId)!.push(c);
    }
  }

  return (
    <div className="mt-3 space-y-3" data-testid={`comments-section-${announcementId}`}>
      {topLevelComments.length > 0 && (
        <div className="space-y-2">
          {topLevelComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={repliesMap.get(comment.id) || []}
              userId={userId}
              isAdmin={isAdmin}
              onReply={(id, name) => setReplyTo({ id, userName: name })}
              onDelete={(id) => deleteCommentMutation.mutate(id)}
              announcementId={announcementId}
              repliesMap={repliesMap}
            />
          ))}
        </div>
      )}

      {userId && (
        <div className="space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
              <Reply className="h-3 w-3" />
              <span>Replying to <strong>{replyTo.userName}</strong></span>
              <button onClick={() => setReplyTo(null)} className="ml-auto"><X className="h-3 w-3" /></button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[10px]">You</AvatarFallback>
            </Avatar>
            <Input
              placeholder={replyTo ? `Reply to ${replyTo.userName}...` : "Write a comment..."}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              className="h-8 text-sm"
              data-testid={`input-comment-${announcementId}`}
            />
            <Button
              size="sm"
              className="h-8 px-3 shrink-0"
              onClick={handleSubmit}
              disabled={!newComment.trim() || addCommentMutation.isPending}
              data-testid={`button-send-comment-${announcementId}`}
            >
              {addCommentMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment, replies, userId, isAdmin, onReply, onDelete, announcementId, repliesMap, depth = 0
}: {
  comment: CommentWithUser;
  replies: CommentWithUser[];
  userId: number | undefined;
  isAdmin: boolean;
  onReply: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  announcementId: number;
  repliesMap: Map<number, CommentWithUser[]>;
  depth?: number;
}) {
  const canDelete = userId === comment.userId || isAdmin;
  const initials = comment.user.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className={depth > 0 ? "ml-6 sm:ml-8" : ""}>
      <div className="flex items-start gap-2 group" data-testid={`comment-${comment.id}`}>
        <Avatar className="h-6 w-6 shrink-0 mt-0.5">
          <AvatarFallback className="text-[9px] bg-muted">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-muted/40 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" data-testid={`text-comment-author-${comment.id}`}>{comment.user.fullName}</span>
              <span className="text-[10px] text-muted-foreground">{format(new Date(comment.createdAt), "MMM d, h:mm a")}</span>
            </div>
            <p className="text-sm mt-0.5 whitespace-pre-wrap" data-testid={`text-comment-content-${comment.id}`}>{comment.content}</p>
          </div>
          <div className="flex items-center gap-2 mt-0.5 ml-1">
            {userId && (
              <button
                onClick={() => onReply(comment.id, comment.user.fullName)}
                className="text-[11px] text-muted-foreground hover:text-foreground font-medium"
                data-testid={`button-reply-${comment.id}`}
              >
                Reply
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-[11px] text-muted-foreground hover:text-red-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`button-delete-comment-${comment.id}`}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {replies.length > 0 && (
        <div className="mt-1.5 space-y-1.5">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={repliesMap.get(reply.id) || []}
              userId={userId}
              isAdmin={isAdmin}
              onReply={onReply}
              onDelete={onDelete}
              announcementId={announcementId}
              repliesMap={repliesMap}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementFormDialog({
  open, onOpenChange, announcement, clubs
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: AnnouncementWithAuthor | null;
  clubs: any[];
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(announcement?.title || "");
  const [content, setContent] = useState(announcement?.content || "");
  const [imageUrl, setImageUrl] = useState(announcement?.imageUrl || "");
  const [linkUrl, setLinkUrl] = useState(announcement?.linkUrl || "");
  const [linkText, setLinkText] = useState(announcement?.linkText || "");
  const [clubId, setClubId] = useState<string>(announcement?.clubId?.toString() || "all");
  const [visibleTo, setVisibleTo] = useState(announcement?.visibleTo || "ALL");
  const [uploading, setUploading] = useState(false);

  const isEditing = !!announcement;

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        await apiRequest("PATCH", `/api/announcements/${announcement!.id}`, data);
      } else {
        await apiRequest("POST", "/api/announcements", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      onOpenChange(false);
      toast({ title: isEditing ? "Announcement updated" : "Announcement created" });
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/announcements/upload-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setImageUrl(data.imageUrl);
    } catch {
      toast({ title: "Image upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: "Title and description are required", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      imageUrl: imageUrl || null,
      linkUrl: linkUrl.trim() || null,
      linkText: linkText.trim() || null,
      clubId: clubId === "all" ? null : parseInt(clubId),
      visibleTo,
    });
  };

  const [showLinkFields, setShowLinkFields] = useState(!!(announcement?.linkUrl));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            {isEditing ? "Edit Announcement" : "New Announcement"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the announcement details below." : "Create a new announcement for club members."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ann-title">Title</Label>
            <Input
              id="ann-title"
              placeholder="Announcement title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-announcement-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ann-content">Description</Label>
            <Textarea
              id="ann-content"
              placeholder="Write your announcement..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px]"
              data-testid="input-announcement-content"
            />
          </div>

          <div className="space-y-2">
            <Label>Image (optional)</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="button-upload-image">
                {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ImageIcon className="h-3 w-3 mr-1" />}
                {imageUrl ? "Change Image" : "Add Image"}
              </Button>
              {imageUrl && (
                <Button variant="ghost" size="sm" onClick={() => setImageUrl("")} data-testid="button-remove-image">
                  <Trash2 className="h-3 w-3 mr-1" /> Remove
                </Button>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
                data-testid="input-announcement-image"
              />
            </div>
            {imageUrl && (
              <img src={imageUrl} alt="Preview" className="mt-2 rounded-md max-h-40 w-auto object-cover" data-testid="img-announcement-preview" />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Hyperlink (optional)</Label>
              <Button variant="ghost" size="sm" onClick={() => setShowLinkFields(!showLinkFields)} data-testid="button-toggle-link">
                <LinkIcon className="h-3 w-3 mr-1" />
                {showLinkFields ? "Hide" : "Add Link"}
              </Button>
            </div>
            {showLinkFields && (
              <div className="space-y-2 p-3 rounded-md bg-muted/50">
                <Input
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  data-testid="input-announcement-link-url"
                />
                <Input
                  placeholder="Link text (e.g. Learn more)"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  data-testid="input-announcement-link-text"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Club (optional)</Label>
              <Select value={clubId} onValueChange={setClubId}>
                <SelectTrigger data-testid="select-announcement-club">
                  <SelectValue placeholder="All clubs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clubs</SelectItem>
                  {clubs.map((club) => (
                    <SelectItem key={club.id} value={club.id.toString()}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visible To</Label>
              <Select value={visibleTo} onValueChange={setVisibleTo}>
                <SelectTrigger data-testid="select-announcement-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Everyone</SelectItem>
                  <SelectItem value="PLAYERS">Players Only</SelectItem>
                  <SelectItem value="ADMINS">Admins Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-announcement">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending || !title.trim() || !content.trim()} data-testid="button-save-announcement">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {isEditing ? "Update" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
