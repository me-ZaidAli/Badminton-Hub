import Hub from "@/pages/Hub";
import { Activity } from "lucide-react";

export default function ActivityHub() {
  return (
    <Hub
      groupKeys={["activity"]}
      title="Activity"
      description="Sessions, leagues, tournaments and your performance."
      icon={Activity}
      accent="primary"
    />
  );
}
