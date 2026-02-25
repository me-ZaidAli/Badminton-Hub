import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, Shuffle } from "lucide-react";

export function MatchAlgorithmInfoButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" data-testid="button-match-algorithm-info">
          <Info className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg" data-testid="title-match-algorithm-info">
            <Shuffle className="w-5 h-5 text-primary" />
            How Match Generation Works
          </DialogTitle>
          <DialogDescription>
            Understanding how the Smart Match Engine creates fair and balanced matches
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 text-sm" data-testid="content-match-algorithm-info">
          <section>
            <h4 className="font-semibold text-foreground mb-1.5">Overview</h4>
            <p className="text-muted-foreground leading-relaxed">
              The Smart Match Engine uses a deterministic algorithm to generate fair matches. It evaluates every possible player combination, scores each one based on multiple fairness factors, and selects the best options. The same inputs always produce the same results.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-foreground mb-1.5">Social vs Competitive Mode</h4>
            <div className="space-y-2">
              <div className="rounded-lg border p-3">
                <p className="font-medium text-foreground mb-1">Social Mode</p>
                <p className="text-muted-foreground leading-relaxed">
                  Prioritises variety and inclusivity. The engine maximises the number of different partners and opponents you play with, and awards bonuses for mixed-gender pairings. Ideal for club nights where everyone should get a good mix of games.
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium text-foreground mb-1">Competitive Mode</p>
                <p className="text-muted-foreground leading-relaxed">
                  Prioritises skill balance. The engine matches players of similar grades together for closer, more competitive games. Players with very large grade differences will not be paired in singles. Great for training sessions or competitive practice.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h4 className="font-semibold text-foreground mb-1.5">Player Grades (9-Tier System)</h4>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Every player has a grade that reflects their skill level. The system uses 9 tiers from beginner to advanced:
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { grade: "A1", desc: "Elite" },
                { grade: "A2", desc: "Advanced+" },
                { grade: "A3", desc: "Advanced" },
                { grade: "B1", desc: "Intermediate+" },
                { grade: "B2", desc: "Intermediate" },
                { grade: "B3", desc: "Intermediate-" },
                { grade: "C1", desc: "Developing+" },
                { grade: "C2", desc: "Developing" },
                { grade: "C3", desc: "Beginner" },
              ].map(({ grade, desc }) => (
                <div key={grade} className="flex items-center gap-2 rounded border px-2.5 py-1.5">
                  <Badge variant="secondary" className="text-xs font-mono">{grade}</Badge>
                  <span className="text-muted-foreground text-xs">{desc}</span>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground leading-relaxed mt-2">
              In competitive mode, grades are used to balance teams. In social mode, they still influence pairings to keep games enjoyable for all skill levels.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-foreground mb-1.5">Fairness Factors</h4>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Each potential match is scored using these factors (highest-scoring combinations are selected first):
            </p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary font-bold mt-0.5">1.</span>
                <span><strong className="text-foreground">Equal Playing Time</strong> — Players who have played fewer games are strongly prioritised so everyone gets a similar number of matches.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold mt-0.5">2.</span>
                <span><strong className="text-foreground">Partner Variety</strong> — The engine avoids repeating the same partner combinations, so you play with different people throughout the session.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold mt-0.5">3.</span>
                <span><strong className="text-foreground">Opponent Variety</strong> — Similarly, it avoids matching you against the same opponents repeatedly.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold mt-0.5">4.</span>
                <span><strong className="text-foreground">Grade Balance</strong> — In competitive mode, team strengths are balanced so that neither side has a significant skill advantage.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold mt-0.5">5.</span>
                <span><strong className="text-foreground">Priority Players</strong> — Players who have been waiting the longest receive a boost to ensure they get onto court sooner.</span>
              </li>
            </ul>
          </section>

          <section>
            <h4 className="font-semibold text-foreground mb-1.5">Fixed Pairs</h4>
            <p className="text-muted-foreground leading-relaxed">
              Admins can link two players as a fixed pair. When paired, these players will always be placed on the same team together. This is useful for coaching partnerships or players who specifically want to play doubles together.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-foreground mb-1.5">Queue & Courts</h4>
            <p className="text-muted-foreground leading-relaxed">
              Matches are first generated into a queue. When a court becomes free, the next queued match where all players are available is automatically moved onto that court. You can set a queue target size to control how many matches are pre-generated. When auto-generate is active, the engine continuously fills the queue as matches complete.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-foreground mb-1.5">Gender Filters</h4>
            <p className="text-muted-foreground leading-relaxed">
              You can filter match generation to Mixed (any combination), Female Only, or Male Only. In social mode with mixed games, the engine gives bonuses for balanced gender representation across both teams.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
