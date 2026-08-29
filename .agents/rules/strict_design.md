---
name: strict-design
description: Enforces the core design system constraints for the HTML-DOCS-TO-Learn project
trigger: always_on
---

# Design System Constraints

When writing or modifying UI code in this project, you MUST adhere to the following strict constraints from `DESIGN.md`:

1. **A directory, not a dashboard**: Do NOT use cards, shadows, or rounded elevated containers for layout. Use alignment and 1px hairlines (`border-bottom: 1px solid var(--border)`) to group content.
2. **One accent color**: Teal (`--accent`) is spent ONLY on interactive states (hover, focus, active). NEVER use it as decoration. Do not introduce new colors into the palette.
3. **Typography**: Use `--serif` (Source Serif 4) for prose and reading content. Use `--mono` (IBM Plex Mono) for machine facts (routes, dates, counts, labels). 
4. **CSS Tokens**: All colors must use CSS custom properties from `tokens.css` (e.g., `var(--bg)`, `var(--text)`, `var(--muted)`, `var(--faint)`, `var(--accent)`). Never hardcode hex values in `.astro` files (except in isolated build tools like `chrome.mjs`).
5. **No JS Bloat**: Prefer CSS for interactions. Respect `prefers-reduced-motion`. Do not add heavy client-side libraries without explicit permission.

If you are unsure about a design choice, review `DESIGN.md` in the repository root.
