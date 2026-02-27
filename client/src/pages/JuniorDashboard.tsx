import { useEffect } from "react";
import { useParams, useLocation } from "wouter";

export default function JuniorDashboard() {
  const params = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(`/juniors?tab=performance&child=${params.userId}`);
  }, [params.userId, setLocation]);

  return null;
}
