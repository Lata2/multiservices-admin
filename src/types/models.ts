/**
 * Marketplace domain models — the API contract shared with the Servio mobile
 * apps (customer / provider / delivery). Kept backend-agnostic: no UI-only fields.
 */

export type ID = string;
export type ISODate = string;

export type AppRole = 'customer' | 'provider' | 'delivery';
export type AccountStatus = 'active' | 'pending' | 'blocked' | 'rejected';

export interface Customer {
  id: ID;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  status: AccountStatus;
  city: string;
  referralCode?: string;
  referredBy?: ID;
  walletBalance: number;
  bookingsCount: number;
  totalSpent: number;
  lastActiveAt: ISODate;
  createdAt: ISODate;
}

export interface City {
  id: ID;
  name: string;
  state: string;
  active: boolean;
  /** Service radius around the city centre, km. */
  radiusKm: number;
  launchedAt: ISODate;
}

export interface Category {
  id: ID;
  name: string;
  icon: string;
  parentId: ID | null;
  description?: string;
  image?: string;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  serviceCount: number;
  /** Percent of service subtotal kept by the platform. */
  commissionRate: number;
}

export type ProviderType = 'individual' | 'organization';
export type ProviderStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type DocumentStatus = 'verified' | 'pending' | 'rejected' | 'missing';

export interface ProviderDocument {
  id: ID;
  name: string;
  status: DocumentStatus;
  uploadedAt?: ISODate;
  note?: string;
}

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
}

export interface WeeklyHours {
  day: number; // 0 = Sunday
  open: boolean;
  start: string;
  end: string;
}

export interface Provider {
  id: ID;
  businessName: string;
  ownerName: string;
  type: ProviderType;
  avatar: string;
  about: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  categoryIds: ID[];
  rating: number;
  reviewCount: number;
  jobsCompleted: number;
  yearsExperience: number;
  verified: boolean;
  featured: boolean;
  status: ProviderStatus;
  statusNote?: string;
  commissionRate: number;
  visitingCharge: number;
  hours: WeeklyHours[];
  documents: ProviderDocument[];
  bank?: BankDetails;
  walletBalance: number;
  joinedAt: ISODate;
}

export interface Service {
  id: ID;
  providerId: ID;
  providerName: string;
  categoryId: ID;
  subcategoryId?: ID;
  title: string;
  description: string;
  price: number;
  discountPrice?: number;
  durationMin: number;
  rating: number;
  reviewCount: number;
  bookings: number;
  includes: string[];
  excludes: string[];
  tags: string[];
  active: boolean;
  requiresPickup: boolean;
  createdAt: ISODate;
}

