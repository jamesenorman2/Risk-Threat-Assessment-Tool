export default async function middleware(req) {
  // API route handles its own auth via x-api-key header
  if (new URL(req.url).pathname === '/api/db') return;

  // Check session cookie first — set after successful Basic Auth login
  const cookieStr = req.headers.get("cookie") || "";
  const sessionCookie = cookieStr.split(";").map(c => c.trim()).find(c => c.startsWith("__sra_session="));
  if (sessionCookie) {
    const val = decodeURIComponent(sessionCookie.split("=").slice(1).join("="));
    if (process.env.APP_PASSWORD && val === process.env.APP_PASSWORD) {
      return; // authenticated via session cookie
    }
  }

  // Check Basic Auth header
  const auth = req.headers.get("Authorization") || "";
  if (auth.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    const colonIdx = decoded.indexOf(":");
    const password = decoded.slice(colonIdx + 1);

    if (process.env.APP_PASSWORD && password === process.env.APP_PASSWORD) {
      // Valid — redirect to same URL and set a session cookie so fetch() calls work too
      return new Response(null, {
        status: 302,
        headers: {
          "Location": req.url,
          "Set-Cookie": `__sra_session=${encodeURIComponent(process.env.APP_PASSWORD)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`,
        },
      });
    }
  }

  return new Response("Access denied — authorised users only.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Risk & Threat Assessment Tool"',
      "Content-Type": "text/plain",
    },
  });
}
