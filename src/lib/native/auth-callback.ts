export function validAuthCallback(raw: string, started: number, now = Date.now()) {
  try {
    const u = new URL(raw);
    return (
      u.protocol === "app.questos.android:" &&
      u.hostname === "auth" &&
      u.pathname === "/callback" &&
      !u.hash &&
      !!u.searchParams.get("code") &&
      now - started >= 0 &&
      now - started < 600000
    );
  } catch {
    return false;
  }
}
