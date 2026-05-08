import Hub from "@/pages/Hub";
import { Building2 } from "lucide-react";

export default function MyClubHub() {
  return (
    <Hub
      groupKeys={["club", "design"]}
      title="My Club"
      description="Clubs, merchandise, rewards, deals and look & feel."
      icon={Building2}
      accent="amber"
    />
  );
}
