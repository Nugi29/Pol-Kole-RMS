import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { Order, OrderService } from '../../../services/order.service';
import { BillingService, Invoice, PaymentPayload } from '../../../services/billing.service';

@Component({
  selector: 'app-billing',
  standalone: false,
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.css'
})
export class BillingComponent implements OnInit {
  invoices: Invoice[] = [];
  orders: Order[] = [];
  loading = false;
  successMessage = '';
  errorMessage = '';
  activeTab = 'invoices';

  displayedColumns: string[] = ['invoiceNumber', 'totalAmount', 'paymentStatus', 'actions'];
  paymentDisplayedColumns: string[] = ['invoiceNumber', 'totalAmount', 'paymentMethodName', 'transactionReference', 'actions'];
  invoiceDataSource = new MatTableDataSource<Invoice>([]);
  paymentDataSource = new MatTableDataSource<Invoice>([]);

  // Invoice Generation state
  selectedOrderId: number | null = null;
  discountCode = '';
  redeemPoints = 0;

  // Selected active invoice details
  activeInvoice: Invoice | null = null;

  // Payment inputs
  paymentMethod = 'CASH';
  paymentRef = '';
  paymentNotes = '';

  constructor(
    private readonly billingService: BillingService,
    private readonly orderService: OrderService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
    this.loadOrders();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
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
      },
      error: () => {
        this.errorMessage = 'Failed to load invoices.';
        this.loading = false;
      }
    });
  }

  loadOrders(): void {
    // Load orders that don't have invoices generated
    this.orderService.filterOrders(undefined, undefined, undefined, 0, 100).subscribe(page => {
      this.orders = page.content.filter(o => o.statusName !== 'COMPLETED' && o.statusName !== 'CANCELLED');
    });
  }

  triggerGenerateInvoice(): void {
    if (!this.selectedOrderId) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.billingService.generateInvoice(this.selectedOrderId, this.discountCode, this.redeemPoints).subscribe({
      next: (invoice) => {
        this.successMessage = `Invoice generated successfully: ${invoice.invoiceNumber}`;
        this.activeInvoice = invoice;
        this.selectedOrderId = null;
        this.discountCode = '';
        this.redeemPoints = 0;
        this.loadInvoices();
        this.loadOrders();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to generate invoice.';
        this.loading = false;
      }
    });
  }

  viewInvoice(invoice: Invoice): void {
    this.activeInvoice = invoice;
  }

  closeInvoice(): void {
    this.activeInvoice = null;
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
        this.loadInvoices();
        this.loadOrders();
        this.closeInvoice();
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
}
