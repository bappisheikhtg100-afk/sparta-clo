import React, { useState } from 'react';
import {
  Plus,
  Search,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Edit2,
  Check,
  X,
  Image as ImageIcon,
  Loader2,
  Star,
  Info,
  Pipette,
  Palette,
} from 'lucide-react';
import { Product, Category, StockStatus, ColorSwatch } from '../types/store';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { upsertProduct, deleteProduct, toggleProductPublish } from '../services/productService';
import { formatBDT } from '../data/storeData';
import { useStore } from '../context/StoreContext';

export const LUXURY_COLOR_PRESETS = [
  { name: 'Onyx Black', hex: '#111111' },
  { name: 'Bone White', hex: '#F5F5F0' },
  { name: 'Charcoal Grey', hex: '#2B2B2B' },
  { name: 'Olive Green', hex: '#4A5340' },
  { name: 'Midnight Navy', hex: '#1A2436' },
  { name: 'Burgundy Crimson', hex: '#581825' },
  { name: 'Desert Sand', hex: '#D8CBB5' },
  { name: 'Espresso Brown', hex: '#5C4033' },
  { name: 'Atelier Gold', hex: '#C5A059' },
  { name: 'Military Khaki', hex: '#8F8B66' },
];

interface ProductManagementProps {
  products: (Product & { is_published?: boolean })[];
  onRefresh: () => void;
  isCreateModalOpen?: boolean;
  onCloseCreateModal?: () => void;
}

