## Addendum A — Extraction Component

**Purpose:** Maximize success on article-like pages while failing predictably elsewhere.

### A1. Flow overview

1. **Wait for stability**

* After `document.readyState !== "loading"`, attach a MutationObserver to `body`.
* Sample visible text length every 100ms; declare stable if it changes ≤ 5% over 500ms (≤ 3s max wait). Provide a Retry if timed out.

2. **Extract**

* Primary: clone `document`, run **Readability** to get `{ title, content }`.
* Fallback heuristic if Readability yields too little or looks like boilerplate:

  * Evaluate candidates: `article`, `main`, `[role=main]`, common content classes (e.g., `.content`, `.post`), ranked by visible text length.
  * Pick the largest block with ≥ 800 visible characters and a sane title.

3. **Normalize**

* Convert HTML → plain text, preserving paragraphs and simple list bullets.
* Strip scripts/styles/nav/footer/ads; collapse whitespace; keep short code blocks but elide long ones.

4. **Gatekeep**

* If `charCount < 800` or text appears inaccessible (cross-origin iframe or closed shadow root), return an unsupported error.
* Detect PDFs and special viewers via `document.contentType` and URL.

5. **Deliver**

* Return `{ title, url, text, meta: { charCount, paragraphs } }` to the side panel for summarization.

### A2. Messaging (examples)

* **Unsupported (PDF):** "This looks like a PDF viewer, which isn’t supported yet."
* **Unsupported (iframe/shadow):** "This page’s main content isn’t directly accessible to extensions."
* **Too short:** "We couldn’t find a readable article here."
* **Timeout:** "The page is still loading content. Dismiss banners or wait, then Retry."

### A3. Performance notes

* Do minimal DOM walking; cache candidate nodes once; ignore hidden/offscreen nodes when counting.
* Target extraction under 50 ms on typical news/blog pages.