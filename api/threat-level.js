// Server-side fetch of the UK national terrorism threat level (JTAC/MI5).
// Runs on Vercel's servers so it isn't subject to browser CORS restrictions,
// unlike a client-side fetch straight to mi5.gov.uk or through a public CORS proxy.
const LEVELS = ["LOW", "MODERATE", "SUBSTANTIAL", "SEVERE", "CRITICAL"];
const SOURCES = [
  "https://www.mi5.gov.uk/threat-levels",
  "https://www.mi5.gov.uk/faq/what-is-the-current-national-threat-level",
];

// Best-effort in-memory cache — persists only for the life of a warm lambda
// instance, but lets a cold scrape survive a few requests if MI5 is flaky.
let lastGood = null;

async function scrape() {
  for (const url of SOURCES) {
    try {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9",
        },
      });
      if (!r.ok) continue;
      const text = await r.text();
      for (let i = LEVELS.length - 1; i >= 0; i--) {
        const re = new RegExp("threat\\s+level[\\s\\S]{0,150}?\\b" + LEVELS[i] + "\\b", "i");
        if (re.test(text)) return { level: LEVELS[i], source: "MI5.gov.uk" };
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

module.exports = async function handler(req, res) {
  const fresh = await scrape();
  if (fresh) {
    lastGood = { ...fresh, fetched: new Date().toISOString() };
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=1800");
    return res.json({ ...lastGood, live: true });
  }
  if (lastGood) {
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.json({ ...lastGood, live: false });
  }
  res.setHeader("Cache-Control", "no-store");
  return res.status(502).json({ error: "unavailable" });
};
