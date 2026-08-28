import { z } from "zod";

export const locationSchema = z.object({
  city: z.string().min(2),
  area: z.string().min(2),
  building_name: z.string().min(2).max(120),
});

export const renterDetailsSchema = z.object({
  monthly_rent: z.number().int().positive(),
  maintenance: z.number().int().nonnegative(),
  bhk: z.number().int().min(1).max(10),
  carpet_area: z.number().int().min(100).max(10000),
  floor_level: z.enum(["ground", "low", "mid", "high"]),
  furnishing: z.enum(["unfurnished", "semi", "fully"]),
  total_units: z.enum(["<10", "11-30", "31-100", "100+"]),
  has_lift: z.boolean(),
  parking: z.enum(["yes", "no", "paid"]),
  power_backup: z.enum(["yes", "no", "partial"]),
  metro_distance: z.number().int().min(0).max(20),
  phone: z
    .string()
    .min(10)
    .max(15)
    .regex(/^[0-9+\-\s]+$/),
});

export const ownerDetailsSchema = z.object({
  asking_rent: z.number().int().positive(),
  bhk: z.number().int().min(1).max(10),
  furnishing: z.enum(["unfurnished", "semi", "fully"]),
  phone: z
    .string()
    .min(10)
    .max(15)
    .regex(/^[0-9+\-\s]+$/),
});

export const onboardingSchema = z
  .object({
    city: z.string().min(2),
    area: z.string().min(2),
    building_name: z.string().min(2),
    role: z.enum(["owner", "renter", "explorer"]),
    purpose: z.enum(["view_trends", "list_property", "connect"]),
    renter: renterDetailsSchema.optional(),
    owner: ownerDetailsSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "renter" && !value.renter) {
      ctx.addIssue({
        code: "custom",
        message: "Renter details are required.",
        path: ["renter"],
      });
    }
    if (value.role === "owner" && !value.owner) {
      ctx.addIssue({
        code: "custom",
        message: "Owner details are required.",
        path: ["owner"],
      });
    }
    if (value.role === "explorer" && value.purpose !== "view_trends") {
      ctx.addIssue({
        code: "custom",
        message: "Explorers can only view trends.",
        path: ["purpose"],
      });
    }
  });

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
