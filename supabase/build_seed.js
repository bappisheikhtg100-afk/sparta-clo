import fs from 'fs';

const tsContent = fs.readFileSync('src/data/storeData.ts', 'utf8');

const match = tsContent.match(/export const PRODUCTS: Product\[\] = (\[[\s\S]*?\]);/);
if (!match) {
  console.error('Could not find PRODUCTS');
  process.exit(1);
}

const cleaned = match[1]
  .replace(/asset\(([^)]+)\)/g, '$1')
  .replace(/spartanManEditorial/g, '"/src/assets/images/spartan_man_editorial_1793639288096.jpg"')
  .replace(/vampireBloodEditorial/g, '"/src/assets/images/vampire_blood_editorial_1793639289573.jpg"')
  .replace(/as const/g, '');

const products = eval('(' + cleaned + ')');
console.log('Extracted products count:', products.length);

let sql = '\n\n-- 18. INITIAL PRODUCTS SEEDING (SPARTA 11 CORE PRODUCTS)\n';
for (const p of products) {
  const slug = p.id;
  const name = p.name.replace(/'/g, "''");
  const desc = p.description.replace(/'/g, "''");
  const details = JSON.stringify(p.details || []).replace(/'/g, "''");
  const images = JSON.stringify(p.images || []).replace(/'/g, "''");
  const colors = JSON.stringify(p.colors || []).replace(/'/g, "''");
  const sizes = JSON.stringify(p.sizes || []).replace(/'/g, "''");
  const priceMap = p.priceMap ? JSON.stringify(p.priceMap).replace(/'/g, "''") : 'null';
  const originalPrice = p.originalPrice || 'null';
  const editionNote = p.editionNote ? `'${p.editionNote.replace(/'/g, "''")}'` : 'null';
  const hoverIdx = p.hoverImageIndex !== undefined ? p.hoverImageIndex : 1;
  const hoverFit = p.hoverFit || 'cover-center';
  const imageFit = p.imageFit || 'cover-center';
  const canvasBg = p.canvasBg || '#F2F1EE';

  sql += `INSERT INTO public.products (slug, name, category, price, original_price, price_map, edition_note, description, details, images, hover_image_index, hover_fit, image_fit, canvas_bg, colors, sizes, stock, stock_count, is_published)
VALUES ('${slug}', '${name}', '${p.category}', ${p.price || 0}, ${originalPrice}, ${priceMap !== 'null' ? `'${priceMap}'::jsonb` : 'null'}, ${editionNote}, '${desc}', '${details}'::jsonb, '${images}'::jsonb, ${hoverIdx}, '${hoverFit}', '${imageFit}', '${canvasBg}', '${colors}'::jsonb, '${sizes}'::jsonb, '${p.stock}', ${p.stockCount || 50}, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  images = EXCLUDED.images;\n`;
}

fs.appendFileSync('supabase/migrations/20261107000000_sparta_production_schema.sql', sql);
console.log('Appended SQL seed successfully!');
