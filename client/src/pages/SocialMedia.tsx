import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { useClubs } from "@/hooks/use-clubs";
import { PremiumFeatureGate } from "@/components/PremiumFeatureGate";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SocialLinksDisplay, SocialLink } from "@/components/SocialLinks";
import { Building2, Share2 } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function SocialMedia() {
  const { data: user } = useUser();
  const { data: clubs = [], isLoading } = useClubs();
  const [selectedClubId, setSelectedClubId] = useState<string>("");

  const clubsWithSocials = clubs.filter((c: any) => {
    const links = c.socialLinks || [];
    return links.some((l: SocialLink) => l.url?.trim());
  });

  const activeClubId = selectedClubId || (clubsWithSocials.length > 0 ? String(clubsWithSocials[0].id) : "");
  const activeClub = clubs.find((c: any) => String(c.id) === activeClubId);
  const socialLinks: SocialLink[] = (activeClub as any)?.socialLinks || [];
  const validLinks = socialLinks.filter(l => l.url?.trim());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PremiumFeatureGate featureName="Social Media" description="Display and manage your club's social media links. Upgrade to Premium to unlock this feature.">
    <div className="space-y-6">
      <PageHeader
        title="Social Media"
        description="Stay connected with your club on social media."
      />

      {clubs.length > 1 && (
        <div className="flex items-center gap-3" data-testid="social-club-selector">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select value={activeClubId} onValueChange={setSelectedClubId}>
            <SelectTrigger className="w-[240px]" data-testid="select-social-club">
              <SelectValue placeholder="Select club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((club: any) => (
                <SelectItem key={club.id} value={String(club.id)}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {validLinks.length > 0 ? (
        <Card data-testid="card-social-media">
          <CardContent className="py-6 px-6">
            <div className="flex items-center gap-2 text-base font-semibold mb-4">
              <Share2 className="w-5 h-5 text-primary" />
              Follow {activeClub?.name || "Us"}
            </div>
            <SocialLinksDisplay links={socialLinks} variant="buttons" showLabel={false} />
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="card-no-social">
          <CardContent className="py-12 text-center">
            <Share2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">
              {clubs.length === 0
                ? "Join a club to see their social media links."
                : "This club hasn't added any social media links yet."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
    </PremiumFeatureGate>
  );
}
