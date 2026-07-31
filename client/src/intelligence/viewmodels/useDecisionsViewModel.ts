import { useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { Insights } from "../services/IntelligenceService";

interface DecisionsViewModel {
  loading: boolean;
  insights: Insights | null;
}

/** ViewModel for the Decision Center: forecasts, quality control and
 *  recommendations, all derived from the shared aggregation context. */
export function useDecisionsViewModel(): DecisionsViewModel {
  const { intelligence } = useServices();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insights | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await intelligence.intelligence.insights();
      if (active) {
        setInsights(result);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [intelligence]);

  return { loading, insights };
}
