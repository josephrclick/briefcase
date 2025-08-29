# Tasks Checklist

This tasks checklist is for the spec detailed in @.agent-os/specs/2025-08-29-chrome-extension-scaffold/spec.md

## Setup & Configuration

- [ ] Create `/apps/extension` directory structure
- [ ] Initialize npm package in `/apps/extension` with package.json
- [ ] Install core dependencies: vite, @crxjs/vite-plugin, typescript
- [ ] Install UI framework: react (or preact for smaller bundle)
- [ ] Install type definitions: @types/chrome, @types/react (or @types/preact)
- [ ] Create TypeScript configuration (tsconfig.json)
- [ ] Configure Vite with CRXJS plugin (vite.config.ts)

## Project Structure

- [ ] Create `/apps/extension/sidepanel` directory for side panel UI
- [ ] Create `/apps/extension/content` directory for content scripts
- [ ] Create `/apps/extension/background` directory for service worker
- [ ] Create `/apps/extension/lib` directory for shared utilities
- [ ] Create `/apps/extension/styles` directory for CSS/styling
- [ ] Create `/apps/extension/public` directory for static assets (icons)

## Manifest Configuration

- [ ] Create manifest.json with manifest_version: 3
- [ ] Add extension name, version, and description
- [ ] Configure minimum Chrome version (114+)
- [ ] Add side_panel configuration with default_path
- [ ] Add required permissions: activeTab, scripting, storage
- [ ] Add background service worker configuration
- [ ] Add extension icons (16x16, 48x48, 128x128)

## Side Panel Implementation

- [ ] Create sidepanel/index.html entry point
- [ ] Add proper meta tags and viewport configuration
- [ ] Create sidepanel/index.tsx React/Preact entry point
- [ ] Implement basic App component with "Briefcase" confirmation
- [ ] Set up React/Preact DOM rendering
- [ ] Add TypeScript interfaces for component props
- [ ] Create basic CSS for minimal styling

## Service Worker Setup

- [ ] Create background/service-worker.ts file
- [ ] Add Chrome runtime API event listeners
- [ ] Implement basic message passing infrastructure
- [ ] Add TypeScript typing for Chrome APIs
- [ ] Configure service worker registration in manifest

## Build System

- [ ] Add npm scripts for development (npm run dev)
- [ ] Add npm scripts for production build (npm run build)
- [ ] Configure hot module replacement for development
- [ ] Set up build output to /apps/extension/dist
- [ ] Test development server with hot reload
- [ ] Verify production build creates valid extension

## Testing & Validation

- [ ] Build extension with npm run build
- [ ] Load unpacked extension in Chrome from /apps/extension/dist
- [ ] Verify extension icon appears in toolbar
- [ ] Test side panel opens when icon is clicked
- [ ] Confirm "Briefcase" message displays in side panel
- [ ] Verify no console errors in extension context
- [ ] Test hot reload works in development mode

## Documentation

- [ ] Update root README with extension setup instructions
- [ ] Document build and development commands
- [ ] Add Chrome extension loading instructions
- [ ] Document project structure and file organization

## Completion Criteria

- [ ] Extension loads without errors in Chrome 114+
- [ ] Side panel opens and displays basic interface
- [ ] Build process completes successfully
- [ ] Development hot reload is functional
- [ ] All TypeScript types are properly configured
- [ ] Project structure follows specified organization
