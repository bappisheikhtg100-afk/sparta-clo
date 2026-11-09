/**
 * SPARTA Luxury Atelier — Production Shipping Label Generator
 * Generates an A4 PDF containing 6 precision-aligned labels (2 columns x 3 rows)
 * using jsPDF for direct thermal or laser printing.
 */

import { jsPDF } from 'jspdf';
import { OrderReceipt } from '../types/store';

export interface PrintableLabelData {
  orderId: string;
  consignmentId?: string;
  courierName?: string;
  createdAt: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientArea?: string;
  itemsSummary: string;
  itemCount: number;
  codAmount: number;
  specialInstructions?: string;
}

export function mapOrderToLabelData(order: OrderReceipt, consignmentId?: string): PrintableLabelData {
  const itemsText = order.items
    .map((item) => `${item.quantity}x ${item.name} (${item.size}${item.color ? ` / ${item.color}` : ''})`)
    .join(', ');

  const totalQty = order.items.reduce((acc, it) => acc + it.quantity, 0);

  return {
    orderId: order.orderId,
    consignmentId: consignmentId || order.orderId,
    courierName: 'PATHAO COURIER',
    createdAt: new Date(order.createdAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    recipientName: order.customer.fullName,
    recipientPhone: order.customer.phone,
    recipientAddress: `${order.customer.address}, ${order.customer.thana}, ${order.customer.district}, ${order.customer.division}`,
    recipientArea: `${order.customer.thana}, ${order.customer.district}`,
    itemsSummary: itemsText,
    itemCount: totalQty,
    codAmount: order.total,
    specialInstructions: order.customer.notes || 'Please call before delivery. Handle with care.',
  };
}

export function generateA4ShippingLabelsPDF(labels: PrintableLabelData[]): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // 210 x 297 mm
  });

  // A4 geometry: 2 columns x 3 rows
  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 8;
  const marginTop = 8;
  const colWidth = 94; // 8 + 94 + 6 + 94 + 8 = 210 mm
  const rowHeight = 90; // 8 + 90 + 5 + 90 + 5 + 90 + 9 = 297 mm
  const gapX = 6;
  const gapY = 5;

  const labelsPerPage = 6;

  labels.forEach((label, index) => {
    const pageIndex = Math.floor(index / labelsPerPage);
    const slotOnPage = index % labelsPerPage;

    if (slotOnPage === 0 && index > 0) {
      doc.addPage();
    }

    const col = slotOnPage % 2;
    const row = Math.floor(slotOnPage / 2);

    const x = marginLeft + col * (colWidth + gapX);
    const y = marginTop + row * (rowHeight + gapY);

    drawSingleLabel(doc, label, x, y, colWidth, rowHeight);
  });

  return doc;
}

function drawSingleLabel(
  doc: jsPDF,
  label: PrintableLabelData,
  x: number,
  y: number,
  w: number,
  h: number
) {
  // Outer Border with rounded corners
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');

  // Header Bar (Brand & Courier)
  doc.setFillColor(10, 10, 12);
  doc.rect(x, y, w, 12, 'F');

  // Header Brand Name (Large bold SPARTA)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text('SPARTA', x + 5, y + 8.5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text('LUXURY ATELIER', x + 34, y + 8.5);

  // Courier Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(label.courierName || 'PATHAO COURIER', x + w - 5, y + 8.5, { align: 'right' });

  // Subheader: Order & Tracking IDs
  const subY = y + 16.5;
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('ORDER REF:', x + 5, subY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(label.orderId, x + 24, subY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('DATE:', x + w - 34, subY);
  doc.setFont('helvetica', 'bold');
  doc.text(label.createdAt, x + w - 5, subY, { align: 'right' });

  // Divider
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.line(x + 5, subY + 2.5, x + w - 5, subY + 2.5);

  // BIG PROMINENT PATHAO CONSIGNMENT ID BOX
  const codeBoxY = subY + 4.5;
  doc.setFillColor(242, 244, 248);
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.35);
  doc.roundedRect(x + 4, codeBoxY, w - 8, 12, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 110);
  doc.text('PATHAO CONSIGNMENT / TRACKING ID', x + w / 2, codeBoxY + 3.8, {
    align: 'center',
  });

  doc.setFont('courier', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(10, 10, 10);
  doc.text(label.consignmentId || label.orderId, x + w / 2, codeBoxY + 9.5, {
    align: 'center',
  });

  // Customer Recipient Information
  let curY = codeBoxY + 15.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(110, 110, 115);
  doc.text('SHIP TO:', x + 4, curY);

  curY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 15, 15);
  doc.text(label.recipientName, x + 4, curY);

  curY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`TEL: ${label.recipientPhone}`, x + 4, curY);

  curY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  const addressLines = doc.splitTextToSize(label.recipientAddress, w - 8);
  doc.text(addressLines.slice(0, 2), x + 4, curY);

  // Order Items Summary
  curY += Math.min(addressLines.length, 2) * 3.5 + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(110, 110, 115);
  doc.text(`PACKAGE CONTENTS (${label.itemCount} items):`, x + 4, curY);

  curY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(30, 30, 30);
  const itemLines = doc.splitTextToSize(label.itemsSummary, w - 8);
  doc.text(itemLines.slice(0, 2), x + 4, curY);

  // COD Cash To Collect Highlight Box
  const codBoxY = y + h - 18;
  doc.setFillColor(255, 245, 230); // subtle amber tint
  doc.setDrawColor(200, 140, 40);
  doc.setLineWidth(0.4);
  doc.roundedRect(x + 4, codBoxY, w - 8, 10, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(160, 80, 0);
  doc.text('CASH ON DELIVERY (COD):', x + 7, codBoxY + 6.5);

  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(`BDT ${label.codAmount.toLocaleString('en-US')}`, x + w - 7, codBoxY + 7, {
    align: 'right',
  });

  // Footer: Return Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(120, 120, 120);
  doc.text('RETURN: SPARTA ATELIER, Banani, Dhaka · +880 1860-934336', x + w / 2, y + h - 2, {
    align: 'center',
  });
}
