export default async function middleware(req) {
  const auth = req.headers.get("Authorization") || "";

  if (auth.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    const colonIdx = decoded.indexOf(":");
    const password = decoded.slice(colonIdx + 1);

    if (
      process.env.APP_PASSWORD &&
      password === process.env.APP_PASSWORD
    ) {
      return; // authenticated — pass request through
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
