export type Category =
  | 'All'
  | 'Upperwear'
  | 'Bottomwear'
  | 'Shoes/Sneakers'
  | 'Accessories'
  | 'Perfume';

export type StockStatus = 'in-stock' | 'out-of-stock' | 'coming-soon';

export type RouteView =
  | 'home'
  | 'product'
  | 'checkout'
  | 'order-confirmed'
  | 'admin'
  | 'admin-login';

export type ThemeMode = 'light' | 'dark';

export interface ColorSwatch {
  name: string;
  hex: string;
  imageIndex?: number;
  imageUrl?: string; // Direct image URL for this specific color variant
}

export interface Product {
  id: string;
  name: string;
  price?: number;
  originalPrice?: number;
  priceMap?: Record<string, number>;
  editionNote?: string;
  description: string;
  details: string[];
  images: string[];
  hoverImageIndex?: number;
  hoverFit?: 'cover-top' | 'cover-center' | 'contain';
  colors?: ColorSwatch[];
  colorImages?: Record<string, string>; // Mapping from colorway name to image URL
  category: Exclude<Category, 'All'>;
  sizes: string[];
  stock: StockStatus;
  stockCount?: number;
  imageFit?: 'cover-top' | 'cover-center' | 'contain';
  canvasBg?: string;
  featuredOnHome?: boolean; // Control whether product appears in curated homepage section
  sortOrder?: number; // Custom display priority/order (1 appears first, 2 second, etc.)
  sizeImages?: Record<string, string>; // Optional size-specific mapping retained for backwards compatibility
}

export interface CartItem {
  cartId: string;
  productId: string;
  name: string;
  category: Exclude<Category, 'All'>;
  image: string;
  size: string;
  color?: string;
  price: number;
  quantity: number;
}

export type DeliveryZone = 'inside-dhaka' | 'outside-dhaka';

export interface ShippingDetails {
  fullName: string;
  phone: string;
  division: string;
  district: string;
  thana: string;
  address: string;
  notes: string;
  deliveryZone: DeliveryZone;
}

export interface OrderReceipt {
  orderId: string;
  createdAt: string;
  customer: ShippingDetails;
  items: CartItem[];
  subtotal: number;
  discountAmount?: number;
  couponCode?: string;
  deliveryFee: number;
  total: number;
  paymentMethod: 'Cash on Delivery';
  courierName?: string;
  whatsappUrl: string;
  summaryText: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  subtitle?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  isActive: boolean;
  description?: string;
}

export interface StoreSettings {
  announcementText: string;
  isAnnouncementActive: boolean;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  whatsappNumber: string;
  isFreeDeliveryActive: boolean; // Master toggle to turn off delivery charges
  insideDhakaFee: number;
  outsideDhakaFee: number;
  freeShippingThreshold: number;
  spendSaveThreshold: number; // e.g. ৳3000
  spendSaveDiscount: number; // e.g. ৳300 off
}
