export type UserRole = "owner" | "renter" | "explorer";
export type Purpose =
  | "view_trends"
  | "list_property"
  | "find_rent"
  | "connect";
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
  kind?: "building" | "society" | "community";
  is_enabled?: boolean;
};

export type ReviewerIdentity = {
  phone: string | null;
  email: string | null;
  auth_via: string | null;
};

export type LocalInsights = {
  problems_faced?: string;
  hurdles?: string;
  local_politics?: string;
  legal_issues?: string;
  distance_metro_km?: number | null;
  distance_railway_km?: number | null;
  distance_airport_km?: number | null;
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
  local_insights?: LocalInsights | null;
  internal_locality_avg: number | null;
  scraped_external_avg: number | null;
  verification_status: VerificationStatus;
  is_hidden?: boolean;
  tags?: string[];
  photos?: string[];
  admin_score?: number | null;
  submitted_at: string;
  locations?: LocationRow;
  reviewer?: ReviewerIdentity | null;
};

export type PropertyListing = {
  id: string;
  owner_id: string;
  location_id: string;
  asking_rent: number;
  bhk: number;
  carpet_area?: number | null;
  furnishing: Furnishing;
  photos: string[];
  maintenance_status?: "included" | "extra" | "none" | null;
  maintenance_amount?: number | null;
  pet_friendly?: "yes" | "no" | "case_by_case" | null;
  pet_case_notes?: string | null;
  building_age_years?: number | null;
  floor_number?: number | null;
  facilities?: string[];
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
  posted_by?: ListingPoster;
  posted_at?: string | null;
};

export type AggregatorPlatform =
  | "NoBroker"
  | "99acres"
  | "MyGate"
  | "MagicBricks"
  | "Anacity";

export type ListingPoster = "owner" | "broker" | "unknown";

export type OwnerPlatform = "NoBroker" | "MagicBricks" | "MyGate";

export type AggregatorPost = ExternalListing & {
  external_id: string;
  posted_by: ListingPoster;
  posted_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
};

export type AreaWatch = {
  id: string;
  city: string;
  area: string;
  platforms: OwnerPlatform[];
  notify_email: string | null;
  is_enabled: boolean;
  last_scraped_at: string | null;
};

export type AggregatorAlert = {
  id: string;
  watch_id: string | null;
  listing_id: string | null;
  title: string;
  city: string;
  area: string;
  platform: AggregatorPlatform;
  url: string | null;
  created_at: string;
  read_at: string | null;
};

export type MarketSnapshot = {
  city: string;
  locality: string;
  avg_rent: number;
  yoy_change: number;
  demand_index: number;
};

export type SearchResponse = {
  query?: string;
  matches?: LocationRow[];
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
  pendingCount?: number;
  reviews?: RentEntry[];
  stats?: {
    avg: number;
    median: number;
    min: number;
    max: number;
    count: number;
  };
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
