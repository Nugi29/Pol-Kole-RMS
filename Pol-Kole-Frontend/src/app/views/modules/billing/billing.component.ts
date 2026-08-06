import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import { Order, OrderService } from '../../../services/order.service';
import { BillingService, Invoice, PaymentPayload } from '../../../services/billing.service';
import { HotelReservation, HotelReservationService } from '../../../services/hotel-reservation.service';
import { Reservation, ReservationService } from '../../../services/reservation.service';

export interface UnifiedStayItem {
  id: number;
  type: 'ROOM' | 'TABLE';
  customerName: string;
  customerPassport: string;
  roomOrTableNumber: string;
}

@Component({
  selector: 'app-billing',
  standalone: false,
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.css'
})
export class BillingComponent implements OnInit {
  invoices: Invoice[] = [];
  takeAwayOrders: Order[] = [];
  loading = false;
  successMessage = '';
  errorMessage = '';
  activeTab = 'invoices';

  displayedColumns: string[] = ['invoiceNumber', 'category', 'totalAmount', 'paymentStatus', 'actions'];
  paymentDisplayedColumns: string[] = ['invoiceNumber', 'category', 'totalAmount', 'paymentMethodName', 'transactionReference', 'actions'];
  invoiceDataSource = new MatTableDataSource<Invoice>([]);
  paymentDataSource = new MatTableDataSource<Invoice>([]);

  // Invoice Compiler state
  compilerType: 'TAKEAWAY' | 'TABLE' | 'ROOM' = 'TAKEAWAY';
  selectedTakeAwayOrderId: number | null = null;
  selectedTableReservationId: number | null = null;
  selectedRoomReservationId: number | null = null;
  checkedOutRooms: UnifiedStayItem[] = [];
  checkedOutTables: UnifiedStayItem[] = [];
  discountCode = '';
  redeemPoints = 0;

  // Selected active invoice details
  activeInvoice: Invoice | null = null;
  activeInvoiceOrder: Order | null = null;
  activeInvoiceReservation: HotelReservation | null = null;
  activeInvoiceTableReservation: Reservation | null = null;

  // Payment inputs
  paymentMethod = 'CASH';
  paymentRef = '';
  paymentNotes = '';

  // Settle tab search/filtering state
  settleSearchText = '';
  filteredUnpaidInvoices: Invoice[] = [];

