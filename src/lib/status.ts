import type { Tone } from '@/config/theme';
import type { AdminStatus, AuditSeverity, ServiceHealth } from '@/types/admin';
import type {
  AccountStatus,
  BookingStatus,
  DeliveryTaskStatus,
  DocumentStatus,
  PaymentMethod,
  PaymentStatus,
  PayoutStatus,
  ProviderStatus,
  ReviewStatus,
  TicketPriority,
  TicketStatus,
} from '@/types/models';

type Meta = { label: string; tone: Tone };

export const BOOKING_STATUS: Record<BookingStatus, Meta> = {
  pending: { label: 'Pending', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'primary' },
  on_the_way: { label: 'On the way', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'highlight' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  rejected: { label: 'Declined', tone: 'neutral' },
};

/** Allowed booking transitions (same rules as the mobile apps' backend). */
export const STATUS_FLOW: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['on_the_way', 'cancelled'],
  on_the_way: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  rejected: [],
};
export const ACTIVE_BOOKING: BookingStatus[] = ['pending', 'confirmed', 'on_the_way', 'in_progress'];

export const PAYMENT_STATUS: Record<PaymentStatus, Meta> = {
  pending: { label: 'Pending', tone: 'warning' },
  paid: { label: 'Paid', tone: 'success' },
  refunded: { label: 'Refunded', tone: 'info' },
  partially_refunded: { label: 'Part refunded', tone: 'info' },
  failed: { label: 'Failed', tone: 'danger' },
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  upi: 'UPI',
  card: 'Card',
  wallet: 'Servio Wallet',
  cash: 'Pay after service',
  razorpay: 'Razorpay',
  stripe: 'Stripe',
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
};

export const PROVIDER_STATUS: Record<ProviderStatus, Meta> = {
  pending: { label: 'Pending review', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  suspended: { label: 'Suspended', tone: 'neutral' },
};

export const ACCOUNT_STATUS: Record<AccountStatus, Meta> = {
  active: { label: 'Active', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  blocked: { label: 'Blocked', tone: 'danger' },
  rejected: { label: 'Rejected', tone: 'neutral' },
};

export const DOC_STATUS: Record<DocumentStatus, Meta> = {
  verified: { label: 'Verified', tone: 'success' },
  pending: { label: 'Needs review', tone: 'warning' },
  rejected: { label: 'Rejected', tone: 'danger' },
  missing: { label: 'Missing', tone: 'neutral' },
};

export const TASK_STATUS: Record<DeliveryTaskStatus, Meta> = {
  available: { label: 'Unassigned', tone: 'accent' },
  accepted: { label: 'Assigned', tone: 'primary' },
  picked_up: { label: 'Picked up', tone: 'info' },
  delivered: { label: 'Delivered', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

export const PAYOUT_STATUS: Record<PayoutStatus, Meta> = {
  requested: { label: 'Requested', tone: 'warning' },
  approved: { label: 'Approved', tone: 'primary' },
  paid: { label: 'Paid', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

export const TICKET_STATUS: Record<TicketStatus, Meta> = {
  open: { label: 'Open', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'primary' },
  resolved: { label: 'Resolved', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
};

export const TICKET_PRIORITY: Record<TicketPriority, Meta> = {
  low: { label: 'Low', tone: 'neutral' },
  medium: { label: 'Medium', tone: 'info' },
  high: { label: 'High', tone: 'accent' },
  urgent: { label: 'Urgent', tone: 'danger' },
};

export const REVIEW_STATUS: Record<ReviewStatus, Meta> = {
  published: { label: 'Published', tone: 'success' },
  hidden: { label: 'Hidden', tone: 'neutral' },
  flagged: { label: 'Flagged', tone: 'danger' },
};

export const ADMIN_STATUS: Record<AdminStatus, Meta> = {
  active: { label: 'Active', tone: 'success' },
  invited: { label: 'Invited', tone: 'info' },
  suspended: { label: 'Suspended', tone: 'danger' },
};

export const SEVERITY: Record<AuditSeverity, Meta> = {
  info: { label: 'Info', tone: 'info' },
  warning: { label: 'Warning', tone: 'warning' },
  critical: { label: 'Critical', tone: 'danger' },
};

export const HEALTH: Record<ServiceHealth, Meta> = {
  operational: { label: 'Operational', tone: 'success' },
  degraded: { label: 'Degraded', tone: 'warning' },
  down: { label: 'Down', tone: 'danger' },
};

export const CANCEL_REASONS = ['Customer requested', 'Provider unavailable', 'Duplicate booking', 'Payment issue', 'Service not available in area', 'Fraud / abuse', 'Other'];
