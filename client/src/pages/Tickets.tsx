import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Ticket, Loader2, ShieldAlert, Clock, ArrowRight, Filter,
  AlertCircle, MessageSquare, RotateCcw, Archive, ChevronDown, ChevronUp,
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

const CATEGORIES = ["CONCERN", "COMPLAINT", "SUGGESTION", "GENERAL", "SAFEGUARDING"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  CONCERN: "Concern",
  COMPLAINT: "Complaint",
  SUGGESTION: "Suggestion",
  GENERAL: "General",
  SAFEGUARDING: "Safeguarding",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};
const STATUS_OPTIONS = ["SUBMITTED", "UNDER_REVIEW", "RESPONDED", "AWAITING_USER", "RESOLVED", "CLOSED"] as const;

const createTicketSchema = z.object({
  clubId: z.string().min(1, "Please select a club"),
  subject: z.string().min(1, "Subject is required").max(200),
  description: z.string().min(1, "Description is required"),
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  onBehalfOfUserId: z.string().optional(),
});

type CreateTicketValues = z.infer<typeof createTicketSchema>;

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

export default function Tickets() {
  const { data: user, isLoading: userLoading } = useUser();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === "OWNER" || (user?.playerProfiles || []).some((p: any) => p.clubRole === "ADMIN" || p.clubRole === "OWNER");

  if (userLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tickets" description="Loading..." />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? "Tickets" : "My Tickets"}
        description={isAdmin ? "Manage and track support tickets." : "Submit and track your support tickets."}
        action={<CreateTicketDialog />}
      />

      <Tabs defaultValue="my-tickets">
        <TabsList data-testid="tabs-tickets">
          <TabsTrigger value="my-tickets" data-testid="tab-my-tickets">My Tickets</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="manage-tickets" data-testid="tab-manage-tickets">Manage Tickets</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-tickets">
          <MyTicketsList onRowClick={(id) => navigate(`/tickets/${id}`)} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="manage-tickets">
            <AdminTicketsList onRowClick={(id) => navigate(`/tickets/${id}`)} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function MyTicketsList({ onRowClick }: { onRowClick: (id: number) => void }) {
  const { data: tickets, isLoading } = useQuery<any[]>({
    queryKey: ["/api/tickets"],
  });
  const [showClosed, setShowClosed] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <Card className="border-dashed mt-4">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Ticket className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No tickets yet</p>
          <p className="text-sm mt-1">Create a ticket to get started.</p>
        </CardContent>
      </Card>
    );
  }

  const openTickets = tickets.filter((t: any) => t.status !== "CLOSED");
  const closedTickets = tickets.filter((t: any) => t.status === "CLOSED");

  return (
    <div className="space-y-4 mt-4">
      {openTickets.length === 0 && closedTickets.length > 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Ticket className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No open tickets</p>
            <p className="text-sm mt-1">All your tickets are closed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" data-testid="ticket-list-my-open">
          {openTickets.map((ticket: any) => (
            <TicketRow key={ticket.id} ticket={ticket} onClick={() => onRowClick(ticket.id)} />
          ))}
        </div>
      )}

      {closedTickets.length > 0 && (
        <div data-testid="closed-tickets-section">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between"
            onClick={() => setShowClosed(!showClosed)}
            data-testid="button-toggle-closed"
          >
            <span className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Closed Tickets ({closedTickets.length})
            </span>
            {showClosed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {showClosed && (
            <div className="space-y-2 mt-2" data-testid="ticket-list-my-closed">
              {closedTickets.map((ticket: any) => (
                <TicketRow key={ticket.id} ticket={ticket} onClick={() => onRowClick(ticket.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminTicketsList({ onRowClick }: { onRowClick: (id: number) => void }) {
  const [clubFilter, setClubFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const queryParams = new URLSearchParams();
  if (clubFilter) queryParams.set("clubId", clubFilter);
  if (statusFilter) queryParams.set("status", statusFilter);
  if (categoryFilter) queryParams.set("category", categoryFilter);
  const qs = queryParams.toString();

  const { data: tickets, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/tickets", clubFilter, statusFilter, categoryFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tickets${qs ? `?${qs}` : ""}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
  });

  const { data: clubs } = useQuery<any[]>({
    queryKey: ["/api/clubs"],
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-2 flex-wrap" data-testid="admin-ticket-filters">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={clubFilter} onValueChange={setClubFilter}>
          <SelectTrigger className="w-[180px]" data-testid="filter-club">
            <SelectValue placeholder="All Clubs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clubs</SelectItem>
            {(clubs || []).map((club: any) => (
              <SelectItem key={club.id} value={club.id.toString()}>{club.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="filter-status">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="filter-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] || c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(clubFilter || statusFilter || categoryFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setClubFilter(""); setStatusFilter(""); setCategoryFilter(""); }}
            data-testid="button-clear-filters"
          >
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !tickets || tickets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Ticket className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No tickets found</p>
            <p className="text-sm mt-1">Try adjusting your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2" data-testid="ticket-list-admin">
            {tickets.filter((t: any) => t.status !== "CLOSED").map((ticket: any) => (
              <TicketRow key={ticket.id} ticket={ticket} onClick={() => onRowClick(ticket.id)} showConfidential />
            ))}
          </div>
          {tickets.filter((t: any) => t.status === "CLOSED").length > 0 && !statusFilter && (
            <ClosedTicketsSection
              tickets={tickets.filter((t: any) => t.status === "CLOSED")}
              onRowClick={onRowClick}
            />
          )}
          {statusFilter === "CLOSED" && (
            <div className="space-y-2" data-testid="ticket-list-admin-closed">
              {tickets.filter((t: any) => t.status === "CLOSED").map((ticket: any) => (
                <TicketRow key={ticket.id} ticket={ticket} onClick={() => onRowClick(ticket.id)} showConfidential />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ClosedTicketsSection({ tickets, onRowClick }: { tickets: any[]; onRowClick: (id: number) => void }) {
  const [showClosed, setShowClosed] = useState(false);

  return (
    <div className="mt-4" data-testid="admin-closed-tickets-section">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-between"
        onClick={() => setShowClosed(!showClosed)}
        data-testid="button-admin-toggle-closed"
      >
        <span className="flex items-center gap-2">
          <Archive className="h-4 w-4" />
          Closed Tickets ({tickets.length})
        </span>
        {showClosed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      {showClosed && (
        <div className="space-y-2 mt-2" data-testid="ticket-list-admin-closed">
          {tickets.map((ticket: any) => (
            <TicketRow key={ticket.id} ticket={ticket} onClick={() => onRowClick(ticket.id)} showConfidential />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketRow({ ticket, onClick, showConfidential }: { ticket: any; onClick: () => void; showConfidential?: boolean }) {
  return (
    <Card
      className="hover-elevate cursor-pointer"
      onClick={onClick}
      data-testid={`ticket-row-${ticket.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground" data-testid={`text-ticket-number-${ticket.id}`}>
                #{ticket.ticketNumber}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.category && (
                <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[ticket.category] || ticket.category}</Badge>
              )}
              {showConfidential && ticket.isConfidential && (
                <ShieldAlert className="h-3.5 w-3.5 text-red-500" data-testid={`icon-confidential-${ticket.id}`} />
              )}
            </div>
            <p className="font-medium text-sm mt-1.5 truncate" data-testid={`text-ticket-subject-${ticket.id}`}>
              {ticket.subject}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(ticket.createdAt), "MMM d, yyyy")}
              </span>
              {ticket.updatedAt && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Last activity {format(new Date(ticket.updatedAt), "MMM d")}
                </span>
              )}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}

function CreateTicketDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { data: user } = useUser();
  const isAdmin = user?.role === "OWNER" || (user?.playerProfiles || []).some((p: any) => p.clubRole === "ADMIN" || p.clubRole === "OWNER");

  const { data: clubs } = useQuery<any[]>({
    queryKey: ["/api/clubs"],
  });

  const form = useForm<CreateTicketValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      clubId: "",
      subject: "",
      description: "",
      category: "GENERAL",
      priority: "MEDIUM",
      onBehalfOfUserId: "",
    },
  });

  const selectedClubId = form.watch("clubId");

  const { data: clubMembers } = useQuery<any[]>({
    queryKey: ["/api/clubs", selectedClubId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${selectedClubId}/members`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAdmin && !!selectedClubId,
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateTicketValues) => {
      const payload: any = {
        clubId: parseInt(values.clubId, 10),
        subject: values.subject,
        description: values.description,
        category: values.category,
        priority: values.priority,
      };
      if (values.onBehalfOfUserId && values.onBehalfOfUserId !== "self") {
        payload.onBehalfOfUserId = parseInt(values.onBehalfOfUserId, 10);
      }
      const res = await apiRequest("POST", "/api/tickets", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
      toast({ title: "Ticket Created", description: "The ticket has been submitted successfully." });
      form.reset();
      setOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to create ticket", variant: "destructive" });
    },
  });

  function onSubmit(values: CreateTicketValues) {
    createMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-ticket">
          <Plus className="h-4 w-4 mr-2" /> Create Ticket
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="clubId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Club</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-ticket-club">
                        <SelectValue placeholder="Select a club" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(clubs || []).map((club: any) => (
                        <SelectItem key={club.id} value={club.id.toString()}>{club.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isAdmin && selectedClubId && (
              <FormField
                control={form.control}
                name="onBehalfOfUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Create on behalf of</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "self"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-ticket-on-behalf">
                          <SelectValue placeholder="Myself" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="self">Myself</SelectItem>
                        {(clubMembers || []).map((member: any) => (
                          <SelectItem key={member.userId} value={member.userId.toString()}>
                            {member.fullName || member.nickname || `User #${member.userId}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief summary of your issue" {...field} data-testid="input-ticket-subject" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your issue in detail..."
                      rows={4}
                      {...field}
                      data-testid="input-ticket-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-ticket-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] || c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-ticket-priority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITIES.map(p => (
                          <SelectItem key={p} value={p}>{PRIORITY_LABELS[p] || p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-ticket">
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...
                </>
              ) : (
                "Submit Ticket"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
