import type { CityName } from "@/lib/data/cities";

export type ExploreTopic =
  | "overview"
  | "demand"
  | "it-gcc"
  | "projects"
  | "news"
  | "income";

export const EXPLORE_TOPICS: Array<{ id: ExploreTopic; label: string; blurb: string }> = [
  {
    id: "overview",
    label: "Overview",
    blurb: "City pulse — demand, inflation, and what’s moving rents.",
  },
  {
    id: "demand",
    label: "Demand & trending",
    blurb: "Where searches and move-ins are concentrating right now.",
  },
  {
    id: "it-gcc",
    label: "IT & GCC belts",
    blurb: "Tech parks, global capability centres, and renter catchment.",
  },
  {
    id: "projects",
    label: "Projects pipeline",
    blurb: "Upcoming launches, delivery timelines, and corridor shifts.",
  },
  {
    id: "news",
    label: "Market moves",
    blurb: "News, policy signals, and real-estate moves worth watching.",
  },
  {
    id: "income",
    label: "Income belts",
    blurb: "High-income pockets, lifestyle belts, and areas of interest.",
  },
];

export type DemandArea = {
  city: CityName;
  locality: string;
  avg_rent: number;
  yoy_change: number;
  demand_index: number;
  tag: "Trending" | "Stable" | "Emerging" | "Premium";
  why: string;
};

export type Corridor = {
  city: CityName;
  name: string;
  kind: "IT park" | "GCC hub" | "SEZ" | "Fintech" | "Mixed";
  employers: string[];
  catchments: string[];
  rent_band: string;
  note: string;
};

export type Project = {
  city: CityName;
  name: string;
  area: string;
  type: "Residential" | "Office" | "Mixed-use" | "Infra";
  status: "Launched" | "Under construction" | "Announced" | "Near delivery";
  timeline: string;
  units_or_sqft: string;
  impact: string;
};

export type NewsItem = {
  city: CityName | "India";
  title: string;
  summary: string;
  category: "Policy" | "Infra" | "Corporate" | "Market" | "Lifestyle";
  date: string;
  source: string;
};

export type IncomeBelt = {
  city: CityName;
  locality: string;
  income_band: "₹15–30L" | "₹30–50L" | "₹50L+" | "Mixed";
  vibe: string;
  rent_signal: string;
  interest: "High" | "Rising" | "Steady";
};

export type TimelineEvent = {
  city: CityName;
  quarter: string;
  title: string;
  detail: string;
};

export type CityPulse = {
  city: CityName;
  headline: string;
  vacancy_hint: string;
  absorption: string;
  hot_corridor: string;
};

export const CITY_PULSE: CityPulse[] = [
  {
    city: "Bengaluru",
    headline: "East & south corridors still set the rent tone.",
    vacancy_hint: "Selective tightness near ORR tech nodes",
    absorption: "Strong 2–3 BHK absorption in Whitefield–Sarjapur arc",
    hot_corridor: "ORR / Outer Ring Road",
  },
  {
    city: "Mumbai",
    headline: "Western suburbs trade lifestyle premium; Thane catches overflow.",
    vacancy_hint: "Micro-markets diverging sharply by commute",
    absorption: "Family 2 BHK demand firm in Thane–Navi Mumbai",
    hot_corridor: "Western line + Thane belt",
  },
  {
    city: "Delhi NCR",
    headline: "Gurugram & Noida absorb GCC and product engineering hiring.",
    vacancy_hint: "Golf Course Road premium holds; peripheral rents climb",
    absorption: "Noida Expressway and Dwarka Expressway in focus",
    hot_corridor: "Gurugram–Noida twin poles",
  },
  {
    city: "Hyderabad",
    headline: "West Hyderabad remains India’s fastest GCC rent story.",
    vacancy_hint: "Low vacancy near Hitech–Gachibowli",
    absorption: "New supply still absorbed by IT/GCC leasing",
    hot_corridor: "Financial District / Hitech City",
  },
  {
    city: "Pune",
    headline: "Hinjewadi spillover reshapes west Pune rents.",
    vacancy_hint: "Balewadi–Baner stay competitive for mid-premium",
    absorption: "IT campuses keep 1–2 BHK velocity high",
    hot_corridor: "Hinjewadi–Baner–Balewadi",
  },
  {
    city: "Chennai",
    headline: "OMR and ECR split between jobs and lifestyle rents.",
    vacancy_hint: "OMR corridors sensitive to campus hiring cycles",
    absorption: "Steady family demand in Adyar–Besant Nagar belt",
    hot_corridor: "OMR / Siruseri",
  },
];

