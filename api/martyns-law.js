// Martyn's Law status for the Crime & Terrorism tab.
//
// Returns the curated baseline plus the result of live checks against
// legislation.gov.uk and GOV.UK, and any differences between the two. It runs
// server-side so it isn't subject to browser CORS rules, and it never receives
// or sends assessment data - the request carries nothing from the app.
const baseline = require("./_martyns-law-data.js");
const { runChecks, compare } = require("./_martyns-law-check.js");

module.exports = async function handler(req, res) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "method not allowed" });
  }
  const live = await runChecks(baseline);
  const drift = compare(baseline, live);
  // Cache for an hour at the edge; if the sources were unreachable, retry soon.
  res.setHeader(
    "Cache-Control",
    live.reachable
      ? "public, s-maxage=3600, stale-while-revalidate=86400"
      : "public, s-maxage=60, stale-while-revalidate=300"
  );
  return res.json({ baseline, live, drift, checked: live.checkedAt });
};
