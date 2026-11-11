/**
 * Organic Dynamic Live Visitor Engine for SPARTA Apparel
 *
 * Produces organic-looking active visitor counts tailored to:
 * - Real-world Bangladesh time cycle:
 *   - Late night / Early morning (2:00 AM - 6:30 AM): minimal realistic activity (3 - 9 people)
 *   - Morning & Noon (7:00 AM - 1:00 PM): steady ramp up (14 - 32 people)
 *   - Afternoon / Peak Shopping Evening (3:00 PM - 11:30 PM): high peak volume (38 - 84 people)
 *   - Midnight wind-down (12:00 AM - 1:59 AM): gradual dip (12 - 24 people)
 * - Deterministic yet pseudo-random per product:
 *   - Each piece uses a hash of its ID so different products show distinct numbers
 *   - Values drift smoothly over time (+/- 1-3 people every 6-12 seconds) without jarring jumps
 */

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getRealisticVisitorCount(productId: string, now: Date = new Date()): number {
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const timeProgress = (hour * 60 + minutes) / 1440; // 0.0 to 1.0 of the day

  // Time multiplier based on Bangladesh consumer shopping habits
  let baseMin = 14;
  let baseMax = 38;

  if (hour >= 2 && hour < 7) {
    // Late night & early dawn (very low: 3 to 9 visitors)
    baseMin = 3;
    baseMax = 9;
  } else if (hour >= 7 && hour < 11) {
    // Early morning waking hours (11 to 24)
    baseMin = 11;
    baseMax = 24;
  } else if (hour >= 11 && hour < 16) {
    // Office / lunch time (18 to 42)
    baseMin = 18;
    baseMax = 42;
  } else if (hour >= 16 && hour < 23) {
    // Prime evening ecommerce shopping rush (35 to 86)
    baseMin = 35;
    baseMax = 86;
  } else {
    // 23:00 to 01:59 (12 to 28)
    baseMin = 12;
    baseMax = 28;
  }

  // Product specific offset using deterministic hash
  const productHash = hashString(productId || 'sparta-product');
  const productBias = (productHash % 17) - 8; // -8 to +8

  // Small organic oscillation based on current minute and product hash
  const oscillation = Math.sin((minutes * 6 + (productHash % 60)) * (Math.PI / 180)) * 4;

  const raw = Math.round(
    baseMin + ((baseMax - baseMin) * ((productHash % 100) / 100)) + productBias + oscillation
  );

  return Math.max(3, Math.min(94, raw));
}