export const DEMAND_AREAS: DemandArea[] = [
  { city: "Bengaluru", locality: "Whitefield", avg_rent: 32000, yoy_change: 11.2, demand_index: 91, tag: "Trending", why: "IT campuses + new metro catchment" },
  { city: "Bengaluru", locality: "Sarjapur Road", avg_rent: 34000, yoy_change: 10.6, demand_index: 88, tag: "Emerging", why: "ORR spillover and new gated supply" },
  { city: "Bengaluru", locality: "Koramangala", avg_rent: 42000, yoy_change: 8.4, demand_index: 86, tag: "Premium", why: "Startup + lifestyle gravity" },
  { city: "Bengaluru", locality: "HSR Layout", avg_rent: 38000, yoy_change: 7.1, demand_index: 80, tag: "Stable", why: "Balanced for couples and families" },
  { city: "Bengaluru", locality: "Electronic City", avg_rent: 22000, yoy_change: 4.8, demand_index: 61, tag: "Stable", why: "Value rents near older IT base" },
  { city: "Bengaluru", locality: "Indiranagar", avg_rent: 48000, yoy_change: 6.2, demand_index: 77, tag: "Premium", why: "High lifestyle premium, limited stock" },
  { city: "Mumbai", locality: "Thane", avg_rent: 32000, yoy_change: 9.1, demand_index: 88, tag: "Trending", why: "Space-for-money vs island city" },
  { city: "Mumbai", locality: "Andheri", avg_rent: 55000, yoy_change: 5.4, demand_index: 84, tag: "Stable", why: "Job access across west & central" },
  { city: "Mumbai", locality: "Powai", avg_rent: 62000, yoy_change: 6.8, demand_index: 79, tag: "Premium", why: "Corporate + lake-facing stock" },
  { city: "Mumbai", locality: "Bandra", avg_rent: 95000, yoy_change: 3.9, demand_index: 72, tag: "Premium", why: "Scarce inventory, lifestyle ceiling" },
  { city: "Mumbai", locality: "Navi Mumbai", avg_rent: 28000, yoy_change: 8.8, demand_index: 85, tag: "Emerging", why: "Airport + office corridor bets" },
  { city: "Delhi NCR", locality: "Gurugram", avg_rent: 45000, yoy_change: 7.6, demand_index: 83, tag: "Trending", why: "GCC and consulting demand" },
  { city: "Delhi NCR", locality: "Noida", avg_rent: 28000, yoy_change: 10.4, demand_index: 87, tag: "Trending", why: "Product engineering hiring" },
  { city: "Delhi NCR", locality: "Dwarka Expressway", avg_rent: 26000, yoy_change: 12.0, demand_index: 82, tag: "Emerging", why: "New supply + airport access" },
  { city: "Delhi NCR", locality: "Saket", avg_rent: 52000, yoy_change: 4.2, demand_index: 68, tag: "Premium", why: "South Delhi lifestyle hold" },
  { city: "Hyderabad", locality: "Gachibowli", avg_rent: 35000, yoy_change: 12.1, demand_index: 93, tag: "Trending", why: "Financial District gravity" },
  { city: "Hyderabad", locality: "Hitech City", avg_rent: 38000, yoy_change: 11.4, demand_index: 90, tag: "Trending", why: "Campus leasing density" },
  { city: "Hyderabad", locality: "Kokapet", avg_rent: 33000, yoy_change: 13.2, demand_index: 89, tag: "Emerging", why: "New towers near ORR west" },
  { city: "Pune", locality: "Hinjewadi", avg_rent: 24000, yoy_change: 9.8, demand_index: 89, tag: "Trending", why: "Phase campus commute rents" },
  { city: "Pune", locality: "Baner", avg_rent: 30000, yoy_change: 8.2, demand_index: 81, tag: "Stable", why: "Social infra + mid-premium" },
  { city: "Pune", locality: "Kharadi", avg_rent: 27000, yoy_change: 9.0, demand_index: 84, tag: "Emerging", why: "East Pune IT expansion" },
  { city: "Chennai", locality: "OMR", avg_rent: 26000, yoy_change: 7.9, demand_index: 82, tag: "Trending", why: "IT corridor staples" },
  { city: "Chennai", locality: "Adyar", avg_rent: 40000, yoy_change: 5.1, demand_index: 70, tag: "Premium", why: "Established south Chennai" },
  { city: "Chennai", locality: "Porur", avg_rent: 22000, yoy_change: 8.5, demand_index: 78, tag: "Emerging", why: "West Chennai job access" },
];

