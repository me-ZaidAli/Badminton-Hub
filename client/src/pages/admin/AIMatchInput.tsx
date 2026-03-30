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
  X, Save, Users, Trophy, Calendar, CheckCircle2, Clock, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

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

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedMatches, setExtractedMatches] = useState<ExtractedMatch[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [linkDialog, setLinkDialog] = useState<{ matchId: string; teamKey: "teamA" | "teamB"; playerIdx: number } | null>(null);
  const [createDialog, setCreateDialog] = useState<{ matchId: string; teamKey: "teamA" | "teamB"; playerIdx: number; name: string } | null>(null);
  const [playerSearch, setPlayerSearch] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions"],
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

  const activeSessions = useMemo(() => {
    if (!sessions.length) return [];
    return sessions
      .filter((s: any) => s.status !== "CANCELLED")
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50);
  }, [sessions]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setExtractedMatches([]);
    setSavedCount(0);
  }, [toast]);

  const handleExtract = useCallback(async () => {
    if (!selectedImage) return;
    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedImage);
      const res = await fetch("/api/admin/ai-match-extract", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Extraction failed");
      }
      const data = await res.json();
      const parsed: ExtractedMatch[] = (data.matches || []).map((m: any, i: number) => ({
        id: `ai-match-${Date.now()}-${i}`,
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
      }));
      setExtractedMatches(parsed);
      toast({ title: "Extraction Complete", description: `Found ${parsed.length} match(es) from the image` });
    } catch (err: any) {
      toast({ title: "Extraction Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsExtracting(false);
    }
  }, [selectedImage, toast]);

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
    setExtractedMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        const team = [...m[teamKey]];
        team[playerIdx] = {
          ...team[playerIdx],
          linkedUserId: profile.id,
          linkedProfileId: profile.profileId || null,
          linkedName: profile.fullName,
          confidence: 1.0,
        };
        return { ...m, [teamKey]: team, edited: true };
      })
    );
    setLinkDialog(null);
    setPlayerSearch("");
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
        setExtractedMatches((prev) =>
          prev.map((m) => {
            if (m.id !== createDialog.matchId) return m;
            const team = [...m[createDialog.teamKey]];
            team[createDialog.playerIdx] = {
              ...team[createDialog.playerIdx],
              linkedUserId: newUser.id,
              linkedProfileId: newUser.profileId || null,
              linkedName: newUser.fullName,
              confidence: 1.0,
            };
            return { ...m, [createDialog.teamKey]: team, edited: true };
          })
        );
        toast({ title: "Player Created", description: `${newUser.fullName} added and linked` });
      }
      setCreateDialog(null);
      setNewPlayerName("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to create player", description: err.message, variant: "destructive" });
    },
  });

  const getMatchValidation = useCallback(
    (match: ExtractedMatch) => {
      const errors: string[] = [];
      if (!selectedSessionId) errors.push("No session selected");
      const allPlayers = [...match.teamA, ...match.teamB];
      const unlinked = allPlayers.filter((p) => !p.linkedProfileId && !p.linkedUserId);
      if (unlinked.length > 0) errors.push(`${unlinked.length} unlinked player(s)`);
      if (match.scoreA < 0 || match.scoreB < 0) errors.push("Invalid scores");
      if (match.scoreA === 0 && match.scoreB === 0) errors.push("Both scores are 0");
      return errors;
    },
    [selectedSessionId]
  );

  const canConfirmAll = useMemo(() => {
    if (!selectedSessionId || extractedMatches.length === 0) return false;
    return extractedMatches.every((m) => getMatchValidation(m).length === 0);
  }, [selectedSessionId, extractedMatches, getMatchValidation]);

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
    onSuccess: (data) => {
      setSavedCount(data.savedCount || 0);
      setExtractedMatches((prev) => prev.map((m) => ({ ...m, confirmed: true })));
      toast({ title: "Matches Saved", description: `${data.savedCount} match(es) saved to the session` });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
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
    const toSave = extractedMatches.filter((m) => {
      const errors = getMatchValidation(m);
      return errors.length === 0;
    });
    if (toSave.length === 0) {
      toast({ title: "Nothing to save", description: "No valid matches to save", variant: "destructive" });
      return;
    }
    saveMatchesMutation.mutate(toSave);
  };

  const hasUnlinkedPlayers = useMemo(() => {
    return extractedMatches.some((m) =>
      [...m.teamA, ...m.teamB].some((p) => !p.linkedProfileId && !p.linkedUserId)
    );
  }, [extractedMatches]);

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
            <div className="flex flex-col items-center gap-4">
              {imagePreview ? (
                <div className="relative w-full max-w-md">
                  <img src={imagePreview} alt="Score sheet preview" className="rounded-xl shadow-md w-full max-h-64 object-contain" data-testid="img-preview" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70 rounded-full h-8 w-8"
                    onClick={() => { setSelectedImage(null); setImagePreview(null); setExtractedMatches([]); }}
                    data-testid="button-remove-image"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-12 flex flex-col items-center gap-3 cursor-pointer rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-violet-400 dark:hover:border-violet-500 transition-all hover:bg-violet-50/50 dark:hover:bg-violet-500/5"
                  data-testid="area-upload-drop"
                >
                  <div className="p-3 rounded-full bg-violet-100 dark:bg-violet-500/20">
                    <ImageIcon className="w-8 h-8 text-violet-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Click to upload a score sheet</p>
                    <p className="text-xs text-muted-foreground mt-1">Score sheets, whiteboards, screenshots - PNG, JPG up to 10MB</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
                data-testid="input-file-upload"
              />
              {selectedImage && (
                <div className="flex gap-2 w-full max-w-md">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-change-image"
                  >
                    <Upload className="w-4 h-4 mr-2" /> Change Image
                  </Button>
                  <Button
                    onClick={handleExtract}
                    disabled={isExtracting}
                    className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
                    data-testid="button-extract"
                  >
                    {isExtracting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extracting...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> Extract Matches</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {extractedMatches.length > 0 && (
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
                    <SelectContent>
                      {activeSessions.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)} data-testid={`select-session-${s.id}`}>
                          {s.title} — {format(new Date(s.date), "dd MMM yyyy HH:mm")}
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
            </CardContent>
          </Card>
        </motion.div>
      )}

      {hasUnlinkedPlayers && extractedMatches.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm" data-testid="warning-unlinked">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Some players could not be automatically matched. Please link or create them before saving.</span>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {extractedMatches.map((match, idx) => {
          const errors = getMatchValidation(match);
          const isValid = errors.length === 0;
          return (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: idx * 0.05 }}
            >
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
                    <Badge variant="outline" className="text-xs">
                      {match.scoreA} - {match.scoreB}
                    </Badge>
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
                            disabled={match.confirmed}
                          />
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 flex-1">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Score A</Label>
                            <Input
                              type="number"
                              min={0}
                              value={match.scoreA}
                              onChange={(e) => updateMatchScore(match.id, "scoreA", parseInt(e.target.value) || 0)}
                              className="w-20 h-8 text-center text-sm"
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
                              className="w-20 h-8 text-center text-sm"
                              disabled={match.confirmed}
                              data-testid={`input-score-b-${idx}`}
                            />
                          </div>
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
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {extractedMatches.filter((m) => getMatchValidation(m).length === 0).length} of {extractedMatches.length} match(es) valid
              {savedCount > 0 && (
                <Badge className="ml-2 bg-emerald-500 text-white">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> {savedCount} saved
                </Badge>
              )}
            </div>
            <Button
              onClick={handleSaveAll}
              disabled={!canConfirmAll || saveMatchesMutation.isPending || savedCount > 0}
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
              data-testid="button-save-all"
            >
              {saveMatchesMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : savedCount > 0 ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> All Saved</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save All Matches</>
              )}
            </Button>
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
            return (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm">
                    <span className="text-muted-foreground">AI detected name:</span>{" "}
                    <strong>{player?.name}</strong>
                  </p>
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
  disabled,
}: {
  label: string;
  players: ExtractedPlayer[];
  matchId: string;
  teamKey: "teamA" | "teamB";
  confidenceColor: (c: number) => string;
  confidenceBg: (c: number) => string;
  onLink: (playerIdx: number) => void;
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
            {!isLinked && !disabled && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20"
                onClick={() => onLink(pidx)}
                data-testid={`button-link-${teamKey}-${pidx}`}
              >
                <Link2 className="w-3 h-3 mr-1" /> Link
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
