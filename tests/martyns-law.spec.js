const { test, expect } = require("@playwright/test");
const baseline = require("../api/_martyns-law-data.js");
const { compare, parseFeed, runChecks } = require("../api/_martyns-law-check.js");

// ── Live-check logic (no browser) ────────────────────────────────────────

const feed = (entries) =>
  "<feed>" +
  entries
    .map(
      (e) =>
        `<entry><id>http://www.legislation.gov.uk/id/${e.id}</id><title>${e.title}</title><published>2026-01-01T00:00:00Z</published></entry>`
    )
    .join("") +
  "</feed>";

const knownEntries = baseline.instruments.map((i) => ({ id: i.id, title: i.title }));

function fakeFetch({ legislation, govuk }) {
  return async (url) => {
    const u = String(url);
    if (u.includes("legislation.gov.uk")) {
      if (legislation instanceof Error) throw legislation;
      return { ok: true, status: 200, text: async () => legislation };
    }
    if (govuk instanceof Error) throw govuk;
    return { ok: true, status: 200, json: async () => ({ public_updated_at: govuk }) };
  };
}

test("parseFeed reads statutory instruments and decodes entities", () => {
  const out = parseFeed(
    feed([{ id: "uksi/2026/1", title: "The Terrorism (Protection of Premises) &amp; Other Regulations 2026" }])
  );
  expect(out).toHaveLength(1);
  expect(out[0].id).toBe("uksi/2026/1");
  expect(out[0].title).toContain("& Other");
  expect(out[0].url).toBe("https://www.legislation.gov.uk/uksi/2026/1/made");
});

test("no drift when the official sources match the baseline", async () => {
  const live = await runChecks(
    baseline,
    fakeFetch({ legislation: feed(knownEntries), govuk: "2026-05-18T09:00:00+01:00" })
  );
  expect(live.reachable).toBe(true);
  expect(compare(baseline, live)).toEqual([]);
});

test("a new commencement regulation is flagged as high severity", async () => {
  const entries = [
    ...knownEntries,
    { id: "uksi/2027/101", title: "The Terrorism (Protection of Premises) Act 2025 (Commencement No. 3) Regulations 2027" },
  ];
  const live = await runChecks(baseline, fakeFetch({ legislation: feed(entries), govuk: "2026-05-18T09:00:00Z" }));
  const drift = compare(baseline, live);
  expect(drift).toHaveLength(1);
  expect(drift[0].severity).toBe("high");
  expect(drift[0].kind).toBe("commencement");
});

test("other new regulations are flagged as medium severity", async () => {
  const entries = [...knownEntries, { id: "uksi/2027/55", title: "The Terrorism (Protection of Premises) (Fees) Regulations 2027" }];
  const live = await runChecks(baseline, fakeFetch({ legislation: feed(entries), govuk: "2026-05-18T09:00:00Z" }));
  const drift = compare(baseline, live);
  expect(drift.map((d) => d.severity + "/" + d.kind)).toEqual(["medium/instrument"]);
});

test("guidance updated after the baseline is flagged", async () => {
  const live = await runChecks(baseline, fakeFetch({ legislation: feed(knownEntries), govuk: "2026-09-01T10:00:00Z" }));
  const kinds = compare(baseline, live).map((d) => d.kind);
  expect(kinds).toContain("guidance");
});

test("sources being down never produces a false alarm", async () => {
  const down = new Error("network down");
  const live = await runChecks(baseline, fakeFetch({ legislation: down, govuk: down }));
  expect(live.reachable).toBe(false);
  expect(compare(baseline, live)).toEqual([]);
});

// ── The card in the app ──────────────────────────────────────────────────

async function mockThreatLevel(page) {
  await page.route("https://www.mi5.gov.uk/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "<html><body>THE THREAT LEVEL IS SUBSTANTIAL</body></html>",
    })
  );
}

async function mockMartynsLaw(page, { drift = [], status = 200 } = {}) {
  await page.route("**/api/martyns-law", (route) =>
    status !== 200
      ? route.fulfill({ status, body: "error" })
      : route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            baseline,
            live: { reachable: true },
            drift,
            checked: new Date().toISOString(),
          }),
        })
  );
}

async function openCrimeTab(page) {
  await page.goto("/");
  await page.locator("button.sni", { hasText: "Crime & Terrorism" }).click();
  return page.locator("#martyns-law-section");
}

test.describe("Martyn's Law card", () => {
  // Optional: serve React from a local folder (react.js, react-dom.js) instead
  // of the CDN, for running offline or in a sandbox that blocks cdnjs.
  test.beforeEach(async ({ page }) => {
    const dir = process.env.RTA_REACT_DIR;
    if (!dir) return;
    const fs = require("fs");
    const path = require("path");
    const serve = (file) => (route) =>
      route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.join(dir, file)) });
    await page.route("https://cdnjs.cloudflare.com/ajax/libs/react/**", serve("react.js"));
    await page.route("https://cdnjs.cloudflare.com/ajax/libs/react-dom/**", serve("react-dom.js"));
  });

  test("Martyn's Law card shows the current status and thresholds", async ({ page }) => {
    await mockThreatLevel(page);
    await mockMartynsLaw(page);
    const card = await openCrimeTab(page);
    await expect(card).toContainText("Part in force");
    await expect(card).toContainText("Standard duty");
    await expect(card).toContainText("200");
    await expect(card).toContainText("Enhanced duty");
    await expect(card).toContainText("800");
    await expect(card).not.toContainText("Official sources have changed");
  });

  test("Martyn's Law card warns when the official sources have changed", async ({ page }) => {
    await mockThreatLevel(page);
    await mockMartynsLaw(page, {
      drift: [
        {
          severity: "high",
          kind: "commencement",
          message: "A new commencement regulation has been made.",
          url: "https://www.legislation.gov.uk/uksi/2027/101/made",
        },
      ],
    });
    const card = await openCrimeTab(page);
    await expect(card.getByRole("alert")).toContainText("Official sources have changed");
    await expect(card.getByRole("alert")).toContainText("new commencement regulation");
  });

  test("Martyn's Law card degrades gracefully when the check is unavailable", async ({ page }) => {
    await mockThreatLevel(page);
    await mockMartynsLaw(page, { status: 500 });
    const card = await openCrimeTab(page);
    await expect(card).toContainText("Live status unavailable");
    await expect(card.locator('a[href*="legislation.gov.uk"]')).toHaveCount(1);
  });
});