export const IT_GCC_CORRIDORS: Corridor[] = [
  {
    city: "Bengaluru",
    name: "ORR / Manyata–Whitefield arc",
    kind: "IT park",
    employers: ["Infosys", "Wipro", "Flipkart", "Google", "Microsoft"],
    catchments: ["Whitefield", "Marathahalli", "Hebbal", "Thanisandra"],
    rent_band: "₹22k–45k for 2 BHK",
    note: "Still the densest tech-renter catchment in India.",
  },
  {
    city: "Bengaluru",
    name: "Electronic City",
    kind: "SEZ",
    employers: ["Infosys", "TCS", "Biocon"],
    catchments: ["Electronic City", "Bommanahalli", "Hulimavu"],
    rent_band: "₹16k–28k for 2 BHK",
    note: "Value corridor; slower YoY than east Bengaluru.",
  },
  {
    city: "Hyderabad",
    name: "Financial District / Gachibowli",
    kind: "GCC hub",
    employers: ["Amazon", "Google", "Microsoft", "Deloitte", "Accenture"],
    catchments: ["Gachibowli", "Nanakramguda", "Kokapet", "Manikonda"],
    rent_band: "₹28k–48k for 2 BHK",
    note: "GCC hiring keeps vacancy structurally tight.",
  },
  {
    city: "Hyderabad",
    name: "Hitech City",
    kind: "IT park",
    employers: ["Tech Mahindra", "Cyient", "Optum"],
    catchments: ["Madhapur", "Kondapur", "Kukatpally"],
    rent_band: "₹26k–42k for 2 BHK",
    note: "Mature stock; premiums for newer gated societies.",
  },
  {
    city: "Pune",
    name: "Hinjewadi Rajiv Gandhi Infotech Park",
    kind: "IT park",
    employers: ["Infosys", "Wipro", "Cognizant", "KPIT"],
    catchments: ["Hinjewadi", "Wakad", "Baner", "Balewadi"],
    rent_band: "₹18k–32k for 2 BHK",
    note: "Phase traffic shapes which micro-markets move first.",
  },
  {
    city: "Pune",
    name: "Kharadi–Hadapsar east belt",
    kind: "GCC hub",
    employers: ["Barclays", "UBS", "World Trade Center tenants"],
    catchments: ["Kharadi", "Hadapsar", "Magarpatta"],
    rent_band: "₹20k–34k for 2 BHK",
    note: "Rising alternate to west Pune for BFSI GCCs.",
  },
  {
    city: "Chennai",
    name: "OMR / Siruseri",
    kind: "IT park",
    employers: ["TCS", "Cognizant", "Zoho", "Ford IT"],
    catchments: ["Sholinganallur", "Perungudi", "Thoraipakkam", "Siruseri"],
    rent_band: "₹18k–30k for 2 BHK",
    note: "Hiring cycles show up quickly in OMR rents.",
  },
  {
    city: "Mumbai",
    name: "BKC–Powai–Airoli office triangle",
    kind: "Mixed",
    employers: ["Banks in BKC", "LTIMindtree", "TCS Airoli"],
    catchments: ["Bandra", "Powai", "Thane", "Airoli"],
    rent_band: "₹35k–1L+ depending on belt",
    note: "Rent spreads are among India’s widest by commute.",
  },
  {
    city: "Delhi NCR",
    name: "Gurugram Cyber City / Golf Course",
    kind: "GCC hub",
    employers: ["Google", "American Express", "Tribeca tenants"],
    catchments: ["DLF Phases", "Sohna Road", "Sector 40–57"],
    rent_band: "₹35k–70k for 2–3 BHK",
    note: "Premium GCC housing demand stays resilient.",
  },
  {
    city: "Delhi NCR",
    name: "Noida–Greater Noida IT belt",
    kind: "IT park",
    employers: ["HCL", "Samsung", "Paytm ecosystem", "Product startups"],
    catchments: ["Sector 62", "Sector 137", "Greater Noida West"],
    rent_band: "₹18k–35k for 2 BHK",
    note: "Best value among NCR job hubs right now.",
  },
];

