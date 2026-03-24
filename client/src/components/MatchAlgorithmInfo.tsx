import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, Shuffle, Zap, Users, Target, Shield, Scale, ArrowRight, Swords, Heart, Crown, RotateCcw, Gauge } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function MatchAlgorithmInfoButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" data-testid="button-match-algorithm-info">
          <Info className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg" data-testid="title-match-algorithm-info">
            <Shuffle className="w-5 h-5 text-primary" />
            Smart Match Engine — Complete Algorithm
          </DialogTitle>
          <DialogDescription>
            Full technical breakdown of how the match engine generates fair, balanced matches
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="overview" className="w-full" data-testid="content-match-algorithm-info">
          <TabsList className="w-full grid grid-cols-5 h-auto">
            <TabsTrigger value="overview" className="text-xs py-1.5">Overview</TabsTrigger>
            <TabsTrigger value="scoring" className="text-xs py-1.5">Scoring</TabsTrigger>
            <TabsTrigger value="modes" className="text-xs py-1.5">Modes</TabsTrigger>
            <TabsTrigger value="gender" className="text-xs py-1.5">Gender</TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs py-1.5">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 text-sm mt-4">
            <section>
              <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Core Algorithm
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                The Smart Match Engine is a deterministic, score-based algorithm. It generates every possible player combination, scores each one against multiple fairness factors, and selects the highest-scoring option. The same inputs always produce the same results — no randomness involved.
              </p>
            </section>

            <section>
              <h4 className="font-semibold text-foreground mb-1.5">How It Works (Step by Step)</h4>
              <div className="space-y-2">
                {[
                  { step: "1", title: "Filter Players", desc: "Remove paused players. Apply gender filter (Mixed/Female Only/Male Only). Validate minimum player count (2 for singles, 4 for doubles)." },
                  { step: "2", title: "Fairness Pre-Filter", desc: "Players who have played fewer matches are prioritised. Those with the most games are temporarily excluded from the candidate pool to give under-played players priority." },
                  { step: "3", title: "Generate Candidates", desc: "All valid player combinations are generated deterministically. For doubles, up to 120 candidates are created. Players are sorted by grade (highest first), then by ID for tiebreaking." },
                  { step: "4", title: "Score Each Candidate", desc: "Every candidate match is scored using weighted factors: equal playing time, partner variety, opponent variety, grade balance, gender balance, and priority players." },
                  { step: "5", title: "Select Best Match", desc: "The highest-scoring candidate wins. If scores are tied, a deterministic tiebreaker selects the match with the lowest sum of player IDs." },
                  { step: "6", title: "Assign & Track", desc: "Selected players are atomically marked as ASSIGNED (preventing double-assignment). Pairing/opponent/count maps are updated. The process repeats for the next match slot." },
                  { step: "7", title: "Validate", desc: "Post-generation validation ensures no player appears in multiple matches and all state transitions are consistent." },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex gap-3 rounded-lg border p-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{step}</div>
                    <div>
                      <p className="font-medium text-foreground text-xs">{title}</p>
                      <p className="text-muted-foreground text-xs leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-primary" />
                Player Grades (9-Tier System)
              </h4>
              <p className="text-muted-foreground leading-relaxed mb-2">
                Every player has a grade reflecting their skill level. The 9-tier system maps to numerical ranks used in scoring:
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { grade: "A1", rank: 9, desc: "Elite", color: "text-amber-500" },
                  { grade: "A2", rank: 8, desc: "Advanced+", color: "text-amber-500" },
                  { grade: "A3", rank: 7, desc: "Advanced", color: "text-amber-500" },
                  { grade: "B1", rank: 6, desc: "Intermediate+", color: "text-blue-500" },
                  { grade: "B2", rank: 5, desc: "Intermediate", color: "text-blue-500" },
                  { grade: "B3", rank: 4, desc: "Intermediate-", color: "text-blue-500" },
                  { grade: "C1", rank: 3, desc: "Developing+", color: "text-emerald-500" },
                  { grade: "C2", rank: 2, desc: "Developing", color: "text-emerald-500" },
                  { grade: "C3", rank: 1, desc: "Beginner", color: "text-emerald-500" },
                ].map(({ grade, rank, desc, color }) => (
                  <div key={grade} className="flex items-center gap-2 rounded border px-2.5 py-1.5">
                    <Badge variant="secondary" className={`text-xs font-mono ${color}`}>{grade}</Badge>
                    <span className="text-muted-foreground text-xs">{desc}</span>
                    <span className="text-muted-foreground/50 text-[10px] ml-auto">Rank {rank}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 rounded border p-2 bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  <strong>Classification:</strong> Ranks 6-9 (B1-A1) = "Strong/High Grade" · Ranks 1-2 (C3-C2) = "Weak" · Ranks 1-4 (C3-B3) = "Low Grade" · Ranks 5-9 (B2-A1) = "High Grade"
                </p>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="scoring" className="space-y-4 text-sm mt-4">
            <section>
              <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                Scoring Weights (All Factors)
              </h4>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Each candidate match receives a score. Higher is better. Here are all the factors and their exact weights:
              </p>

              <div className="space-y-3">
                <div className="rounded-lg border p-3 bg-red-500/5 border-red-500/20">
                  <p className="font-medium text-foreground mb-1 text-xs flex items-center gap-1.5">
                    <Badge variant="destructive" className="text-[10px] px-1.5">HIGHEST</Badge>
                    Equal Playing Time (Match Count Deficit)
                  </p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p><strong>-100 points</strong> per game deficit from global minimum (per player)</p>
                    <p><strong>-20 points</strong> per total games played (per player)</p>
                    <p><strong>-80 points</strong> per spread between most and least played in a match</p>
                    <p className="text-foreground/70 mt-1">This is the strongest factor. A player with 0 games will always be chosen over a player with 2 games, regardless of other factors.</p>
                  </div>
                </div>

                <div className="rounded-lg border p-3 bg-amber-500/5 border-amber-500/20">
                  <p className="font-medium text-foreground mb-1 text-xs flex items-center gap-1.5">
                    <Badge className="text-[10px] px-1.5 bg-amber-500">HIGH</Badge>
                    Priority Players (Queue Waiting)
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <p><strong>+200 points</strong> per priority player in the match</p>
                    <p className="text-foreground/70 mt-1">Players who have been waiting the longest get priority status, ensuring they get on court sooner.</p>
                  </div>
                </div>

                <div className="rounded-lg border p-3 bg-blue-500/5 border-blue-500/20">
                  <p className="font-medium text-foreground mb-1 text-xs flex items-center gap-1.5">
                    <Badge className="text-[10px] px-1.5 bg-blue-500">GRADE</Badge>
                    Grade/Skill Balance
                  </p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p><strong>+50 points</strong> if grade spread across all players ≤ 2 tiers</p>
                    <p><strong>+30 bonus</strong> if all players are the exact same grade</p>
                    <p><strong>-25 points</strong> per tier of spread beyond 2 (wide gap penalty)</p>
                    <p><strong>+40 points</strong> for high-level quality match (avg grade ≥ 6, spread ≤ 2)</p>
                    <p><strong>+20 points</strong> for mid-level quality match (avg grade ≥ 4, spread ≤ 2)</p>
                    <p className="text-foreground/70 mt-1">In Competitive mode, additional: <strong>-15 per grade diff</strong> between team averages, <strong>+35</strong> if all same category (A/B/C), <strong>+30</strong> if all high-ranked.</p>
                  </div>
                </div>

                <div className="rounded-lg border p-3 bg-purple-500/5 border-purple-500/20">
                  <p className="font-medium text-foreground mb-1 text-xs flex items-center gap-1.5">
                    <Badge className="text-[10px] px-1.5 bg-purple-500">VARIETY</Badge>
                    Partner & Opponent Variety
                  </p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p><strong>-10 points</strong> per repeated partner pairing (×repeat count)</p>
                    <p><strong>-8 points</strong> per repeated opponent matchup (×repeat count)</p>
                    <p className="text-foreground/70 mt-1">Tracked across the entire session. Fixed pairs are exempt from the partner repeat penalty.</p>
                  </div>
                </div>

                <div className="rounded-lg border p-3 bg-green-500/5 border-green-500/20">
                  <p className="font-medium text-foreground mb-1 text-xs flex items-center gap-1.5">
                    <Badge className="text-[10px] px-1.5 bg-green-500">GENDER</Badge>
                    Gender-Aware Scoring (Social/Mixed)
                  </p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p><strong>+12 points</strong> when a strong male (rank ≥ 6) is paired with a female</p>
                    <p><strong>-8 points</strong> when a weak male (rank ≤ 2) is paired with a non-weak female</p>
                    <p><strong>+15 points</strong> if both teams have 2+ females</p>
                    <p><strong>+5 points</strong> if both teams have at least 1 female</p>
                    <p><strong>+30 points</strong> for mixed-slot preference when filling mixed quota</p>
                    <p><strong>-25 points</strong> per repeated male usage in mixed matches (rotation penalty)</p>
                  </div>
                </div>

                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="font-medium text-foreground mb-1 text-xs flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] px-1.5">TIEBREAK</Badge>
                    Deterministic Tiebreaker
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <p>When two candidates have equal scores: the match with the <strong>lowest sum of player IDs</strong> wins. If sums are equal, the match with the <strong>lowest minimum player ID</strong> wins. This ensures completely deterministic, reproducible results.</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-foreground mb-1.5">Scoring Example</h4>
              <div className="rounded-lg border p-3 bg-muted/20">
                <p className="text-xs text-muted-foreground mb-2">
                  Match candidate: Players A(B1, 0 games), B(B2, 0 games) vs C(B3, 1 game), D(A3, 0 games)
                </p>
                <div className="text-xs space-y-0.5 font-mono text-muted-foreground">
                  <p>Equal time: -(0+0+1+0)×20 = <span className="text-red-400">-20</span></p>
                  <p>Deficit C: -(1-0)×100 = <span className="text-red-400">-100</span></p>
                  <p>Spread(1): -1×80 = <span className="text-red-400">-80</span></p>
                  <p>Grade spread(2): <span className="text-green-400">+50</span></p>
                  <p>High-level quality (avg 5.5, spread ≤2): <span className="text-green-400">+20</span></p>
                  <p>No repeats: <span className="text-muted-foreground/50">0</span></p>
                  <p className="border-t pt-1 mt-1 font-bold text-foreground">Total: -130</p>
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="modes" className="space-y-4 text-sm mt-4">
            <section>
              <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" />
                Social Mode
              </h4>
              <div className="space-y-2">
                <div className="rounded-lg border p-3">
                  <p className="font-medium text-foreground mb-1 text-xs">Social Doubles</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Uses the full scoring system described in the Scoring tab</li>
                    <li>Maximises partner and opponent variety so everyone plays with different people</li>
                    <li>Grade balance is considered but not as strongly as competitive mode</li>
                    <li>Gender-aware scoring is active in Mixed mode: bonuses for balanced gender teams</li>
                    <li>Female quota system auto-allocates dedicated female-only match slots when enough females present (4+ females and 2+ males)</li>
                    <li>Blocks gender-unfair doubles (e.g. 2 females vs 2 males) in Mixed mode</li>
                  </ul>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="font-medium text-foreground mb-1 text-xs">Social Singles</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Simplified scoring: equal playing time + opponent variety + priority players</li>
                    <li>No grade restrictions — any skill level can play any other</li>
                    <li>Opponent repeat penalty: -10 per repeat</li>
                    <li>Focuses on giving everyone games with different opponents</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
                <Swords className="w-4 h-4 text-primary" />
                Competitive Mode
              </h4>
              <div className="space-y-2">
                <div className="rounded-lg border p-3">
                  <p className="font-medium text-foreground mb-1 text-xs">Competitive Doubles</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>All social scoring factors PLUS additional competitive-specific scoring:</li>
                    <li><strong>Team balance penalty:</strong> -15 per grade difference between team averages</li>
                    <li><strong>Same category bonus:</strong> +35 if all 4 players are from the same category (A/B/C)</li>
                    <li><strong>Teams same category:</strong> +15 if each team is within the same category</li>
                    <li><strong>All high-ranked:</strong> +30 if all 4 players are rank 6+ (B1-A1)</li>
                    <li><strong>Mostly high-ranked:</strong> +8 if 3 of 4 players are rank 6+</li>
                    <li>Gender quota system still active in Mixed mode</li>
                  </ul>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="font-medium text-foreground mb-1 text-xs">Competitive Singles</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li><strong>Hard filter:</strong> Players more than 4 grade tiers apart are never matched</li>
                    <li>Tight grade match (diff ≤ 2): +50 points (+30 bonus if same grade)</li>
                    <li>Wide grade gap: -25 per tier beyond 2</li>
                    <li>Grade balance penalty: -15 per tier of difference</li>
                    <li>Same category bonus: +25</li>
                    <li>High-level quality (both rank 6+, diff ≤ 2): +40</li>
                    <li>Mid-level quality (both rank 4+, diff ≤ 2): +20</li>
                    <li>Ensures closely matched, competitive games</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-foreground mb-1.5">Mode Comparison</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1.5 text-muted-foreground font-medium">Factor</th>
                      <th className="text-center py-1.5 text-muted-foreground font-medium">Social</th>
                      <th className="text-center py-1.5 text-muted-foreground font-medium">Competitive</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-1">Equal playing time</td><td className="text-center">✅ Strong</td><td className="text-center">✅ Strong</td></tr>
                    <tr className="border-b"><td className="py-1">Partner variety</td><td className="text-center">✅ Active</td><td className="text-center">✅ Active</td></tr>
                    <tr className="border-b"><td className="py-1">Opponent variety</td><td className="text-center">✅ Active</td><td className="text-center">✅ Active</td></tr>
                    <tr className="border-b"><td className="py-1">Grade balance</td><td className="text-center">⚡ Moderate</td><td className="text-center">🔥 Strong</td></tr>
                    <tr className="border-b"><td className="py-1">Team balance penalty</td><td className="text-center">—</td><td className="text-center">✅ -15/tier</td></tr>
                    <tr className="border-b"><td className="py-1">Category matching</td><td className="text-center">—</td><td className="text-center">✅ +35/+15</td></tr>
                    <tr className="border-b"><td className="py-1">Grade hard filter (singles)</td><td className="text-center">—</td><td className="text-center">✅ Max 4 tiers</td></tr>
                    <tr className="border-b"><td className="py-1">Gender-aware pairing</td><td className="text-center">✅ Active</td><td className="text-center">✅ Active</td></tr>
                    <tr><td className="py-1">Priority players</td><td className="text-center">✅ +200</td><td className="text-center">✅ +200</td></tr>
                  </tbody>
                </table>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="gender" className="space-y-4 text-sm mt-4">
            <section>
              <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Gender-Aware Match Logic
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                The engine has sophisticated gender awareness to create fair, enjoyable matches for all players. Gender can be overridden per player for flexibility.
              </p>
            </section>

            <section>
              <h4 className="font-semibold text-foreground mb-1.5">Gender Filter Options</h4>
              <div className="space-y-2">
                <div className="rounded-lg border p-3">
                  <p className="font-medium text-foreground text-xs">Mixed (Default)</p>
                  <p className="text-xs text-muted-foreground">Any combination of genders. Additional scoring factors encourage balanced gender distribution across teams.</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="font-medium text-foreground text-xs">Female Only</p>
                  <p className="text-xs text-muted-foreground">Only players with gender "FEMALE" (or overridden to FEMALE) are included.</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="font-medium text-foreground text-xs">Male Only</p>
                  <p className="text-xs text-muted-foreground">Only players with gender other than "FEMALE" are included.</p>
                </div>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-foreground mb-1.5">Female Quota System (Doubles, Mixed)</h4>
              <p className="text-muted-foreground leading-relaxed text-xs mb-2">
                When there are 4+ available females and 2+ available males, the engine activates a female quota system:
              </p>
              <div className="rounded-lg border p-3 space-y-1.5 text-xs text-muted-foreground">
                <p><strong>1.</strong> Calculates maximum possible all-female matches: floor(females / 4)</p>
                <p><strong>2.</strong> Allocates up to 80% of queue target as female-only slots</p>
                <p><strong>3.</strong> Remaining slots are filled with mixed-gender matches</p>
                <p><strong>4.</strong> Mixed slots rotate which males participate (penalty for reusing same males: -25 per repeat)</p>
                <p><strong>5.</strong> If not enough females for female-only slot, falls back to mixed</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-foreground mb-1.5">Gender Unfairness Block</h4>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  In Mixed doubles, the engine blocks "gender-unfair" combinations: 2 females vs 2 males is rejected. This ensures every Mixed doubles match has gender variety on at least one side, preventing lopsided matchups.
                </p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-foreground mb-1.5">Gender + Grade Interaction</h4>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex gap-2 items-start">
                  <ArrowRight className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Strong male (B1-A1) paired with a female gets <strong>+12 bonus</strong> — this creates balanced mixed pairings where the stronger male supports the female player</span>
                </div>
                <div className="flex gap-2 items-start">
                  <ArrowRight className="w-3 h-3 mt-0.5 text-red-500 flex-shrink-0" />
                  <span>Weak male (C3-C2) paired with a non-weak female gets <strong>-8 penalty</strong> — avoids pairings where the male is significantly weaker</span>
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 text-sm mt-4">
            <section>
              <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Fixed Pairs System
              </h4>
              <div className="text-xs text-muted-foreground space-y-1.5">
                <p>Admins can lock two players as a "fixed pair". The engine guarantees they are always on the same team together.</p>
                <div className="rounded-lg border p-3 space-y-1">
                  <p><strong>Partner repeat exemption:</strong> Fixed pairs are exempt from the -10 partner repeat penalty (since they always play together by design)</p>
                  <p><strong>Both-or-neither rule:</strong> If one player of a fixed pair is in a match, the other must be too — you cannot have one without the other</p>
                  <p><strong>Duplicate matchup prevention:</strong> With fixed pairs, the engine checks for duplicate team-vs-team matchups across all generated matches and finds alternatives if needed</p>
                  <p><strong>Constraint blocked:</strong> If no valid match exists without duplicating an existing matchup, the engine returns a "pair constraint blocked" message rather than generating an invalid match</p>
                </div>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Candidate Generation (Doubles)
              </h4>
              <div className="text-xs text-muted-foreground space-y-1.5">
                <p>Up to 120 candidate matches are generated per round using three strategies:</p>
                <div className="rounded-lg border p-3 space-y-1">
                  <p><strong>1. Fixed pair teams:</strong> Fixed pairs form team units. These are matched against each other or against ad-hoc pairs.</p>
                  <p><strong>2. Grade-sorted pairs:</strong> Non-fixed players are sorted by grade (descending). Adjacent players are paired as team units, then matched against each other.</p>
                  <p><strong>3. Exhaustive combinations:</strong> All 4-player combinations from the sorted pool, with 3 different team split configurations per group (strongest+weakest vs middle, strongest+3rd vs 2nd+weakest, top pair vs bottom pair).</p>
                </div>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-primary" />
                Player Replacement System
              </h4>
              <div className="text-xs text-muted-foreground space-y-1.5">
                <p>When a player is paused mid-session, the engine can replace them in queued (not yet started) matches:</p>
                <div className="rounded-lg border p-3 space-y-1">
                  <p><strong>1.</strong> Identifies all queued matches containing the paused player</p>
                  <p><strong>2.</strong> If the paused player is part of a fixed pair, the partner is also replaced</p>
                  <p><strong>3.</strong> Available replacements are sorted by grade (highest first)</p>
                  <p><strong>4.</strong> Each replacement must not already be in the same match or used for another replacement</p>
                  <p><strong>5.</strong> Returns position-specific replacements (e.g. "teamAPlayer2" → new player ID)</p>
                </div>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                History Tracking
              </h4>
              <div className="text-xs text-muted-foreground space-y-1.5">
                <p>The engine maintains three tracking maps, built from all session matches:</p>
                <div className="rounded-lg border p-3 space-y-1">
                  <p><strong>recentPairings:</strong> How many times each pair of players has been on the same team together. Key format: "smallerId-largerId"</p>
                  <p><strong>recentOpponents:</strong> How many times each pair has faced each other as opponents.</p>
                  <p><strong>playerMatchCounts:</strong> Total number of matches played per player in the session.</p>
                </div>
                <p>These maps are updated after each match is generated, so subsequent matches account for all prior assignments in the current generation batch.</p>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-foreground mb-1.5">State Machine & Safety</h4>
              <div className="text-xs text-muted-foreground space-y-1.5">
                <div className="rounded-lg border p-3 space-y-1">
                  <p><strong>Player States:</strong> Each player is either AVAILABLE or ASSIGNED. Only AVAILABLE players can be selected.</p>
                  <p><strong>Atomic Assignment:</strong> All players in a match are assigned atomically — if any player is already assigned, the entire assignment fails and the candidate is skipped.</p>
                  <p><strong>Post-Validation:</strong> After all matches are generated, the engine checks: no player appears in multiple matches, all ASSIGNED players exist in exactly one match, no duplicate player IDs within a single match.</p>
                  <p><strong>Fallback:</strong> If the fairness-filtered pool doesn't yield a valid match, the engine falls back to the full player pool. If gender quota slots can't be filled, they're converted to mixed slots.</p>
                </div>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-foreground mb-1.5">Queue & Courts Integration</h4>
              <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                <p>
                  Matches are generated into a queue based on the <strong>queue target</strong> (how many matches to pre-generate). When a court becomes free, the next queued match where all players are available moves onto that court. When auto-generate is active, the engine continuously fills the queue as matches complete, using updated history tracking to ensure continued variety.
                </p>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
