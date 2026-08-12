export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  widthMm: number;
  heightMm: number;
  minDpi: number;
  warnDpi: number;
  targetDpi: number;
  basePriceGbp: number;
  displayImageKey?: string;
  discountTiers: BulkDiscountTier[];
}

export interface BulkDiscountTier {
  id: string;
  minQty: number;
  maxQty: number | null;
  discountPct: number;
  label: string;
}

export interface TileConfig {
  rows: number;
  cols: number;
  magnetSizeMm: number;
}

export interface CartItem {
  id: string;           // local uuid
  productId: string;
  productName: string;
  productSlug: string;
  imageKey: string;
  thumbUrl: string;     // signed S3 URL or object URL
  cropData: CropData;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  currency: 'GBP';
  imageQuality: 'good' | 'warn' | 'blocked';
  imageDpi: number;
  tileConfig?: TileConfig;  // present for tiled multi-magnet sets
}

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  isFree: boolean;
  freeFrom: number | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  currency: string;
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: 'GB' | 'IM';
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: string;
  currency: string;
  createdAt: string;
  items: OrderItem[];
  trackingNumber?: string;
  trackingCarrier?: string;
}

export type OrderStatus = 'pending' | 'payment_processing' | 'paid' | 'in_production' | 'dispatched' | 'delivered' | 'cancelled' | 'refunded';

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  thumbUrl?: string;
}

export interface DiscountValidation {
  valid: boolean;
  id: string;
  code: string;
  type: string;
  discountAmount: string;
  isFreeShipping: boolean;
  description?: string;
}

export interface VoucherValidation {
  valid: boolean;
  id: string;
  code: string;
  balance: string;
  currency: string;
}
