import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Order, OrderService } from '../../../services/order.service';
import { BillingService, Invoice, PaymentPayload } from '../../../services/billing.service';
import { HotelReservation, HotelReservationService } from '../../../services/hotel-reservation.service';
import { Reservation, ReservationService } from '../../../services/reservation.service';
import { TableService } from '../../../services/table.service';
import { DialogService } from '../../../services/dialog.service';

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
  @ViewChild('invoicePaginator') set invoicePaginator(mp: MatPaginator) {
    this.invoiceDataSource.paginator = mp;
  }

  @ViewChild('paymentPaginator') set paymentPaginator(mp: MatPaginator) {
    this.paymentDataSource.paginator = mp;
  }
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

  constructor(
    private readonly billingService: BillingService,
    private readonly orderService: OrderService,
    private readonly reservationService: HotelReservationService,
    private readonly tableReservationService: ReservationService,
    private readonly tableService: TableService,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialogService: DialogService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const prevTab = this.activeTab;
      if (params['tab']) {
        this.activeTab = params['tab'];
      } else {
        this.activeTab = 'invoices';
      }
      if (this.activeTab !== prevTab) {
        this.closeInvoice();
      }
      this.loadInvoices();
      this.cdr.markForCheck();
    });
  }

  loadInvoices(): void {
    this.loading = true;
    this.billingService.getAllInvoices().subscribe({
      next: (data) => {
        const sortedData = [...(data || [])].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
        this.invoices = sortedData;
        this.invoiceDataSource.data = sortedData;
        this.paymentDataSource.data = sortedData.filter(inv => inv.paymentStatus === 'PAID');
        this.loading = false;
        
        this.loadCheckedOutReservations();
        this.loadOrders();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load invoices', err);
        this.errorMessage = 'Failed to load invoices.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadOrders(): void {
    this.orderService.filterOrders(undefined, undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        const content = page?.content || [];
        const invoiceOrderIds = this.invoices.map(inv => inv.orderId || inv.reservationId || inv.tableReservationId);
        this.takeAwayOrders = content.filter(o => 
          o.statusName !== 'COMPLETED' && 
          o.statusName !== 'CANCELLED' &&
          !o.tableId &&
          !o.roomId &&
          !invoiceOrderIds.includes(o.id)
        );
      },
      error: (err) => {
        console.warn('Failed to load orders for billing', err);
        this.takeAwayOrders = [];
      }
    });
  }

  loadCheckedOutReservations(): void {
    forkJoin({
      rooms: this.reservationService.filterReservations(undefined, undefined, 'CHECKED_OUT', undefined, undefined, 0, 1000).pipe(
        catchError(() => of({ content: [] } as any))
      ),
      tables: this.tableReservationService.filterReservations(undefined, undefined, 4, undefined, undefined, 0, 1000).pipe( // 4 = Checked Out
        catchError(() => of({ content: [] } as any))
      )
    }).subscribe({
      next: (results) => {
        const invoiceReservationIds = this.invoices.map(inv => inv.reservationId);
        const invoiceTableReservationIds = this.invoices.map(inv => inv.tableReservationId);

        const roomContent = results.rooms?.content || [];
        const tableContent = results.tables?.content || [];

        this.checkedOutRooms = roomContent
          .filter((res: any) => !invoiceReservationIds.includes(res.id))
          .map((res: any) => ({
            id: res.id!,
            type: 'ROOM',
            customerName: res.customerName || '',
            customerPassport: res.customerPassport || '',
            roomOrTableNumber: res.roomNumber || ''
          }));

        this.checkedOutTables = tableContent
          .filter((res: any) => !invoiceTableReservationIds.includes(res.id))
          .map((res: any) => ({
            id: res.id!,
            type: 'TABLE',
            customerName: res.customerName || '',
            customerPassport: res.customerPassport || '',
            roomOrTableNumber: res.tableNumber || ''
          }));
      },
      error: (err) => {
        console.warn('Failed to load checked out stays', err);
        this.checkedOutRooms = [];
        this.checkedOutTables = [];
      }
    });
  }

  triggerGenerateInvoice(): void {
    if (this.compilerType === 'TAKEAWAY') {
      if (!this.selectedTakeAwayOrderId) return;
      this.dialogService.confirmAction('Generate Invoice', 'Generate invoice for Take Away Order #' + this.selectedTakeAwayOrderId + '?').subscribe((confirmed) => {
        if (confirmed) {
          this.loading = true;
          this.errorMessage = '';
          this.billingService.generateInvoice(this.selectedTakeAwayOrderId!, this.discountCode, this.redeemPoints).subscribe({
            next: (invoice) => {
              this.activeInvoice = invoice;
              this.selectedTakeAwayOrderId = null;
              this.discountCode = '';
              this.redeemPoints = 0;
              this.loadInvoices();
              this.dialogService.showSuccess('Invoice Generated', `Take Away invoice generated: ${invoice.invoiceNumber}`);
            },
            error: (err) => {
              this.errorMessage = err.error?.message || 'Failed to generate takeaway invoice.';
              this.loading = false;
              this.dialogService.showError('Invoice Failed', this.errorMessage);
            }
          });
        }
      });
    } else if (this.compilerType === 'TABLE') {
      if (!this.selectedTableReservationId) return;
      this.dialogService.confirmAction('Generate Invoice', 'Generate table checkout invoice for Booking #' + this.selectedTableReservationId + '?').subscribe((confirmed) => {
        if (confirmed) {
          this.loading = true;
          this.errorMessage = '';
          this.billingService.generateTableInvoice(this.selectedTableReservationId!, this.discountCode, this.redeemPoints).subscribe({
            next: (invoice) => {
              this.activeInvoice = invoice;
              this.selectedTableReservationId = null;
              this.discountCode = '';
              this.redeemPoints = 0;
              this.loadInvoices();
              this.dialogService.showSuccess('Invoice Generated', `Table checkout invoice generated: ${invoice.invoiceNumber}`);
            },
            error: (err) => {
              this.errorMessage = err.error?.message || 'Failed to generate table checkout invoice.';
              this.loading = false;
              this.dialogService.showError('Invoice Failed', this.errorMessage);
            }
          });
        }
      });
    } else if (this.compilerType === 'ROOM') {
      if (!this.selectedRoomReservationId) return;
      this.dialogService.confirmAction('Generate Invoice', 'Generate room checkout invoice for Stay #' + this.selectedRoomReservationId + '?').subscribe((confirmed) => {
        if (confirmed) {
          this.loading = true;
          this.errorMessage = '';
          this.billingService.generateStayInvoice(this.selectedRoomReservationId!, this.discountCode, this.redeemPoints).subscribe({
            next: (invoice) => {
              this.activeInvoice = invoice;
              this.selectedRoomReservationId = null;
              this.discountCode = '';
              this.redeemPoints = 0;
              this.loadInvoices();
              this.dialogService.showSuccess('Invoice Generated', `Room checkout invoice generated: ${invoice.invoiceNumber}`);
            },
            error: (err) => {
              this.errorMessage = err.error?.message || 'Failed to generate room checkout invoice.';
              this.loading = false;
              this.dialogService.showError('Invoice Failed', this.errorMessage);
            }
          });
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

    this.dialogService.confirmAction(
      'Confirm Payment Settlement',
      `Settle invoice ${this.activeInvoice.invoiceNumber} for Rs. ${this.activeInvoice.totalAmount.toFixed(2)} using ${this.paymentMethod}?`
    ).subscribe((confirmed) => {
      if (confirmed) {
        const payload: PaymentPayload = {
          invoiceId: this.activeInvoice!.id!,
          amount: this.activeInvoice!.totalAmount,
          paymentMethodName: this.paymentMethod,
          transactionReference: this.paymentRef,
          notes: this.paymentNotes
        };

        this.loading = true;
        this.errorMessage = '';

        this.billingService.processPayment(payload).subscribe({
          next: () => {
            const paidInv = this.activeInvoice;
            // Auto-transition table to CLEANING upon bill settlement
            if (paidInv) {
              if (this.activeInvoiceTableReservation?.tableId) {
                this.tableService.updateTableStatus(this.activeInvoiceTableReservation.tableId, 'CLEANING').subscribe();
              } else if (paidInv.tableReservationId) {
                this.tableReservationService.getReservationById(paidInv.tableReservationId).subscribe({
                  next: (tr) => {
                    if (tr?.tableId) {
                      this.tableService.updateTableStatus(tr.tableId, 'CLEANING').subscribe();
                    }
                  }
                });
              }

              if (this.activeInvoiceOrder?.tableId) {
                this.tableService.updateTableStatus(this.activeInvoiceOrder.tableId, 'CLEANING').subscribe();
              } else if (paidInv.orderId) {
                this.orderService.getOrderById(paidInv.orderId).subscribe({
                  next: (ord) => {
                    if (ord?.tableId) {
                      this.tableService.updateTableStatus(ord.tableId, 'CLEANING').subscribe();
                    }
                  }
                });
              }
            }

            this.paymentRef = '';
            this.paymentNotes = '';
            this.paymentMethod = 'CASH';
            
            this.loadInvoices();
            this.closeInvoice();
            this.dialogService.showSuccess('Settlement Completed', 'Payment processed successfully. Checkout complete!');
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Failed to process checkout payment.';
            this.loading = false;
            this.dialogService.showError('Payment Failed', this.errorMessage);
          }
        });
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
        this.dialogService.showError('Download Failed', 'Failed to download invoice PDF.');
      }
    });
  }

  get paymentsLedger(): Invoice[] {
    return this.invoices.filter(inv => inv.paymentStatus === 'PAID');
  }
}
