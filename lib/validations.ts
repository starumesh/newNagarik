import { z } from "zod";

export const locationSchema = z.object({
  city: z.string().min(2),
  area: z.string().min(2),
  building_name: z.string().min(2).max(120),
});

const phoneSchema = z
  .string()
  .min(10)
  .max(20)
  .regex(/^[0-9+\-\s]+$/);

const positiveInt = z.number().int().positive({
  message: "Please enter a positive number.",
});

export const renterDetailsSchema = z
  .object({
    monthly_rent: positiveInt,
    maintenance: z.number().int().nonnegative(),
    bhk: z.number().int().min(1).max(10),
    carpet_area: z.number().int().min(100).max(10000),
    floor_level: z.enum(["ground", "low", "mid", "high"]),
    furnishing: z.enum(["unfurnished", "semi", "fully"]),
    total_units: z.enum(["<10", "11-30", "31-100", "100+"]),
    has_lift: z.boolean(),
    parking: z.enum(["yes", "no", "paid"]),
    power_backup: z.enum(["yes", "no", "partial"]),
    metro_distance_km: z
      .number()
      .int()
      .positive()
      .max(200, { message: "Distance to metro should be between 1 and 200 km." })
      .optional()
      .nullable(),
    railway_distance_km: z
      .number()
      .int()
      .positive()
      .max(200, { message: "Distance to railway should be between 1 and 200 km." })
      .optional()
      .nullable(),
    airport_distance_km: z
      .number()
      .int()
      .positive()
      .max(200, { message: "Distance to airport should be between 1 and 200 km." })
      .optional()
      .nullable(),
    /** @deprecated prefer metro_distance_km — kept for older clients */
    metro_distance: z.number().int().nonnegative().optional().nullable(),
    phone: phoneSchema,
    problems_faced: z.string().max(800).optional().default(""),
    hurdles: z.string().max(800).optional().default(""),
    local_politics: z.string().max(800).optional().default(""),
    legal_issues: z.string().max(800).optional().default(""),
  })
  .superRefine((value, ctx) => {
    if (value.maintenance < 0) {
      ctx.addIssue({
        code: "custom",
        message: "Maintenance should be zero or a positive amount.",
        path: ["maintenance"],
      });
    }
  });

export const ownerDetailsSchema = z
  .object({
    asking_rent: positiveInt,
    bhk: z.number().int().min(1).max(10),
    furnishing: z.enum(["unfurnished", "semi", "fully"]),
    phone: phoneSchema,
    carpet_area: z.number().int().min(100).max(10000),
    maintenance_status: z.enum(["included", "extra", "none"]).default("extra"),
    maintenance_amount: z.number().int().nonnegative().optional().nullable(),
    pet_friendly: z.enum(["yes", "no", "case_by_case"]).default("case_by_case"),
    pet_case_notes: z.string().max(500).optional().default(""),
    building_age_years: z.number().int().min(0).max(100).optional().nullable(),
    floor_number: z.number().int().min(0).max(100).optional().nullable(),
    facilities: z.array(z.string()).default([]),
  })
  .superRefine((value, ctx) => {
    if (
      value.maintenance_status === "extra" &&
      (!value.maintenance_amount || value.maintenance_amount <= 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Please enter the monthly maintenance amount.",
        path: ["maintenance_amount"],
      });
    }
    if (
      value.pet_friendly === "case_by_case" &&
      !value.pet_case_notes?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Please briefly describe the pet policy case.",
        path: ["pet_case_notes"],
      });
    }
  });

export const explorerDetailsSchema = z.object({
  neighborhood_feel: z.string().max(500).optional().default(""),
  commute_notes: z.string().max(500).optional().default(""),
  amenities_nearby: z.string().max(500).optional().default(""),
  safety_notes: z.string().max(500).optional().default(""),
});

