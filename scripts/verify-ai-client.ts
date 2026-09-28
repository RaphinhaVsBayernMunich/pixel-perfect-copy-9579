import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const root = ".output/public";
const patterns = [
  /DEEPSEEK_API_KEY/i,
  /api\.deepseek\.com/i,
  /sk-[a-zA-Z0-9]{20,}/,
  /questos-build-test-secret-not-a-real-key/,
];
// Compare an existing environment credential without ever printing its value.
const actualKey = process.env.DEEPSEEK_API_KEY;
let scanned = 0;
let failures = 0;
async function scan(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else {
      scanned++;
      const content = await readFile(path, "utf8");
      if (
        patterns.some((pattern) => pattern.test(content)) ||
        (actualKey && content.includes(actualKey))
      ) {
        failures++;
        console.error(`AI client isolation check failed: ${path}`);
      }
    }
  }
}
await scan(root);
if (failures) process.exitCode = 1;
else
  console.log(
    `PASS: ${scanned} client files contain no DeepSeek key name, credential pattern, test secret or provider endpoint.`,
  );
