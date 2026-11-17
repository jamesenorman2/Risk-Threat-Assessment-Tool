const { test, expect } = require("@playwright/test");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Optional: serve React from a local folder (react.js, react-dom.js) instead of
// the CDN, for running offline or where cdnjs is blocked.
test.beforeEach(async ({ page }) => {
  const dir = process.env.RTA_REACT_DIR;
  if (!dir) return;
  const serve = (file) => (route) =>
    route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.join(dir, file)) });
  await page.route("https://cdnjs.cloudflare.com/ajax/libs/react/**", serve("react.js"));
  await page.route("https://cdnjs.cloudflare.com/ajax/libs/react-dom/**", serve("react-dom.js"));
});

// ── Nothing secret is shipped to the browser ─────────────────────────────

test("the build never embeds environment secrets in the bundle", async () => {
  test.setTimeout(120000);
  const sentinel = "SENTINEL-must-not-ship-9f3a1c";
  execFileSync("node", ["build.js"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, APP_PASSWORD: sentinel },
    stdio: "ignore",
  });
  const bundle = fs.readFileSync(path.join(__dirname, "..", "dist", "index.html"), "utf8");
  expect(bundle.includes(sentinel)).toBe(false);
  expect(bundle.includes("__API_SECRET__")).toBe(false);
});

// ── A malicious assessment file cannot run script in the print window ────

test("an assessment file carrying script cannot execute in the print window", async ({ page, context }) => {
  const defaults = {};
  require("../api/db.js")({ headers: {} }, { setHeader() {}, status() { return this; }, json(o) { Object.assign(defaults, o); } });
  const payload = `<svg onload="window.__pwned=1;window.opener&&(window.opener.__pwned=1)">`;
  const evil = {
    ctx: { project: "Evil", client: "X" },
    assets: defaults.DEF_ASSETS.slice(0, 2).map((a) => ({
      ...a,
      sc: { opImpact: payload, dependencies: 3, impactPeople: 3, impactEnv: 3 },
    })),
    threats: defaults.DEF_THREATS.slice(0, 2),
    vs: {}, is_: {}, cd: {}, tx: {}, rs: {}, acc: {}, meetings: [], pois: [], treatmentMeasures: {},
  };
  const file = path.join(os.tmpdir(), `rta-evil-${process.pid}.json`);
  fs.writeFileSync(file, JSON.stringify(evil));

  await page.goto("/");
  await expect(page.locator(".sentinel-sidebar")).toBeVisible();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.locator("button.stb-btn", { hasText: "Load" }).first().click(),
  ]);
  await chooser.setFiles(file);
  await expect(page.locator(".bc-proj").first()).toHaveText("Evil");

  await page.locator("button.stb-btn", { hasText: "Export" }).click();
  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    page.locator("button", { hasText: "Print / HTML" }).click(),
  ]);
  await popup.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(800);

  const html = await popup.content();
  expect(html).toContain("Content-Security-Policy");      // scripts forbidden in this document
  expect(html).not.toContain("<svg onload");               // the payload is escaped, not live markup
  expect(await popup.evaluate(() => window.__pwned || null)).toBeNull();
  expect(await page.evaluate(() => window.__pwned || null)).toBeNull();
  fs.rmSync(file, { force: true });
});

// ── Client data is only ever backed up to a PRIVATE repository ───────────

async function configureBackups(page) {
  await page.goto("/");
  await expect(page.locator(".sentinel-sidebar")).toBeVisible();
  await page.locator("button.sni", { hasText: "Settings" }).click();
  await page.getByPlaceholder("e.g. your-username or org-name").fill("someone");
  await page.getByPlaceholder("e.g. sra-assessments").fill("some-repo");
  await page.getByPlaceholder(/ghp_xxxx/).fill("ghp_testtoken_not_real");
}

async function mockGitHub(page, { isPrivate }) {
  const writes = [];
  await page.route("https://api.github.com/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === "PUT") {
      writes.push(url.pathname);
      return route.fulfill({ status: 201, contentType: "application/json", body: "{}" });
    }
    if (url.pathname === "/repos/someone/some-repo") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ full_name: "someone/some-repo", private: isPrivate }),
      });
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  });
  return writes;
}

test("back-up to a PUBLIC repository is blocked and nothing is uploaded", async ({ page }) => {
  const writes = await mockGitHub(page, { isPrivate: false });
  await configureBackups(page);
  await page.locator("button.stb-btn-primary", { hasText: "Save" }).click();
  await expect(page.getByText(/Back-up blocked/)).toBeVisible();
  expect(writes).toEqual([]);
});

test("back-up to a PRIVATE repository is allowed", async ({ page }) => {
  const writes = await mockGitHub(page, { isPrivate: true });
  await configureBackups(page);
  await page.locator("button.stb-btn-primary", { hasText: "Save" }).click();
  await expect.poll(() => writes.length, { timeout: 10000 }).toBeGreaterThan(0);
  expect(writes[0]).toContain("/repos/someone/some-repo/contents/projects/");
});

test("back-up fails closed when the repository's visibility cannot be confirmed", async ({ page }) => {
  const writes = [];
  await page.route("https://api.github.com/**", (route) => {
    if (route.request().method() === "PUT") writes.push(route.request().url());
    return route.abort(); // GitHub unreachable
  });
  await configureBackups(page);
  await page.locator("button.stb-btn-primary", { hasText: "Save" }).click();
  await expect(page.getByText(/Back-up blocked/)).toBeVisible();
  expect(writes).toEqual([]);
});
