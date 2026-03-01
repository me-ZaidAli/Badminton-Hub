import { useState, useRef, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUploadProfilePicture } from "@/hooks/use-sessions";
import {
  LogOut, User, Settings, Shield, Loader2, XCircle, MapPin, Phone, Calendar,
  AlertCircle, Camera, Wallet, TrendingUp, TrendingDown, History, CreditCard,
  Eye, EyeOff, Users, Plus, Pencil, Trash2, Sun, Moon, Palette, Contrast,
  CircleOff, Zap, Crown, Gem, Trophy, Target, BarChart3, Activity, CalendarDays,
  PoundSterling, ChevronRight, ChevronDown, Star, Clock, Award, Building2, Tag, ExternalLink, Gift, PartyPopper, Lock, Cake, CheckCircle,
  Diamond, Snowflake, Leaf, Rocket, Flame, Sparkles, Cpu, Waves, Sunset, Monitor,
  CircuitBoard, Binary, Radio, Hexagon, Heart, Grid3x3, Mountain, Droplets, TreePine, Gauge, Orbit, Ghost
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useTheme, DISPLAY_MODES, type DisplayMode } from "@/hooks/use-theme";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MODE_ICONS: Record<string, typeof Sun> = {
  light: Sun, dark: Moon, "premium-gold": Crown, "ultra-premium": Gem, "green-glow": Leaf, sepia: Palette, migraine: Eye,
  "high-contrast": Contrast, grayscale: CircleOff,
  "obsidian-gold": Diamond, "platinum-ice": Snowflake, "emerald-performance": Leaf,
  "sapphire-velocity": Rocket, "crimson-prestige": Flame, "royal-amethyst": Sparkles,
  "carbon-titanium": Cpu, "arctic-blue": Waves, "sunset-copper": Sunset,
  "midnight-neon": Zap, "amoled-black": Monitor,
  "neon-circuit": CircuitBoard, "hologram-matrix": Binary, "cyber-pulse": Radio,
  "titanium-noir": Hexagon, "rose-gold-elite": Heart, "diamond-graphite": Grid3x3,
  "aurora-borealis": Mountain, "volcanic-ember": Flame, "deep-ocean": Droplets,
  "jungle-vibe": TreePine, "adrenaline-rush": Activity, "velocity-chrome": Gauge,
  "circuit-court": Trophy, "cosmic-elite": Orbit, "phantom-luxe": Ghost,
};

function ProfileMembershipDuration({ joinedAt }: { joinedAt: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    function update() {
      const start = new Date(joinedAt).getTime();
      const now = Date.now();
      const diff = now - start;
      if (diff < 0) { setElapsed("Just joined"); return; }

      const totalSeconds = Math.floor(diff / 1000);
      const totalMinutes = Math.floor(totalSeconds / 60);
      const totalHours = Math.floor(totalMinutes / 60);
      const totalDays = Math.floor(totalHours / 24);

      const years = Math.floor(totalDays / 365);
      const remainDays = totalDays - years * 365;
      const months = Math.floor(remainDays / 30);
      const days = remainDays - months * 30;
      const hours = totalHours % 24;
      const minutes = totalMinutes % 60;
      const seconds = totalSeconds % 60;

      const parts: string[] = [];
      if (years > 0) parts.push(`${years}y`);
      if (months > 0) parts.push(`${months}m`);
      if (days > 0) parts.push(`${days}d`);
      parts.push(`${hours}h ${minutes}m ${seconds}s`);
      setElapsed(parts.join(" "));
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [joinedAt]);

  const joinDate = new Date(joinedAt);
  const formattedDate = joinDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <CollapsibleSection title="Club Member Since" icon={Clock} badge={formattedDate} testId="card-profile-membership-duration">
      <div className="text-base font-bold font-mono tracking-wider" data-testid="text-profile-duration-counter">
        {elapsed}
      </div>
    </CollapsibleSection>
  );
}

