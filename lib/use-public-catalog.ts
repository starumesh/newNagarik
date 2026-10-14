"use client";

import { useCallback, useEffect, useState } from "react";
import { CITIES, CITY_AREAS } from "@/lib/data/cities";

const fallbackAreas: Record<string, string[]> = Object.fromEntries(
  Object.entries(CITY_AREAS)
);

export function usePublicCatalog() {
  const [cities, setCities] = useState<string[]>([...CITIES]);
  const [areasByCity, setAreasByCity] =
    useState<Record<string, string[]>>(fallbackAreas);

  useEffect(() => {
    void fetch("/api/catalog")
      .then((response) => response.json())
      .then((json: { cities?: string[]; areas?: Record<string, string[]> }) => {
        if (Array.isArray(json.cities) && json.cities.length > 0) {
          setCities(json.cities);
        }
        if (json.areas && Object.keys(json.areas).length > 0) {
          setAreasByCity(json.areas);
        }
      })
      .catch(() => {});
  }, []);

  const areasFor = useCallback(
    (city: string) => areasByCity[city] ?? [],
    [areasByCity]
  );

  return { cities, areasFor };
}
