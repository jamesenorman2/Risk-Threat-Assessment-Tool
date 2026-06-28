// Minimal static server for smoke tests: every request gets index.html.
// The app is a single static file with no client-side routing, so this
// is sufficient to exercise it the same way Vercel's `cleanUrls` rewrite does.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4173;
const indexPath = path.join(__dirname, "..", "index.html");

const server = http.createServer((req, res) => {
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
  console.log(`Static server serving index.html on http://127.0.0.1:${PORT}`);
});
