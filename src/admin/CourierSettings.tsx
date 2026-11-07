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
} from 'lucide-react';
import {
  getStoredPathaoCredentials,
  savePathaoCredentials,
  getPathaoAccessToken,
  fetchPathaoStores,
  PathaoCredentials,
  PathaoStore,
} from '../services/pathaoService';
import { CLOUDINARY_CONFIG } from '../services/cloudinaryService';

export const CourierSettings: React.FC = () => {
  const [creds, setCreds] = useState<PathaoCredentials>(getStoredPathaoCredentials());
  const [showSecret, setShowSecret] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Testing & Store states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [stores, setStores] = useState<PathaoStore[]>([]);
  const [isFetchingStores, setIsFetchingStores] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Delivery fee rules
  const [insideDhakaFee, setInsideDhakaFee] = useState('70');
  const [outsideDhakaFee, setOutsideDhakaFee] = useState('130');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('5000');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    savePathaoCredentials(creds);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const token = await getPathaoAccessToken(creds, true);
      setTestResult({
        success: true,
        message: `Successfully authenticated with Pathao! Token issued (valid for session).`,
      });

      // Try fetching stores
      try {
        setIsFetchingStores(true);
        const storeList = await fetchPathaoStores(creds);
        setStores(storeList);
        if (storeList.length > 0 && !creds.storeId) {
          setCreds((prev) => ({ ...prev, storeId: storeList[0].store_id }));
        }
      } catch {
        // ignore stores error
      } finally {
        setIsFetchingStores(false);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Authentication failed. Please verify credentials with Pathao.',
      });
    } finally {
      setIsTesting(false);
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
        {/* Pathao Courier Settings Card */}
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

            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[11px] text-stone-500">Sandbox Mode</span>
              <input
                type="checkbox"
                checked={creds.isSandbox}
                onChange={(e) => setCreds({ ...creds, isSandbox: e.target.checked })}
                className="rounded border-stone-300"
              />
            </label>
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
                Account Username / Email
              </label>
              <input
                type="text"
                value={creds.username}
                onChange={(e) => setCreds({ ...creds, username: e.target.value })}
                placeholder="merchant@pathao.com"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white rounded-none outline-none"
              />
            </div>

            <div>
              <label className="block uppercase tracking-wider text-stone-500 font-medium mb-1">
                Account Password
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
                {stores.map((s) => (
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
                API Key
              </span>
              <div className="font-mono text-stone-900 dark:text-white p-2 bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 rounded">
                {CLOUDINARY_CONFIG.apiKey}
              </div>
            </div>
            <div>
              <span className="block text-stone-500 uppercase text-[10px] tracking-wider mb-1">
                Upload Mode
              </span>
              <div className="text-emerald-700 dark:text-emerald-400 font-medium p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Signed WebCrypto SHA-1
              </div>
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
