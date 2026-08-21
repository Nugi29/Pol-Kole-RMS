import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Order, OrderService } from '../../../services/order.service';
import { BillingService, Invoice, PaymentPayload } from '../../../services/billing.service';
import { HotelReservation, HotelReservationService } from '../../../services/hotel-reservation.service';
import { Reservation, ReservationService } from '../../../services/reservation.service';
import { TableService } from '../../../services/table.service';
import { DialogService } from '../../../services/dialog.service';
import { Voucher, VoucherService } from '../../../services/voucher.service';

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

  @ViewChild('voucherPaginator') set voucherPaginator(mp: MatPaginator) {
    this.voucherDataSource.paginator = mp;
  }

  invoices: Invoice[] = [];
  takeAwayOrders: Order[] = [];
  vouchers: Voucher[] = [];
  activeVouchers: Voucher[] = [];
  loading = false;
  successMessage = '';
  errorMessage = '';
  activeTab = 'invoices'; // 'invoices' | 'payments' | 'vouchers'

  displayedColumns: string[] = ['invoiceNumber', 'category', 'totalAmount', 'paymentStatus', 'actions'];
  paymentDisplayedColumns: string[] = ['invoiceNumber', 'category', 'totalAmount', 'paymentMethodName', 'transactionReference', 'actions'];
  voucherDisplayedColumns: string[] = ['code', 'description', 'discount', 'rules', 'validity', 'usage', 'status', 'actions'];

  invoiceDataSource = new MatTableDataSource<Invoice>([]);
  paymentDataSource = new MatTableDataSource<Invoice>([]);
  voucherDataSource = new MatTableDataSource<Voucher>([]);

  // Invoice Compiler state
  compilerType: 'TAKEAWAY' | 'TABLE' | 'ROOM' = 'TAKEAWAY';
  selectedTakeAwayOrderId: number | null = null;
  selectedTableReservationId: number | null = null;
  selectedRoomReservationId: number | null = null;
  checkedOutRooms: UnifiedStayItem[] = [];
  checkedOutTables: UnifiedStayItem[] = [];
  discountCode = '';
  redeemPoints = 0;

  // Real-time voucher preview
  voucherValidationResult: Voucher | null = null;
  validatingVoucher = false;
  showVoucherPickerModal = false;
  private readonly voucherInputSubject = new Subject<string>();

  // Selected active invoice details
  activeInvoice: Invoice | null = null;
  activeInvoiceOrder: Order | null = null;
  activeInvoiceReservation: HotelReservation | null = null;
  activeInvoiceTableReservation: Reservation | null = null;

  // Payment inputs
  paymentMethod = 'CASH';
  paymentRef = '';
  paymentNotes = '';

  // Voucher Management Modal State
  showVoucherModal = false;
  isEditingVoucher = false;
  editingVoucherId: number | null = null;
  voucherForm: Voucher = this.getEmptyVoucher();
  voucherSearchTerm = '';
  voucherFilterType = 'ALL';

  constructor(
    private readonly billingService: BillingService,
    private readonly orderService: OrderService,
    private readonly reservationService: HotelReservationService,
    private readonly tableReservationService: ReservationService,
    private readonly tableService: TableService,
    private readonly voucherService: VoucherService,
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
      if (this.activeTab === 'vouchers') {
        this.loadVouchers();
      } else {
        this.loadInvoices();
      }
      this.loadActiveVouchers();
      this.cdr.markForCheck();
    });

    this.voucherInputSubject.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(code => {
      this.validateVoucherCode(code);
    });
  }

  getEmptyVoucher(): Voucher {
    const today = new Date().toISOString().substring(0, 10);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = nextYear.toISOString().substring(0, 10);

    return {
      code: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minBillAmount: undefined,
      maxDiscountAmount: undefined,
      activeFrom: today,
      activeTo: nextYearStr,
      usageLimit: undefined,
      isActive: true,
      applicableType: 'ALL',
    };
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

  loadVouchers(): void {
    this.loading = true;
    this.voucherService.searchVouchers(this.voucherSearchTerm, 0, 1000).subscribe({
      next: (page) => {
        let list = page?.content || [];
        if (this.voucherFilterType !== 'ALL') {
          list = list.filter(v => v.discountType === this.voucherFilterType);
        }
        this.vouchers = list;
        this.voucherDataSource.data = list;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load vouchers', err);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadActiveVouchers(): void {
    this.voucherService.getActiveValidVouchers().subscribe({
      next: (list) => {
        this.activeVouchers = list || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.activeVouchers = [];
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
      tables: this.tableReservationService.filterReservations(undefined, undefined, 4, undefined, undefined, 0, 1000).pipe(
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

  // --- Real-time Voucher Code Validation in Compiler ---
  onVoucherCodeInput(code: string): void {
    this.voucherInputSubject.next(code);
  }

  validateVoucherCode(code: string): void {
    if (!code || !code.trim()) {
      this.voucherValidationResult = null;
      return;
    }

    const estimatedAmount = this.getEstimatedBillAmount();
    this.validatingVoucher = true;
    this.voucherService.validateVoucher(code.trim(), estimatedAmount, this.compilerType).subscribe({
      next: (res) => {
        this.voucherValidationResult = res;
        this.validatingVoucher = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.voucherValidationResult = {
          code,
          discountType: 'PERCENTAGE',
          discountValue: 0,
          activeFrom: '',
          activeTo: '',
          valid: false,
          validationMessage: err.error?.message || 'Invalid or unrecognized voucher code'
        };
        this.validatingVoucher = false;
        this.cdr.markForCheck();
      }
    });
  }

  getSelectedTakeawayOrder(): Order | undefined {
    if (this.compilerType === 'TAKEAWAY' && this.selectedTakeAwayOrderId) {
      return this.takeAwayOrders.find(o => o.id === this.selectedTakeAwayOrderId);
    }
    return undefined;
  }

  getEstimatedBillAmount(): number {
    const selOrder = this.getSelectedTakeawayOrder();
    if (selOrder) {
      return selOrder.totalAmount || 0;
    }
    return 1000; // fallback preview estimate
  }

  openVoucherPicker(): void {
    this.loadActiveVouchers();
    this.showVoucherPickerModal = true;
  }

  closeVoucherPicker(): void {
    this.showVoucherPickerModal = false;
  }

  selectVoucherFromPicker(voucher: Voucher): void {
    this.discountCode = voucher.code;
    this.closeVoucherPicker();
    this.validateVoucherCode(voucher.code);
  }

  // --- Voucher CRUD Operations (Manager Portal) ---
  openCreateVoucherModal(): void {
    this.isEditingVoucher = false;
    this.editingVoucherId = null;
    this.voucherForm = this.getEmptyVoucher();
    this.showVoucherModal = true;
  }

  openEditVoucherModal(voucher: Voucher): void {
    this.isEditingVoucher = true;
    this.editingVoucherId = voucher.id!;
    this.voucherForm = {
      ...voucher,
      minBillAmount: voucher.minBillAmount || undefined,
      maxDiscountAmount: voucher.maxDiscountAmount || undefined,
      usageLimit: voucher.usageLimit || undefined
    };
    this.showVoucherModal = true;
  }

  closeVoucherModal(): void {
    this.showVoucherModal = false;
    this.voucherForm = this.getEmptyVoucher();
  }

  generateRandomCode(): void {
    const prefixes = ['PROMO', 'VIP', 'MGR', 'SPECIAL', 'DEAL'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.voucherForm.code = `${prefix}${randomNum}`;
  }

  saveVoucher(): void {
    if (!this.voucherForm.code || !this.voucherForm.code.trim()) {
      this.dialogService.showError('Validation Error', 'Voucher code is required.');
      return;
    }
    if (!this.voucherForm.discountValue || this.voucherForm.discountValue <= 0) {
      this.dialogService.showError('Validation Error', 'Discount value must be greater than zero.');
      return;
    }
    if (!this.voucherForm.activeFrom || !this.voucherForm.activeTo) {
      this.dialogService.showError('Validation Error', 'Active dates are required.');
      return;
    }

    this.loading = true;
    const payload: Voucher = {
      ...this.voucherForm,
      code: this.voucherForm.code.trim().toUpperCase()
    };

    if (this.isEditingVoucher && this.editingVoucherId) {
      this.voucherService.updateVoucher(this.editingVoucherId, payload).subscribe({
        next: (saved) => {
          this.loading = false;
          this.closeVoucherModal();
          this.loadVouchers();
          this.loadActiveVouchers();
          this.dialogService.showSuccess('Voucher Updated', `Voucher "${saved.code}" has been updated successfully.`);
        },
        error: (err) => {
          this.loading = false;
          const msg = err.error?.message || 'Failed to update voucher.';
          this.dialogService.showError('Update Failed', msg);
        }
      });
    } else {
      this.voucherService.createVoucher(payload).subscribe({
        next: (created) => {
          this.loading = false;
          this.closeVoucherModal();
          this.loadVouchers();
          this.loadActiveVouchers();
          this.dialogService.showSuccess('Voucher Created', `Promotional Voucher "${created.code}" created successfully.`);
        },
        error: (err) => {
          this.loading = false;
          const msg = err.error?.message || 'Failed to create voucher.';
          this.dialogService.showError('Create Failed', msg);
        }
      });
    }
  }

  deleteVoucher(voucher: Voucher): void {
    this.dialogService.confirmDelete(voucher.code, `Are you sure you want to delete promo voucher <strong>${voucher.code}</strong>?<br>This action cannot be undone.`).subscribe(confirmed => {
      if (confirmed) {
        this.loading = true;
        this.voucherService.deleteVoucher(voucher.id!).subscribe({
          next: () => {
            this.loading = false;
            this.loadVouchers();
            this.loadActiveVouchers();
            this.dialogService.showSuccess('Voucher Deleted', `Voucher ${voucher.code} has been deleted.`);
          },
          error: (err) => {
            this.loading = false;
            this.dialogService.showError('Delete Failed', err.error?.message || 'Failed to delete voucher.');
          }
        });
      }
    });
  }

  toggleVoucherStatus(voucher: Voucher): void {
    this.voucherService.toggleActiveStatus(voucher.id!).subscribe({
      next: (updated) => {
        voucher.isActive = updated.isActive;
        voucher.status = updated.status;
        this.loadActiveVouchers();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.dialogService.showError('Status Update Failed', err.error?.message || 'Failed to toggle status.');
      }
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.dialogService.showSuccess('Copied', `Voucher code "${text}" copied to clipboard!`, 1500);
    });
  }

  getVouchersByType(type: string): Voucher[] {
    return (this.vouchers || []).filter(v => v.discountType === type);
  }

  // --- Invoice Compilation ---
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
              this.voucherValidationResult = null;
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
              this.voucherValidationResult = null;
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
              this.voucherValidationResult = null;
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

  printInvoice(invoice: Invoice): void {
    this.billingService.downloadInvoicePdf(invoice.id!).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${invoice.invoiceNumber}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('PDF error', err);
        this.errorMessage = 'Failed to generate Jasper PDF Receipt.';
        this.dialogService.showError('PDF Error', this.errorMessage);
      }
    });
  }

  processPayment(invoice: Invoice): void {
    if (!invoice || !invoice.id) return;
    this.dialogService.confirmAction('Process Payment', `Settle ${invoice.invoiceNumber} payment of Rs. ${invoice.totalAmount}?`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        const payload: PaymentPayload = {
          invoiceId: invoice.id!,
          amount: invoice.totalAmount,
          paymentMethodName: this.paymentMethod,
          transactionReference: this.paymentRef,
          notes: this.paymentNotes
        };

        this.billingService.processPayment(payload).subscribe({
          next: () => {
            this.loading = false;
            this.paymentRef = '';
            this.paymentNotes = '';
            this.loadInvoices();
            this.closeInvoice();
            this.dialogService.showSuccess('Payment Successful', `Payment for invoice ${invoice.invoiceNumber} was successfully processed.`);
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Failed to process invoice payment.';
            this.loading = false;
            this.dialogService.showError('Payment Failed', this.errorMessage);
          }
        });
      }
    });
  }
}
