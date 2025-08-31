# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-31-ui-polish-improvements/spec.md

## Technical Requirements

### 1. API Key Save Flow Enhancement

**Component:** `EnhancedSettings.tsx`

- Modify `handleTestConnection` to set a new state flag `apiKeyValidated` on successful validation
- Transform button text from "Test Connection" to "Save Key" when `apiKeyValidated === true`
- Combine test and save operations into a single flow when validation succeeds
- Reset `apiKeyValidated` flag when API key input changes
- Maintain existing validation error handling and messaging

**State Management:**

- Add `apiKeyValidated: boolean` state
- Track validation status separately from save status
- Clear validation state on key modification

### 2. Combined Extract & Summarize Workflow

**Components:** `SidePanel.tsx`, `StreamingSummarizer.tsx`

- Modify `handleExtractClick` in `SidePanel.tsx` to automatically trigger summarization after successful extraction
- Pass auto-summarize flag through component props
- Update `StreamingSummarizer` to accept and handle auto-start prop
- Ensure proper error handling if extraction succeeds but summarization fails
- Maintain ability to manually retry summarization if auto-summarization fails

**Flow Changes:**

- Extract content → On success → Automatically call `handleSummarize`
- Show combined loading states during the full operation
- Handle edge cases: no API key, extraction failure, summarization failure

### 3. Conditional Settings Display

**Component:** `EnhancedSettings.tsx`

- Add `apiKeyConfigured: boolean` state based on presence of valid API key
- Create collapsible OpenAI Configuration section
- Add "Change API Key" button when section is collapsed
- Persist collapse state in settings
- Show expanded by default for new users without API key

**UI Structure:**

```
Settings
├── [Collapsed OpenAI Configuration] → "Change API Key" button
├── Summarization Preferences (always visible)
├── Save Settings button
└── Danger Zone
```

### 4. Width Optimization

**Files:** `styles.css`, all component files

- Reduce `.tab-content` padding from 1rem to 0.5rem
- Reduce `.streaming-summarizer` padding from 1rem to 0.5rem
- Optimize `.controls` padding from 1rem to 0.75rem
- Adjust `.settings-section` padding for better space utilization
- Ensure text remains readable with appropriate line-height
- Maintain minimum touch target sizes for buttons (44x44px)

**Specific Changes:**

```css
.tab-content {
  padding: 0.5rem;
}
.streaming-summarizer {
  padding: 0.5rem;
}
.controls {
  padding: 0.75rem;
}
.settings-section {
  padding: 0.75rem;
}
.summary-container {
  padding: 0.75rem;
}
```

### 5. Dark Mode Implementation

**Files:** `styles.css`, `SidePanel.tsx`, `lib/settings-service.ts`

**Theme Detection & Storage:**

- Detect system preference via `window.matchMedia('(prefers-color-scheme: dark)')`
- Store theme preference in `chrome.storage.local`
- Add theme setting to `SettingsData` interface
- Listen for system theme changes with `matchMedia.addEventListener`

**CSS Architecture:**

- Implement CSS custom properties for theme values
- Create `:root` and `[data-theme="dark"]` variable sets
- Apply theme class to root `.side-panel` element

**Core Theme Variables:**

```css
:root {
  --bg-primary: #f5f5f5;
  --bg-secondary: #ffffff;
  --text-primary: #333333;
  --text-secondary: #666666;
  --border-color: #dddddd;
  --accent-color: #667eea;
  /* ... additional variables */
}

[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border-color: #404040;
  --accent-color: #8b9bff;
  /* ... additional variables */
}
```

**Theme Toggle Component:**

- Add theme toggle icon button in header (sun/moon icons)
- Position in top-right corner of side panel
- Implement smooth transition between themes (200ms)
- Update all components to use CSS variables instead of hard-coded colors

**Components Requiring Theme Updates:**

- Privacy banner gradient
- Tab active states
- Form inputs and selects
- Buttons (primary, secondary, danger)
- Message alerts (success, error, info)
- Summary container backgrounds
- Loading spinners and indicators

## Performance Considerations

- Use CSS transitions for smooth theme switching (200ms duration)
- Debounce theme preference saves to avoid excessive storage writes
- Lazy-load theme detection to avoid blocking initial render
- Minimize reflows during width optimization changes
- Cache theme preference to avoid storage reads on every render
