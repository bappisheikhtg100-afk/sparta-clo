import { Category, Product } from '../types/store';
import spartanManEditorial from '../assets/images/spartan_man_editorial_1793639288096.jpg';
import vampireBloodEditorial from '../assets/images/vampire_blood_editorial_1793639289573.jpg';

export const STORE_INFO = {
  name: 'SPARTA',
  phone: '+880 1610-046310',
  whatsappNumber: '8801610046310',
  email: 'sparta.bd.com@gmail.com',
  currencySymbol: '৳',
  freeShippingThreshold: 5000,
  insideDhakaFee: 70,
  outsideDhakaFee: 120,
  socials: {
    instagram:
      'https://www.instagram.com/sparta.clo?exln=MXRubjI4aWprcDNmdA%3D%3D&utm_source=qr',
    tiktok: 'https://www.tiktok.com/@sparta_clo?_r=1&_t=ZS-9AdPkzDk69F',
  },
} as const;

export const MEDIA_ASSETS = {
  logoWhite: '/assets/brand/logo-white.png',
  logoBlack: '/assets/brand/logo-black.png',
  heroVideo: '/assets/hero/hero-video.mp4',
  heroPoster: '/assets/hero/hero-poster.jpg',
  campaignFootwear: '/assets/products/saf1-2.png',
  campaignHeadwear: '/assets/products/cap-2.png',
} as const;

export const CATEGORIES: Category[] = [
  'All',
  'Upperwear',
  'Bottomwear',
  'Shoes/Sneakers',
  'Accessories',
  'Perfume',
];

export const BANGLADESH_DIVISIONS = [
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
] as const;

