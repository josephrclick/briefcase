# Spec Requirements Document

> Spec: OpenAI Integration
> Created: 2025-08-31

## Overview

Implement OpenAI API integration with streaming token display to enable real-time AI-powered text summarization. This feature will allow users to connect their OpenAI API key and receive streaming summaries of extracted web content, maintaining privacy through local key storage.

## User Stories

### Summarize Web Content with OpenAI

As a knowledge worker, I want to use my OpenAI API key to summarize web articles, so that I can quickly understand content without reading everything in detail.

The user opens the Briefcase side panel while viewing a web article. After entering their OpenAI API key in settings, they click the "Summarize" button. The extension extracts the article text, sends it to OpenAI's API, and displays the summary with key points and TL;DR sections as tokens stream in real-time. The summary is then stored locally alongside the original extracted text.

### Configure OpenAI Settings

As a user, I want to securely configure my OpenAI API key and summarization preferences, so that I can customize how content is processed.

The user navigates to the settings panel and enters their OpenAI API key, which is validated and stored locally in chrome.storage.local. They can select summarization parameters like length (brief/medium) and style (bullets/plain text). A privacy notice clearly explains that article text will be sent to OpenAI when summarizing.

## Spec Scope

1. **OpenAI Provider Implementation** - Create provider class implementing the summarize interface with streaming support
2. **API Key Management** - Secure storage and validation of OpenAI API keys in chrome.storage.local
3. **Streaming UI** - Real-time token display as responses stream from OpenAI API
4. **Settings Configuration** - UI for API key input and summarization parameter selection
5. **Privacy Notice** - Cloud usage banner explaining data transmission to OpenAI

## Out of Scope

- Multiple AI provider support (only OpenAI for now)
- Text chunking for content over 12k characters
- Custom prompt configuration
- Usage tracking or analytics
- Batch summarization of multiple articles

## Expected Deliverable

1. Working OpenAI API integration that successfully summarizes extracted web content with visible streaming tokens
2. Settings panel where users can enter and validate their OpenAI API key with proper error handling
3. Privacy banner that displays when cloud summarization is enabled
