import React, { useState } from 'react';
import { Printer, Download, X, CheckCircle, FileText } from 'lucide-react';
import { AdminOrder } from '../services/orderService';
import { generateA4ShippingLabelsPDF, mapOrderToLabelData } from '../services/labelGenerator';
import { formatBDT } from '../data/storeData';

interface ShippingLabelModalProps {
  orders: AdminOrder[];
  isOpen: boolean;
  onClose: () => void;
}

export const ShippingLabelModal: React.FC<ShippingLabelModalProps> = ({
  orders,
  isOpen,
  onClose,
}) => {
  const [isGenerated, setIsGenerated] = useState(false);
  const [courierStyle, setCourierStyle] = useState<'auto' | 'carrybee' | 'pathao'>('auto');

  if (!isOpen) return null;

  const buildLabelData = () => {
    return orders.map((o) => {
      let courier = o.courierName;
      if (courierStyle === 'carrybee') courier = 'Carrybee Courier';
      if (courierStyle === 'pathao') courier = 'Pathao Courier';

      const mockReceipt: any = {
        orderId: o.orderNumber,
        createdAt: o.createdAt,
        courierName: courier,
        customer: {
          fullName: o.customerName,
          phone: o.customerPhone,
          address: o.shippingAddress,
          division: '',
          district: '',
          thana: '',
          deliveryZone: o.deliveryZone,
          notes: o.internalNotes || '',
        },
        items: o.items,
        total: o.total,
      };
      return mapOrderToLabelData(mockReceipt, o.consignmentId, courier);
    });
  };

  const handleDownloadA4PDF = () => {
    const printableData = buildLabelData();
    const pdf = generateA4ShippingLabelsPDF(printableData);
    const dateStr = new Date().toISOString().slice(0, 10);
    const tag = courierStyle === 'carrybee' ? 'Carrybee' : courierStyle === 'pathao' ? 'Pathao' : 'Courier';
    pdf.save(`SPARTA-${tag}-Labels-${dateStr}.pdf`);
    setIsGenerated(true);
    setTimeout(() => setIsGenerated(false), 3000);
  };

  const handleDirectPrint = () => {
    const printableData = buildLabelData();
    const pdf = generateA4ShippingLabelsPDF(printableData);
    const blobUrl = pdf.output('bloburl');
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
    setIsGenerated(true);
    setTimeout(() => setIsGenerated(false), 3000);
  };

  const pagesCount = Math.ceil(orders.length / 6) || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-[#141419] border border-stone-200 dark:border-white/10 rounded-sm shadow-2xl p-6 text-xs">
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-stone-900 dark:text-white" />
            <h3 className="text-sm font-medium text-stone-900 dark:text-white">
              A4 Bulk Shipping Label Generator
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Courier Format Selector */}
        <div className="mt-4 p-3 bg-stone-50 dark:bg-white/[0.03] border border-stone-200 dark:border-white/10 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-stone-800 dark:text-stone-200 block">
              Sticker Format Style
            </span>
            <span className="text-[10px] text-stone-400">
              Select which courier branding &amp; AWB format to print
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCourierStyle('auto')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                courierStyle === 'auto'
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-black shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-white/10'
              }`}
            >
              Auto (Per Order)
            </button>
            <button
              type="button"
              onClick={() => setCourierStyle('carrybee')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                courierStyle === 'carrybee'
                  ? 'bg-amber-600 text-white shadow-xs font-semibold'
                  : 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 hover:bg-amber-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Carrybee Sticker
            </button>
            <button
              type="button"
              onClick={() => setCourierStyle('pathao')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                courierStyle === 'pathao'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 hover:bg-blue-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Pathao Sticker
            </button>
          </div>
        </div>

        <div className="py-4 space-y-4">
          <div className="p-4 bg-stone-50 dark:bg-white/[0.02] border border-stone-200 dark:border-white/10 rounded">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-stone-500">
                  Total Orders Selected
                </span>
                <div className="text-2xl font-mono font-semibold text-stone-900 dark:text-white mt-1">
                  {orders.length}
                </div>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-stone-500">
                  A4 Sheets Required
                </span>
                <div className="text-2xl font-mono font-semibold text-stone-900 dark:text-white mt-1">
                  {pagesCount} <span className="text-xs text-stone-400 font-sans">({pagesCount * 6} slots)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-stone-600 dark:text-stone-400">
            <p className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Standard 2 columns &times; 3 rows format (6 labels per A4 page).
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Includes SPARTA brand logo header, recipient address, and COD collect amount.
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Compatible with standard desktop laser printers and sticker sheets.
            </p>
          </div>

          {/* Quick list of orders to print */}
          <div className="max-h-40 overflow-y-auto border border-stone-200 dark:border-white/10 rounded divide-y divide-stone-100 dark:divide-white/5 p-2">
            {orders.map((o) => (
              <div key={o.id} className="py-1.5 px-2 flex justify-between items-center text-[11px]">
                <span className="font-mono font-medium text-stone-900 dark:text-white">
                  {o.orderNumber}
                </span>
                <span className="text-stone-500 truncate max-w-[140px]">{o.customerName}</span>
                <span className="font-mono text-stone-700 dark:text-stone-300">
                  {formatBDT(o.total)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-stone-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            {isGenerated && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Labels generated successfully!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 dark:border-white/15 text-stone-700 dark:text-stone-300 text-xs font-medium rounded-sm cursor-pointer hover:bg-stone-50 dark:hover:bg-white/5 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDirectPrint}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-900 dark:text-white text-xs font-medium rounded-sm inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Direct Print
            </button>
            <button
              type="button"
              onClick={handleDownloadA4PDF}
              className="px-5 py-2 bg-[#111111] hover:bg-black dark:bg-white dark:hover:bg-stone-200 text-white dark:text-black text-xs font-medium rounded-sm inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download A4 PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
