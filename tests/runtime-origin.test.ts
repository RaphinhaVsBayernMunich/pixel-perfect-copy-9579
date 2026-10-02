import { test, expect } from "bun:test";
import { validateRuntimeOrigin } from "../scripts/runtime-origin.mjs";
test("native runtime rejects previews, local hosts and ambiguous URLs", () => {
  for (const url of [
    "",
    "http://questos.workers.dev",
    "https://localhost",
    "https://127.0.0.1",
    "https://10.1.2.3",
    "https://id-preview--abc.lovable.app",
    "https://questos.lovable.app",
    "https://user:secret@questos.workers.dev",
    "https://questos.workers.dev/path",
    "https://questos.workers.dev/?a=1",
    "https://questos.workers.dev/#fragment",
    "https://questos.workers.dev:8443",
  ])
    expect(() => validateRuntimeOrigin(url)).toThrow();
  expect(validateRuntimeOrigin("https://questos.owner.workers.dev/")).toBe(
    "https://questos.owner.workers.dev",
  );
});
