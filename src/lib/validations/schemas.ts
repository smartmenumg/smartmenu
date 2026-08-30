import { z } from "zod";

// ─── Auth / Profile ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// ─── Customer Details ───────────────────────────────────────────────────────────

export const customerDetailsSchema = z.object({
  customerName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters"),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  auditoriumId: z.string().uuid("Invalid auditorium selection"),
  seatNumber: z
    .string()
    .min(1, "Seat number is required")
    .max(10, "Seat number too long")
    .regex(/^[A-Za-z0-9-]+$/, "Invalid seat number format"),
});

// ─── Cart item ──────────────────────────────────────────────────────────────────

export const selectedCustomizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  price: z.number().int().nonnegative(), // in paise
});

export const cartItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z.number().int().min(1).max(20),
  customizations: z.array(selectedCustomizationSchema).optional().default([]),
});

export const cartSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  items: z.array(cartItemSchema).min(1, "Cart is empty").max(50),
});

// ─── Create order request ───────────────────────────────────────────────────────

export const createOrderSchema = z
  .object({
    sessionId: z.string().uuid(),
    cartItems: z.array(cartItemSchema).min(1).max(50),
  })
  .merge(customerDetailsSchema);

// ─── Verify payment ─────────────────────────────────────────────────────────────

export const verifyPaymentSchema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

// ─── Menu management ────────────────────────────────────────────────────────────

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(50, "Category name too long"),
  display_order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export const productSchema = z.object({
  name: z
    .string()
    .min(1, "Product name is required")
    .max(100, "Product name too long"),
  description: z.string().max(500, "Description too long").optional(),
  price: z
    .number()
    .positive("Price must be positive")
    .max(10000000, "Price too high"), // in paise
  original_price: z
    .number()
    .positive("Original price must be positive")
    .max(10000000, "Original price too high")
    .optional()
    .nullable(),
  category_id: z.string().uuid("Invalid category"),
  image_url: z.string().url("Invalid image URL").optional(),
  is_combo: z.boolean().default(false),
  has_customizations: z.boolean().default(false),
  has_day_pricing: z.boolean().default(false),
  gst_rate_percent: z.number().int().min(0).max(28).default(5),
  available: z.boolean().default(true),
  active: z.boolean().default(true),
});

export const productCustomizationSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  name: z.string().min(1, "Option name is required").max(50, "Name too long"),
  price_adjustment: z.number().nonnegative("Extra price cannot be negative"), // in paise
  active: z.boolean().default(true),
});

export const dayPricingItemSchema = z.object({
  day_of_week: z.number().int().min(0).max(6), // 0=Sun..6=Sat
  price: z.number().nonnegative("Price cannot be negative"), // in paise
  original_price: z.number().positive("Original price must be positive").optional().nullable(),
  is_active: z.boolean().default(true),
});

export const saveProductDayPricingSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  has_day_pricing: z.boolean(),
  days: z.array(dayPricingItemSchema),
});

export const comboItemInputSchema = z.object({
  item_product_id: z.string().uuid("Invalid product ID"),
  quantity: z.number().int().positive().max(20).default(1),
});

export const createComboSchema = productSchema.extend({
  items: z.array(comboItemInputSchema).min(1, "Combo must include at least 1 item"),
});

export const productAvailabilitySchema = z.object({
  productId: z.string().uuid(),
  available: z.boolean(),
});

// ─── Admin: order status transition ─────────────────────────────────────────────

export const orderStatusTransitionSchema = z.object({
  orderId: z.string().uuid(),
  newStatus: z.enum(["accepted", "preparing", "ready", "delivered", "cancelled"]),
  notes: z.string().max(500).optional(),
});

// ─── Super admin: create user ────────────────────────────────────────────────────

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/,
      "Password must contain uppercase, lowercase, number, and special character"
    ),
  role: z.enum(["menu", "admin"]),
  full_name: z.string().min(2).max(100),
});

// ─── Types inferred from schemas ────────────────────────────────────────────────

export type LoginSchema = z.infer<typeof loginSchema>;
export type CustomerDetailsSchema = z.infer<typeof customerDetailsSchema>;
export type CreateOrderSchema = z.infer<typeof createOrderSchema>;
export type VerifyPaymentSchema = z.infer<typeof verifyPaymentSchema>;
export type CategorySchema = z.infer<typeof categorySchema>;
export type ProductSchema = z.infer<typeof productSchema>;
export type CreateUserSchema = z.infer<typeof createUserSchema>;
export type OrderStatusTransitionSchema = z.infer<typeof orderStatusTransitionSchema>;
