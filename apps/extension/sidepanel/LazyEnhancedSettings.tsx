import { FunctionalComponent, Component } from "preact";
import { lazy, Suspense } from "preact/compat";
import { useState, useEffect } from "preact/hooks";

// Lazy load the EnhancedSettings component
// This saves ~30-50KB from the main bundle since settings are not immediately needed
const EnhancedSettingsLazy = lazy(() =>
  import(
    /* webpackChunkName: "enhanced-settings" */
    "./EnhancedSettings"
  ).then((module) => ({ default: module.EnhancedSettings })),
);

interface LazyEnhancedSettingsProps {
  onSettingsUpdate?: () => void;
}

// Loading placeholder component
const SettingsLoadingPlaceholder: FunctionalComponent = () => (
  <div className="settings-loading">
    <div className="loading-spinner">
      <svg
        className="animate-spin"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
    <p className="loading-text">Loading settings...</p>
  </div>
);

// Error boundary component for handling loading failures
class SettingsErrorBoundary extends Component<
  { children: any },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[LazyEnhancedSettings] Loading error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="settings-error">
          <h3>Failed to load settings</h3>
          <p>Please try refreshing the page.</p>
          {this.state.error && (
            <details>
              <summary>Error details</summary>
              <pre>{this.state.error.message}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component that handles lazy loading
export const LazyEnhancedSettings: FunctionalComponent<
  LazyEnhancedSettingsProps
> = ({ onSettingsUpdate }) => {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Pre-load settings component after initial render to improve perceived performance
    // This allows the main UI to render first, then loads settings in the background
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (!shouldLoad) {
    return <SettingsLoadingPlaceholder />;
  }

  return (
    <SettingsErrorBoundary>
      <Suspense fallback={<SettingsLoadingPlaceholder />}>
        <EnhancedSettingsLazy onSettingsUpdate={onSettingsUpdate} />
      </Suspense>
    </SettingsErrorBoundary>
  );
};
