export type Category =
  | 'All'
  | 'Upperwear'
  | 'Bottomwear'
  | 'Shoes/Sneakers'
  | 'Accessories'
  | 'Perfume';

export type StockStatus = 'in-stock' | 'out-of-stock' | 'coming-soon';

export type RouteView = 'home' | 'product' | 'checkout' | 'order-confirmed' | 'admin' | 'admin-login';

export type ThemeMode = 'light' | 'dark';

export interface ColorSwatch {
  name: string;
  hex: string;
  imageIndex?: number;
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
  category: Exclude<Category, 'All'>;
  sizes: string[];
  stock: StockStatus;
  stockCount?: number;
  imageFit?: 'cover-top' | 'cover-center' | 'contain';
  canvasBg?: string;
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
  deliveryFee: number;
  total: number;
  paymentMethod: 'Cash on Delivery';
  whatsappUrl: string;
  summaryText: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  subtitle?: string;
}