function AnniversaryCountdown() {
  const { data: anniversaryData } = useQuery<any[]>({ queryKey: ["/api/my-anniversary-info"] });
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!anniversaryData || anniversaryData.length === 0) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-800" data-testid="card-anniversary-section">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-amber-500" />
          <p className="font-bold text-sm">Your Anniversary Countdowns</p>
          <Badge variant="secondary" className="text-xs">{anniversaryData.length}</Badge>
        </div>
        <style>{`
          @keyframes shake {
            0%, 100% { transform: rotate(0deg); }
            10%, 30%, 50%, 70%, 90% { transform: rotate(-8deg); }
            20%, 40%, 60%, 80% { transform: rotate(8deg); }
          }
        `}</style>
        <div className="space-y-3">
          {anniversaryData.map((info: any) => {
            const now = Date.now();
            const target = new Date(info.nextAnniversary).getTime();
            const diff = target - now;
            const isCelebration = info.progress >= 0.99 || diff <= 0;

            let countdownText = "";
            if (!isCelebration && diff > 0) {
              const totalSeconds = Math.floor(diff / 1000);
              const totalMinutes = Math.floor(totalSeconds / 60);
              const totalHours = Math.floor(totalMinutes / 60);
              const totalDays = Math.floor(totalHours / 24);
              const months = Math.floor(totalDays / 30);
              const days = totalDays - months * 30;
              const hours = totalHours % 24;
              const parts: string[] = [];
              if (months > 0) parts.push(`${months} month${months !== 1 ? "s" : ""}`);
              if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
              parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
              countdownText = `${parts.join(", ")} to your ${info.upcomingYear}${info.upcomingYear === 1 ? "st" : info.upcomingYear === 2 ? "nd" : info.upcomingYear === 3 ? "rd" : "th"} Anniversary`;
            }

            return (
              <div key={info.clubId} className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2" data-testid={`card-anniversary-countdown-${info.clubId}`}>
                <div className="flex items-center gap-3">
                  {isCelebration ? (
                    <div className="p-1.5 rounded-md bg-amber-500/10">
                      <PartyPopper className="h-4 w-4 text-amber-500" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <Gift className="h-4 w-4 text-primary" style={{ animation: "shake 1.5s ease-in-out infinite" }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">{info.clubName}</div>
                    {isCelebration ? (
                      <div className="text-sm font-bold text-amber-600 dark:text-amber-400" data-testid={`text-anniversary-timer-${info.clubId}`}>
                        Happy {info.upcomingYear}{info.upcomingYear === 1 ? "st" : info.upcomingYear === 2 ? "nd" : info.upcomingYear === 3 ? "rd" : "th"} Anniversary!
                      </div>
                    ) : (
                      <div className="text-sm font-semibold" data-testid={`text-anniversary-timer-${info.clubId}`}>
                        {countdownText}
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden" data-testid={`progress-anniversary-${info.clubId}`}>
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(info.progress * 100, 100)}%` }}
                  />
                </div>
                {info.hasReward && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Gift className="h-3 w-3 text-emerald-500" />
                    <span>
                      {info.rewardCredits > 0 && `Reward: \u00A3${(info.rewardCredits / 100).toFixed(2)} credit`}
                      {info.rewardCredits > 0 && info.rewardGifts ? " + " : ""}
                      {info.rewardGifts ? info.rewardGifts : ""}
                      {!info.rewardCredits && !info.rewardGifts && info.rewardMessage ? info.rewardMessage : ""}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function BirthdayCountdown() {
  const { data: birthdayData } = useQuery<any[]>({ queryKey: ["/api/my-birthday-reward-info"] });
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!birthdayData || birthdayData.length === 0) return null;

  return (
    <Card className="border-pink-200 dark:border-pink-800" data-testid="card-birthday-section">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Cake className="h-4 w-4 text-pink-500" />
          <p className="font-bold text-sm">Birthday Countdown</p>
          <Badge variant="secondary" className="text-xs">{birthdayData.length}</Badge>
        </div>
        <style>{`
          @keyframes birthday-bounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }
        `}</style>
        <div className="space-y-3">
          {birthdayData.map((info: any) => {
            const now = Date.now();
            let countdownText = "";
            let progress = 0;

            if (!info.hasDob) {
              return (
                <div key={info.clubId} className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2" data-testid={`card-birthday-countdown-${info.clubId}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-pink-500/10">
                      <AlertCircle className="h-4 w-4 text-pink-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground">{info.clubName}</div>
                      <div className="text-sm font-semibold text-pink-600 dark:text-pink-400" data-testid={`text-birthday-no-dob-${info.clubId}`}>
                        Add your date of birth in your profile to receive birthday rewards
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            if (info.birthdayToday) {
              progress = 100;
            } else if (info.nextBirthdayDate) {
              const target = new Date(info.nextBirthdayDate + "T00:00:00").getTime();
              const diff = Math.max(target - now, 0);
              const totalSeconds = Math.floor(diff / 1000);
              const totalMinutes = Math.floor(totalSeconds / 60);
              const totalHours = Math.floor(totalMinutes / 60);
              const totalDays = Math.floor(totalHours / 24);
              const months = Math.floor(totalDays / 30);
              const days = totalDays - months * 30;
              const hours = totalHours % 24;
              const minutes = totalMinutes % 60;
              const seconds = totalSeconds % 60;
              const parts: string[] = [];
              if (months > 0) parts.push(`${months} month${months !== 1 ? "s" : ""}`);
              if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
              parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
              countdownText = `${parts.join(", ")} to your birthday`;
              progress = diff > 0 ? Math.min(((365 * 86400000 - diff) / (365 * 86400000)) * 100, 100) : 100;
            } else {
              countdownText = "Birthday date pending";
            }

            return (
              <div key={info.clubId} className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2" data-testid={`card-birthday-countdown-${info.clubId}`}>
                <div className="flex items-center gap-3">
                  {info.birthdayToday ? (
                    <div className="p-1.5 rounded-md bg-pink-500/10">
                      <PartyPopper className="h-4 w-4 text-pink-500" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-md bg-pink-500/10">
                      <Cake className="h-4 w-4 text-pink-500" style={{ animation: "birthday-bounce 2s ease-in-out infinite" }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">{info.clubName}</div>
                    {info.birthdayToday ? (
                      <div className="text-sm font-bold text-pink-600 dark:text-pink-400" data-testid={`text-birthday-timer-${info.clubId}`}>
                        Happy Birthday!
                      </div>
                    ) : (
                      <div className="text-sm font-semibold" data-testid={`text-birthday-timer-${info.clubId}`}>
                        {countdownText}
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden" data-testid={`progress-birthday-${info.clubId}`}>
                  <div
                    className="h-full rounded-full bg-pink-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {(info.credits > 0 || info.gifts) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Gift className="h-3 w-3 text-emerald-500" />
                    <span>
                      {info.credits > 0 && `Reward: £${(info.credits / 100).toFixed(2)} credit`}
                      {info.credits > 0 && info.gifts ? " + " : ""}
                      {info.gifts || ""}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileRewardsSection() {
  const { data: rewards } = useQuery<any[]>({ queryKey: ["/api/my-rewards"] });
  const { data: summary } = useQuery<any>({ queryKey: ["/api/my-rewards/summary"] });
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);

  const requestMutation = useMutation({
    mutationFn: async (rewardId: number) => {
      await apiRequest("POST", `/api/rewards/${rewardId}/request`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-rewards/summary"] });
      toast({ title: "Reward Requested", description: "Your reward request has been submitted for admin approval." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (!rewards || rewards.length === 0) {
    if (!summary || summary.totalRewards === 0) return null;
  }

  const displayedRewards = showAll ? (rewards || []) : (rewards || []).slice(0, 4);
  const statusColors: Record<string, string> = {
    AVAILABLE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    USED: "bg-muted text-muted-foreground",
    REQUESTED: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  const typeIcons: Record<string, string> = {
    REFERRAL: "Referral",
    SESSION_ATTENDANCE: "Attendance",
    GIFT: "Gift",
    MANUAL: "Manual",
  };

  return (
    <CollapsibleSection
      title="My Rewards"
      icon={Gift}
      iconColor="text-emerald-500"
      badge={summary?.totalRewards || undefined}
      testId="card-profile-rewards"
    >
      <div className="space-y-4">
        {summary && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-500/5 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-reward-credits">
                {"\u00A3"}{((summary.totalCredits || 0) / 100).toFixed(2)}
              </div>
              <div className="text-[10px] text-muted-foreground">Available Credits</div>
            </div>
            <div className="bg-blue-500/5 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400" data-testid="text-reward-free-sessions">
                {summary.totalFreeSessions || 0}
              </div>
              <div className="text-[10px] text-muted-foreground">Free Sessions</div>
            </div>
            <div className="bg-purple-500/5 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400" data-testid="text-reward-gifts">
                {summary.totalGifts || 0}
              </div>
              <div className="text-[10px] text-muted-foreground">Gifts</div>
            </div>
          </div>
        )}

        {displayedRewards.length > 0 && (
          <div className="space-y-2">
            {displayedRewards.map((reward: any) => (
              <div key={reward.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30" data-testid={`reward-item-${reward.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{reward.description || typeIcons[reward.rewardType]}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{typeIcons[reward.rewardType]}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                    {reward.credits > 0 && <span>{"\u00A3"}{(reward.credits / 100).toFixed(2)} credit</span>}
                    {reward.freeSessions > 0 && <span>{reward.freeSessions} free session{reward.freeSessions > 1 ? "s" : ""}</span>}
                    {reward.gifts && <span>{reward.gifts}</span>}
                    {reward.clubName && <span className="text-muted-foreground/60">- {reward.clubName}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-[10px] ${statusColors[reward.status] || ""}`}>{reward.status}</Badge>
                  {reward.status === "AVAILABLE" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => requestMutation.mutate(reward.id)}
                      disabled={requestMutation.isPending}
                      data-testid={`button-request-reward-${reward.id}`}
                    >
                      Request
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {rewards && rewards.length > 4 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(!showAll)} data-testid="button-toggle-all-rewards">
            {showAll ? "Show Less" : `View All ${rewards.length} Rewards`}
            <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${showAll ? "rotate-90" : ""}`} />
          </Button>
        )}

        <Link href="/rewards">
          <Button variant="outline" size="sm" className="w-full" data-testid="button-view-rewards-page">
            Open Rewards Dashboard
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>

        {(!rewards || rewards.length === 0) && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <Gift className="h-6 w-6 mx-auto mb-2 opacity-40" />
            <p>No rewards earned yet</p>
            <p className="text-xs mt-1">Attend sessions and use referral codes to earn rewards</p>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

function MetricCard({ icon: Icon, label, value, subtext, onClick, className = "" }: {
  icon: typeof Trophy; label: string; value: string | number; subtext?: string;
  onClick?: () => void; className?: string;
}) {
  return (
    <Card
      className={`${onClick ? "cursor-pointer hover-elevate" : ""} ${className}`}
      onClick={onClick}
      data-testid={`metric-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-md bg-primary/10">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-lg sm:text-xl font-bold">{value}</p>
            {subtext && <p className="text-[10px] sm:text-xs text-muted-foreground">{subtext}</p>}
          </div>
          {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        </div>
      </CardContent>
    </Card>
  );
}

function BadmintonEnglandSection({ user }: { user: any }) {
  const [beNumber, setBeNumber] = useState((user as any)?.badmintonEnglandNumber || "");
  const [isEditingBE, setIsEditingBE] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setBeNumber((user as any)?.badmintonEnglandNumber || "");
  }, [user]);

  const saveBENumber = useMutation({
    mutationFn: async (number: string) => {
      const res = await apiRequest("PATCH", "/api/user/profile", { badmintonEnglandNumber: number || null });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Membership number saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditingBE(false);
    },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });

  const hasBE = !!(user as any)?.badmintonEnglandNumber;

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 dark:border-blue-800" data-testid="card-badminton-england-info">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" data-testid="text-be-title">Badminton England Membership</p>
              <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-be-subtitle">Individual player insurance & benefits</p>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300" data-testid="text-insurance-warning-title">Important: Club Insurance Does Not Cover Individuals</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                  Our club insurance covers venue liability but does not provide individual player cover. We strongly recommend joining Badminton England to protect yourself while playing.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3.5 space-y-3">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300" data-testid="text-be-pricing-title">Membership Prices</p>
            <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1.5">
              <p data-testid="text-be-adult-price">Prices start from <span className="font-semibold">£36.60*</span> for adult membership</p>
              <p data-testid="text-be-junior-price"><span className="font-semibold">£5.75</span> for juniors</p>
            </div>
            <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
              <p className="text-[10px] text-blue-600 dark:text-blue-500" data-testid="text-be-pricing-note">
                *Please visit the Badminton England website for the most up-to-date pricing and membership options.
              </p>
            </div>
          </div>

          <a href="https://www.badmintonengland.co.uk/membership/" target="_blank" rel="noopener noreferrer" className="block" data-testid="link-badminton-england-website">
            <Button variant="outline" className="w-full" data-testid="button-join-badminton-england">
              <ExternalLink className="h-4 w-4 mr-2" />
              Join Badminton England
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card className={hasBE ? "border-green-200 dark:border-green-800" : "border-dashed border-muted-foreground/30"} data-testid="card-be-membership-number">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${hasBE ? "bg-green-500/10" : "bg-muted"}`}>
                <Award className={`h-4 w-4 ${hasBE ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold" data-testid="text-be-membership-label">Membership Number</p>
                {hasBE && !isEditingBE ? (
                  <p className="text-xs text-green-600 dark:text-green-400 font-mono mt-0.5" data-testid="text-be-number">{(user as any).badmintonEnglandNumber}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isEditingBE ? "Enter your Badminton England membership number" : "Add your membership number to keep it on record"}
                  </p>
                )}
              </div>
            </div>
            {!isEditingBE && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditingBE(true)} data-testid="button-edit-be-number">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          {isEditingBE && (
            <div className="mt-3 flex items-center gap-2">
              <Input
                value={beNumber}
                onChange={(e) => setBeNumber(e.target.value)}
                placeholder="e.g. BE12345678"
                className="flex-1"
                data-testid="input-be-number"
              />
              <Button size="sm" onClick={() => saveBENumber.mutate(beNumber)} disabled={saveBENumber.isPending} data-testid="button-save-be-number">
                {saveBENumber.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setIsEditingBE(false); setBeNumber((user as any)?.badmintonEnglandNumber || ""); }} data-testid="button-cancel-be-number">
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, badge, defaultOpen = false, children, testId, iconColor = "text-primary", className = "" }: {
  title: string;
  icon: typeof Trophy;
  badge?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  testId?: string;
  iconColor?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className={className} data-testid={testId}>
      <button
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
        onClick={() => setOpen(!open)}
        data-testid={testId ? `button-toggle-${testId}` : undefined}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-sm font-semibold">{title}</span>
          {badge !== undefined && badge !== null && (
            <Badge variant="secondary" className="text-xs">{badge}</Badge>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <CardContent className="pt-0 px-4 pb-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

function DisplayAccessibilitySection() {
  const { displayMode, reducedMotion, setDisplayMode, setReducedMotion } = useTheme();
  return (
    <CollapsibleSection title="Display & Accessibility" icon={Settings} testId="card-display-accessibility">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DISPLAY_MODES.map((mode) => {
            const Icon = MODE_ICONS[mode.value] || Sun;
            const isActive = displayMode === mode.value;
            return (
              <button key={mode.value} onClick={() => setDisplayMode(mode.value)}
                className={`flex items-start gap-3 p-3 rounded-md border text-left transition-colors ${isActive ? "border-primary bg-primary/5" : "border-border hover-elevate"}`}
                data-testid={`button-display-mode-${mode.value}`}>
                <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <div className={`text-sm font-medium ${isActive ? "text-primary" : ""}`}>{mode.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{mode.description}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <div className="text-sm font-medium">Reduced Motion</div>
                <div className="text-xs text-muted-foreground">Disable animations and transitions</div>
              </div>
            </div>
            <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} data-testid="switch-reduced-motion" />
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}

function CreditsModal({ open, onClose, creditBalances, memberships, userName }: {
  open: boolean; onClose: () => void;
  creditBalances: { clubId: number; clubName: string; balance: number }[] | undefined;
  memberships: { clubId: number; clubName: string; membershipStatus: string }[] | undefined;
  userName?: string;
}) {
  const { toast } = useToast();
  const [creditRequestOpen, setCreditRequestOpen] = useState(false);
  const [creditSuccessInfo, setCreditSuccessInfo] = useState<{ paymentRef: string; amount: string; session: string } | null>(null);
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [customSession, setCustomSession] = useState("");
  const [creditAmount, setCreditAmount] = useState("");

  const { data: upcomingSignups } = useQuery<any[]>({
    queryKey: ["/api/my-upcoming-signups"],
    enabled: creditRequestOpen,
  });

  const creditRequestMutation = useMutation({
    mutationFn: async (data: { clubId: number; sessionId?: number; sessionDescription?: string; amount: number }) => {
      const res = await apiRequest("POST", "/api/my-credit-request", data);
      return res.json();
    },
    onSuccess: (data) => {
      const sessionLabel = selectedSessionId && selectedSessionId !== "custom"
        ? filteredSignups.find((s: any) => String(s.sessionId) === selectedSessionId)?.sessionTitle || "your session"
        : customSession || "your session";
      setCreditSuccessInfo({
        paymentRef: data.paymentReference,
        amount: parseFloat(creditAmount).toFixed(2),
        session: sessionLabel,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-credits/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-outstanding-payments"] });
      setCreditRequestOpen(false);
      setSelectedClubId(null);
      setSelectedSessionId("");
      setCustomSession("");
      setCreditAmount("");
    },
    onError: (err: Error) => {
      toast({ title: "Request Failed", description: err.message, variant: "destructive" });
    },
  });

  const balanceMap = new Map((creditBalances || []).map(cb => [cb.clubId, cb]));
  const allClubs = new Map<number, { clubId: number; clubName: string; balance: number }>();
  (memberships || []).forEach(m => {
    if (!allClubs.has(m.clubId)) {
      const existing = balanceMap.get(m.clubId);
      allClubs.set(m.clubId, existing || { clubId: m.clubId, clubName: m.clubName, balance: 0 });
    }
  });
  (creditBalances || []).forEach(cb => { if (!allClubs.has(cb.clubId)) allClubs.set(cb.clubId, cb); });
  const clubs = Array.from(allClubs.values());
  const clubsWithCredit = clubs.filter(c => Number(c.balance) > 0);

  const selectedClubBalance = selectedClubId ? (balanceMap.get(selectedClubId)?.balance || 0) : 0;
  const filteredSignups = selectedClubId ? (upcomingSignups || []).filter((s: any) => s.clubId === selectedClubId) : [];

  const handleSubmitCreditRequest = () => {
    if (!selectedClubId) return;
    const amt = Math.round(parseFloat(creditAmount) * 100);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    const data: any = { clubId: selectedClubId, amount: amt };
    if (selectedSessionId && selectedSessionId !== "custom") {
      data.sessionId = Number(selectedSessionId);
    } else if (customSession.trim()) {
      data.sessionDescription = customSession.trim();
    } else {
      toast({ title: "Please select or type a session", variant: "destructive" });
      return;
    }
    creditRequestMutation.mutate(data);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[450px]" data-testid="modal-credits">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Credit Balances
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {clubs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No credit data available</p>
            ) : clubs.map((cb) => {
              const bal = Math.max(0, Number(cb.balance));
              return (
                <div key={cb.clubId} className="flex items-center justify-between py-3 px-4 rounded-md bg-muted/50" data-testid={`credit-balance-${cb.clubId}`}>
                  <span className="font-medium">{cb.clubName}</span>
                  <span className={`text-lg font-bold ${bal > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                    £{(bal / 100).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
          {clubsWithCredit.length > 0 && (
            <DialogFooter>
              <Button onClick={() => setCreditRequestOpen(true)} data-testid="button-request-credit">
                <PoundSterling className="h-4 w-4 mr-1.5" />
                Request Credit
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={creditRequestOpen} onOpenChange={(o) => !o && setCreditRequestOpen(false)}>
        <DialogContent className="sm:max-w-[450px]" data-testid="modal-credit-request">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PoundSterling className="h-5 w-5" />
              Request Credit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Club</Label>
              <Select value={selectedClubId?.toString() || ""} onValueChange={(v) => { setSelectedClubId(Number(v)); setSelectedSessionId(""); }}>
                <SelectTrigger data-testid="select-credit-club"><SelectValue placeholder="Select club" /></SelectTrigger>
                <SelectContent>
                  {clubsWithCredit.map(c => (
                    <SelectItem key={c.clubId} value={c.clubId.toString()}>
                      {c.clubName} (£{(Math.max(0, Number(c.balance)) / 100).toFixed(2)} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClubId && (
              <>
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                  Available balance: <span className="font-bold text-green-600">£{(Math.max(0, selectedClubBalance) / 100).toFixed(2)}</span>
                </div>

                <div className="space-y-1.5">
                  <Label>Session</Label>
                  <Select value={selectedSessionId} onValueChange={(v) => { setSelectedSessionId(v); if (v !== "custom") setCustomSession(""); }}>
                    <SelectTrigger data-testid="select-credit-session"><SelectValue placeholder="Select a session" /></SelectTrigger>
                    <SelectContent>
                      {filteredSignups.map((s: any) => (
                        <SelectItem key={s.sessionId} value={s.sessionId.toString()}>
                          {s.sessionTitle} - {format(new Date(s.sessionDate), "MMM d, yyyy")} (£{((s.sessionFee || 0) / 100).toFixed(2)})
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Type a custom session...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedSessionId === "custom" && (
                  <div className="space-y-1.5">
                    <Label>Session Description</Label>
                    <Input
                      value={customSession}
                      onChange={(e) => setCustomSession(e.target.value)}
                      placeholder="e.g. Friday Night Social - March 15"
                      data-testid="input-custom-session"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Amount (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={(Math.max(0, selectedClubBalance) / 100).toFixed(2)}
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder={`Max: £${(Math.max(0, selectedClubBalance) / 100).toFixed(2)}`}
                    data-testid="input-credit-amount"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditRequestOpen(false)} data-testid="button-cancel-credit">Cancel</Button>
            <Button onClick={handleSubmitCreditRequest} disabled={creditRequestMutation.isPending || !selectedClubId} data-testid="button-submit-credit">
              {creditRequestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!creditSuccessInfo} onOpenChange={(o) => !o && setCreditSuccessInfo(null)}>
        <DialogContent className="sm:max-w-[420px]" data-testid="modal-credit-success">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Credit Request Submitted
            </DialogTitle>
            <DialogDescription>
              Your credit has been applied and admins have been notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold">{"\u00A3"}{creditSuccessInfo?.amount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Session:</span>
                <span className="font-medium">{creditSuccessInfo?.session}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Reference:</span>
                <span className="font-mono font-bold text-primary">{creditSuccessInfo?.paymentRef}</span>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">Important</p>
              <p className="text-sm text-muted-foreground">
                When making your bank transfer, use the payment reference above: your name, followed by the session date, and <span className="font-semibold text-foreground">CR</span> at the end. The admin will deduct this credit from your session fee. A support ticket has been created and admins have been notified.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreditSuccessInfo(null)} data-testid="button-close-credit-success">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OutstandingModal({ open, onClose, payments }: {
  open: boolean; onClose: () => void;
  payments: any[] | undefined;
}) {
  const { toast } = useToast();
  const [confirmingSignupId, setConfirmingSignupId] = useState<number | null>(null);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState("");

  const confirmPaymentMutation = useMutation({
    mutationFn: async (data: { signupId: number; paymentDate: string; paymentMethod: string }) => {
      const res = await apiRequest("POST", "/api/my-payment-confirmation", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Payment Confirmed", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/my-outstanding-payments"] });
      setConfirmingSignupId(null);
      setPaymentDate(format(new Date(), "yyyy-MM-dd"));
      setPaymentMethod("");
    },
    onError: (err: Error) => {
      toast({ title: "Confirmation Failed", description: err.message, variant: "destructive" });
    },
  });

  const grouped = useMemo(() => {
    return (payments || []).reduce((acc: Record<string, any[]>, p: any) => {
      if (!acc[p.clubName]) acc[p.clubName] = [];
      acc[p.clubName].push(p);
      return acc;
    }, {});
  }, [payments]);

  const handleConfirmPayment = () => {
    if (!confirmingSignupId || !paymentMethod) {
      toast({ title: "Please select a payment method", variant: "destructive" });
      return;
    }
    confirmPaymentMutation.mutate({
      signupId: confirmingSignupId,
      paymentDate,
      paymentMethod,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto" data-testid="modal-outstanding">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Outstanding Payments
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {Object.entries(grouped).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No outstanding payments</p>
            ) : Object.entries(grouped).map(([clubName, clubPayments]) => {
              const total = (clubPayments as any[]).reduce((sum: number, p: any) => sum + p.fee, 0);
              return (
                <div key={clubName} className="space-y-2" data-testid={`outstanding-club-${clubName}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{clubName}</span>
                    <Badge variant="secondary">Total: £{(total / 100).toFixed(2)}</Badge>
                  </div>
                  {(clubPayments as any[]).map((p: any) => (
                    <div key={p.signupId} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 gap-2">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium">{p.sessionTitle}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(p.sessionDate), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold text-amber-600">£{(p.fee / 100).toFixed(2)}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                          onClick={() => setConfirmingSignupId(p.signupId)}
                          data-testid={`button-confirm-paid-${p.signupId}`}
                        >
                          I've Paid
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmingSignupId} onOpenChange={(o) => { if (!o) { setConfirmingSignupId(null); setPaymentMethod(""); } }}>
        <DialogContent className="sm:max-w-[400px]" data-testid="modal-confirm-payment">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PoundSterling className="h-5 w-5 text-green-500" />
              Confirm Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>When did you pay?</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                data-testid="input-payment-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label>How did you pay?</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger data-testid="select-payment-method"><SelectValue placeholder="Select payment method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">An admin will verify your payment has been received.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmingSignupId(null); setPaymentMethod(""); }} data-testid="button-cancel-confirm">Cancel</Button>
            <Button onClick={handleConfirmPayment} disabled={confirmPaymentMutation.isPending || !paymentMethod} data-testid="button-submit-confirm">
              {confirmPaymentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MembershipsModal({ open, onClose, memberships }: {
  open: boolean; onClose: () => void; memberships: any[] | undefined;
}) {
  const active = (memberships || []).filter((m: any) => m.status === "ACTIVE" || m.status === "EXPIRING" || m.status === "PENDING");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto" data-testid="modal-memberships">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            My Memberships
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No active memberships</p>
          ) : active.map((m: any) => {
            const daysRemaining = Math.ceil((new Date(m.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const isExpired = daysRemaining <= 0;
            const isExpiring = daysRemaining > 0 && daysRemaining <= 30;
            return (
              <div key={m.id} className="relative overflow-visible rounded-md bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-400 dark:from-amber-700 dark:via-amber-600 dark:to-yellow-500 p-[1px]" data-testid={`membership-detail-${m.id}`}>
                <div className="rounded-md bg-background/95 dark:bg-background/90 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-500" />
                        <p className="font-bold text-lg">{m.clubName}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{m.planName}</p>
                    </div>
                    <Badge variant={isExpired ? "destructive" : isExpiring ? "secondary" : m.status === "PENDING" ? "secondary" : "default"} className={!isExpired && !isExpiring && m.status !== "PENDING" ? "bg-amber-500 text-white" : ""}>
                      {m.status === "PENDING" ? "Awaiting Payment" : isExpired ? "Expired" : isExpiring ? "Expiring Soon" : "VIP Member"}
                    </Badge>
                  </div>
                  {m.membershipNumber && (
                    <div className="flex items-center gap-2 py-2 px-3 rounded-md bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
                      <Shield className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">Member No.</span>
                      <span className="font-mono font-bold text-sm tracking-wider" data-testid={`text-membership-number-${m.id}`}>{m.membershipNumber}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Price Paid</p>
                      <p className="font-medium">£{((m.proratedPrice || m.planAnnualPrice || 0) / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Session Fee</p>
                      <p className="font-medium">£{((m.planDefaultSessionFee || 0) / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Start Date</p>
                      <p className="font-medium">{m.startDate ? format(new Date(m.startDate), "MMM d, yyyy") : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires</p>
                      <p className={`font-medium ${isExpired ? "text-red-600" : isExpiring ? "text-amber-500" : ""}`}>
                        {m.endDate ? format(new Date(m.endDate), "MMM d, yyyy") : "N/A"}
                      </p>
                    </div>
                  </div>
                  {!isExpired && (
                    <div className="pt-2 border-t border-amber-500/20">
                      <p className="text-sm">
                        <span className={`font-bold ${isExpiring ? "text-amber-500" : "text-green-600"}`}>
                          {daysRemaining} days
                        </span>
                        <span className="text-muted-foreground"> remaining</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-2">
          <Link href="/memberships">
            <Button variant="outline" className="w-full" data-testid="button-view-all-memberships">
              View All Memberships
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DiscountCodesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: discountData = [], isLoading } = useQuery<{ clubId: number; clubName: string; codes: any[] }[]>({
    queryKey: ["/api/my-discount-codes"],
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto" data-testid="modal-discount-codes">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-amber-500" />
            My Discount Codes
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : discountData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No discount codes available</p>
        ) : (
          <div className="space-y-5">
            {discountData.map((club) => (
              <div key={club.clubId}>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">{club.clubName}</h3>
                </div>
                <div className="space-y-2">
                  {club.codes.map((code: any) => (
                    <div
                      key={code.codeId}
                      className="rounded-md bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-400 dark:from-amber-700 dark:via-amber-600 dark:to-yellow-500 p-[1px]"
                    >
                      <div className="rounded-md bg-background/95 dark:bg-background/90 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-sm tracking-wider border-amber-500/30 no-default-hover-elevate">
                            {code.code}
                          </Badge>
                          {code.discountPercent && (
                            <Badge className="bg-amber-500 text-white no-default-hover-elevate">{code.discountPercent}% OFF</Badge>
                          )}
                        </div>
                        {code.description && (
                          <p className="text-sm text-muted-foreground">{code.description}</p>
                        )}
                        {code.shopName && (
                          <div className="flex items-center gap-2 text-sm">
                            <Star className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                            <span className="text-muted-foreground">Shop:</span>
                            {code.shopUrl ? (
                              <a href={code.shopUrl} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1" data-testid={`link-shop-${code.codeId}`}>
                                {code.shopName} <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="font-medium">{code.shopName}</span>
                            )}
                          </div>
                        )}
                        {code.validUntil && (
                          <p className="text-xs text-muted-foreground">
                            Valid until: {format(new Date(code.validUntil), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PerformanceModal({ open, onClose, matchPerformance }: {
  open: boolean; onClose: () => void; matchPerformance: {
    clubs: { clubId: number; clubName: string; profileId: number; category: string | null; grade: string | null; played: number; won: number; lost: number; winPct: number; setsWon: number; pointsWon: number; rank: number; totalPlayers: number }[];
    totals: { played: number; won: number; lost: number; winPct: number };
  } | undefined;
}) {
  const [selectedClub, setSelectedClub] = useState<string>("all");
  const clubs = matchPerformance?.clubs || [];
  const filteredClubs = useMemo(() => {
    if (selectedClub === "all") return clubs;
    return clubs.filter((c) => c.clubId.toString() === selectedClub);
  }, [clubs, selectedClub]);

  const totals = useMemo(() => {
    if (selectedClub === "all" && matchPerformance) return matchPerformance.totals;
    const played = filteredClubs.reduce((s, c) => s + c.played, 0);
    const won = filteredClubs.reduce((s, c) => s + c.won, 0);
    const lost = played - won;
    return { played, won, lost, winPct: played > 0 ? Math.round((won / played) * 100) : 0 };
  }, [filteredClubs, selectedClub, matchPerformance]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto" data-testid="modal-performance">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Match Performance
          </DialogTitle>
        </DialogHeader>
        {clubs.length > 1 && (
          <Select value={selectedClub} onValueChange={setSelectedClub}>
            <SelectTrigger data-testid="select-perf-club">
              <SelectValue placeholder="All Clubs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clubs</SelectItem>
              {clubs.map((c) => (
                <SelectItem key={c.clubId} value={c.clubId.toString()}>
                  {c.clubName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-md bg-muted/50 text-center">
            <p className="text-3xl font-bold text-primary">{totals.won}</p>
            <p className="text-xs text-muted-foreground">Matches Won</p>
          </div>
          <div className="p-4 rounded-md bg-muted/50 text-center">
            <p className="text-3xl font-bold text-destructive">{totals.lost}</p>
            <p className="text-xs text-muted-foreground">Matches Lost</p>
          </div>
          <div className="p-4 rounded-md bg-muted/50 text-center">
            <p className="text-3xl font-bold">{totals.played}</p>
            <p className="text-xs text-muted-foreground">Total Matches</p>
          </div>
          <div className="p-4 rounded-md bg-muted/50 text-center">
            <p className="text-3xl font-bold">{totals.winPct}%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
        </div>
        {filteredClubs.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-muted-foreground">Per Club Breakdown</p>
            {filteredClubs.map((c) => {
              const barWidth = Math.max(c.winPct, 2);
              return (
                <div key={c.clubId} className="space-y-1" data-testid={`perf-club-${c.clubId}`}>
                  <div className="flex items-center justify-between gap-2 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.clubName}</span>
                      {c.rank > 0 && (
                        <Badge variant="outline" className="text-xs no-default-hover-elevate">#{c.rank}</Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground">{c.won}W / {c.lost}L ({c.winPct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type SessionHistoryItem = {
  sessionId: number; sessionTitle: string; sessionDate: string;
  sessionStartTime: string; sessionStatus: string; clubId: number;
  clubName: string; fee: number; paymentStatus: string;
  matchesWon: number; matchesLost: number; matchesTotal: number;
};

function TotalSessionsModal({ open, onClose, sessions }: {
  open: boolean; onClose: () => void; sessions: SessionHistoryItem[] | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-testid="modal-total-sessions">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            All Sessions
          </DialogTitle>
        </DialogHeader>
        {!sessions || sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No sessions attended yet.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s, i) => (
              <div key={`${s.sessionId}-${i}`} className="p-3 rounded-md bg-muted/50 space-y-1" data-testid={`session-item-${s.sessionId}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-medium text-sm">{s.sessionTitle}</p>
                  <Badge variant="outline">{s.clubName}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    {s.sessionDate ? format(new Date(s.sessionDate), "dd MMM yyyy") : "—"} at {s.sessionStartTime || "—"}
                  </p>
                  {s.matchesTotal > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary">{s.matchesWon}W</span>
                      <span className="text-xs text-muted-foreground">/</span>
                      <span className="text-xs font-medium text-destructive">{s.matchesLost}L</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SessionsThisMonthModal({ open, onClose, sessions }: {
  open: boolean; onClose: () => void; sessions: SessionHistoryItem[] | undefined;
}) {
  const thisMonthSessions = useMemo(() => {
    if (!sessions) return [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return sessions.filter(s => s.sessionDate && new Date(s.sessionDate) >= monthStart);
  }, [sessions]);

  const summary = useMemo(() => {
    const totalMatches = thisMonthSessions.reduce((s, x) => s + x.matchesTotal, 0);
    const totalWon = thisMonthSessions.reduce((s, x) => s + x.matchesWon, 0);
    const totalLost = thisMonthSessions.reduce((s, x) => s + x.matchesLost, 0);
    const totalFees = thisMonthSessions.reduce((s, x) => s + x.fee, 0);
    return { totalMatches, totalWon, totalLost, totalFees };
  }, [thisMonthSessions]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-testid="modal-sessions-this-month">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sessions This Month
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-md bg-muted/50 text-center">
            <p className="text-2xl font-bold">{thisMonthSessions.length}</p>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </div>
          <div className="p-3 rounded-md bg-muted/50 text-center">
            <p className="text-2xl font-bold">{summary.totalMatches}</p>
            <p className="text-xs text-muted-foreground">Matches</p>
          </div>
          <div className="p-3 rounded-md bg-muted/50 text-center">
            <p className="text-2xl font-bold text-primary">{summary.totalWon}</p>
            <p className="text-xs text-muted-foreground">Won</p>
          </div>
          <div className="p-3 rounded-md bg-muted/50 text-center">
            <p className="text-2xl font-bold text-destructive">{summary.totalLost}</p>
            <p className="text-xs text-muted-foreground">Lost</p>
          </div>
        </div>
        <div className="p-3 rounded-md bg-muted/50 text-center">
          <p className="text-2xl font-bold">£{(summary.totalFees / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Total Spent This Month</p>
        </div>
        {thisMonthSessions.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-muted-foreground">Session List</p>
            {thisMonthSessions.map((s, i) => (
              <div key={`${s.sessionId}-${i}`} className="p-3 rounded-md bg-muted/50 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-medium text-sm">{s.sessionTitle}</p>
                  <Badge variant="outline">{s.clubName}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    {s.sessionDate ? format(new Date(s.sessionDate), "dd MMM yyyy") : "—"}
                  </p>
                  <div className="flex items-center gap-2">
                    {s.matchesTotal > 0 && (
                      <>
                        <span className="text-xs font-medium text-primary">{s.matchesWon}W</span>
                        <span className="text-xs text-muted-foreground">/</span>
                        <span className="text-xs font-medium text-destructive">{s.matchesLost}L</span>
                        <span className="text-xs text-muted-foreground mx-1">|</span>
                      </>
                    )}
                    <span className="text-xs font-medium">£{(s.fee / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClubsModal({ open, onClose, profiles, sessions }: {
  open: boolean; onClose: () => void; profiles: any[] | undefined; sessions: SessionHistoryItem[] | undefined;
}) {
  const clubSessionCounts = useMemo(() => {
    if (!sessions) return new Map<number, number>();
    const counts = new Map<number, number>();
    sessions.forEach(s => counts.set(s.clubId, (counts.get(s.clubId) || 0) + 1));
    return counts;
  }, [sessions]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-background max-h-[80vh] flex flex-col" data-testid="modal-clubs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            My Clubs ({profiles?.length || 0})
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto space-y-2">
          {(!profiles || profiles.length === 0) ? (
            <p className="text-muted-foreground text-sm text-center py-4">No clubs joined yet</p>
          ) : (
            profiles.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-3 px-4 rounded-md bg-muted/50" data-testid={`club-item-${p.clubId}`}>
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{p.club?.name || `Club ${p.clubId}`}</span>
                </div>
                <Badge variant="secondary" className="text-xs" data-testid={`club-sessions-${p.clubId}`}>
                  <CalendarDays className="h-3 w-3 mr-1" />
                  {clubSessionCounts.get(p.clubId) || 0} session{(clubSessionCounts.get(p.clubId) || 0) !== 1 ? "s" : ""}
                </Badge>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TotalSpentModal({ open, onClose, sessions }: {
  open: boolean; onClose: () => void; sessions: SessionHistoryItem[] | undefined;
}) {
  const [selectedClub, setSelectedClub] = useState<string>("all");

  const clubs = useMemo(() => {
    if (!sessions) return [];
    const map = new Map<number, string>();
    sessions.forEach(s => map.set(s.clubId, s.clubName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    if (selectedClub === "all") return sessions;
    return sessions.filter(s => s.clubId.toString() === selectedClub);
  }, [sessions, selectedClub]);

  const totalFiltered = useMemo(() => filtered.reduce((s, x) => s + x.fee, 0), [filtered]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-testid="modal-total-spent">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PoundSterling className="h-5 w-5" />
            Total Spent on Sessions
          </DialogTitle>
        </DialogHeader>
        {clubs.length > 1 && (
          <Select value={selectedClub} onValueChange={setSelectedClub}>
            <SelectTrigger data-testid="select-spent-club">
              <SelectValue placeholder="All Clubs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clubs</SelectItem>
              {clubs.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="p-4 rounded-md bg-primary/10 text-center">
          <p className="text-3xl font-bold">£{(totalFiltered / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{filtered.length} session{filtered.length !== 1 ? "s" : ""}{selectedClub !== "all" ? ` at ${clubs.find(c => c.id.toString() === selectedClub)?.name}` : ""}</p>
        </div>
        {filtered.length > 0 && (
          <div className="space-y-2 pt-2">
            {filtered.map((s, i) => (
              <div key={`${s.sessionId}-${i}`} className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50" data-testid={`spent-session-${s.sessionId}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.sessionTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.sessionDate ? format(new Date(s.sessionDate), "dd MMM yyyy") : "—"}
                    {selectedClub === "all" && ` — ${s.clubName}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">£{(s.fee / 100).toFixed(2)}</p>
                  <Badge variant={s.paymentStatus === "PAID" ? "default" : "secondary"} className="text-[10px]">
                    {s.paymentStatus || "UNPAID"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreditHistoryModal({ open, onClose, history }: {
  open: boolean; onClose: () => void; history: any[] | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-testid="modal-credit-history">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Credit History
          </DialogTitle>
        </DialogHeader>
        {!history || history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No credit transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(entry.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm">{entry.clubName}</TableCell>
                    <TableCell>
                      <span className={`font-medium flex items-center gap-1 ${entry.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {entry.amount >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {entry.amount >= 0 ? "+" : ""}£{(Math.abs(entry.amount) / 100).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{entry.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MembershipBenefitsCard({ clubId, clubName, sessionFee }: { clubId: number; clubName: string; sessionFee: number | null }) {
  const { data: plans } = useQuery<any[]>({
    queryKey: ["/api/clubs", clubId, "membership-plans"],
    enabled: !!clubId,
  });
  const [, navigate] = useLocation();

  if (!plans || plans.length === 0) return null;
  const plan = plans.find((p: any) => p.isDefault) || plans[0];
  const planPrice = (plan.annualPrice || 0) / 100;
  const memberFee = (plan.defaultSessionFee || 0) / 100;
  const regularFee = sessionFee ? sessionFee / 100 : memberFee + 2;
  const savingsPerSession = regularFee - memberFee;
  const breakEvenSessions = savingsPerSession > 0 ? Math.ceil(planPrice / savingsPerSession) : 0;

  return (
    <Card className="border-primary/20" data-testid={`card-membership-benefits-${clubId}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Star className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm">{clubName}</p>
            <p className="text-xs text-muted-foreground">{plan.name} - £{planPrice.toFixed(2)}</p>
          </div>
        </div>
        {savingsPerSession > 0 && (
          <div className="rounded-md bg-green-50 dark:bg-green-950/30 p-3">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              Save £{savingsPerSession.toFixed(2)} per session
            </p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
              Break even after {breakEvenSessions} sessions
            </p>
          </div>
        )}
        <Button size="sm" className="w-full" onClick={() => navigate("/memberships")} data-testid={`button-join-membership-${clubId}`}>
          View Membership Options
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const [, navigate] = useLocation();
  const { data: user, isLoading: userLoading } = useUser();
  const { mutate: uploadProfilePicture, isPending: isUploadingPic } = useUploadProfilePicture();
  const profilePicInputRef = useRef<HTMLInputElement>(null);
  const { data: profiles } = useQuery<any[]>({ queryKey: ["/api/player-profiles"], enabled: !!user });
  const { data: memberships } = useQuery<{ clubId: number; clubName: string; membershipStatus: string }[]>({ queryKey: ["/api/user/memberships"], enabled: !!user });
  const logout = useLogout();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: "", phone: "", dateOfBirth: "", city: "", country: "" });

  const { data: creditBalances } = useQuery<{ clubId: number; clubName: string; balance: number }[]>({ queryKey: ["/api/my-credits"], enabled: !!user });
  const { data: creditHistory } = useQuery<any[]>({ queryKey: ["/api/my-credits/history"], enabled: !!user });
  const { data: outstandingPayments } = useQuery<any[]>({ queryKey: ["/api/my-outstanding-payments"], enabled: !!user });
  const { data: clubMemberships } = useQuery<any[]>({ queryKey: ["/api/my-memberships"], enabled: !!user, refetchInterval: 30000 });
  const { data: sessionActivity } = useQuery<{ totalSessions: number; sessionsThisMonth: number; totalSpent: number }>({ queryKey: ["/api/my-session-activity"], enabled: !!user });

  const { data: sessionHistory } = useQuery<SessionHistoryItem[]>({ queryKey: ["/api/my-session-history"], enabled: !!user });

  const { data: matchPerformance } = useQuery<{
    clubs: { clubId: number; clubName: string; profileId: number; category: string | null; grade: string | null; played: number; won: number; lost: number; winPct: number; setsWon: number; pointsWon: number; rank: number; totalPlayers: number }[];
    totals: { played: number; won: number; lost: number; winPct: number };
  }>({ queryKey: ["/api/my-match-performance"], enabled: !!user });

  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [outstandingModalOpen, setOutstandingModalOpen] = useState(false);
  const [membershipsModalOpen, setMembershipsModalOpen] = useState(false);
  const [performanceModalOpen, setPerformanceModalOpen] = useState(false);
  const [creditHistoryModalOpen, setCreditHistoryModalOpen] = useState(false);
  const [totalSessionsModalOpen, setTotalSessionsModalOpen] = useState(false);
  const [sessionsThisMonthModalOpen, setSessionsThisMonthModalOpen] = useState(false);
  const [totalSpentModalOpen, setTotalSpentModalOpen] = useState(false);
  const [clubsModalOpen, setClubsModalOpen] = useState(false);
  const [discountCodesModalOpen, setDiscountCodesModalOpen] = useState(false);
  const [rankingClubFilter, setRankingClubFilter] = useState<string>("all");
  const [tierCardFlipped, setTierCardFlipped] = useState(false);
  const [membershipCardFlipped, setMembershipCardFlipped] = useState(false);

  const { data: availableThemesData } = useQuery<{
    unlockedThemes: string[];
    userRank: string;
    hasBlackCard: boolean;
  }>({
    queryKey: ["/api/user/available-themes"],
    enabled: !!user,
  });

  const [privacyNickname, setPrivacyNickname] = useState("");
  const [privacyShowPublicName, setPrivacyShowPublicName] = useState(false);
  const [isEditingPrivacy, setIsEditingPrivacy] = useState(false);

  const [juniorDialogOpen, setJuniorDialogOpen] = useState(false);
  const [editingJunior, setEditingJunior] = useState<any>(null);
  const [deletingJuniorId, setDeletingJuniorId] = useState<number | null>(null);
  const [juniorForm, setJuniorForm] = useState({ fullName: "", dateOfBirth: "", emergencyContact: "", medicalNotes: "" });

  const { data: juniors, isLoading: juniorsLoading } = useQuery<any[]>({ queryKey: ["/api/juniors"], enabled: !!user });

  const totalCredits = useMemo(() => {
    if (!creditBalances) return 0;
    return creditBalances.reduce((sum, cb) => {
      const bal = Number(cb.balance);
      return sum + (bal > 0 ? bal : 0);
    }, 0);
  }, [creditBalances]);

  const totalOutstanding = useMemo(() => {
    if (!outstandingPayments) return 0;
    return outstandingPayments.reduce((sum: number, p: any) => sum + p.fee, 0);
  }, [outstandingPayments]);

  const performance = useMemo(() => {
    if (!matchPerformance) return { played: 0, won: 0, lost: 0, winPct: 0 };
    return matchPerformance.totals;
  }, [matchPerformance]);

  const activeMembershipClubIds = useMemo(() => {
    return new Set((clubMemberships || []).filter((m: any) => m.status === "ACTIVE" || m.status === "EXPIRING" || m.status === "PENDING").map((m: any) => m.clubId));
  }, [clubMemberships]);

  const clubsWithoutMembership = useMemo(() => {
    if (!profiles) return [];
    return profiles.filter((p: any) => !activeMembershipClubIds.has(p.clubId) && p.membershipStatus === "APPROVED")
      .map((p: any) => ({ clubId: p.clubId, clubName: p.club?.name || `Club ${p.clubId}`, sessionFee: p.club?.sessionFee }));
  }, [profiles, activeMembershipClubIds]);

  const activeMembershipCount = activeMembershipClubIds.size;
  const primaryProfile = profiles?.[0];

  const addJuniorMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/juniors", data); if (!res.ok) { const error = await res.json(); throw new Error(error.message); } return res.json(); },
    onSuccess: () => { toast({ title: "Junior added" }); queryClient.invalidateQueries({ queryKey: ["/api/juniors"] }); setJuniorDialogOpen(false); resetJuniorForm(); },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });
  const editJuniorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { const res = await apiRequest("PATCH", `/api/juniors/${id}`, data); if (!res.ok) { const error = await res.json(); throw new Error(error.message); } return res.json(); },
    onSuccess: () => { toast({ title: "Junior updated" }); queryClient.invalidateQueries({ queryKey: ["/api/juniors"] }); setJuniorDialogOpen(false); setEditingJunior(null); resetJuniorForm(); },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });
  const deleteJuniorMutation = useMutation({
    mutationFn: async (id: number) => { const res = await apiRequest("DELETE", `/api/juniors/${id}`); if (!res.ok) { const error = await res.json(); throw new Error(error.message); } return res.json(); },
    onSuccess: () => { toast({ title: "Junior removed" }); queryClient.invalidateQueries({ queryKey: ["/api/juniors"] }); setDeletingJuniorId(null); },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });

  const resetJuniorForm = () => setJuniorForm({ fullName: "", dateOfBirth: "", emergencyContact: "", medicalNotes: "" });
  const openAddJuniorDialog = () => { setEditingJunior(null); resetJuniorForm(); setJuniorDialogOpen(true); };
  const openEditJuniorDialog = (junior: any) => {
    setEditingJunior(junior);
    setJuniorForm({ fullName: junior.fullName || "", dateOfBirth: junior.dateOfBirth ? new Date(junior.dateOfBirth).toISOString().split("T")[0] : "", emergencyContact: junior.emergencyContact || "", medicalNotes: junior.medicalNotes || "" });
    setJuniorDialogOpen(true);
  };
  const handleSaveJunior = () => {
    const payload = { fullName: juniorForm.fullName, dateOfBirth: juniorForm.dateOfBirth || undefined, emergencyContact: juniorForm.emergencyContact || undefined, medicalNotes: juniorForm.medicalNotes || undefined };
    if (editingJunior) editJuniorMutation.mutate({ id: editingJunior.id, data: payload });
    else addJuniorMutation.mutate(payload);
  };

  const updatePrivacyMutation = useMutation({
    mutationFn: async (data: { nickname?: string; showPublicName?: boolean }) => { const res = await apiRequest("PATCH", "/api/user/profile", data); if (!res.ok) { const error = await res.json(); throw new Error(error.message); } return res.json(); },
    onSuccess: () => { toast({ title: "Privacy settings updated" }); queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }); setIsEditingPrivacy(false); },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });
  const startEditingPrivacy = () => { setPrivacyNickname((user as any)?.nickname || ""); setPrivacyShowPublicName((user as any)?.showPublicName || false); setIsEditingPrivacy(true); };
  const handleSavePrivacy = () => { updatePrivacyMutation.mutate({ nickname: privacyNickname || undefined, showPublicName: privacyShowPublicName }); };

  const updateUserProfileMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("PATCH", "/api/user/profile", data); if (!res.ok) { const error = await res.json(); throw new Error(error.message); } return res.json(); },
    onSuccess: () => { toast({ title: "Profile updated" }); queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }); queryClient.invalidateQueries({ queryKey: ["/api/player-profiles"] }); setIsEditing(false); },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });
  const deleteAccountMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/account/close"); if (!res.ok) { const error = await res.json(); throw new Error(error.message); } return res.json(); },
    onSuccess: () => { toast({ title: "Account Deleted" }); queryClient.clear(); navigate("/"); },
    onError: (error: Error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
  });

  const handleLogout = () => { logout.mutate(); navigate("/"); };
  const startEditing = () => {
    setEditForm({ fullName: user?.fullName || "", phone: (user as any)?.phone || "", dateOfBirth: (user as any)?.dateOfBirth ? new Date((user as any).dateOfBirth).toISOString().split("T")[0] : "", city: (user as any)?.city || "", country: (user as any)?.country || "" });
    setIsEditing(true);
  };
  const handleSave = () => { updateUserProfileMutation.mutate({ fullName: editForm.fullName, phone: editForm.phone, dateOfBirth: editForm.dateOfBirth || undefined, city: editForm.city, country: editForm.country }); };

  const isProfileComplete = !!(user?.fullName && user.fullName.trim().length >= 2);

  if (userLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Card><CardContent className="p-8 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Not Logged In</h2>
          <p className="text-muted-foreground mb-4">Please log in to view your profile.</p>
          <Button onClick={() => navigate("/login")} data-testid="button-login">Log In</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-0 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {!isProfileComplete && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Complete your profile</p>
                <p className="text-sm text-muted-foreground mt-1">Please fill in your name and details below before requesting to join a club.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Header */}
      <Card data-testid="card-profile-header">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4 flex-wrap">
            <div className="relative">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                {(user as any).profilePictureUrl ? <AvatarImage src={(user as any).profilePictureUrl} /> : null}
                <AvatarFallback className="text-lg sm:text-xl">{user.fullName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <button className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-sm" onClick={() => profilePicInputRef.current?.click()} disabled={isUploadingPic} data-testid="button-upload-profile-pic">
                {isUploadingPic ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
              <input type="file" accept="image/*" className="hidden" ref={profilePicInputRef}
                onChange={(e) => { const file = e.target.files?.[0]; if (file) { uploadProfilePicture({ file }); e.target.value = ""; } }} data-testid="input-profile-pic" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-user-name">{user.fullName || "New User"}</h1>
                {(user as any).blackCardAccess && (
                  <Crown className="h-5 w-5 text-amber-500 shrink-0" data-testid="icon-black-card-holder" />
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" data-testid="badge-role">
                  <Shield className="h-3 w-3 mr-1" />
                  {user.role === "OWNER" ? "Platform Owner" : user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                </Badge>
                {primaryProfile?.grade && (
                  <Badge variant="outline" data-testid="badge-grade">
                    <Award className="h-3 w-3 mr-1" />
                    Grade {primaryProfile.grade}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 sm:gap-4 mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground flex-wrap">
                {(user as any)?.email && (
                  <span data-testid="text-email">{user.email}</span>
                )}
                {(user as any)?.city && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{(user as any).city}{(user as any).country ? `, ${(user as any).country}` : ""}</span>
                )}
              </div>
              {profiles && profiles.length > 0 && (
                <Badge variant="outline" className="text-xs cursor-pointer mt-2" onClick={() => setClubsModalOpen(true)} data-testid="badge-clubs-count">
                  <Building2 className="h-3 w-3 mr-1" />
                  {profiles.length} Club{profiles.length !== 1 ? "s" : ""}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Badge>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={startEditing} data-testid="button-edit-profile">
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {primaryProfile?.joinedAt && (
        <ProfileMembershipDuration joinedAt={primaryProfile.joinedAt} />
      )}

      {user && (() => {
        const tierData = (() => {
          if ((user as any).blackCardAccess) return {
            name: "BLACK CARD", subtitle: "Titanium Gold Member",
            bg: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 30%, #1e1e1e 50%, #252525 70%, #1a1a1a 100%)",
            border: "#b8860b", borderGlow: "rgba(184,134,11,0.3)",
            accent: "#c5a044", accentDark: "#9a7d2e", accentDim: "#7a6420",
            iconBg: "linear-gradient(135deg, #c5a044, #8b6914)",
            iconShadow: "rgba(184,134,11,0.3)",
            innerBorder: "rgba(180,130,20,0.2)",
            benefits: [
              "3 Ultra Exclusive themes",
              "Midnight Neon, Cosmic Elite, Phantom Luxe",
              "Titanium card privileges",
              "Invite-only access tier",
              "Priority support channel",
              "Exclusive profile badge",
            ],
          };
          if (availableThemesData?.userRank === "champion") return {
            name: "SIGNATURE", subtitle: "Champion #1",
            bg: "linear-gradient(135deg, #10061a 0%, #1a0d28 30%, #140a20 50%, #1e1030 70%, #10061a 100%)",
            border: "#8B5CF6", borderGlow: "rgba(139,92,246,0.3)",
            accent: "#A78BFA", accentDark: "#7C3AED", accentDim: "#6D28D9",
            iconBg: "linear-gradient(135deg, #A78BFA, #7C3AED)",
            iconShadow: "rgba(139,92,246,0.3)",
            innerBorder: "rgba(139,92,246,0.2)",
            benefits: [
              "5 Signature themes unlocked",
              "Royal Amethyst, Sunset Copper",
              "Adrenaline Rush, Velocity Chrome",
              "Circuit Court theme",
              "Champion profile badge",
              "All Elite themes included",
            ],
          };
          if (availableThemesData?.userRank === "top10") return {
            name: "ELITE", subtitle: "Top 10 Contender",
            bg: "linear-gradient(135deg, #0a0f1a 0%, #0d1525 30%, #0a1020 50%, #0e1828 70%, #0a0f1a 100%)",
            border: "#06B6D4", borderGlow: "rgba(6,182,212,0.3)",
            accent: "#22D3EE", accentDark: "#0891B2", accentDim: "#0E7490",
            iconBg: "linear-gradient(135deg, #22D3EE, #0891B2)",
            iconShadow: "rgba(6,182,212,0.3)",
            innerBorder: "rgba(6,182,212,0.2)",
            benefits: [
              "7 Elite themes unlocked",
              "Sapphire Velocity, Crimson Prestige",
              "Arctic Blue, Aurora Borealis",
              "Volcanic Ember, Deep Ocean",
              "Jungle Vibe theme",
              "All Premium themes included",
            ],
          };
          return {
            name: "PREMIUM", subtitle: "Bronze Member",
            bg: "linear-gradient(135deg, #1a1610 0%, #2a2418 30%, #1e1a12 50%, #252016 70%, #1a1610 100%)",
            border: "#8B6914", borderGlow: "rgba(139,105,20,0.25)",
            accent: "#D4A45A", accentDark: "#A07830", accentDim: "#7A5C20",
            iconBg: "linear-gradient(135deg, #D4A45A, #8B6914)",
            iconShadow: "rgba(139,105,20,0.3)",
            innerBorder: "rgba(139,105,20,0.15)",
            benefits: [
              "11 Premium themes unlocked",
              "Obsidian Gold, Platinum Ice",
              "Emerald Performance, Carbon Titanium",
              "AMOLED Black + 6 more",
              "Full theme customisation",
              "Rank up for Elite themes",
            ],
          };
        })();

        const isReducedMotion = (user as any).reducedMotion === true;

        return (
          <div
            className="cursor-pointer mx-auto w-full"
            style={{ maxWidth: "420px", perspective: "1000px" }}
            onClick={() => setTierCardFlipped(!tierCardFlipped)}
            data-testid="card-tier-visual"
          >
            <div style={{
              position: "relative",
              width: "100%",
              aspectRatio: "1.586",
              transition: isReducedMotion ? "none" : "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
              transformStyle: "preserve-3d",
              WebkitTransformStyle: "preserve-3d" as any,
              transform: tierCardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}>
              <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden" as any,
                background: tierData.bg,
                boxShadow: `0 0 0 2px ${tierData.border}, 0 0 0 3px ${tierData.borderGlow}, 0 20px 60px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4)`,
              }}>
                <div className="absolute inset-0" style={{
                  background: "repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 2px)",
                }} />
                <div className="absolute inset-0" style={{
                  background: `radial-gradient(ellipse at 30% 20%, ${tierData.border}14 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, ${tierData.border}0a 0%, transparent 40%)`,
                }} />
                <div className="absolute inset-[2px] rounded-2xl" style={{ borderWidth: 1, borderStyle: "solid", borderColor: tierData.innerBorder }} />
                <div className="relative h-full flex flex-col justify-between p-5 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg sm:text-xl font-bold tracking-[0.08em]" style={{ color: tierData.accent }}>
                        {(user.fullName || "").toUpperCase()}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.25em] mt-0.5 font-medium" style={{ color: tierData.accentDark }}>
                        {tierData.subtitle}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                      background: tierData.iconBg,
                      boxShadow: `0 2px 8px ${tierData.iconShadow}`,
                    }}>
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                        <path d="M12 2L6 8H2L5 14L3 22H21L19 14L22 8H18L12 2Z" fill="#1a1a1a" stroke="#1a1a1a" strokeWidth="1.5" />
                        <path d="M7 8L12 3L17 8" stroke="#2a2a2a" strokeWidth="1" />
                        <rect x="8" y="12" width="8" height="4" rx="0.5" fill="#2a2a2a" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <div className="mb-4">
                      <svg viewBox="0 0 60 36" className="w-14 h-auto" fill="none">
                        <path d="M10 30L20 15L30 25L40 10L50 20" stroke={tierData.accent} strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M22 8L30 2L38 8" stroke={tierData.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M26 8L30 4L34 8" stroke={tierData.accentDark} strokeWidth="1" strokeLinecap="round" />
                        <circle cx="30" cy="2" r="1.5" fill={tierData.accent} />
                      </svg>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: tierData.accentDim }}>
                        Member Since {new Date((user as any).createdAt || Date.now()).getFullYear()}
                      </p>
                      <p className="text-[11px] font-mono tracking-wider" style={{ color: tierData.accentDark }}>
                        NO. {String(user.id || 0).padStart(4, "0")}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-2 right-3 text-[8px] uppercase tracking-widest" style={{ color: `${tierData.accentDim}80` }}>
                  Tap to flip
                </div>
              </div>

              <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden" as any,
                transform: "rotateY(180deg)",
                background: tierData.bg,
                boxShadow: `0 0 0 2px ${tierData.border}, 0 0 0 3px ${tierData.borderGlow}, 0 20px 60px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4)`,
              }}>
                <div className="absolute inset-0" style={{
                  background: "repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 2px)",
                }} />
                <div className="absolute inset-0" style={{
                  background: `radial-gradient(ellipse at 70% 30%, ${tierData.border}14 0%, transparent 50%)`,
                }} />
                <div className="absolute inset-[2px] rounded-2xl" style={{ borderWidth: 1, borderStyle: "solid", borderColor: tierData.innerBorder }} />
                <div className="absolute top-0 left-0 right-0 h-10" style={{ background: `linear-gradient(180deg, ${tierData.accent}15, transparent)` }} />
                <div className="relative h-full flex flex-col p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: tierData.accent }}>
                      {tierData.name}
                    </p>
                    <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: tierData.accentDim }}>
                      Benefits
                    </p>
                  </div>
                  <div className="w-full h-px mb-3" style={{ background: `linear-gradient(90deg, transparent, ${tierData.accent}40, transparent)` }} />
                  <div className="flex-1 flex flex-col justify-center gap-2">
                    {tierData.benefits.map((benefit, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: tierData.accent }} />
                        <p className="text-[10px] sm:text-[11px] font-medium" style={{ color: i < 2 ? tierData.accent : tierData.accentDark }}>
                          {benefit}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="w-full h-px mt-3" style={{ background: `linear-gradient(90deg, transparent, ${tierData.accent}40, transparent)` }} />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: tierData.accentDim }}>
                      NO. {String(user.id || 0).padStart(4, "0")}
                    </p>
                    <p className="text-[8px] uppercase tracking-widest" style={{ color: `${tierData.accentDim}80` }}>
                      Tap to flip
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Financial Summary */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <MetricCard icon={Wallet} label="Credit Balance" value={`£${(totalCredits / 100).toFixed(2)}`}
          subtext={creditBalances && creditBalances.length > 0 ? `Across ${creditBalances.length} club${creditBalances.length > 1 ? "s" : ""}` : "No credits yet"}
          onClick={() => setCreditsModalOpen(true)} />
        <MetricCard icon={AlertCircle} label="Outstanding Balance" value={`£${(totalOutstanding / 100).toFixed(2)}`}
          subtext={outstandingPayments && outstandingPayments.length > 0 ? `${outstandingPayments.length} unpaid session${outstandingPayments.length > 1 ? "s" : ""}` : "All paid up"}
          onClick={() => setOutstandingModalOpen(true)}
          className={totalOutstanding > 0 ? "border-amber-300/50 dark:border-amber-700/50" : ""} />
      </div>

      {/* My Rewards */}
      <ProfileRewardsSection />

      {/* Performance, Rankings & Activity */}
      <CollapsibleSection title="Performance & Activity" icon={BarChart3} testId="card-performance-activity">
        <div className="cursor-pointer" onClick={() => setPerformanceModalOpen(true)} data-testid="card-performance">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={performance.played > 0
                      ? [{ name: "Won", value: performance.won }, { name: "Lost", value: performance.lost }]
                      : [{ name: "None", value: 1 }]}
                    cx="50%" cy="50%"
                    innerRadius={20} outerRadius={30}
                    paddingAngle={performance.played > 0 ? 3 : 0}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {performance.played > 0 ? (
                      <>
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--destructive))" />
                      </>
                    ) : (
                      <Cell fill="hsl(var(--muted-foreground) / 0.3)" />
                    )}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-4 gap-1 text-center">
              <div>
                <p className="text-lg font-bold text-primary">{performance.won}</p>
                <p className="text-[10px] text-muted-foreground">Won</p>
              </div>
              <div>
                <p className="text-lg font-bold text-destructive">{performance.lost}</p>
                <p className="text-[10px] text-muted-foreground">Lost</p>
              </div>
              <div>
                <p className="text-lg font-bold">{performance.winPct}%</p>
                <p className="text-[10px] text-muted-foreground">Win %</p>
              </div>
              <div>
                <p className="text-lg font-bold">{performance.played}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </div>

        {matchPerformance && matchPerformance.clubs.length > 0 && (
          <>
            <div className="border-t border-border/40 my-4" />
            <div data-testid="card-club-ranking">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Rankings</span>
                </div>
                {matchPerformance.clubs.length > 1 && (
                  <Select value={rankingClubFilter} onValueChange={setRankingClubFilter}>
                    <SelectTrigger className="w-[140px] h-8 text-xs" data-testid="select-ranking-club">
                      <SelectValue placeholder="All Clubs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clubs</SelectItem>
                      {matchPerformance.clubs.map((c) => (
                        <SelectItem key={c.clubId} value={c.clubId.toString()}>
                          {c.clubName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                {(rankingClubFilter === "all" ? matchPerformance.clubs : matchPerformance.clubs.filter(c => c.clubId.toString() === rankingClubFilter)).map((club) => (
                  <div key={club.clubId} className="flex items-center gap-3 p-2.5 rounded-md bg-muted/30" data-testid={`ranking-club-${club.clubId}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{club.clubName}</span>
                        {club.grade && <Badge variant="outline" className="text-[10px] px-1 no-default-hover-elevate">{club.grade}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span className="text-primary font-medium">{club.won}W</span>
                        <span className="text-destructive font-medium">{club.lost}L</span>
                        <span>{club.winPct}%</span>
                        <span>{club.played} played</span>
                      </div>
                    </div>
                    {club.rank > 0 && (
                      <Badge className={`no-default-hover-elevate shrink-0 ${club.rank <= 3 ? "bg-amber-500 text-white" : ""}`}>
                        #{club.rank}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="border-t border-border/40 my-4" />
        <div data-testid="card-session-activity">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Sessions</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="cursor-pointer text-center p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors" onClick={() => setTotalSessionsModalOpen(true)}>
              <p className="text-lg font-bold">{sessionActivity?.totalSessions ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div className="cursor-pointer text-center p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors" onClick={() => setSessionsThisMonthModalOpen(true)}>
              <p className="text-lg font-bold">{sessionActivity?.sessionsThisMonth ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">This Month</p>
            </div>
            <div className="cursor-pointer text-center p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors" onClick={() => setTotalSpentModalOpen(true)}>
              <p className="text-lg font-bold">£{((sessionActivity?.totalSpent ?? 0) / 100).toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">Spent</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Credit History */}
      {creditHistory && creditHistory.length > 0 && (
        <Card className="cursor-pointer hover-elevate" onClick={() => setCreditHistoryModalOpen(true)} data-testid="card-credit-history">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Credit History</p>
                  <p className="text-xs text-muted-foreground">{creditHistory.length} transaction{creditHistory.length > 1 ? "s" : ""}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Memberships - VIP Card */}
      {activeMembershipCount > 0 && user && (() => {
        const activeCount = (clubMemberships || []).filter((m: any) => m.status === "ACTIVE" || m.status === "EXPIRING").length;
        const pendingCount = (clubMemberships || []).filter((m: any) => m.status === "PENDING").length;
        const primaryMembership = (clubMemberships || []).find((m: any) => m.status === "ACTIVE" || m.status === "EXPIRING");
        const memberClubs = (clubMemberships || [])
          .filter((m: any) => m.status === "ACTIVE" || m.status === "EXPIRING")
          .map((m: any) => m.clubName);
        const isReducedMotion = (user as any).reducedMotion === true;

        return (
          <div
            className="cursor-pointer mx-auto w-full"
            style={{ maxWidth: "420px", perspective: "1000px" }}
            onClick={() => setMembershipCardFlipped(!membershipCardFlipped)}
            data-testid="card-active-memberships"
          >
            <div style={{
              position: "relative",
              width: "100%",
              aspectRatio: "1.586",
              transition: isReducedMotion ? "none" : "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
              transformStyle: "preserve-3d",
              WebkitTransformStyle: "preserve-3d" as any,
              transform: membershipCardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}>
              <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden" as any,
                background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a18 30%, #0e0e0c 50%, #161614 70%, #0a0a0a 100%)",
                boxShadow: "0 0 0 2px #8B7320, 0 0 0 3px rgba(139,115,32,0.3), 0 20px 60px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4)",
              }}>
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 420 265" fill="none" preserveAspectRatio="none">
                  <rect x="12" y="12" width="396" height="241" rx="8" stroke="#8B7320" strokeWidth="0.5" opacity="0.4" />
                  <rect x="18" y="18" width="384" height="229" rx="6" stroke="#8B7320" strokeWidth="0.3" opacity="0.25" />
                  <path d="M12 12L30 30M408 12L390 30M12 253L30 235M408 253L390 235" stroke="#8B7320" strokeWidth="0.5" opacity="0.35" />
                  <path d="M12 12L18 18M408 12L402 18M12 253L18 247M408 253L402 247" stroke="#B8941F" strokeWidth="0.8" opacity="0.5" />
                  <line x1="30" y1="30" x2="50" y2="30" stroke="#8B7320" strokeWidth="0.5" opacity="0.3" />
                  <line x1="30" y1="30" x2="30" y2="50" stroke="#8B7320" strokeWidth="0.5" opacity="0.3" />
                  <line x1="390" y1="30" x2="370" y2="30" stroke="#8B7320" strokeWidth="0.5" opacity="0.3" />
                  <line x1="390" y1="30" x2="390" y2="50" stroke="#8B7320" strokeWidth="0.5" opacity="0.3" />
                  <line x1="30" y1="235" x2="50" y2="235" stroke="#8B7320" strokeWidth="0.5" opacity="0.3" />
                  <line x1="30" y1="235" x2="30" y2="215" stroke="#8B7320" strokeWidth="0.5" opacity="0.3" />
                  <line x1="390" y1="235" x2="370" y2="235" stroke="#8B7320" strokeWidth="0.5" opacity="0.3" />
                  <line x1="390" y1="235" x2="390" y2="215" stroke="#8B7320" strokeWidth="0.5" opacity="0.3" />
                  <path d="M35 15L45 25M375 15L385 25" stroke="#8B7320" strokeWidth="0.3" opacity="0.2" />
                  <path d="M35 250L45 240M375 250L385 240" stroke="#8B7320" strokeWidth="0.3" opacity="0.2" />
                </svg>
                <div className="absolute inset-0" style={{
                  background: "radial-gradient(ellipse at 50% 40%, rgba(139,115,32,0.06) 0%, transparent 60%)",
                }} />
                <div className="relative h-full flex flex-col items-center justify-center p-6">
                  <div className="flex items-center gap-1 mb-1">
                    <svg viewBox="0 0 40 44" className="w-8 h-8" fill="none">
                      <path d="M20 2L4 14V30L20 42L36 30V14L20 2Z" stroke="#B8941F" strokeWidth="1.2" fill="none" />
                      <path d="M20 6L8 16V28L20 38L32 28V16L20 6Z" stroke="#8B7320" strokeWidth="0.6" fill="none" />
                      <path d="M14 20L18 24L26 16" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-2xl sm:text-3xl font-black tracking-[0.05em]" style={{
                      background: "linear-gradient(180deg, #E6C555 0%, #D4AF37 40%, #B8941F 70%, #8B7320 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}>VIP</span>
                    <svg viewBox="0 0 28 32" className="w-6 h-7" fill="none">
                      <path d="M14 4C10 4 6 8 6 12C6 18 14 28 14 28C14 28 22 18 22 12C22 8 18 4 14 4Z" fill="none" stroke="#B8941F" strokeWidth="0.8" />
                      <circle cx="14" cy="12" r="3" fill="none" stroke="#D4AF37" strokeWidth="0.6" />
                      <path d="M8 6C4 6 2 10 4 14" stroke="#8B7320" strokeWidth="0.4" opacity="0.5" />
                    </svg>
                  </div>
                  <p className="text-base sm:text-lg font-bold tracking-[0.12em] text-center" style={{
                    background: "linear-gradient(180deg, #E6C555 0%, #D4AF37 50%, #B8941F 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}>
                    {(user.fullName || "").toUpperCase()}
                  </p>
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] mt-1 font-medium" style={{ color: "#8B7320" }}>
                    {activeCount > 1 ? `${activeCount} Club Memberships` : "Club Membership"}
                    {pendingCount > 0 ? ` · ${pendingCount} Pending` : ""}
                  </p>
                  {primaryMembership?.membershipNumber && (
                    <p className="text-[10px] font-mono tracking-[0.15em] mt-3" style={{ color: "#6B5B1F" }}>
                      MEMBER NO. {primaryMembership.membershipNumber}
                    </p>
                  )}
                </div>
                <div className="absolute bottom-3 right-4 text-[8px] uppercase tracking-widest" style={{ color: "rgba(139,115,32,0.4)" }}>
                  Tap to flip
                </div>
              </div>

              <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden" as any,
                transform: "rotateY(180deg)",
                background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a18 30%, #0e0e0c 50%, #161614 70%, #0a0a0a 100%)",
                boxShadow: "0 0 0 2px #8B7320, 0 0 0 3px rgba(139,115,32,0.3), 0 20px 60px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4)",
              }}>
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 420 265" fill="none" preserveAspectRatio="none">
                  <rect x="12" y="12" width="396" height="241" rx="8" stroke="#8B7320" strokeWidth="0.5" opacity="0.4" />
                  <rect x="18" y="18" width="384" height="229" rx="6" stroke="#8B7320" strokeWidth="0.3" opacity="0.25" />
                </svg>
                <div className="absolute inset-0" style={{
                  background: "radial-gradient(ellipse at 50% 30%, rgba(139,115,32,0.05) 0%, transparent 50%)",
                }} />
                <div className="relative h-full flex flex-col p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: "#D4AF37" }}>
                      VIP Membership
                    </p>
                    <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "#6B5B1F" }}>
                      Benefits
                    </p>
                  </div>
                  <div className="w-full h-px mb-2" style={{ background: "linear-gradient(90deg, transparent, rgba(139,115,32,0.4), transparent)" }} />
                  <div className="flex-1 flex flex-col justify-center gap-1.5">
                    {[
                      "Exclusive member session rates",
                      `Active at ${memberClubs.length > 0 ? memberClubs.slice(0, 2).join(", ") : "your clubs"}`,
                      "Member discount codes",
                      "VIP profile badge",
                      primaryMembership?.endDate
                        ? `Valid until ${format(new Date(primaryMembership.endDate), "MMM d, yyyy")}`
                        : "Annual membership benefits",
                    ].map((benefit, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: "#D4AF37" }} />
                        <p className="text-[10px] sm:text-[11px] font-medium" style={{ color: i < 2 ? "#D4AF37" : "#8B7320" }}>
                          {benefit}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="w-full h-px mt-2 mb-2" style={{ background: "linear-gradient(90deg, transparent, rgba(139,115,32,0.4), transparent)" }} />
                  <div className="flex items-center justify-between">
                    <button
                      className="text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-md transition-colors"
                      style={{
                        color: "#0a0a0a",
                        background: "linear-gradient(135deg, #D4AF37, #B8941F)",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMembershipsModalOpen(true);
                      }}
                      data-testid="button-view-memberships-card"
                    >
                      View All Memberships
                    </button>
                    <p className="text-[8px] uppercase tracking-widest" style={{ color: "rgba(139,115,32,0.4)" }}>
                      Tap to flip
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {activeMembershipCount > 0 && (
        <Card className="cursor-pointer hover-elevate" onClick={() => setDiscountCodesModalOpen(true)} data-testid="card-discount-codes">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-amber-500/10">
                  <Tag className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium">Discount Codes</p>
                  <p className="text-xs text-muted-foreground">View exclusive member discounts</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      <CollapsibleSection title="Membership Benefits" icon={Star} testId="card-membership-benefits">
        <div className="space-y-6">
          {clubsWithoutMembership.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Membership Plans</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clubsWithoutMembership.map((club) => (
                  <MembershipBenefitsCard key={club.clubId} clubId={club.clubId} clubName={club.clubName} sessionFee={club.sessionFee} />
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Referral Programme</p>
            <Link href="/referrals">
              <Card className="cursor-pointer hover-elevate border-emerald-200 dark:border-emerald-800" data-testid="card-membership-refer-earn">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10">
                      <Gift className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">Refer & Earn</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Invite friends and unlock rewards</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px] px-1.5 border-emerald-300 text-emerald-700 dark:text-emerald-400">2 Referrals</Badge>
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">Premium rate for 2 months</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px] px-1.5 border-emerald-300 text-emerald-700 dark:text-emerald-400">4 Referrals</Badge>
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">1 free session credit</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5">After 2 months at Premium rate, you can revert to standard or upgrade to a 1-year Premium membership.</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Anniversary Rewards</p>
            <div className="space-y-4">
              <Card className="border-amber-200 dark:border-amber-800" data-testid="card-membership-anniversary">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-amber-500/10">
                      <PartyPopper className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">Club Anniversary Rewards</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Celebrate your membership milestones</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3.5 space-y-2">
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">Every year on the date you joined a club, you'll receive:</p>
                    <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1.5 list-disc list-inside">
                      <li>Anniversary credit reward added to your account</li>
                      <li>Special anniversary gifts (if set by your club)</li>
                      <li>A personalised congratulations message</li>
                    </ul>
                    <p className="text-[11px] text-muted-foreground mt-2">Rewards are set by each club's admin. See your countdown below to check when your next anniversary is due.</p>
                  </div>
                </CardContent>
              </Card>

              <AnniversaryCountdown />
              <BirthdayCountdown />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Player Insurance" icon={Shield} testId="card-player-insurance">
        <BadmintonEnglandSection user={user} />
      </CollapsibleSection>

      {/* Account Settings */}
      <CollapsibleSection title="Account Settings" icon={Settings} testId="card-account-settings">
        <div>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} placeholder="Your full name" data-testid="input-fullname" />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Your phone number" data-testid="input-phone" />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth {(user as any)?.dateOfBirth && (user as any)?.role === 'PLAYER' ? "(Locked)" : ""}</Label>
                {(user as any)?.dateOfBirth && (user as any)?.role === 'PLAYER' ? (
                  <div className="flex items-center gap-2">
                    <Input id="dateOfBirth" type="date" value={editForm.dateOfBirth} disabled className="opacity-60 cursor-not-allowed" data-testid="input-dob" />
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                ) : (
                  <>
                    <Input id="dateOfBirth" type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })} data-testid="input-dob" />
                    {!(user as any)?.dateOfBirth && <p className="text-xs text-muted-foreground mt-1">Once set, only an admin can change your date of birth.</p>}
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} placeholder="Your city" data-testid="input-city" />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} placeholder="Your country" data-testid="input-country" />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSave} disabled={updateUserProfileMutation.isPending || !editForm.fullName.trim()} data-testid="button-save-profile">
                  {updateUserProfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
                  <p className="font-medium text-sm" data-testid="text-phone">{(user as any)?.phone || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Date of Birth</Label>
                  <p className="font-medium text-sm" data-testid="text-dob">{(user as any)?.dateOfBirth ? new Date((user as any).dateOfBirth).toLocaleDateString() : "Not set"}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={startEditing} data-testid="button-edit-profile-settings">
                <Pencil className="h-4 w-4 mr-1" />
                Edit Profile
              </Button>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Privacy Settings */}
      <CollapsibleSection title="Privacy & Display" icon={Eye} testId="card-privacy">
        <div>
          {isEditingPrivacy ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname / Display Name</Label>
                <Input id="nickname" value={privacyNickname} onChange={(e) => setPrivacyNickname(e.target.value)} placeholder="Enter a nickname (optional)" data-testid="input-nickname" />
                <p className="text-xs text-muted-foreground">If set, your nickname will be shown instead of your real name on public views.</p>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
                <div className="space-y-1">
                  <Label htmlFor="showPublicName" className="font-medium flex items-center gap-1.5">
                    {privacyShowPublicName ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    Show my name publicly
                  </Label>
                  <p className="text-xs text-muted-foreground">When disabled, your name will appear blurred to other visitors.</p>
                </div>
                <Switch id="showPublicName" checked={privacyShowPublicName} onCheckedChange={setPrivacyShowPublicName} data-testid="switch-show-public-name" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSavePrivacy} disabled={updatePrivacyMutation.isPending} data-testid="button-save-privacy">
                  {updatePrivacyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save
                </Button>
                <Button variant="outline" onClick={() => setIsEditingPrivacy(false)} data-testid="button-cancel-privacy">Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nickname</Label>
                  <p className="font-medium text-sm" data-testid="text-nickname">{(user as any)?.nickname || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Visibility</Label>
                  <div className="mt-0.5">
                    {(user as any)?.showPublicName ? (
                      <Badge variant="default" data-testid="badge-public-name-visible"><Eye className="h-3 w-3 mr-1" />Visible</Badge>
                    ) : (
                      <Badge variant="secondary" data-testid="badge-public-name-blurred"><EyeOff className="h-3 w-3 mr-1" />Blurred</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button onClick={startEditingPrivacy} variant="outline" size="sm" data-testid="button-edit-privacy">
                <Settings className="h-4 w-4 mr-1" />
                Edit Display Settings
              </Button>
            </div>
          )}
        </div>
      </CollapsibleSection>

      <DisplayAccessibilitySection />

      {/* Junior Accounts */}
      <CollapsibleSection title="Junior Accounts" icon={Users} testId="card-junior-accounts">
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={openAddJuniorDialog} data-testid="button-add-junior">
              <Plus className="h-4 w-4 mr-1" />Add Junior
            </Button>
          </div>
          {juniorsLoading ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : juniors && juniors.length > 0 ? (
            <div className="space-y-3">
              {juniors.map((junior: any) => (
                <div key={junior.id} className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0" data-testid={`junior-row-${junior.id}`}>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium" data-testid={`text-junior-name-${junior.id}`}>{junior.fullName}</span>
                    {junior.dateOfBirth && <span className="text-sm text-muted-foreground">DOB: {format(new Date(junior.dateOfBirth), "MMM d, yyyy")}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditJuniorDialog(junior)} data-testid={`button-edit-junior-${junior.id}`}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingJuniorId(junior.id)} data-testid={`button-delete-junior-${junior.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="text-no-juniors">No junior accounts added yet.</p>
          )}
        </div>
      </CollapsibleSection>

      {/* Danger Zone */}
      <CollapsibleSection title="Danger Zone" icon={XCircle} iconColor="text-destructive" className="border-destructive/20" testId="card-danger-zone">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" data-testid="button-delete-account">
              <XCircle className="h-4 w-4 mr-1" />
              Delete My Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-background">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete your account?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete your account and all your data. You can create a new account in the future using the same email.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteAccountMutation.mutate()} disabled={deleteAccountMutation.isPending} data-testid="button-confirm-delete">
                {deleteAccountMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Yes, Delete My Account
              </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </CollapsibleSection>

      {/* Modals */}
      <CreditsModal open={creditsModalOpen} onClose={() => setCreditsModalOpen(false)} creditBalances={creditBalances} memberships={memberships} userName={user?.fullName} />
      <OutstandingModal open={outstandingModalOpen} onClose={() => setOutstandingModalOpen(false)} payments={outstandingPayments} />
      <MembershipsModal open={membershipsModalOpen} onClose={() => setMembershipsModalOpen(false)} memberships={clubMemberships} />
      <DiscountCodesModal open={discountCodesModalOpen} onClose={() => setDiscountCodesModalOpen(false)} />
      <PerformanceModal open={performanceModalOpen} onClose={() => setPerformanceModalOpen(false)} matchPerformance={matchPerformance} />
      <CreditHistoryModal open={creditHistoryModalOpen} onClose={() => setCreditHistoryModalOpen(false)} history={creditHistory} />
      <ClubsModal open={clubsModalOpen} onClose={() => setClubsModalOpen(false)} profiles={profiles} sessions={sessionHistory} />
      <TotalSessionsModal open={totalSessionsModalOpen} onClose={() => setTotalSessionsModalOpen(false)} sessions={sessionHistory} />
      <SessionsThisMonthModal open={sessionsThisMonthModalOpen} onClose={() => setSessionsThisMonthModalOpen(false)} sessions={sessionHistory} />
      <TotalSpentModal open={totalSpentModalOpen} onClose={() => setTotalSpentModalOpen(false)} sessions={sessionHistory} />

      {/* Junior Dialogs */}
      <Dialog open={juniorDialogOpen} onOpenChange={(open) => { if (!open) { setJuniorDialogOpen(false); setEditingJunior(null); resetJuniorForm(); } }}>
        <DialogContent className="bg-background" data-testid="dialog-junior-form">
          <DialogHeader><DialogTitle>{editingJunior ? "Edit Junior" : "Add Junior"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="juniorFullName">Full Name *</Label>
              <Input id="juniorFullName" value={juniorForm.fullName} onChange={(e) => setJuniorForm({ ...juniorForm, fullName: e.target.value })} placeholder="Child's full name" data-testid="input-junior-fullname" />
            </div>
            <div>
              <Label htmlFor="juniorDob">Date of Birth</Label>
              <Input id="juniorDob" type="date" value={juniorForm.dateOfBirth} onChange={(e) => setJuniorForm({ ...juniorForm, dateOfBirth: e.target.value })} data-testid="input-junior-dob" />
            </div>
            <div>
              <Label htmlFor="juniorEmergency">Emergency Contact</Label>
              <Input id="juniorEmergency" value={juniorForm.emergencyContact} onChange={(e) => setJuniorForm({ ...juniorForm, emergencyContact: e.target.value })} placeholder="Emergency contact number" data-testid="input-junior-emergency" />
            </div>
            <div>
              <Label htmlFor="juniorMedical">Medical Notes</Label>
              <Textarea id="juniorMedical" value={juniorForm.medicalNotes} onChange={(e) => setJuniorForm({ ...juniorForm, medicalNotes: e.target.value })} placeholder="Any medical conditions or allergies" data-testid="input-junior-medical" />
            </div>
          </div>
          <DialogFooter className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => { setJuniorDialogOpen(false); setEditingJunior(null); resetJuniorForm(); }} data-testid="button-cancel-junior">Cancel</Button>
            <Button onClick={handleSaveJunior} disabled={!juniorForm.fullName.trim() || addJuniorMutation.isPending || editJuniorMutation.isPending} data-testid="button-save-junior">
              {(addJuniorMutation.isPending || editJuniorMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingJunior ? "Save Changes" : "Add Junior"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingJuniorId !== null} onOpenChange={(open) => { if (!open) setDeletingJuniorId(null); }}>
        <AlertDialogContent className="bg-background" data-testid="dialog-delete-junior">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Junior Account?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this junior account.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-junior">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deletingJuniorId) deleteJuniorMutation.mutate(deletingJuniorId); }} disabled={deleteJuniorMutation.isPending} data-testid="button-confirm-delete-junior">
              {deleteJuniorMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}