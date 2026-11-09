import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Truck,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Sun,
  Moon,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { AdminUser, logoutAdmin } from '../services/authService';
import { AdminOrder, fetchAllOrders } from '../services/orderService';
import { Product } from '../types/store';
import { fetchAdminProducts } from '../services/productService';
import { DashboardOverview } from './DashboardOverview';
import { ProductManagement } from './ProductManagement';
import { OrderManagement } from './OrderManagement';
import { CustomerManagement } from './CustomerManagement';
import { CourierSettings } from './CourierSettings';
import { OffersManagement } from './OffersManagement';
import { ShippingLabelModal } from './ShippingLabelModal';
import { useStore } from '../context/StoreContext';

interface AdminLayoutProps {
  adminUser: AdminUser;
  onLogout: () => void;
  onExitToStore: () => void;
}

export type AdminTab = 'overview' | 'orders' | 'products' | 'offers' | 'customers' | 'courier';

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  adminUser,
  onLogout,
  onExitToStore,
}) => {
  const { theme, toggleTheme } = useStore();
  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<(Product & { is_published?: boolean })[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isBulkLabelsOpen, setIsBulkLabelsOpen] = useState(false);
  const [bulkLabelsOrders, setBulkLabelsOrders] = useState<AdminOrder[]>([]);
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);

  const loadData = async () => {
    const [fetchedOrders, fetchedProducts] = await Promise.all([
      fetchAllOrders(),
      fetchAdminProducts(),
    ]);
    setOrders(fetchedOrders);
    setProducts(fetchedProducts);
  };

  useEffect(() => {
    loadData();
    const handleRefresh = () => {
      loadData();
    };
    window.addEventListener('sparta_orders_updated', handleRefresh);
    window.addEventListener('sparta_products_updated', handleRefresh);
    const interval = setInterval(loadData, 12000); // 12-second live sync

    return () => {
      window.removeEventListener('sparta_orders_updated', handleRefresh);
      window.removeEventListener('sparta_products_updated', handleRefresh);
      clearInterval(interval);
    };
  }, []);

  const handleOpenBulkLabels = (pickedOrders?: AdminOrder[]) => {
    const list = pickedOrders && pickedOrders.length > 0 ? pickedOrders : orders;
    setBulkLabelsOrders(list);
    setIsBulkLabelsOpen(true);
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders & Dispatch', icon: Package, badge: orders.filter((o) => o.status === 'pending').length },
    { id: 'products', label: 'Inventory Catalogue', icon: ShoppingBag },
    { id: 'offers', label: 'Offers & Promos', icon: Tag },
    { id: 'customers', label: 'Client Directory', icon: Users },
    { id: 'courier', label: 'Settings & Integrations', icon: Truck },
  ];

  return (
    <div className="min-h-screen flex bg-stone-50 dark:bg-[#09090C] text-stone-900 dark:text-stone-100 transition-colors">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-stone-200 dark:border-white/10 bg-white dark:bg-[#0D0D11]">
        {/* Brand Header */}
        <div className="p-6 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono tracking-widest uppercase text-stone-400 mb-2">
              Operations Center
            </div>
            <img
              src={theme === 'dark' ? '/assets/brand/logo-white.png' : '/assets/brand/logo-black.png'}
              alt="SPARTA"
              className="h-4 w-auto object-contain"
            />
          </div>
          <button
            type="button"
            onClick={() => toggleTheme()}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-white cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setCurrentTab(item.id as AdminTab);
                  if (item.id !== 'orders') setSelectedOrder(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-black font-semibold'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer controls */}
        <div className="p-4 border-t border-stone-200 dark:border-white/10 space-y-3">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-white/10 flex items-center justify-center text-xs font-mono">
              <ShieldCheck className="w-4 h-4 text-stone-700 dark:text-stone-300" />
            </div>
            <div className="flex-1 truncate">
              <div className="text-xs font-medium text-stone-900 dark:text-white truncate">
                {adminUser.email}
              </div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wider">
                {adminUser.role}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onExitToStore}
              className="flex-1 px-3 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 text-stone-700 dark:text-stone-300 rounded text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Storefront
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="lg:hidden h-14 border-b border-stone-200 dark:border-white/10 px-4 flex items-center justify-between bg-white dark:bg-[#0D0D11] shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="p-1.5 text-stone-600 dark:text-stone-300 cursor-pointer"
            >
              {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <img
                src={theme === 'dark' ? '/assets/brand/logo-white.png' : '/assets/brand/logo-black.png'}
                alt="SPARTA"
                className="h-3.5 w-auto object-contain"
              />
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-stone-100 dark:bg-white/10 text-stone-500">
                Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleTheme()}
              className="p-1.5 text-stone-500 cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onExitToStore}
              className="text-xs px-2.5 py-1 bg-stone-100 dark:bg-white/10 rounded text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              Store
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {isMobileNavOpen && (
          <div className="lg:hidden bg-white dark:bg-[#0D0D11] border-b border-stone-200 dark:border-white/10 p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCurrentTab(item.id as AdminTab);
                    setIsMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded ${
                    isActive
                      ? 'bg-stone-900 text-white dark:bg-white dark:text-black'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* View Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentTab === 'overview' && (
            <DashboardOverview
              orders={orders}
              products={products}
              onSelectOrder={(ord) => {
                setSelectedOrder(ord);
                setCurrentTab('orders');
              }}
              onNavigateTab={(tab) => setCurrentTab(tab as AdminTab)}
              onOpenCreateProduct={() => {
                setCurrentTab('products');
                setIsCreateProductModalOpen(true);
              }}
              onOpenBulkLabels={() => handleOpenBulkLabels()}
            />
          )}

          {currentTab === 'orders' && (
            <OrderManagement
              orders={orders}
              onRefresh={loadData}
              selectedOrder={selectedOrder}
              onSelectOrder={setSelectedOrder}
              onOpenBulkLabels={handleOpenBulkLabels}
            />
          )}

          {currentTab === 'products' && (
            <ProductManagement
              products={products}
              onRefresh={loadData}
              isCreateModalOpen={isCreateProductModalOpen}
              onCloseCreateModal={() => setIsCreateProductModalOpen(false)}
            />
          )}

          {currentTab === 'offers' && <OffersManagement />}

          {currentTab === 'customers' && <CustomerManagement orders={orders} />}

          {currentTab === 'courier' && <CourierSettings />}
        </main>
      </div>

      {/* A4 Bulk Shipping Labels Generator Modal */}
      <ShippingLabelModal
        isOpen={isBulkLabelsOpen}
        orders={bulkLabelsOrders}
        onClose={() => setIsBulkLabelsOpen(false)}
      />
    </div>
  );
};
