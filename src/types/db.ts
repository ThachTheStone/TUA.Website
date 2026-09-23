// Row types mirroring supabase/migrations/0001_init.sql.

export type UserRole = "ADMIN" | "STAFF";
export type OrderSource = "WEB" | "WORKSHOP";
export type FulfillmentType = "DELIVERY" | "PICKUP";
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_REVIEW"
  | "CONFIRMED"
  | "PRINTING"
  | "QC"
  | "READY"
  | "DELIVERED"
  | "EXPIRED"
  | "CANCELLED";
export type RefundStatus = "NONE" | "REQUIRED" | "DONE";
export type ItemType = "PLAIN" | "CUSTOM";
export type DesignSource = "CANVAS" | "SCAN";
export type PaymentMethod = "TRANSFER" | "CASH";
export type DonationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  code: string;
  source: OrderSource;
  customer_name: string;
  phone: string;
  email: string | null;
  fulfillment: FulfillmentType;
  address: string | null;
  preferred_time: string | null;
  pickup_location: string | null;
  note: string | null;
  subtotal: number;
  prepay_percent: 50 | 75 | 100;
  prepay_amount: number;
  paid_amount: number;
  status: OrderStatus;
  refund_status: RefundStatus;
  cancel_reason: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  type: ItemType;
  color: string;
  size: string;
  quantity: number;
  unit_price: number;
  design_id: string | null;
}

export interface Donation {
  id: string;
  code: string;
  display_name: string;
  contact: string;
  amount: number;
  message: string | null;
  is_public: boolean;
  is_hidden: boolean;
  status: DonationStatus;
  confirmed_by: string | null;
  created_at: string;
}

export interface ContentBlock {
  key: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  updated_at: string;
}

export interface Artwork {
  id: string;
  image_url: string;
  child_name: string | null;
  description: string | null;
  sort_order: number;
}

export interface Promotion {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price_text: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string | null;
  sort_order: number;
  is_active: boolean;
}

/** Row of the `public_donations` view (FR09). */
export interface PublicDonation {
  id: string;
  display_name: string;
  amount: number;
  message: string | null;
  created_at: string;
}
