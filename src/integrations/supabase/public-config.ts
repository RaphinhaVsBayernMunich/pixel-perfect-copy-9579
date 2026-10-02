// Owner-controlled QuestOS destination. Only browser-safe coordinates belong here.
export const PUBLIC_SUPABASE_URL = "https://kqsoccbtookvwelctyhm.supabase.co";
export const PUBLIC_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtxc29jY2J0b29rdndlbGN0eWhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5NTM2NTQsImV4cCI6MjEwNjUyOTY1NH0.4UCwqktVtZqfIHv3EBugVRAwkqnsbHSGtWTLAePNS9k";
export function requireQuestosSupabaseUrl(value: string): void {
  if (value !== PUBLIC_SUPABASE_URL)
    throw new Error(
      "QuestOS requires its owner-controlled Supabase project. Update stale environment configuration.",
    );
}
