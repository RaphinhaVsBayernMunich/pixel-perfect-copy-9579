export function validateRuntimeOrigin(raw) {
  if (!raw)
    throw new Error(
      "CAPACITOR_SERVER_URL is required. Deploy QuestOS independently before syncing Android.",
    );
  const u = new URL(raw);
  const host = u.hostname.toLowerCase();
  if (
    u.protocol !== "https:" ||
    u.pathname !== "/" ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    u.port
  )
    throw new Error(
      "QuestOS runtime must be an HTTPS origin with no credentials, path, port, query or fragment.",
    );
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "[::1]" ||
    /^(?:127\.|0\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)
  )
    throw new Error("Local/private runtime addresses cannot be packaged.");
  if (
    host.includes("id-preview") ||
    [
      "lovable.app",
      "lovable.dev",
      "lovableproject.com",
      "lovableproject-dev.com",
      "gpt-eng.com",
      "gptengineer.run",
    ].some((d) => host === d || host.endsWith("." + d))
  )
    throw new Error(
      "Lovable runtimes/previews cannot be packaged. Use your independent deployment.",
    );
  if (/\.(?:invalid|example|test)$/.test(host))
    throw new Error("A real deployed production origin is required.");
  return u.origin;
}
