# Briefcase v1 — Product Requirements Document

## 0) Overview

**Briefcase v1** is a Chrome side-panel extension that, on demand, extracts the main readable text from the active tab, summarizes it with a single cloud LLM provider, and stores both the extracted text and the generated summary **locally**. There is no cloud persistence by the extension.

**Primary outcome:** A fast, trustworthy "summarize this page" flow that works reliably on common article-like pages, with clear messaging when a page is unsupported.

**Principles**

* **Simple, Lovable, Complete:** ship the smallest product that feels whole.
* **Local-first privacy:** all data stored locally; content is sent only to the user's selected LLM provider (OpenAI in v1) for summarization.
* **Predictable failures:** unsupported pages fail fast with human-friendly explanations.

---

## 1) Goals & Non‑Goals

**Goals**

1. One-click summarization in a pinned side panel.
2. Local storage of the extracted text + summary for quick recall (recent list).
3. Minimal configuration: length and style toggles only.
4. Clear privacy posture (first-use banner) and a global "Delete all data" action.

**Non‑Goals (v1)**

* Full‑text search (FTS) across history.
* File exports, Drive sync, or cloud storage.
* A/B comparisons, multi-provider matrix, or model scoring.
* DOM anchor mapping or selection-mode extraction.
* Firefox/Edge/Safari support.

---

## 2) User & Use Cases

**Primary user:** Anyone reading long, information‑dense articles who wants a quick digest without leaving the page.

**Key use cases**

* While reading a complex article, the user opens the side panel, chooses Brief/Medium + Bullets/Plain, clicks **Summarize**, scans Key Points + TL;DR, then continues reading or moves on.
* Later the same day, the user opens **Recent** to revisit a summary of an earlier article.

**Success metric (qualitative)**

* Users report that summaries are helpful and fast, and the extension behaves predictably on supported vs. unsupported pages.

---

## 3) UX & Interaction

**Surface:** Chrome Side Panel, always available when the extension is pinned.

**Main panel layout**

* Header: page title (from extraction), URL, timestamp.
* Controls: **Length** (Brief, Medium), **Style** (Bullets, Plain).
* Primary action: **Summarize**.
* Output area: streaming **Key Points** followed by **TL;DR**.
* Footer: **Recent** (latest 20 items) with title, URL host, timestamp.

**States**

* Empty state: Explain the value; CTA to Summarize.
* Loading state: spinner + streamed tokens if available.
* Error/Unsupported: concise explanation and Retry (where applicable).

**First‑run privacy banner**

* Copy: "When you summarize, the extracted text from this page is sent to your selected model provider (OpenAI). Nothing is stored in the cloud by Briefcase."
* Dismiss options: "Got it" and "Don’t show again" (per device).

**Settings (inline or a small modal)**

* OpenAI API key input (required to summarize).
* Data: **Delete all data** (clears `chrome.storage.local`).

---

## 4) Functional Requirements

1. **Extraction**: Extract readable main content from the active tab using the content script (see addendum-a.md). If the content is too short/empty/inaccessible, surface a clear error.
2. **Summarization**: Send extracted text (capped by size) to OpenAI and stream the response into the UI. Use a single, fixed prompt skeleton with Length/Style modifiers.
3. **Storage (local-only)**: Save `{rawText, summaryText, title, url, createdAt, model, params}` in `chrome.storage.local`. Maintain a FIFO retention cap (e.g., 200 items). The UI **Recent** list shows the last 20.
4. **Privacy**: First-use banner before the first cloud call; no analytics/telemetry.
5. **Error handling**: Robust messages for extraction failure, network/model errors, missing API key, and timeouts. Include a Retry.

---

## 5) Constraints, Performance & Limits

* **Permissions:** `activeTab`, `scripting`, `storage` (Manifest V3). No `downloads`, no host permissions beyond activeTab.
* **Input cap:** Use the first **\~12k characters** of cleaned text for v1 (no chunking).
* **Latency target:** Extraction < 50 ms on typical article pages; perceived summarization starts < 1.5s (with streaming).
* **Retention:** Keep last 200 items; show only last 20 in UI.
* **Unsupported surfaces:** PDF viewers, cross‑origin iframes, app‑like pages with minimal readable text, closed shadow roots.

---

## 6) Data Model & Storage Semantics (v1)

**Storage backend:** `chrome.storage.local`

**Keys**

* `docs:index` → `string[]` of `id` (newest first)
* `doc:<id>` → `{ id, url, title, createdAt, rawText, summaryText, model, params }`
* `settings` → `{ apiKey?: string, hideCloudBanner?: boolean }`

**Operations**

* `upsert(doc)` → writes `doc:<id>` and updates `docs:index` (FIFO cap at 200)
* `get(id)`, `list({limit=20,before?})`, `remove(id)`, `count()`
* **Delete all data**: removes `docs:index`, all `doc:*`, and `settings`

**Migration**

* v2+ may migrate to SQLite/OPFS. A one‑time migrator reads `docs:index` and `doc:*`, bulk‑inserts into SQLite, sets `migratedV2=true`, then optionally clears old keys.

---

## 7) Privacy & Security

* The extension stores content only on the device (`chrome.storage.local`).
* Summarization sends page text to OpenAI using the user’s API key.
* No analytics, no third‑party beacons.
* API key stored locally; removed by **Delete all data**.
* Consider optional passphrase-based encryption in a near‑term minor release.

---

## 8) Accessibility & i18n

* Keyboard: focusable controls, `Enter` to summarize, `Esc` to dismiss modals.
* Labels: aria‑labels for toggles and actions.
* Language: send text to the model as-is; the model infers language. UI static strings are English in v1.

---

## 9) Definition of Done & Acceptance Criteria

**DoD**

* From fresh install, user can pin the side panel, enter an API key, and successfully summarize a typical article.
* Summary streams into **Key Points** and **TL;DR**, both persisted locally.
* Recent list shows the new item; clicking it loads the saved output and metadata.
* First cloud call shows the privacy banner once (until dismissed).
* **Delete all data** clears storage and the UI reflects the empty state.

**Acceptance checks**

* Supports a test matrix of article-like pages across 10–15 common domains with ≥ 90% successful extraction.
* Fails fast (≤ 3s) with clear messages on PDFs, cross‑origin iframes, and app‑like pages.
* Meets the stated permission set; no unexpected permission prompts.

---

## 10) Risks & Mitigations

* **CSR/SPA timing issues** → Stabilize DOM with MutationObserver + stability window; expose a quick Retry.
* **Extraction misfires** → Readability first, simple heuristic fallback (largest visible content block) with minimum content guardrails.
* **Cross‑origin frames** → Declare unsupported in v1; selection-mode or broader host perms are roadmap items.
* **Oversized inputs** → Cap text and avoid chunking in v1.
* **User trust** → First-use cloud banner + clear Delete-all.

---

## 11) Roadmap (not in v1)

* **v1.1**: Selection-based summarization; optional API-key encryption; small UX polish (re-run with different settings).
* **v2**: SQLite/OPFS + FTS search; richer history; basic filters.
* **v3**: Multi-provider (OpenRouter, local models); A/B compare; export.