# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-29-chrome-extension-scaffold/spec.md

## Technical Requirements

- **Manifest V3 Configuration**: Implement manifest.json with required fields including manifest_version: 3, minimum_version: "114", side_panel configuration, and permissions array with activeTab, scripting, and storage
- **Directory Structure**: Create /apps/extension directory with organized subdirectories for sidepanel/ (React/Preact components), content/ (content scripts), background/ (service worker), lib/ (shared utilities), and styles/ (CSS/styling)
- **Build System**: Configure Vite with @crxjs/vite-plugin for Chrome extension bundling, TypeScript support with proper tsconfig.json, hot module replacement for development, and production build output to apps/extension/dist
- **Side Panel Implementation**: Create React or Preact application entry point in sidepanel/index.tsx, basic App component displaying "Briefcase" confirmation, proper mounting to side panel HTML document, and TypeScript interfaces for component props
- **Service Worker Setup**: Implement background/service-worker.ts with Chrome runtime API listeners, message passing infrastructure for future communication, and proper TypeScript typing for Chrome APIs
- **HTML Entry Points**: Create sidepanel/index.html for side panel mounting, proper meta tags and viewport configuration, and script tag linking to bundled JavaScript
- **Package Configuration**: Set up package.json with required dependencies (react/preact, vite, @crxjs/vite-plugin, typescript), npm scripts for dev and build commands, and proper workspace configuration if using monorepo

## External Dependencies

- **@crxjs/vite-plugin** - Vite plugin specifically designed for Chrome extension development with Manifest V3 support
- **Justification:** Provides hot module replacement, automatic manifest generation, and proper bundling for extension components
- **vite** - Modern build tool for fast development and optimized production builds
- **Justification:** Faster than webpack, better developer experience, and excellent TypeScript support
- **react or preact** - UI library for building the side panel interface
- **Justification:** React provides robust ecosystem and developer familiarity; Preact offers smaller bundle size for extension
- **typescript** - Type safety and better developer experience
- **Justification:** Ensures type safety across Chrome APIs and application code
- **@types/chrome** - TypeScript definitions for Chrome extension APIs
- **Justification:** Required for proper TypeScript support with Chrome extension APIs
