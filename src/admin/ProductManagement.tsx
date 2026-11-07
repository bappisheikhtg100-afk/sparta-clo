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
} from 'lucide-react';
import { Product, Category, StockStatus } from '../types/store';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { upsertProduct, deleteProduct, toggleProductPublish } from '../services/productService';
import { formatBDT } from '../data/storeData';
import { useStore } from '../context/StoreContext';

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
  const { refreshProducts } = useStore();
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
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formHoverIndex, setFormHoverIndex] = useState(1);
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
    setFormImages([]);
    setFormHoverIndex(1);
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
    setFormImages(p.images || []);
    setFormHoverIndex(p.hoverImageIndex ?? 1);
    setUploadError(null);
    setIsModalOpen(true);
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

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSaving(true);
    try {
      const productId =
        editingProduct?.id ||
        `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

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
        sizes: formSizes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        stock: formStock,
        stockCount: formStockCount ? Number(formStockCount) : 10,
        images: formImages.length > 0 ? formImages : ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=1000'],
        hoverImageIndex: formHoverIndex,
        hoverFit: 'cover-top',
        imageFit: 'cover-top',
      };

      await upsertProduct(productPayload, true);
      await refreshProducts();
      setIsModalOpen(false);
      if (onCloseCreateModal) onCloseCreateModal();
      onRefresh();
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
    }
  };

  const handleTogglePublish = async (productId: string, current: boolean) => {
    await toggleProductPublish(productId, !current);
    await refreshProducts();
    onRefresh();
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200 dark:border-white/10">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-light text-stone-900 dark:text-white">
            Product Archive &amp; Stock
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Manage inventory catalogue, Cloudinary editorial images, and pricing.
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
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock Status</th>
                <th className="py-3 px-4">Units</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-white/5">
              {filteredProducts.map((product) => {
                const isPublished = product.is_published ?? true;
                return (
                  <tr key={product.id} className="hover:bg-stone-50 dark:hover:bg-white/[0.02] transition-colors">
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
                          <div className="font-medium text-stone-900 dark:text-white">
                            {product.name}
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
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase ${
                          product.stock === 'in-stock'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : product.stock === 'out-of-stock'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {product.stock.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-700 dark:text-stone-300">
                      {product.stockCount ?? '15'}
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
              </div>

              <div>
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Available Sizes (comma-separated)
                </label>
                <input
                  type="text"
                  value={formSizes}
                  onChange={(e) => setFormSizes(e.target.value)}
                  placeholder="S, M, L, XL, XXL"
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

              {/* Cloudinary Image Upload Section */}
              <div className="pt-2 border-t border-stone-200 dark:border-white/10">
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
