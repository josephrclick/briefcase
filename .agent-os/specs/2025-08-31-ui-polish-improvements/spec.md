# Spec Requirements Document

> Spec: UI Polish and Workflow Improvements
> Created: 2025-08-31

## Overview

Implement UI/UX improvements to streamline the extension's workflow and enhance visual polish before v1 release. These changes focus on reducing friction in the user journey, optimizing screen real estate, and adding modern conveniences like dark mode support.

## User Stories

### Simplified API Key Configuration

As a new user, I want to save my API key immediately after validation, so that I don't accidentally navigate away without saving and have to re-enter it.

When I enter my API key and click "Test Connection", if the connection is successful, the button should transform to "Save Key" allowing me to immediately persist my validated key. This eliminates confusion about whether my key was saved and reduces the two-step process (test then save) to a single action after successful validation.

### One-Click Summarization

As a user browsing web content, I want to extract and summarize pages in one action, so that I can quickly get insights without multiple clicks.

When I click "Extract & Summarize" on the Summarize tab, the extension should automatically extract the page content and immediately begin streaming the summary without requiring me to click a second "Summarize Page" button. This creates a seamless flow from intent to result.

### Streamlined Settings Experience

As a returning user with a configured API key, I want to see only relevant settings, so that I'm not distracted by configuration I've already completed.

After successfully validating and saving an API key, the OpenAI Configuration section should be collapsed by default in the Settings tab, with a clear "Change API Key" button available if I need to update credentials. This keeps the interface clean for regular use while maintaining accessibility.

### Optimized Reading Experience

As a user reading summaries, I want maximum use of the side panel width, so that I can comfortably read longer text without excessive scrolling.

The side panel should minimize unnecessary padding and margins, particularly in nested containers, to maximize the readable area for extracted content and summaries. This is especially important for the narrow side panel format.

### Dark Mode Support

As a user who prefers dark interfaces or works in low-light conditions, I want the extension to respect my system preference and allow manual theme switching, so that I can use the extension comfortably in any environment.

The extension should automatically detect and apply my system's dark/light mode preference on first load, with a theme toggle icon in the UI header allowing me to override this preference. The setting should persist across sessions.

## Spec Scope

1. **API Key Save Flow** - Transform "Test Connection" button to "Save Key" after successful validation, combining test and save actions
2. **Combined Extract & Summarize** - Automatically trigger summarization after successful content extraction when using the main action button
3. **Conditional Settings Display** - Hide OpenAI configuration after successful setup with option to reveal via "Change API Key" button
4. **Width Optimization** - Reduce padding and margins throughout the UI to maximize content display area
5. **Dark Mode Implementation** - Add system preference detection, manual toggle, and comprehensive dark theme styles

## Out of Scope

- Major layout restructuring or navigation changes
- Additional API provider support beyond OpenAI
- New features or functionality beyond UI improvements
- Mobile or responsive design considerations
- Internationalization or localization

## Expected Deliverable

1. Single-action API key validation and save workflow that reduces setup friction
2. One-click extract and summarize functionality accessible from the idle state
3. Dark mode support with system preference detection and manual toggle, with all UI elements properly themed
