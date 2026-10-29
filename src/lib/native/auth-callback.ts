export function validAuthCallback(raw: string, started: number, now = Date.now()) {
  try {
    const u = new URL(raw);
    return (
      u.protocol === "app.questos.android:" &&
      u.hostname === "auth" &&
      u.pathname === "/callback" &&
      !u.username &&
      !u.password &&
      !u.port &&
      !u.hash &&
      u.searchParams.getAll("code").length === 1 &&
      !!u.searchParams.get("code")?.trim() &&
      u.searchParams.get("code")!.length <= 2048 &&
      Number.isFinite(started) &&
      started > 0 &&
      now - started >= 0 &&
      now - started < 600000
    );
  } catch {
    return false;
  }
}
