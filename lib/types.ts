export type UserRole = "owner" | "renter" | "explorer";
export type Purpose = "view_trends" | "list_property" | "connect";
export type FloorLevel = "ground" | "low" | "mid" | "high";
export type Furnishing = "unfurnished" | "semi" | "fully";
export type TotalUnits = "<10" | "11-30" | "31-100" | "100+";
export type PowerBackup = "yes" | "no" | "partial";
export type Parking = "yes" | "no" | "paid";
export type VerificationStatus = "auto_approved" | "under_review" | "rejected";

export type UserProfile = {
  id: string;
  role: UserRole;
  trust_score: number;
  restricted_until: string | null;
  onboarding_completed: boolean;
  purpose: Purpose | null;
  home_city: string | null;
  created_at: string;
};

export type LocationRow = {
  id: string;
  city: string;
  area: string;
  building_name: string;
};

export type RentEntry = {
  id: string;
  user_id: string;
  location_id: string;
  bhk: number;
  monthly_rent: number;
  maintenance: number;
  carpet_area: number;
  floor_level: FloorLevel;
  furnishing: Furnishing;
  total_units: TotalUnits;
  has_lift: boolean;
  has_parking: boolean;
  parking: Parking;
  power_backup: PowerBackup;
  metro_distance: number | null;
  internal_locality_avg: number | null;
  scraped_external_avg: number | null;
  verification_status: VerificationStatus;
  submitted_at: string;
  locations?: LocationRow;
};

export type PropertyListing = {
  id: string;
  owner_id: string;
  location_id: string;
  asking_rent: number;
  bhk: number;
  furnishing: Furnishing;
  photos: string[];
  is_active: boolean;
  created_at: string;
  locations?: LocationRow;
};

export type ExternalListing = {
  id: string;
  platform: AggregatorPlatform;
  title: string;
  building_name: string;
  city: string;
  area: string;
  bhk: number | null;
  monthly_rent: number | null;
  furnishing: string | null;
  url: string | null;
  rent_per_sqft: number | null;
};

export type AggregatorPlatform =
  | "NoBroker"
  | "99acres"
  | "MyGate"
  | "MagicBricks"
  | "Anacity";

export type MarketSnapshot = {
  city: string;
  locality: string;
  avg_rent: number;
  yoy_change: number;
  demand_index: number;
};

export type SearchResponse = {
  internal: Array<
    RentEntry & {
      stats?: {
        avg: number;
        median: number;
        min: number;
        max: number;
        count: number;
      };
    }
  >;
  listings: PropertyListing[];
  external: ExternalListing[];
  building?: LocationRow;
};

export type VerificationResult = {
  status: VerificationStatus | "blocked";
  reason?: string;
  pillars: {
    pillar_1_passed: boolean;
    pillar_2_passed: boolean;
    pillar_3_passed: boolean;
    pillar_4_passed: boolean;
  };
  details: Record<string, unknown>;
};
