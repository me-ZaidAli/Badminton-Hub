import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Loader2, Calendar, CheckCircle2, RefreshCw, Import, Settings } from "lucide-react";

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
  const [selectedCalendar, setSelectedCalendar] = useState<string>("primary");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [importSettings, setImportSettings] = useState({
    maxPlayers: 24,
    courtsAvailable: 4,
    matchMode: "SOCIAL" as "SOCIAL" | "COMPETITIVE",
    allowedCategories: ["A", "B", "C", "D"]
  });

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
      const response = await apiRequest("POST", "/api/admin/calendar/import", { 
        events: eventsToImport, 
        settings: importSettings 
      });
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Import Settings
            </CardTitle>
            <CardDescription>Configure session defaults</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Calendar</Label>
              {loadingCalendars ? (
                <div className="h-10 flex items-center"><Loader2 className="animate-spin w-4 h-4" /></div>
              ) : (
                <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                  <SelectTrigger data-testid="select-calendar">
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

            <div className="space-y-2">
              <Label htmlFor="maxPlayers">Max Players</Label>
              <Input 
                id="maxPlayers"
                type="number" 
                value={importSettings.maxPlayers} 
                onChange={e => setImportSettings(s => ({ ...s, maxPlayers: parseInt(e.target.value) || 24 }))}
                data-testid="input-max-players"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="courts">Courts Available</Label>
              <Input 
                id="courts"
                type="number" 
                value={importSettings.courtsAvailable} 
                onChange={e => setImportSettings(s => ({ ...s, courtsAvailable: parseInt(e.target.value) || 4 }))}
                data-testid="input-courts"
              />
            </div>

            <div className="space-y-2">
              <Label>Match Mode</Label>
              <Select 
                value={importSettings.matchMode} 
                onValueChange={(v: "SOCIAL" | "COMPETITIVE") => setImportSettings(s => ({ ...s, matchMode: v }))}
              >
                <SelectTrigger data-testid="select-match-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOCIAL">Social</SelectItem>
                  <SelectItem value="COMPETITIVE">Competitive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full mt-4" 
              onClick={() => importMutation.mutate()}
              disabled={selectedEvents.size === 0 || importMutation.isPending}
              data-testid="button-import-sessions"
            >
              {importMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
              ) : (
                <><Import className="w-4 h-4 mr-2" /> Import {selectedEvents.size} Event(s)</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Events List */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Events
              </CardTitle>
              <CardDescription>Select events to import as sessions</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchEvents()} data-testid="button-refresh-events">
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
              {events && events.length > 0 && (
                <Button variant="outline" size="sm" onClick={toggleAll} data-testid="button-toggle-all">
                  {selectedEvents.size === events.length ? "Deselect All" : "Select All"}
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
    </div>
  );
}