  constructor(
    private readonly billingService: BillingService,
    private readonly orderService: OrderService,
    private readonly reservationService: HotelReservationService,
    private readonly tableReservationService: ReservationService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
        this.filterUnpaidInvoices();
        
        if (this.activeTab === 'settle') {
          const unpaid = this.unpaidInvoices;
          if (unpaid.length > 0) {
            if (!this.activeInvoice || this.activeInvoice.paymentStatus === 'PAID') {
              this.viewInvoice(unpaid[0]);
            }
          } else {
            this.activeInvoice = null;
            this.activeInvoiceOrder = null;
            this.activeInvoiceReservation = null;
            this.activeInvoiceTableReservation = null;
          }
        } else {
          this.closeInvoice();
        }
      }
    });
  }

  loadInvoices(): void {
    this.loading = true;
    this.billingService.getAllInvoices().subscribe({
      next: (data) => {
        this.invoices = data;
        this.invoiceDataSource.data = data;
        this.paymentDataSource.data = data.filter(inv => inv.paymentStatus === 'PAID');
        this.loading = false;
        
        this.filterUnpaidInvoices();
        this.loadCheckedOutReservations();

        if (this.activeTab === 'settle') {
          const unpaid = this.unpaidInvoices;
          if (unpaid.length > 0) {
            const existingId = this.activeInvoice?.id;
            const currentUnpaid = unpaid.find(u => u.id === existingId);
            if (currentUnpaid) {
              this.viewInvoice(currentUnpaid);
            } else {
              this.viewInvoice(unpaid[0]);
            }
          } else {
            this.activeInvoice = null;
            this.activeInvoiceOrder = null;
            this.activeInvoiceReservation = null;
            this.activeInvoiceTableReservation = null;
          }
        }

        this.loadOrders();
      },
      error: () => {
        this.errorMessage = 'Failed to load invoices.';
        this.loading = false;
      }
    });
  }

  loadOrders(): void {
    this.orderService.filterOrders(undefined, undefined, undefined, 0, 100).subscribe(page => {
      const invoiceOrderIds = this.invoices.map(inv => inv.orderId || inv.reservationId || inv.tableReservationId);
      this.takeAwayOrders = page.content.filter(o => 
        o.statusName !== 'COMPLETED' && 
        o.statusName !== 'CANCELLED' &&
        !o.tableId &&
        !o.roomId &&
        !invoiceOrderIds.includes(o.id)
      );
    });
  }

  loadCheckedOutReservations(): void {
    forkJoin({
      rooms: this.reservationService.filterReservations(undefined, undefined, 'CHECKED_OUT'),
      tables: this.tableReservationService.filterReservations(undefined, undefined, 4) // 4 = Checked Out
    }).subscribe({
      next: (results) => {
        const invoiceReservationIds = this.invoices.map(inv => inv.reservationId);
        const invoiceTableReservationIds = this.invoices.map(inv => inv.tableReservationId);

        this.checkedOutRooms = results.rooms.content
          .filter(res => !invoiceReservationIds.includes(res.id))
          .map(res => ({
            id: res.id!,
            type: 'ROOM',
            customerName: res.customerName || '',
            customerPassport: res.customerPassport || '',
            roomOrTableNumber: res.roomNumber || ''
          }));

        this.checkedOutTables = results.tables.content
          .filter(res => !invoiceTableReservationIds.includes(res.id))
          .map(res => ({
            id: res.id!,
            type: 'TABLE',
            customerName: res.customerName || '',
            customerPassport: res.customerPassport || '',
            roomOrTableNumber: res.tableNumber || ''
          }));
      }
    });
  }

  triggerGenerateInvoice(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.compilerType === 'TAKEAWAY') {
      if (!this.selectedTakeAwayOrderId) {
        this.loading = false;
        return;
      }

      this.billingService.generateInvoice(this.selectedTakeAwayOrderId, this.discountCode, this.redeemPoints).subscribe({
        next: (invoice) => {
          this.successMessage = `Take Away invoice generated successfully: ${invoice.invoiceNumber}`;
          this.activeInvoice = invoice;
          this.selectedTakeAwayOrderId = null;
          this.discountCode = '';
          this.redeemPoints = 0;
          this.loadInvoices();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to generate takeaway invoice.';
          this.loading = false;
        }
      });
    } else if (this.compilerType === 'TABLE') {
      if (!this.selectedTableReservationId) {
        this.loading = false;
        return;
      }

      this.billingService.generateTableInvoice(this.selectedTableReservationId, this.discountCode, this.redeemPoints).subscribe({
        next: (invoice) => {
          this.successMessage = `Table checkout invoice generated successfully: ${invoice.invoiceNumber}`;
          this.activeInvoice = invoice;
          this.selectedTableReservationId = null;
          this.discountCode = '';
          this.redeemPoints = 0;
          this.loadInvoices();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to generate table checkout invoice.';
          this.loading = false;
        }
      });
    } else if (this.compilerType === 'ROOM') {
      if (!this.selectedRoomReservationId) {
        this.loading = false;
        return;
      }

      this.billingService.generateStayInvoice(this.selectedRoomReservationId, this.discountCode, this.redeemPoints).subscribe({
        next: (invoice) => {
          this.successMessage = `Room checkout invoice generated successfully: ${invoice.invoiceNumber}`;
          this.activeInvoice = invoice;
          this.selectedRoomReservationId = null;
          this.discountCode = '';
          this.redeemPoints = 0;
          this.loadInvoices();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to generate room checkout invoice.';
          this.loading = false;
        }
      });
    }
  }

  viewInvoice(invoice: Invoice): void {
    this.activeInvoice = invoice;
    this.activeInvoiceOrder = null;
    this.activeInvoiceReservation = null;
    this.activeInvoiceTableReservation = null;

    if (invoice.orderId) {
      this.orderService.getOrderById(invoice.orderId).subscribe({
        next: (order) => {
          this.activeInvoiceOrder = order;
        },
        error: () => {
          console.warn('Failed to load order details for invoice');
        }
      });
    }

    if (invoice.reservationId) {
      this.reservationService.getReservationById(invoice.reservationId).subscribe({
        next: (res) => {
          this.activeInvoiceReservation = res;
        },
        error: () => {
          console.warn('Failed to load reservation details for invoice');
        }
      });
    }

    if (invoice.tableReservationId) {
      this.tableReservationService.getReservationById(invoice.tableReservationId).subscribe({
        next: (res) => {
          this.activeInvoiceTableReservation = res;
        },
        error: () => {
          console.warn('Failed to load table reservation details for invoice');
        }
      });
    }
  }

  closeInvoice(): void {
    this.activeInvoice = null;
    this.activeInvoiceOrder = null;
    this.activeInvoiceReservation = null;
    this.activeInvoiceTableReservation = null;
  }

  submitPayment(): void {
    if (!this.activeInvoice) return;

    const payload: PaymentPayload = {
      invoiceId: this.activeInvoice.id!,
      amount: this.activeInvoice.totalAmount,
      paymentMethodName: this.paymentMethod,
      transactionReference: this.paymentRef,
      notes: this.paymentNotes
    };

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.billingService.processPayment(payload).subscribe({
      next: () => {
        this.successMessage = 'Payment processed successfully. Checkout complete!';
        this.paymentRef = '';
        this.paymentNotes = '';
        this.paymentMethod = 'CASH';
        
        this.loadInvoices();
        
        if (this.activeTab !== 'settle') {
          this.closeInvoice();
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to process checkout payment.';
        this.loading = false;
      }
    });
  }

  downloadInvoicePdf(invoice: Invoice): void {
    this.billingService.downloadInvoicePdf(invoice.id!).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoice.invoiceNumber}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        alert('Failed to download invoice PDF.');
      }
    });
  }

  get paymentsLedger(): Invoice[] {
    return this.invoices.filter(inv => inv.paymentStatus === 'PAID');
  }

  get unpaidInvoices(): Invoice[] {
    return this.invoices.filter(inv => inv.paymentStatus === 'UNPAID');
  }

  filterUnpaidInvoices(): void {
    const text = this.settleSearchText.trim().toLowerCase();
    if (!text) {
      this.filteredUnpaidInvoices = this.unpaidInvoices;
    } else {
      this.filteredUnpaidInvoices = this.unpaidInvoices.filter(inv => 
        inv.invoiceNumber.toLowerCase().includes(text) ||
        String(inv.orderId || inv.reservationId || inv.tableReservationId || '').toLowerCase().includes(text)
      );
    }
  }
}
