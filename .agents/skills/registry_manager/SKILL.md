---
name: registry-manager
description: Explains how to add, modify, or rebuild pages in the pages.json registry. Activate when the user asks to add a new page or document to the site.
---

# Managing the Pages Registry

This project uses a custom build pipeline instead of standard Astro file-based routing for its document collection. 

## The Source of Truth: `pages.json`
All documents in the collection are registered in `pages.json`. 
Astro routes like `/` (about), `/tried`, and `/admin` are standalone, but everything under `/pages/` or the root collection uses this registry.

## Page Types (Modes)
When adding a page, you must understand the `type` or `mode`:
1. `"type": "local", "mode": "passthrough"`: A complete, standalone HTML document (with `<html>`, `<head>`, etc.) located in the `pages/` directory. The build script (`tools/prepare.mjs`) copies it directly to `public/`.
2. `"type": "local", "mode": "embed"`: An HTML fragment. Rendered inside the Astro `Frame.astro` layout.
3. `"type": "import", "mode": "passthrough" | "embed"`: Fetched from an external URL during `npm run import`.

## How to Add a Page
To add a new page, use the interactive CLI tool:
```bash
npm run add
```
Alternatively, manually add the entry to `pages.json` and place the HTML file in the `pages/` directory.

## Build Process
- `npm run dev` and `npm run build` will automatically run `tools/prepare.mjs`.
- `tools/prepare.mjs` handles copying `pages/` content into `public/` and injecting the back-navigation pill (`chrome.mjs`).
- If you modify `pages.json`, you must restart the dev server or run `node tools/prepare.mjs` for the changes to take effect.
