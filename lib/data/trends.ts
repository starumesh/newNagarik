import type { MarketSnapshot } from "@/lib/types";

export const MACRO_TRENDS: MarketSnapshot[] = [
  { city: "Bengaluru", locality: "Koramangala", avg_rent: 42000, yoy_change: 8.4, demand_index: 86 },
  { city: "Bengaluru", locality: "Whitefield", avg_rent: 32000, yoy_change: 11.2, demand_index: 91 },
  { city: "Bengaluru", locality: "HSR Layout", avg_rent: 38000, yoy_change: 7.1, demand_index: 80 },
  { city: "Bengaluru", locality: "Indiranagar", avg_rent: 48000, yoy_change: 6.2, demand_index: 77 },
  { city: "Bengaluru", locality: "Electronic City", avg_rent: 22000, yoy_change: 4.8, demand_index: 61 },
  { city: "Mumbai", locality: "Andheri", avg_rent: 55000, yoy_change: 5.4, demand_index: 84 },
  { city: "Mumbai", locality: "Bandra", avg_rent: 95000, yoy_change: 3.9, demand_index: 72 },
  { city: "Mumbai", locality: "Powai", avg_rent: 62000, yoy_change: 6.8, demand_index: 79 },
  { city: "Mumbai", locality: "Thane", avg_rent: 32000, yoy_change: 9.1, demand_index: 88 },
  { city: "Delhi NCR", locality: "Gurugram", avg_rent: 45000, yoy_change: 7.6, demand_index: 83 },
  { city: "Delhi NCR", locality: "Noida", avg_rent: 28000, yoy_change: 10.4, demand_index: 87 },
  { city: "Delhi NCR", locality: "Saket", avg_rent: 52000, yoy_change: 4.2, demand_index: 68 },
  { city: "Hyderabad", locality: "Gachibowli", avg_rent: 35000, yoy_change: 12.1, demand_index: 93 },
  { city: "Hyderabad", locality: "Hitech City", avg_rent: 38000, yoy_change: 11.4, demand_index: 90 },
  { city: "Pune", locality: "Hinjewadi", avg_rent: 24000, yoy_change: 9.8, demand_index: 89 },
  { city: "Pune", locality: "Baner", avg_rent: 30000, yoy_change: 8.2, demand_index: 81 },
  { city: "Chennai", locality: "OMR", avg_rent: 26000, yoy_change: 7.9, demand_index: 82 },
  { city: "Chennai", locality: "Adyar", avg_rent: 40000, yoy_change: 5.1, demand_index: 70 },
];

export const RENT_INFLATION_SERIES = [
  { month: "Sep", change: 0.4 },
  { month: "Oct", change: 0.6 },
  { month: "Nov", change: 0.5 },
  { month: "Dec", change: 0.8 },
  { month: "Jan", change: 1.1 },
  { month: "Feb", change: 0.9 },
  { month: "Mar", change: 1.3 },
  { month: "Apr", change: 1.0 },
  { month: "May", change: 1.4 },
  { month: "Jun", change: 1.2 },
  { month: "Jul", change: 1.5 },
  { month: "Aug", change: 1.1 },
];

export const TOP_SEARCHED_LOCALITIES = [
  { city: "Bengaluru", locality: "Whitefield", searches: 12840 },
  { city: "Hyderabad", locality: "Gachibowli", searches: 11220 },
  { city: "Mumbai", locality: "Thane", searches: 10110 },
  { city: "Pune", locality: "Hinjewadi", searches: 9340 },
  { city: "Delhi NCR", locality: "Noida", searches: 8890 },
];
