---
description: "Use when: validating local website changes in this Astro project. Always restart the existing dev server instead of changing ports."
applyTo: "**"
---

# Local validation workflow

When validating changes in this project with the Astro dev server:

- Do not keep starting new dev servers on incremented ports.
- Stop any existing `npm run dev` / `astro dev` server before starting a new one.
- Reuse the standard local dev URL after restart, preferably `http://127.0.0.1:4321/` unless that port is intentionally occupied by another unrelated process.
- If a dev server shows stale Vite/Astro overlay errors after config changes, treat that as a signal to stop and restart the existing server, not to switch ports.
- After restart, verify the changed page in the browser and then run the relevant build/check command such as `npm run build` when appropriate.
