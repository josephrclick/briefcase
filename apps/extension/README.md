# Briefcase Chrome Extension

Chrome side-panel extension for summarizing web content with AI.

## Project Structure

```
apps/extension/
├── background/         # Service worker scripts
│   └── service-worker.ts
├── content/           # Content scripts (future)
├── lib/              # Shared utilities (future)
├── sidepanel/        # Side panel UI components
│   ├── index.html
│   ├── index.tsx
│   ├── index.css
│   └── App.tsx
├── public/           # Static assets
│   └── icon-*.png
├── styles/           # Additional styles (future)
├── dist/            # Build output
├── manifest.json    # Chrome extension manifest
├── package.json     # Dependencies and scripts
├── tsconfig.json    # TypeScript configuration
└── vite.config.ts   # Vite build configuration
```

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build extension for production
npm run build

# Type check TypeScript files
npm run typecheck

# Run linter
npm run lint
```

## Loading the Extension

1. Build the extension:

   ```bash
   npm run build
   ```

2. Open Chrome and navigate to `chrome://extensions`

3. Enable "Developer mode" toggle in the top right

4. Click "Load unpacked" button

5. Select the `/apps/extension/dist` directory

6. The Briefcase icon should appear in your extensions toolbar

## Development Workflow

1. Run `npm run dev` to start the development server
2. Make changes to the code
3. For most changes, the extension will hot-reload automatically
4. For manifest changes, rebuild with `npm run build` and reload the extension

## Technology Stack

- **UI Framework**: Preact (lightweight React alternative)
- **Build Tool**: Vite with CRXJS plugin
- **Language**: TypeScript
- **Chrome APIs**: Manifest V3, Side Panel API
- **Styling**: Plain CSS with modern features

## Key Files

- `manifest.json`: Extension configuration and permissions
- `sidepanel/App.tsx`: Main UI component
- `background/service-worker.ts`: Background script for extension events
- `vite.config.ts`: Build configuration

## Chrome Extension APIs Used

- `chrome.sidePanel`: Side panel management
- `chrome.runtime`: Extension lifecycle and messaging
- `chrome.storage.local`: Local data persistence
- `chrome.scripting`: Content script injection
- `chrome.action`: Extension toolbar icon
