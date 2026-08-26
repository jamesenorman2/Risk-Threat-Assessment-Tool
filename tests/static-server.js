// Minimal static server for smoke tests: serves the real files that exist in
// the repo root (index.html, sw.js, manifest.webmanifest, icons/) so the PWA
// plumbing is exercised the same way it is on Vercel, and falls back to
// index.html for anything else — the app is a single static file with no
// client-side routing, matching Vercel's `cleanUrls` rewrite.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4173;
const root = path.join(__dirname, "..");
const indexPath = path.join(root, "index.html");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(req.url.split("?")[0]);
  const target = path.join(root, path.normalize(pathname));
  const inRoot = target === root || target.startsWith(root + path.sep);

  if (inRoot && pathname !== "/" && fs.existsSync(target) && fs.statSync(target).isFile()) {
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(target)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(fs.readFileSync(target));
    return;
  }

  fs.readFile(indexPath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end("Failed to read index.html");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Static server serving the app on http://127.0.0.1:${PORT}`);
});
