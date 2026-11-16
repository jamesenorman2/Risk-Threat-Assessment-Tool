// Live checks for the Martyn's Law card. Shared by /api/martyns-law (what the
// app calls) and scripts/martyns-law-watch.js (the scheduled GitHub Action).
//
// Only public pages are requested and no assessment data is ever sent.
//
// Two sources are watched:
//   1. legislation.gov.uk's Atom feed of statutory instruments with
//      "Terrorism (Protection of Premises)" in the title - this is where new
//      commencement regulations appear, and is the authoritative signal.
//   2. The GOV.UK Content API for the Home Office guidance pages - only the
//      last-updated date is read, so a change to the guidance is noticed
//      without trying to interpret its text.
//
// Anything that fails is recorded and skipped; a source being down never
// produces a false "something changed".

const LEGISLATION_FEED =
  "https://www.legislation.gov.uk/uksi/data.feed?title=" +
  encodeURIComponent("Terrorism (Protection of Premises)");
const GOVUK_CONTENT_API = "https://www.gov.uk/api/content";
const TIMEOUT_MS = 7000;
const HEADERS = {
  "User-Agent": "risk-threat-assessment-tool martyns-law-check",
  "Accept": "application/json, application/atom+xml, application/xml;q=0.9, */*;q=0.5",
};

function decodeEntities(s) {
  return String(s || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// A small tolerant reader for the legislation.gov.uk feed. Only the fields we
// need are read, so an unrelated change to the feed's markup does not break it.
function parseFeed(xml) {
  const out = [];
  const entries = String(xml || "").match(/<entry[\s>][\s\S]*?<\/entry>/g) || [];
  for (const entry of entries) {
    const id = (entry.match(/<id>\s*([^<]+?)\s*<\/id>/) || [])[1] || "";
    const ref = (id.match(/\/id\/(uksi\/\d{4}\/\d+)/) || [])[1];
    if (!ref) continue;
    const title = decodeEntities((entry.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1]).trim();
    const published = (entry.match(/<published>\s*([^<]+?)\s*<\/published>/) || [])[1] || null;
    out.push({ id: ref, title, published, url: "https://www.legislation.gov.uk/" + ref + "/made" });
  }
  return out;
}

async function get(fetchFn, url) {
  const r = await fetchFn(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r;
}

async function checkLegislation(fetchFn) {
  try {
    const r = await get(fetchFn, LEGISLATION_FEED);
    const instruments = parseFeed(await r.text());
    return { ok: true, instruments };
  } catch (e) {
    return { ok: false, instruments: [], error: String((e && e.message) || e) };
  }
}

async function checkGovuk(fetchFn, tracked) {
  const pages = await Promise.all(
    tracked.map(async (g) => {
      const url = "https://www.gov.uk" + g.path;
      try {
        const r = await get(fetchFn, GOVUK_CONTENT_API + g.path);
        const d = await r.json();
        const updated = d.public_updated_at || d.updated_at || null;
        return { key: g.key, title: g.title, url, updated, ok: !!updated, error: updated ? undefined : "no date" };
      } catch (e) {
        return { key: g.key, title: g.title, url, updated: null, ok: false, error: String((e && e.message) || e) };
      }
    })
  );
  return { ok: pages.some((p) => p.ok), pages };
}

async function runChecks(baseline, fetchFn) {
  const f = fetchFn || fetch;
  const [legislation, govuk] = await Promise.all([
    checkLegislation(f),
    checkGovuk(f, baseline.guidance),
  ]);
  return {
    checkedAt: new Date().toISOString(),
    reachable: legislation.ok || govuk.ok,
    legislation,
    govuk,
  };
}

function isoDay(s) {
  const t = Date.parse(s);
  return isNaN(t) ? String(s || "") : new Date(t).toISOString().slice(0, 10);
}

// Differences between the live sources and the curated baseline.
// severity: "high" = a new commencement regulation (dates may have changed),
//           "medium" = a new regulation or updated official guidance.
function compare(baseline, live) {
  const drift = [];
  if (!live) return drift;

  if (live.legislation && live.legislation.ok) {
    const known = new Set(baseline.instruments.map((i) => i.id));
    for (const i of live.legislation.instruments) {
      if (known.has(i.id)) continue;
      const commencement = /commencement/i.test(i.title);
      drift.push({
        severity: commencement ? "high" : "medium",
        kind: commencement ? "commencement" : "instrument",
        message: commencement
          ? "A new commencement regulation has been made — the dates for the premises duties may have changed: " + i.title
          : "A new regulation has been made under the Act: " + i.title,
        url: i.url,
      });
    }
  }

  if (live.govuk && live.govuk.pages) {
    for (const p of live.govuk.pages) {
      const base = baseline.guidance.find((g) => g.key === p.key);
      if (!p.ok || !base || !base.knownUpdated) continue;
      if (Date.parse(p.updated) > Date.parse(base.knownUpdated + "T23:59:59Z")) {
        drift.push({
          severity: "medium",
          kind: "guidance",
          message:
            "GOV.UK updated “" + p.title + "” on " + isoDay(p.updated) +
            " — newer than the version last reviewed (" + base.knownUpdated + ").",
          url: p.url,
        });
      }
    }
  }
  return drift;
}

module.exports = { runChecks, compare, parseFeed, checkLegislation, checkGovuk, LEGISLATION_FEED };
