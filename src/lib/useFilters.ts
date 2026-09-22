"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { filtersToParams, paramsToFilters } from "./filter";
import type { Filters } from "./types";

/**
 * Filter state lives in the URL rather than component state.
 *
 * Three things fall out of that for free: a filtered view is shareable, it
 * survives a reload, and it carries across the Dashboard/Records navigation —
 * which is what makes the filters genuinely global rather than per-page.
 */
export function useFilters(): [Filters, (f: Filters) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => paramsToFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setFilters = useCallback(
    (next: Filters) => {
      const params = filtersToParams(next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  return [filters, setFilters];
}