export interface Address {
  label: 'Home' | 'Work' | 'Other';
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';

export type PaymentMethod = 'card' | 'upi' | 'wallet' | 'cash' | 'razorpay' | 'stripe' | 'paystack' | 'flutterwave';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'partially_refunded' | 'failed';

export interface BookingItem {
  serviceId: ID;
  categoryId: ID;
  title: string;
  unitPrice: number;
  quantity: number;
  durationMin: number;
}

export interface PriceBreakdown {
  subtotal: number;
  discount: number;
  visitingCharge: number;
  tax: number;
  total: number;
  /** Platform commission on (subtotal − discount). */
  commission: number;
}

export interface BookingEvent {
  status: BookingStatus | 'rescheduled' | 'payment' | 'refund' | 'reassigned' | 'note';
  at: ISODate;
  note?: string;
  by?: string;
}

export interface Booking {
  id: ID;
  code: string;
  customerId: ID;
  customerName: string;
  customerPhone: string;
  providerId: ID;
  providerName: string;
  city: string;
  categoryId: ID;
  items: BookingItem[];
  address: Address;
  scheduledDate: string; // YYYY-MM-DD
  slot: string; // HH:mm
  status: BookingStatus;
  payment: { method: PaymentMethod; status: PaymentStatus; transactionId?: string; refundedAmount?: number };
  pricing: PriceBreakdown;
  promoCode?: string;
  notes?: string;
  timeline: BookingEvent[];
  cancelReason?: string;
  rescheduleCount: number;
  rating?: number;
  deliveryTaskId?: ID;
  createdAt: ISODate;
}

export type DeliveryTaskType = 'pickup' | 'drop' | 'parts';
export type DeliveryTaskStatus = 'available' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';

export interface DeliveryStop {
  name: string;
  phone: string;
  address: string;
}

export interface DeliveryTask {
  id: ID;
  bookingId: ID;
  bookingCode: string;
  type: DeliveryTaskType;
  status: DeliveryTaskStatus;
  partnerId?: ID;
  partnerName?: string;
  city: string;
  pickup: DeliveryStop;
  drop: DeliveryStop;
  itemsSummary: string;
  distanceKm: number;
  fee: number;
  codAmount: number;
  scheduledFor: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface DeliveryPartner {
  id: ID;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  vehicleType: 'bike' | 'scooter' | 'car' | 'van';
  vehicleNumber: string;
  licenseNumber: string;
  rating: number;
  completedTasks: number;
  online: boolean;
  status: ProviderStatus;
  city: string;
  earnings: number;
  joinedAt: ISODate;
}

export type ReviewStatus = 'published' | 'hidden' | 'flagged';

export interface Review {
  id: ID;
  bookingId: ID;
  serviceId: ID;
  serviceTitle: string;
  providerId: ID;
  providerName: string;
  customerId: ID;
  customerName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  flagReason?: string;
  reply?: { text: string; at: ISODate };
  createdAt: ISODate;
}

export interface PromoCode {
  id: ID;
  code: string;
  title: string;
  description: string;
  discountType: 'percent' | 'flat';
  value: number;
  minOrder: number;
  maxDiscount?: number;
  /** null = platform-wide; otherwise provider-funded. */
  providerId: ID | null;
  categoryId?: ID | null;
  startsAt: ISODate;
  expiresAt: ISODate;
  active: boolean;
  usageCount: number;
  usageLimit: number;
  perUserLimit: number;
}

export interface Banner {
  id: ID;
  title: string;
  subtitle: string;
  cta: string;
  image?: string;
  categoryId?: ID | null;
  placement: 'home_hero' | 'home_strip' | 'category';
  active: boolean;
  sortOrder: number;
  clicks: number;
  impressions: number;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketMessage {
  id: ID;
  from: 'user' | 'support' | 'internal';
  authorName: string;
  text: string;
  at: ISODate;
}

export interface SupportTicket {
  id: ID;
  number: string;
  userId: ID;
  userName: string;
  userRole: AppRole;
  subject: string;
  category: 'booking' | 'payment' | 'account' | 'provider' | 'delivery' | 'other';
  priority: TicketPriority;
  status: TicketStatus;
  bookingId?: ID;
  assigneeId?: ID;
  assigneeName?: string;
  messages: TicketMessage[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface WalletTransaction {
  id: ID;
  userId: ID;
  type: 'credit' | 'debit';
  amount: number;
  title: string;
  reference?: string;
  createdAt: ISODate;
}

export type PayoutStatus = 'requested' | 'approved' | 'paid' | 'rejected';

export interface Payout {
  id: ID;
  payeeId: ID;
  payeeName: string;
  payeeRole: 'provider' | 'delivery';
  amount: number;
  status: PayoutStatus;
  method: 'bank' | 'upi';
  accountRef: string;
  utr?: string;
  requestedAt: ISODate;
  processedAt?: ISODate;
  note?: string;
}

export type TransactionKind = 'payment' | 'refund' | 'payout' | 'wallet_credit' | 'wallet_debit';

/** Ledger row derived from bookings, refunds, payouts and wallet movements. */
export interface Transaction {
  id: ID;
  kind: TransactionKind;
  reference: string;
  bookingId?: ID;
  partyName: string;
  method: PaymentMethod | 'bank' | 'upi_payout' | 'wallet';
  amount: number;
  status: 'success' | 'pending' | 'failed';
  city?: string;
  createdAt: ISODate;
}

export interface Faq {
  id: ID;
  question: string;
  answer: string;
  audience: AppRole | 'all';
  published: boolean;
  sortOrder: number;
}

export interface CmsPage {
  id: ID;
  slug: 'terms' | 'privacy' | 'refund' | 'about';
  title: string;
  body: string;
  updatedAt: ISODate;
  updatedBy: string;
}
