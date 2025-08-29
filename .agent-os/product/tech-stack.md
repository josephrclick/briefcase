# Technical Stack

## 1) Platform & Packaging

* **Chrome-only**, Manifest V3, minimum Chrome 114.
* **Side Panel** UI for the main experience.
* Build with **Vite** + **CRXJS** (vite-plugin) and **TypeScript**.

## 2) App Structure

```
/apps/extension
  /manifest.json
  /sidepanel/       # React app for the panel (or lightweight TS + Preact)
  /content/         # content script for extraction
  /background/      # service worker (routing, minimal)
  /lib/             # storage repo, providers, utils
  /styles/
```

## 3) Key Dependencies (minimal)

* **React/Preact** for the side panel UI (choose one; Preact slim if footprint matters).
* **Readability** for content extraction (content script).
* **OpenAI client** (or `fetch`) for summarization calls.
* **uuid** (or nanoid) for IDs.
* **zod** (optional) for runtime validation of stored objects.

## 4) Storage Layer (v1)

* Backend: `chrome.storage.local`.
* Repo interface: `init`, `upsert`, `get`, `list`, `remove`, `count`.
* Keys: `docs:index`, `doc:<id>`, `settings`.
* FIFO retention cap at 200; Recent view shows last 20.

## 5) Provider Layer

* **Provider interface** (future-friendly): `summarize({text, params}) → stream`.
* **OpenAI implementation (v1)** using user-supplied API key.
* Prompt skeleton:

  * System: "You are a concise, accurate summarizer."
  * User content: article text (truncated to the cap).
  * Controls: Length (brief/medium), Style (bullets/plain) adjust instructions.
  * Output sections: **Key Points**, **TL;DR**.
* Streaming UI renders tokens as they arrive.

## 6) Permissions

* `activeTab`, `scripting`, `storage`.
* No `downloads`, no host permissions beyond activeTab.

## 7) Security & Privacy Hygiene

* API key stored locally; never logged.
* No analytics; optional **Debug mode** gated behind a local toggle to show internal extraction stats in DevTools only.
* CSP: default MV3 CSP; avoid `unsafe-eval`. Keep remote code out.

## 8) Error Handling & Resilience

* Extraction failures surface typed errors with retry guidance.
* Provider failures (network, keys, rate limits) display their error message and a **Retry**.
* Empty/short content returns a friendly unsupported message.

## 9) Testing Strategy

* **Unit**: extraction normalizer, storage repo, provider wrapper.
* **Integration (E2E)**: mock pages representing common patterns (static article, CSR article, login wall, PDF, iframe), verify outcomes and messages.
* **Manual smoke** on 10–15 popular domains.

## 10) Release & Rollout

* Internal build → Chrome unpacked load → dogfood.
* Sign-off checklist: permissions, cloud banner, Delete-all, success/failure messages.
* Publish to Chrome Web Store (unlisted → listed after feedback), with a short privacy policy describing the local-only storage and cloud summarization call.

## 11) Migration Path (v2+)

* Add SQLite (WASM) on OPFS, provider-neutral repo adapter.
* One-time migrator from `chrome.storage.local` to SQLite.
* Enable FTS and filters in the side panel.

---

**Appendix: Copy Snippets**

* Cloud banner: "When you summarize, we send the extracted text from this page to your selected model provider (OpenAI). Briefcase stores your data only on this device."
* Unsupported (PDF): "This appears to be a PDF viewer, which isn’t supported yet."
* Unsupported (inaccessible): "This page’s main content isn’t directly accessible to extensions."
* Too short: "We couldn’t find a readable article here."
* Timeout: "The page is still loading content. Dismiss banners or wait, then Retry."