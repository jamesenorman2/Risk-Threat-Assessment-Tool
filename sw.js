/*
  Service worker for the Security Risk & Threat Assessment Tool.

  Scope is the site root, so it must be served from "/sw.js". The app is a
  single HTML document with its libraries on public CDNs, so there are two
  caches: the app shell (same-origin documents and icons) and third-party
  assets (React, Leaflet, web fonts) which are stored as opaque responses.

  __APP_VERSION__ is replaced with the app version by build.js, so every
  release lands in a fresh cache and the old ones are dropped on activate.
*/
var APP_VERSION = "__APP_VERSION__";
var VERSION = APP_VERSION.charAt(0) === "_" ? "dev" : APP_VERSION;
var SHELL_CACHE = "rta-shell-v" + VERSION;
var ASSET_CACHE = "rta-assets-v" + VERSION;
var SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/favicon.svg"
];

// Hosts whose assets the app needs to start up offline.
var ASSET_HOSTS = [
  "cdnjs.cloudflare.com",
  "unpkg.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];

function isCacheable(response) {
  // Opaque responses (no-cors CDN fetches) can't be inspected but are usable
  // by the browser when replayed; anything else must be a clean 200.
  return response && (response.type === "opaque" || response.ok);
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      // Added one at a time: a single failure must not abort the install.
      return Promise.all(SHELL_URLS.map(function (url) {
        return fetch(url, { credentials: "same-origin", cache: "reload" })
          .then(function (res) { if (isCacheable(res)) return cache.put(url, res); })
          .catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== SHELL_CACHE && key !== ASSET_CACHE && key.indexOf("rta-") === 0) {
          return caches.delete(key);
        }
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Network first, falling back to the cached copy when offline.
function networkFirst(request, cacheName, fallbackUrl) {
  return fetch(request).then(function (response) {
    if (isCacheable(response)) {
      var copy = response.clone();
      caches.open(cacheName).then(function (cache) { cache.put(fallbackUrl || request, copy); });
    }
    return response;
  }).catch(function () {
    return caches.match(fallbackUrl || request).then(function (hit) {
      return hit || caches.match("/") || Response.error();
    });
  });
}

// Cache first, refreshing the entry in the background for the next load.
function cacheFirst(request, cacheName) {
  return caches.match(request).then(function (hit) {
    var network = fetch(request).then(function (response) {
      if (isCacheable(response)) {
        var copy = response.clone();
        caches.open(cacheName).then(function (cache) { cache.put(request, copy); });
      }
      return response;
    }).catch(function () { return hit || Response.error(); });
    return hit || network;
  });
}

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // API traffic is always live — never cached, never served stale.
  if (url.origin === self.location.origin && url.pathname.indexOf("/api/") === 0) return;

  // Page loads: prefer the network so a new release is picked up immediately,
  // fall back to the cached shell when there's no connection.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL_CACHE, "/"));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  if (ASSET_HOSTS.indexOf(url.hostname) !== -1) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
  }
});
