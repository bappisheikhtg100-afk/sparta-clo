/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { AnnouncementBar } from './components/AnnouncementBar';
import { MobileMenuDrawer } from './components/MobileMenuDrawer';
import { CartDrawer } from './components/CartDrawer';
import { HeroSection } from './components/HeroSection';
import { CollectionSection } from './components/CollectionSection';
import { AtelierSection } from './components/AtelierSection';
import { ProductDetailView } from './components/ProductDetailView';
import { CheckoutView } from './components/CheckoutView';
import { OrderConfirmedView } from './components/OrderConfirmedView';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/ToastContainer';
import { WhatsAppIcon } from './components/SocialIcons';
import { AdminLayout } from './admin/AdminLayout';
import { AdminLogin } from './admin/AdminLogin';
import { AdminUser, getCurrentAdmin, logoutAdmin } from './services/authService';

const StoreShell: React.FC = () => {
  const { currentRoute, navigate, storeSettings } = useStore();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    getCurrentAdmin()
      .then((user) => setAdminUser(user))
      .catch(() => setAdminUser(null))
      .finally(() => setIsCheckingAuth(false));
  }, []);

  const handleLogout = async () => {
    await logoutAdmin();
    setAdminUser(null);
    navigate('home');
  };

  // If in admin route
  if (currentRoute === 'admin') {
    if (isCheckingAuth) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#09090C] text-stone-400 font-mono text-xs">
          Authenticating SPARTA Portal...
        </div>
      );
    }

    if (!adminUser) {
      return (
        <AdminLogin
          onLoginSuccess={(user) => setAdminUser(user)}
          onExit={() => navigate('home')}
        />
      );
    }

    return (
      <AdminLayout
        adminUser={adminUser}
        onLogout={handleLogout}
        onExitToStore={() => navigate('home')}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#111111] dark:bg-[#08080A] dark:text-[#F5F4F0] transition-colors duration-200">
      <AnnouncementBar />
      <Navbar />
      <MobileMenuDrawer />
      <CartDrawer />
      <ToastContainer />

      <main className="flex-1 w-full">
        <AnimatePresence mode="wait">
          {currentRoute === 'home' && (
            <motion.div
              key="route-home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              <HeroSection />
              <CollectionSection />
              <AtelierSection />
            </motion.div>
          )}

          {currentRoute === 'product' && (
            <motion.div
              key="route-product"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <ProductDetailView />
            </motion.div>
          )}

          {currentRoute === 'checkout' && (
            <motion.div
              key="route-checkout"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <CheckoutView />
            </motion.div>
          )}

          {currentRoute === 'order-confirmed' && (
            <motion.div
              key="route-confirmed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <OrderConfirmedView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />

      {/* Floating Official WhatsApp Concierge Button */}
      <a
        href={`https://wa.me/${storeSettings.whatsappNumber || '8801610046310'}?text=${encodeURIComponent(
          'Hello SPARTA! I would like to inquire about an order.'
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-5 right-5 z-40 group flex items-center gap-2.5 px-4 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 active:scale-95"
      >
        <div className="relative flex items-center justify-center">
          <WhatsAppIcon className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full animate-ping opacity-75" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full" />
        </div>
        <span className="text-xs font-semibold tracking-wide hidden sm:inline">
          WhatsApp Concierge
        </span>
      </a>
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <StoreShell />
    </StoreProvider>
  );
}
