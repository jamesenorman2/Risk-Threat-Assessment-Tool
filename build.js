const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

let html = fs.readFileSync('index.html', 'utf8');

// NOTE: no secret is ever injected into the client bundle. Anything placed in
// browser JavaScript is readable by every visitor, so the app ships no credentials.

// Match inline <script> blocks only (not those with src=)
const result = html.replace(/<script(?!\s+src=)([^>]*)>([\s\S]*?)<\/script>/g, function(match, attrs, code) {
  if (!code || code.trim().length === 0) return match;
  try {
    const obfuscated = JavaScriptObfuscator.obfuscate(code, {
      target: 'browser',
      compact: true,
      controlFlowFlattening: false,
      deadCodeInjection: false,
      debugProtection: false,
      disableConsoleOutput: false,
      identifierNamesGenerator: 'hexadecimal',
      renameGlobals: false,
      rotateStringArray: true,
      selfDefending: false,
      shuffleStringArray: true,
      splitStrings: false,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayCallsTransform: true,
      stringArrayThreshold: 0.8,
      transformObjectKeys: false,
      unicodeEscapeSequence: false
    });
    return '<script' + attrs + '>' + obfuscated.getObfuscatedCode() + '</script>';
  } catch (e) {
    console.warn('Obfuscation failed, using original:', e.message);
    return match;
  }
});

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync(path.join('dist', 'index.html'), result);

// PWA assets — Vercel serves dist/, so the manifest, service worker and icons
// have to be copied across or they 404 in production. The service worker is
// stamped with the app version so each release gets a fresh cache.
const version = (html.match(/const VERSION="([\d.]+)"/) || [])[1] || 'dev';
fs.copyFileSync('manifest.webmanifest', path.join('dist', 'manifest.webmanifest'));
fs.writeFileSync(
  path.join('dist', 'sw.js'),
  fs.readFileSync('sw.js', 'utf8').replaceAll('__APP_VERSION__', version)
);
fs.mkdirSync(path.join('dist', 'icons'), { recursive: true });
for (const icon of fs.readdirSync('icons')) {
  fs.copyFileSync(path.join('icons', icon), path.join('dist', 'icons', icon));
}

// ── Offline build ──────────────────────────────────────────────────────────
// One self-contained HTML file: React, Leaflet, html2canvas, JSZip and the
// fonts are inlined, /api/* is answered from bundled data (offline-shim.js),
// and Word export produces a real .docx. Written to dist-offline/, NOT dist/,
// so it is never deployed — it embeds the reference libraries that the online
// app only serves to authenticated users via /api/db.
function buildOffline(appHtml) {
  const nm = (p) => fs.readFileSync(path.join('node_modules', p), 'utf8');
  const safeJs = (code) => code.replace(/<\/script/gi, '<\\/script');
  const b64 = (p) => fs.readFileSync(path.join('node_modules', p)).toString('base64');

  // Bundled data for the shim, loaded from the serverless function sources.
  const db = JSON.parse(JSON.stringify((() => {
    let out;
    require('./api/db.js')({}, { setHeader() {}, json(o) { out = o; } });
    return out;
  })()));
  const bundle = { db, martynsLaw: require('./api/_martyns-law-data.js') };

  // Fonts (latin subset) as data URIs
  const faces = [];
  for (const [pkg, fam, ws] of [
    ['inter-tight', 'Inter Tight', [400, 500, 600, 700]],
    ['jetbrains-mono', 'JetBrains Mono', [400, 500, 600]]
  ]) {
    for (const w of ws) {
      faces.push(`@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;` +
        `src:url(data:font/woff2;base64,${b64(`@fontsource/${pkg}/files/${pkg}-latin-${w}-normal.woff2`)}) format('woff2')}`);
    }
  }

  // Leaflet CSS with its images inlined
  const leafletCss = nm('leaflet/dist/leaflet.css').replace(/url\((['"]?)images\/([^)'"]+)\1\)/g, (m, q, f) =>
    `url(data:image/png;base64,${b64('leaflet/dist/images/' + f)})`);

  const inlineScript = (code) => '<script>' + safeJs(code) + '</script>';
  const shim = '<script>window.__RTA_BUNDLE__=' + JSON.stringify(bundle).replace(/</g, '\\u003c') + ';</script>' +
    inlineScript(fs.readFileSync('offline-shim.js', 'utf8'));

  const swap = (h, re, replacement, label) => {
    if (!re.test(h)) throw new Error('Offline build: could not find ' + label + ' in index.html');
    return h.replace(re, () => replacement);
  };
  let h = appHtml;
  h = swap(h, /<script src="https:\/\/cdnjs[^"]*react\.production\.min\.js"><\/script>/, shim + inlineScript(nm('react/umd/react.production.min.js')), 'React tag');
  h = swap(h, /<script src="https:\/\/cdnjs[^"]*react-dom\.production\.min\.js"><\/script>/, inlineScript(nm('react-dom/umd/react-dom.production.min.js')), 'ReactDOM tag');
  h = swap(h, /<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<style>' + faces.join('') + '</style>', 'Google Fonts link');
  h = swap(h, /<link rel="stylesheet" href="https:\/\/unpkg\.com\/leaflet[^>]*>/, '<style>' + leafletCss + '</style>', 'Leaflet CSS');
  h = swap(h, /<script src="https:\/\/unpkg\.com\/leaflet[^"]*"><\/script>/, inlineScript(nm('leaflet/dist/leaflet.js')) + inlineScript(nm('jszip/dist/jszip.min.js')) + inlineScript(nm('html2canvas/dist/html2canvas.min.js')), 'Leaflet JS');
  // No manifest / service worker / absolute icon links for a file:// document
  h = h.replace(/<link rel="manifest"[^>]*>\n?/, '');
  h = h.replace(/<link rel="(icon|apple-touch-icon)" href="\/icons[^>]*>\n?/g, '');
  h = h.replace('navigator.serviceWorker.register("/sw.js")', 'Promise.resolve()');

  const leftover = h.match(/(?:src|href)="https?:\/\/(?:cdnjs|unpkg|fonts\.googleapis)[^"]*"/g);
  if (leftover) throw new Error('Offline build: external resources remain: ' + leftover.join(', '));

  fs.mkdirSync('dist-offline', { recursive: true });
  const out = path.join('dist-offline', `Risk-Threat-Assessment-Tool-v${version}-offline.html`);
  fs.writeFileSync(out, h);
  return out;
}
const offlineOut = buildOffline(result);
console.log(`Offline build written to ${offlineOut}`);

console.log(`Build complete — obfuscated output written to dist/index.html (PWA v${version})`);
