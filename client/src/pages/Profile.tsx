import { useState, useRef, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import heroMalePath from "@assets/hero_male_player.png";
import heroFemalePath from "@assets/hero_female_player.png";
import badmintonBannerPath from "@assets/generated_images/profile_banner_badminton.png";
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
import AvatarPicker, { getAvatarUrl } from "@/components/AvatarPicker";
import {
  LogOut, User, Settings, Shield, Loader2, XCircle, MapPin, Phone, Calendar,
  AlertCircle, Camera, Wallet, TrendingUp, TrendingDown, History, CreditCard,
  Eye, EyeOff, Users, Plus, Pencil, Trash2, Sun, Moon, Palette, Contrast,
  CircleOff, Zap, Crown, Gem, Trophy, Target, BarChart3, Activity, CalendarDays,
  PoundSterling, ChevronRight, ChevronDown, Star, Clock, Award, Building2, Tag, ExternalLink, Gift, PartyPopper, Lock, Cake, CheckCircle,
  Diamond, Snowflake, Leaf, Rocket, Flame, Sparkles, Cpu, Waves, Sunset, Monitor,
  CircuitBoard, Binary, Radio, Hexagon, Heart, Grid3x3, Mountain, Droplets, TreePine, Gauge, Orbit, Ghost, Copy, ArrowLeft, Ticket, Store, CalendarCheck
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
import PremiumWallet from "@/components/PremiumWallet";

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
                      {info.rewardCredits > 0 && `Reward: \u00A3${(info.rewardCredits / 100).toFixed(2)}`}
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
                      {info.credits > 0 && `Reward: £${(info.credits / 100).toFixed(2)}`}
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
              <div className="text-[10px] text-muted-foreground">Available Rewards</div>
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
                    {reward.credits > 0 && <span>{"\u00A3"}{(reward.credits / 100).toFixed(2)} reward</span>}
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
              const bal = Number(cb.balance);
              const isNeg = bal < 0;
              return (
                <div key={cb.clubId} className="flex items-center justify-between py-3 px-4 rounded-md bg-muted/50" data-testid={`credit-balance-${cb.clubId}`}>
                  <span className="font-medium">{cb.clubName}</span>
                  <span className={`text-lg font-bold ${isNeg ? "text-red-600" : bal > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                    {isNeg ? "-" : ""}£{(Math.abs(bal) / 100).toFixed(2)}
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
              Reward Request Submitted
            </DialogTitle>
            <DialogDescription>
              Your reward has been applied and admins have been notified.
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
      toast({ title: "Sent to admin", description: data.message || "Your club admin will verify and mark the session paid." });
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

function DiscountCodeFullView({ code, clubName, onBack }: { code: any; clubName: string; onBack: () => void }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const isExpired = code.validUntil && new Date(code.validUntil) < new Date();
  const daysLeft = code.validUntil ? Math.max(0, Math.ceil((new Date(code.validUntil).getTime() - Date.now()) / 86400000)) : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code.code).then(() => {
      setCopied(true);
      toast({ title: "Copied!", description: "Discount code copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const barcodeLines = useMemo(() => {
    const lines: number[] = [];
    let seed = code.code.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
    for (let i = 0; i < 60; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      lines.push(1 + (seed % 4));
    }
    return lines;
  }, [code.code]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{
      background: "linear-gradient(160deg, #0f0a2e 0%, #1a1145 25%, #2d1b69 50%, #1e1250 75%, #0c0820 100%)",
    }} data-testid={`discount-fullview-${code.codeId}`}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 60%)" }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 60%)" }} />
        <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] rounded-full" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 60%)" }} />
      </div>

      <div className="relative z-10 flex items-center justify-between p-4 sm:p-6">
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors" data-testid="btn-back-discount">
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-2 text-white/50">
          <Building2 className="h-4 w-4" />
          <span className="text-sm">{clubName}</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-8 overflow-y-auto">
        <div className="w-full max-w-[400px] space-y-6">
          {code.discountPercent && (
            <div className="text-center">
              <div className="inline-flex items-baseline gap-1">
                <span className="text-[80px] sm:text-[100px] font-black leading-none tracking-tighter" style={{
                  background: "linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 4px 20px rgba(245,158,11,0.3))",
                }}>{code.discountPercent}</span>
                <span className="text-3xl sm:text-4xl font-black" style={{
                  background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>% OFF</span>
              </div>
            </div>
          )}

          <div className="rounded-2xl overflow-hidden" style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}>
            <div className="p-6 space-y-5">
              <div className="text-center space-y-2">
                <button
                  onClick={handleCopy}
                  className="group relative inline-flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(251,191,36,0.1) 100%)",
                    border: "1.5px dashed rgba(245,158,11,0.5)",
                  }}
                  data-testid={`btn-copy-code-${code.codeId}`}
                >
                  <span className="font-mono text-2xl sm:text-3xl font-black tracking-[0.15em] text-amber-300">{code.code}</span>
                  {copied ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <Copy className="h-5 w-5 text-amber-400/60 group-hover:text-amber-300 transition-colors" />
                  )}
                </button>
                <p className="text-xs text-white/40">{copied ? "Copied to clipboard!" : "Tap to copy code"}</p>
              </div>

              {code.description && (
                <p className="text-center text-white/70 text-sm leading-relaxed">{code.description}</p>
              )}

              <div className="flex justify-center py-2" data-testid="discount-barcode">
                <svg width="240" height="60" viewBox="0 0 240 60">
                  {barcodeLines.map((w, i) => (
                    <rect key={i} x={i * 4} y="0" width={w} height="50" fill="rgba(255,255,255,0.6)" rx="0.5" />
                  ))}
                  <text x="120" y="58" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7" fontFamily="monospace">{code.code}</text>
                </svg>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 w-full flex justify-between px-0" style={{ transform: "translateY(-50%)" }}>
                <div className="w-5 h-5 rounded-full" style={{ background: "#0f0a2e", marginLeft: "-10px" }} />
                <div className="w-5 h-5 rounded-full" style={{ background: "#0f0a2e", marginRight: "-10px" }} />
              </div>
              <div className="border-t border-dashed border-white/10 mx-5" />
            </div>

            <div className="p-6 space-y-4">
              {code.shopName && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.1))" }}>
                    <Store className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Shop</p>
                    {code.shopUrl ? (
                      <a href={code.shopUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 transition-colors" data-testid={`link-shop-full-${code.codeId}`}>
                        {code.shopName} <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-white">{code.shopName}</p>
                    )}
                  </div>
                </div>
              )}

              {code.validUntil && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{
                    background: isExpired ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
                  }}>
                    <CalendarCheck className={`h-5 w-5 ${isExpired ? "text-red-400" : "text-green-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Valid Until</p>
                    <p className={`text-sm font-semibold ${isExpired ? "text-red-400" : "text-white"}`}>
                      {format(new Date(code.validUntil), "MMMM d, yyyy")}
                    </p>
                  </div>
                  {!isExpired && daysLeft !== null && (
                    <Badge className={`${daysLeft <= 7 ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-green-500/20 text-green-300 border-green-500/30"} border no-default-hover-elevate text-xs`}>
                      {daysLeft}d left
                    </Badge>
                  )}
                </div>
              )}

              {code.shopUrl && (
                <a href={code.shopUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    color: "#fff",
                    boxShadow: "0 8px 24px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                  }}
                  data-testid={`btn-shop-now-${code.codeId}`}
                >
                  <Store className="h-4 w-4" />
                  Shop Now
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          <p className="text-center text-white/30 text-xs">Exclusive member discount from {clubName}</p>
        </div>
      </div>
    </div>
  );
}

function DiscountCodesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: discountData = [], isLoading } = useQuery<{ clubId: number; clubName: string; codes: any[] }[]>({
    queryKey: ["/api/my-discount-codes"],
    enabled: open,
  });
  const [selectedCode, setSelectedCode] = useState<{ code: any; clubName: string } | null>(null);

  if (selectedCode) {
    return <DiscountCodeFullView code={selectedCode.code} clubName={selectedCode.clubName} onBack={() => setSelectedCode(null)} />;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setSelectedCode(null); onClose(); } }}>
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
                      className="rounded-md bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-400 dark:from-amber-700 dark:via-amber-600 dark:to-yellow-500 p-[1px] cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
                      onClick={() => setSelectedCode({ code, clubName: club.clubName })}
                      data-testid={`discount-card-${code.codeId}`}
                    >
                      <div className="rounded-md bg-background/95 dark:bg-background/90 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-sm tracking-wider border-amber-500/30 no-default-hover-elevate">
                            {code.code}
                          </Badge>
                          <div className="flex items-center gap-2">
                            {code.discountPercent && (
                              <Badge className="bg-amber-500 text-white no-default-hover-elevate">{code.discountPercent}% OFF</Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        {code.description && (
                          <p className="text-sm text-muted-foreground">{code.description}</p>
                        )}
                        {code.shopName && (
                          <div className="flex items-center gap-2 text-sm">
                            <Star className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                            <span className="text-muted-foreground">Shop:</span>
                            <span className="font-medium">{code.shopName}</span>
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

function getTransactionTypeLabel(entry: any): { label: string; color: string; bgColor: string } {
  const reason = (entry.reason || "").toLowerCase();
  const isCredit = entry.amount >= 0;

  if (reason.includes("card credit:") || reason.includes("recognition card benefit:")) {
    return { label: "Recognition Benefit", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10" };
  }
  if (reason.includes("session cancellation") || reason.includes("cancelled session")) {
    return { label: "Session Cancellation Credit", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10" };
  }
  if (reason.includes("admin approved") || reason.includes("approved")) {
    return { label: "Admin Approved Credit", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/10" };
  }
  if (reason.includes("used") || reason.includes("applied") || reason.includes("deducted") || reason.includes("redeemed")) {
    return { label: "Credit Used", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-500/10" };
  }
  if (isCredit) {
    return { label: "Credit Issued", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/10" };
  }
  return { label: "Credit Used", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-500/10" };
}

function getReferenceSource(entry: any): string | null {
  if (entry.sessionTitle) return `Session: ${entry.sessionTitle}`;
  if (entry.linkedSessionId) return `Session #${entry.linkedSessionId}`;
  const reason = (entry.reason || "").toLowerCase();
  if (reason.includes("ticket")) return "Support Ticket";
  if (reason.includes("admin")) return "Admin Action";
  return null;
}

function CreditHistoryModal({ open, onClose, history, creditBalances }: {
  open: boolean; onClose: () => void; history: any[] | undefined;
  creditBalances?: { clubId: number; clubName: string; balance: number }[];
}) {
  const { toast } = useToast();
  const totalBalance = (creditBalances || []).reduce((sum, cb) => sum + Number(cb.balance), 0);
  const { data: myWallets } = useQuery<any[]>({ queryKey: ["/api/my-wallets"], enabled: open });
  const [editingWalletId, setEditingWalletId] = useState<number | null>(null);
  const [thresholdInput, setThresholdInput] = useState<string>("");
  const thresholdMutation = useMutation({
    mutationFn: async ({ walletId, lowBalanceThreshold }: { walletId: number; lowBalanceThreshold: number }) => {
      await apiRequest("PATCH", `/api/my-wallets/${walletId}/threshold`, { lowBalanceThreshold });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-wallets"] });
      setEditingWalletId(null);
      toast({ title: "Alert updated", description: "Your low-balance alert threshold has been saved." });
    },
    onError: (e: any) => {
      const msg = String(e?.message || "Failed to update threshold.").replace(/^\d+:\s*/, "");
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" data-testid="modal-credit-history">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Credit Wallet & History
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-4 mb-2" data-testid="credit-wallet-balance-summary">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-emerald-500/15">
              <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Credit Balance</p>
              <p className={`text-2xl font-bold ${totalBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-total-credit-balance">
                {totalBalance < 0 ? "-" : ""}{"\u00A3"}{(Math.abs(totalBalance) / 100).toFixed(2)}
              </p>
            </div>
          </div>
          {creditBalances && creditBalances.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {creditBalances.map(cb => {
                const bal = Number(cb.balance);
                const isNeg = bal < 0;
                return (
                  <Badge key={cb.clubId} variant="outline" className={`text-xs no-default-hover-elevate ${isNeg ? "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400" : ""}`} data-testid={`badge-credit-club-${cb.clubId}`}>
                    {cb.clubName}: {isNeg ? "-" : ""}{"\u00A3"}{(Math.abs(bal) / 100).toFixed(2)}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {myWallets && myWallets.length > 0 && (
          <div className="rounded-lg border bg-card/50 p-3 mb-2" data-testid="section-low-balance-alert">
            <div className="text-xs font-medium mb-2">Low-balance alert</div>
            <p className="text-[11px] text-muted-foreground mb-2">
              Get notified when your wallet drops to or below this amount.
            </p>
            <div className="space-y-2">
              {myWallets.map((w: any) => {
                const isEditing = editingWalletId === w.id;
                const currentPounds = ((w.lowBalanceThreshold ?? 500) / 100).toFixed(2);
                return (
                  <div key={w.id} className="flex items-center gap-2 flex-wrap" data-testid={`row-wallet-threshold-${w.id}`}>
                    <span className="text-xs flex-1 min-w-[120px] truncate">{w.name || "Wallet"}</span>
                    {isEditing ? (
                      <>
                        <span className="text-xs text-muted-foreground">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={thresholdInput}
                          onChange={(e) => setThresholdInput(e.target.value)}
                          className="h-7 w-24 text-xs"
                          data-testid={`input-threshold-${w.id}`}
                        />
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            const val = Math.round(parseFloat(thresholdInput || "0") * 100);
                            if (!isFinite(val) || val < 0) return;
                            thresholdMutation.mutate({ walletId: w.id, lowBalanceThreshold: val });
                          }}
                          disabled={thresholdMutation.isPending}
                          data-testid={`button-save-threshold-${w.id}`}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setEditingWalletId(null)}
                          data-testid={`button-cancel-threshold-${w.id}`}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-semibold" data-testid={`text-threshold-${w.id}`}>£{currentPounds}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setEditingWalletId(w.id);
                            setThresholdInput(currentPounds);
                          }}
                          data-testid={`button-edit-threshold-${w.id}`}
                        >
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!history || history.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No credit transactions yet</p>
            <p className="text-xs text-muted-foreground mt-1">Credits will appear here when issued or used</p>
          </div>
        ) : (
          <div className="space-y-1" data-testid="credit-history-timeline">
            {history.map((entry: any, idx: number) => {
              const isCredit = entry.amount >= 0;
              const typeInfo = getTransactionTypeLabel(entry);
              const refSource = getReferenceSource(entry);
              const showDateSeparator = idx === 0 || format(new Date(entry.createdAt), "MMM yyyy") !== format(new Date(history[idx - 1].createdAt), "MMM yyyy");

              return (
                <div key={entry.id}>
                  {showDateSeparator && (
                    <div className="flex items-center gap-2 py-2 mt-2 first:mt-0">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        {format(new Date(entry.createdAt), "MMMM yyyy")}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors" data-testid={`credit-entry-${entry.id}`}>
                    <div className={`mt-0.5 p-1.5 rounded-md shrink-0 ${isCredit ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                      {isCredit ? (
                        <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 no-default-hover-elevate ${typeInfo.color}`}>
                          {typeInfo.label}
                        </Badge>
                        {entry.source === "reward" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 no-default-hover-elevate border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
                            Reward
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{entry.reason}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 no-default-hover-elevate">
                          <Building2 className="h-2.5 w-2.5 mr-1" />
                          {entry.clubName}
                        </Badge>
                        {refSource && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Tag className="h-2.5 w-2.5" />
                            {refSource}
                          </span>
                        )}
                        {entry.sessionDate && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {format(new Date(entry.sessionDate), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-bold ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} data-testid={`text-credit-amount-${entry.id}`}>
                        {isCredit ? "+" : "-"}{"\u00A3"}{(Math.abs(entry.amount) / 100).toFixed(2)}
                      </p>
                    </div>
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
  const { data: mySquadStatus } = useQuery<any[]>({
    queryKey: ["/api/league/my-squad-status"],
    queryFn: async () => {
      const res = await fetch("/api/league/my-squad-status", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });
  const { data: myAvailability } = useQuery<any[]>({
    queryKey: ["/api/league/my-availability"],
    queryFn: async () => {
      const res = await fetch("/api/league/my-availability", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && (mySquadStatus || []).length > 0,
  });
  const logout = useLogout();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "", nickname: "", phone: "", dateOfBirth: "", city: "", country: "",
    profilePictureUrl: "", gender: "", emergencyContact: "", medicalNotes: "",
    parentGuardianName: "", parentGuardianEmail: "",
    acquisitionSource: "", acquisitionSourceOther: "",
  });
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/user/change-password", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Password Changed", description: data.message });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setChangePwOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message || "Could not change password", variant: "destructive" });
    },
  });

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
    return creditBalances.reduce((sum, cb) => sum + Number(cb.balance), 0);
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
    const u: any = user || {};
    setEditForm({
      fullName: u.fullName || "",
      nickname: u.nickname || "",
      phone: u.phone || "",
      dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toISOString().split("T")[0] : "",
      city: u.city || "",
      country: u.country || "",
      profilePictureUrl: u.profilePictureUrl || "",
      gender: u.gender || "",
      emergencyContact: u.emergencyContact || "",
      medicalNotes: u.medicalNotes || "",
      parentGuardianName: u.parentGuardianName || "",
      parentGuardianEmail: u.parentGuardianEmail || "",
      acquisitionSource: u.acquisitionSource || "",
      acquisitionSourceOther: u.acquisitionSourceOther || "",
    });
    setIsEditing(true);
  };
  const handleSave = () => {
    updateUserProfileMutation.mutate({
      fullName: editForm.fullName,
      nickname: editForm.nickname,
      phone: editForm.phone,
      dateOfBirth: editForm.dateOfBirth || undefined,
      city: editForm.city,
      country: editForm.country,
      profilePictureUrl: editForm.profilePictureUrl ?? "",
      gender: editForm.gender || "",
      emergencyContact: editForm.emergencyContact ?? "",
      medicalNotes: editForm.medicalNotes ?? "",
      parentGuardianName: editForm.parentGuardianName ?? "",
      parentGuardianEmail: editForm.parentGuardianEmail ?? "",
      acquisitionSource: editForm.acquisitionSource || "",
      acquisitionSourceOther: editForm.acquisitionSource === "OTHER" ? (editForm.acquisitionSourceOther ?? "") : "",
    }, {
      onSuccess: () => setIsEditing(false),
    });
  };

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
    <div className="container max-w-5xl mx-auto p-0 sm:p-4 md:p-6 space-y-4 sm:space-y-5">
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

      {/* HERO BANNER */}
      {(() => {
        return (
          <div className="relative rounded-2xl overflow-hidden" data-testid="card-profile-header" style={{ minHeight: "360px" }}>
            <img src={badmintonBannerPath} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
            <div className="absolute inset-0" style={{
              background: "linear-gradient(90deg, rgba(15,12,41,0.85) 0%, rgba(15,12,41,0.55) 45%, rgba(15,12,41,0.2) 75%, rgba(15,12,41,0.1) 100%)",
            }} />
            <div className="absolute inset-0" style={{
              background: "linear-gradient(to top, rgba(15,12,41,0.95) 0%, transparent 45%)",
            }} />

            <div className="relative h-full flex flex-col justify-between p-4 sm:p-6 md:p-8" style={{ minHeight: "360px" }}>
              <div className="flex items-start gap-5 sm:gap-6">
                <div className="relative shrink-0">
                  {(() => {
                    const profilePic = (user as any).profilePictureUrl;
                    const avatarUrl = !profilePic ? getAvatarUrl((user as any).selectedAvatar) : null;
                    if (profilePic) {
                      return (
                        <div className="h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48 rounded-2xl overflow-hidden ring-4 ring-white/25 shadow-[0_0_40px_rgba(0,0,0,0.7)]">
                          <img src={profilePic} alt="Profile" className="w-full h-full object-cover" data-testid="img-profile-picture" />
                        </div>
                      );
                    }
                    return avatarUrl ? (
                      <div className="h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48 rounded-2xl overflow-hidden ring-4 ring-white/25 shadow-[0_0_40px_rgba(0,0,0,0.7)]">
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" data-testid="img-profile-3d-avatar" />
                      </div>
                    ) : (
                      <Avatar className="h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48 rounded-2xl ring-4 ring-white/25 shadow-[0_0_40px_rgba(0,0,0,0.7)]">
                        <AvatarFallback className="text-4xl sm:text-5xl md:text-6xl rounded-2xl bg-indigo-900/60 text-white/90 font-bold">{user.fullName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                    );
                  })()}
                  <div className="absolute -bottom-2 -right-2 flex gap-1">
                    <AvatarPicker
                      currentAvatar={(user as any).selectedAvatar}
                      trigger={
                        <button className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full p-1.5 shadow-lg" data-testid="button-open-avatar-picker-profile">
                          <Sparkles className="w-3 h-3" />
                        </button>
                      }
                    />
                    <button className="bg-black/50 backdrop-blur text-white rounded-full p-2 shadow-lg border border-white/15 hover:bg-black/70 transition" onClick={() => profilePicInputRef.current?.click()} disabled={isUploadingPic} data-testid="button-upload-profile-pic">
                      {isUploadingPic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    </button>
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={profilePicInputRef}
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) { uploadProfilePicture({ file }); e.target.value = ""; } }} data-testid="input-profile-pic" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" data-testid="text-user-name">{user.fullName || "New User"}</h1>
                    {(user as any).blackCardAccess && (
                      <Crown className="h-6 w-6 text-amber-400 shrink-0 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" data-testid="icon-black-card-holder" />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
                    <Badge className="bg-white/10 text-white/90 border border-white/20 backdrop-blur-sm hover:bg-white/20" data-testid="badge-role">
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role === "OWNER" ? "Platform Owner" : user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                    </Badge>
                    {primaryProfile?.grade && (
                      <Badge className="bg-amber-500/20 text-amber-200 border border-amber-400/30 backdrop-blur-sm hover:bg-amber-500/30" data-testid="badge-grade">
                        <Award className="h-3 w-3 mr-1" />
                        Grade {primaryProfile.grade}
                      </Badge>
                    )}
                    {mySquadStatus && mySquadStatus.length > 0 && (
                      <Badge className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 backdrop-blur-sm hover:bg-emerald-500/30" data-testid="badge-league-player">
                        <Trophy className="h-3 w-3 mr-1" />
                        League Player
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-white/50 flex-wrap">
                    {(user as any)?.email && (
                      <span data-testid="text-email">{user.email}</span>
                    )}
                    {(user as any)?.city && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{(user as any).city}{(user as any).country ? `, ${(user as any).country}` : ""}</span>
                    )}
                  </div>
                  {profiles && profiles.length > 0 && (
                    <Badge className="text-xs cursor-pointer mt-2 bg-white/5 text-white/70 border border-white/10 hover:bg-white/10" onClick={() => setClubsModalOpen(true)} data-testid="badge-clubs-count">
                      <Building2 className="h-3 w-3 mr-1" />
                      {profiles.length} Club{profiles.length !== 1 ? "s" : ""}
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button size="sm" className="bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-sm" onClick={startEditing} data-testid="button-edit-profile">
                    <Pencil className="h-3.5 w-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button size="sm" className="bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 backdrop-blur-sm" onClick={handleLogout} data-testid="button-logout">
                    <LogOut className="h-3.5 w-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </div>
              </div>

              {mySquadStatus && mySquadStatus.length > 0 && (
                <div className="hidden md:flex flex-col items-center justify-center absolute top-4 right-4 md:top-6 md:right-6" data-testid="league-player-emblem">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-teal-500/20 animate-pulse" />
                    <div className="absolute inset-1 rounded-full border-2 border-emerald-400/40 border-dashed" style={{ animation: "spin 12s linear infinite" }} />
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                      <svg viewBox="0 0 40 40" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 4L24 14H36L26 21L30 32L20 25L10 32L14 21L4 14H16L20 4Z" fill="currentColor" opacity="0.3" />
                        <path d="M20 4L24 14H36L26 21L30 32L20 25L10 32L14 21L4 14H16L20 4Z" />
                        <circle cx="20" cy="19" r="5" fill="currentColor" opacity="0.5" />
                        <path d="M17 19L19 21L23 17" strokeWidth="1.5" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-400 mt-0.5">League</span>
                </div>
              )}

              <div className="mt-auto pt-4">
                <div className="grid grid-cols-4 gap-3 sm:gap-8 max-w-md">
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">{performance.played}</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Matches</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">{performance.won}</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Won</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-rose-400 drop-shadow-[0_0_10px_rgba(251,113,133,0.3)]">{performance.lost}</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Lost</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-indigo-300 drop-shadow-[0_0_10px_rgba(165,180,252,0.3)]">{performance.winPct}%</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Win Rate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {mySquadStatus && mySquadStatus.length > 0 && (
        <Card data-testid="card-league-squad-status">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold">League Squad Player</h3>
                <p className="text-[11px] text-muted-foreground">Representing your club in competitive league matches</p>
              </div>
            </div>
            <div className="space-y-2">
              {mySquadStatus.map((sq: any) => (
                <div key={sq.id} className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-2.5" data-testid={`league-squad-club-${sq.clubId}`}>
                  <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-sm font-semibold flex-1">{sq.clubName}</span>
                  {sq.formatPreference && (
                    <Badge variant="outline" className="text-[10px] border-emerald-300 dark:border-emerald-700">
                      {sq.formatPreference.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            {(() => {
              const allPolls = myAvailability || [];
              const pendingPolls = allPolls.filter((a: any) => a.status === "PENDING");
              if (pendingPolls.length === 0) return null;
              return (
                <div className="mt-4 pt-3 border-t border-emerald-500/15" data-testid="league-polls-section">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                      <Activity className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold">Match Availability Polls</p>
                      <p className="text-[10px] text-muted-foreground">{pendingPolls.length} awaiting response</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3" /> Action Required
                    </p>
                    <div className="space-y-2">
                      {pendingPolls.map((poll: any) => (
                        <Link key={poll.id} href="/league">
                          <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 cursor-pointer hover:bg-amber-500/10 transition-colors" data-testid={`pending-poll-${poll.matchId}`}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {poll.clubName} vs {poll.opponentClub}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(poll.matchDatetime), "EEE, MMM d")}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(poll.matchDatetime), "h:mm a")}
                                </span>
                                {poll.venue && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate max-w-[100px]">{poll.venue}</span>
                                  </span>
                                )}
                              </div>
                              {poll.leagueName && <p className="text-[9px] text-muted-foreground mt-0.5">{poll.leagueName}</p>}
                            </div>
                            <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-300 border-0 text-[10px] shrink-0 animate-pulse">
                              Respond
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

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

      {/* STATS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <MetricCard icon={Wallet} label="Credit Balance" value={`£${(Math.max(0, totalCredits) / 100).toFixed(2)}`}
          subtext={creditBalances && creditBalances.length > 0 ? `Across ${creditBalances.length} club${creditBalances.length > 1 ? "s" : ""}` : "No credits yet"}
          onClick={() => setCreditsModalOpen(true)} />
        <MetricCard icon={AlertCircle} label="Outstanding" value={`£${(totalOutstanding / 100).toFixed(2)}`}
          subtext={outstandingPayments && outstandingPayments.length > 0 ? `${outstandingPayments.length} unpaid` : "All clear"}
          onClick={() => setOutstandingModalOpen(true)}
          className={totalOutstanding > 0 ? "border-amber-300/50 dark:border-amber-700/50" : ""} />
        <MetricCard icon={CalendarDays} label="Sessions" value={`${sessionActivity?.totalSessions ?? 0}`}
          subtext={`${sessionActivity?.sessionsThisMonth ?? 0} this month`}
          onClick={() => setTotalSessionsModalOpen(true)} />
        <MetricCard icon={PoundSterling} label="Total Spent" value={`£${((sessionActivity?.totalSpent ?? 0) / 100).toFixed(2)}`}
          subtext="All time"
          onClick={() => setTotalSpentModalOpen(true)} />
      </div>

      {/* MAIN DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

      {/* LEFT COLUMN */}
      <div className="lg:col-span-7 space-y-4">

      {/* My Rewards */}
      <ProfileRewardsSection />

      {/* Recognition Cards */}
      <PremiumWallet />

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

      </div>{/* END LEFT COLUMN */}

      {/* RIGHT COLUMN */}
      <div className="lg:col-span-5 space-y-4">

      {/* Credit Wallet & History */}
      <CollapsibleSection
        title="Credit Wallet"
        icon={Wallet}
        iconColor="text-emerald-500"
        badge={totalCredits !== 0 ? `\u00A3${(totalCredits / 100).toFixed(2)}` : undefined}
        defaultOpen={totalCredits !== 0 || (creditHistory && creditHistory.length > 0)}
        testId="card-credit-wallet"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-4" data-testid="credit-balance-display">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-md bg-emerald-500/15">
                <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Credit Balance</p>
                <p className={`text-2xl font-bold ${totalCredits >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-credit-balance-prominent">
                  {totalCredits < 0 ? "-" : ""}{"\u00A3"}{(Math.abs(totalCredits) / 100).toFixed(2)}
                </p>
              </div>
            </div>
            {creditBalances && creditBalances.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {creditBalances.map(cb => {
                  const bal = Number(cb.balance);
                  const isNeg = bal < 0;
                  return (
                    <Badge key={cb.clubId} variant="outline" className={`text-xs no-default-hover-elevate ${isNeg ? "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400" : ""}`} data-testid={`badge-club-credit-${cb.clubId}`}>
                      {cb.clubName}: {isNeg ? "-" : ""}{"\u00A3"}{(Math.abs(bal) / 100).toFixed(2)}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {creditHistory && creditHistory.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Recent Transactions</p>
                <Badge variant="secondary" className="text-[10px] no-default-hover-elevate">{creditHistory.length}</Badge>
              </div>
              {creditHistory.slice(0, 3).map((entry: any) => {
                const isCredit = entry.amount >= 0;
                const typeInfo = getTransactionTypeLabel(entry);
                return (
                  <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-md bg-muted/30" data-testid={`recent-credit-${entry.id}`}>
                    <div className={`p-1 rounded-md shrink-0 ${isCredit ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                      {isCredit ? (
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                        <span className="text-[10px] text-muted-foreground">{entry.clubName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{entry.reason}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-bold ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {isCredit ? "+" : "-"}{"\u00A3"}{(Math.abs(entry.amount) / 100).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(entry.createdAt), "MMM d")}</p>
                    </div>
                  </div>
                );
              })}
              {creditHistory.length > 3 && (
                <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setCreditHistoryModalOpen(true)} data-testid="button-view-all-credit-history">
                  View All {creditHistory.length} Transactions
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {creditHistory.length <= 3 && (
                <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setCreditHistoryModalOpen(true)} data-testid="button-view-full-credit-history">
                  View Full History
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          )}

          {(!creditHistory || creditHistory.length === 0) && totalCredits === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <Wallet className="h-6 w-6 mx-auto mb-2 opacity-40" />
              <p>No credit history yet</p>
              <p className="text-xs mt-1">Credits will appear here when issued or used</p>
            </div>
          )}
        </div>
      </CollapsibleSection>

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

      </div>{/* END RIGHT COLUMN */}
      </div>{/* END MAIN DASHBOARD GRID */}

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
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">1 free session reward</span>
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

      {profiles && profiles.length > 0 && (
        <CollapsibleSection title="Player Insurance" icon={Shield} testId="card-player-insurance">
          <BadmintonEnglandSection user={user} />
        </CollapsibleSection>
      )}

      {/* Account Settings */}
      <CollapsibleSection title="Account Settings" icon={Settings} testId="card-account-settings">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Full Name</Label>
              <p className="font-medium text-sm" data-testid="text-fullname">{user?.fullName || "Not set"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
              <p className="font-medium text-sm" data-testid="text-phone">{(user as any)?.phone || "Not set"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Date of Birth</Label>
              <p className="font-medium text-sm" data-testid="text-dob">{(user as any)?.dateOfBirth ? new Date((user as any).dateOfBirth).toLocaleDateString() : "Not set"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Location</Label>
              <p className="font-medium text-sm" data-testid="text-location">
                {[((user as any)?.city), ((user as any)?.country)].filter(Boolean).join(", ") || "Not set"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={startEditing} data-testid="button-edit-profile-settings">
            <Pencil className="h-4 w-4 mr-1" />
            Edit Profile
          </Button>
        </div>
      </CollapsibleSection>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditing} onOpenChange={(open) => { if (!open) setIsEditing(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-profile">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" /> Edit profile</DialogTitle>
            <DialogDescription>Update the details you entered when you registered. Changes save instantly.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Profile picture preview + URL field */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-xl overflow-hidden ring-2 ring-border bg-muted flex items-center justify-center shrink-0">
                {editForm.profilePictureUrl ? (
                  <img
                    src={editForm.profilePictureUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    data-testid="img-edit-profile-preview"
                  />
                ) : (
                  <User className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="profilePictureUrl" className="text-xs">Profile picture URL</Label>
                <Input
                  id="profilePictureUrl"
                  value={editForm.profilePictureUrl}
                  onChange={(e) => setEditForm({ ...editForm, profilePictureUrl: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                  data-testid="input-profile-picture-url"
                />
                <p className="text-[11px] text-muted-foreground">Paste any image URL, or use the camera button on your profile to upload one.</p>
                {editForm.profilePictureUrl && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditForm({ ...editForm, profilePictureUrl: "" })} data-testid="button-clear-profile-pic">
                    <Trash2 className="h-3 w-3 mr-1" /> Remove picture
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="fullName">Full name *</Label>
              <Input id="fullName" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} placeholder="Your full name" data-testid="input-fullname" />
            </div>

            <div>
              <Label htmlFor="nickname">Nickname / display name</Label>
              <Input id="nickname" value={editForm.nickname} onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })} placeholder="Optional" data-testid="input-nickname-edit" />
            </div>

            <div>
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Your phone number" data-testid="input-phone" />
            </div>

            <div>
              <Label htmlFor="dateOfBirth">Date of birth {(user as any)?.dateOfBirth && (user as any)?.role === 'PLAYER' ? "(locked)" : ""}</Label>
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

            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select value={editForm.gender || "UNSET"} onValueChange={(v) => setEditForm({ ...editForm, gender: v === "UNSET" ? "" : v })}>
                <SelectTrigger id="gender" data-testid="select-gender"><SelectValue placeholder="Prefer not to say" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNSET">Not set</SelectItem>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                  <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} placeholder="Your city" data-testid="input-city" />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} placeholder="Your country" data-testid="input-country" />
              </div>
            </div>

            <div>
              <Label htmlFor="emergencyContact">Emergency contact</Label>
              <Input id="emergencyContact" value={editForm.emergencyContact} onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })} placeholder="Name + phone of someone we can call" data-testid="input-emergency-contact" />
            </div>

            <div>
              <Label htmlFor="medicalNotes">Medical notes</Label>
              <Textarea id="medicalNotes" value={editForm.medicalNotes} onChange={(e) => setEditForm({ ...editForm, medicalNotes: e.target.value })} placeholder="Allergies, conditions, anything we should know" rows={2} data-testid="input-medical-notes" />
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
              <div className="text-xs font-medium text-muted-foreground">Parent / Guardian (juniors only)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="parentGuardianName" className="text-xs">Name</Label>
                  <Input id="parentGuardianName" value={editForm.parentGuardianName} onChange={(e) => setEditForm({ ...editForm, parentGuardianName: e.target.value })} placeholder="Guardian name" data-testid="input-parent-name" />
                </div>
                <div>
                  <Label htmlFor="parentGuardianEmail" className="text-xs">Email</Label>
                  <Input id="parentGuardianEmail" type="email" value={editForm.parentGuardianEmail} onChange={(e) => setEditForm({ ...editForm, parentGuardianEmail: e.target.value })} placeholder="guardian@email.com" data-testid="input-parent-email" />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="acquisitionSource">How did you hear about us?</Label>
              <Select value={editForm.acquisitionSource || "UNSET"} onValueChange={(v) => setEditForm({ ...editForm, acquisitionSource: v === "UNSET" ? "" : v })}>
                <SelectTrigger id="acquisitionSource" data-testid="select-acquisition-source-edit"><SelectValue placeholder="Please select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNSET">Not set</SelectItem>
                  <SelectItem value="FACEBOOK">Facebook</SelectItem>
                  <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                  <SelectItem value="TIKTOK">TikTok</SelectItem>
                  <SelectItem value="WEBSITE">Website</SelectItem>
                  <SelectItem value="WORD_OF_MOUTH">Word of mouth</SelectItem>
                  <SelectItem value="LEISURE_CENTRE">Leisure centre</SelectItem>
                  <SelectItem value="SAW_SESSION">Saw a session running</SelectItem>
                  <SelectItem value="THROUGH_COACH">Through a coach</SelectItem>
                  <SelectItem value="REFERRAL">Referral link / code</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              {editForm.acquisitionSource === "OTHER" && (
                <Textarea
                  className="mt-2"
                  value={editForm.acquisitionSourceOther}
                  onChange={(e) => setEditForm({ ...editForm, acquisitionSourceOther: e.target.value })}
                  placeholder="Tell us more..."
                  rows={2}
                  data-testid="input-acquisition-other-edit"
                />
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">Cancel</Button>
            <Button onClick={handleSave} disabled={updateUserProfileMutation.isPending || !editForm.fullName.trim()} data-testid="button-save-profile">
              {updateUserProfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password */}
      <CollapsibleSection title="Change Password" icon={Lock} testId="card-change-password">
        <div className="space-y-4">
          {!changePwOpen ? (
            <div>
              <p className="text-sm text-muted-foreground mb-3">Update your account password. You'll need to enter your current password first.</p>
              <Button variant="outline" size="sm" onClick={() => setChangePwOpen(true)} data-testid="button-open-change-password">
                <Lock className="h-4 w-4 mr-1" />
                Change Password
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPw ? "text" : "password"}
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="pr-10"
                    data-testid="input-current-password"
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 hover:bg-transparent" onClick={() => setShowCurrentPw(!showCurrentPw)} data-testid="button-toggle-current-pw">
                    {showCurrentPw ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPw ? "text" : "password"}
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    placeholder="Min 6 characters"
                    className="pr-10"
                    data-testid="input-new-password"
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 hover:bg-transparent" onClick={() => setShowNewPw(!showNewPw)} data-testid="button-toggle-new-pw">
                    {showNewPw ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <Input
                  id="confirmNewPassword"
                  type={showNewPw ? "text" : "password"}
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  data-testid="input-confirm-new-password"
                />
                {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                  <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => changePasswordMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })}
                  disabled={changePasswordMutation.isPending || pwForm.newPassword.length < 6 || pwForm.newPassword !== pwForm.confirmPassword || !pwForm.currentPassword}
                  data-testid="button-save-password"
                >
                  {changePasswordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Update Password
                </Button>
                <Button variant="outline" onClick={() => { setChangePwOpen(false); setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); }} data-testid="button-cancel-password">
                  Cancel
                </Button>
              </div>
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
      <CreditHistoryModal open={creditHistoryModalOpen} onClose={() => setCreditHistoryModalOpen(false)} history={creditHistory} creditBalances={creditBalances} />
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