export const onboardingSchema = z
  .object({
    city: z.string().min(2),
    area: z.string().min(2),
    building_name: z.string().min(2),
    role: z.enum(["owner", "renter", "explorer"]),
    purpose: z.enum(["view_trends", "list_property", "find_rent", "connect"]),
    renter: renterDetailsSchema.optional(),
    owner: ownerDetailsSchema.optional(),
    explorer: explorerDetailsSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "renter" && !value.renter) {
      ctx.addIssue({
        code: "custom",
        message: "Please complete the renter details.",
        path: ["renter"],
      });
    }
    if (value.role === "owner" && !value.owner) {
      ctx.addIssue({
        code: "custom",
        message: "Please complete the owner details.",
        path: ["owner"],
      });
    }
    if (value.role === "explorer" && value.purpose !== "view_trends") {
      ctx.addIssue({
        code: "custom",
        message: "Please choose View trends to continue as an Explorer.",
        path: ["purpose"],
      });
    }
    if (value.role === "owner" && value.purpose === "find_rent") {
      ctx.addIssue({
        code: "custom",
        message: "That purpose is for renters. Please choose an owner purpose.",
        path: ["purpose"],
      });
    }
    if (value.role === "renter" && value.purpose === "list_property") {
      ctx.addIssue({
        code: "custom",
        message: "That purpose is for owners. Please choose a renter purpose.",
        path: ["purpose"],
      });
    }
  });

/** Map PostgREST / Postgres errors into short, actionable copy. */
export function friendlyDbError(
  error: { message?: string; code?: string; details?: string; hint?: string } | null,
  fallback: string
): string {
  if (!error?.message && !error?.code) return fallback;
  const raw = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  const code = error.code ?? "";

  if (code === "23514" || raw.includes("check constraint")) {
    if (raw.includes("purpose")) {
      return "Please choose a purpose that matches your role, then try again.";
    }
    if (raw.includes("carpet")) {
      return "Carpet area looks out of range. Please enter a positive area in sq. ft.";
    }
    if (raw.includes("pet")) {
      return "Please check the pet-friendly options and try again.";
    }
    if (raw.includes("maintenance")) {
      return "Please check the maintenance fields and try again.";
    }
    return "One of the values didn’t match what we expect. Please review the form and try again.";
  }
  if (code === "42703" || (raw.includes("column") && raw.includes("does not exist"))) {
    return "Your database is missing a recent column update. Please run the latest SQL migrations, then try again.";
  }
  if (code === "23503" || raw.includes("foreign key")) {
    return "We couldn’t link this to your account or location. Please sign in again and retry.";
  }
  if (code === "23505" || raw.includes("duplicate")) {
    return "This entry may already exist. Please refresh and check your dashboard.";
  }
  if (raw.includes("null value")) {
    return "A required field was missing. Please complete all required fields and try again.";
  }

  // Surface a shortened server message when it’s useful (no raw stack dumps).
  const message = (error.message ?? "").trim();
  if (message && message.length < 180 && !message.includes("\n")) {
    return message;
  }
  return fallback;
}

export const messageSchema = z.object({
  listingId: z.string().uuid().optional(),
  externalRef: z.string().max(180).optional(),
  buildingName: z.string().min(2).max(120),
  content: z.string().min(10).max(2000),
});

export const searchSchema = z.object({
  building: z.string().min(1).max(120),
  bhk: z.string().optional(),
  furnishing: z.enum(["unfurnished", "semi", "fully"]).optional(),
  minRent: z.string().optional(),
  maxRent: z.string().optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type RenterDetails = z.infer<typeof renterDetailsSchema>;
export type OwnerDetails = z.infer<typeof ownerDetailsSchema>;
export type ExplorerDetails = z.infer<typeof explorerDetailsSchema>;

export function isVaguePlaceName(value: string): boolean {
  const cleaned = value.trim().toLowerCase();
  if (cleaned.length < 4) return true;
  return /\b(near|opp|opposite|beside|behind|metro|station|railway|bus stop|landmark|somewhere|xyz|abc|test)\b/.test(
    cleaned
  );
}

export function firstZodMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue?.message || "Please review the highlighted fields and try again.";
}