export const ProductManagement: React.FC<ProductManagementProps> = ({
  products,
  onRefresh,
  isCreateModalOpen: initialModalOpen = false,
  onCloseCreateModal,
}) => {
  const { refreshProducts, pushToast } = useStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(initialModalOpen);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<Exclude<Category, 'All'>>('Upperwear');
  const [formPrice, setFormPrice] = useState('');
  const [formOriginalPrice, setFormOriginalPrice] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDetails, setFormDetails] = useState('');
  const [formSizes, setFormSizes] = useState('S, M, L, XL');
  const [formStock, setFormStock] = useState<StockStatus>('in-stock');
  const [formStockCount, setFormStockCount] = useState('15');
  const [formFeaturedOnHome, setFormFeaturedOnHome] = useState(true);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formHoverIndex, setFormHoverIndex] = useState(1);
  const [formColors, setFormColors] = useState<ColorSwatch[]>([
    { name: 'Onyx Black', hex: '#111111', imageIndex: 0 },
  ]);
  const [formSortOrder, setFormSortOrder] = useState('1');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('Upperwear');
    setFormPrice('1850');
    setFormOriginalPrice('');
    setFormDescription('Crafted from premium heavyweight combed cotton with reinforced seams.');
    setFormDetails('Heavyweight 280 GSM cotton\nPre-shrunk architectural silhouette\nSilkscreen typography\nHandcrafted in Dhaka');
    setFormSizes('S, M, L, XL');
    setFormStock('in-stock');
    setFormStockCount('20');
    setFormSortOrder((products.length + 1).toString());
    setFormFeaturedOnHome(true);
    setFormImages([]);
    setFormHoverIndex(1);
    setFormColors([
      { name: 'Onyx Black', hex: '#111111', imageIndex: 0 },
    ]);
    setUploadError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormPrice(p.price ? p.price.toString() : '');
    setFormOriginalPrice(p.originalPrice ? p.originalPrice.toString() : '');
    setFormDescription(p.description || '');
    setFormDetails((p.details || []).join('\n'));
    setFormSizes((p.sizes || []).join(', '));
    setFormStock(p.stock);
    setFormStockCount(p.stockCount !== undefined ? p.stockCount.toString() : '10');
    setFormSortOrder(p.sortOrder !== undefined ? p.sortOrder.toString() : '1');
    setFormFeaturedOnHome(p.featuredOnHome ?? true);
    setFormImages(p.images || []);
    setFormHoverIndex(p.hoverImageIndex ?? 1);
    setFormColors(
      p.colors && p.colors.length > 0
        ? p.colors.map((c) => ({
            ...c,
            imageUrl:
              c.imageUrl ||
              (p.colorImages && p.colorImages[c.name]) ||
              (c.imageIndex !== undefined ? p.images[c.imageIndex] : undefined),
          }))
        : [{ name: 'Onyx Black', hex: '#111111', imageIndex: 0 }]
    );
    setUploadError(null);
    setIsModalOpen(true);
  };

  const handleAddColor = () => {
    const nextIdx = Math.min(formColors.length, Math.max(0, formImages.length - 1));
    const preset = LUXURY_COLOR_PRESETS[formColors.length % LUXURY_COLOR_PRESETS.length];
    setFormColors((prev) => [
      ...prev,
      {
        name: preset.name,
        hex: preset.hex,
        imageIndex: nextIdx,
        imageUrl: formImages[nextIdx] || '',
      },
    ]);
  };

  const handleUpdateColor = (index: number, updates: Partial<ColorSwatch>) => {
    setFormColors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  const handleRemoveColor = (index: number) => {
    setFormColors((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePickColorFromScreen = async (index: number) => {
    if (typeof window !== 'undefined' && (window as any).EyeDropper) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          handleUpdateColor(index, { hex: result.sRGBHex });
        }
      } catch {
        // User cancelled picker
      }
    } else {
      const el = document.getElementById(`native-color-picker-${index}`) as HTMLInputElement;
      if (el) el.click();
    }
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadToCloudinary(files[i]);
        uploadedUrls.push(url);
      }
      setFormImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload photo to Cloudinary');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormImages((prev) => prev.filter((_, i) => i !== index));
    if (formHoverIndex >= index && formHoverIndex > 0) {
      setFormHoverIndex((prev) => Math.max(0, prev - 1));
    }
  };

  const handleToggleHomeFeatured = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !product.featuredOnHome;
    const updated: Product = { ...product, featuredOnHome: nextVal };
    await upsertProduct(updated, true);
    await refreshProducts();
    onRefresh();
    pushToast(
      nextVal ? 'Featured on Home' : 'Removed from Home',
      `${product.name} ${nextVal ? 'will appear' : 'hidden from'} curated collection`
    );
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSaving(true);
    try {
      const productId =
        editingProduct?.id ||
        `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const parsedSizes = formSizes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      // Build color-to-image mapping
      const colorImagesMap: Record<string, string> = {};
      formColors.forEach((c) => {
        const chosenImg =
          c.imageUrl ||
          (c.imageIndex !== undefined && formImages[c.imageIndex]
            ? formImages[c.imageIndex]
            : undefined) ||
          formImages[0];
        if (chosenImg) {
          colorImagesMap[c.name] = chosenImg;
        }
      });

      const productPayload: Product = {
        id: productId,
        name: formName.trim(),
        category: formCategory,
        price: formPrice ? Number(formPrice) : undefined,
        originalPrice: formOriginalPrice ? Number(formOriginalPrice) : undefined,
        description: formDescription.trim(),
        details: formDetails
          .split('\n')
          .map((d) => d.trim())
          .filter(Boolean),
        sizes: parsedSizes,
        colors: formColors.length > 0 ? formColors : undefined,
        colorImages: Object.keys(colorImagesMap).length > 0 ? colorImagesMap : undefined,
        stock: formStock,
        stockCount: formStockCount ? Number(formStockCount) : 10,
        sortOrder: formSortOrder ? Number(formSortOrder) : 1,
        featuredOnHome: formFeaturedOnHome,
        images:
          formImages.length > 0
            ? formImages
            : ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=1000'],
        hoverImageIndex: formHoverIndex,
        hoverFit: 'cover-top',
        imageFit: 'cover-top',
      };

      await upsertProduct(productPayload, true);
      await refreshProducts();
      setIsModalOpen(false);
      if (onCloseCreateModal) onCloseCreateModal();
      onRefresh();
      pushToast('Product Saved', `${productPayload.name} updated successfully`);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(productId);
      await refreshProducts();
      onRefresh();
      pushToast('Product Deleted');
    }
  };

  const handleTogglePublish = async (productId: string, current: boolean) => {
    await toggleProductPublish(productId, !current);
    await refreshProducts();
    onRefresh();
  };

  const filteredProducts = products
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase());
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    })
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

  const parsedFormSizes = formSizes
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200 dark:border-white/10">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-light text-stone-900 dark:text-white">
            Product Archive &amp; Stock
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Manage inventory catalogue, featured homepage pieces, Cloudinary editorial images, and pricing.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 bg-[#111111] hover:bg-black dark:bg-white dark:hover:bg-stone-200 text-white dark:text-black text-xs font-medium rounded-sm inline-flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Product
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or code..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-sm outline-none focus:border-stone-400"
          />
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          aria-label="Filter products by category"
          className="px-3 py-2 text-xs bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-sm outline-none"
        >
          <option value="All">All Categories ({products.length})</option>
          <option value="Upperwear">Upperwear</option>
          <option value="Bottomwear">Bottomwear</option>
          <option value="Shoes/Sneakers">Shoes &amp; Sneakers</option>
          <option value="Accessories">Accessories</option>
          <option value="Perfume">Perfume</option>
        </select>
      </div>

      {/* Product List Table */}
      <div className="bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-white/[0.02] border-b border-stone-200 dark:border-white/10 text-stone-500 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3 px-3 w-14 text-center">Order #</th>
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock Status</th>
                <th className="py-3 px-4">Units</th>
                <th className="py-3 px-4 text-center">Home Featured</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-white/5">
              {filteredProducts.map((product) => {
                const isPublished = product.is_published ?? true;
                const isFeatured = product.featuredOnHome ?? true;
                const isComingSoon = product.stock === 'coming-soon';

                return (
                  <tr key={product.id} className="hover:bg-stone-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        aria-label={`Sort order for ${product.name}`}
                        defaultValue={product.sortOrder ?? 1}
                        onBlur={async (e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val) && val !== product.sortOrder) {
                            const updated = { ...product, sortOrder: val };
                            await upsertProduct(updated, true);
                            await refreshProducts();
                            onRefresh();
                            pushToast('Display Priority Updated', `${product.name} is now priority #${val}`);
                          }
                        }}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-12 h-7 text-center font-mono font-bold text-xs bg-stone-50 dark:bg-white/10 text-stone-900 dark:text-white border border-stone-300 dark:border-white/20 rounded-xs focus:border-stone-900 dark:focus:border-white outline-none"
                        title="Edit priority number and press Enter or click away to reorder immediately"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-12 bg-stone-100 dark:bg-zinc-800 rounded-sm overflow-hidden shrink-0 border border-stone-200 dark:border-white/10">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-400">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-stone-900 dark:text-white flex items-center gap-1.5">
                            {product.name}
                            {isComingSoon && (
                              <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 rounded text-[9px] uppercase font-bold tracking-wider animate-pulse">
                                Coming Soon
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-400 font-mono">
                            {product.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-600 dark:text-stone-300">
                      {product.category}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-stone-900 dark:text-white">
                      {product.price ? formatBDT(product.price) : 'Tiered'}
                    </td>
                    {/* Quick Stock & Coming Soon Status Selector */}
                    <td className="py-3 px-4">
                      <select
                        value={product.stock}
                        aria-label={`Stock status for ${product.name}`}
                        onChange={async (e) => {
                          const newStock = e.target.value as StockStatus;
                          const updated = { ...product, stock: newStock };
                          await upsertProduct(updated, true);
                          await refreshProducts();
                          onRefresh();
                          pushToast(
                            newStock === 'coming-soon' ? 'Marked as Coming Soon' : 'Stock Updated',
                            `${product.name} set to ${newStock.replace('-', ' ')}`
                          );
                        }}
                        className={`text-[10px] font-medium tracking-wide uppercase px-2 py-1 rounded border outline-none cursor-pointer transition-colors ${
                          product.stock === 'in-stock'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300'
                            : product.stock === 'coming-soon'
                            ? 'bg-purple-50 border-purple-300 text-purple-800 dark:bg-purple-950/60 dark:border-purple-800 dark:text-purple-300 font-bold'
                            : 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300'
                        }`}
                      >
                        <option value="in-stock">In Stock</option>
                        <option value="coming-soon">Coming Soon ★</option>
                        <option value="out-of-stock">Out of Stock</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-700 dark:text-stone-300">
                      {product.stockCount ?? '15'}
                    </td>
                    {/* Home Featured Quick Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => handleToggleHomeFeatured(product, e)}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${
                          isFeatured
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100'
                            : 'text-stone-300 hover:text-stone-500 hover:bg-stone-100 dark:hover:bg-white/5'
                        }`}
                        title={isFeatured ? 'Featured on Home (Click to unfeature)' : 'Click to feature on Homepage'}
                      >
                        <Star className={`w-4 h-4 ${isFeatured ? 'fill-amber-500' : ''}`} />
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(product.id, isPublished)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium tracking-wider uppercase transition-colors cursor-pointer ${
                          isPublished
                            ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'text-stone-500 bg-stone-100 dark:bg-white/5 dark:text-stone-400'
                        }`}
                      >
                        {isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="p-1.5 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-[#141419] border border-stone-200 dark:border-white/10 rounded-sm shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-base font-display font-medium text-stone-900 dark:text-white">
                {editingProduct ? `Edit: ${editingProduct.name}` : 'New Product Record'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  if (onCloseCreateModal) onCloseCreateModal();
                }}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 dark:bg-rose-950/60 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded">
                  {uploadError}
                </div>
              )}

              {/* Home Page Featured Switch */}
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Star className={`w-4 h-4 ${formFeaturedOnHome ? 'text-amber-500 fill-amber-500' : 'text-stone-400'}`} />
                  <div>
                    <span className="font-semibold text-stone-900 dark:text-white text-xs">
                      Feature on Home Page Collection
                    </span>
                    <p className="text-[11px] text-stone-500">
                      When enabled, this piece appears in the primary curated archive on the homepage.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formFeaturedOnHome}
                  onChange={(e) => setFormFeaturedOnHome(e.target.checked)}
                  className="rounded border-stone-300 w-4 h-4 text-amber-600 focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Signature Oversized Tee"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none focus:border-stone-400"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none"
                  >
                    <option value="Upperwear">Upperwear</option>
                    <option value="Bottomwear">Bottomwear</option>
                    <option value="Shoes/Sneakers">Shoes &amp; Sneakers</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Perfume">Perfume</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                    Selling Price (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="1850"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none focus:border-stone-400"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                    Original Price / Cross-out (BDT)
                  </label>
                  <input
                    type="number"
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(e.target.value)}
                    placeholder="2200"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                    Stock Availability
                  </label>
                  <select
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value as StockStatus)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none"
                  >
                    <option value="in-stock">In Stock</option>
                    <option value="out-of-stock">Out of Stock</option>
                    <option value="coming-soon">Coming Soon</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                    Stock Count Units
                  </label>
                  <input
                    type="number"
                    value={formStockCount}
                    onChange={(e) => setFormStockCount(e.target.value)}
                    placeholder="15"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                    Display Priority / Sort Order *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(e.target.value)}
                    placeholder="1 (1 = First on website)"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none focus:border-stone-400 font-mono font-medium"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">
                    Lower number shows first on homepage (e.g. 1 = 1st, 2 = 2nd).
                  </p>
                </div>
              </div>

              <div>
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Available Sizes / Volumes (comma-separated)
                </label>
                <input
                  type="text"
                  value={formSizes}
                  onChange={(e) => setFormSizes(e.target.value)}
                  placeholder="S, M, L, XL, XXL (or 15 ml, 50 ml, 100 ml)"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Product Description
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Editorial garment description..."
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Fabric &amp; Detail Bullets (one per line)
                </label>
                <textarea
                  rows={3}
                  value={formDetails}
                  onChange={(e) => setFormDetails(e.target.value)}
                  placeholder="280 GSM luxury combed cotton&#10;Handcrafted in Dhaka atelier&#10;Pre-washed for architectural drape"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono text-[11px]"
                />
              </div>

              {/* Cloudinary Image Upload Section with Dimension Guidance */}
              <div className="pt-2 border-t border-stone-200 dark:border-white/10 space-y-3">
                {/* Image Dimension Guidelines Banner */}
                <div className="p-3 bg-stone-50 dark:bg-white/[0.03] border border-stone-200 dark:border-white/10 rounded flex items-start gap-2.5 text-[11px]">
                  <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-stone-600 dark:text-stone-300">
                    <strong className="text-stone-900 dark:text-white font-medium">Recommended Image Dimensions:</strong>
                    <div className="mt-0.5 space-y-0.5">
                      <p>• <strong>Apparel &amp; Model Editorial:</strong> <span className="font-mono text-stone-900 dark:text-white font-semibold">1200 × 1600 px</span> (3:4 Portrait aspect ratio)</p>
                      <p>• <strong>Footwear, Fragrances &amp; Caps:</strong> <span className="font-mono text-stone-900 dark:text-white font-semibold">1200 × 1200 px</span> (1:1 Square aspect ratio)</p>
                      <p className="text-stone-400">• Maximum file size: 5 MB · Format: JPG / WebP with neutral studio backdrop</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <label className="block uppercase tracking-wider text-stone-500 font-medium">
                    Editorial Images ({formImages.length})
                  </label>
                  <label className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-900 dark:text-white text-[11px] font-medium rounded-sm inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{isUploading ? 'Uploading to Cloudinary...' : 'Upload Photos'}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>

                {/* Uploaded images gallery */}
                {formImages.length === 0 ? (
                  <div className="border border-dashed border-stone-300 dark:border-white/15 p-6 text-center text-stone-400">
                    <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <p className="text-[11px]">No images uploaded yet. Upload product photos via Cloudinary.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {formImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className={`relative group aspect-3/4 rounded-sm overflow-hidden border ${
                          formHoverIndex === idx
                            ? 'border-amber-500 ring-2 ring-amber-500/20'
                            : 'border-stone-200 dark:border-white/10'
                        }`}
                      >
                        <img src={imgUrl} alt="Product view" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                          <button
                            type="button"
                            onClick={() => setFormHoverIndex(idx)}
                            className="px-1.5 py-0.5 bg-white/20 hover:bg-white/40 text-[9px] text-white rounded cursor-pointer"
                          >
                            {formHoverIndex === idx ? 'Hover Image' : 'Set as Hover'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1 text-rose-300 hover:text-rose-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Colorways & Color-Specific Photos Section */}
                <div className="pt-4 border-t border-stone-200 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                        <span className="font-semibold text-stone-900 dark:text-white text-xs uppercase tracking-wider">
                          Colorways &amp; Color-Specific Photos ({formColors.length})
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        Link specific photos to colors. When a customer picks a color, the gallery switches to that photo automatically. Customers can choose any size with any color.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddColor}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-900 dark:text-white text-[11px] font-medium rounded-sm inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Color</span>
                    </button>
                  </div>

                  {formColors.length === 0 ? (
                    <div className="p-4 border border-dashed border-stone-300 dark:border-white/15 text-center text-stone-400 rounded">
                      <p className="text-[11px]">No colorways configured. This piece will use standard product photos.</p>
                      <button
                        type="button"
                        onClick={handleAddColor}
                        className="mt-2 px-3 py-1 bg-stone-900 text-white dark:bg-white dark:text-black text-[11px] font-medium rounded cursor-pointer"
                      >
                        + Add First Color
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formColors.map((color, idx) => {
                        const activeImgSrc =
                          color.imageUrl ||
                          (color.imageIndex !== undefined && formImages[color.imageIndex]
                            ? formImages[color.imageIndex]
                            : undefined) ||
                          formImages[0];

                        return (
                          <div
                            key={idx}
                            className="p-3 bg-stone-50/70 dark:bg-white/[0.02] border border-stone-200 dark:border-white/10 rounded space-y-2.5"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              {/* Color Name & Swatch Hex */}
                              <div className="flex items-center gap-2 flex-1">
                                <div className="relative shrink-0">
                                  <input
                                    id={`native-color-picker-${idx}`}
                                    type="color"
                                    value={color.hex || '#111111'}
                                    onChange={(e) => handleUpdateColor(idx, { hex: e.target.value })}
                                    className="w-7 h-7 rounded border border-stone-300 dark:border-white/20 p-0 cursor-pointer overflow-hidden"
                                    title="Choose color"
                                  />
                                </div>

                                <input
                                  type="text"
                                  value={color.name}
                                  onChange={(e) => handleUpdateColor(idx, { name: e.target.value })}
                                  placeholder="e.g. Onyx Black"
                                  className="w-36 px-2.5 py-1.5 bg-white dark:bg-black/40 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded text-xs outline-none"
                                />

                                <input
                                  type="text"
                                  value={color.hex}
                                  onChange={(e) => handleUpdateColor(idx, { hex: e.target.value })}
                                  placeholder="#111111"
                                  className="w-20 px-2 py-1.5 font-mono text-[11px] bg-white dark:bg-black/40 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded outline-none"
                                />

                                {/* Eyedropper Tool to pick color from photo / screen */}
                                <button
                                  type="button"
                                  onClick={() => handlePickColorFromScreen(idx)}
                                  title="Pick color from image or screen with eyedropper"
                                  className="p-1.5 bg-white hover:bg-stone-100 dark:bg-white/10 dark:hover:bg-white/20 border border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300 rounded cursor-pointer transition-colors"
                                >
                                  <Pipette className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Photo Selection for this Color */}
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                                  <ImageIcon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                  <span>Photo:</span>
                                </div>

                                <select
                                  value={
                                    color.imageUrl
                                      ? 'custom'
                                      : color.imageIndex !== undefined
                                      ? String(color.imageIndex)
                                      : '0'
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'custom') {
                                      handleUpdateColor(idx, {
                                        imageUrl: color.imageUrl || formImages[0] || '',
                                      });
                                    } else {
                                      const num = Number(val);
                                      handleUpdateColor(idx, {
                                        imageIndex: num,
                                        imageUrl: formImages[num] || undefined,
                                      });
                                    }
                                  }}
                                  className="text-[11px] bg-white dark:bg-black/40 border border-stone-200 dark:border-white/10 rounded px-2 py-1.5 outline-none"
                                >
                                  {formImages.map((_, imgI) => (
                                    <option key={imgI} value={imgI}>
                                      Photo #{imgI + 1}
                                    </option>
                                  ))}
                                  <option value="custom">Custom Photo URL...</option>
                                </select>

                                {activeImgSrc && (
                                  <div className="w-7 h-9 rounded overflow-hidden border border-stone-300 dark:border-white/20 shrink-0 bg-stone-100 dark:bg-stone-800">
                                    <img
                                      src={activeImgSrc}
                                      alt="Thumbnail"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}

                                {formColors.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveColor(idx)}
                                    className="p-1 text-stone-400 hover:text-rose-500 cursor-pointer transition-colors"
                                    title="Remove this colorway"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Custom URL Input if selected */}
                            {color.imageUrl && (
                              <div className="flex items-center gap-2 pt-1 border-t border-stone-200/50 dark:border-white/5">
                                <span className="text-[10px] text-stone-400 shrink-0">Direct Image URL:</span>
                                <input
                                  type="url"
                                  value={color.imageUrl}
                                  onChange={(e) => handleUpdateColor(idx, { imageUrl: e.target.value })}
                                  placeholder="https://..."
                                  className="w-full px-2 py-1 text-[11px] font-mono bg-white dark:bg-black/40 border border-stone-200 dark:border-white/10 rounded outline-none"
                                />
                              </div>
                            )}

                            {/* Quick Preset Palette Chips */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-stone-100 dark:border-white/5">
                              <span className="text-[9px] uppercase tracking-wider text-stone-400 shrink-0">
                                Presets:
                              </span>
                              {LUXURY_COLOR_PRESETS.map((preset) => (
                                <button
                                  key={preset.name}
                                  type="button"
                                  onClick={() =>
                                    handleUpdateColor(idx, {
                                      name: preset.name,
                                      hex: preset.hex,
                                    })
                                  }
                                  className="px-1.5 py-0.5 bg-white dark:bg-black/30 border border-stone-200 dark:border-white/10 hover:border-stone-400 dark:hover:border-white/30 rounded text-[9px] text-stone-600 dark:text-stone-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <span
                                    style={{ backgroundColor: preset.hex }}
                                    className="w-2 h-2 rounded-full border border-black/10 shrink-0"
                                  />
                                  <span>{preset.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-stone-200 dark:border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 dark:border-white/15 text-stone-700 dark:text-stone-300 text-xs font-medium rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#111111] hover:bg-black dark:bg-white dark:hover:bg-stone-200 text-white dark:text-black text-xs font-medium rounded-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
