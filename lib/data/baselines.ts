/** Locality baseline rent per sqft (₹ / month). Used by Pillar 2. */
export const LOCALITY_BASELINE_PSF: Record<string, number> = {
  "Bengaluru:Koramangala": 82,
  "Bengaluru:Indiranagar": 88,
  "Bengaluru:Whitefield": 62,
  "Bengaluru:HSR Layout": 74,
  "Bengaluru:Jayanagar": 70,
  "Bengaluru:Electronic City": 42,
  "Bengaluru:Hebbal": 58,
  "Bengaluru:JP Nagar": 64,
  "Mumbai:Andheri": 95,
  "Mumbai:Bandra": 165,
  "Mumbai:Powai": 110,
  "Mumbai:Worli": 180,
  "Mumbai:Thane": 58,
  "Mumbai:Navi Mumbai": 62,
  "Mumbai:Goregaon": 80,
  "Delhi NCR:Dwarka": 48,
  "Delhi NCR:Saket": 78,
  "Delhi NCR:Gurugram": 72,
  "Delhi NCR:Noida": 45,
  "Delhi NCR:Rohini": 40,
  "Delhi NCR:Greater Kailash": 95,
  "Hyderabad:Gachibowli": 55,
  "Hyderabad:Hitech City": 60,
  "Hyderabad:Banjara Hills": 85,
  "Hyderabad:Kondapur": 52,
  "Hyderabad:Madhapur": 58,
  "Pune:Hinjewadi": 38,
  "Pune:Kothrud": 48,
  "Pune:Viman Nagar": 52,
  "Pune:Baner": 50,
  "Pune:Kharadi": 46,
  "Chennai:Adyar": 68,
  "Chennai:Velachery": 48,
  "Chennai:OMR": 42,
  "Chennai:Anna Nagar": 58,
  "Chennai:T Nagar": 72,
};

export const CITY_BASELINE_PSF: Record<string, number> = {
  Bengaluru: 68,
  Mumbai: 98,
  "Delhi NCR": 62,
  Hyderabad: 54,
  Pune: 46,
  Chennai: 52,
};

export function baselinePsf(city: string, area: string): number {
  return (
    LOCALITY_BASELINE_PSF[`${city}:${area}`] ??
    CITY_BASELINE_PSF[city] ??
    55
  );
}
