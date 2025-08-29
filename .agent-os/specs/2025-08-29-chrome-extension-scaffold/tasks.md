# Tasks Checklist

This tasks checklist is for the spec detailed in @.agent-os/specs/2025-08-29-chrome-extension-scaffold/spec.md

## Setup & Configuration

- [x] Create `/apps/extension` directory structure
- [x] Initialize npm package in `/apps/extension` with package.json
- [x] Install core dependencies: vite, @crxjs/vite-plugin, typescript
- [x] Install UI framework: react (or preact for smaller bundle)
- [x] Install type definitions: @types/chrome, @types/react (or @types/preact)
- [x] Create TypeScript configuration (tsconfig.json)
- [x] Configure Vite with CRXJS plugin (vite.config.ts)

## Project Structure

- [x] Create `/apps/extension/sidepanel` directory for side panel UI
- [x] Create `/apps/extension/content` directory for content scripts
- [x] Create `/apps/extension/background` directory for service worker
- [x] Create `/apps/extension/lib` directory for shared utilities
- [x] Create `/apps/extension/styles` directory for CSS/styling
- [x] Create `/apps/extension/public` directory for static assets (icons)

## Manifest Configuration

- [x] Create manifest.json with manifest_version: 3
- [x] Add extension name, version, and description
- [x] Configure minimum Chrome version (114+)
- [x] Add side_panel configuration with default_path
- [x] Add required permissions: activeTab, scripting, storage
- [x] Add background service worker configuration
- [x] Add extension icons (16x16, 48x48, 128x128)

## Side Panel Implementation

- [x] Create sidepanel/index.html entry point
- [x] Add proper meta tags and viewport configuration
- [x] Create sidepanel/index.tsx React/Preact entry point
- [x] Implement basic App component with "Briefcase" confirmation
- [x] Set up React/Preact DOM rendering
- [x] Add TypeScript interfaces for component props
- [x] Create basic CSS for minimal styling

## Service Worker Setup

- [x] Create background/service-worker.ts file
- [x] Add Chrome runtime API event listeners
- [x] Implement basic message passing infrastructure
- [x] Add TypeScript typing for Chrome APIs
- [x] Configure service worker registration in manifest

## Build System

- [x] Add npm scripts for development (npm run dev)
- [x] Add npm scripts for production build (npm run build)
- [x] Configure hot module replacement for development
- [x] Set up build output to /apps/extension/dist
- [x] Test development server with hot reload
- [x] Verify production build creates valid extension

## Testing & Validation

- [x] Build extension with npm run build
- [x] Load unpacked extension in Chrome from /apps/extension/dist
- [x] Verify extension icon appears in toolbar
- [x] Test side panel opens when icon is clicked
- [x] Confirm "Briefcase" message displays in side panel
- [x] Verify no console errors in extension context
- [x] Test hot reload works in development mode

## Documentation

- [x] Update root README with extension setup instructions
- [x] Document build and development commands
- [x] Add Chrome extension loading instructions
- [x] Document project structure and file organization

## Completion Criteria

- [x] Extension loads without errors in Chrome 114+
- [x] Side panel opens and displays basic interface
- [x] Build process completes successfully
- [x] Development hot reload is functional
- [x] All TypeScript types are properly configured
- [x] Project structure follows specified organization
