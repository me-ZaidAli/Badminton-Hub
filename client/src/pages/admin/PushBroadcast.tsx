import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-auth";
import { Megaphone, Send, Loader2, Clock, X } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

type SegmentType = "USER" | "CLUB" | "TEAM" | "TOURNAMENT" | "ALL";

export default function PushBroadcast() {
  const { toast } = useToast();
  const { data: user } = useUser();
  const isOwner = user?.role === "OWNER";

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [segmentType, setSegmentType] = useState<SegmentType>("CLUB");
  const [clubId, setClubId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [userIds, setUserIds] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");

  const { data: clubs } = useQuery<any[]>({ queryKey: ["/api/my-admin-clubs"] });
  const { data: tournaments } = useQuery<any[]>({ queryKey: ["/api/tournaments"] });
  const { data: bslStandings } = useQuery<any[]>({ queryKey: ["/api/bsl/standings"] });
  const bslTeams = bslStandings || [];

  const send = useMutation({
    mutationFn: async () => {
      const segment: any = { type: segmentType };
      if (segmentType === "CLUB") segment.clubId = Number(clubId);
      if (segmentType === "TEAM") segment.teamId = Number(teamId);
      if (segmentType === "TOURNAMENT") segment.tournamentId = Number(tournamentId);
      if (segmentType === "USER") segment.userIds = userIds.split(/[\s,]+/).map(s => Number(s.trim())).filter(Boolean);
      const res = await apiRequest("POST", "/api/admin/notifications/send", { title, message, url: url || undefined, segment });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Broadcast sent", description: `Delivered to ${data.sent} recipient(s).` });
      setTitle(""); setMessage(""); setUrl("");
    },
    onError: (e: any) => toast({ title: "Could not send", description: e.message, variant: "destructive" }),
  });

  const buildSegment = () => {
    const segment: any = { type: segmentType };
    if (segmentType === "CLUB") segment.clubId = Number(clubId);
    if (segmentType === "TEAM") segment.teamId = Number(teamId);
    if (segmentType === "TOURNAMENT") segment.tournamentId = Number(tournamentId);
    if (segmentType === "USER") segment.userIds = userIds.split(/[\s,]+/).map(s => Number(s.trim())).filter(Boolean);
    return segment;
  };

  const schedule = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/notification-schedules", {
        title, message, url: url || undefined,
        segment: buildSegment(),
        scheduleAt: new Date(scheduleAt).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Scheduled", description: "We'll send it at the scheduled time." });
      setTitle(""); setMessage(""); setUrl(""); setScheduleAt("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-schedules"] });
    },
    onError: (e: any) => toast({ title: "Could not schedule", description: e.message, variant: "destructive" }),
  });

  const { data: schedules } = useQuery<any[]>({ queryKey: ["/api/admin/notification-schedules"] });

  const cancelSchedule = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/notification-schedules/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-schedules"] });
      toast({ title: "Cancelled" });
    },
    onError: (e: any) => toast({ title: "Could not cancel", description: e.message, variant: "destructive" }),
  });

  const canSubmit =
    title.trim().length > 0 && message.trim().length > 0 && (
      (segmentType === "CLUB" && clubId) ||
      (segmentType === "TEAM" && teamId) ||
      (segmentType === "TOURNAMENT" && tournamentId) ||
      (segmentType === "USER" && userIds.trim().length > 0) ||
      (segmentType === "ALL" && isOwner)
    );

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Megaphone className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Push broadcast</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compose</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} data-testid="input-title" />
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" value={message} maxLength={300} rows={3} onChange={(e) => setMessage(e.target.value)} data-testid="input-message" />
          </div>
          <div>
            <Label htmlFor="url">Open URL (optional)</Label>
            <Input id="url" placeholder="/sessions/123" value={url} onChange={(e) => setUrl(e.target.value)} data-testid="input-url" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Audience</Label>
              <Select value={segmentType} onValueChange={(v) => setSegmentType(v as SegmentType)}>
                <SelectTrigger data-testid="select-segment"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLUB">Club members</SelectItem>
                  <SelectItem value="TEAM">BSL team</SelectItem>
                  <SelectItem value="TOURNAMENT">Tournament participants</SelectItem>
                  <SelectItem value="USER">Specific users</SelectItem>
                  {isOwner && <SelectItem value="ALL">Everyone (OWNER only)</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {segmentType === "CLUB" && (
              <div>
                <Label>Club</Label>
                <Select value={clubId} onValueChange={setClubId}>
                  <SelectTrigger data-testid="select-club"><SelectValue placeholder="Pick a club" /></SelectTrigger>
                  <SelectContent>
                    {(clubs || []).map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {segmentType === "TEAM" && (
              <div>
                <Label>BSL team</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger data-testid="select-team"><SelectValue placeholder="Pick a team" /></SelectTrigger>
                  <SelectContent>
                    {bslTeams.map((t: any) => (
                      <SelectItem key={t.teamId || t.id} value={String(t.teamId || t.id)}>{t.teamName || t.name || `Team ${t.teamId || t.id}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {segmentType === "TOURNAMENT" && (
              <div>
                <Label>Tournament</Label>
                <Select value={tournamentId} onValueChange={setTournamentId}>
                  <SelectTrigger data-testid="select-tournament"><SelectValue placeholder="Pick a tournament" /></SelectTrigger>
                  <SelectContent>
                    {(tournaments || []).map((t: any) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {segmentType === "USER" && (
              <div className="sm:col-span-2">
                <Label htmlFor="userIds">User IDs (comma-separated)</Label>
                <Input id="userIds" placeholder="12, 34, 56" value={userIds} onChange={(e) => setUserIds(e.target.value)} data-testid="input-user-ids" />
              </div>
            )}
          </div>

          <div className="flex items-end gap-3 pt-2">
            <div className="flex-1">
              <Label htmlFor="scheduleAt" className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" /> Schedule for later (optional)
              </Label>
              <Input
                id="scheduleAt"
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                data-testid="input-schedule-at"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
            <Badge variant="secondary">Recipients respect their notification preferences</Badge>
            <div className="flex gap-2">
              {scheduleAt && (
                <Button
                  variant="outline"
                  onClick={() => schedule.mutate()}
                  disabled={!canSubmit || schedule.isPending}
                  data-testid="button-schedule"
                >
                  {schedule.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
                  Schedule
                </Button>
              )}
              <Button onClick={() => send.mutate()} disabled={!canSubmit || send.isPending || !!scheduleAt} data-testid="button-send">
                {send.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Upcoming &amp; recent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!schedules || schedules.length === 0 ? (
            <div className="text-sm text-muted-foreground" data-testid="state-no-schedules">No scheduled broadcasts yet.</div>
          ) : (
            schedules.map((s: any) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                data-testid={`row-schedule-${s.id}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    {s.ruleKey ? <code className="text-xs">{s.ruleKey}</code> : (s.title || "Untitled")}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {new Date(s.scheduleAt).toLocaleString("en-GB")} · {s.segment?.type || "?"} · {s.message?.slice(0, 80) || ""}
                  </div>
                </div>
                <Badge
                  variant={s.status === "sent" ? "default" : s.status === "pending" ? "secondary" : s.status === "failed" ? "destructive" : "outline"}
                  data-testid={`badge-status-${s.id}`}
                >
                  {s.status}
                </Badge>
                {s.status === "pending" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => cancelSchedule.mutate(s.id)}
                    disabled={cancelSchedule.isPending}
                    data-testid={`button-cancel-${s.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
