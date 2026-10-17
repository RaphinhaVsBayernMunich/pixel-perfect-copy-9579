import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        } catch {
          toast.error("Could not sign out. Please retry.");
        } finally {
          setPending(false);
        }
      }}
    >
      <LogOut className="size-4" />
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
