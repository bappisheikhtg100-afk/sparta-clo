/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircle } from 'lucide-react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
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
import { STORE_INFO } from './data/storeData';
import { AdminLayout } from './admin/AdminLayout';
import { AdminLogin } from './admin/AdminLogin';
import { AdminUser, getCurrentAdmin, logoutAdmin } from './services/authService';

const StoreShell: React.FC = () => {
  const { currentRoute, navigate } = useStore();
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

      {/* Architectural WhatsApp Concierge Trigger on Home */}
      {currentRoute === 'home' && (
        <a
          href={`https://wa.me/${STORE_INFO.whatsappNumber}?text=${encodeURIComponent(
            'Hello SPARTA Support!'
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with SPARTA on WhatsApp"
          className="fixed bottom-5 right-5 z-30 min-h-[46px] min-w-[46px] px-4 bg-[#111111] text-[#FAF9F6] dark:bg-[#F5F4F0] dark:text-[#08080A] shadow-md border border-white/10 dark:border-black/10 inline-flex items-center justify-center gap-2 text-xs font-medium tracking-wide hover:opacity-90 active:scale-95 transition-all duration-150"
        >
          <MessageCircle className="w-4 h-4 shrink-0" strokeWidth={1.7} />
          <span className="hidden sm:inline">Concierge</span>
        </a>
      )}
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
