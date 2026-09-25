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
export type PaymentStatus = "UNPAID" | "DEPOSIT_PAID" | "FULLY_PAID";
export type ApprovalStatus = "PENDING_APPROVAL" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
export type ItemType = "PLAIN" | "CUSTOM" | "PROTOTYPE";
export type DesignSource = "CANVAS" | "SCAN" | "PROTOTYPE";
export type PaymentMethod = "TRANSFER" | "CASH";
export type DonationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

/** FR26 buyer account. Separate from `Profile`: a customer never gets admin access. */
export interface Customer {
  id: string;
  full_name: string;
  phone: string | null;
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
  payment_status: PaymentStatus;
  refund_status: RefundStatus;
  cancel_reason: string | null;
  expires_at: string | null;
  created_by: string | null;
  customer_id: string | null;
  created_at: string;
  updated_at: string;
  /** Secret for the payment page link; never show it in admin lists or Sheets. */
  access_token: string;
}

export interface OrderStatusHistory {
  id: number;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
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
  /** PROTOTYPE lines only (FR27). */
  prototype_id: string | null;
  /** Custom shirts only (FR29); null for plain and prototype shirts. */
  approval_status: ApprovalStatus | null;
  reject_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

/** FR27/FR28 "Áo mẫu": a ready-made design sold at the custom price (BR09). */
export interface Prototype {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** settings.colors[].key, fixed per prototype. */
  color: string;
  /** Public URLs in the `content` bucket, 1–4. */
  image_urls: string[];
  design_id: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: PaymentMethod;
  note: string | null;
  recorded_by: string | null;
  recorded_at: string;
}

export interface DesignReview {
  id: number;
  order_item_id: string;
  from_status: ApprovalStatus | null;
  to_status: ApprovalStatus;
  reason: string | null;
  design_id: string | null;
  changed_by: string | null;
  changed_at: string;
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
