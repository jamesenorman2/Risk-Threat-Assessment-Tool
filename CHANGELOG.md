# Changelog

All notable changes to the Risk & Threat Assessment Tool are recorded here.

---

## v2.050 — 2026-06-16
**Keyboard bulk scoring: whole row/column apply + copy-down (backlog #17)**
- Scoring grids (Assets, Threats, Vulnerability, Controls, Residual Risk, Impact) now support bulk keyboard entry on top of the existing 1-5/arrow-key scoring: Shift+1-5 sets every score cell in the current row (e.g. all criteria for one asset) to that value in one keypress; Alt+1-5 sets the same column position across every row of the table (e.g. one criterion for every threat); Ctrl/Cmd+D copies the focused cell's value into the cell directly below and moves focus there for rapid fill-down
- Useful for large grids where many threats/assets share the same score for a given criterion — previously every cell had to be set individually
- The "⌨" keyboard-shortcut hint shown above each scoring grid now lists the new shortcuts

## v2.049 — 2026-06-16
**Dashboard risk-profile cards now click through to a filtered Risk Register (backlog #4)**
- The five risk-count cards in the Dashboard's "Pre-Mitigation Risk Profile" matrix (Very High/High/Medium/Low/Very Low) are now buttons — clicking one jumps to the Risk Register tab pre-filtered to that severity
- Risk Register shows a banner while a filter is active, naming the severity and with a "✕" to clear it back to the full list
- R# row numbers stay consistent with the unfiltered list (and with the dashboard matrix's own R# labels) while filtered, instead of renumbering from 1

## v2.048 — 2026-06-14
**QA / completeness gate before export (backlog #9)**
- Word and Excel export now run a completeness check first: empty project/client name, no assets, no threats, threats missing a Threat Assessment/Vulnerability/Impact score, and High/Very High risks with no residual score or ALARP justification
- If anything is flagged, a confirm dialog lists the issues and lets the assessor export anyway or go back and fix them first — nothing is blocked outright, this only surfaces gaps that were previously silent

## v2.047 — 2026-06-14
**Accessibility: focus trap on all modals + screen-reader labels (backlog #16)**
- All four modal dialogs (Confirm, Setup Wizard, Assessments manager, Load from Back-ups) now trap Tab/Shift+Tab focus inside the dialog while open and restore focus to the trigger element on close, instead of letting keyboard focus escape to the page behind them
- The Setup Wizard now has a proper `role="dialog"`/`aria-modal` and closes on Escape (previously it had neither)
- Toast notifications now use `role="status" aria-live="polite"` so screen readers announce them
- Score buttons (1-5 scoring grids used throughout Vulnerability/Threats/Risk Register) are now `role="radio"`/`role="radiogroup"` with `aria-label`/`aria-checked` describing the value and its meaning, not just a hover tooltip

## v2.046 — 2026-06-12
**Fix: mobile pinch-zoom getting stuck after tapping a form field**
- On Android/iOS, all form inputs, dropdowns and textareas rendered below the 16px threshold (12.5px, per the Sentinel type scale). Tapping into any field on a phone made the browser auto-zoom in to the caret, and the page stayed zoomed in afterwards with no easy way to zoom back out
- On screens ≤768px wide, all `input`/`select`/`textarea` elements now render at 16px, which stops the browser from auto-zooming on focus. Desktop sizing (12.5px) is unchanged

## v2.045 — 2026-06-12
**UI consistency pass: Sentinel design tokens applied app-wide**
- The 15 tabs still on the pre-redesign visual style (Crime, Assets, Threats, POI, Vulnerability, Impact, Controls, Risk Register, Residual Risk, Summary, Dashboard, SBD, Methodology, Database, Settings) now share the same colours, type scale, radii and focus styles as the Context tab, via a remap of the shared legacy CSS onto the Sentinel design tokens (`--ink-*`, `--s-*`, `--accent`, `--ok`/`--warn`/`--info`, `--vh-bg`) — no JSX/logic changes
- Fixed a contrast bug: sticky threat-table column headers had white text on a near-white background (invisible); now dark text on the Sentinel surface colour
- Toast notifications, focus rings, "locked"/destructive button states and the terrorism/crime threat-chip colours now use the same semantic tokens as the rest of the app instead of one-off hex values
- Removed ~70 lines of dead pre-redesign CSS (`.header`, `.nav`, `.content`, `.grid-5`, `.grid-7`, unused `.app` rules) that were never referenced after the Sentinel sidebar replaced the old tab bar
- Replaced four hardcoded `#d4d4d4` empty-state colours with the shared muted token

## v2.044 — 2026-06-10
**Word deliverable: escaping + page headers/footers**
- All exports (Word, Excel, Print/HTML) now HTML-escape user-entered text. Previously a client called "R&D Holdings", a note containing "<2m" or quotes in any field corrupted or garbled the exported document
- Word export gains a running page header (project name + project number) and footer with real Word page numbers (Page X of Y), client, generation date and tool version
- Client data history purge: projects/ removed from ALL git history (git-filter-repo) and force-pushed

---

## v2.043 — 2026-06-10
**Multi-assessment manager**
- The browser can now hold multiple assessments side by side. New "Assessments" button in the toolbar (and the Workspace breadcrumb) opens a manager listing every assessment stored in this browser with name, client and last-updated time
- Open, create and delete assessments from the manager; the current assessment is saved automatically before switching
- "Duplicate" now creates a genuine separate copy you can switch between — previously it renamed the working copy in place
- Existing single-assessment data is migrated automatically on first load; deleting the active assessment falls back to the next one (or a fresh blank)
- Client assessment data (projects/) is no longer tracked in the code repository

---

## v2.040 — 2026-06-09
**UX polish pass (screenshot-audited)**
- Fixed Residual Risk & Treatments table: "Controls" header overflowed its 60px column and overlapped "Post Likelihood"; columns rebalanced and Pre-L/Pre-I/Pre-Rating no longer wrap mid-word
- Buttons no longer wrap their labels onto two lines (e.g. "Copy to Word" on the Vulnerability tab)
- Points of Interest empty state now contains the "+ Add Point of Interest" action and explains what a POI is
- Standardised "Copy for Word" → "Copy to Word" across all tabs

---

## v2.039 — 2026-06-09
**App-wide reliability and accessibility fixes**
- Fixed crime comparison month calculation: in January/February it produced invalid months (`YYYY-00`, `YYYY--1`) or the wrong year, so the 10/50-mile comparison silently returned no data; now uses proper date arithmetic and tries the three most recent months per point
- Duplicate Assessment no longer clears the browser autosave before the duplicated state is re-saved, closing a window where closing the tab immediately after duplicating lost all unsaved work
- Loading an assessment file now validates the JSON is an object and that list fields (assets, threats, meetings, POIs) are arrays, preventing crashes from malformed files; added a file-read error handler
- Confirm dialogs and the back-up browser modal now close on Escape and carry proper dialog ARIA roles; the back-up browser close button has an accessible label
- Added visible keyboard focus outlines to buttons that previously had none (toolbar, sidebar, presets, lock, threat chips, treatment toggles, add/remove buttons)
- Added meta description and theme-color tags

---

## v2.038 — 2026-06-07
**Remove dead emoji icon data from SBD requirements**
- Removed unused `icon` fields from `SBD_DATA` category definitions — these emoji were never rendered in the UI but remained as leftover data from before icons were dropped from the SBD section (per outstanding `todo` item: icons don't look good, especially in Word exports)
- Cleared the resolved `todo` file — the remaining items (POI Word export filtering, Arial 9pt export styling, AVL/Impact A4-friendly chunked exports, SBD "N/A" status excluded from export) were already implemented in prior releases

---

## v2.008 — 2026-04-21
**Setup wizard: site profile moved to step 2**
- Site profile questions now appear immediately after development type selection, before assets and threats are reviewed
- Effects (threat deselection, treatment scope) are applied at step 2→3 transition, so assets and threats lists are already tailored when the user reaches the review steps
- Back navigation from the assets step correctly restores the unfiltered threat list so site profile answers can be revised

## v2.007 — 2026-04-21
**Treatment scope wired into assessment throughout**
- Treatment category scope (set during wizard setup) now filters treatment suggestions in the crime/threats tab and risk register (assets and POIs)
- Categories turned off (e.g. no CCTV, no access control) are suppressed from suggested measures across the whole assessment
- Scope persists to localStorage and resets correctly when starting a new assessment
- Treatment category toggles added to the Context tab so scope can be adjusted at any point without re-running the wizard

## v2.006 — 2026-04-21
**Wizard UI polish**
- Removed emoji icons from development type selection cards in setup wizard

## v2.005 — 2026-04-21
**All development types populated in setup wizard**
- Added descriptions for all 9 development types in wizard step 1 (Schools/University, Datacentre, Government and Masterplan were previously missing)

## v2.004 — 2026-04-17
**Setup wizard: 12-question site profile added**
- Added site profile questionnaire as step 4 of the setup wizard
- Answers automatically deselect irrelevant threats (e.g. no HVM → VBIED/VAAW removed; no vehicle access → vehicle-borne threats removed; no at-risk individuals → KRE removed)
- Answers adjust treatment category scope (no CCTV → external electronic off; no access control → internal electronic off)
- Unanswered questions do not block progression

## v2.003 — 2026-04-17
**Setup wizard introduced**
- New 4-step wizard launches automatically for fresh assessments
- Step 1: select development type to auto-load asset and threat presets
- Step 2: review and customise asset list (include/exclude, reorder, edit descriptions)
- Step 3: review and customise threat list by category (Terrorism / Crime)
- Step 4: confirm configuration and launch assessment
- Wizard re-launches on "Start New Assessment"

## v2.002 — 2026-04-17
**Bug fix: localStorage empty-state override**
- Fixed issue where a fresh localStorage state was overriding API defaults on load, leaving assets and threats empty

## v2.001 — 2026-04-17
**Bug fix: API authentication**
- Fixed `/api/db` auth to accept session cookie as fallback when build-time API key is unavailable
- Session cookie set correctly on Basic Auth login

## v2.000 — 2026-04-17
**Data protection & build pipeline**
- All asset, threat and treatment data constants moved to server-side `/api/db` endpoint (no longer exposed in client HTML)
- Edge Middleware added for HTTP Basic Auth access control
- Build step added to obfuscate application JavaScript before Vercel deployment

---

## v1.997 — prior
**Database overhaul**
- Assets, threats and treatments made fully editable at runtime via in-app database editor
- `assetPresetsDB` state introduced for customisable presets per session

## v1.996 and earlier
- Word export and layout improvements for security consultant workflow
- Crime map data point cap increased and search radius reduced to 0.5 miles
- Various bug fixes and UI improvements
