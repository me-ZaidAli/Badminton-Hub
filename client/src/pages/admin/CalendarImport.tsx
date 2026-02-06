import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useClubs } from "@/hooks/use-clubs";
import { useUser } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Loader2, Calendar, CheckCircle2, RefreshCw, Import, Building2 } from "lucide-react";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
}

interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
}

export default function CalendarImport() {
  const { toast } = useToast();
  const { data: user } = useUser();
  const { data: clubs } = useClubs();
  const [selectedCalendar, setSelectedCalendar] = useState<string>("primary");
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());

  const isSuperAdmin = user?.role === "OWNER";

  const { data: calendars, isLoading: loadingCalendars, error: calendarsError } = useQuery<GoogleCalendar[]>({
    queryKey: ["/api/admin/calendar/calendars"],
  });

  const { data: events, isLoading: loadingEvents, refetch: refetchEvents } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/admin/calendar/events", selectedCalendar],
    queryFn: async () => {
      const res = await fetch(`/api/admin/calendar/events?calendarId=${encodeURIComponent(selectedCalendar)}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
    enabled: !!selectedCalendar
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const eventsToImport = events?.filter(e => selectedEvents.has(e.id)) || [];
      const body: any = { events: eventsToImport };
      if (selectedClubId) {
        body.clubId = Number(selectedClubId);
      }
      const response = await apiRequest("POST", "/api/admin/calendar/import", body);
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Sessions Imported", description: `Successfully created ${data.imported} session(s)` });
      setSelectedEvents(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
    onError: (err: any) => {
      toast({ title: "Import Failed", description: err.message || "Could not import events", variant: "destructive" });
    }
  });

  const toggleEvent = (id: string) => {
    setSelectedEvents(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (!events) return;
    if (selectedEvents.size === events.length) {
      setSelectedEvents(new Set());
    } else {
      setSelectedEvents(new Set(events.map(e => e.id)));
    }
  };

  const canImport = selectedEvents.size > 0 && (!isSuperAdmin || selectedClubId);

  if (calendarsError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Calendar Import" description="Import sessions from Google Calendar" />
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Google Calendar Not Connected</p>
            <p className="text-muted-foreground">Please connect your Google Calendar to import events.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Calendar Import" 
        description="Import badminton sessions from your Google Calendar"
      />

      {isSuperAdmin && clubs && clubs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="w-5 h-5" />
              Target Club
            </CardTitle>
            <CardDescription>Select which club to import sessions into</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger className="w-full max-w-xs" data-testid="select-import-club">
                <SelectValue placeholder="Select a club" />
              </SelectTrigger>
              <SelectContent>
                {clubs.filter(c => c.status === "APPROVED").map(club => (
                  <SelectItem key={club.id} value={String(club.id)}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedClubId && selectedEvents.size > 0 && (
              <p className="text-sm text-destructive mt-2">Please select a club before importing</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Events
            </CardTitle>
            <CardDescription>Select events to import as sessions</CardDescription>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Calendar:</Label>
              {loadingCalendars ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                  <SelectTrigger className="w-[200px]" data-testid="select-calendar">
                    <SelectValue placeholder="Select calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars?.map(cal => (
                      <SelectItem key={cal.id} value={cal.id}>
                        {cal.summary} {cal.primary && "(Primary)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchEvents()} data-testid="button-refresh-events">
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            {events && events.length > 0 && (
              <Button variant="outline" size="sm" onClick={toggleAll} data-testid="button-toggle-all">
                {selectedEvents.size === events.length ? "Deselect All" : "Select All"}
              </Button>
            )}
            {canImport && (
              <Button 
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
                data-testid="button-import-sessions"
              >
                {importMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
                ) : (
                  <><Import className="w-4 h-4 mr-2" /> Import {selectedEvents.size} Event(s)</>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingEvents ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="mt-2 text-muted-foreground">Loading events...</p>
            </div>
          ) : !events || events.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No upcoming events found in this calendar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => {
                const isSelected = selectedEvents.has(event.id);
                const startDate = new Date(event.start);
                const endDate = new Date(event.end);
                const duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

                return (
                  <div 
                    key={event.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                    }`}
                    onClick={() => toggleEvent(event.id)}
                    data-testid={`event-${event.id}`}
                  >
                    <Checkbox 
                      checked={isSelected} 
                      onCheckedChange={() => toggleEvent(event.id)}
                      className="mt-1"
                      data-testid={`checkbox-event-${event.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{event.summary}</p>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {format(startDate, "EEE, MMM d")}
                        </Badge>
                        <span>{format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}</span>
                        <span>({duration} min)</span>
                      </div>
                      {event.location && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{event.location}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
