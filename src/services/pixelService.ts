/**
 * Meta Pixel (Facebook Pixel) & Google Tag Service
 * Dynamically injects and manages official Meta Pixel scripts and events:
 * - PageView
 * - ViewContent (Product viewed)
 * - AddToCart (Added to bag)
 * - InitiateCheckout (Proceed to checkout)
 * - Purchase (COD order completed with currency & value)
 */

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export function initMetaPixel(pixelId: string): void {
  if (typeof window === 'undefined' || !pixelId || !pixelId.trim()) return;

  const cleanId = pixelId.trim();

  // If already initialized with this ID, don't re-inject
  if (window.fbq && (window as any).__sparta_active_pixel === cleanId) {
    return;
  }

  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s?.parentNode?.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  if (window.fbq) {
    window.fbq('init', cleanId);
    window.fbq('track', 'PageView');
    (window as any).__sparta_active_pixel = cleanId;
  }
}

/**
 * Track Custom or Standard Event with Meta Pixel
 */
export function trackMetaPixelEvent(
  eventName: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase',
  params?: Record<string, any>
): void {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    try {
      if (params) {
        window.fbq('track', eventName, params);
      } else {
        window.fbq('track', eventName);
      }
    } catch (err) {
      console.warn('Meta Pixel tracking error:', err);
    }
  }
}
