import { test, expect } from "bun:test";
import { validAuthCallback } from "../src/lib/native/auth-callback";
test("native auth accepts only a fresh code callback at the exact registered route", () => {
  const now = 1800000000000;
  expect(validAuthCallback("app.questos.android://auth/callback?code=one", now - 1000, now)).toBe(
    true,
  );
  for (const url of [
    "https://evil.example/auth/callback?code=one",
    "app.questos.android://evil/callback?code=one",
    "app.questos.android://auth/other?code=one",
    "app.questos.android://auth/callback#access_token=forged",
    "app.questos.android://auth/callback?code=one#access_token=forged",
  ])
    expect(validAuthCallback(url, now - 1000, now)).toBe(false);
  expect(validAuthCallback("app.questos.android://auth/callback?code=one", now - 600001, now)).toBe(
    false,
  );
  expect(validAuthCallback("app.questos.android://auth/callback?code=one", 0, now)).toBe(false);
});
