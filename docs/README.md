# Handoff: Sentinel — Security Risk & Threat Assessment Tool Redesign

## Overview

Redesign of the in-house Security Risk & Threat Assessment Tool. Goal is to replace the current dense 16-tab horizontal interface with a grouped sidebar + workflow stepper layout, give the analyst persistent visibility of completion/gating blockers, and fix specific visual issues flagged by the team (treatment-category chip soup, flat hierarchy, cluttered toolbar).

The redesign targets the Context & Criteria screen as the hero, with Dashboard, Risk Register, and Threats included to show the system extending across the app.

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, **not production code to copy directly**.

Target stack is **React + Python hosted on Vercel**. The task is to recreate these HTML designs in that React codebase using its established patterns (component library, routing, state, etc.). If no conventions are established yet, implement with:

- **Tailwind CSS** for styling (or CSS modules)
- **React Router** for the tab/sidebar navigation
- **Lucide-react** for icons (the HTML uses custom inline SVGs; swap them 1:1 for named Lucide icons of equivalent stroke weight — 1.5px, 16px base)
- **Zustand** or React context for cross-screen state (active nav item, project metadata, completion progress)

Do not ship the inline-style HTML prototypes directly.

## Fidelity

**High-fidelity.** Colors, typography, spacing, and interaction details are all specified. Recreate pixel-perfectly using the codebase's libraries.

## Design Tokens

### Color — neutral palette
```
--ink-0:    #0a0e14   /* header + sidebar background */
--ink-1:    #111824   /* primary text */
--ink-2:    #1a2332   /* dark surfaces in dark mode */
--ink-3:    #2a3649   /* borders in dark mode */
--bg:       #f5f3ee   /* app background (warm neutral) */
--surface:  #ffffff   /* cards, panels, inputs */
--surface-2:#fafaf6   /* table header rows, subtle wells */
--line:     #e4e2db   /* default 1px border */
--muted:    #6b7280   /* secondary text */
--muted-2:  #9aa3af   /* tertiary text */
```

### Color — single brand accent
```
--accent:       #b8381f   /* signal red — primary buttons, active nav, key CTA */
--accent-soft:  rgba(184,56,31,.08)   /* accent fills, hover */
```

### Color — risk severity (MUST NOT CHANGE — these match the existing tool)
Classic green→yellow→orange→red risk matrix palette. Used for severity badges, matrix cells, trend lines, and the preliminary-posture bar.
```
low:      #2ecc71
med:      #f1c40f
high:     #e67e22
crit:     #c0392b
```
Matrix cell color is derived from `L + C` (likelihood + consequence, each 1–5):
- sum ≥ 9 → `#c0392b` (extreme)
- sum ≥ 7 → `#e67e22` (high)
- sum ≥ 5 → `#f1c40f` (medium)
- sum ≥ 3 → `#8bc34a` (low)
- else   → `#2ecc71` (very low)

All 25 matrix cells are always rendered with their graded color, even when the cell count is 0.

### Color — status tokens
```
ok:    #1f7a4d   /* completed checkbox, "Accept" status pill */
warn:  #c47a0b   /* Treat status pill, in-progress markers */
info:  #2d5b8c   /* Monitor status pill */
```

### Typography
- **UI:** `Inter Tight`, weights 400/500/600/700. `font-feature-settings: 'ss01','cv11'`
- **Mono (IDs, dates, counts):** `JetBrains Mono`, weights 400/500/600

Scale:
```
Display (section h1):   24px / 600 / -.015em   letterspacing
Section h2:             13.5px / 600 / -.005em
Body:                   12.5px / 400 / 1.5 line-height
Label (uppercase micro):10.5px / 600 / .04em   uppercase
Nav item:               12px / 400 (500 when active)
Mono identifier:        11–11.5px / 500
```

### Spacing scale
`4 · 8 · 12 · 16 · 20 · 28` (px). Panel internal padding = 16. Section gap = 16. Canvas gutter = 28.

### Radius
```
chips, buttons:   3px
inputs, cells:    4px
panels, cards:    6px
```
Never use fully rounded corners.

### Field heights (density tokens)
```
compact:      34px
comfortable:  38px   (default)
spacious:     42px
```