export const PROJECTS: Project[] = [
  {
    city: "Bengaluru",
    name: "ORR metro extensions & Whitefield links",
    area: "East Bengaluru",
    type: "Infra",
    status: "Under construction",
    timeline: "Phased through 2026–27",
    units_or_sqft: "Corridor-wide",
    impact: "Supports rent premiums within ~1–2 km of stations.",
  },
  {
    city: "Bengaluru",
    name: "New gated launches on Sarjapur–Attibele",
    area: "Sarjapur Road",
    type: "Residential",
    status: "Launched",
    timeline: "Possession 2027–28",
    units_or_sqft: "3k+ units across launches",
    impact: "Near-term rent competition; longer-term absorption expected.",
  },
  {
    city: "Hyderabad",
    name: "Kokapet & Neopolis residential cluster",
    area: "West Hyderabad",
    type: "Residential",
    status: "Under construction",
    timeline: "Deliveries 2026–28",
    units_or_sqft: "Large tower pipeline",
    impact: "Keeps Financial District rents from overheating alone.",
  },
  {
    city: "Hyderabad",
    name: "Office completions near Nanakramguda",
    area: "Financial District",
    type: "Office",
    status: "Near delivery",
    timeline: "2026",
    units_or_sqft: "Multi-mn sqft",
    impact: "More GCC seats → sticky rental demand nearby.",
  },
  {
    city: "Mumbai",
    name: "Navi Mumbai International Airport catchment",
    area: "Navi Mumbai / Ulwe",
    type: "Infra",
    status: "Near delivery",
    timeline: "Airport ops ramp 2026+",
    units_or_sqft: "City-scale",
    impact: "Early rent interest in Ulwe–Panvel belts.",
  },
  {
    city: "Mumbai",
    name: "Thane high-rise family inventory",
    area: "Thane West",
    type: "Residential",
    status: "Launched",
    timeline: "Ongoing handovers",
    units_or_sqft: "Continuous supply",
    impact: "Keeps Thane as Mumbai’s overflow valve.",
  },
  {
    city: "Delhi NCR",
    name: "Dwarka Expressway housing wave",
    area: "Gurugram north-west",
    type: "Residential",
    status: "Under construction",
    timeline: "2026–29",
    units_or_sqft: "Large mid-premium stock",
    impact: "New rental options vs Golf Course Road premiums.",
  },
  {
    city: "Delhi NCR",
    name: "Noida airport & Jewar access bets",
    area: "Greater Noida",
    type: "Infra",
    status: "Announced",
    timeline: "Multi-year",
    units_or_sqft: "Regional",
    impact: "Speculative buyer interest; rents still selective.",
  },
  {
    city: "Pune",
    name: "Hinjewadi Phase connectivity upgrades",
    area: "West Pune",
    type: "Infra",
    status: "Under construction",
    timeline: "2026–27",
    units_or_sqft: "Road / ring links",
    impact: "Can re-rank Wakad vs Baner desirability.",
  },
  {
    city: "Pune",
    name: "Kharadi riverside residences",
    area: "East Pune",
    type: "Residential",
    status: "Launched",
    timeline: "2027 possessions",
    units_or_sqft: "Mid to premium",
    impact: "Supports east Pune as a second IT living hub.",
  },
  {
    city: "Chennai",
    name: "OMR residential refresh near Sholinganallur",
    area: "OMR",
    type: "Residential",
    status: "Launched",
    timeline: "2026–28",
    units_or_sqft: "Multiple mid-rise projects",
    impact: "More choice for IT renters avoiding older stock.",
  },
  {
    city: "Chennai",
    name: "Porur–Poonamallee corridor growth",
    area: "West Chennai",
    type: "Mixed-use",
    status: "Announced",
    timeline: "2027+",
    units_or_sqft: "Township-led",
    impact: "Watch for value rents before infra catches up.",
  },
];

