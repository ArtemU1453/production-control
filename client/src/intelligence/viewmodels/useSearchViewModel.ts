import { useCallback, useEffect, useRef, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { SearchResults } from "../models";

interface SearchViewModel {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResults | null;
  searching: boolean;
}

/** ViewModel for global search. Queries are debounced and run against every
 *  entity repository through the search service. */
export function useSearchViewModel(): SearchViewModel {
  const { intelligence } = useServices();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(
    async (value: string) => {
      if (value.trim().length === 0) {
        setResults(null);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        setResults(await intelligence.search.search(value));
      } finally {
        setSearching(false);
      }
    },
    [intelligence],
  );

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => void run(query), 200);
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [query, run]);

  return { query, setQuery, results, searching };
}
