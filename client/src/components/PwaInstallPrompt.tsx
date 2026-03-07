import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

function isIos() {
  return (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document)) && !(window as any).MSStream;
}

function isInStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) {
      setIsInstalled(true);
      return;
    }

    if (isIos()) {
      setIsIosDevice(true);
      setCanInstall(true);
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
    if (isIosDevice) {
      setShowIosGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setCanInstall(false);
    }
    deferredPrompt = null;
  };

  return { canInstall, isInstalled, install, isIosDevice, showIosGuide, setShowIosGuide };
}

export function PwaInstallBanner() {
  const { canInstall, isInstalled, install, isIosDevice, showIosGuide, setShowIosGuide } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("pwa-banner-dismissed");
    if (stored) setDismissed(true);
  }, []);

  if (isInstalled || dismissed || !canInstall) return null;

  return (
    <>
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
              {isIosDevice ? "Add to home screen via Safari" : "Add to your home screen for quick access"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="w-full mt-2 h-7 text-xs gap-1.5"
          onClick={install}
          data-testid="button-install-pwa"
        >
          {isIosDevice ? <Share className="h-3 w-3" /> : <Download className="h-3 w-3" />}
          {isIosDevice ? "How to Install" : "Install"}
        </Button>
      </div>
      {showIosGuide && <IosInstallGuide onClose={() => setShowIosGuide(false)} />}
    </>
  );
}

function IosInstallGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md mx-4 mb-8 rounded-2xl bg-card border border-border p-5 shadow-2xl space-y-3"
        onClick={(e) => e.stopPropagation()}
        data-testid="ios-install-guide"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Install Club Master</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Tap the <Share className="inline h-4 w-4 mx-0.5 align-text-bottom" /> <strong>Share</strong> button in Safari's toolbar
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Scroll down and tap <strong>"Add to Home Screen"</strong>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Tap <strong>"Add"</strong> to install Club Master on your home screen
            </p>
          </div>
        </div>
        <Button size="sm" className="w-full" onClick={onClose} data-testid="button-close-ios-guide">
          Got it
        </Button>
      </div>
    </div>
  );
}

export function PwaInstallButton({ compact = false }: { compact?: boolean }) {
  const { canInstall, isInstalled, install, isIosDevice, showIosGuide, setShowIosGuide } = usePwaInstall();

  if (isInstalled || !canInstall) return null;

  if (compact) {
    return (
      <>
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
        {showIosGuide && <IosInstallGuide onClose={() => setShowIosGuide(false)} />}
      </>
    );
  }

  return (
    <>
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
      {showIosGuide && <IosInstallGuide onClose={() => setShowIosGuide(false)} />}
    </>
  );
}