export const MARKET_NEWS: NewsItem[] = [
  {
    city: "India",
    title: "GCCs keep expanding seat counts across tier-1 cities",
    summary:
      "Global capability centres continue leasing in Hyderabad, Bengaluru, and Pune — the strongest structural support under mid-premium rents.",
    category: "Corporate",
    date: "Aug 2026",
    source: "Market desk",
  },
  {
    city: "Bengaluru",
    title: "East Bengaluru rents track metro and ORR access more than brand alone",
    summary:
      "Societies within practical metro / ORR reach are seeing stickier occupancy even when headline asking rents look flat.",
    category: "Market",
    date: "Aug 2026",
    source: "City brief",
  },
  {
    city: "Hyderabad",
    title: "West Hyderabad vacancy stays among the tightest nationally",
    summary:
      "Financial District and Hitech catchments continue to absorb new residential supply with limited rent relief for tenants.",
    category: "Market",
    date: "Jul 2026",
    source: "City brief",
  },
  {
    city: "Mumbai",
    title: "Thane and Navi Mumbai absorb family demand leaving island premiums",
    summary:
      "Households trade commute for space — keeping suburban 2–3 BHK velocity healthier than south Mumbai.",
    category: "Lifestyle",
    date: "Jul 2026",
    source: "City brief",
  },
  {
    city: "Delhi NCR",
    title: "Dwarka Expressway becomes the alternate Gurugram rent conversation",
    summary:
      "New inventory is creating a second price band below Golf Course Road while airport access improves perceived connectivity.",
    category: "Infra",
    date: "Aug 2026",
    source: "NCR watch",
  },
  {
    city: "Pune",
    title: "East Pune IT leasing quietly rebalances west-only rent gravity",
    summary:
      "Kharadi–Hadapsar is picking up BFSI/GCC spillover, giving renters more than a Hinjewadi-only map.",
    category: "Corporate",
    date: "Jun 2026",
    source: "City brief",
  },
  {
    city: "Chennai",
    title: "OMR rents remain sensitive to campus hiring pauses",
    summary:
      "When IT hiring cools, OMR listings linger longer; Adyar–Besant Nagar lifestyle rents stay comparatively steady.",
    category: "Market",
    date: "Jun 2026",
    source: "City brief",
  },
  {
    city: "India",
    title: "RERA and society governance stay a quiet renter due-diligence theme",
    summary:
      "Beyond rent math, litigation, maintenance surprises, and association friction remain the lived-in gaps listings skip.",
    category: "Policy",
    date: "May 2026",
    source: "NewNagarik notes",
  },
  {
    city: "Mumbai",
    title: "Airport city bets push early interest in Ulwe–Panvel rentals",
    summary:
      "Speculative demand is ahead of day-to-day amenities in pockets — explorers should separate hype timelines from commute reality.",
    category: "Infra",
    date: "Aug 2026",
    source: "Market desk",
  },
  {
    city: "Bengaluru",
    title: "Sarjapur emerges as the overflow map for ORR professionals",
    summary:
      "Newer gated communities are competing on amenities while older Koramangala/HSR stock holds lifestyle premiums.",
    category: "Market",
    date: "Jul 2026",
    source: "City brief",
  },
];

export const INCOME_BELTS: IncomeBelt[] = [
  { city: "Bengaluru", locality: "Indiranagar", income_band: "₹50L+", vibe: "Walkable, dining, scarce stock", rent_signal: "Highest lifestyle premium", interest: "High" },
  { city: "Bengaluru", locality: "Koramangala", income_band: "₹30–50L", vibe: "Startup + café density", rent_signal: "Firm 2–3 BHK", interest: "High" },
  { city: "Bengaluru", locality: "Whitefield", income_band: "₹30–50L", vibe: "Campus families & couples", rent_signal: "Rising with connectivity", interest: "Rising" },
  { city: "Mumbai", locality: "Bandra West", income_band: "₹50L+", vibe: "Coastal lifestyle ceiling", rent_signal: "Scarce, sticky asks", interest: "High" },
  { city: "Mumbai", locality: "Powai", income_band: "₹30–50L", vibe: "Corporate township feel", rent_signal: "Premium vs Thane value", interest: "Steady" },
  { city: "Mumbai", locality: "Thane West", income_band: "₹15–30L", vibe: "Family space trade-off", rent_signal: "Best ₹/sqft nearby", interest: "Rising" },
  { city: "Delhi NCR", locality: "Golf Course Road", income_band: "₹50L+", vibe: "GCC executive housing", rent_signal: "Top NCR band", interest: "High" },
  { city: "Delhi NCR", locality: "Noida Expressway", income_band: "₹30–50L", vibe: "Newer towers, product talent", rent_signal: "Value vs Gurugram", interest: "Rising" },
  { city: "Hyderabad", locality: "Gachibowli", income_band: "₹30–50L", vibe: "Financial District living", rent_signal: "Fastest national climb", interest: "High" },
  { city: "Hyderabad", locality: "Jubilee Hills", income_band: "₹50L+", vibe: "Legacy premium south", rent_signal: "Lifestyle, not job-led", interest: "Steady" },
  { city: "Pune", locality: "Baner–Balewadi", income_band: "₹30–50L", vibe: "Social infra + IT access", rent_signal: "Mid-premium sweet spot", interest: "High" },
  { city: "Pune", locality: "Kalyani Nagar", income_band: "₹50L+", vibe: "Central-east premium", rent_signal: "Tight boutique stock", interest: "Steady" },
  { city: "Chennai", locality: "Adyar / Besant Nagar", income_band: "₹30–50L", vibe: "Beach-adjacent established", rent_signal: "Stable premium", interest: "Steady" },
  { city: "Chennai", locality: "OMR Sholinganallur", income_band: "₹15–30L", vibe: "IT renter mainstream", rent_signal: "Hiring-linked", interest: "Rising" },
];

