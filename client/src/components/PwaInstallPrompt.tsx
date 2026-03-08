import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone, Share, Plus, ArrowUp, Copy, Check } from "lucide-react";

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

function isSafari() {
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua);
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
              {isIosDevice ? "Add to home screen for the best experience" : "Add to your home screen for quick access"}
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

function IosInstallGuideContent({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const usingChrome = /CriOS/.test(navigator.userAgent);
  const usingFirefox = /FxiOS/.test(navigator.userAgent);
  const notSafari = usingChrome || usingFirefox || !isSafari();

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60" onClick={onClose} style={{ position: "fixed" }}>
      <div
        className="w-full max-w-md mx-4 mb-8 rounded-2xl bg-card border border-border p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-5 duration-300"
        onClick={(e) => e.stopPropagation()}
        data-testid="ios-install-guide"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-base font-bold">Install Club Master</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors" data-testid="button-close-ios-guide-x">
            <X className="h-4 w-4" />
          </button>
        </div>

        {notSafari && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-2" data-testid="safari-warning">
            <p className="text-xs text-amber-400 font-medium">
              You need to use <strong>Safari</strong> to install the app. {usingChrome ? "Chrome" : usingFirefox ? "Firefox" : "This browser"} on iPhone/iPad doesn't support app installation.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              onClick={copyUrl}
              data-testid="button-copy-url"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "URL Copied! Now open Safari and paste it" : "Copy URL to open in Safari"}
            </Button>
          </div>
        )}

        {!notSafari && (
          <div className="space-y-3">
            <div className="flex items-start gap-3" data-testid="ios-step-1">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <p className="text-sm font-medium">Tap the Share button</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Look for the <Share className="inline h-3.5 w-3.5 mx-0.5 align-text-bottom" /> icon at the bottom of Safari
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3" data-testid="ios-step-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <p className="text-sm font-medium">Scroll down and tap "Add to Home Screen"</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Find <Plus className="inline h-3.5 w-3.5 mx-0.5 align-text-bottom" /> <strong>Add to Home Screen</strong> in the share menu
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3" data-testid="ios-step-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div>
                <p className="text-sm font-medium">Tap "Add" in the top right</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Club Master will appear on your home screen like a native app
                </p>
              </div>
            </div>
          </div>
        )}

        {!notSafari && (
          <div className="flex items-center gap-2 pt-1">
            <ArrowUp className="h-4 w-4 text-muted-foreground animate-bounce" />
            <p className="text-[11px] text-muted-foreground">The app will work offline and open in full screen</p>
          </div>
        )}

        <Button size="sm" className="w-full" onClick={onClose} data-testid="button-close-ios-guide">
          Got it
        </Button>
      </div>
    </div>
  );
}

function IosInstallGuide({ onClose }: { onClose: () => void }) {
  return createPortal(
    <IosInstallGuideContent onClose={onClose} />,
    document.body
  );
}

export function IosFirstVisitPrompt() {
  const [show, setShow] = useState(false);
  const { isIosDevice, showIosGuide, setShowIosGuide } = usePwaInstall();

  useEffect(() => {
    if (!isIosDevice || isInStandaloneMode()) return;
    const seen = localStorage.getItem("ios-install-prompt-seen");
    if (!seen) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isIosDevice]);

  if (!show || isInStandaloneMode()) return null;

  return (
    <>
      <div
        className="fixed bottom-4 left-4 right-4 z-[90] max-w-md mx-auto rounded-2xl bg-card border border-primary/30 p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-500"
        style={{
          background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--primary) / 0.05))",
        }}
        data-testid="ios-first-visit-prompt"
      >
        <button
          className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => {
            setShow(false);
            localStorage.setItem("ios-install-prompt-seen", "true");
          }}
          data-testid="button-dismiss-ios-prompt"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 pr-4">
          <div className="p-2 rounded-xl bg-primary/10 shrink-0">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Install Club Master</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add to your home screen for the best experience — works like a native app!
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="w-full mt-3 gap-2"
          onClick={() => {
            setShow(false);
            localStorage.setItem("ios-install-prompt-seen", "true");
            setShowIosGuide(true);
          }}
          data-testid="button-ios-prompt-install"
        >
          <Share className="h-4 w-4" />
          Show Me How
        </Button>
      </div>
      {showIosGuide && <IosInstallGuide onClose={() => setShowIosGuide(false)} />}
    </>
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
