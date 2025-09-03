import { FunctionalComponent, Component } from "preact";
import { lazy, Suspense } from "preact/compat";

// Lazy load the DocumentViewer component
// This component is only needed when viewing saved documents
const DocumentViewerLazy = lazy(() =>
  import(
    /* webpackChunkName: "document-viewer" */
    "./DocumentViewer"
  ).then((module) => ({ default: module.DocumentViewer })),
);

interface LazyDocumentViewerProps {
  document: {
    id: string;
    title: string;
    domain: string;
    date: string;
    rawText?: string;
    summary?: {
      keyPoints: string[];
      tldr: string;
    };
  };
  onClose?: () => void;
}

// Loading placeholder component
const ViewerLoadingPlaceholder: FunctionalComponent = () => (
  <div className="viewer-loading">
    <div className="loading-content">
      <div className="skeleton-header" />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
  </div>
);

// Error boundary component for handling loading failures
class ViewerErrorBoundary extends Component<
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
    console.error("[LazyDocumentViewer] Loading error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="viewer-error">
          <h3>Failed to load document viewer</h3>
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
export const LazyDocumentViewer: FunctionalComponent<
  LazyDocumentViewerProps
> = ({ document, onClose }) => {
  return (
    <ViewerErrorBoundary>
      <Suspense fallback={<ViewerLoadingPlaceholder />}>
        <DocumentViewerLazy
          document={document}
          onBack={onClose || (() => {})}
        />
      </Suspense>
    </ViewerErrorBoundary>
  );
};
