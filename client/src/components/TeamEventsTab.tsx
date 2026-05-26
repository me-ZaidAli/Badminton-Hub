import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Users, MapPin, Calendar, PoundSterling, Clock, Building2,
  Search, Loader2, CheckCircle, Activity, Pencil, Trash2, X,
  UserPlus, UserMinus, Trophy, PartyPopper, Dumbbell, Heart, Flag,
  MoreVertical, CalendarDays, Info, Phone, Shirt, Package, Navigation,
  AlertTriangle, ChevronDown, User,
} from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface TeamEventData {
  id: number;
  clubId: number;
  title: string;
  description: string | null;
  location: string | null;
  date: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  maxParticipants: number;
  eventType: string;
  status: string;
  meetingPoint: string | null;
  transportInfo: string | null;
  dressCode: string | null;
  equipmentRequired: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  isPublic: boolean;
  fee: number | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  clubName: string | null;
  creatorName: string | null;
  signupCount: number;
  isSignedUp: boolean;
}

const EVENT_TYPES = [
  { value: "SOCIAL", label: "Social", icon: PartyPopper, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "MATCH", label: "Match", icon: Trophy, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "TOURNAMENT_PREP", label: "Tournament Prep", icon: Flag, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "TRAINING", label: "Training", icon: Dumbbell, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "FUNDRAISER", label: "Fundraiser", icon: Heart, color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  { value: "OTHER", label: "Other", icon: Calendar, color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
];

function getEventTypeInfo(type: string) {
  return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[EVENT_TYPES.length - 1];
}

function getEventStatus(event: TeamEventData): "live" | "upcoming" | "past" | "cancelled" {
  if (event.status === "CANCELLED") return "cancelled";
  if (event.status === "COMPLETED") return "past";
  const now = new Date();
  const eventDate = new Date(event.date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  if (eDay.getTime() === today.getTime()) return "live";
  if (eDay > today) return "upcoming";
  return "past";
}

interface CreateEditDialogProps {
  open: boolean;
  onClose: () => void;
  editEvent?: TeamEventData | null;
  clubs: Array<{ id: number; name: string }>;
}

function CreateEditDialog({ open, onClose, editEvent, clubs }: CreateEditDialogProps) {
  const { toast } = useToast();
  const isEdit = !!editEvent;

  const [title, setTitle] = useState(editEvent?.title || "");
  const [description, setDescription] = useState(editEvent?.description || "");
  const [clubId, setClubId] = useState(editEvent?.clubId ? String(editEvent.clubId) : (clubs.length === 1 ? String(clubs[0].id) : ""));
  const [location, setLocation] = useState(editEvent?.location || "");
  const [date, setDate] = useState(editEvent ? format(new Date(editEvent.date), "yyyy-MM-dd") : "");
  const [startTime, setStartTime] = useState(editEvent?.startTime || "");
  const [endTime, setEndTime] = useState(editEvent?.endTime || "");
  const [durationMinutes, setDurationMinutes] = useState(String(editEvent?.durationMinutes || 120));
  const [maxParticipants, setMaxParticipants] = useState(String(editEvent?.maxParticipants || 20));
  const [eventType, setEventType] = useState(editEvent?.eventType || "SOCIAL");
  const [meetingPoint, setMeetingPoint] = useState(editEvent?.meetingPoint || "");
  const [transportInfo, setTransportInfo] = useState(editEvent?.transportInfo || "");
  const [dressCode, setDressCode] = useState(editEvent?.dressCode || "");
  const [equipmentRequired, setEquipmentRequired] = useState(editEvent?.equipmentRequired || "");
  const [contactPerson, setContactPerson] = useState(editEvent?.contactPerson || "");
  const [contactPhone, setContactPhone] = useState(editEvent?.contactPhone || "");
  const [isPublic, setIsPublic] = useState(editEvent?.isPublic ?? true);
  const [fee, setFee] = useState(editEvent?.fee ? String((editEvent.fee / 100).toFixed(2)) : "");
  const [notes, setNotes] = useState(editEvent?.notes || "");

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required");
      if (!clubId) throw new Error("Please select a club");
      if (!date) throw new Error("Date is required");
      if (!startTime) throw new Error("Start time is required");

      const feeInPence = fee ? Math.round(parseFloat(fee) * 100) : 0;
      const payload = {
        clubId: Number(clubId),
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        date,
        startTime,
        endTime: endTime || undefined,
        durationMinutes: parseInt(durationMinutes) || 120,
        maxParticipants: parseInt(maxParticipants) || 20,
        eventType,
        meetingPoint: meetingPoint.trim() || undefined,
        transportInfo: transportInfo.trim() || undefined,
        dressCode: dressCode.trim() || undefined,
        equipmentRequired: equipmentRequired.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        isPublic,
        fee: feeInPence,
        notes: notes.trim() || undefined,
      };

      if (isEdit && editEvent) {
        const res = await apiRequest("PUT", `/api/team-events/${editEvent.id}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/team-events", payload);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-events"] });
      toast({ title: isEdit ? "Updated" : "Created", description: `Team event "${title}" ${isEdit ? "updated" : "created"} successfully.` });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">{isEdit ? "Edit Team Event" : "Create Team Event"}</DialogTitle>
          <DialogDescription>Fill in the details for your team event</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Title *</Label>
              <Input data-testid="input-event-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Inter-Club Friendly Match" />
            </div>

            {clubs.length > 1 && (
              <div>
                <Label>Club *</Label>
                <Select value={clubId} onValueChange={setClubId}>
                  <SelectTrigger data-testid="select-event-club"><SelectValue placeholder="Select club" /></SelectTrigger>
                  <SelectContent>
                    {clubs.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Event Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger data-testid="select-event-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2"><t.icon className="h-3.5 w-3.5" /> {t.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea data-testid="input-event-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the event..." rows={3} />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Input data-testid="input-event-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Start Time *</Label>
              <Input data-testid="input-event-start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>End Time</Label>
              <Input data-testid="input-event-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input data-testid="input-event-duration" type="number" min={15} max={720} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Location</Label>
              <Input data-testid="input-event-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Sandwell Aquatics Centre, Birmingham" />
            </div>
            <div className="sm:col-span-2">
              <Label>Meeting Point</Label>
              <Input data-testid="input-event-meeting-point" value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} placeholder="e.g. Main entrance car park" />
            </div>
            <div>
              <Label>Max Participants</Label>
              <Input data-testid="input-event-max" type="number" min={1} max={500} value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} />
            </div>
            <div>
              <Label>Fee (£)</Label>
              <Input data-testid="input-event-fee" type="number" min={0} step={0.01} value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Transport Info</Label>
              <Input data-testid="input-event-transport" value={transportInfo} onChange={(e) => setTransportInfo(e.target.value)} placeholder="e.g. Carpool from club at 5pm" />
            </div>
            <div>
              <Label>Dress Code</Label>
              <Input data-testid="input-event-dress-code" value={dressCode} onChange={(e) => setDressCode(e.target.value)} placeholder="e.g. Club shirt required" />
            </div>
            <div>
              <Label>Equipment Required</Label>
              <Input data-testid="input-event-equipment" value={equipmentRequired} onChange={(e) => setEquipmentRequired(e.target.value)} placeholder="e.g. Own racket, shoes" />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input data-testid="input-event-contact-person" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Name" />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input data-testid="input-event-contact-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Phone number" />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Public Event</Label>
                <p className="text-xs text-muted-foreground">Visible to all club members</p>
              </div>
              <Switch data-testid="switch-event-public" checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea data-testid="input-event-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." rows={2} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-event">Cancel</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} data-testid="button-save-event">
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Update Event" : "Create Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TeamEventSignup {
  id: number;
  userId: number;
  status: string;
  paymentStatus: string;
  userName: string | null;
  createdAt: string;
}

function ExpandedAttendeesSection({ eventId, canManage }: { eventId: number; canManage: boolean }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const { toast } = useToast();

  const { data: eventDetail, isLoading, isError } = useQuery<TeamEventData & { signups: TeamEventSignup[] }>({
    queryKey: ["/api/team-events", eventId],
    staleTime: 30000,
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ signupId, paymentStatus }: { signupId: number; paymentStatus: string }) => {
      const res = await apiRequest("PATCH", `/api/team-events/${eventId}/signups/${signupId}/payment`, { paymentStatus });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/team-events"] });
      toast({ title: "Payment Updated", description: "Payment status has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [eventDetail]);

  const confirmedAttendees = eventDetail?.signups?.filter((s) => s.status === "CONFIRMED") || [];
  const fee = eventDetail?.fee || 0;
  const paidCount = confirmedAttendees.filter(a => a.paymentStatus === "PAID").length;
  const paidRevenue = paidCount * fee;
  const totalRevenue = confirmedAttendees.length * fee;

  return (
    <div
      className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
      style={{ maxHeight: height > 0 ? `${height + 16}px` : "600px" }}
      role="region"
      aria-label="Attendees list"
    >
      <div ref={contentRef} className="pt-3">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-3" />

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="ml-2 text-xs text-muted-foreground">Loading attendees...</span>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
            <span>Unable to load attendees</span>
          </div>
        ) : (
          <div className="space-y-3">
            {canManage && fee > 0 && confirmedAttendees.length > 0 && (
              <div className="rounded-xl border border-border/60 bg-muted/20 dark:bg-white/[0.03] p-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <PoundSterling className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Summary</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-card dark:bg-white/[0.04] border border-border/40 p-2 text-center">
                    <span className="text-lg font-bold text-foreground">£{(totalRevenue / 100).toFixed(2)}</span>
                    <p className="text-[9px] text-muted-foreground">Expected</p>
                  </div>
                  <div className="rounded-lg bg-card dark:bg-white/[0.04] border border-border/40 p-2 text-center">
                    <span className="text-lg font-bold text-emerald-600">£{(paidRevenue / 100).toFixed(2)}</span>
                    <p className="text-[9px] text-muted-foreground">Collected</p>
                  </div>
                  <div className="rounded-lg bg-card dark:bg-white/[0.04] border border-border/40 p-2 text-center">
                    <span className="text-lg font-bold text-foreground">{totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0}%</span>
                    <p className="text-[9px] text-muted-foreground">Rate</p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border/60 bg-muted/20 dark:bg-white/[0.03] p-2.5">
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="h-3 w-3 text-blue-500 flex-shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Attendees ({confirmedAttendees.length}/{eventDetail?.maxParticipants || 0})
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2.5">
                <div className="flex items-center gap-0.5" data-testid={`capacity-bar-event-${eventId}`}>
                  {(() => {
                    const totalBlocks = 10;
                    const max = eventDetail?.maxParticipants || 1;
                    const fillPercent = Math.min(100, Math.round((confirmedAttendees.length / max) * 100));
                    const filledBlocks = Math.round((fillPercent / 100) * totalBlocks);
                    const isFull = confirmedAttendees.length >= max;
                    const barColor = isFull ? "bg-red-500" : fillPercent > 75 ? "bg-amber-500" : "bg-emerald-500";
                    return Array.from({ length: totalBlocks }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-[5px] h-[10px] rounded-[1px] ${
                          i < filledBlocks ? barColor : "bg-muted/50 dark:bg-muted/40"
                        }`}
                      />
                    ));
                  })()}
                </div>
                <span className={`text-[11px] font-semibold tabular-nums ${
                  confirmedAttendees.length >= (eventDetail?.maxParticipants || 1) ? "text-red-500" : "text-foreground dark:text-white/80"
                }`}>
                  {confirmedAttendees.length}/{eventDetail?.maxParticipants || 0}
                </span>
              </div>

              {confirmedAttendees.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No attendees yet</p>
              ) : (
                <div className="space-y-1">
                  {confirmedAttendees.map((attendee, i) => (
                    <div
                      key={attendee.id}
                      className="flex items-center justify-between rounded-md px-2.5 py-1.5 bg-card dark:bg-white/[0.04] border border-border/40"
                      data-testid={`attendee-row-${attendee.id}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-[11px] font-medium text-foreground dark:text-white/80 truncate">
                          {attendee.userName || "Unknown Player"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        {canManage && fee > 0 && (
                          <Badge
                            className={`text-[9px] cursor-default ${
                              attendee.paymentStatus === "PAID" ? "bg-emerald-500 text-white" :
                              attendee.paymentStatus === "PENDING" ? "bg-amber-500 text-white" :
                              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                            data-testid={`badge-payment-${attendee.id}`}
                          >
                            {attendee.paymentStatus === "PAID" ? "£ Paid" :
                             attendee.paymentStatus === "PENDING" ? "£ Pending" : "£ Unpaid"}
                          </Badge>
                        )}
                        {canManage && fee > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6" data-testid={`button-payment-menu-${attendee.id}`}>
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem
                                onClick={() => paymentMutation.mutate({ signupId: attendee.id, paymentStatus: "PAID" })}
                                data-testid={`button-mark-paid-${attendee.id}`}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Mark Paid
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => paymentMutation.mutate({ signupId: attendee.id, paymentStatus: "PENDING" })}
                                data-testid={`button-mark-pending-${attendee.id}`}
                              >
                                <Clock className="h-3.5 w-3.5 mr-2 text-amber-500" /> Mark Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => paymentMutation.mutate({ signupId: attendee.id, paymentStatus: "UNPAID" })}
                                data-testid={`button-mark-unpaid-${attendee.id}`}
                              >
                                <AlertTriangle className="h-3.5 w-3.5 mr-2 text-red-500" /> Mark Unpaid
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {!(canManage && fee > 0) && (
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {format(new Date(attendee.createdAt), "dd MMM")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamEventCard({ event, onEdit, onSignUp, onWithdraw, onDelete, canManage }: {
  event: TeamEventData;
  onEdit: () => void;
  onSignUp: () => void;
  onWithdraw: () => void;
  onDelete: () => void;
  canManage: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const typeInfo = getEventTypeInfo(event.eventType);
  const liveStatus = getEventStatus(event);
  const eventDate = new Date(event.date);
  const isFull = event.signupCount >= event.maxParticipants;
  const fillPercent = Math.min(100, Math.round((event.signupCount / Math.max(1, event.maxParticipants)) * 100));

  const handleCardClick = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <Card
      className={`overflow-hidden transition-all duration-300 cursor-pointer group ${
        isExpanded ? "shadow-lg" : "hover:shadow-md hover:-translate-y-[2px]"
      }`}
      data-testid={`card-team-event-${event.id}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="text-[10px] font-bold border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20">
                <Flag className="h-3 w-3 mr-0.5" /> TEAM EVENT
              </Badge>
              <Badge className={`text-[10px] ${typeInfo.color}`}>
                <typeInfo.icon className="h-3 w-3 mr-0.5" /> {typeInfo.label}
              </Badge>
              {liveStatus === "live" && (
                <Badge className="bg-green-500 text-white text-[10px] animate-pulse">
                  <Activity className="h-3 w-3 mr-0.5" /> TODAY
                </Badge>
              )}
              {isFull && (
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px]">FULL</Badge>
              )}
              {event.status === "CANCELLED" && (
                <Badge variant="destructive" className="text-[10px]">CANCELLED</Badge>
              )}
            </div>
            <h3 className="font-semibold text-base truncate" data-testid={`text-event-title-${event.id}`}>{event.title}</h3>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
            )}
          </div>

          <div className="flex items-center gap-1">
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" data-testid={`button-event-menu-${event.id}`}
                    onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} data-testid={`button-edit-event-${event.id}`}>
                    <Pencil className="h-4 w-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-600" data-testid={`button-delete-event-${event.id}`}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
          </div>
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {event.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>{format(eventDate, "EEE dd MMM yyyy")}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ""}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{Math.floor(event.durationMinutes / 60)}h{event.durationMinutes % 60 > 0 ? ` ${event.durationMinutes % 60}m` : ""}</span>
            </div>
          </div>
          {(event.fee !== null && event.fee > 0) && (
            <div className="flex items-center gap-1.5">
              <PoundSterling className="h-3.5 w-3.5 shrink-0" />
              <span>£{(event.fee / 100).toFixed(2)}</span>
            </div>
          )}
          {event.meetingPoint && (
            <div className="flex items-center gap-1.5">
              <Navigation className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.meetingPoint}</span>
            </div>
          )}
          {event.dressCode && (
            <div className="flex items-center gap-1.5">
              <Shirt className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.dressCode}</span>
            </div>
          )}
          {event.equipmentRequired && (
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.equipmentRequired}</span>
            </div>
          )}
          {event.contactPerson && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{event.contactPerson}{event.contactPhone ? ` (${event.contactPhone})` : ""}</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" /> {event.clubName}
            </Badge>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5" data-testid={`battery-bar-event-${event.id}`}>
                {(() => {
                  const totalBlocks = 10;
                  const filledBlocks = Math.round((fillPercent / 100) * totalBlocks);
                  const barColor = isFull ? "bg-red-500" : fillPercent > 75 ? "bg-amber-500" : "bg-emerald-500";
                  return Array.from({ length: totalBlocks }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-[5px] h-[10px] rounded-[1px] ${
                        i < filledBlocks ? barColor : "bg-muted/50 dark:bg-muted/40"
                      }`}
                    />
                  ));
                })()}
              </div>
              <span className={`text-[11px] font-semibold tabular-nums ${isFull ? "text-red-500" : "text-foreground dark:text-white/80"}`}>
                {event.signupCount}/{event.maxParticipants}
              </span>
            </div>
          </div>

          {event.status !== "CANCELLED" && liveStatus !== "past" && (
            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              {event.isSignedUp ? (
                <Button variant="outline" size="sm" onClick={onWithdraw} data-testid={`button-withdraw-event-${event.id}`}>
                  <UserMinus className="h-3.5 w-3.5 mr-1" /> Withdraw
                </Button>
              ) : (
                <Button size="sm" disabled={isFull} onClick={onSignUp} data-testid={`button-signup-event-${event.id}`}>
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> {isFull ? "Full" : "Sign Up"}
                </Button>
              )}
            </div>
          )}
        </div>

        {isExpanded && <ExpandedAttendeesSection eventId={event.id} canManage={canManage} />}
      </CardContent>
    </Card>
  );
}

interface TeamEventsTabProps {
  canManageEvents: boolean;
}

export default function TeamEventsTab({ canManageEvents }: TeamEventsTabProps) {
  const { data: user } = useUser();
  const { data: adminClubs } = useMyAdminClubs(!!user);
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "past">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClubFilter, setSelectedClubFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<TeamEventData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TeamEventData | null>(null);

  const { data: events, isLoading } = useQuery<TeamEventData[]>({
    queryKey: ["/api/team-events"],
  });

  const signupMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await apiRequest("POST", `/api/team-events/${eventId}/signup`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-events"] });
      toast({ title: "Signed up", description: "You've been signed up for this team event." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await apiRequest("DELETE", `/api/team-events/${eventId}/signup`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-events"] });
      toast({ title: "Withdrawn", description: "You've withdrawn from this team event." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await apiRequest("DELETE", `/api/team-events/${eventId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-events"] });
      setDeleteConfirm(null);
      toast({ title: "Deleted", description: "Team event deleted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter(event => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!event.title.toLowerCase().includes(q) &&
          !(event.location || "").toLowerCase().includes(q) &&
          !(event.clubName || "").toLowerCase().includes(q)) return false;
      }
      if (selectedClubFilter !== "all" && String(event.clubId) !== selectedClubFilter) return false;
      const liveStatus = getEventStatus(event);
      if (statusFilter === "upcoming" && liveStatus !== "upcoming" && liveStatus !== "live") return false;
      if (statusFilter === "past" && liveStatus !== "past") return false;
      return true;
    });
  }, [events, searchQuery, selectedClubFilter, statusFilter]);

  const upcomingCount = useMemo(() => {
    if (!events) return 0;
    return events.filter(e => {
      const s = getEventStatus(e);
      return s === "upcoming" || s === "live";
    }).length;
  }, [events]);

  const pastCount = useMemo(() => {
    if (!events) return 0;
    return events.filter(e => getEventStatus(e) === "past").length;
  }, [events]);

  const clubOptions = useMemo(() => {
    if (!events) return [];
    const clubs = new Map<string, string>();
    events.forEach(e => {
      if (e.clubName) clubs.set(String(e.clubId), e.clubName);
    });
    return Array.from(clubs.entries()).map(([id, name]) => ({ id, name }));
  }, [events]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm"
          onClick={() => setStatusFilter("all")} data-testid="button-team-filter-all">
          All ({events?.length || 0})
        </Button>
        <Button variant={statusFilter === "upcoming" ? "default" : "outline"} size="sm"
          onClick={() => setStatusFilter("upcoming")} data-testid="button-team-filter-upcoming">
          <Calendar className="w-3 h-3 mr-1" /> Upcoming ({upcomingCount})
        </Button>
        <Button variant={statusFilter === "past" ? "default" : "outline"} size="sm"
          onClick={() => setStatusFilter("past")} data-testid="button-team-filter-past">
          <CheckCircle className="w-3 h-3 mr-1" /> Past ({pastCount})
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="input-team-search"
            placeholder="Search events..."
            className="pl-9 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {clubOptions.length > 1 && (
          <Select value={selectedClubFilter} onValueChange={setSelectedClubFilter}>
            <SelectTrigger data-testid="select-team-club-filter" className="w-[160px] h-9">
              <SelectValue placeholder="All Clubs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clubs</SelectItem>
              {clubOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {canManageEvents && (
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} data-testid="button-create-team-event">
            <Plus className="h-4 w-4 mr-1" /> New Team Event
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Flag className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No team events found</p>
            <p className="text-xs mt-1">
              {canManageEvents ? "Create your first team event to get started." : "Check back later for upcoming team events."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEvents.map(event => (
            <TeamEventCard
              key={event.id}
              event={event}
              canManage={canManageEvents}
              onEdit={() => setEditEvent(event)}
              onSignUp={() => signupMutation.mutate(event.id)}
              onWithdraw={() => withdrawMutation.mutate(event.id)}
              onDelete={() => setDeleteConfirm(event)}
            />
          ))}
        </div>
      )}

      {createDialogOpen && (
        <CreateEditDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          clubs={adminClubs || []}
        />
      )}

      {editEvent && (
        <CreateEditDialog
          open={!!editEvent}
          onClose={() => setEditEvent(null)}
          editEvent={editEvent}
          clubs={adminClubs || []}
        />
      )}

      <Dialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.title}"? This will remove all signups and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} data-testid="button-cancel-delete">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending} data-testid="button-confirm-delete">
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
