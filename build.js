const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const html = fs.readFileSync('index.html', 'utf8');

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
console.log('Build complete — obfuscated output written to dist/index.html');
