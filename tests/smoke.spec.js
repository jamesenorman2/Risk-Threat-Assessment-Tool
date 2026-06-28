const { test, expect } = require("@playwright/test");

// Mirrors SENTINEL_NAV in index.html. If a tab is renamed/added/removed there,
// update this list too — that's the point of the test catching drift.
const NAV_ITEMS = [
  "Context",
  "Crime & Terrorism",
  "Assets",
  "Threats",
  "Points of Interest",
  "Vulnerability",
  "Impact",
  "Existing Controls",
  "Risk Register",
  "Treatments & Residual Risk",
  "Summary",
  "Dashboard",
  "SBD Requirements",
  "Methodology",
  "Database",
  "Settings",
];

function trackPageErrors(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

// The app does a best-effort live fetch of the national threat level from
// mi5.gov.uk on every load (index.html fetchThreatLevel). mi5.gov.uk doesn't
// send CORS headers, so the browser logs a console error for the blocked
// cross-origin request even though the app's own try/catch handles the
// rejection and falls back to a cached value — this is real CI's full
// internet access surfacing browser-level CORS logging that a fully
// network-blocked sandbox never triggers. Mock the endpoint so tests don't
// depend on an external site's CORS policy.
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

test("app loads and defaults to the Context tab", async ({ page }) => {
  const errors = trackPageErrors(page);
  await mockThreatLevel(page);
  await page.goto("/");
  await expect(page.locator(".sentinel-sidebar")).toBeVisible();
  await expect(
    page.locator("button.sni", { hasText: "Context" })
  ).toHaveClass(/sni-active/);
  await expect(page.locator(".sentinel-main")).not.toBeEmpty();
  expect(errors).toEqual([]);
});

test("every sidebar tab navigates without a console/page error", async ({
  page,
}) => {
  const errors = trackPageErrors(page);
  await mockThreatLevel(page);
  await page.goto("/");

  for (const label of NAV_ITEMS) {
    const navButton = page.locator("button.sni", { hasText: label });
    await expect(navButton).toBeVisible();
    await navButton.click();
    await expect(navButton).toHaveClass(/sni-active/);
    await expect(page.locator(".sentinel-main")).not.toBeEmpty();
  }

  expect(errors).toEqual([]);
});

test("can add an asset on the Assets tab", async ({ page }) => {
  const errors = trackPageErrors(page);
  await mockThreatLevel(page);
  await page.goto("/");
  await page.locator("button.sni", { hasText: "Assets" }).click();

  const rowsBefore = await page.locator("#section-assets tbody tr").count();
  await page.locator("#section-assets").getByText("+ Add Asset").click();
  const rowsAfter = await page.locator("#section-assets tbody tr").count();

  expect(rowsAfter).toBe(rowsBefore + 1);
  expect(errors).toEqual([]);
});
