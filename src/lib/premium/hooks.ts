import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth-store";
import { usePremium } from "../subscription/service";
import { getPremiumData } from "./premium.functions";
export function usePremiumData() {
  const user = useAuth((s) => s.user?.id);
  const allowed = usePremium("analytics.advanced");
  return useQuery({
    queryKey: ["premium", user],
    queryFn: async () => {
      if (useAuth.getState().user?.id !== user) throw new Error("Account changed");
      const data = await getPremiumData();
      if (data.userId !== user || useAuth.getState().user?.id !== user)
        throw new Error("Account changed");
      return data;
    },
    enabled: !!user && allowed,
    staleTime: 15000,
    retry: false,
  });
}
export function useRefreshPremium() {
  const client = useQueryClient();
  const user = useAuth((s) => s.user?.id);
  return () => client.invalidateQueries({ queryKey: ["premium", user] });
}
