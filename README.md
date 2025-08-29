⚠️ **Work in Progress (Pre-Alpha)**

This extension is under active development. It’s not production-ready and APIs/UI may change without notice.
If you’re exploring the code, great! If you’re expecting a stable tool, please wait for v1.0.

---

# 🕵️ Briefcase: Your Side-Panel Spy

_tap tap tap_ 📎

Psst. You there. Drowning in an article the size of a small moon? Hand it to me. I’m **Briefcase**, your friendly side‑panel field agent. I slip into the page, lift the important bits, and return with a crisp dossier: **Key Points** + **TL;DR**. Then I stash it **locally** like a squirrel with secrets.

---

## 🎯 Mission

Deliver a fast, trustworthy **“summarize this page”** button that works on most article‑like pages, stores results **only on your device**, and bows out gracefully when a page is too weird to infiltrate.

- **Surface:** Chrome **Side Panel**
- **Data:** Stored in `chrome.storage.local` (no cloud storage by the extension)
- **Model:** OpenAI (your API key) for v1
- **Privacy:** First‑use banner clarifies that extracted text is sent to your chosen provider

---

## ✨ Features

- **One‑click summarize** (Length: **Brief** / **Medium**; Style: **Bullets** / **Plain**)
- **Streaming output**: see **Key Points** first, then **TL;DR**
- **Local‑only storage** with a tidy **Recent** list (last 20 shown, total history capped at 200)
- **Friendly failures** on PDFs, app‑like pages, and inaccessible iframes
- **Minimal setup**: paste your API key, push the shiny button

---

## 🗺️ How the op runs

```
Infiltration → Interrogation → Debrief → Filing
```

1. **Infiltration** 🥷
   I wait for the page to settle, then extract the main article body. If the content is tiny, locked in a cross‑origin iframe, or disguised as a PDF, I bow out quickly with a polite message.

2. **Interrogation** 🗣️
   The extracted text (trimmed for size) is sent to your selected model. You pick **Length** and **Style**; I stream back **Key Points** and then a **TL;DR**.

3. **Debrief** 🗒️
   You scan, nod thoughtfully, and pretend you always knew this.

4. **Filing** 🗂️
   I save the raw text + summary to `chrome.storage.local`. Later, **Recent** lets you revisit your last few missions without breaking cover.

---

## 🔐 Privacy, with actual spine

- Your content lives **only on your device** in `chrome.storage.local`.
- Summarization sends the extracted text to your chosen provider (OpenAI) using **your** API key.
- **No telemetry.** No analytics. No secret tunnels.
- **Delete All Data** is one big red button.

---

## 🧰 Requirements & Permissions

- **Chrome** (Manifest V3), Side Panel enabled
- **Permissions:** `activeTab`, `scripting`, `storage`
- **No** `downloads` or broad host permissions

---

## 🚀 Install (even an undercover goldfish can do it)

1. **Clone & build**

   ```bash
   git clone https://github.com/josephrclick/briefcase
   cd briefcase/apps/extension
   npm install
   npm run build
   ```

2. **Load**
   - Open `chrome://extensions`
   - Toggle **Developer mode**
   - Click **Load unpacked** → select `apps/extension/dist`

3. **Pin**
   - Pin the Briefcase icon so I don’t wander off

4. **Key**
   - Open the side panel → paste your **OpenAI API key**
   - Summarize something gloriously long

_(Build tooling: Vite + CRXJS. React or Preact for the panel. TypeScript everywhere.)_

---

## 🧭 Usage

- Choose **Length** (Brief/Medium) and **Style** (Bullets/Plain)
- Hit **Summarize**
- Read **Key Points** → **TL;DR**
- Revisit via **Recent** (last 20 visible; total history capped at 200)

---

## 🚦 Known limits

- **PDF viewer tabs:** not supported (yet)
- **Cross‑origin iframes / closed shadow roots:** out of reach by design
- **App‑like pages** (mail, dashboards, design tools): often not “readable” content
- **Very long pages:** input is capped to keep your costs and latency sensible

When in doubt, I fail **fast** and **clearly** so you don’t waste clicks.

---

## 🔧 Under the hood (for curious handlers)

- **Extraction:** Mozilla Readability with a lightweight fallback heuristic
- **Stability check:** waits briefly for DOM to stop shapeshifting
- **Summarization:** OpenAI via your key; streaming UI if supported
- **Storage:** `chrome.storage.local` with FIFO retention

---

## 🧰 Settings

- **Model key:** stored locally; never logged
- **Delete All Data:** wipes `docs:index`, all `doc:*`, and settings
- **Cloud‑call banner:** appears the first time, then you can hide it (per device)

---

## 🧪 Testing

- Manual smoke across common news/blog/docs domains
- E2E checks on CSR pages, login walls, PDFs, and iframes for clear failures

---

## 🗺️ Roadmap (promises we intend to keep)

- **v1.1:** Selection‑based summarization; small UX niceties; optional API‑key encryption
- **v2:** SQLite on OPFS + **FTS** search; exports; model picker (OpenRouter/local)
- **v3:** Fancy extras (A/B compare, anchors, filters) once the core is boringly solid

---

## 🐛 Bugs & contributions

Found a gremlin? File an issue, open a PR, or attach a tiny sticky note to my briefcase. I’ll get to it between missions. If I merge your fix upside‑down, gently rotate the repository 180°.

---

**Briefcase™** — _“I’m helping!”_ 📎
