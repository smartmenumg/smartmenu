/**
 * Centralized database type definitions.
 * In Phase 2, this will be replaced with auto-generated types from Supabase.
 * Run: npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export type UserRole = "menu" | "admin" | "super_admin";

export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "accepted"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "created"
  | "processing"
  | "paid"
  | "failed"
  | "refunded";

// ─── Database schema types (manual until Supabase CLI generates them) ──────────

export interface Database {
  public: {
    Tables: {
      theatres: {
        Row: Theatre;
        Insert: Omit<Theatre, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Theatre, "id" | "created_at">>;
      };
      auditoriums: {
        Row: Auditorium;
        Insert: Omit<Auditorium, "id" | "created_at">;
        Update: Partial<Omit<Auditorium, "id" | "created_at">>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Category, "id" | "created_at">>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Product, "id" | "created_at">>;
      };
      combo_items: {
        Row: ComboItem;
        Insert: Omit<ComboItem, "id" | "created_at">;
        Update: Partial<Omit<ComboItem, "id" | "created_at">>;
      };
      product_customizations: {
        Row: ProductCustomization;
        Insert: Omit<ProductCustomization, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ProductCustomization, "id" | "created_at">>;
      };
      product_day_pricing: {
        Row: ProductDayPricing;
        Insert: Omit<ProductDayPricing, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ProductDayPricing, "id" | "created_at">>;
      };
      guest_sessions: {
        Row: GuestSession;
        Insert: Omit<GuestSession, "created_at">;
        Update: Partial<Omit<GuestSession, "id" | "created_at">>;
      };
      cart_items: {
        Row: CartItem;
        Insert: Omit<CartItem, "id" | "added_at">;
        Update: Partial<Omit<CartItem, "id" | "added_at">>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Order, "id" | "created_at">>;
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, "id">;
        Update: never; // immutable once created
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, "id" | "created_at">;
        Update: Partial<Omit<Payment, "id" | "created_at">>;
      };
      order_status_history: {
        Row: OrderStatusHistory;
        Insert: Omit<OrderStatusHistory, "id" | "changed_at">;
        Update: never; // immutable
      };
      bill_prints: {
        Row: BillPrint;
        Insert: Omit<BillPrint, "id" | "printed_at">;
        Update: Partial<Omit<BillPrint, "id" | "order_id" | "printed_at">>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, "id" | "created_at">;
        Update: never; // immutable
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
    };
  };
}

// ─── Row types ─────────────────────────────────────────────────────────────────

export interface Theatre {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  settings: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Auditorium {
  id: string;
  theatre_id: string;
  name: string;
  total_seats: number | null;
  active: boolean;
  display_order: number;
  created_at: string;
}

export interface Profile {
  id: string; // matches auth.users.id
  theatre_id: string;
  role: UserRole;
  full_name: string | null;
  active: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  theatre_id: string;
  name: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  theatre_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number; // stored in paise (integer), displayed as rupees
  original_price: number | null; // stored in paise (integer), used for discount display
  image_url: string | null;
  is_combo: boolean;
  has_customizations: boolean;
  has_day_pricing: boolean;
  gst_rate_percent: number; // e.g. 5, 18, 12, 0
  available: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComboItem {
  id: string;
  combo_product_id: string;
  item_product_id: string;
  quantity: number;
  created_at: string;
}

export interface ProductCustomization {
  id: string;
  product_id: string;
  name: string;
  price_adjustment: number; // in paise
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductDayPricing {
  id: string;
  product_id: string;
  day_of_week: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  price: number; // in paise
  original_price: number | null; // in paise
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GuestSession {
  id: string; // client-generated UUID v4
  theatre_id: string;
  expires_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CartItem {
  id: string;
  session_id: string;
  product_id: string;
  quantity: number;
  added_at: string;
}

export interface Order {
  id: string;
  theatre_id: string;
  session_id: string | null;
  tracking_token: string; // high-entropy UUID — used in /track/[token]
  customer_name: string;
  mobile: string;
  auditorium_id: string;
  seat_number: string;
  subtotal_amount: number; // in paise (net items sum)
  gst_amount: number; // in paise (calculated tax)
  total_amount: number; // in paise — server-calculated (subtotal + gst)
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface SelectedCustomization {
  id: string;
  name: string;
  price: number; // in paise
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string; // snapshot at order time — immutable
  unit_price: number;   // snapshot at order time — immutable
  quantity: number;
  subtotal: number;     // unit_price * quantity — server-calculated
  gst_rate_percent: number; // snapshot at order time
  gst_amount: number;   // tax on this line item in paise
  selected_customizations: SelectedCustomization[];
}

export interface Payment {
  id: string;
  order_id: string;
  gateway?: string; // 'cashfree' | 'razorpay'
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_signature?: string | null;
  cf_order_id?: string | null;
  cf_payment_id?: string | null;
  payment_session_id?: string | null;
  payment_method?: string | null;
  raw_response?: Record<string, unknown> | null;
  amount: number; // in paise
  currency: string;
  status: PaymentStatus;
  failure_reason: string | null;
  created_at: string;
  paid_at: string | null;
  updated_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by: string | null; // auth user id, null for system
  notes: string | null;
  changed_at: string;
}

export interface BillPrint {
  id: string;
  order_id: string;
  printed_by: string; // auth user id
  print_count: number;
  printed_at: string;
  last_reprinted_at: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Utility types ─────────────────────────────────────────────────────────────

/** Product joined with category name — used on menu page */
export interface ProductWithCategory extends Product {
  categories: Pick<Category, "id" | "name">;
}

/** Order joined with auditorium name and items — used in admin dashboard */
export interface OrderWithDetails extends Order {
  auditoriums: Pick<Auditorium, "id" | "name">;
  order_items: (OrderItem & { products: Pick<Product, "id" | "name"> })[];
  payments: Payment[];
}
