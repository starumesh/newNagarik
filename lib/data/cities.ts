export const CITIES = [
  "Bengaluru",
  "Mumbai",
  "Delhi NCR",
  "Hyderabad",
  "Pune",
  "Chennai",
] as const;

export type CityName = (typeof CITIES)[number];

export const CITY_AREAS: Record<CityName, string[]> = {
  Bengaluru: [
    "Koramangala",
    "Indiranagar",
    "Whitefield",
    "HSR Layout",
    "Jayanagar",
    "Electronic City",
    "Hebbal",
    "JP Nagar",
  ],
  Mumbai: [
    "Andheri",
    "Bandra",
    "Powai",
    "Worli",
    "Thane",
    "Navi Mumbai",
    "Goregaon",
  ],
  "Delhi NCR": [
    "Dwarka",
    "Saket",
    "Gurugram",
    "Noida",
    "Rohini",
    "Greater Kailash",
  ],
  Hyderabad: [
    "Gachibowli",
    "Hitech City",
    "Banjara Hills",
    "Kondapur",
    "Madhapur",
  ],
  Pune: ["Hinjewadi", "Kothrud", "Viman Nagar", "Baner", "Kharadi"],
  Chennai: ["Adyar", "Velachery", "OMR", "Anna Nagar", "T Nagar"],
};

export const SAMPLE_BUILDINGS: Record<string, string[]> = {
  Koramangala: ["Prestige Acropolis", "Salarpuria Sattva Cadenza", "Sobha Daisy"],
  Indiranagar: ["Brigade Courtyard", "Total Environment Windmills of Your Mind"],
  Whitefield: ["Prestige Lakeside Habitat", "Sobha Dream Acres", "Brigade Metropolis"],
  "HSR Layout": ["Salarpuria Sattva Magnificia", "Purva Skywood"],
  Andheri: ["Kalpataru Sparkle", "Lodha Fiorenza"],
  Bandra: ["Piramal Aranya Annex", "Raheja Exotica"],
  Powai: ["Hiranandani Gardens", "Lake Homes Powai"],
  Gurugram: ["DLF The Crest", "M3M Golf Estate", "Vatika City"],
  Gachibowli: ["My Home Bhooja", "Prestige High Fields"],
  Hinjewadi: ["Rohan Kritika", "Vascon Forest Edge"],
  Adyar: ["TVH Quadrant", "Casagrand First City"],
};

export function areasForCity(city: string): string[] {
  return CITY_AREAS[city as CityName] ?? [];
}

export function buildingsForArea(area: string): string[] {
  return SAMPLE_BUILDINGS[area] ?? [];
}
