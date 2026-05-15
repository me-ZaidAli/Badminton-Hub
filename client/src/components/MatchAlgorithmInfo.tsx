import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, Shuffle, Target, Users, Scale } from "lucide-react";

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
            How matches are generated
          </DialogTitle>
          <DialogDescription>
            One simple algorithm. Five settings. No surprises.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm mt-2">
          <section>
            <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              The 5-step recipe
            </h4>
            <ol className="list-decimal list-inside space-y-1 ml-1 text-muted-foreground">
              <li>Filter eligible players by gender category (men's, women's, mixed).</li>
              <li>Sort by games played so far — fewest first.</li>
              <li>Take the top N hungriest as the candidate pool (default 8).</li>
              <li>Try every possible group of 4 from that pool. Score each; lowest wins.</li>
              <li>Split the chosen 4 into balanced teams (top + bottom vs middle two).</li>
            </ol>
          </section>

          <section>
            <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              How groups are scored
            </h4>
            <p className="text-muted-foreground mb-2">
              Each candidate group gets a penalty score. Lower is better. Four kinds of penalties are added:
            </p>
            <ul className="space-y-1.5 ml-1">
              <li className="flex gap-2">
                <span className="text-foreground font-semibold min-w-[140px]">Group repeat</span>
                <span className="text-muted-foreground">×N where N = how many times this exact foursome has already played in the session.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-foreground font-semibold min-w-[140px]">Partner repeat</span>
                <span className="text-muted-foreground">×total prior partner pairings across all 6 player-pairs in the group.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-foreground font-semibold min-w-[140px]">Opponent repeat</span>
                <span className="text-muted-foreground">×total prior opponent pairings across all 6 player-pairs.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-foreground font-semibold min-w-[140px]">Grade spread</span>
                <span className="text-muted-foreground">×rank gap between the highest- and lowest-graded player in the group.</span>
              </li>
            </ul>
          </section>

          <section>
            <h4 className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Team split
            </h4>
            <p className="text-muted-foreground">
              Once the best group of 4 is chosen, teams are formed by ranking the four players by grade and pairing
              <strong className="text-foreground"> 1st + 4th vs 2nd + 3rd</strong>. This produces the most balanced average rating from the group.
            </p>
            <p className="text-muted-foreground mt-2">
              Fixed pairs (set up before the session) override the split — they always partner each other if the engine puts them in the same group.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-foreground mb-1.5">Singles</h4>
            <p className="text-muted-foreground">
              For singles, the engine picks the two least-played players from the candidate pool, scoring each pair by
              opponent-repeat and grade-spread penalties only.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-foreground mb-1.5">Tunable knobs (admin only)</h4>
            <p className="text-muted-foreground">
              Club admins can adjust all four penalty weights and the candidate pool size in
              <strong className="text-foreground"> Admin → Match Engine Settings</strong>. Three presets are available:
              <strong className="text-foreground"> Casual</strong> (lighter penalties),
              <strong className="text-foreground"> Balanced</strong> (default), and
              <strong className="text-foreground"> Competitive</strong> (stricter skill matching).
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
