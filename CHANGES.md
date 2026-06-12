# UI Audit & Targeted Fixes — v2.045

## Audit summary

A "Sentinel" redesign (dark sidebar nav, design tokens, panel-based layout — see
`docs/README.md`) was already implemented for the **Context & Criteria** tab in earlier
sessions and is live on `main` as of v2.044. This session audited the rest of the app
against that baseline.

**Finding:** the Context tab is fully Sentinel-styled, but the other 15 tabs (Crime,
Assets, Threats, POI, Vulnerability, Impact, Controls, Risk Register, Residual Risk,
Summary, Dashboard, SBD, Methodology, Database, Settings) still rendered with the
pre-redesign visual language — different colours, radii, button styles, table headers,
focus rings and toast styling. The app effectively looked like two different products
depending on which tab you were on. That inconsistency was the single highest-impact
usability problem found.

Other issues identified but not all addressed this session (see "Left alone" below):
missing empty states on several lists, no loading/disabled states on async actions
(GitHub sync, crime-data fetch, exports), no sortable table headers, and ~1,600 inline
hex colours scattered through tab-specific JSX.

## What changed

**Design tokens applied app-wide (CSS-only, no logic changes).** The shared legacy CSS
block (`.card`, `.btn*`, `.score-*`, `.input*`, `.threat-table`, `.threat-chip`,
`.preset-btn`, `.lock-btn`, `.help-box`, `.crime-*`, `.toast`, `.vuln-grid`, `.matrix-*`,
table/typography defaults, etc.) used by all 15 non-Context tabs was remapped onto the
existing Sentinel tokens defined in `index.html`'s `:root`:

| Old (legacy) | New (Sentinel token) |
|---|---|
| `#0f172a`, `#1B2A4A` (dark navy backgrounds) | `var(--ink-0)` / `var(--ink-2)` / `var(--ink-3)` |
| `#1e293b` (primary text) | `var(--ink-1)` |
| `#64748b` (muted text) | `var(--s-muted)` |
| `#94a3b8`, `#cbd5e1`, `#d1d5db`, `#d4d4d4` (lighter muted/placeholder) | `var(--s-muted-2)` |
| `#e2e8f0` (borders) | `var(--s-line)` |
| `#f1f5f9`, `#f8fafc`, `#fafbfc` (subtle fills) | `var(--s-surface-2)` |
| `#fff`/`#ffffff` (surfaces) | `var(--s-surface)` |
| `#047857` (derived-column header, green) | `var(--ok)` |
| `#b45309` (vuln-col header, amber) | `var(--warn)` |
| `#EBF1F8`/`#4a5568` (crime threat-chip) | `var(--info)` tint |
| `#fef2f2`/`#dc2626`/`#fecaca` (danger/locked) | `rgba(185,28,28,…)` + `var(--vh-bg)` |
| Radii 5/6/8/10/12px | Sentinel scale: 3px (chips/buttons), 4px (inputs/cells), 6px (panels/cards) |
| `.section-title`/`.section-sub` (per-tab heading) | restyled to match the Context tab's `.ss-title`/`.ss-sub` typography (20px/600, muted subtitle) |

**Specific fixes:**
- Fixed a real contrast bug: `.threat-table thead th` (sticky column headers in the
  Threats/Vulnerability tables) inherited white text on a near-white sticky background —
  effectively invisible. Now uses `var(--ink-1)` on `var(--s-surface-2)`.
- Toast notifications, keyboard-focus rings (previously `#94a3b8`/`#1B2A4A`), the
  "locked" control state, and the terrorism/crime threat-category chip colours now use
  the same semantic tokens (`var(--accent)`, `var(--ok)`/`var(--warn)`/`var(--info)`,
  `var(--vh-bg)`) as the rest of the app.
- Removed ~70 lines of dead CSS left over from the pre-Sentinel tab bar: `.header`,
  `.header h1/.header-sub/.header-right`, `.nav`/`.nav button`/`.nav-num`, `.content`,
  `.grid-5`, `.grid-7`, and the unused `.app` rule — none of these were referenced by
  any rendered element after the sidebar replaced the old horizontal tabs.
- Replaced four hardcoded `#d4d4d4` empty-state text colours (Vulnerability and
  Treatments tabs, Summary export) with `var(--s-muted-2)`.

Bumped `VERSION` to `2.045` per project convention.

## Design tokens (unchanged, now applied consistently)

Defined once in `index.html` `:root` and documented in `docs/README.md`:
- **Surfaces/ink:** `--ink-0` … `--ink-3` (dark sidebar/header tones), `--bg-warm`,
  `--s-surface`, `--s-surface-2`, `--s-line`, `--s-muted`, `--s-muted-2`
- **Accent:** `--accent` (#b8381f, used sparingly for primary actions/active states),
  `--accent-soft`
- **Status:** `--ok`, `--warn`, `--info`
- **Risk severity (do not change — matches the existing risk matrix):** `--rv-bg`,
  `--lo-bg`, `--me-bg`, `--hi-bg`, `--vh-bg`
- **Type:** Inter Tight (UI), JetBrains Mono (IDs/dates/mono labels)
- **Radius scale:** 3px chips/buttons · 4px inputs/cells · 6px panels/cards
- **Spacing scale:** 4·8·12·16·20·28px

## Left alone (and why)

- **Per-tab component structure** — the 15 non-Context tabs still use their original
  markup (plain tables/cards rather than the `SPanel`/`SField` component system used by
  the Context tab). Porting each tab's JSX is a much larger, higher-risk change than a
  CSS remap and wasn't attempted this session; the CSS fix above already removes the
  jarring "two different apps" feeling for users.
- **~1,600 inline hex colours in tab-specific JSX** (e.g. `#1B2A4A` used throughout the
  Database editor, setup wizard, Word/Excel/Print export HTML strings) — left as-is.
  Many of these generate the Word export, which is the team's primary deliverable
  (per `todo`); changing export styling wasn't in scope and carries regression risk for
  that document.
- **Empty states, loading/disabled states on async actions, sortable table headers,
  form validation indicators** — real gaps identified in the audit, but each needs
  small JSX changes across many tabs; left as backlog items rather than rushed.
- **Login/auth UI** — authentication is handled by Vercel edge middleware
  (`middleware.js`, HTTP Basic Auth + session cookie), not by `index.html`. There is no
  in-app login screen to redesign; this is tracked separately as backlog item #14
  (`todo`).
- **Dark mode** — not added. The existing palette is a single warm-neutral light theme;
  adding a dark variant would mean doubling every token and wasn't requested as part of
  this consistency pass.

## Verification

CSS brace-balance checked programmatically; confirmed no remaining references to the
removed classes (`.header`, `.nav`, `.content`, `.grid-5`, `.grid-7`, `.app`) anywhere
in the file. Full browser verification (Playwright/Chromium) was attempted but blocked
by this sandbox's network policy, which denies the CDN hosts the app loads React and
fonts from (`cdnjs.cloudflare.com`, `fonts.googleapis.com`) — this is an environment
restriction, not related to the change. Recommend a quick visual check of a couple of
non-Context tabs (e.g. Threats, Risk Register, Dashboard) after deploy.
