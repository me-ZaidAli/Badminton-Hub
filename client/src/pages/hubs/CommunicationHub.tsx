import Hub from "@/pages/Hub";
import { MessageSquare } from "lucide-react";

export default function CommunicationHub() {
  return (
    <Hub
      groupKeys={["comms", "info"]}
      title="Communication"
      description="Announcements, notifications, tickets and help."
      icon={MessageSquare}
      accent="sky"
    />
  );
}
