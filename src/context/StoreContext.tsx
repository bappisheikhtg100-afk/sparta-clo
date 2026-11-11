import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  CartItem,
  Category,
  Coupon,
  OrderReceipt,
  Product,
  RouteView,
  ShippingDetails,
  StoreSettings,
  ThemeMode,
  ToastMessage,
} from '../types/store';
import { formatBDT, STORE_INFO, PRODUCTS as STATIC_PRODUCTS } from '../data/storeData';
import { fetchPublishedProducts, getLocalStoredProducts } from '../services/productService';
import { createOrderRecord } from '../services/orderService';
import {
  DEFAULT_STORE_SETTINGS,
  DEFAULT_COUPONS,
  getLocalStoreSettings,
  getLocalCoupons,
  fetchStoreSettings,
  updateStoreSettings,
  fetchCoupons,
  updateCoupons,
} from '../services/storeSettingsService';
import { initMetaPixel, trackMetaPixelEvent } from '../services/pixelService';

interface StoreContextValue {
  theme: ThemeMode;
  toggleTheme: (forced?: ThemeMode) => void;
  currentRoute: RouteView;
  selectedProduct: Product | null;
  activeCategory: Category;
  setActiveCategory: (cat: Category) => void;
  navigate: (route: RouteView, product?: Product | null) => void;
  jumpToCategory: (cat: Category) => void;
  products: Product[];
  refreshProducts: () => Promise<void>;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  discountAmount: number;
  spendSaveAmount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  addToCart: (
    product: Product,
    size: string,
    color: string | undefined,
    unitPrice: number,
    quantity?: number,
    openDrawer?: boolean
  ) => void;
  updateCartQuantity: (cartId: string, delta: number) => void;
  removeFromCart: (cartId: string) => void;
  clearCart: () => void;
  lastOrder: OrderReceipt | null;
  placeCODOrder: (shipping: ShippingDetails) => OrderReceipt;
  toasts: ToastMessage[];
  pushToast: (title: string, subtitle?: string) => void;
  dismissToast: (id: string) => void;
  storeSettings: StoreSettings;
  updateSettings: (newSettings: StoreSettings) => Promise<void>;
  coupons: Coupon[];
  saveCoupons: (newCoupons: Coupon[]) => Promise<void>;
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const CART_STORAGE_KEY = 'sparta_atelier_cart_v1';
const THEME_STORAGE_KEY = 'sparta_atelier_theme_v2';
const ORDER_STORAGE_KEY = 'sparta_atelier_last_order_v1';
const APPLIED_COUPON_KEY = 'sparta_applied_coupon_v1';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as CartItem[];
    } catch {
      // ignore
    }
    return [];
  });

  const [lastOrder, setLastOrder] = useState<OrderReceipt | null>(() => {
    try {
      const raw = localStorage.getItem(ORDER_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as OrderReceipt;
    } catch {
      // ignore
    }
    return null;
  });

  const sortByOrder = (list: Product[]) =>
    [...list].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

  const [products, setProducts] = useState<Product[]>(() =>
    sortByOrder(getLocalStoredProducts())
  );
  const [currentRoute, setCurrentRoute] = useState<RouteView>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Settings & Coupons state with instant local cache loading
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => getLocalStoreSettings());
  const [coupons, setCoupons] = useState<Coupon[]>(() => getLocalCoupons());
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(() => {
    try {
      const raw = localStorage.getItem(APPLIED_COUPON_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  });

  const refreshProducts = useCallback(async () => {
    try {
      const live = await fetchPublishedProducts();
      setProducts(sortByOrder(live));
    } catch {
      setProducts(sortByOrder(getLocalStoredProducts()));
    }
  }, []);

  const loadSettingsAndCoupons = useCallback(async () => {
    try {
      const [fetchedSettings, fetchedCoupons] = await Promise.all([
        fetchStoreSettings(),
        fetchCoupons(),
      ]);
      setStoreSettings(fetchedSettings);
      if (fetchedCoupons && fetchedCoupons.length > 0) {
        setCoupons(fetchedCoupons);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshProducts();
    loadSettingsAndCoupons();
  }, [refreshProducts, loadSettingsAndCoupons]);

  // Dynamically initialize Meta Pixel if configured
  useEffect(() => {
    if (storeSettings.isMetaPixelActive && storeSettings.metaPixelId) {
      initMetaPixel(storeSettings.metaPixelId);
    }
  }, [storeSettings.isMetaPixelActive, storeSettings.metaPixelId]);

  // Real-time synchronization when products are created, edited, or deleted in Admin
  useEffect(() => {
    const handleProductsUpdated = (e: any) => {
      const updatedList = e.detail || getLocalStoredProducts();
      setProducts(sortByOrder(updatedList));
    };
    window.addEventListener('sparta_products_updated', handleProductsUpdated);
    return () => window.removeEventListener('sparta_products_updated', handleProductsUpdated);
  }, []);

  // Real-time synchronization when Settings or Coupons are updated in Admin
  useEffect(() => {
    const handleSettingsUpdated = (e: any) => {
      if (e.detail) {
        setStoreSettings(e.detail);
      }
    };
    const handleCouponsUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setCoupons(e.detail);
      }
    };
    window.addEventListener('sparta_settings_updated', handleSettingsUpdated);
    window.addEventListener('sparta_coupons_updated', handleCouponsUpdated);
    return () => {
      window.removeEventListener('sparta_settings_updated', handleSettingsUpdated);
      window.removeEventListener('sparta_coupons_updated', handleCouponsUpdated);
    };
  }, []);

  // Helper to parse deep URL routes for Search Engine Crawlers & Direct Link hits
  const parseCurrentUrl = useCallback((allProducts: Product[]) => {
    if (typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const pathname = window.location.pathname;

    // Check if #admin or ?page=admin
    if (hash === '#admin' || searchParams.get('page') === 'admin') {
      setCurrentRoute('admin');
      return;
    }

    // Check if ?page=checkout
    if (searchParams.get('page') === 'checkout') {
      setCurrentRoute('checkout');
      return;
    }

    // Check if ?page=order-confirmed
    if (searchParams.get('page') === 'order-confirmed') {
      setCurrentRoute('order-confirmed');
      return;
    }

    // Check for product deep links: ?product=sparta-001 or #product-sparta-001 or /product/sparta-001
    let prodId = searchParams.get('product');
    if (!prodId && hash.startsWith('#product-')) {
      prodId = hash.replace('#product-', '');
    }
    if (!prodId && pathname.includes('/product/')) {
      prodId = pathname.split('/product/')[1]?.replace(/\/$/, '');
    }

    if (prodId) {
      const cleanTarget = prodId.toLowerCase();
      const match =
        allProducts.find(
          (p) => p.id.toLowerCase() === cleanTarget || p.name.toLowerCase().replace(/\s+/g, '-') === cleanTarget
        ) ||
        STATIC_PRODUCTS.find(
          (p) => p.id.toLowerCase() === cleanTarget || p.name.toLowerCase().replace(/\s+/g, '-') === cleanTarget
        );

      if (match) {
        setSelectedProduct(match);
        setCurrentRoute('product');
        return;
      }
    }

    // Collection archive link
    if (searchParams.get('page') === 'collection' || hash === '#collection') {
      setCurrentRoute('home');
      setTimeout(() => {
        const el = document.getElementById('collection');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return;
    }

    // Default: Home
    setCurrentRoute('home');
  }, []);

  // Initial URL parse on boot
  useEffect(() => {
    parseCurrentUrl(products);
  }, [products, parseCurrentUrl]);

  // Back/Forward browser button handler (popstate)
  useEffect(() => {
    const handlePopState = () => {
      parseCurrentUrl(products);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [products, parseCurrentUrl]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  const toggleTheme = useCallback((forced?: ThemeMode) => {
    setTheme((prev) => forced ?? (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (title: string, subtitle?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { id, title, subtitle }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 3000);
    },
    [dismissToast]
  );

  const navigate = useCallback((route: RouteView, product: Product | null = null) => {
    if (product !== undefined) {
      setSelectedProduct(product);
      if (product) {
        trackMetaPixelEvent('ViewContent', {
          content_name: product.name,
          content_ids: [product.id],
          content_type: 'product',
          value: product.price,
          currency: 'BDT',
        });
      }
    }
    if (route === 'checkout') {
      trackMetaPixelEvent('InitiateCheckout');
    }

    // Push deep URL to browser history so every product and route has a unique indexable URL
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      if (route === 'product' && product) {
        currentUrl.searchParams.set('product', product.id);
        currentUrl.searchParams.delete('page');
        currentUrl.hash = '';
        window.history.pushState({ route: 'product', productId: product.id }, '', currentUrl.toString());
      } else if (route === 'checkout') {
        currentUrl.searchParams.delete('product');
        currentUrl.searchParams.set('page', 'checkout');
        currentUrl.hash = '';
        window.history.pushState({ route: 'checkout' }, '', currentUrl.toString());
      } else if (route === 'order-confirmed') {
        currentUrl.searchParams.delete('product');
        currentUrl.searchParams.set('page', 'order-confirmed');
        currentUrl.hash = '';
        window.history.pushState({ route: 'order-confirmed' }, '', currentUrl.toString());
      } else if (route === 'admin') {
        currentUrl.searchParams.delete('product');
        currentUrl.searchParams.delete('page');
        currentUrl.hash = '#admin';
        window.history.pushState({ route: 'admin' }, '', currentUrl.toString());
      } else {
        // Home
        currentUrl.searchParams.delete('product');
        currentUrl.searchParams.delete('page');
        currentUrl.hash = '';
        window.history.pushState({ route: 'home' }, '', currentUrl.origin + currentUrl.pathname);
      }
    }

    setCurrentRoute(route);
    setIsMobileMenuOpen(false);
    setIsCartOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const jumpToCategory = useCallback((cat: Category) => {
    setActiveCategory(cat);
    setIsMobileMenuOpen(false);
    setIsCartOpen(false);
    setCurrentRoute('home');

    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('product');
      currentUrl.searchParams.set('page', 'collection');
      currentUrl.hash = '#collection';
      window.history.pushState({ route: 'home', category: cat }, '', currentUrl.toString());
    }

    window.requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById('collection');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    });
  }, []);


  const addToCart = useCallback(
    (
      product: Product,
      size: string,
      color: string | undefined,
      unitPrice: number,
      quantity = 1,
      openDrawer = true
    ) => {
      const matchedColor =
        color && product.colors ? product.colors.find((c) => c.name === color) : undefined;
      const chosenImage =
        matchedColor?.imageUrl ||
        (product.colorImages && color ? product.colorImages[color] : undefined) ||
        (matchedColor?.imageIndex !== undefined ? product.images[matchedColor.imageIndex] : undefined) ||
        product.images[0];

      setCart((prev) => {
        const existingIndex = prev.findIndex(
          (item) =>
            item.productId === product.id &&
            item.size === size &&
            item.color === color
        );
        if (existingIndex > -1) {
          const next = [...prev];
          next[existingIndex] = {
            ...next[existingIndex],
            quantity: next[existingIndex].quantity + quantity,
          };
          return next;
        }
        return [
          ...prev,
          {
            cartId: `${product.id}-${size}-${color ?? 'default'}`,
            productId: product.id,
            name: product.name,
            category: product.category,
            image: chosenImage,
            size,
            color,
            price: unitPrice,
            quantity,
          },
        ];
      });

      if (openDrawer) {
        setIsCartOpen(true);
      } else {
        pushToast('Added to Bag', `${product.name} · ${size}`);
      }

      // Meta Pixel AddToCart event
      trackMetaPixelEvent('AddToCart', {
        content_name: product.name,
        content_ids: [product.id],
        content_type: 'product',
        value: unitPrice * quantity,
        currency: 'BDT',
      });
    },
    [pushToast]
  );

  const updateCartQuantity = useCallback((cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartId === cartId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  // Spend & Save Tier calculation
  const spendSaveAmount = useMemo(() => {
    if (
      storeSettings.spendSaveThreshold > 0 &&
      storeSettings.spendSaveDiscount > 0 &&
      cartSubtotal >= storeSettings.spendSaveThreshold
    ) {
      return storeSettings.spendSaveDiscount;
    }
    return 0;
  }, [cartSubtotal, storeSettings]);

  // Coupon discount calculation
  const couponDiscountAmount = useMemo(() => {
    if (!appliedCoupon || !appliedCoupon.isActive) return 0;
    if (cartSubtotal < appliedCoupon.minOrderAmount) return 0;

    if (appliedCoupon.discountType === 'percentage') {
      return Math.round((cartSubtotal * appliedCoupon.discountValue) / 100);
    }
    return Math.min(cartSubtotal, appliedCoupon.discountValue);
  }, [appliedCoupon, cartSubtotal]);

  const totalDiscountAmount = useMemo(() => {
    return couponDiscountAmount + spendSaveAmount;
  }, [couponDiscountAmount, spendSaveAmount]);

  const applyCoupon = useCallback(
    (inputCode: string): { success: boolean; message: string } => {
      const cleanCode = inputCode.trim().toUpperCase();
      if (!cleanCode) {
        return { success: false, message: 'Please enter a promo voucher or coupon code.' };
      }

      // Fallback to DEFAULT_COUPONS if state is currently empty
      const activeList = coupons && coupons.length > 0 ? coupons : DEFAULT_COUPONS;
      const match = activeList.find(
        (c) => c.code.trim().toUpperCase() === cleanCode && c.isActive
      );

      if (!match) {
        return {
          success: false,
          message: `Coupon "${cleanCode}" is invalid or expired. Try using SPARTA10 or EID2026.`,
        };
      }

      if (cartSubtotal < match.minOrderAmount) {
        return {
          success: false,
          message: `Cart subtotal is ${formatBDT(cartSubtotal)}. Minimum order of ${formatBDT(
            match.minOrderAmount
          )} required for ${match.code}.`,
        };
      }

      setAppliedCoupon(match);
      try {
        localStorage.setItem(APPLIED_COUPON_KEY, JSON.stringify(match));
      } catch {
        // ignore
      }

      pushToast('Coupon Applied', `${match.code} · ${match.description || 'Discount activated'}`);
      return { success: true, message: `Promo code ${match.code} applied successfully!` };
    },
    [coupons, cartSubtotal, pushToast]
  );


  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    try {
      localStorage.removeItem(APPLIED_COUPON_KEY);
    } catch {
      // ignore
    }
    pushToast('Coupon Removed');
  }, [pushToast]);

  const updateSettings = useCallback(async (newSettings: StoreSettings) => {
    setStoreSettings(newSettings);
    await updateStoreSettings(newSettings);
  }, []);

  const saveCoupons = useCallback(async (newCoupons: Coupon[]) => {
    setCoupons(newCoupons);
    await updateCoupons(newCoupons);
  }, []);

  const placeCODOrder = useCallback(
    (shipping: ShippingDetails): OrderReceipt => {
      const orderId = `SPT-${Math.floor(100000 + Math.random() * 900000)}`;

      // Calculate delivery fee with master switch & thresholds
      let deliveryFee = 0;
      if (storeSettings.isFreeDeliveryActive) {
        deliveryFee = 0;
      } else {
        const baseFee =
          shipping.deliveryZone === 'inside-dhaka'
            ? storeSettings.insideDhakaFee
            : storeSettings.outsideDhakaFee;
        deliveryFee = cartSubtotal >= storeSettings.freeShippingThreshold ? 0 : baseFee;
      }

      const total = Math.max(0, cartSubtotal - totalDiscountAmount) + deliveryFee;

      const lines: string[] = [
        `*New COD Order — SPARTA*`,
        `Order ID: ${orderId}`,
        `Date: ${new Date().toLocaleString('en-GB')}`,
        ``,
        `*Customer Details:*`,
        `Name: ${shipping.fullName}`,
        `Phone: ${shipping.phone}`,
        `Address: ${shipping.address}, ${shipping.thana}, ${shipping.district}, ${shipping.division}`,
        shipping.notes ? `Note: ${shipping.notes}` : '',
        ``,
        `*Items:*`,
        ...cart.map((item) => {
          const variant = [item.size, item.color].filter(Boolean).join(' · ');
          return `- ${item.quantity}x ${item.name} (${variant}) — ${formatBDT(
            item.price * item.quantity
          )}`;
        }),
        ``,
        `*Payment Method:* Cash on Delivery (COD)`,
        `Subtotal: ${formatBDT(cartSubtotal)}`,
        totalDiscountAmount > 0
          ? `Discount (${appliedCoupon ? appliedCoupon.code : 'Tier Offer'}): -${formatBDT(
              totalDiscountAmount
            )}`
          : '',
        `Delivery (${
          shipping.deliveryZone === 'inside-dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'
        }): ${deliveryFee === 0 ? 'Complimentary' : formatBDT(deliveryFee)}`,
        `*Total Payable on Delivery: ${formatBDT(total)}*`,
      ].filter(Boolean);

      const summaryText = lines.join('\n');
      const whatsappUrl = `https://wa.me/${storeSettings.whatsappNumber || STORE_INFO.whatsappNumber}?text=${encodeURIComponent(
        summaryText
      )}`;

      const receipt: OrderReceipt = {
        orderId,
        createdAt: new Date().toISOString(),
        customer: shipping,
        items: [...cart],
        subtotal: cartSubtotal,
        discountAmount: totalDiscountAmount,
        couponCode: appliedCoupon?.code,
        deliveryFee,
        total,
        paymentMethod: 'Cash on Delivery',
        whatsappUrl,
        summaryText,
      };

      try {
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(receipt));
      } catch {
        // ignore
      }

      // Persist to Supabase backend asynchronously
      createOrderRecord(receipt, shipping).catch((err) => {
        console.warn('Could not sync order to Supabase:', err);
      });

      setLastOrder(receipt);
      setCart([]);
      setAppliedCoupon(null);
      localStorage.removeItem(APPLIED_COUPON_KEY);
      setCurrentRoute('order-confirmed');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      pushToast('Order Confirmed', `${orderId} · Cash on Delivery`);

      // Meta Pixel Purchase Event
      trackMetaPixelEvent('Purchase', {
        content_name: 'SPARTA Order ' + orderId,
        content_ids: receipt.items.map((it) => it.productId),
        content_type: 'product',
        value: receipt.total,
        currency: 'BDT',
        num_items: receipt.items.reduce((acc, it) => acc + it.quantity, 0),
      });

      return receipt;
    },
    [cart, cartSubtotal, totalDiscountAmount, appliedCoupon, storeSettings, pushToast]
  );

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      currentRoute,
      selectedProduct,
      activeCategory,
      setActiveCategory,
      navigate,
      jumpToCategory,
      products,
      refreshProducts,
      cart,
      cartCount,
      cartSubtotal,
      discountAmount: totalDiscountAmount,
      spendSaveAmount,
      isCartOpen,
      setIsCartOpen,
      isMobileMenuOpen,
      setIsMobileMenuOpen,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      clearCart,
      lastOrder,
      placeCODOrder,
      toasts,
      pushToast,
      dismissToast,
      storeSettings,
      updateSettings,
      coupons,
      saveCoupons,
      appliedCoupon,
      applyCoupon,
      removeCoupon,
    }),
    [
      theme,
      toggleTheme,
      currentRoute,
      selectedProduct,
      activeCategory,
      navigate,
      jumpToCategory,
      products,
      refreshProducts,
      cart,
      cartCount,
      cartSubtotal,
      totalDiscountAmount,
      spendSaveAmount,
      isCartOpen,
      isMobileMenuOpen,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      clearCart,
      lastOrder,
      placeCODOrder,
      toasts,
      pushToast,
      dismissToast,
      storeSettings,
      updateSettings,
      coupons,
      saveCoupons,
      appliedCoupon,
      applyCoupon,
      removeCoupon,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used inside StoreProvider');
  }
  return ctx;
}
