import lookCableKnit from '../assets/images/sparta_look_cable_knit_1795243665231.jpg';
import lookNavyPolo from '../assets/images/sparta_look_navy_polo_1795243665526.jpg';
import lookFlareFormal from '../assets/images/sparta_look_flare_formal_1795243664564.jpg';
import lookOxfordShirt from '../assets/images/sparta_look_oxford_shirt_1795243665046.jpg';
import lookParfumNoir from '../assets/images/sparta_look_parfum_noir_1795243665061.jpg';
import catUpperwear from '../assets/images/sparta_cat_upperwear_1795243665523.jpg';
import catBottomwear from '../assets/images/sparta_cat_bottomwear_1795243664872.jpg';
import catFootwear from '../assets/images/sparta_cat_footwear_1795243664137.jpg';
import catFragrance from '../assets/images/sparta_cat_fragrance_1795243664428.jpg';
import { Category } from '../types/store';

export interface DemoColorOption {
  name: string;
  hex: string;
  image?: string;
}

export interface DemoLookPiece {
  id: number;
  productId: string;
  name: string;
  price: number;
  rating: number;
  image: string;
  packshot: string;
  top: string;
  bottom: string;
  category: string;
  storeCategory: Exclude<Category, 'All'>;
  fabric: string;
  fit: string;
  defaultSize: string;
  colors: DemoColorOption[];
}

