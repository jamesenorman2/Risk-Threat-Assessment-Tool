const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

let html = fs.readFileSync('index.html', 'utf8');

// Inject build-time API secret into fetch call before obfuscation
const apiSecret = process.env.APP_PASSWORD || '';
html = html.replaceAll('"__API_SECRET__"', JSON.stringify(apiSecret));

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
console.log(`Build complete — obfuscated output written to dist/index.html (PWA v${version})`);