export const CITY_TIMELINES: TimelineEvent[] = [
  { city: "Bengaluru", quarter: "Q3 2026", title: "Metro catchment re-pricing", detail: "Stations on east lines influence listing velocity within walking / feeder distance." },
  { city: "Bengaluru", quarter: "Q1 2027", title: "Sarjapur possession wave", detail: "Fresh supply may briefly widen choice before ORR demand re-absorbs it." },
  { city: "Hyderabad", quarter: "Q4 2026", title: "Office near-delivery peak", detail: "More GCC seats online near Financial District — rents nearby stay supported." },
  { city: "Hyderabad", quarter: "2027–28", title: "Kokapet tower handovers", detail: "West Hyderabad gets more mid-premium options without killing Gachibowli gravity." },
  { city: "Mumbai", quarter: "2026", title: "Airport city attention", detail: "Ulwe–Panvel watchlist grows; amenities lag headlines in places." },
  { city: "Mumbai", quarter: "Ongoing", title: "Thane as overflow valve", detail: "Family 2–3 BHK demand stays structurally linked to island-city unaffordability." },
  { city: "Delhi NCR", quarter: "2026–28", title: "Dwarka Expressway stock", detail: "Creates a clearer second rent band under classic Gurugram premiums." },
  { city: "Delhi NCR", quarter: "Multi-year", title: "Jewar / Noida airport narrative", detail: "Long-cycle story — separate speculation from today’s commute rents." },
  { city: "Pune", quarter: "2026–27", title: "West connectivity upgrades", detail: "Can reshuffle Wakad / Hinjewadi / Baner preference order." },
  { city: "Pune", quarter: "2027", title: "East Pune residential delivery", detail: "Kharadi strengthens as a dual-hub living alternative." },
  { city: "Chennai", quarter: "2026–28", title: "OMR housing refresh", detail: "Newer product competes with older IT-corridor stock." },
  { city: "Chennai", quarter: "2027+", title: "West Chennai corridor watch", detail: "Porur–Poonamallee is early-stage; infra timing matters." },
];

