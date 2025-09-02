/**
 * Module Boundary Definitions
 *
 * This file defines the architectural boundaries and communication patterns
 * between different modules in the Briefcase extension.
 */

/**
 * Module Layers
 *
 * The application is organized into distinct layers with clear responsibilities:
 *
 * 1. UI Layer (sidepanel/*)
 *    - User interface components
 *    - State management
 *    - User interaction handling
 *
 * 2. Provider Layer (lib/providers/*, lib/openai-*)
 *    - Summary generation
 *    - AI model integration
 *    - Provider abstraction
 *
 * 3. Extraction Layer (content/*, lib/extraction/*)
 *    - Content extraction from web pages
 *    - Site-specific extractors
 *    - DOM analysis
 *
 * 4. Storage Layer (lib/document-repository.ts, lib/settings-service.ts)
 *    - Data persistence
 *    - Settings management
 *    - Document storage
 *
 * 5. Communication Layer (background/*, content/*)
 *    - Message passing
 *    - Chrome API integration
 *    - Cross-context communication
 */

/**
 * Import Rules
 *
 * These rules should be enforced via ESLint configuration:
 */
export const MODULE_IMPORT_RULES = {
  // UI Layer can import from:
  "sidepanel/**": [
    "lib/providers/interfaces", // Provider interfaces only
    "lib/extraction/interfaces", // Extraction interfaces only
    "lib/document-repository", // Storage
    "lib/settings-service", // Settings
    "lib/openai-provider-lazy", // Lazy-loaded providers
  ],

  // Provider Layer can import from:
  "lib/providers/**": [
    "lib/settings-service", // For configuration
    // No imports from extraction or UI layers
  ],

  // Extraction Layer can import from:
  "lib/extraction/**": [
    // Self-contained, no external dependencies
  ],
  "content/**": [
    "lib/extraction/**", // Extraction utilities
    // No imports from providers or UI
  ],

  // Storage Layer can import from:
  "lib/document-repository": [
    // No imports from other layers
  ],
  "lib/settings-service": [
    // No imports from other layers
  ],

  // Communication Layer can import from:
  "background/**": [
    "lib/providers/interfaces", // For message handling
    "lib/extraction/interfaces", // For message handling
    "lib/document-repository", // Storage operations
    "lib/settings-service", // Settings operations
  ],
};

/**
 * Cross-Module Communication Interfaces
 */

// UI -> Provider communication
export interface UIToProviderMessage {
  type: "summarize" | "validate" | "configure";
  payload: any;
}

// UI -> Extraction communication
export interface UIToExtractionMessage {
  type: "extract" | "configure" | "analyze";
  payload: any;
}

// Provider -> UI communication
export interface ProviderToUIMessage {
  type: "result" | "error" | "progress";
  payload: any;
}

// Extraction -> UI communication
export interface ExtractionToUIMessage {
  type: "content" | "error" | "metrics";
  payload: any;
}

/**
 * Module Responsibilities
 */
export const MODULE_RESPONSIBILITIES = {
  UI: [
    "Render user interface",
    "Handle user interactions",
    "Display extraction results",
    "Show summarization output",
    "Manage application state",
  ],

  Providers: [
    "Generate summaries from text",
    "Validate API credentials",
    "Handle streaming responses",
    "Manage provider configuration",
    "Abstract AI model differences",
  ],

  Extraction: [
    "Extract content from web pages",
    "Handle site-specific extraction",
    "Detect SPA frameworks",
    "Analyze DOM structure",
    "Provide fallback strategies",
  ],

  Storage: [
    "Persist documents locally",
    "Manage user settings",
    "Handle chrome.storage API",
    "Provide data access layer",
    "Manage storage limits",
  ],

  Communication: [
    "Handle Chrome extension messaging",
    "Coordinate between contexts",
    "Manage content script injection",
    "Handle tab events",
    "Bridge UI and content scripts",
  ],
};

/**
 * Dependency Injection Points
 *
 * These are the recommended points for dependency injection
 * to maintain loose coupling between modules:
 */
export const INJECTION_POINTS = {
  // Provider injection
  StreamingSummarizer: {
    accepts: "ISummaryProvider",
    via: "props or context",
  },

  // Extraction injection
  SidePanel: {
    accepts: "IExtractionPipeline",
    via: "message passing",
  },

  // Storage injection
  DocumentViewer: {
    accepts: "IDocumentRepository",
    via: "props or singleton",
  },
};

/**
 * Module Communication Patterns
 */
export const COMMUNICATION_PATTERNS = {
  // Async message passing for cross-context communication
  CrossContext: {
    pattern: "Message Passing",
    example: "chrome.runtime.sendMessage",
    use: "Between content scripts and background/sidepanel",
  },

  // Direct imports for same-context communication
  SameContext: {
    pattern: "Direct Import",
    example: "import { Service } from './service'",
    use: "Within the same execution context",
  },

  // Lazy loading for performance optimization
  LazyLoading: {
    pattern: "Dynamic Import",
    example: "await import('./heavy-module')",
    use: "For large or rarely-used modules",
  },

  // Event emitters for decoupled communication
  EventDriven: {
    pattern: "Event Emitter",
    example: "eventBus.emit('event', data)",
    use: "For loosely coupled components",
  },
};

/**
 * Architecture Principles
 */
export const ARCHITECTURE_PRINCIPLES = [
  "Separation of Concerns - Each module has a single, well-defined responsibility",
  "Dependency Inversion - Depend on abstractions, not concrete implementations",
  "Interface Segregation - Modules expose minimal, focused interfaces",
  "Loose Coupling - Modules communicate through well-defined contracts",
  "High Cohesion - Related functionality is grouped within modules",
  "Lazy Loading - Load heavy dependencies only when needed",
  "Progressive Enhancement - Core functionality works without optional modules",
];

export default {
  MODULE_IMPORT_RULES,
  MODULE_RESPONSIBILITIES,
  INJECTION_POINTS,
  COMMUNICATION_PATTERNS,
  ARCHITECTURE_PRINCIPLES,
};