export const PRODUCTS: Product[] = [
  {
    id: 'sparta-001',
    name: 'Spartan Cable Knit',
    price: 1049,
    originalPrice: 1279,
    editionNote: '18% Off · New Arrival',
    description:
      'New Arrival: The signature Spartan Cable Knit. Crafted for comfort, confidence, and quiet distinction with a structured quarter-zip collar and embroidered chest crest.',
    details: [
      'Mid-weight breathable combed cotton cable-knit weave',
      'Quarter-zip mock collar with brushed metal puller',
      'Tonal embroidered Spartan crest at left chest',
      'Ribbed cuffs and structured waistband hem',
    ],
    images: [
      '/assets/products/spartan-white.png',
      '/assets/products/spartan-black.png',
      '/assets/products/spartan-navy.png',
      '/assets/products/spartan-red.png',
      '/assets/products/spartan-5.png',
      '/assets/products/spartan-6.png',
    ],
    hoverImageIndex: 4,
    hoverFit: 'cover-top',
    colors: [
      { name: 'White', hex: '#F4F3EF', imageIndex: 0 },
      { name: 'Black', hex: '#141416', imageIndex: 1 },
      { name: 'Navy Blue', hex: '#1B2436', imageIndex: 2 },
      { name: 'Red Wine', hex: '#5E1924', imageIndex: 3 },
    ],
    category: 'Upperwear',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 'in-stock',
    imageFit: 'cover-top',
    canvasBg: '#F3F3F5',
  },
  {
    id: 'sparta-002',
    name: 'Spartan Flare Formal',
    price: 1200,
    originalPrice: 1558,
    editionNote: '23% Off',
    description:
      'Classic formal flare trousers tailored for an elongated architectural line. Double front pleats deliver fluid movement from waist to hem.',
    details: [
      'Double front pleats with crisp pressed centre crease',
      'Subtle flare leg opening engineered to drape cleanly over footwear',
      'Concealed hook-and-bar tailored waistband closure',
      'Wrinkle-resistant structured suiting cloth',
    ],
    images: [
      '/assets/products/flare-black.png',
      '/assets/products/flare-gray.png',
      '/assets/products/flare-white.png',
      '/assets/products/flare-offwhite.png',
    ],
    hoverImageIndex: 1,
    hoverFit: 'cover-center',
    colors: [
      { name: 'Black', hex: '#151517', imageIndex: 0 },
      { name: 'Gray', hex: '#6E7075', imageIndex: 1 },
      { name: 'White', hex: '#FAFAFA', imageIndex: 2 },
      { name: 'Off White', hex: '#EAE6DF', imageIndex: 3 },
    ],
    category: 'Bottomwear',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 'in-stock',
    stockCount: 150,
    imageFit: 'cover-center',
    canvasBg: '#EFEFF0',
  },
  {
    id: 'sparta-008',
    name: 'Heritage Cable Polo',
    price: 699,
    editionNote: 'Resort Knit',
    description:
      'Old-money open-collar cable knit polo finished with contrast ivory tipping along the collar and cuffs.',
    details: [
      'Open-placket Johnny collar with contrast tipping',
      'Vertical fine-gauge cable texture throughout',
      'Soft breathable combed cotton yarn',
      'Clean straight hem suited for tailored trousers or shorts',
    ],
    images: [
      '/assets/products/polo-navy.png',
      '/assets/products/polo-white.png',
      '/assets/products/polo-black.png',
      '/assets/products/polo-brown.png',
    ],
    hoverImageIndex: 1,
    hoverFit: 'contain',
    colors: [
      { name: 'Navy Blue', hex: '#161D2B', imageIndex: 0 },
      { name: 'White', hex: '#F6F5F0', imageIndex: 1 },
      { name: 'Black', hex: '#141416', imageIndex: 2 },
      { name: 'Brown', hex: '#4B3628', imageIndex: 3 },
    ],
    category: 'Upperwear',
    sizes: ['M', 'L', 'XL'],
    stock: 'in-stock',
    imageFit: 'contain',
    canvasBg: '#F7F7F5',
  },
  {
    id: 'sparta-007',
    name: 'Spartan Female',
    priceMap: { '100 ml': 1599, '50 ml': 899, '15 ml': 399 },
    editionNote: 'Eau de Parfum',
    description:
      'Elegant and captivating Eau de Parfum presented in faceted rose glass. Luminous Damask rose and white peony settle into warm cashmere wood.',
    details: [
      'Eau de Parfum concentration with 8–10 hour longevity',
      'Notes of Damask rose, white peony, pink pepper, and ambergris',
      'Offered in 100 ml flacon, 50 ml edition, and 15 ml travel spray',
      'Embossed rose-toned presentation box',
    ],
    images: [
      '/assets/products/perfume-female-1.png',
      '/assets/products/perfume-female-2.png',
    ],
    hoverImageIndex: 1,
    hoverFit: 'cover-center',
    category: 'Perfume',
    sizes: ['100 ml', '50 ml', '15 ml'],
    stock: 'in-stock',
    imageFit: 'cover-center',
    canvasBg: '#D8B8B4',
  },
  {
    id: 'sparta-003',
    name: 'SAF1',
    price: 5999,
    description:
      'Minimalist low-top court sneaker crafted in smooth chalk leather with tonal suede toe-cap and heel overlays.',
    details: [
      'Full-grain chalk leather and soft tonal suede panelling',
      'Perforated breathable vamp with SPARTA tongue stamp',
      'High-density stitched rubber cupsole',
      'Cushioned leather-lined collar',
    ],
    images: [
      '/assets/products/saf1-white.png',
      '/assets/products/saf1-2.png',
      '/assets/products/saf1-3.png',
      '/assets/products/saf1-4.png',
    ],
    hoverImageIndex: 2,
    hoverFit: 'cover-center',
    colors: [{ name: 'White', hex: '#EAE8E3', imageIndex: 0 }],
    category: 'Shoes/Sneakers',
    sizes: ['40', '42', '43', '44'],
    stock: 'out-of-stock',
    imageFit: 'cover-center',
    canvasBg: '#CFCAC2',
  },
  {
    id: 'sparta-004',
    name: 'Spartan Head Cap',
    price: 1499,
    originalPrice: 1763,
    editionNote: '15% Off',
    description:
      'Structured six-panel cap in heavyweight brushed cotton twill featuring raised silver Spartan helmet embroidery.',
    details: [
      'Structured six-panel crown with curved visor',
      'Heavyweight washed black cotton twill',
      'Polished metal buckle back strap',
      'Embroidered tonal eyelets',
    ],
    images: [
      '/assets/products/cap-black.png',
      '/assets/products/cap-2.png',
      '/assets/products/cap-3.png',
      '/assets/products/cap-4.png',
    ],
    hoverImageIndex: 2,
    hoverFit: 'cover-center',
    colors: [{ name: 'Black', hex: '#161618', imageIndex: 0 }],
    category: 'Accessories',
    sizes: ['Free Size'],
    stock: 'coming-soon',
    imageFit: 'cover-center',
    canvasBg: '#E6E5E2',
  },
  {
    id: 'sparta-005',
    name: 'SPARTAN MAN',
    priceMap: { '100 ml': 1199, '50 ml': 799, '15 ml': 299 },
    editionNote: 'Eau de Parfum',
    description:
      'Signature masculine Eau de Parfum by SPARTA. Crisp Calabrian bergamot and black pepper layered over dry cedarwood, vetiver, and warm amber.',
    details: [
      'High-oil Eau de Parfum concentration',
      'Notes of bergamot, black pepper, dry cedarwood, and ambroxan',
      'Available in 100 ml, 50 ml, and 15 ml formats',
      'Architectural heavy glass flacon with knurled matte cap',
    ],
    images: ['/assets/products/perfume-man-1.png', spartanManEditorial],
    hoverImageIndex: 1,
    hoverFit: 'cover-center',
    category: 'Perfume',
    sizes: ['100 ml', '50 ml', '15 ml'],
    stock: 'coming-soon',
    imageFit: 'cover-center',
    canvasBg: '#CEC7BC',
  },
  {
    id: 'sparta-006',
    name: 'Spartan Vampired Blood',
    priceMap: { '100 ml': 899, '50 ml': 599 },
    editionNote: 'Noir Edition',
    description:
      'Bold nocturnal fragrance composed for evening wear. Deep blood orange, dark cherry, saffron, and smoky resinous oud.',
    details: [
      'Intense nocturnal Eau de Parfum sillage',
      'Notes of blood orange, black cherry, saffron, and dark oud',
      'Available in 100 ml and 50 ml flacons',
    ],
    images: ['/assets/products/perfume-vampire-1.png', vampireBloodEditorial],
    hoverImageIndex: 1,
    hoverFit: 'cover-center',
    category: 'Perfume',
    sizes: ['100 ml', '50 ml'],
    stock: 'coming-soon',
    imageFit: 'cover-center',
    canvasBg: '#191113',
  },
  {
    id: 'sparta-009',
    name: 'Signature Oxford Shirt',
    price: 899,
    description:
      'Crisp tailored button-down Oxford shirt woven from breathable combed cotton for effortless year-round structure.',
    details: [
      '100% combed cotton basketweave Oxford cloth',
      'Softly rolled button-down collar',
      'Tailored torso taper with back box pleat',
    ],
    images: [
      '/assets/products/oxford-white.png',
      '/assets/products/oxford-black.png',
    ],
    hoverImageIndex: 1,
    hoverFit: 'contain',
    colors: [
      { name: 'White', hex: '#F7F7F7', imageIndex: 0 },
      { name: 'Black', hex: '#161618', imageIndex: 1 },
    ],
    category: 'Upperwear',
    sizes: ['M', 'L', 'XL', 'XXL'],
    stock: 'coming-soon',
    imageFit: 'contain',
    canvasBg: '#F7F7F5',
  },
  {
    id: 'sparta-010',
    name: 'Denim Shorts',
    price: 899,
    description:
      'Heavyweight washed cotton denim shorts cut cleanly above the knee with classic five-pocket hardware.',
    details: [
      '13 oz structured cotton denim',
      'Relaxed straight leg silhouette',
      'Classic five-pocket construction with tonal stitching',
    ],
    images: [
      '/assets/products/shorts-offwhite.png',
      '/assets/products/shorts-black.png',
      '/assets/products/shorts-3.png',
      '/assets/products/shorts-4.png',
      '/assets/products/shorts-5.png',
      '/assets/products/shorts-6.png',
    ],
    hoverImageIndex: 1,
    hoverFit: 'contain',
    colors: [
      { name: 'Off White', hex: '#EAE7E0', imageIndex: 0 },
      { name: 'Black', hex: '#18181B', imageIndex: 1 },
    ],
    category: 'Bottomwear',
    sizes: ['M', 'L', 'XL'],
    stock: 'coming-soon',
    imageFit: 'contain',
    canvasBg: '#F6F6F4',
  },
  {
    id: 'sparta-011',
    name: 'Sparta Army 2025',
    price: 3999,
    editionNote: '2025 Archive',
    description:
      'German-trainer inspired low-profile sneaker pairing supple chalk calfskin with Dove-grey suede overlays.',
    details: [
      'Supple chalk leather upper with grey suede overlays',
      'Minimalist SPARTA side-panel foil stamp',
      'Low-profile rubber court sole',
    ],
    images: [
      '/assets/products/army-1.png',
      '/assets/products/army-2.png',
      '/assets/products/army-3.png',
      '/assets/products/army-4.png',
    ],
    hoverImageIndex: 3,
    hoverFit: 'cover-center',
    category: 'Shoes/Sneakers',
    sizes: ['40', '42', '43', '44'],
    stock: 'coming-soon',
    imageFit: 'contain',
    canvasBg: '#C7C7C9',
  },
];

export function getDisplayPrice(product: Product, selectedSize?: string): {
  price: number;
  isStartingFrom: boolean;
} {
  if (product.priceMap) {
    if (selectedSize && product.priceMap[selectedSize] !== undefined) {
      return { price: product.priceMap[selectedSize], isStartingFrom: false };
    }
    const minPrice = Math.min(...Object.values(product.priceMap));
    return { price: minPrice, isStartingFrom: true };
  }
  return { price: product.price ?? 0, isStartingFrom: false };
}

export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-IN')}`;
}