export const RENT_INFLATION_BY_CITY: Record<string, Array<{ month: string; change: number }>> = {
  Bengaluru: [
    { month: "Sep", change: 0.5 }, { month: "Oct", change: 0.7 }, { month: "Nov", change: 0.6 },
    { month: "Dec", change: 0.9 }, { month: "Jan", change: 1.2 }, { month: "Feb", change: 1.0 },
    { month: "Mar", change: 1.4 }, { month: "Apr", change: 1.1 }, { month: "May", change: 1.5 },
    { month: "Jun", change: 1.3 }, { month: "Jul", change: 1.6 }, { month: "Aug", change: 1.2 },
  ],
  Mumbai: [
    { month: "Sep", change: 0.3 }, { month: "Oct", change: 0.4 }, { month: "Nov", change: 0.4 },
    { month: "Dec", change: 0.6 }, { month: "Jan", change: 0.8 }, { month: "Feb", change: 0.7 },
    { month: "Mar", change: 0.9 }, { month: "Apr", change: 0.8 }, { month: "May", change: 1.0 },
    { month: "Jun", change: 0.9 }, { month: "Jul", change: 1.1 }, { month: "Aug", change: 0.8 },
  ],
  "Delhi NCR": [
    { month: "Sep", change: 0.4 }, { month: "Oct", change: 0.5 }, { month: "Nov", change: 0.6 },
    { month: "Dec", change: 0.7 }, { month: "Jan", change: 1.0 }, { month: "Feb", change: 0.9 },
    { month: "Mar", change: 1.2 }, { month: "Apr", change: 1.0 }, { month: "May", change: 1.3 },
    { month: "Jun", change: 1.1 }, { month: "Jul", change: 1.4 }, { month: "Aug", change: 1.0 },
  ],
  Hyderabad: [
    { month: "Sep", change: 0.6 }, { month: "Oct", change: 0.8 }, { month: "Nov", change: 0.7 },
    { month: "Dec", change: 1.0 }, { month: "Jan", change: 1.4 }, { month: "Feb", change: 1.2 },
    { month: "Mar", change: 1.6 }, { month: "Apr", change: 1.3 }, { month: "May", change: 1.7 },
    { month: "Jun", change: 1.5 }, { month: "Jul", change: 1.8 }, { month: "Aug", change: 1.4 },
  ],
  Pune: [
    { month: "Sep", change: 0.5 }, { month: "Oct", change: 0.6 }, { month: "Nov", change: 0.6 },
    { month: "Dec", change: 0.8 }, { month: "Jan", change: 1.1 }, { month: "Feb", change: 0.9 },
    { month: "Mar", change: 1.3 }, { month: "Apr", change: 1.0 }, { month: "May", change: 1.4 },
    { month: "Jun", change: 1.2 }, { month: "Jul", change: 1.5 }, { month: "Aug", change: 1.1 },
  ],
  Chennai: [
    { month: "Sep", change: 0.4 }, { month: "Oct", change: 0.5 }, { month: "Nov", change: 0.5 },
    { month: "Dec", change: 0.7 }, { month: "Jan", change: 0.9 }, { month: "Feb", change: 0.8 },
    { month: "Mar", change: 1.1 }, { month: "Apr", change: 0.9 }, { month: "May", change: 1.2 },
    { month: "Jun", change: 1.0 }, { month: "Jul", change: 1.3 }, { month: "Aug", change: 0.9 },
  ],
};

export const EXPLORE_CITIES = [
  "Bengaluru",
  "Mumbai",
  "Delhi NCR",
  "Hyderabad",
  "Pune",
  "Chennai",
] as const satisfies readonly CityName[];

export type MacroExplorePack = {
  city: CityName;
  pulse: CityPulse;
  demand: DemandArea[];
  corridors: Corridor[];
  projects: Project[];
  news: NewsItem[];
  income: IncomeBelt[];
  timeline: TimelineEvent[];
  inflation: Array<{ month: string; change: number }>;
  source: "llm" | "static";
  model?: string;
  generated_at: string;
};

export function isExploreCity(value: string): value is CityName {
  return (EXPLORE_CITIES as readonly string[]).includes(value);
}

export function staticMacroPack(city: CityName): MacroExplorePack {
  const pulse =
    CITY_PULSE.find((row) => row.city === city) ??
    ({
      city,
      headline: `${city} rental map is shaped by jobs, supply, and commute.`,
      vacancy_hint: "Mixed by micro-market",
      absorption: "Watch IT/GCC catchments first",
      hot_corridor: "Primary job belt",
    } satisfies CityPulse);

  return {
    city,
    pulse,
    demand: DEMAND_AREAS.filter((row) => row.city === city),
    corridors: IT_GCC_CORRIDORS.filter((row) => row.city === city),
    projects: PROJECTS.filter((row) => row.city === city),
    news: MARKET_NEWS.filter((row) => row.city === city || row.city === "India"),
    income: INCOME_BELTS.filter((row) => row.city === city),
    timeline: CITY_TIMELINES.filter((row) => row.city === city),
    inflation: RENT_INFLATION_BY_CITY[city] ?? RENT_INFLATION_BY_CITY.Bengaluru!,
    source: "static",
    generated_at: new Date().toISOString(),
  };
}
