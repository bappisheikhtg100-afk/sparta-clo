import React, { useState, useEffect } from 'react';
import {
  Truck,
  Shield,
  Key,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  Cloud,
  Megaphone,
  Share2,
} from 'lucide-react';
import {
  getStoredPathaoCredentials,
  savePathaoCredentials,
  syncPathaoCredentialsFromSupabase,
  getPathaoAccessToken,
  fetchPathaoStores,
  PathaoCredentials,
  PathaoStore,
  PATHAO_SANDBOX_DEFAULTS,
  PATHAO_PRODUCTION_DEFAULTS,
} from '../services/pathaoService';
import {
  CarrybeeCredentials,
  CarrybeeStore,
  getStoredCarrybeeCredentials,
  saveCarrybeeCredentials,
  syncCarrybeeCredentialsFromSupabase,
  fetchCarrybeeStores,
  CARRYBEE_PRODUCTION_DEFAULTS,
  CARRYBEE_SANDBOX_DEFAULTS,
} from '../services/carrybeeService';
import { CLOUDINARY_CONFIG } from '../services/cloudinaryService';
import { useStore } from '../context/StoreContext';

export const CourierSettings: React.FC = () => {
  const { storeSettings, updateSettings } = useStore();
  const [activeCourierTab, setActiveCourierTab] = useState<'pathao' | 'carrybee'>('pathao');

  // Pathao States
  const [creds, setCreds] = useState<PathaoCredentials>(getStoredPathaoCredentials());
  const [showSecret, setShowSecret] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [stores, setStores] = useState<PathaoStore[]>([]);
  const [isFetchingStores, setIsFetchingStores] = useState(false);

  // Carrybee States
  const [carrybeeCreds, setCarrybeeCreds] = useState<CarrybeeCredentials>(getStoredCarrybeeCredentials());
  const [showCarrybeeSecret, setShowCarrybeeSecret] = useState(false);
  const [showCarrybeeContext, setShowCarrybeeContext] = useState(false);
  const [isTestingCarrybee, setIsTestingCarrybee] = useState(false);
  const [carrybeeTestResult, setCarrybeeTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [carrybeeStores, setCarrybeeStores] = useState<CarrybeeStore[]>([]);
  const [isFetchingCarrybeeStores, setIsFetchingCarrybeeStores] = useState(false);

  // Announcement & Social Links
  const [announcementText, setAnnouncementText] = useState(storeSettings.announcementText);
  const [isAnnouncementActive, setIsAnnouncementActive] = useState(storeSettings.isAnnouncementActive);
  const [facebookUrl, setFacebookUrl] = useState(storeSettings.facebookUrl);
  const [instagramUrl, setInstagramUrl] = useState(storeSettings.instagramUrl);
  const [tiktokUrl, setTiktokUrl] = useState(storeSettings.tiktokUrl);
  const [whatsappNumber, setWhatsappNumber] = useState(storeSettings.whatsappNumber);

  // Marketing, Meta Pixel & Google Analytics
  const [metaPixelId, setMetaPixelId] = useState(storeSettings.metaPixelId || '');
  const [isMetaPixelActive, setIsMetaPixelActive] = useState(storeSettings.isMetaPixelActive ?? false);
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState(storeSettings.googleAnalyticsId || '');
  const [isGoogleAnalyticsActive, setIsGoogleAnalyticsActive] = useState(storeSettings.isGoogleAnalyticsActive ?? false);

  const [isSaved, setIsSaved] = useState(false);

  // Delivery fee rules
  const [insideDhakaFee, setInsideDhakaFee] = useState(String(storeSettings.insideDhakaFee || 70));
  const [outsideDhakaFee, setOutsideDhakaFee] = useState(String(storeSettings.outsideDhakaFee || 120));
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(String(storeSettings.freeShippingThreshold || 5000));

  useEffect(() => {
    setAnnouncementText(storeSettings.announcementText);
    setIsAnnouncementActive(storeSettings.isAnnouncementActive);
    setFacebookUrl(storeSettings.facebookUrl);
    setInstagramUrl(storeSettings.instagramUrl);
    setTiktokUrl(storeSettings.tiktokUrl);
    setWhatsappNumber(storeSettings.whatsappNumber);
    setInsideDhakaFee(String(storeSettings.insideDhakaFee || 70));
    setOutsideDhakaFee(String(storeSettings.outsideDhakaFee || 120));
    setFreeShippingThreshold(String(storeSettings.freeShippingThreshold || 5000));
    setMetaPixelId(storeSettings.metaPixelId || '');
    setIsMetaPixelActive(storeSettings.isMetaPixelActive ?? false);
    setGoogleAnalyticsId(storeSettings.googleAnalyticsId || '');
    setIsGoogleAnalyticsActive(storeSettings.isGoogleAnalyticsActive ?? false);

    // Multi-device sync: Load Pathao credentials from Supabase
    syncPathaoCredentialsFromSupabase().then((synced) => {
      if (synced && synced.clientId) {
        setCreds(synced);
      }
    });

    // Multi-device sync: Load Carrybee credentials from Supabase
    syncCarrybeeCredentialsFromSupabase().then((synced) => {
      if (synced && synced.clientId) {
        setCarrybeeCreds(synced);
      }
    });
  }, [storeSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    savePathaoCredentials(creds);
    saveCarrybeeCredentials(carrybeeCreds);
    await updateSettings({
      ...storeSettings,
      announcementText,
      isAnnouncementActive,
      facebookUrl,
      instagramUrl,
      tiktokUrl,
      whatsappNumber,
      insideDhakaFee: Number(insideDhakaFee) || 70,
      outsideDhakaFee: Number(outsideDhakaFee) || 120,
      freeShippingThreshold: Number(freeShippingThreshold) || 5000,
      metaPixelId: metaPixelId.trim(),
      isMetaPixelActive,
      googleAnalyticsId: googleAnalyticsId.trim(),
      isGoogleAnalyticsActive,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const token = await getPathaoAccessToken(creds, true);
      let storeMsg = '';

      // Try fetching stores
      try {
        setIsFetchingStores(true);
        const storeList = await fetchPathaoStores(creds);
        setStores(storeList);
        if (storeList.length > 0) {
          const activeStore = storeList.find((s) => s.is_active === 1) || storeList[0];
          const updatedCreds = {
            ...creds,
            storeId: activeStore.store_id,
          };
          setCreds(updatedCreds);
          savePathaoCredentials(updatedCreds);
          storeMsg = ` Connected Store: "${activeStore.store_name}" (Store ID: ${activeStore.store_id}). Pickup Address: ${activeStore.store_address}.`;
        }
      } catch (err: any) {
        console.warn('Store fetch error:', err);
      } finally {
        setIsFetchingStores(false);
      }

      setTestResult({
        success: true,
        message: `Successfully authenticated with Pathao!${storeMsg}`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Authentication failed. Please verify credentials with Pathao.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestCarrybeeConnection = async () => {
    setIsTestingCarrybee(true);
    setCarrybeeTestResult(null);

    try {
      setIsFetchingCarrybeeStores(true);
      const storeList = await fetchCarrybeeStores(carrybeeCreds);
      setCarrybeeStores(storeList);

      let storeMsg = '';
      if (storeList.length > 0) {
        const activeStore = storeList.find((s) => s.is_active) || storeList[0];
        const updated = { ...carrybeeCreds, storeId: String(activeStore.id) };
        setCarrybeeCreds(updated);
        saveCarrybeeCredentials(updated);
        storeMsg = ` Connected Store: "${activeStore.name}" (Store ID: ${activeStore.id}). Address: ${activeStore.address}.`;
      } else {
        // If client's merchant account has zero stores, auto-provision their primary store
        try {
          const { createCarrybeeStore } = await import('../services/carrybeeService');
          const newStore = await createCarrybeeStore(
            {
              name: 'SPARTA Atelier',
              contact_person_name: 'Store Manager',
              contact_person_number: '01700000000',
              address: 'House 12, Road 5, Dhanmondi, Dhaka',
              city_id: 14,
              zone_id: 50,
              area_id: 1643,
            },
            carrybeeCreds
          );
          if (newStore?.id) {
            const updated = { ...carrybeeCreds, storeId: String(newStore.id) };
            setCarrybeeCreds(updated);
            saveCarrybeeCredentials(updated);
            setCarrybeeStores([newStore]);
            storeMsg = ` Auto-created Primary Pickup Store: "${newStore.name}" (Store ID: ${newStore.id}).`;
          }
        } catch (storeCreateErr) {
          console.warn('Auto store creation notice:', storeCreateErr);
        }
      }

      setCarrybeeTestResult({
        success: true,
        message: `Successfully authenticated with Carrybee Courier API!${storeMsg}`,
      });
    } catch (err: any) {
      setCarrybeeTestResult({
        success: false,
        message: err?.message || 'Carrybee authentication failed. Please verify credentials.',
      });
    } finally {
      setIsFetchingCarrybeeStores(false);
      setIsTestingCarrybee(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl text-xs">
      <div className="pb-2 border-b border-stone-200 dark:border-white/10">
        <h2 className="text-xl sm:text-2xl font-display font-light text-stone-900 dark:text-white">
          Integrations &amp; Courier Configuration
        </h2>
        <p className="text-stone-500 dark:text-stone-400 mt-0.5">
          Configure Pathao Courier API endpoints, credentials, store pickup addresses, and media storage.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Courier Platform Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-200 dark:border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveCourierTab('pathao')}
            className={`px-4 py-2 text-xs font-medium rounded-sm inline-flex items-center gap-2 cursor-pointer transition-colors ${
              activeCourierTab === 'pathao'
                ? 'bg-rose-600 text-white font-semibold'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-700 dark:text-stone-300'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Pathao Courier (Aladdin v1)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCourierTab('carrybee')}
            className={`px-4 py-2 text-xs font-medium rounded-sm inline-flex items-center gap-2 cursor-pointer transition-colors ${
              activeCourierTab === 'carrybee'
                ? 'bg-amber-600 text-white font-semibold'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-700 dark:text-stone-300'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Carrybee Courier (Developers v2.0)</span>
          </button>
        </div>

        {/* Pathao Courier Settings Card */}
        {activeCourierTab === 'pathao' && (
          <div className="p-6 bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-stone-900 dark:text-white">
                    Pathao Courier API (Hermes Aladdin)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Direct REST integration with Pathao Merchant API for automated parcel dispatch
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...PATHAO_PRODUCTION_DEFAULTS,
                      storeId: 500277,
                      isSandbox: false,
                    };
                    setCreds(updated);
                    savePathaoCredentials(updated);
                    setTestResult({
                      success: true,
                      message: 'Your Live Pathao credentials loaded (Best Test Brand - Store ID: 500277). Click "Test Pathao Credentials" to verify.',
                    });
                  }}
                  className="px-2.5 py-1 bg-stone-900 dark:bg-white text-white dark:text-black rounded text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Load My Live Credentials
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...PATHAO_SANDBOX_DEFAULTS,
                      storeId: 11,
                      isSandbox: true,
                    };
                    setCreds(updated);
                    savePathaoCredentials(updated);
                    setTestResult({
                      success: true,
                      message: 'Official Pathao Sandbox credentials loaded (Demo Store ID: 11). Click "Test Pathao Credentials" to verify.',
                    });
                  }}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-700 dark:text-stone-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Load Sandbox Preset
                </button>

                <label className="flex items-center gap-1.5 ml-1 cursor-pointer">
                  <span className={`text-[11px] font-medium ${creds.isSandbox ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {creds.isSandbox ? 'Sandbox (Test)' : 'Production (Live)'}
                  </span>
                  <input
                    type="checkbox"
                    checked={creds.isSandbox}
                    onChange={(e) => {
                      const isSand = e.target.checked;
                      const updated = {
                        ...creds,
                        isSandbox: isSand,
                        storeId: isSand ? 11 : 500277,
                      };
                      setCreds(updated);
                      savePathaoCredentials(updated);
                    }}
                    className="rounded border-stone-300 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Auto-Address & Environment Notice */}
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded text-[11px] text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <span>Pathao Merchant Reverse-Proxy &amp; Auto-Address Active</span>
                <span className="px-1.5 py-0.2 bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 text-[10px] rounded">
                  Verified
                </span>
              </div>
              <p className="text-emerald-800 dark:text-emerald-300">
                API requests are routed through the backend reverse-proxy, eliminating browser CORS blocks. Pathao's official NLP engine automatically parses recipient address strings to populate city, zone, and delivery hubs.
              </p>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded border text-[11px] flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  value={creds.clientId}
                  onChange={(e) => setCreds({ ...creds, clientId: e.target.value })}
                  placeholder="Pathao OAuth Client ID"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Client Secret
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={creds.clientSecret}
                    onChange={(e) => setCreds({ ...creds, clientSecret: e.target.value })}
                    placeholder="Pathao OAuth Client Secret"
                    className="w-full pl-3 pr-9 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-white cursor-pointer"
                  >
                    {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Merchant Username / Email *
                </label>
                <input
                  type="text"
                  value={creds.username}
                  onChange={(e) => setCreds({ ...creds, username: e.target.value })}
                  placeholder="merchant-email@sparta.com"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  The registered login email from your merchant.pathao.com account.
                </span>
              </div>

              <div>
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Merchant Account Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={creds.password}
                    onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full pl-3 pr-9 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Required by Pathao OAuth2 Password Grant to bind token to your merchant ID.
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Pathao Webhook Secret (Optional / Recommended)
                </label>
                <input
                  type="text"
                  value={creds.webhookSecret || ''}
                  onChange={(e) => setCreds({ ...creds, webhookSecret: e.target.value })}
                  placeholder="Webhook verification secret token"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Secures incoming parcel status webhooks (Delivered, In-Transit, Returned) from Pathao.
                </span>
              </div>

              <div className="sm:col-span-2 p-3 bg-stone-50 dark:bg-black/40 border border-stone-200 dark:border-white/10 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500">
                    Your Webhook Callback URL
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('https://xqzzeisabqsqblogbvhb.supabase.co/functions/v1/pathao-webhook');
                      alert('Webhook URL copied to clipboard!');
                    }}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Copy URL
                  </button>
                </div>
                <code className="text-[11px] font-mono text-stone-700 dark:text-stone-300 select-all block break-all">
                  https://xqzzeisabqsqblogbvhb.supabase.co/functions/v1/pathao-webhook
                </code>
                <p className="text-[10px] text-stone-500 mt-1.5 leading-relaxed">
                  <strong>How to get Webhook Secret:</strong> In your <a href="https://merchant.pathao.com" target="_blank" rel="noreferrer" className="underline text-blue-500">merchant.pathao.com</a> account, click <strong>Developer&apos;s API</strong> on the left sidebar &rarr; click <strong>Webhook Integration</strong> &rarr; paste the URL above &rarr; click Save. Pathao will generate your secret key. (Note: This is 100% optional; order creation and live parcel tracking work directly without it).
                </p>
              </div>
            </div>

            {/* Store Selection if fetched */}
            {stores.length > 0 && (
              <div>
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Active Pickup Store
                </label>
                <select
                  value={creds.storeId || ''}
                  onChange={(e) => setCreds({ ...creds, storeId: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none"
                >
                  {stores.map((s: PathaoStore) => (
                    <option key={s.store_id} value={s.store_id}>
                      {s.store_name} — {s.store_address}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-900 dark:text-white font-medium rounded-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Test Pathao Credentials
              </button>
            </div>
          </div>
        )}

        {/* Carrybee Courier Settings Card */}
        {activeCourierTab === 'carrybee' && (
          <div className="p-6 bg-white dark:bg-[#121216] border border-amber-300/40 dark:border-amber-500/20 rounded-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-stone-900 dark:text-white">
                    Carrybee Courier API (Developers v2.0)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Direct integration with Carrybee Delivery API for merchant automated parcel dispatch
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...CARRYBEE_PRODUCTION_DEFAULTS,
                      isSandbox: false,
                    };
                    setCarrybeeCreds(updated);
                    saveCarrybeeCredentials(updated);
                    setCarrybeeTestResult({
                      success: true,
                      message: 'Your Live Carrybee credentials loaded (Production mode). Click "Test Carrybee Credentials" to verify.',
                    });
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Load My Live Credentials
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...CARRYBEE_SANDBOX_DEFAULTS,
                      isSandbox: true,
                    };
                    setCarrybeeCreds(updated);
                    saveCarrybeeCredentials(updated);
                    setCarrybeeTestResult({
                      success: true,
                      message: 'Official Carrybee Sandbox credentials loaded! Click "Test Carrybee Credentials" to verify.',
                    });
                  }}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-700 dark:text-stone-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Load Sandbox Preset
                </button>

                <label className="flex items-center gap-1.5 ml-1 cursor-pointer">
                  <span className={`text-[11px] font-medium ${carrybeeCreds.isSandbox ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {carrybeeCreds.isSandbox ? 'Sandbox (Test)' : 'Production (Live)'}
                  </span>
                  <input
                    type="checkbox"
                    checked={carrybeeCreds.isSandbox}
                    onChange={(e) => {
                      const isSand = e.target.checked;
                      const updated = {
                        ...carrybeeCreds,
                        isSandbox: isSand,
                      };
                      setCarrybeeCreds(updated);
                      saveCarrybeeCredentials(updated);
                    }}
                    className="rounded border-stone-300 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Carrybee Status Notice */}
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <span>Carrybee Merchant Gateway Active</span>
                <span className="px-1.5 py-0.2 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-[10px] rounded">
                  v2.0 REST
                </span>
              </div>
              <p className="text-amber-800 dark:text-amber-300">
                Supports single and batch shipments, reverse pickup exchanges, nationwide zones, and automated doorstep tracking.
              </p>
            </div>

            {carrybeeTestResult && (
              <div
                className={`p-3 rounded border text-[11px] flex items-center gap-2 ${
                  carrybeeTestResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300'
                }`}
              >
                {carrybeeTestResult.success ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{carrybeeTestResult.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Carrybee Client ID *
                </label>
                <input
                  type="text"
                  value={carrybeeCreds.clientId}
                  onChange={(e) => setCarrybeeCreds({ ...carrybeeCreds, clientId: e.target.value })}
                  placeholder="e.g. ae2fce67-a7b6-4749-82ff-..."
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
                />
              </div>

              <div>
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Carrybee Client Secret *
                </label>
                <div className="relative">
                  <input
                    type={showCarrybeeSecret ? 'text' : 'password'}
                    value={carrybeeCreds.clientSecret}
                    onChange={(e) => setCarrybeeCreds({ ...carrybeeCreds, clientSecret: e.target.value })}
                    placeholder="Carrybee Client Secret"
                    className="w-full pl-3 pr-9 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCarrybeeSecret(!showCarrybeeSecret)}
                    className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-white cursor-pointer"
                  >
                    {showCarrybeeSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Carrybee Client Context *
                </label>
                <div className="relative">
                  <input
                    type={showCarrybeeContext ? 'text' : 'password'}
                    value={carrybeeCreds.clientContext}
                    onChange={(e) => setCarrybeeCreds({ ...carrybeeCreds, clientContext: e.target.value })}
                    placeholder="e.g. MJh6nyloHRUQemOjrJSYwEbdaLFTuX"
                    className="w-full pl-3 pr-9 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCarrybeeContext(!showCarrybeeContext)}
                    className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-white cursor-pointer"
                  >
                    {showCarrybeeContext ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Required by Carrybee API to identify the merchant business scope.
                </span>
              </div>
            </div>

            {/* Carrybee Store Selection if fetched */}
            {carrybeeStores.length > 0 && (
              <div>
                <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Active Carrybee Pickup Store
                </label>
                <select
                  value={carrybeeCreds.storeId || ''}
                  onChange={(e) => setCarrybeeCreds({ ...carrybeeCreds, storeId: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none"
                >
                  {carrybeeStores.map((s: CarrybeeStore) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.address}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestCarrybeeConnection}
                disabled={isTestingCarrybee}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                {isTestingCarrybee ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Test Carrybee Credentials
              </button>
            </div>
          </div>
        )}

        {/* Cloudinary Card */}
        <div className="p-6 bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100 dark:border-white/5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-900 dark:text-white">
                Cloudinary Media Storage
              </h3>
              <p className="text-[11px] text-stone-500">
                Connected cloud bucket for high-resolution product photography &amp; WebP transforms
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="block text-stone-500 uppercase text-[10px] tracking-wider mb-1">
                Cloud Name
              </span>
              <div className="font-mono text-stone-900 dark:text-white p-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 rounded">
                {CLOUDINARY_CONFIG.cloudName}
              </div>
            </div>
            <div>
              <span className="block text-stone-500 uppercase text-[10px] tracking-wider mb-1">
                Upload Preset
              </span>
              <div className="font-mono text-stone-900 dark:text-white p-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 rounded">
                {CLOUDINARY_CONFIG.uploadPreset}
              </div>
            </div>
            <div>
              <span className="block text-stone-500 uppercase text-[10px] tracking-wider mb-1">
                Upload Security Mode
              </span>
              <div className="text-emerald-700 dark:text-emerald-400 font-medium p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Unsigned (Client Safe)
              </div>
            </div>
          </div>
        </div>

        {/* Top Header Marquee Announcement Bar */}
        <div className="p-6 bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-stone-900 dark:text-white">
                  Header Top Announcement Bar (Right-to-Left Marquee)
                </h3>
                <p className="text-[11px] text-stone-500">
                  Displays a smooth scrolling banner at the very top of the storefront above the navigation.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[11px] text-stone-500">Enable Ticker</span>
              <input
                type="checkbox"
                checked={isAnnouncementActive}
                onChange={(e) => setIsAnnouncementActive(e.target.checked)}
                className="rounded border-stone-300"
              />
            </label>
          </div>

          <div>
            <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
              Marquee Announcement Text
            </label>
            <input
              type="text"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="EID ARCHIVE 2026 IS LIVE · CASH ON DELIVERY NATIONWIDE · COMPLIMENTARY SHIPPING OVER ৳5,000"
              className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono text-xs"
            />
            <span className="text-[10px] text-stone-400 mt-1 block">
              Tip: Separate announcements with middle dots ( · ) or bullets for an elegant architectural look.
            </span>
          </div>
        </div>

        {/* Social Media Links & Concierge */}
        <div className="p-6 bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100 dark:border-white/5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-900 dark:text-white">
                Social Media &amp; WhatsApp Concierge Channels
              </h3>
              <p className="text-[11px] text-stone-500">
                Connected brand profiles across Facebook, Instagram, TikTok, and WhatsApp floating concierge.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                WhatsApp Concierge Number (with Country Code)
              </label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="8801XXXXXXXXX"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Customers clicking the floating WhatsApp button will chat directly with this number.
              </span>
            </div>

            <div>
              <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                Facebook Page URL
              </label>
              <input
                type="url"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/sparta.clo"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
              />
            </div>

            <div>
              <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                Instagram Profile URL
              </label>
              <input
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/sparta.clo"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
              />
            </div>

            <div>
              <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                TikTok Profile URL
              </label>
              <input
                type="url"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="https://tiktok.com/@sparta_clo"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Delivery Rates */}
        <div className="p-6 bg-white dark:bg-[#121216] border border-stone-200 dark:border-white/10 rounded-sm space-y-4">
          <h3 className="text-sm font-medium text-stone-900 dark:text-white pb-2 border-b border-stone-100 dark:border-white/5">
            Storefront Delivery Fee Rules
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                Inside Dhaka (BDT)
              </label>
              <input
                type="number"
                value={insideDhakaFee}
                onChange={(e) => setInsideDhakaFee(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
              />
            </div>

            <div>
              <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                Outside Dhaka (BDT)
              </label>
              <input
                type="number"
                value={outsideDhakaFee}
                onChange={(e) => setOutsideDhakaFee(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
              />
            </div>

            <div>
              <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                Free Shipping Threshold (BDT)
              </label>
              <input
                type="number"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Marketing Tracking: Meta Pixel & Google Tag */}
        <div className="p-6 bg-white dark:bg-[#121216] border border-blue-200 dark:border-blue-900/50 rounded-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-stone-900 dark:text-white">
                  Marketing Tracking &amp; Meta Pixel (Facebook Ads)
                </h3>
                <p className="text-[11px] text-stone-500">
                  Connect Meta Pixel &amp; Google Analytics to track Page Views, Add to Cart, and Purchases for Facebook Ads campaigns
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <span className={`text-[11px] font-medium ${isMetaPixelActive ? 'text-blue-600' : 'text-stone-400'}`}>
                {isMetaPixelActive ? 'Meta Pixel Active' : 'Pixel Disabled'}
              </span>
              <input
                type="checkbox"
                checked={isMetaPixelActive}
                onChange={(e) => setIsMetaPixelActive(e.target.checked)}
                className="rounded border-stone-300"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                Meta Pixel ID (Facebook Pixel)
              </label>
              <input
                type="text"
                value={metaPixelId}
                onChange={(e) => setMetaPixelId(e.target.value)}
                placeholder="e.g. 1827461947264821"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Found in Meta Events Manager &rarr; Data Sources &rarr; Pixel ID. Automatically fires <strong>PageView</strong>, <strong>ViewContent</strong>, <strong>AddToCart</strong>, <strong>InitiateCheckout</strong>, and <strong>Purchase</strong>.
              </span>
            </div>

            <div>
              <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                Google Analytics Measurement ID (Optional)
              </label>
              <input
                type="text"
                value={googleAnalyticsId}
                onChange={(e) => setGoogleAnalyticsId(e.target.value)}
                placeholder="e.g. G-ABC123XYZ0"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none font-mono"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Google Analytics 4 (GA4) Web Stream Measurement ID.
              </span>
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/30 rounded text-[11px] text-stone-600 dark:text-stone-300 space-y-1">
            <span className="font-semibold text-blue-900 dark:text-blue-300">How client can connect Pixel:</span>
            <p>1. Copy Pixel ID from Facebook Ads Business Manager (15-16 digit number).</p>
            <p>2. Paste into the box above and toggle "Meta Pixel Active".</p>
            <p>3. Click <strong>"Save Configurations"</strong> below. The pixel will immediately activate across the entire site without writing any code!</p>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {isSaved && (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Settings Saved
            </span>
          )}
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#111111] hover:bg-black dark:bg-white dark:hover:bg-stone-200 text-white dark:text-black font-medium rounded-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save Configurations
          </button>
        </div>
      </form>
    </div>
  );
};
