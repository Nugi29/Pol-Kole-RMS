import { Injectable } from '@angular/core';
import { Invoice } from './billing.service';
import { Order } from './order.service';
import { HotelReservation } from './hotel-reservation.service';
import { Reservation } from './reservation.service';

export interface PrintInvoiceOptions {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerPassport?: string;
  roomNumber?: string;
  roomType?: string;
  tableNumber?: string;
  tableLocation?: string;
  checkInDate?: string;
  checkOutDate?: string;
  nightsCount?: number;
  guestsCount?: number;
  cashierName?: string;
  paymentMethod?: string;
  transactionReference?: string;
  notes?: string;
}

export interface PrintTokenOptions {
  cashierName?: string;
  estimatedTime?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BillPrintService {

  private getLoggedInStaff(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('name') || 'Cashier Desk';
    }
    return 'Cashier Desk';
  }

  // --- Number to Words Converter ---
  private numberToWords(amount: number): string {
    if (amount === 0) return 'Zero Rupees Only';
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const num2words = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return units[n] + ' ';
      if (n < 100) return tens[Math.floor(n / 10)] + ' ' + num2words(n % 10);
      if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred ' + num2words(n % 100);
      if (n < 100000) return num2words(Math.floor(n / 1000)) + 'Thousand ' + num2words(n % 1000);
      if (n < 10000000) return num2words(Math.floor(n / 100000)) + 'Lakh ' + num2words(n % 100000);
      return num2words(Math.floor(n / 10000000)) + 'Crore ' + num2words(n % 10000000);
    };

    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);
    let words = num2words(integerPart).trim() + ' Sri Lankan Rupees';
    if (decimalPart > 0) {
      words += ' and ' + num2words(decimalPart).trim() + ' Cents';
    }
    return words + ' Only';
  }

  // Generate a fake SVG barcode for thermal tickets
  private generateSvgBarcode(code: string): string {
    const bars: string[] = [];
    const hash = (code + 'POLKOLE').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let x = 10;
    for (let i = 0; i < 36; i++) {
      const width = ((hash * (i + 13)) % 3) + 1.2;
      bars.push(`<rect x="${x}" y="0" width="${width}" height="32" fill="#0f172a" />`);
      x += width + ((i % 2 === 0) ? 2 : 1.5);
    }
    return `<svg width="${x + 10}" height="32" viewBox="0 0 ${x + 10} 32" xmlns="http://www.w3.org/2000/svg" style="display:inline-block; max-width:100%;">${bars.join('')}</svg>`;
  }

  // =========================================================================
  // 1. TOKEN TEMPLATE (POS / KITCHEN / PICKUP TICKET)
  // =========================================================================
  printToken(order: Order, options?: PrintTokenOptions): void {
    const printWindow = window.open('', '_blank', 'width=420,height=720');
    if (!printWindow) {
      alert('Popup Blocked: Please allow popups in your browser to print tokens.');
      return;
    }

    const cashier = options?.cashierName || this.getLoggedInStaff();
    const isTakeaway = !order.tableNumber && !order.roomNumber && !order.tableId && !order.roomId;
    const isTable = !!order.tableNumber || !!order.tableId;
    const isRoom = !isTable && (!!order.roomNumber || !!order.roomId);

    const itemsSubtotal = (order.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceCharge = (isTable || isRoom) ? (itemsSubtotal * 0.10) : 0;
    const netTotal = order.totalAmount || (itemsSubtotal + serviceCharge);

    let orderTypeBadge = '';
    let locationLabel = '';
    if (isTable) {
      orderTypeBadge = `<span class="badge badge-table">🍽️ TABLE DINE-IN</span>`;
      locationLabel = `Table #${order.tableNumber || order.tableId}`;
    } else if (isRoom) {
      orderTypeBadge = `<span class="badge badge-room">🛏️ ROOM SERVICE</span>`;
      locationLabel = `Room #${order.roomNumber || order.roomId}`;
    } else {
      orderTypeBadge = `<span class="badge badge-takeaway">🛍️ TAKEAWAY / PICKUP</span>`;
      locationLabel = `Counter Pickup`;
    }

    const orderTime = order.orderTime ? new Date(order.orderTime).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
    }) : new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
    });

    const itemsHtml = (order.items || []).map((item, idx) => `
      <tr class="item-row">
        <td class="col-num">${idx + 1}</td>
        <td class="col-desc">
          <div class="item-name">${item.menuItemName || 'Menu Item'}</div>
          ${item.notes ? `<div class="item-notes"><span class="note-tag">⚡ NOTE:</span> ${item.notes}</div>` : ''}
        </td>
        <td class="col-qty">x${item.quantity}</td>
        <td class="col-price">Rs. ${(item.price).toFixed(2)}</td>
        <td class="col-total">Rs. ${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const barcodeHtml = this.generateSvgBarcode(`ORD-${order.id || Date.now()}`);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Token #${order.id} - Pol-Kole Resort</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            width: 330px;
            margin: 0 auto;
            padding: 18px 14px;
            font-size: 12px;
            color: #0f172a;
            background: #ffffff;
            line-height: 1.35;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #64748b;
            padding-bottom: 12px;
            margin-bottom: 12px;
          }
          .resort-name {
            font-size: 19px;
            font-weight: 900;
            letter-spacing: 0.8px;
            color: #042f2e;
            text-transform: uppercase;
          }
          .resort-subtitle {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1px;
            color: #0f766e;
            text-transform: uppercase;
            margin-top: 1px;
          }
          .resort-contact {
            font-size: 10px;
            color: #64748b;
            margin-top: 3px;
          }
          .token-banner {
            margin: 10px 0 6px 0;
            padding: 8px;
            background: #f8fafc;
            border: 2px solid #0f172a;
            border-radius: 10px;
            text-align: center;
          }
          .token-label {
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1.5px;
            color: #475569;
            text-transform: uppercase;
          }
          .token-number {
            font-size: 32px;
            font-weight: 900;
            line-height: 1;
            margin: 4px 0 2px 0;
            font-family: 'Courier New', Courier, monospace;
            color: #0f172a;
          }
          .badge-wrap {
            margin-top: 4px;
          }
          .badge {
            display: inline-block;
            font-size: 10px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .badge-table { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
          .badge-room { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
          .badge-takeaway { background: #ccfbf1; color: #115e59; border: 1px solid #99f6e4; }
          
          .meta-grid {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 10px;
            margin-bottom: 12px;
            font-size: 11px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .meta-row:last-child {
            margin-bottom: 0;
          }
          .meta-label { color: #64748b; font-weight: 600; }
          .meta-value { color: #0f172a; font-weight: 700; text-align: right; }

          table.items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            font-size: 11.5px;
          }
          table.items-table thead th {
            border-bottom: 2px solid #0f172a;
            padding: 6px 2px 4px 2px;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0f172a;
            letter-spacing: 0.5px;
          }
          .col-num { width: 14px; text-align: left; color: #94a3b8; font-size: 10px; vertical-align: top; padding: 5px 2px; }
          .col-desc { text-align: left; vertical-align: top; padding: 5px 4px; }
          .col-qty { width: 32px; text-align: center; font-weight: 800; vertical-align: top; padding: 5px 2px; color: #0f172a; }
          .col-price { width: 55px; text-align: right; color: #64748b; vertical-align: top; padding: 5px 2px; font-size: 10.5px; }
          .col-total { width: 62px; text-align: right; font-weight: 800; vertical-align: top; padding: 5px 2px; color: #0f172a; }
          
          .item-row {
            border-bottom: 1px dashed #e2e8f0;
          }
          .item-name {
            font-weight: 700;
            color: #0f172a;
            font-size: 11.5px;
          }
          .item-notes {
            margin-top: 2px;
            font-size: 10px;
            color: #b45309;
            background: #fffbeb;
            border-left: 2px solid #f59e0b;
            padding: 2px 4px;
            border-radius: 2px;
            font-style: italic;
          }
          .note-tag {
            font-weight: 800;
            font-size: 9px;
          }

          .summary-card {
            border-top: 2px dashed #64748b;
            border-bottom: 2px dashed #64748b;
            padding: 8px 0;
            margin-top: 10px;
            font-size: 11.5px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
          }
          .grand-total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 15px;
            font-weight: 900;
            color: #0f172a;
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1.5px solid #0f172a;
          }

          .footer {
            text-align: center;
            margin-top: 14px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #64748b;
            line-height: 1.4;
          }
          .instruction-box {
            background: #f1f5f9;
            border-radius: 6px;
            padding: 6px 8px;
            margin: 8px 0;
            font-size: 10.5px;
            font-weight: 700;
            color: #1e293b;
          }
          .barcode-box {
            margin: 8px 0 4px 0;
            text-align: center;
          }
          .copy-tag {
            font-size: 9px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          @media print {
            body { width: 100%; padding: 0 4px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="resort-name">POL-KOLE RESORT</div>
          <div class="resort-subtitle">Hospitality &amp; Dining Hub</div>
          <div class="resort-contact">Galle Road, Ahangama • +94 91 228 3456</div>

          <div class="token-banner">
            <div class="token-label">ORDER / KITCHEN TOKEN</div>
            <div class="token-number">#${order.id || '---'}</div>
            <div class="badge-wrap">${orderTypeBadge}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-row">
            <span class="meta-label">Location / Target:</span>
            <span class="meta-value">${locationLabel}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Customer / Guest:</span>
            <span class="meta-value">${order.customerName || 'Walk-in Guest'}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Billed By (Cashier):</span>
            <span class="meta-value">${cashier}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Date &amp; Time:</span>
            <span class="meta-value">${orderTime}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Order Status:</span>
            <span class="meta-value">${order.statusName || 'CONFIRMED'}</span>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th class="col-num">#</th>
              <th class="col-desc">Item &amp; Notes</th>
              <th class="col-qty">Qty</th>
              <th class="col-price">Price</th>
              <th class="col-total">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || '<tr><td colspan="5" style="text-align:center; padding: 10px; color:#94a3b8;">No items in order</td></tr>'}
          </tbody>
        </table>

        <div class="summary-card">
          <div class="summary-row">
            <span style="color: #64748b;">Items Subtotal:</span>
            <span style="font-weight: 700;">Rs. ${itemsSubtotal.toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span style="color: #64748b;">${isTakeaway ? 'Service Charge:' : 'Service Charge (10%):'}</span>
            <span style="font-weight: 700; color: ${serviceCharge > 0 ? '#0d9488' : '#64748b'};">
              ${serviceCharge > 0 ? '+Rs. ' + serviceCharge.toFixed(2) : 'Rs. 0.00 (Takeaway)'}
            </span>
          </div>
          <div class="grand-total-row">
            <span>NET AMOUNT:</span>
            <span>Rs. ${netTotal.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <div class="instruction-box">
            ${isTakeaway 
              ? '📢 Please hold this token and collect your food when your number is called.' 
              : '🍽️ Please retain this token until all items are served to your satisfaction.'}
          </div>
          <div class="barcode-box">
            ${barcodeHtml}
            <div style="font-family: monospace; font-size: 9.5px; color: #64748b; margin-top: 2px;">ORD-${order.id || '000'} • POS VERIFIED</div>
          </div>
          <div>Thank you for choosing Pol-Kole Resort!</div>
          <div class="copy-tag" style="margin-top: 4px;">Kitchen &amp; Guest POS Copy • ${new Date().toLocaleTimeString()}</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }


  // =========================================================================
  // 2. OFFICIAL INVOICE & GUEST FOLIO (TAX INVOICE / A4 / STANDARD PRINT)
  // =========================================================================
  printInvoice(invoice: Invoice, options?: PrintInvoiceOptions): void {
    const printWindow = window.open('', '_blank', 'width=880,height=960');
    if (!printWindow) {
      alert('Popup Blocked: Please allow popups in your browser to print invoices.');
      return;
    }

    const cashier = options?.cashierName || this.getLoggedInStaff();
    const isRoom = !!invoice.reservationId || !!options?.roomNumber;
    const isTable = !isRoom && (!!invoice.tableReservationId || !!options?.tableNumber);
    const isTakeaway = !isRoom && !isTable;

    const subtotal = invoice.orderSubtotal || invoice.roomCharges || 0;
    const discount = invoice.discountAmount || 0;
    const serviceCharge = invoice.taxAmount || 0;
    const grandTotal = invoice.totalAmount || (subtotal - discount + serviceCharge);
    const wordsTotal = this.numberToWords(grandTotal);

    const paymentStatus = (invoice.paymentStatus || 'PAID').toUpperCase();
    const isPaid = paymentStatus === 'PAID' || paymentStatus === 'SETTLED';

    const categoryTitle = isRoom 
      ? 'Room Accommodation & Stay Folio' 
      : (isTable ? 'Table Dining & Restaurant Bill' : 'Direct POS & Takeaway Invoice');

    const paymentMethod = invoice.paymentMethodName || options?.paymentMethod || (isPaid ? 'CASH' : 'PENDING');
    const transactionRef = invoice.transactionReference || options?.transactionReference || 'N/A';

    const guestName = options?.customerName || 'Walk-in Valued Guest';
    const guestPhone = options?.customerPhone || 'N/A';
    const guestEmail = options?.customerEmail || 'N/A';
    const guestPassport = options?.customerPassport || 'N/A';

    // Room Stay Specific info
    const roomInfo = options?.roomNumber ? `Room ${options.roomNumber} ${options.roomType ? '(' + options.roomType + ')' : ''}` : 'Standard Room';
    const checkIn = options?.checkInDate || 'N/A';
    const checkOut = options?.checkOutDate || 'N/A';
    const nights = options?.nightsCount || (options?.checkInDate && options?.checkOutDate ? 
      Math.max(1, Math.ceil((new Date(options.checkOutDate).getTime() - new Date(options.checkInDate).getTime()) / (1000 * 3600 * 24))) : 1);

    const itemsHtml = (invoice.items || []).map((item, idx) => `
      <tr class="inv-row">
        <td class="inv-col-num">${idx + 1}</td>
        <td class="inv-col-desc">
          <div class="inv-item-name">${item.description}</div>
          <div class="inv-item-sub">${isRoom ? 'Hospitality & Dining Charge' : 'F&B Service'}</div>
        </td>
        <td class="inv-col-rate">Rs. ${(item.unitPrice || (item.totalPrice / (item.quantity || 1))).toFixed(2)}</td>
        <td class="inv-col-qty">${item.quantity || 1}</td>
        <td class="inv-col-total">Rs. ${(item.totalPrice).toFixed(2)}</td>
      </tr>
    `).join('');

    const invoiceDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: '2-digit'
    });
    const invoiceTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoiceNumber} - Pol-Kole Resort &amp; Restaurant</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 24px;
            font-size: 13px;
            color: #1e293b;
            background: #ffffff;
            line-height: 1.45;
          }
          .invoice-card {
            max-width: 820px;
            margin: 0 auto;
            position: relative;
          }
          
          /* Resort Header Branding */
          .header-table {
            width: 100%;
            border-bottom: 3px solid #0f766e;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .brand-logo {
            font-size: 26px;
            font-weight: 900;
            letter-spacing: 1px;
            color: #042f2e;
            text-transform: uppercase;
            line-height: 1.1;
          }
          .brand-tagline {
            font-size: 11.5px;
            font-weight: 700;
            color: #0f766e;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-top: 2px;
          }
          .resort-meta {
            font-size: 11.5px;
            color: #64748b;
            margin-top: 6px;
            line-height: 1.4;
          }
          .doc-title-block {
            text-align: right;
            vertical-align: top;
          }
          .doc-title {
            font-size: 24px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .invoice-no-highlight {
            font-size: 16px;
            font-weight: 900;
            font-family: 'Courier New', Courier, monospace;
            color: #0f766e;
            margin-top: 2px;
          }
          .doc-subtitle {
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
          }

          /* Info Meta Grid */
          .meta-container {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 20px;
            margin-bottom: 22px;
          }
          .info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px 16px;
          }
          .info-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #0f766e;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 12px;
          }
          .info-row:last-child {
            margin-bottom: 0;
          }
          .info-label { color: #64748b; font-weight: 600; }
          .info-val { color: #0f172a; font-weight: 700; text-align: right; }

          /* Paid / Status Seal */
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .status-paid {
            background: #dcfce7;
            color: #166534;
            border: 1.5px solid #86efac;
          }
          .status-unpaid {
            background: #fee2e2;
            color: #991b1b;
            border: 1.5px solid #fca5a5;
          }

          /* Table Styling */
          table.inv-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 20px;
          }
          table.inv-table thead th {
            background: #0f2d2b;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            padding: 10px 8px;
            text-align: left;
          }
          table.inv-table thead th:last-child {
            text-align: right;
          }
          .inv-row {
            border-bottom: 1px solid #e2e8f0;
          }
          .inv-row:nth-child(even) {
            background: #f8fafc;
          }
          .inv-col-num { width: 30px; text-align: center; color: #94a3b8; font-weight: 600; padding: 10px 6px; }
          .inv-col-desc { padding: 10px 8px; }
          .inv-item-name { font-weight: 700; color: #0f172a; font-size: 13px; }
          .inv-item-sub { font-size: 10.5px; color: #64748b; margin-top: 1px; }
          .inv-col-rate { width: 110px; text-align: right; color: #475569; padding: 10px 8px; }
          .inv-col-qty { width: 70px; text-align: center; font-weight: 700; color: #0f172a; padding: 10px 6px; }
          .inv-col-total { width: 120px; text-align: right; font-weight: 800; color: #0f172a; padding: 10px 8px; font-size: 13px; }

          /* Summary Calculation & Signatures */
          .bottom-grid {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 20px;
            margin-top: 10px;
          }
          .words-block {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px 14px;
            margin-bottom: 14px;
          }
          .words-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.8px; }
          .words-text { font-size: 12px; font-weight: 800; color: #0f766e; font-style: italic; margin-top: 2px; }

          .calc-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12.5px;
          }
          .calc-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px dashed #e2e8f0;
          }
          .calc-label { color: #475569; font-weight: 600; }
          .calc-val { font-weight: 700; color: #0f172a; text-align: right; }
          
          .grand-total-box {
            background: #042f2e;
            color: #ffffff;
            border-radius: 8px;
            padding: 10px 14px;
            margin-top: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .grand-total-label { font-size: 13px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
          .grand-total-val { font-size: 20px; font-weight: 900; font-family: 'Segoe UI', sans-serif; }

          /* Signatures */
          .signatures-table {
            width: 100%;
            margin-top: 35px;
            padding-top: 10px;
          }
          .sig-box {
            text-align: center;
            width: 45%;
          }
          .sig-line {
            border-bottom: 1.5px solid #94a3b8;
            margin-bottom: 6px;
            height: 40px;
          }
          .sig-title {
            font-size: 11px;
            font-weight: 800;
            color: #334155;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .sig-sub {
            font-size: 9.5px;
            color: #94a3b8;
          }

          /* Footer Policies */
          .inv-footer {
            margin-top: 30px;
            border-top: 1.5px solid #e2e8f0;
            padding-top: 12px;
            text-align: center;
            font-size: 10.5px;
            color: #64748b;
            line-height: 1.5;
          }
          .legal-tag {
            font-size: 9.5px;
            color: #94a3b8;
            margin-top: 4px;
          }

          /* Watermark */
          .watermark-paid {
            position: absolute;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-25deg);
            font-size: 80px;
            font-weight: 900;
            color: rgba(22, 101, 52, 0.07);
            border: 8px solid rgba(22, 101, 52, 0.07);
            padding: 10px 40px;
            border-radius: 16px;
            pointer-events: none;
            letter-spacing: 6px;
            text-transform: uppercase;
          }

          @media print {
            body { padding: 0; }
            .invoice-card { max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-card">
          ${isPaid ? '<div class="watermark-paid">SETTLED</div>' : ''}

          <!-- Header -->
          <table class="header-table">
            <tr>
              <td>
                <div class="brand-logo">POL-KOLE RESORT &amp; RESTAURANT</div>
                <div class="brand-tagline">Luxury Accommodations • Fine Dining • Wellness &amp; Events</div>
                <div class="resort-meta">
                  Galle Road, Ahangama, Southern Province, Sri Lanka<br>
                  Hotline: +94 91 228 3456 | Mobile: +94 77 123 4567<br>
                  Email: info@polkole.lk | Web: www.polkole.lk • BRN: PV-98234-LK
                </div>
              </td>
              <td class="doc-title-block">
                <div class="doc-title">TAX INVOICE</div>
                <div class="doc-subtitle">Official Guest Folio / Receipt</div>
                <div class="invoice-no-highlight">${invoice.invoiceNumber}</div>
                <div style="margin-top: 8px;">
                  <span class="status-badge ${isPaid ? 'status-paid' : 'status-unpaid'}">
                    ${isPaid ? '✓ PAID &amp; SETTLED' : '⏳ PAYMENT PENDING'}
                  </span>
                </div>
              </td>
            </tr>
          </table>

          <!-- Meta Grid -->
          <div class="meta-container">
            <!-- Guest & Booking Info -->
            <div class="info-box">
              <div class="info-title">Guest / Customer Information</div>
              <div class="info-row">
                <span class="info-label">Customer Name:</span>
                <span class="info-val">${guestName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Contact Phone:</span>
                <span class="info-val">${guestPhone}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Passport / NIC:</span>
                <span class="info-val">${guestPassport}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Bill Category:</span>
                <span class="info-val" style="color: #0f766e;">${categoryTitle}</span>
              </div>
              ${isRoom ? `
                <div class="info-row">
                  <span class="info-label">Room Allocation:</span>
                  <span class="info-val">${roomInfo}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Stay Period:</span>
                  <span class="info-val">${checkIn} to ${checkOut} (${nights} Night${nights > 1 ? 's' : ''})</span>
                </div>
              ` : ''}
              ${isTable ? `
                <div class="info-row">
                  <span class="info-label">Dining Table:</span>
                  <span class="info-val">Table #${options?.tableNumber || invoice.tableReservationId || '---'}</span>
                </div>
              ` : ''}
            </div>

            <!-- Billing & Settlement Info -->
            <div class="info-box">
              <div class="info-title">Invoice &amp; Payment Details</div>
              <div class="info-row">
                <span class="info-label">Invoice Issue Date:</span>
                <span class="info-val">${invoiceDate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Issue Time:</span>
                <span class="info-val">${invoiceTime}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Payment Mode:</span>
                <span class="info-val">${paymentMethod}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Transaction / Ref ID:</span>
                <span class="info-val" style="font-family: monospace;">${transactionRef}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Authorized Cashier:</span>
                <span class="info-val">${cashier}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Currency:</span>
                <span class="info-val">LKR (Sri Lankan Rupee)</span>
              </div>
            </div>
          </div>

          <!-- Line Items Table -->
          <table class="inv-table">
            <thead>
              <tr>
                <th class="inv-col-num">#</th>
                <th class="inv-col-desc">Service / Line Item Description</th>
                <th class="inv-col-rate">Unit Rate</th>
                <th class="inv-col-qty">Qty / Nights</th>
                <th class="inv-col-total">Amount (LKR)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml || `
                <tr class="inv-row">
                  <td class="inv-col-num">1</td>
                  <td class="inv-col-desc">
                    <div class="inv-item-name">${categoryTitle}</div>
                    <div class="inv-item-sub">Total service charges rendered</div>
                  </td>
                  <td class="inv-col-rate">Rs. ${subtotal.toFixed(2)}</td>
                  <td class="inv-col-qty">1</td>
                  <td class="inv-col-total">Rs. ${subtotal.toFixed(2)}</td>
                </tr>
              `}
            </tbody>
          </table>

          <!-- Bottom Grid: Words & Calculation -->
          <div class="bottom-grid">
            <div>
              <div class="words-block">
                <div class="words-label">Amount Charged in Words</div>
                <div class="words-text">${wordsTotal}</div>
              </div>

              <div style="font-size: 11px; color: #64748b; line-height: 1.4; padding: 4px 6px;">
                <strong>Payment Notes &amp; Terms:</strong><br>
                • All charges include 10% statutory hospitality service charge.<br>
                • Goods &amp; Services are non-refundable once billed.<br>
                • Thank you for your patronage with Pol-Kole Resort &amp; Restaurant.
              </div>
            </div>

            <!-- Calculation Box -->
            <div>
              <div class="calc-table">
                <div class="calc-row">
                  <span class="calc-label">Gross Subtotal:</span>
                  <span class="calc-val">Rs. ${subtotal.toFixed(2)}</span>
                </div>
                ${discount > 0 ? `
                  <div class="calc-row" style="color: #e11d48;">
                    <span class="calc-label" style="color: #e11d48;">Discount Applied:</span>
                    <span class="calc-val" style="color: #e11d48;">-Rs. ${discount.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div class="calc-row">
                  <span class="calc-label">${serviceCharge > 0 ? 'Service Charge (10%):' : 'Service Charge:'}</span>
                  <span class="calc-val" style="color: ${serviceCharge > 0 ? '#0f766e' : '#64748b'};">
                    ${serviceCharge > 0 ? '+Rs. ' + serviceCharge.toFixed(2) : 'Rs. 0.00 (Exempt)'}
                  </span>
                </div>
                <div class="calc-row">
                  <span class="calc-label">VAT / Government Tax:</span>
                  <span class="calc-val">Rs. 0.00 (0%)</span>
                </div>
              </div>

              <div class="grand-total-box">
                <span class="grand-total-label">Net Total:</span>
                <span class="grand-total-val">Rs. ${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <!-- Signatures Section -->
          <table class="signatures-table">
            <tr>
              <td class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-title">Guest Signature</div>
                <div class="sig-sub">${guestName}</div>
              </td>
              <td style="width: 10%;"></td>
              <td class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-title">Authorized Officer</div>
                <div class="sig-sub">Pol-Kole Front Desk / Accounts</div>
              </td>
            </tr>
          </table>

          <!-- Footer -->
          <div class="inv-footer">
            <div>Pol-Kole Resort &amp; Restaurant • Galle Road, Ahangama, Sri Lanka • +94 91 228 3456 • info@polkole.lk</div>
            <div class="legal-tag">Computer Generated Official Tax Invoice &amp; Folio Statement • Valid Without Physical Stamp When Marked Paid</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }


  // =========================================================================
  // 3. THERMAL RECEIPT FOR INVOICE (80mm POS Slip)
  // =========================================================================
  printThermalReceipt(invoice: Invoice, options?: PrintInvoiceOptions): void {
    const printWindow = window.open('', '_blank', 'width=380,height=680');
    if (!printWindow) {
      alert('Popup Blocked: Please allow popups in your browser to print receipts.');
      return;
    }

    const cashier = options?.cashierName || this.getLoggedInStaff();
    const isRoom = !!invoice.reservationId || !!options?.roomNumber;
    const isTable = !isRoom && (!!invoice.tableReservationId || !!options?.tableNumber);
    const isTakeaway = !isRoom && !isTable;

    const subtotal = invoice.orderSubtotal || invoice.roomCharges || 0;
    const discount = invoice.discountAmount || 0;
    const serviceCharge = invoice.taxAmount || 0;
    const grandTotal = invoice.totalAmount || (subtotal - discount + serviceCharge);

    const paymentStatus = (invoice.paymentStatus || 'PAID').toUpperCase();
    const isPaid = paymentStatus === 'PAID' || paymentStatus === 'SETTLED';

    const invoiceTitle = isRoom 
      ? 'Room Stay Payment Receipt' 
      : (isTable ? 'Table Dining Payment Receipt' : 'Takeaway Payment Receipt');

    const itemsHtml = (invoice.items || []).map((item, idx) => `
      <tr style="border-bottom: 1px dashed #e2e8f0;">
        <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">${item.description}</td>
        <td style="padding: 5px 0; text-align: center; color: #475569; font-weight: 700;">x${item.quantity || 1}</td>
        <td style="padding: 5px 0; text-align: right; font-weight: 800; color: #0f172a;">Rs. ${(item.totalPrice).toFixed(2)}</td>
      </tr>
    `).join('');

    const barcodeHtml = this.generateSvgBarcode(`INV-${invoice.invoiceNumber}`);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt ${invoice.invoiceNumber} - Pol-Kole</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            width: 320px;
            margin: 0 auto;
            padding: 16px 12px;
            font-size: 12px;
            color: #1e293b;
            background: #fff;
          }
          .header { text-align: center; border-bottom: 2px dashed #64748b; padding-bottom: 10px; margin-bottom: 10px; }
          .logo { font-size: 18px; font-weight: 900; letter-spacing: 0.8px; color: #042f2e; }
          .sublogo { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #0f766e; font-weight: 700; margin-top: 1px; }
          .receipt-type { font-size: 12px; font-weight: 800; color: #2563eb; margin-top: 6px; }
          .invoice-no {
            font-size: 15px;
            font-weight: 900;
            margin: 4px 0;
            font-family: 'Courier New', Courier, monospace;
            color: #0f172a;
          }
          .meta-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 10px;
            margin-bottom: 10px;
            font-size: 11px;
            line-height: 1.45;
          }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11.5px; }
          .breakdown { border-top: 2px dashed #64748b; border-bottom: 2px dashed #64748b; padding: 8px 0; margin-top: 10px; font-size: 11.5px; }
          .row { display: flex; justify-content: space-between; padding: 2px 0; }
          .total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 4px; padding-top: 4px; border-top: 1.5px solid #0f172a; }
          .footer { text-align: center; margin-top: 14px; font-size: 10px; color: #64748b; line-height: 1.4; border-top: 1px solid #e2e8f0; padding-top: 8px; }
          .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 11px; }
          .paid { background: #dcfce7; color: #166534; }
          .unpaid { background: #fee2e2; color: #991b1b; }
          @media print {
            body { width: 100%; padding: 0 4px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">POL-KOLE RESORT</div>
          <div class="sublogo">Official Payment Receipt</div>
          <div class="receipt-type">${invoiceTitle}</div>
          <div class="invoice-no">${invoice.invoiceNumber}</div>
          <div style="font-size: 10.5px; color: #64748b;">${new Date().toLocaleString()}</div>
        </div>

        <div class="meta-box">
          <div><strong>Payment Status:</strong> <span class="status-badge ${isPaid ? 'paid' : 'unpaid'}">${paymentStatus}</span></div>
          <div><strong>Payment Method:</strong> ${invoice.paymentMethodName || options?.paymentMethod || 'CASH'}</div>
          ${invoice.transactionReference ? `<div><strong>Ref ID:</strong> ${invoice.transactionReference}</div>` : ''}
          ${options?.customerName ? `<div><strong>Guest:</strong> ${options.customerName}</div>` : ''}
          <div><strong>Cashier:</strong> ${cashier}</div>
        </div>

        <table>
          <thead>
            <tr style="border-bottom: 2px solid #0f172a;">
              <th style="text-align: left; padding-bottom: 4px; font-size: 10.5px; text-transform: uppercase;">Description</th>
              <th style="text-align: center; padding-bottom: 4px; font-size: 10.5px; text-transform: uppercase;">Qty</th>
              <th style="text-align: right; font-size: 10.5px; text-transform: uppercase;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || '<tr><td colspan="3" style="text-align:center; padding:8px 0; color:#94a3b8;">Line items processed</td></tr>'}
          </tbody>
        </table>

        <div class="breakdown">
          <div class="row">
            <span style="color: #64748b;">Subtotal:</span>
            <span style="font-weight: 700;">Rs. ${subtotal.toFixed(2)}</span>
          </div>
          ${discount > 0 ? `
          <div class="row" style="color: #e11d48;">
            <span>Discount Applied:</span>
            <span style="font-weight: 700;">-Rs. ${discount.toFixed(2)}</span>
          </div>` : ''}
          <div class="row">
            <span style="color: #64748b;">${serviceCharge > 0 ? 'Service Charge (10%):' : 'Service Charge:'}</span>
            <span style="font-weight: 700; color: ${serviceCharge > 0 ? '#0d9488' : '#64748b'};">
              ${serviceCharge > 0 ? '+Rs. ' + serviceCharge.toFixed(2) : 'Rs. 0.00 (Takeaway)'}
            </span>
          </div>
          <div class="total-row">
            <span>NET TOTAL:</span>
            <span>Rs. ${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <div style="margin-bottom: 6px;">${barcodeHtml}</div>
          <div>Thank you for choosing Pol-Kole Resort!</div>
          <div style="margin-top: 4px; font-size: 9.5px; color: #94a3b8;">No Taxes/VAT • 10% Service Charge applies to Dine-in &amp; Room Bookings</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
