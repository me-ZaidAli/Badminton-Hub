import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Upload, ScanText, ChevronDown, ChevronRight, Check, AlertTriangle,
  Pencil, Trash2, UserPlus, Link2, Loader2, Sparkles, ImageIcon,
  X, Save, Users, Trophy, Calendar, CheckCircle2, Clock, Shield, Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useLocation } from "wouter";

interface ExtractedPlayer {
  name: string;
  linkedProfileId: number | null;
  linkedUserId: number | null;
  linkedName: string | null;
  confidence: number;
}

interface ExtractedMatch {
  id: string;
  teamA: ExtractedPlayer[];
  teamB: ExtractedPlayer[];
  scoreA: number;
  scoreB: number;
  confidence: number;
  expanded: boolean;
  confirmed: boolean;
  edited: boolean;
  imageLabel?: string;
}

interface PlayerSearchResult {
  id: number;
  fullName: string;
  email: string;
  profileId?: number;
}

export default function AIMatchInput() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [pendingImages, setPendingImages] = useState<{ file: File; preview: string }[]>([]);
  const [extractedMatches, setExtractedMatches] = useState<ExtractedMatch[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [totalSavedCount, setTotalSavedCount] = useState(0);
  const [linkDialog, setLinkDialog] = useState<{ matchId: string; teamKey: "teamA" | "teamB"; playerIdx: number } | null>(null);
  const [createDialog, setCreateDialog] = useState<{ matchId: string; teamKey: "teamA" | "teamB"; playerIdx: number; name: string } | null>(null);
  const [playerSearch, setPlayerSearch] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [lastSavedSession, setLastSavedSession] = useState<{ id: number; title: string; count: number } | null>(null);
  const [extractionProgress, setExtractionProgress] = useState("");
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionDate, setNewSessionDate] = useState("");
  const [newSessionClubId, setNewSessionClubId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: clubs = [] } = useQuery<any[]>({
    queryKey: ["/api/clubs"],
  });

  const { data: searchResults = [], isFetching: isSearching } = useQuery<PlayerSearchResult[]>({
    queryKey: ["/api/admin/player-search", playerSearch],
    queryFn: async () => {
      if (playerSearch.length < 2) return [];
      const res = await fetch(`/api/admin/player-search?q=${encodeURIComponent(playerSearch)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: playerSearch.length >= 2,
  });

  const allSessions = useMemo(() => {
    if (!sessions.length) return [];
    return sessions
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const validFiles: { file: File; preview: string }[] = [];
    let skipped = 0;
    const readPromises = files.map((file) => {
      if (!file.type.startsWith("image/")) { skipped++; return Promise.resolve(); }
      if (file.size > 10 * 1024 * 1024) { skipped++; return Promise.resolve(); }
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          validFiles.push({ file, preview: ev.target?.result as string });
          resolve();
        };
        reader.onerror = () => resolve();
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readPromises).then(() => {
      if (validFiles.length > 0) {
        setPendingImages((prev) => [...prev, ...validFiles]);
      }
      if (skipped > 0) {
        toast({ title: "Some files skipped", description: `${skipped} file(s) were invalid or too large (max 10MB)`, variant: "destructive" });
      }
    });
    if (e.target) e.target.value = "";
  }, [toast]);

  const handleExtract = useCallback(async () => {
    if (pendingImages.length === 0) return;
    setIsExtracting(true);
    setExtractionProgress("");
    let totalNew = 0;
    const timestamp = Date.now();
    const totalImages = pendingImages.length;
    try {
      for (let imgIdx = 0; imgIdx < totalImages; imgIdx++) {
        const imgLabel = totalImages > 1 ? `Image ${imgIdx + 1} of ${totalImages}` : "Image";
        setExtractionProgress(`Processing ${imgLabel}...`);
        const img = pendingImages[imgIdx];
        const formData = new FormData();
        formData.append("image", img.file);
        try {
          const res = await fetch("/api/admin/ai-match-extract", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            let errMsg = "Extraction failed";
            try { const err = await res.json(); errMsg = err.message || errMsg; } catch {}
            toast({ title: `${imgLabel} failed`, description: errMsg, variant: "destructive" });
            continue;
          }
          const data = await res.json();
          const parsed: ExtractedMatch[] = (data.matches || []).map((m: any, i: number) => ({
            id: `ai-match-${timestamp}-${imgIdx}-${i}`,
            teamA: (m.teamA || []).map((p: any) => ({
              name: p.name || "Unknown",
              linkedProfileId: p.linkedProfileId || null,
              linkedUserId: p.linkedUserId || null,
              linkedName: p.linkedName || null,
              confidence: p.confidence ?? 0.5,
            })),
            teamB: (m.teamB || []).map((p: any) => ({
              name: p.name || "Unknown",
              linkedProfileId: p.linkedProfileId || null,
              linkedUserId: p.linkedUserId || null,
              linkedName: p.linkedName || null,
              confidence: p.confidence ?? 0.5,
            })),
            scoreA: m.scoreA ?? 0,
            scoreB: m.scoreB ?? 0,
            confidence: m.confidence ?? 0.5,
            expanded: true,
            confirmed: false,
            edited: false,
            imageLabel: totalImages > 1 ? `Image ${imgIdx + 1}` : undefined,
          }));
          totalNew += parsed.length;
          setExtractionProgress(`${imgLabel}: found ${parsed.length} matches`);
          setExtractedMatches((prev) => [...prev, ...parsed]);
        } catch (imgErr: any) {
          console.error(`[AI Match Extract] Error processing image ${imgIdx + 1}:`, imgErr);
          toast({ title: `${imgLabel} error`, description: imgErr.message || "Network error", variant: "destructive" });
        }
      }
      setPendingImages([]);
      setExtractionProgress("");
      if (totalNew > 0) {
        toast({ title: "Extraction Complete", description: `Found ${totalNew} match(es) from ${totalImages} image(s)` });
      } else {
        toast({ title: "No Matches Found", description: "Could not extract any matches from the uploaded images", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Extraction Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsExtracting(false);
      setExtractionProgress("");
    }
  }, [pendingImages, toast]);

  const toggleMatchExpand = (matchId: string) => {
    setExtractedMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, expanded: !m.expanded } : m))
    );
  };

  const updateMatchScore = (matchId: string, field: "scoreA" | "scoreB", value: number) => {
    setExtractedMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, [field]: value, edited: true } : m))
    );
  };

  const removeMatch = (matchId: string) => {
    setExtractedMatches((prev) => prev.filter((m) => m.id !== matchId));
  };

  const linkPlayerToProfile = (matchId: string, teamKey: "teamA" | "teamB", playerIdx: number, profile: PlayerSearchResult) => {
    const sourceMatch = extractedMatches.find(m => m.id === matchId);
    const sourcePlayer = sourceMatch?.[teamKey]?.[playerIdx];
    const aiName = sourcePlayer?.name?.toLowerCase().trim() || "";

    setExtractedMatches((prev) =>
      prev.map((m) => {
        if (m.confirmed) return m;
        let changed = false;
        const newTeamA = m.teamA.map((p) => {
          if (p.linkedUserId) return p;
          if (p.name.toLowerCase().trim() === aiName || (m.id === matchId && m.teamA.indexOf(p) === playerIdx && teamKey === "teamA")) {
            changed = true;
            return { ...p, linkedUserId: profile.id, linkedProfileId: profile.profileId || null, linkedName: profile.fullName, confidence: 1.0 };
          }
          return p;
        });
        const newTeamB = m.teamB.map((p) => {
          if (p.linkedUserId) return p;
          if (p.name.toLowerCase().trim() === aiName || (m.id === matchId && m.teamB.indexOf(p) === playerIdx && teamKey === "teamB")) {
            changed = true;
            return { ...p, linkedUserId: profile.id, linkedProfileId: profile.profileId || null, linkedName: profile.fullName, confidence: 1.0 };
          }
          return p;
        });
        if (!changed) return m;
        return { ...m, teamA: newTeamA, teamB: newTeamB, edited: true };
      })
    );
    setLinkDialog(null);
    setPlayerSearch("");
  };

  const unlinkPlayer = (matchId: string, teamKey: "teamA" | "teamB", playerIdx: number) => {
    setExtractedMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        const team = [...m[teamKey]];
        team[playerIdx] = {
          ...team[playerIdx],
          linkedUserId: null,
          linkedProfileId: null,
          linkedName: null,
          confidence: team[playerIdx].confidence,
        };
        return { ...m, [teamKey]: team, edited: true };
      })
    );
  };

  const openCreateDialog = (matchId: string, teamKey: "teamA" | "teamB", playerIdx: number, name: string) => {
    setCreateDialog({ matchId, teamKey, playerIdx, name });
    setNewPlayerName(name);
    setLinkDialog(null);
  };

  const createPlayerMutation = useMutation({
    mutationFn: async (data: { fullName: string }) => {
      const res = await apiRequest("POST", "/api/admin/ai-match-quick-create-player", data);
      return res.json();
    },
    onSuccess: (newUser, _vars) => {
      if (createDialog) {
        const sourceMatch = extractedMatches.find(m => m.id === createDialog.matchId);
        const sourcePlayer = sourceMatch?.[createDialog.teamKey]?.[createDialog.playerIdx];
        const aiName = sourcePlayer?.name?.toLowerCase().trim() || "";

        setExtractedMatches((prev) =>
          prev.map((m) => {
            if (m.confirmed) return m;
            let changed = false;
            const newTeamA = m.teamA.map((p) => {
              if (p.linkedUserId) return p;
              if (p.name.toLowerCase().trim() === aiName) {
                changed = true;
                return { ...p, linkedUserId: newUser.id, linkedProfileId: newUser.profileId || null, linkedName: newUser.fullName, confidence: 1.0 };
              }
              return p;
            });
            const newTeamB = m.teamB.map((p) => {
              if (p.linkedUserId) return p;
              if (p.name.toLowerCase().trim() === aiName) {
                changed = true;
                return { ...p, linkedUserId: newUser.id, linkedProfileId: newUser.profileId || null, linkedName: newUser.fullName, confidence: 1.0 };
              }
              return p;
            });
            if (!changed) return m;
            return { ...m, teamA: newTeamA, teamB: newTeamB, edited: true };
          })
        );
        const count = extractedMatches.reduce((c, m) => {
          if (m.confirmed) return c;
          return c + [...m.teamA, ...m.teamB].filter(p => !p.linkedUserId && p.name.toLowerCase().trim() === aiName).length;
        }, 0);
        toast({ title: "Player Created", description: `${newUser.fullName} linked in ${count} place(s)` });
      }
      setCreateDialog(null);
      setNewPlayerName("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to create player", description: err.message, variant: "destructive" });
    },
  });

  const validateBadmintonScore = useCallback((scoreA: number, scoreB: number): string | null => {
    if (scoreA < 0 || scoreB < 0) return "Scores cannot be negative";
    if (scoreA === 0 && scoreB === 0) return "Both scores are 0";
    const high = Math.max(scoreA, scoreB);
    const low = Math.min(scoreA, scoreB);
    if (high < 21) return null;
    if (high === 21 && low <= 19) return null;
    if (high > 21 && high <= 30 && (high - low) === 2) return null;
    if (high === 30 && low === 29) return null;
    if (high > 30) return `Score ${high} exceeds maximum 30`;
    if (high === 21 && low === 20) return "At 20-all, winner must lead by 2 (e.g. 22-20)";
    if (high > 21 && (high - low) !== 2) return `Deuce rule: winner must be exactly 2 ahead (${high}-${high-2} or ${low+2}-${low})`;
    return `Invalid score: ${scoreA}-${scoreB}`;
  }, []);

  const getMatchValidation = useCallback(
    (match: ExtractedMatch) => {
      const errors: string[] = [];
      if (!selectedSessionId) errors.push("No session selected");
      const allPlayers = [...match.teamA, ...match.teamB];
      const unlinked = allPlayers.filter((p) => !p.linkedProfileId && !p.linkedUserId);
      if (unlinked.length > 0) errors.push(`${unlinked.length} unlinked player(s)`);
      const scoreErr = validateBadmintonScore(match.scoreA, match.scoreB);
      if (scoreErr) errors.push(scoreErr);
      return errors;
    },
    [selectedSessionId]
  );

  const unsavedMatches = useMemo(() => extractedMatches.filter((m) => !m.confirmed), [extractedMatches]);

  const canSaveUnsaved = useMemo(() => {
    if (!selectedSessionId || unsavedMatches.length === 0) return false;
    return unsavedMatches.every((m) => getMatchValidation(m).length === 0);
  }, [selectedSessionId, unsavedMatches, getMatchValidation]);

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      if (!newSessionTitle.trim() || !newSessionDate || !newSessionClubId) throw new Error("All fields required");
      const res = await apiRequest("POST", "/api/sessions", {
        title: newSessionTitle.trim(),
        date: new Date(newSessionDate).toISOString(),
        clubId: parseInt(newSessionClubId),
        startTime: format(new Date(newSessionDate), "HH:mm"),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setSelectedSessionId(String(data.id));
      setShowCreateSession(false);
      setNewSessionTitle("");
      setNewSessionDate("");
      setNewSessionClubId("");
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Session Created", description: `"${data.title}" is ready for match import` });
    },
    onError: (err: any) => {
      toast({ title: "Failed to Create Session", description: err.message, variant: "destructive" });
    },
  });

  const saveMatchesMutation = useMutation({
    mutationFn: async (matches: ExtractedMatch[]) => {
      const payload = matches.map((m) => ({
        sessionId: parseInt(selectedSessionId),
        teamAPlayer1Id: m.teamA[0]?.linkedUserId || null,
        teamAPlayer2Id: m.teamA[1]?.linkedUserId || null,
        teamBPlayer1Id: m.teamB[0]?.linkedUserId || null,
        teamBPlayer2Id: m.teamB[1]?.linkedUserId || null,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        edited: m.edited,
      }));
      const res = await apiRequest("POST", "/api/admin/ai-match-save", { matches: payload });
      return res.json();
    },
    onSuccess: (data, savedMatches) => {
      const newSaved = data.savedCount || 0;
      const savedSid = data.sessionId;
      setTotalSavedCount((prev) => prev + newSaved);
      const savedIds = new Set(savedMatches.map((m) => m.id));
      setExtractedMatches((prev) => prev.map((m) => savedIds.has(m.id) ? { ...m, confirmed: true } : m));
      const sessionTitle = allSessions.find((s: any) => String(s.id) === selectedSessionId)?.title || `Session #${savedSid}`;
      setLastSavedSession({ id: savedSid, title: sessionTitle, count: newSaved });
      toast({
        title: `${newSaved} Match(es) Saved`,
        description: `Added to "${sessionTitle}". Tap "View Session" to see them.`,
        action: (
          <Button size="sm" variant="outline" onClick={() => navigate(`/sessions/${savedSid}`)} data-testid="button-view-saved-session">
            View Session
          </Button>
        ),
        duration: 15000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      if (selectedSessionId) {
        queryClient.invalidateQueries({ queryKey: ["/api/sessions", parseInt(selectedSessionId), "matches"] });
        queryClient.invalidateQueries({ queryKey: ["/api/sessions", parseInt(selectedSessionId), "leaderboard"] });
      }
    },
    onError: (err: any) => {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    },
  });

  const confirmMatch = (matchId: string) => {
    const match = extractedMatches.find((m) => m.id === matchId);
    if (!match) return;
    const errors = getMatchValidation(match);
    if (errors.length > 0) {
      toast({ title: "Cannot confirm", description: errors.join(", "), variant: "destructive" });
      return;
    }
    setExtractedMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, confirmed: true } : m))
    );
  };

  const handleSaveAll = () => {
    const toSave = unsavedMatches.filter((m) => getMatchValidation(m).length === 0);
    if (toSave.length === 0) {
      toast({ title: "Nothing to save", description: "No unsaved valid matches", variant: "destructive" });
      return;
    }
    saveMatchesMutation.mutate(toSave);
  };

  const hasUnlinkedPlayers = useMemo(() => {
    return extractedMatches.some((m) =>
      [...m.teamA, ...m.teamB].some((p) => !p.linkedProfileId && !p.linkedUserId)
    );
  }, [extractedMatches]);

  const [isLinking, setIsLinking] = useState(false);

  const handleLinkAll = useCallback(async () => {
    if (!selectedSessionId || extractedMatches.length === 0) return;
    setIsLinking(true);
    try {
      const res = await fetch(`/api/admin/player-search?q=*&sessionId=${selectedSessionId}&limit=500`);
      let allPlayers: PlayerSearchResult[] = [];
      if (res.ok) {
        allPlayers = await res.json();
      }
      if (allPlayers.length === 0) {
        const res2 = await fetch(`/api/admin/player-search?q=*&limit=500`);
        if (res2.ok) allPlayers = await res2.json();
      }
      if (allPlayers.length === 0) {
        toast({ title: "No players found", description: "Could not find any players to match against", variant: "destructive" });
        return;
      }

      setExtractedMatches((prev) =>
        prev.map((match) => {
          if (match.confirmed) return match;
          const usedIds = new Set<number>();
          const allSlots = [
            ...match.teamA.map((p, i) => ({ team: "teamA" as const, idx: i, player: p })),
            ...match.teamB.map((p, i) => ({ team: "teamB" as const, idx: i, player: p })),
          ];

          const slotCandidates = allSlots.map((slot) => {
            if (slot.player.linkedUserId) return { ...slot, candidates: [] };
            const pName = slot.player.name.toLowerCase().trim();
            const candidates: { user: PlayerSearchResult; score: number }[] = [];
            for (const u of allPlayers) {
              const uName = (u.fullName || "").toLowerCase().trim();
              if (!uName) continue;
              if (uName === pName) { candidates.push({ user: u, score: 1.0 }); continue; }
              const pParts = pName.split(/\s+/).filter((s) => s.length > 0);
              const uParts = uName.split(/\s+/).filter((s) => s.length > 0);
              let matchParts = 0;
              for (const pp of pParts) {
                for (const up of uParts) {
                  if (pp === up) { matchParts++; break; }
                  if (pp.length >= 3 && up.length >= 3 && (up.includes(pp) || pp.includes(up))) { matchParts++; break; }
                }
              }
              const score = matchParts / Math.max(pParts.length, uParts.length);
              if (score >= 0.5) candidates.push({ user: u, score });
            }
            candidates.sort((a, b) => b.score - a.score);
            return { ...slot, candidates };
          });

          slotCandidates.sort((a, b) => {
            const aTop = a.candidates[0]?.score || 0;
            const bTop = b.candidates[0]?.score || 0;
            return bTop - aTop;
          });

          const newTeamA = [...match.teamA];
          const newTeamB = [...match.teamB];

          for (const sc of slotCandidates) {
            if (sc.player.linkedUserId) {
              usedIds.add(sc.player.linkedUserId);
              continue;
            }
            for (const cand of sc.candidates) {
              if (usedIds.has(cand.user.id)) continue;
              usedIds.add(cand.user.id);
              const updated = {
                ...sc.player,
                linkedUserId: cand.user.id,
                linkedProfileId: cand.user.profileId || null,
                linkedName: cand.user.fullName,
                confidence: cand.score,
              };
              if (sc.team === "teamA") newTeamA[sc.idx] = updated;
              else newTeamB[sc.idx] = updated;
              break;
            }
          }

          return { ...match, teamA: newTeamA, teamB: newTeamB, edited: true };
        })
      );

      toast({ title: "Linking Complete", description: "Matched player names to existing profiles. Review any unlinked players." });
    } catch (err: any) {
      toast({ title: "Linking Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLinking(false);
    }
  }, [selectedSessionId, extractedMatches, toast]);

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return "text-emerald-600 dark:text-emerald-400";
    if (c >= 0.5) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const confidenceBg = (c: number) => {
    if (c >= 0.8) return "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30";
    if (c >= 0.5) return "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30";
    return "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30";
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6" data-testid="ai-match-input-page">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
          <ScanText className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent" data-testid="text-page-title">
            AI Match Input
          </h1>
          <p className="text-sm text-muted-foreground">Upload score sheets and let AI extract match data</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-dashed border-2 hover:border-violet-400 dark:hover:border-violet-500 transition-colors" data-testid="card-image-upload">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              {pendingImages.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{pendingImages.length} image(s) ready to extract</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingImages([])}
                      className="text-muted-foreground h-7 text-xs"
                      data-testid="button-clear-all-images"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Clear All
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pendingImages.map((img, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={img.preview}
                          alt={`Score sheet ${i + 1}`}
                          className="w-20 h-20 rounded-lg object-cover border shadow-sm"
                          data-testid={`img-preview-${i}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -top-1.5 -right-1.5 bg-black/60 text-white hover:bg-black/80 rounded-full h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setPendingImages((prev) => prev.filter((_, idx) => idx !== i))}
                          data-testid={`button-remove-image-${i}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-violet-400 dark:hover:border-violet-500 flex items-center justify-center cursor-pointer transition-colors hover:bg-violet-50/50 dark:hover:bg-violet-500/5"
                      data-testid="button-add-more-images"
                    >
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              )}
              {pendingImages.length === 0 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-12 flex flex-col items-center gap-3 cursor-pointer rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-violet-400 dark:hover:border-violet-500 transition-all hover:bg-violet-50/50 dark:hover:bg-violet-500/5"
                  data-testid="area-upload-drop"
                >
                  <div className="p-3 rounded-full bg-violet-100 dark:bg-violet-500/20">
                    <ImageIcon className="w-8 h-8 text-violet-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Click to upload score sheets</p>
                    <p className="text-xs text-muted-foreground mt-1">Score sheets, whiteboards, screenshots - PNG, JPG up to 10MB each. Select multiple files.</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
                data-testid="input-file-upload"
              />
              {pendingImages.length > 0 && (
                <Button
                  onClick={handleExtract}
                  disabled={isExtracting}
                  className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
                  data-testid="button-extract"
                >
                  {isExtracting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extracting from {pendingImages.length} image(s)...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Extract Matches from {pendingImages.length} Image(s)</>
                  )}
                </Button>
              )}
              {isExtracting && extractionProgress && (
                <p className="text-sm text-muted-foreground text-center animate-pulse" data-testid="text-extraction-progress">{extractionProgress}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {lastSavedSession && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30" data-testid="banner-save-success">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{lastSavedSession.count} match(es) saved successfully</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">Added to: {lastSavedSession.title}</p>
            </div>
            <Button size="sm" onClick={() => navigate(`/sessions/${lastSavedSession.id}`)} className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0" data-testid="button-go-to-session">
              View Session
            </Button>
          </div>
        </motion.div>
      )}

      {(extractedMatches.length > 0 || pendingImages.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card data-testid="card-session-select">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-violet-500 flex-shrink-0" />
                <div className="flex-1">
                  <Label className="text-sm font-medium">Link to Session</Label>
                  <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                    <SelectTrigger className="mt-1" data-testid="select-session">
                      <SelectValue placeholder="Select a session..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {allSessions.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)} data-testid={`select-session-${s.id}`}>
                          {format(new Date(s.date), "dd MMM yyyy")} — {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!selectedSessionId && (
                  <Badge variant="outline" className="text-red-500 border-red-300 dark:border-red-500/40 flex-shrink-0 mt-5">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Required
                  </Badge>
                )}
                {selectedSessionId && (
                  <Badge className="bg-emerald-500 text-white flex-shrink-0 mt-5">
                    <Check className="w-3 h-3 mr-1" /> Linked
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/30"
                onClick={() => setShowCreateSession(true)}
                data-testid="button-create-session"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Create New Session
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {hasUnlinkedPlayers && extractedMatches.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm" data-testid="warning-unlinked">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">Some players are not linked yet. Link them to existing profiles or create new ones.</span>
            {selectedSessionId && (
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 text-violet-600 dark:text-violet-400 border-violet-300 dark:border-violet-500/40 hover:bg-violet-50 dark:hover:bg-violet-500/10"
                onClick={handleLinkAll}
                disabled={isLinking}
                data-testid="button-link-all"
              >
                {isLinking ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5 mr-1.5" />}
                Link All
              </Button>
            )}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {extractedMatches.map((match, idx) => {
          const errors = getMatchValidation(match);
          const isValid = errors.length === 0;
          const showImageHeader = match.imageLabel && (idx === 0 || extractedMatches[idx - 1]?.imageLabel !== match.imageLabel);
          return (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: idx * 0.05 }}
            >
              {showImageHeader && (
                <div className="flex items-center gap-2 mb-2 mt-4" data-testid={`header-${match.imageLabel?.replace(/\s/g, "-").toLowerCase()}`}>
                  <ImageIcon className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">{match.imageLabel}</span>
                  <Separator className="flex-1" />
                </div>
              )}
              <Card
                className={`overflow-hidden transition-all ${
                  match.confirmed
                    ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/5"
                    : isValid
                    ? "border-violet-200 dark:border-violet-500/30"
                    : "border-amber-200 dark:border-amber-500/30"
                }`}
                data-testid={`card-match-${idx}`}
              >
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleMatchExpand(match.id)}
                  data-testid={`button-toggle-match-${idx}`}
                >
                  <div className="flex items-center gap-3">
                    {match.expanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-violet-500" />
                      <span className="font-semibold text-sm">Match {idx + 1}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {match.teamA.map((p) => p.linkedName || p.name).join(" & ")} vs{" "}
                      {match.teamB.map((p) => p.linkedName || p.name).join(" & ")}
                    </span>
                    <Badge variant="outline" className={`text-xs ${validateBadmintonScore(match.scoreA, match.scoreB) ? "border-red-400 text-red-500" : ""}`}>
                      {match.scoreA} - {match.scoreB}
                    </Badge>
                    {validateBadmintonScore(match.scoreA, match.scoreB) && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {match.confirmed ? (
                      <Badge className="bg-emerald-500 text-white text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmed
                      </Badge>
                    ) : isValid ? (
                      <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40 text-xs">
                        <Check className="w-3 h-3 mr-1" /> Ready
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/40 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" /> {errors.length} issue(s)
                      </Badge>
                    )}
                    {match.edited && (
                      <Badge variant="outline" className="text-violet-600 dark:text-violet-400 text-xs">
                        <Pencil className="w-3 h-3 mr-1" /> Edited
                      </Badge>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {match.expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Separator />
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <TeamCard
                            label="Team A"
                            players={match.teamA}
                            matchId={match.id}
                            teamKey="teamA"
                            confidenceColor={confidenceColor}
                            confidenceBg={confidenceBg}
                            onLink={(playerIdx) => {
                              setLinkDialog({ matchId: match.id, teamKey: "teamA", playerIdx });
                              setPlayerSearch("");
                            }}
                            onUnlink={(playerIdx) => unlinkPlayer(match.id, "teamA", playerIdx)}
                            disabled={match.confirmed}
                          />
                          <TeamCard
                            label="Team B"
                            players={match.teamB}
                            matchId={match.id}
                            teamKey="teamB"
                            confidenceColor={confidenceColor}
                            confidenceBg={confidenceBg}
                            onLink={(playerIdx) => {
                              setLinkDialog({ matchId: match.id, teamKey: "teamB", playerIdx });
                              setPlayerSearch("");
                            }}
                            onUnlink={(playerIdx) => unlinkPlayer(match.id, "teamB", playerIdx)}
                            disabled={match.confirmed}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 flex-1">
                              <Label className="text-xs text-muted-foreground whitespace-nowrap">Score A</Label>
                              <Input
                                type="number"
                                min={0}
                                value={match.scoreA}
                                onChange={(e) => updateMatchScore(match.id, "scoreA", parseInt(e.target.value) || 0)}
                                className={`w-20 h-8 text-center text-sm ${validateBadmintonScore(match.scoreA, match.scoreB) ? "border-red-400 dark:border-red-500" : ""}`}
                                disabled={match.confirmed}
                                data-testid={`input-score-a-${idx}`}
                              />
                            </div>
                            <span className="text-lg font-bold text-muted-foreground">—</span>
                            <div className="flex items-center gap-2 flex-1 justify-end">
                              <Label className="text-xs text-muted-foreground whitespace-nowrap">Score B</Label>
                              <Input
                                type="number"
                                min={0}
                                value={match.scoreB}
                                onChange={(e) => updateMatchScore(match.id, "scoreB", parseInt(e.target.value) || 0)}
                                className={`w-20 h-8 text-center text-sm ${validateBadmintonScore(match.scoreA, match.scoreB) ? "border-red-400 dark:border-red-500" : ""}`}
                                disabled={match.confirmed}
                                data-testid={`input-score-b-${idx}`}
                              />
                            </div>
                          </div>
                          {validateBadmintonScore(match.scoreA, match.scoreB) && (
                            <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1" data-testid={`score-warning-${idx}`}>
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              {validateBadmintonScore(match.scoreA, match.scoreB)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${confidenceColor(match.confidence)}`}>
                            <Sparkles className="w-3 h-3 mr-1" /> {Math.round(match.confidence * 100)}% confidence
                          </Badge>
                          <div className="flex-1" />
                          {!match.confirmed && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMatch(match.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 h-8"
                                data-testid={`button-remove-match-${idx}`}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                              </Button>
                              <Button
                                size="sm"
                                disabled={!isValid}
                                onClick={() => confirmMatch(match.id)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white h-8"
                                data-testid={`button-confirm-match-${idx}`}
                              >
                                <Check className="w-3.5 h-3.5 mr-1" /> Confirm
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {extractedMatches.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{unsavedMatches.length} unsaved, {extractedMatches.length - unsavedMatches.length} saved</span>
              {totalSavedCount > 0 && (
                <Badge className="bg-emerald-500 text-white">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> {totalSavedCount} total saved
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unsavedMatches.length === 0 && pendingImages.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-add-more-after-save"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add More Images
                </Button>
              )}
              <Button
                onClick={handleSaveAll}
                disabled={!canSaveUnsaved || saveMatchesMutation.isPending || unsavedMatches.length === 0}
                className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
                data-testid="button-save-all"
              >
                {saveMatchesMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : unsavedMatches.length === 0 ? (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> All Saved</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save {unsavedMatches.length} Match(es)</>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <Dialog open={!!linkDialog} onOpenChange={() => { setLinkDialog(null); setPlayerSearch(""); }}>
        <DialogContent className="max-w-md" data-testid="dialog-link-player">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-violet-500" /> Link Player
            </DialogTitle>
            <DialogDescription>
              Search for an existing player or create a new one.
            </DialogDescription>
          </DialogHeader>
          {linkDialog && (() => {
            const match = extractedMatches.find((m) => m.id === linkDialog.matchId);
            const player = match?.[linkDialog.teamKey]?.[linkDialog.playerIdx];
            const aiName = player?.name?.toLowerCase().trim() || "";
            const sameNameCount = aiName ? extractedMatches.reduce((count, m) => {
              if (m.confirmed) return count;
              return count + [...m.teamA, ...m.teamB].filter(p => !p.linkedUserId && p.name.toLowerCase().trim() === aiName).length;
            }, 0) : 0;
            return (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm">
                    <span className="text-muted-foreground">AI detected name:</span>{" "}
                    <strong>{player?.name}</strong>
                  </p>
                  {sameNameCount > 1 && (
                    <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                      This name appears in {sameNameCount} places — linking will apply to all of them
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm">Search existing players</Label>
                  <Input
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    placeholder="Type a name or email..."
                    className="mt-1"
                    data-testid="input-player-search"
                  />
                </div>
                {isSearching && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1" data-testid="list-search-results">
                    {searchResults.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => linkPlayerToProfile(linkDialog.matchId, linkDialog.teamKey, linkDialog.playerIdx, r)}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-500/10 cursor-pointer transition-colors"
                        data-testid={`result-player-${r.id}`}
                      >
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                        </div>
                        <Link2 className="w-4 h-4 text-violet-500" />
                      </div>
                    ))}
                  </div>
                )}
                {playerSearch.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No players found</p>
                )}
                <Separator />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => openCreateDialog(linkDialog.matchId, linkDialog.teamKey, linkDialog.playerIdx, player?.name || "")}
                  data-testid="button-open-create"
                >
                  <UserPlus className="w-4 h-4 mr-2" /> Create New Player
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!createDialog} onOpenChange={() => setCreateDialog(null)}>
        <DialogContent className="max-w-sm" data-testid="dialog-create-player">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-500" /> Quick Create Player
            </DialogTitle>
            <DialogDescription>
              Create a new player and link them to this match.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Full Name</Label>
              <Input
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Player name"
                className="mt-1"
                data-testid="input-new-player-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(null)} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button
              onClick={() => createPlayerMutation.mutate({ fullName: newPlayerName })}
              disabled={!newPlayerName.trim() || createPlayerMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              data-testid="button-create-player"
            >
              {createPlayerMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" /> Create & Link</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateSession} onOpenChange={setShowCreateSession}>
        <DialogContent className="max-w-sm" data-testid="dialog-create-session">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-500" /> Create New Session
            </DialogTitle>
            <DialogDescription>
              Create a quick session to link your imported matches to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Club</Label>
              <Select value={newSessionClubId} onValueChange={setNewSessionClubId}>
                <SelectTrigger className="mt-1" data-testid="select-new-session-club">
                  <SelectValue placeholder="Select club..." />
                </SelectTrigger>
                <SelectContent>
                  {clubs.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)} data-testid={`select-club-${c.id}`}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Session Title</Label>
              <Input
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                placeholder="e.g. Club Night"
                className="mt-1"
                data-testid="input-new-session-title"
              />
            </div>
            <div>
              <Label className="text-sm">Date & Time</Label>
              <Input
                type="datetime-local"
                value={newSessionDate}
                onChange={(e) => setNewSessionDate(e.target.value)}
                className="mt-1"
                data-testid="input-new-session-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSession(false)} data-testid="button-cancel-create-session">
              Cancel
            </Button>
            <Button
              onClick={() => createSessionMutation.mutate()}
              disabled={!newSessionTitle.trim() || !newSessionDate || !newSessionClubId || createSessionMutation.isPending}
              className="bg-violet-500 hover:bg-violet-600 text-white"
              data-testid="button-confirm-create-session"
            >
              {createSessionMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" /> Create Session</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamCard({
  label,
  players,
  matchId,
  teamKey,
  confidenceColor,
  confidenceBg,
  onLink,
  onUnlink,
  disabled,
}: {
  label: string;
  players: ExtractedPlayer[];
  matchId: string;
  teamKey: "teamA" | "teamB";
  confidenceColor: (c: number) => string;
  confidenceBg: (c: number) => string;
  onLink: (playerIdx: number) => void;
  onUnlink: (playerIdx: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2" data-testid={`team-card-${teamKey}`}>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {players.map((player, pidx) => {
        const isLinked = !!player.linkedUserId || !!player.linkedProfileId;
        return (
          <div
            key={pidx}
            className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
              isLinked ? confidenceBg(player.confidence) : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30"
            }`}
            data-testid={`player-${teamKey}-${pidx}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {isLinked ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    {player.linkedName}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {player.name}
                    <Badge variant="outline" className="text-[10px] ml-1 border-red-300 dark:border-red-500/40 text-red-500">
                      Unlinked Player
                    </Badge>
                  </span>
                )}
              </p>
              {isLinked && player.name !== player.linkedName && (
                <p className="text-xs text-muted-foreground">AI detected: {player.name}</p>
              )}
            </div>
            <span className={`text-[10px] font-medium ${confidenceColor(player.confidence)}`}>
              {Math.round(player.confidence * 100)}%
            </span>
            {!disabled && (
              <div className="flex items-center gap-1">
                {isLinked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20"
                    onClick={() => onUnlink(pidx)}
                    data-testid={`button-unlink-${teamKey}-${pidx}`}
                  >
                    <X className="w-3 h-3 mr-1" /> Unlink
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20"
                  onClick={() => onLink(pidx)}
                  data-testid={`button-link-${teamKey}-${pidx}`}
                >
                  <Link2 className="w-3 h-3 mr-1" /> {isLinked ? "Change" : "Link"}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