export interface DemoCategoryTile {
  id: string;
  name: string;
  storeCategory: Exclude<Category, 'All'>;
  image: string;
  alt: string;
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const asset = (p: string) => `${base}${p.startsWith('/') ? p : '/' + p}`;

/**
 * 5 Hero 3D WebGL Floating Runway Looks mapped directly to SPARTA's signature pieces.
 */
export const HERO_LOOKS: DemoLookPiece[] = [
  {
    id: 1,
    productId: 'sparta-001',
    name: 'Spartan Cable Knit',
    price: 1049,
    rating: 4.9,
    image: lookCableKnit,
    packshot: asset('/assets/products/spartan-white.png'),
    top: '#ede5d9',
    bottom: '#cfc5b6',
    category: 'Knitwear',
    storeCategory: 'Upperwear',
    fabric: 'Combed cotton cable weave',
    fit: 'Structured',
    defaultSize: 'L',
    colors: [
      { name: 'White', hex: '#F4F3EF', image: lookCableKnit },
      { name: 'Black', hex: '#141416', image: asset('/assets/products/spartan-black.png') },
      { name: 'Navy Blue', hex: '#1B2436', image: asset('/assets/products/spartan-navy.png') },
      { name: 'Red Wine', hex: '#5E1924', image: asset('/assets/products/spartan-red.png') },
    ],
  },
  {
    id: 2,
    productId: 'sparta-008',
    name: 'Heritage Cable Polo',
    price: 699,
    rating: 4.9,
    image: lookNavyPolo,
    packshot: asset('/assets/products/polo-navy.png'),
    top: '#4f5e6d',
    bottom: '#9da9b5',
    category: 'Resort Knit',
    storeCategory: 'Upperwear',
    fabric: 'Fine-gauge cotton knit',
    fit: 'Tailored',
    defaultSize: 'L',
    colors: [
      { name: 'Navy Blue', hex: '#161D2B', image: lookNavyPolo },
      { name: 'White', hex: '#F6F5F0', image: asset('/assets/products/polo-white.png') },
      { name: 'Black', hex: '#141416', image: asset('/assets/products/polo-black.png') },
      { name: 'Brown', hex: '#4B3628', image: asset('/assets/products/polo-brown.png') },
    ],
  },
  {
    id: 3,
    productId: 'sparta-002',
    name: 'Spartan Flare Formal',
    price: 1200,
    rating: 5.0,
    image: lookFlareFormal,
    packshot: asset('/assets/products/flare-black.png'),
    top: '#95a5b2',
    bottom: '#d7dde2',
    category: 'Tailored Trousers',
    storeCategory: 'Bottomwear',
    fabric: 'Double-pleat suiting cloth',
    fit: 'Fluid Flare',
    defaultSize: 'M',
    colors: [
      { name: 'Black', hex: '#151517', image: lookFlareFormal },
      { name: 'Gray', hex: '#6E7075', image: asset('/assets/products/flare-gray.png') },
      { name: 'White', hex: '#FAFAFA', image: asset('/assets/products/flare-white.png') },
      { name: 'Off White', hex: '#EAE6DF', image: asset('/assets/products/flare-offwhite.png') },
    ],
  },
  {
    id: 4,
    productId: 'sparta-009',
    name: 'Signature Oxford Shirt',
    price: 899,
    rating: 4.8,
    image: lookOxfordShirt,
    packshot: asset('/assets/products/oxford-white.png'),
    top: '#dbd4ca',
    bottom: '#c2b9ad',
    category: 'Shirting',
    storeCategory: 'Upperwear',
    fabric: 'Basketweave combed cotton',
    fit: 'Tailored',
    defaultSize: 'L',
    colors: [
      { name: 'White', hex: '#F7F7F7', image: lookOxfordShirt },
      { name: 'Black', hex: '#161618', image: asset('/assets/products/oxford-black.png') },
    ],
  },
  {
    id: 5,
    productId: 'sparta-005',
    name: 'SPARTAN MAN',
    price: 1199,
    rating: 4.9,
    image: lookParfumNoir,
    packshot: asset('/assets/products/perfume-man-1.png'),
    top: '#2d2825',
    bottom: '#4a403a',
    category: 'Eau de Parfum',
    storeCategory: 'Perfume',
    fabric: 'Bergamot · Dry Cedar · Amber',
    fit: '100 ml Flacon',
    defaultSize: '100 ml',
    colors: [{ name: 'Obsidian Glass', hex: '#1A1817', image: lookParfumNoir }],
  },
];

/**
 * Additional Coverflow & Editorial Rail Pieces mapped to SPARTA's archive.
 */
export const COVERFLOW_EXTRAS: DemoLookPiece[] = [
  {
    id: 6,
    productId: 'sparta-003',
    name: 'SAF1 Court Sneaker',
    price: 5999,
    rating: 4.9,
    image: catFootwear,
    packshot: asset('/assets/products/saf1-white.png'),
    top: '#cfc9c1',
    bottom: '#e8e5e0',
    category: 'Footwear',
    storeCategory: 'Shoes/Sneakers',
    fabric: 'Full-grain chalk calfskin',
    fit: 'True to EU size',
    defaultSize: '42',
    colors: [{ name: 'Chalk White', hex: '#EAE8E3', image: catFootwear }],
  },
  {
    id: 7,
    productId: 'sparta-004',
    name: 'Spartan Head Cap',
    price: 1499,
    rating: 4.8,
    image: asset('/assets/products/cap-2.png'),
    packshot: asset('/assets/products/cap-black.png'),
    top: '#2a2a2d',
    bottom: '#454549',
    category: 'Headwear',
    storeCategory: 'Accessories',
    fabric: 'Washed brushed twill',
    fit: 'Structured 6-panel',
    defaultSize: 'Free Size',
    colors: [{ name: 'Black', hex: '#161618', image: asset('/assets/products/cap-black.png') }],
  },
  {
    id: 8,
    productId: 'sparta-007',
    name: 'Spartan Female EDP',
    price: 1599,
    rating: 4.9,
    image: catFragrance,
    packshot: asset('/assets/products/perfume-female-1.png'),
    top: '#382c2a',
    bottom: '#5e4c47',
    category: 'Eau de Parfum',
    storeCategory: 'Perfume',
    fabric: 'Damask Rose · Cashmere Wood',
    fit: '100 ml Flacon',
    defaultSize: '100 ml',
    colors: [{ name: 'Amber Rose', hex: '#9E7368', image: catFragrance }],
  },
];

export const RAIL_PIECES: DemoLookPiece[] = [
  ...HERO_LOOKS,
  ...COVERFLOW_EXTRAS,
];

export const TRENDING_CATEGORIES: DemoCategoryTile[] = [
  {
    id: 'upperwear',
    name: 'Upperwear',
    storeCategory: 'Upperwear',
    image: catUpperwear,
    alt: 'SPARTA cable knit sweaters and crisp tailored shirting inside minimalist stone gallery',
  },
  {
    id: 'bottomwear',
    name: 'Bottomwear',
    storeCategory: 'Bottomwear',
    image: catBottomwear,
    alt: 'SPARTA double-pleated black formal flare trousers styled with white sneakers',
  },
  {
    id: 'footwear',
    name: 'Footwear',
    storeCategory: 'Shoes/Sneakers',
    image: catFootwear,
    alt: 'SPARTA SAF1 chalk leather sneakers with suede panelling on carved travertine plinth',
  },
  {
    id: 'fragrance',
    name: 'Perfume',
    storeCategory: 'Perfume',
    image: catFragrance,
    alt: 'SPARTA artisanal Eau de Parfum crystal bottle resting on dark volcanic stone',
  },
];
