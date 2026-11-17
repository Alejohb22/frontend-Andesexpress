export type Zone = 'SAME_CITY' | 'SAME_DEPARTMENT' | 'NEIGHBORING_DEPARTMENT' | 'REST_OF_COUNTRY';

export type OrderStatus =
  | 'PENDING_VALIDATION'
  | 'REJECTED'
  | 'VALIDATED'
  | 'CONFIRMED'
  | 'GUIDE_GENERATING'
  | 'GUIDE_READY';

/** Informational only: Orders stores and returns it, but it does not change the fare. */
export type ShippingType = 'STANDARD' | 'EXPRESS';

/** API Colombia ids, not DANE codes. */
export interface Place {
  departmentId: number;
  cityId: number;
}

export interface Fare {
  amount: number;
  currency: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  origin: Place;
  destination: Place;
  /** Missing when talking to an Orders build older than the shipping-type change. */
  shippingType?: ShippingType;
  zone: Zone | null;
  fare: Fare | null;
  guideUrl: string | null;
}

export interface NewOrder {
  idempotencyKey: string;
  customerEmail: string;
  origin: Place;
  destination: Place;
  shippingType: ShippingType;
  products: { name: string; weightKg: number }[];
}

export interface CoverageQuery {
  origin: Place;
  destination: Place;
  totalWeightKg: number;
}

export type CoverageAnswer =
  | { valid: true; zone: Zone; fare: Fare }
  | { valid: false; reason: string; message: string };

export type NoticeType = 'ORDER_CONFIRMED' | 'GUIDE_READY';
export type NoticeStatus = 'PENDING' | 'SENT' | 'FAILED';

/** A notification record kept by the Notifications service. */
export interface CustomerNotice {
  id: string;
  orderId: string;
  type: NoticeType;
  customerEmail: string | null;
  status: NoticeStatus;
  createdAt: string;
  errorMessage: string | null;
}

export interface Department {
  id: number;
  name: string;
}

export interface City {
  id: number;
  name: string;
  departmentId: number;
}
