# Spec Requirements Document

> Spec: Chrome Extension Scaffold
> Created: 2025-08-29

## Overview

Establish a foundational Chrome extension structure with Manifest V3 configuration that supports side panel functionality and essential permissions. This scaffold will serve as the base for implementing the Briefcase extension's content extraction and summarization features.

## User Stories

### Developer Setup

As a developer, I want to set up the Chrome extension project structure, so that I can begin implementing the Briefcase features with a proper foundation.

The developer clones the repository, runs npm install, executes npm run build, and loads the unpacked extension from apps/extension/dist into Chrome. The extension appears in the toolbar and the side panel can be opened, confirming the basic structure is functional.

### Basic Extension Installation

As an end user, I want to install the extension in my Chrome browser, so that I can access the Briefcase side panel on any webpage.

The user enables Developer mode in Chrome, loads the unpacked extension, and sees the Briefcase icon appear in their Chrome toolbar. When clicked, the extension opens a side panel that displays a basic interface confirming the extension is active.

## Spec Scope

1. **Manifest V3 Configuration** - Create manifest.json with side panel support, required permissions (activeTab, scripting, storage), and Chrome 114+ compatibility
2. **Project Structure** - Set up the /apps/extension directory with subdirectories for sidepanel/, content/, background/, lib/, and styles/
3. **Build System** - Configure Vite with CRXJS plugin for extension bundling with TypeScript support and hot reload for development
4. **Basic Side Panel** - Implement minimal React/Preact side panel that loads and displays "Briefcase" confirmation
5. **Service Worker** - Create basic background service worker for message routing between components

## Out of Scope

- Content extraction functionality
- OpenAI integration or API key management
- Storage implementation beyond basic setup
- Actual summarization features
- UI styling beyond minimal structure

## Expected Deliverable

1. Extension loads successfully in Chrome with visible toolbar icon
2. Side panel opens when icon is clicked and displays basic interface
3. Build process generates valid extension package in apps/extension/dist