### Shadows
Used sparingly. Only on the primary "Next" CTA:
```
0 0 0 1px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.15)
```

---

## Information Architecture

### Navigation
Replace the current 16 horizontal tabs with a **232px left sidebar** grouped by phase:

- **Project** — Context, Criteria & Tolerances, Assets, Threats, Points of Interest, Attractiveness / Vuln.
- **Analysis** — Impact, Existing Controls, Risk Register, Residual Risk & Treatments
- **Outputs** — Summary, Dashboard, SMS Requirements
- **System** — Methodology, Database, Settings

Each item has an icon + label + optional count badge. Active state: left 2px accent bar, `rgba(184,56,31,.14)` row fill, accent-colored icon.

The sidebar also contains a **Project card** at the top showing project number, stage (with animated dot), and a 42% completion progress bar.

### Breadcrumb
Top bar: `Workspace › Client › Project Name` + draft/revision badge. Replaces the current "Security Risk & Threat Assessment Tool" title.

### Workflow stepper
Below the screen header, a 7-step horizontal stepper: `Context → Criteria → Assets → Threats → Analysis → Treatments → Report`. Completed = green tick, current = accent-filled, future = outlined. Shows progress through the overall ISO 31000 workflow.

---

## Screens

### Screen 1 — Context & Criteria (hero)
**Purpose:** Define scope, objectives, and risk appetite for the assessment.

**Layout** (960px+ main content area):
- Section header strip (section number `01 · CONTEXT`, ISO 31000 badge, title `Context & Criteria`, edit/author metadata)
- Workflow stepper (40px tall)
- Two-column body: `1fr 320px` — forms on the left, persistent sidecar on the right, 20px gap.

**Left column (sequential Panels):**
1. **Panel 1.1 — Project Details** — 2-column grid of fields (Project name, Number, Support reference, Date, RMS stage, Revision, Client, Site address, Province, Country, Consignment type spans 2 cols). Plus a **Treatment Categories** row below.
2. **Panel 1.2 — Scope & Assumptions** — two textareas.
3. **Panel 1.3 — Analyst Notes** — one textarea, Summarize + AI Prompt buttons in header.
4. **Panel 1.4 — Stakeholder Meetings** — compact table (Date · Meeting · Attendees · actions), `+ Add meeting` dashed-border button below.
5. **Panel 1.5 — Area Analysis** — AI-assisted briefing card with Copy prompt / Paste response / Open ChatGPT buttons.

Each panel:
- White surface, 1px `--line` border, 6px radius
- Header row with mono section number (`1.1`), bold title, optional subtitle, right-aligned action buttons
- 16px internal padding

**Right column (Sidecar):**
1. Section completion card — 56px SVG donut showing 78%
2. Required-fields checklist — 7 items with ✓/○
3. Preliminary posture bar — 4 severity counts (Low 8, Med 14, High 5, Crit 1) rendered as proportional bars using the severity palette
4. Related references — ISO 31000, NaCTSO bulletin, previous assessment (each with external-link icon)

### Screen 2 — Dashboard
KPI row (4 tiles: Total risks, Critical, Open actions, Avg. residual) + 5×5 risk matrix (always render all cells, graded by `L+C`) + Top risks list + 12-week trend chart with stacked severity lines.

### Screen 3 — Risk Register
Filter chip row + dense table: ID (mono) · Risk · Category · Asset · L×C (mono) · Severity (pill with color dot) · Controls linked · Status pill (Treat / Accept / Monitor).

### Screen 4 — Threats
3-column card grid per threat: ID (mono), name, actor chip, 5-segment likelihood meter in accent, up/down trend indicator, linked-assets count.

---

## Specific Fixes (from before/after)

### 1. Toolbar clutter
Current: 9 unlabeled similar-weight buttons. Fix: 3 grouped tiles + 1 primary CTA.
- Group 1: Save (primary within group) + Load
- Group 2: Export (dropdown with Word / Excel)
- Group 3: Print + Setup
- Primary: filled-accent "Next: Criteria" button on the far right

### 2. Tab overload
Replaced by grouped sidebar. See Information Architecture above.

