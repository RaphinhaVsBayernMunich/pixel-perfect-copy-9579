import { expect, test } from "bun:test";
import {
  PUBLIC_SUPABASE_URL,
  requireQuestosSupabaseUrl,
} from "../src/integrations/supabase/public-config";
test("all clients are pinned to the owner-controlled destination", () => {
  expect(PUBLIC_SUPABASE_URL).toBe("https://kqsoccbtookvwelctyhm.supabase.co");
  expect(() => requireQuestosSupabaseUrl(PUBLIC_SUPABASE_URL)).not.toThrow();
  for (const url of ["https://other.supabase.co", PUBLIC_SUPABASE_URL + "/", "http://localhost"])
    expect(() => requireQuestosSupabaseUrl(url)).toThrow();
});
