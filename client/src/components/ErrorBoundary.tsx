import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const msg = error.message || "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Loading chunk") ||
    msg.includes("Loading CSS chunk")
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    if (isChunkLoadError(error)) {
      const lastReload = sessionStorage.getItem("chunk-reload-ts");
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem("chunk-reload-ts", String(now));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const isChunkErr = isChunkLoadError(this.state.error);
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center" data-testid="error-boundary-fallback">
          <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {isChunkErr ? "New version available" : "Something went wrong"}
          </h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            {isChunkErr
              ? "A new version of the app has been deployed. Please refresh to load the latest version."
              : "An unexpected error occurred. Please try refreshing the page."}
          </p>
          {!isChunkErr && this.state.error && (
            <p className="text-xs text-muted-foreground mb-4 max-w-lg break-all font-mono bg-muted/30 p-2 rounded" data-testid="text-error-details">
              {this.state.error.message}
            </p>
          )}
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            data-testid="button-error-reload"
          >
            Refresh Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
