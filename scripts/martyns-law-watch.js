// Daily watcher for Martyn's Law changes - run by
// .github/workflows/martyns-law-watch.yml, or by hand: node scripts/martyns-law-watch.js
//
// Runs the same checks the app uses (api/_martyns-law-check.js) and writes
// martyns-law-drift.md when the official sources differ from the curated
// baseline in api/_martyns-law-data.js. It never changes the baseline itself:
// a person has to read the new material and update it.
const fs = require("fs");
const baseline = require("../api/_martyns-law-data.js");
const { runChecks, compare } = require("../api/_martyns-law-check.js");

(async () => {
  const live = await runChecks(baseline);
  const drift = compare(baseline, live);

  console.log("Checked:", live.checkedAt);
  console.log("legislation.gov.uk:", live.legislation.ok ? live.legislation.instruments.length + " instruments" : "UNAVAILABLE (" + live.legislation.error + ")");
  for (const p of live.govuk.pages) {
    console.log("GOV.UK " + p.key + ":", p.ok ? "updated " + p.updated : "UNAVAILABLE (" + p.error + ")");
  }

  const out = process.env.GITHUB_OUTPUT;
  const flag = (v) => out && fs.appendFileSync(out, "drift=" + v + "\n");

  if (!drift.length) {
    console.log("\nNo differences from the baseline reviewed on " + baseline.reviewed + ".");
    flag("false");
    return;
  }

  const lines = [
    "The official Martyn’s Law sources have changed since the app’s content was last reviewed (" + baseline.reviewed + ").",
    "",
    ...drift.map((d) => "- **" + d.severity.toUpperCase() + "** — " + d.message + " [source](" + d.url + ")"),
    "",
    "**What to do:** read the new material, then update `api/_martyns-law-data.js` (status, in-force provisions, instruments, tracked guidance dates) and set `reviewed` to today. The app shows users a warning until that is done.",
    "",
    "_Opened automatically by the Martyn’s Law watch workflow._",
  ];
  fs.writeFileSync("martyns-law-drift.md", lines.join("\n") + "\n");
  console.log("\nDIFFERENCES FOUND:\n" + drift.map((d) => " - [" + d.severity + "] " + d.message).join("\n"));
  flag("true");
})().catch((e) => {
  // A failed check must not look like a finding.
  console.error("Check failed:", e);
  process.exitCode = 1;
});