### 3. Treatment categories — "colored chip soup"
**Do not use arbitrary bright colors.** Replace with a consistent legend:
- 5 categories: Procedures (P), Electronic Sys. (E), Physical Struct. (S), Response (R), Training (T)
- Each rendered as a button with a mono glyph square + name + optional ✓
- Selected: dark ink fill, white text, 20×20 accent glyph box
- Unselected: transparent, muted text, line border, neutral glyph box

### 4. Flat hierarchy
Fixed by panel system (named numbered sections), uppercase micro-labels, monospace for identifiers, and clear table chrome (surface-2 header row, consistent row height, mono dates).

### 5. Weak headline
Section header strip now has: section number + ISO clause badge + large (24px) title + subtitle + edit metadata on the right.

### 6. Dead table empty states
Empty tables now use dashed-border "+ Add X" buttons in the panel body rather than in-table filler text.

---

## Interactions & Behavior

- **Sidebar nav:** click → sets active screen, syncs URL `/projects/:id/:tab`
- **Stepper:** click completed step → navigate to it; current and future cannot be clicked directly unless required fields are met
- **Treatment chips:** toggle on/off (writes to project settings)
- **Save:** autosave on blur + 5s debounce. Show "Saved 2 min ago" in sidebar "Auto-saved" card. Manual Save triggers a server commit.
- **Completion donut:** re-computes on every field change; animates with `transition: stroke-dasharray .6s`
- **Required checklist:** cross-linked — clicking an unchecked item scrolls the relevant panel into view and highlights the field
- **Risk matrix:** hovering a cell shows tooltip `"L=X · C=Y · N risks"`; clicking drills to Risk Register pre-filtered
- **AI Prompt Copy:** copies a structured prompt to clipboard, shows a 2s confirmation toast
- **Paste response:** opens a modal with a textarea + "Parse" button that converts markdown to structured area-analysis data

---

## State Management

Project-scoped state (Zustand store):
```
{
  project: { id, name, number, stage, revision, client, siteAddress, ... },
  treatments: { proc: bool, elec: bool, phys: bool, resp: bool, train: bool },
  completion: { sections: { '1.1': .78, ... }, requiredFields: [...] },
  meetings: [...],
  risks: [...],
  activeNav: 'context',
}
```

Autosave middleware: every mutation emits a debounced `PATCH /api/projects/:id`.

---

## Files in this bundle

- `Redesign.html` — the root demo file (uses a DesignCanvas wrapper to show all screens side by side)
- `variation-a.jsx` — the chosen "Sentinel" direction. Contains the full Context & Criteria screen + all sub-components
- `other-screens.jsx` — Dashboard, Risk Register, Threats screens
- `primitives.jsx` — icon set, nav structure, treatment categories, sample data
- `before-after.jsx` — annotated current-state recreation with 6 numbered issues
- `app.jsx` — app shell (DesignCanvas composition + Tweaks panel)
- `design-canvas.jsx` — presentation wrapper only, **not part of the product** — ignore when porting

### What to port
From `variation-a.jsx`: the `VariationA` component and every helper it uses (`Panel`, `Field`, `TextArea`, `SideCar`, `Stepper`, `ToolbarGroup`, `TBIconBtn`).
From `other-screens.jsx`: `ScreenDashboard`, `ScreenRiskRegister`, `ScreenThreats`, `HeatMap`, `TrendChart`, `SevDot`, and the `sevColor`/`sevBg` helpers.
From `primitives.jsx`: the `Icons` set (swap for Lucide-react equivalents), `NAV_SECTIONS`, `TREATMENT_CATEGORIES`, sample data shape as TypeScript interfaces.

### What NOT to port
- Inline styles — translate to Tailwind classes or CSS modules
- `window.X = X` globals — use proper ES module exports
- The `SAMPLE` data — wire to the real API
- `design-canvas.jsx` and `before-after.jsx` — presentation artifacts only

---

## Open questions for the PM

- Is the 7-step workflow stepper the actual ISO 31000 process order, or should it match your internal SRA methodology verbatim?
- Treatment Categories glyph letters (P·E·S·R·T) — confirm or adjust
- Are severity labels `Low/Med/High/Crit` or do you use `Insignificant/Minor/Moderate/Major/Catastrophic`?
- Should the "Next" CTA be blocked when required fields are incomplete, or just warn?
