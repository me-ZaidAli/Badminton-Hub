import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt = null;
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setCanInstall(false);
    }
    deferredPrompt = null;
  };

  return { canInstall, isInstalled, install };
}

export function PwaInstallBanner() {
  const { canInstall, isInstalled, install } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("pwa-banner-dismissed");
    if (stored) setDismissed(true);
  }, []);

  if (isInstalled || dismissed || !canInstall) return null;

  return (
    <div
      className="relative mx-2 mb-2 rounded-lg p-3 border border-primary/30"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))",
      }}
      data-testid="pwa-install-banner"
    >
      <button
        className="absolute top-1.5 right-1.5 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => {
          setDismissed(true);
          localStorage.setItem("pwa-banner-dismissed", "true");
        }}
        data-testid="button-dismiss-pwa-banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center gap-2.5 pr-4">
        <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
          <Smartphone className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-tight">Install App</p>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
            Add to your home screen for quick access
          </p>
        </div>
      </div>
      <Button
        size="sm"
        className="w-full mt-2 h-7 text-xs gap-1.5"
        onClick={install}
        data-testid="button-install-pwa"
      >
        <Download className="h-3 w-3" />
        Install
      </Button>
    </div>
  );
}

export function PwaInstallButton({ compact = false }: { compact?: boolean }) {
  const { canInstall, isInstalled, install } = usePwaInstall();

  if (isInstalled || !canInstall) return null;

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-3"
        onClick={install}
        data-testid="button-install-pwa-compact"
      >
        <Download className="w-4 h-4" />
        Install App
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start gap-2 h-8 text-xs"
      onClick={install}
      data-testid="button-install-pwa-main"
    >
      <Download className="h-3.5 w-3.5" />
      Install App
    </Button>
  );
}
