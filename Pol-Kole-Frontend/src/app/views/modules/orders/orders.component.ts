import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { Order, OrderService, OrderItemInput } from '../../../services/order.service';
import { RestaurantTable, TableService } from '../../../services/table.service';
import { CustomerDto, CustomerService } from '../../../services/customer.service';
import { MenuItem, MenuCategory, MenuService } from '../../../services/menu.service';
import { HotelReservationService } from '../../../services/hotel-reservation.service';
import { Reservation, ReservationService } from '../../../services/reservation.service';
import { DialogService } from '../../../services/dialog.service';
import { ItemDiscount, ItemDiscountService } from '../../../services/item-discount.service';
import { WebsocketService } from '../../../services/websocket.service';
import { StaffAssignmentService, DailyStaffAssignment } from '../../../services/staff-assignment.service';

@Component({
  selector: 'app-orders',
  standalone: false,
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit {
  private paginator: MatPaginator | null = null;
  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    this.paginator = mp;
    this.dataSource.paginator = mp;
  }

  orders: Order[] = [];
  tables: RestaurantTable[] = [];
  customers: CustomerDto[] = [];
  menuItems: MenuItem[] = [];
  categories: MenuCategory[] = [];
  itemDiscounts: ItemDiscount[] = [];
  myAssignments: DailyStaffAssignment[] = [];
  displayedColumns = ['id', 'customer', 'table', 'totalAmount', 'status', 'actions'];
  dataSource = new MatTableDataSource<Order>([]);

  activeTab = 'pos';
  loading = false;
  errorMessage = '';
  successMessage = '';
  filterMyAssignedOnly = false;
  isNonAdmin = false;
  currentUserId: number | null = null;

  // POS Menu Filters
  dishSearchQuery: string = '';
  selectedCategoryId: number | 'SPECIALS' | null = null;
  showSpecialsOnly: boolean = false;

  // Active Orders Deck Filters
  orderSearchQuery: string = '';
  selectedOrderStatus: string = 'ALL';
  selectedOrderServiceType: 'ALL' | 'TABLE' | 'ROOM' | 'TAKEAWAY' = 'ALL';

  // POS Order Form Builder Helper state
  selectedCustomerId: number | null = null;
  selectedTableId: number | null = null;
  serviceType: 'TABLE' | 'ROOM' | 'TAKEAWAY' = 'TAKEAWAY';
  selectedRoomId: number | null = null;
  selectedReservationId: number | null = null;
  checkedInReservations: any[] = [];
  checkedInTableReservations: Reservation[] = [];
  cart: { item: MenuItem; quantity: number; notes: string }[] = [];

  constructor(
    private readonly orderService: OrderService,
    private readonly tableService: TableService,
    private readonly customerService: CustomerService,
    private readonly menuService: MenuService,
    private readonly itemDiscountService: ItemDiscountService,
    private readonly reservationService: HotelReservationService,
    private readonly tableReservationService: ReservationService,
    private readonly staffAssignmentService: StaffAssignmentService,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialogService: DialogService,
    private readonly wsService: WebsocketService
  ) {}

  ngOnInit(): void {
    const role = (localStorage.getItem('role') || '').toUpperCase();
    const isManagerOrAdmin = role.includes('ADMIN') || role.includes('MANAGER');
    this.isNonAdmin = !isManagerOrAdmin;
    this.filterMyAssignedOnly = this.isNonAdmin;

    const idStr = localStorage.getItem('userId') || localStorage.getItem('id');
    if (idStr && !isNaN(Number(idStr))) {
      this.currentUserId = Number(idStr);
      this.loadMyAssignments();
    }

    this.loadAll();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.loadAll();
      this.cdr.markForCheck();
    });
  }

  loadMyAssignments(): void {
    if (!this.currentUserId) return;
    const today = new Date().toISOString().split('T')[0];
    this.staffAssignmentService.getAssignmentsForUser(this.currentUserId, today).subscribe({
      next: (assignments) => {
        this.myAssignments = assignments || [];
        this.applyOrderFilters();
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  private normalizeNum(val: any): string {
    if (!val) return '';
    return String(val).toLowerCase().replace(/table/g, '').replace(/room/g, '').replace(/t-/g, '').replace(/t/g, '').replace(/#/g, '').replace(/\s+/g, '').trim();
  }

  loadAll(): void {
    this.loadTables();
    this.loadCustomers();
    this.loadItemDiscounts();
    this.loadCategories();
    this.loadMenuItems();
    this.loadOrders();
    this.loadCheckedInReservations();
    this.loadCheckedInTableReservations();
  }

  loadCategories(): void {
    this.menuService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.categories = [];
      }
    });
  }

  loadTables(): void {
    this.tableService.filterTables('OCCUPIED', undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        this.tables = page?.content || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.tables = [];
        this.cdr.markForCheck();
      }
    });
  }

  loadCustomers(): void {
    this.customerService.searchCustomers(undefined, 0, 1000).subscribe({
      next: (page) => {
        this.customers = page?.content || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.customers = [];
        this.cdr.markForCheck();
      }
    });
  }

  loadItemDiscounts(): void {
    this.itemDiscountService.getAllActiveItemDiscounts().subscribe({
      next: (discounts) => {
        this.itemDiscounts = discounts || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.itemDiscounts = [];
      }
    });
  }

  loadMenuItems(): void {
    this.menuService.filterMenuItems(undefined, true, undefined, 0, 1000).subscribe({
      next: (page) => {
        this.menuItems = page?.content || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.menuItems = [];
        this.cdr.markForCheck();
      }
    });
  }

  getItemDiscount(itemId?: number): ItemDiscount | undefined {
    if (!itemId) return undefined;
    return this.itemDiscounts.find(d => d.menuItemId === itemId);
  }

  getItemEffectivePrice(item: MenuItem): number {
    const discount = this.getItemDiscount(item.id);
    if (!discount || discount.calculatedDiscountedPrice === undefined) {
      return item.price;
    }
    return discount.calculatedDiscountedPrice;
  }

  getCategoryItemCount(categoryId: number): number {
    return this.menuItems.filter(m => m.categoryId === categoryId).length;
  }

  get specialsCount(): number {
    return this.menuItems.filter(m => !!this.getItemDiscount(m.id)).length;
  }

  get filteredMenuItems(): MenuItem[] {
    return this.menuItems.filter(item => {
      if (this.selectedCategoryId === 'SPECIALS') {
        if (!this.getItemDiscount(item.id)) {
          return false;
        }
      } else if (this.selectedCategoryId !== null && item.categoryId !== this.selectedCategoryId) {
        return false;
      }
      if (this.showSpecialsOnly && !this.getItemDiscount(item.id)) {
        return false;
      }
      if (this.dishSearchQuery.trim()) {
        const query = this.dishSearchQuery.toLowerCase().trim();
        const nameMatch = item.name?.toLowerCase().includes(query);
        const descMatch = item.description?.toLowerCase().includes(query);
        const catMatch = item.categoryName?.toLowerCase().includes(query);
        if (!nameMatch && !descMatch && !catMatch) {
          return false;
        }
      }
      return true;
    });
  }

  clearDishFilters(): void {
    this.dishSearchQuery = '';
    this.selectedCategoryId = null;
    this.showSpecialsOnly = false;
  }

  showTodayOnly = false;

  get todayOrdersCount(): number {
    return this.orders.filter(o => this.isToday(o)).length;
  }

  isToday(orderOrDate?: any): boolean {
    if (!orderOrDate) return true;
    let dateVal: any = orderOrDate;
    if (typeof orderOrDate === 'object' && !(orderOrDate instanceof Date)) {
      dateVal = orderOrDate.orderTime || orderOrDate.orderDate || orderOrDate.createdAt || orderOrDate.createdDate || orderOrDate.date;
    }
    if (!dateVal) return true;
    try {
      const today = new Date();
      const todayYear = today.getFullYear();
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();
      const todayFormatted = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
      if (typeof dateVal === 'string' && dateVal.trim().startsWith(todayFormatted)) {
        return true;
      }
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return (
          d.getFullYear() === todayYear &&
          (d.getMonth() + 1) === todayMonth &&
          d.getDate() === todayDay
        );
      }
      return false;
    } catch {
      return true;
    }
  }

  get pendingOrdersCount(): number {
    return this.orders.filter(o => o.statusName?.toUpperCase() === 'PENDING').length;
  }

  get preparingOrdersCount(): number {
    return this.orders.filter(o => o.statusName?.toUpperCase() === 'PREPARING').length;
  }

  get readyOrdersCount(): number {
    return this.orders.filter(o => o.statusName?.toUpperCase() === 'READY').length;
  }

  get completedOrdersCount(): number {
    return this.orders.filter(o => ['COMPLETED', 'SERVED'].includes(o.statusName?.toUpperCase() || '')).length;
  }

  get cancelledOrdersCount(): number {
    return this.orders.filter(o => o.statusName?.toUpperCase() === 'CANCELLED').length;
  }

  get hasActiveOrderFilters(): boolean {
    return !!this.orderSearchQuery.trim() || this.selectedOrderStatus !== 'ALL' || this.selectedOrderServiceType !== 'ALL' || this.showTodayOnly || this.filterMyAssignedOnly;
  }

  applyOrderFilters(): void {
    const filtered = this.orders.filter(order => {
      // My Assigned filter
      if (this.filterMyAssignedOnly && this.myAssignments.length > 0) {
        const orderTableNorm = this.normalizeNum(order.tableNumber);
        const orderRoomNorm = this.normalizeNum(order.roomNumber);

        const tableMatch = this.myAssignments.some(a =>
          a.assignmentType === 'TABLE' && (
            (a.tableId && order.tableId && Number(a.tableId) === Number(order.tableId)) ||
            (this.normalizeNum(a.tableNumber) === orderTableNorm)
          )
        );
        const roomMatch = this.myAssignments.some(a =>
          a.assignmentType === 'ROOM' && (
            (a.roomId && order.roomId && Number(a.roomId) === Number(order.roomId)) ||
            (this.normalizeNum(a.roomNumber) === orderRoomNorm)
          )
        );
        if (!tableMatch && !roomMatch) {
          return false;
        }
      }

      // Today date filter
      if (this.showTodayOnly && !this.isToday(order)) {
        return false;
      }
      // Status filter
      if (this.selectedOrderStatus !== 'ALL') {
        const status = order.statusName?.toUpperCase();
        if (this.selectedOrderStatus === 'COMPLETED') {
          if (status !== 'COMPLETED' && status !== 'SERVED') {
            return false;
          }
        } else if (status !== this.selectedOrderStatus) {
          return false;
        }
      }

      // Service Type filter
      if (this.selectedOrderServiceType === 'TABLE') {
        if (!order.tableNumber && !order.tableId) return false;
      } else if (this.selectedOrderServiceType === 'ROOM') {
        if (!order.roomNumber && !order.roomId) return false;
      } else if (this.selectedOrderServiceType === 'TAKEAWAY') {
        if (order.tableNumber || order.tableId || order.roomNumber || order.roomId) return false;
      }

      // Search Query filter
      if (this.orderSearchQuery.trim()) {
        const query = this.orderSearchQuery.toLowerCase().trim();
        const cleanIdQuery = query.replace(/^#/, '');
        const idMatch = String(order.id || '').toLowerCase().includes(cleanIdQuery);
        const customerMatch = (order.customerName || '').toLowerCase().includes(query);
        const tableMatch = (order.tableNumber || '').toLowerCase().includes(query) || (`table ${order.tableNumber}`).toLowerCase().includes(query);
        const roomMatch = (order.roomNumber || '').toLowerCase().includes(query) || (`room ${order.roomNumber}`).toLowerCase().includes(query);
        const statusMatch = (order.statusName || '').toLowerCase().includes(query);
        const itemMatch = (order.items || []).some(i => (i.menuItemName || '').toLowerCase().includes(query));

        if (!idMatch && !customerMatch && !tableMatch && !roomMatch && !statusMatch && !itemMatch) {
          return false;
        }
      }

      return true;
    });

    this.dataSource.data = filtered;
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    this.cdr.markForCheck();
  }

  clearOrderFilters(): void {
    this.orderSearchQuery = '';
    this.selectedOrderStatus = 'ALL';
    this.selectedOrderServiceType = 'ALL';
    this.showTodayOnly = false;
    this.applyOrderFilters();
  }

  loadCheckedInReservations(): void {
    this.reservationService.filterReservations(undefined, undefined, 'CHECKED_IN', undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        this.checkedInReservations = page?.content || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.checkedInReservations = [];
        this.cdr.markForCheck();
      }
    });
  }

  loadCheckedInTableReservations(): void {
    this.tableReservationService.filterReservations(undefined, undefined, 3, undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        this.checkedInTableReservations = page?.content || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.checkedInTableReservations = [];
        this.cdr.markForCheck();
      }
    });
  }

  onReservationChange(): void {
    const res = this.checkedInReservations.find(r => r.id == this.selectedReservationId);
    if (res) {
      this.selectedRoomId = res.roomId;
      this.selectedCustomerId = res.customerId;
    } else {
      this.selectedRoomId = null;
      this.selectedCustomerId = null;
    }
  }

  onTableChange(): void {
    const res = this.checkedInTableReservations.find(r => r.tableId == this.selectedTableId);
    if (res) {
      this.selectedCustomerId = res.customerId;
    } else {
      this.selectedCustomerId = null;
    }
  }

  loadOrders(): void {
    this.loading = true;
    this.errorMessage = '';
    this.orderService.filterOrders(undefined, undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        const data = page?.content || [];
        this.orders = data;
        this.applyOrderFilters();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load orders', err);
        this.errorMessage = 'Failed to load order history.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // POS Cart management
  getItemCartQuantity(itemId?: number): number {
    if (!itemId) return 0;
    const found = this.cart.find(c => c.item.id === itemId);
    return found ? found.quantity : 0;
  }

  addToCart(item: MenuItem): void {
    const existing = this.cart.find(c => c.item.id === item.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({ item, quantity: 1, notes: '' });
    }
  }

  removeFromCart(itemId: number): void {
    this.cart = this.cart.filter(c => c.item.id !== itemId);
  }

  updateQuantity(itemId: number, qty: number): void {
    const existing = this.cart.find(c => c.item.id === itemId);
    if (existing && qty > 0) {
      existing.quantity = qty;
    }
  }

  get cartOriginalSubtotal(): number {
    return this.cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
  }

  get cartTotal(): number {
    return this.cart.reduce((sum, c) => sum + (this.getItemEffectivePrice(c.item) * c.quantity), 0);
  }

  get cartSavings(): number {
    const diff = this.cartOriginalSubtotal - this.cartTotal;
    return diff > 0 ? diff : 0;
  }

  get cartServiceCharge(): number {
    // 10% Service Charge for Table dining and Room service; No service charge for Takeaway
    if (this.serviceType === 'TAKEAWAY') {
      return 0;
    }
    return this.cartTotal * 0.10;
  }

  get cartFinalTotal(): number {
    return this.cartTotal + this.cartServiceCharge;
  }

  requestClearCart(): void {
    if (this.cart.length === 0) return;
    this.dialogService.confirmClear('Do you want to clear all items in the order cart?').subscribe((confirmed) => {
      if (confirmed) {
        this.cart = [];
        this.dialogService.showSuccess('Cart Cleared', 'Order cart has been cleared.');
      }
    });
  }

  submitOrder(): void {
    const isCustomerValid = this.serviceType === 'TAKEAWAY' ? true : (this.selectedCustomerId && String(this.selectedCustomerId) !== 'null');
    const isLocationValid = this.serviceType === 'TAKEAWAY' ? true : (this.serviceType === 'TABLE' ? this.selectedTableId : this.selectedRoomId);
    if (!isCustomerValid || !isLocationValid || this.cart.length === 0) {
      this.errorMessage = this.serviceType === 'TAKEAWAY' ? 'Please add items to cart.' : 'Please select a customer, service location, and add items to cart.';
      this.dialogService.showError('Validation Error', this.errorMessage);
      return;
    }

    const finalTotal = this.cartFinalTotal;
    const isTakeaway = this.serviceType === 'TAKEAWAY';
    const confirmPrompt = isTakeaway
      ? `Place this takeaway order for Rs. ${finalTotal.toFixed(2)} to the kitchen queue?`
      : `Place this ${this.serviceType === 'TABLE' ? 'Table' : 'Room'} order for Rs. ${finalTotal.toFixed(2)} (including 10% service charge) to the kitchen queue?`;

    this.dialogService.confirmAction('Confirm Place Order', confirmPrompt).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.errorMessage = '';

        const items: OrderItemInput[] = this.cart.map(c => ({
          menuItemId: c.item.id!,
          quantity: c.quantity,
          price: this.getItemEffectivePrice(c.item),
          notes: c.notes || undefined
        }));

        const payload = {
          customerId: this.selectedCustomerId && String(this.selectedCustomerId) !== 'null' ? Number(this.selectedCustomerId) : null,
          tableId: this.serviceType === 'TABLE' ? this.selectedTableId : null,
          roomId: this.serviceType === 'ROOM' ? this.selectedRoomId : null,
          items: items
        };

        const orderTableId = this.serviceType === 'TABLE' ? this.selectedTableId : null;

        this.orderService.createOrder(payload).subscribe({
          next: (createdOrder) => {
            this.wsService.sendMessage('ORDER_CREATED', createdOrder);

            // Auto-print receipt / token for takeaway and dining orders
            if (this.serviceType === 'TAKEAWAY') {
              this.printReceipt(createdOrder);
            }

            // Auto-update table status to OCCUPIED for dine-in orders
            if (orderTableId) {
              this.tableService.updateTableStatus(orderTableId, 'OCCUPIED').subscribe({
                next: () => this.loadTables(),
                error: (err) => console.warn('Could not auto-update table status to OCCUPIED', err)
              });
            }

            this.cart = [];
            this.selectedTableId = null;
            this.selectedRoomId = null;
            this.selectedReservationId = null;
            this.selectedCustomerId = null;
            this.serviceType = 'TABLE';
            this.loadOrders();
            this.loadCheckedInReservations();
            this.loadCheckedInTableReservations();
            this.loading = false;
            this.activeTab = 'list';
            this.dialogService.showSuccess('Order Placed', 'Order placed successfully to Chef Kitchen Hub!');
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Failed to place order.';
            this.loading = false;
            this.dialogService.showError('Order Failed', this.errorMessage);
          }
        });
      }
    });
  }

  printReceipt(order: Order): void {
    const printWindow = window.open('', '_blank', 'width=380,height=650');
    if (!printWindow) {
      this.dialogService.showError('Popup Blocked', 'Please allow popups in your browser to print receipts.');
      return;
    }

    const isTakeaway = !order.tableNumber && !order.roomNumber;
    const isTable = !!order.tableNumber;
    const isRoom = !isTable && !!order.roomNumber;

    const itemsSubtotal = (order.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // 10% Service Charge for Table dining and Room ordering; No service charge for Takeaway
    const serviceCharge = (isTable || isRoom) ? (itemsSubtotal * 0.10) : 0;
    const netTotal = itemsSubtotal + serviceCharge;

    const serviceTitle = isTable 
      ? `Table Dining Receipt (Table ${order.tableNumber})` 
      : (isRoom ? `Room Service Receipt (Room ${order.roomNumber})` : `Takeaway Order Ticket & Token`);

    const itemsHtml = (order.items || []).map(item => `
      <tr style="border-bottom: 1px dashed #e2e8f0;">
        <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">
          ${item.menuItemName || 'Item'}
          ${item.notes ? `<div style="font-size: 10px; color: #64748b; font-style: italic;">* ${item.notes}</div>` : ''}
        </td>
        <td style="padding: 6px 0; text-align: center; color: #475569;">x${item.quantity}</td>
        <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a;">Rs. ${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt #${order.id} - Pol-Kole Resort</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            width: 320px; 
            margin: 0 auto; 
            padding: 16px; 
            font-size: 12px; 
            color: #1e293b; 
            background: #fff;
          }
          .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 12px; margin-bottom: 12px; }
          .logo { font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #0f172a; }
          .sublogo { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-top: 2px; }
          .receipt-type { font-size: 13px; font-weight: 700; color: #2563eb; margin-top: 6px; }
          .token-badge { 
            display: inline-block; 
            background: #f1f5f9; 
            border: 2px solid #0f172a; 
            font-size: 22px; 
            font-weight: 900; 
            padding: 4px 14px; 
            border-radius: 8px; 
            margin: 8px 0; 
            font-family: monospace;
          }
          .meta-box { margin-bottom: 12px; font-size: 11.5px; line-height: 1.5; color: #334155; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 12px; }
          .breakdown { border-top: 2px dashed #94a3b8; border-bottom: 2px dashed #94a3b8; padding: 8px 0; margin-top: 10px; font-size: 12px; }
          .row { display: flex; justify-content: space-between; padding: 2px 0; }
          .total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 4px; padding-top: 4px; border-top: 1px solid #e2e8f0; }
          .footer { text-align: center; margin-top: 16px; font-size: 10.5px; color: #64748b; line-height: 1.4; border-top: 1px solid #f1f5f9; padding-top: 10px; }
          .notice-tag { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 6px; margin-top: 6px; font-size: 10px; }
          @media print {
            body { width: 100%; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">POL-KOLE RESORT</div>
          <div class="sublogo">Hospitality & Dining Hub</div>
          <div class="receipt-type">${serviceTitle}</div>
          <div class="token-badge">#${order.id}</div>
          <div style="font-size: 11px; color: #64748b;">${new Date().toLocaleString()}</div>
        </div>

        <div class="meta-box">
          <div><strong>Guest:</strong> ${order.customerName || 'Walk-in Guest'}</div>
          <div><strong>Service Location:</strong> ${isTable ? 'Table ' + order.tableNumber + ' (Dine-In)' : (isRoom ? 'Room ' + order.roomNumber + ' (Room Service)' : 'Takeaway Counter')}</div>
          <div><strong>Status:</strong> ${order.statusName || 'CONFIRMED'}</div>
        </div>

        <table>
          <thead>
            <tr style="border-bottom: 1.5px solid #0f172a;">
              <th style="text-align: left; padding-bottom: 4px; font-size: 11px; text-transform: uppercase;">Item</th>
              <th style="text-align: center; padding-bottom: 4px; font-size: 11px; text-transform: uppercase;">Qty</th>
              <th style="text-align: right; font-size: 11px; text-transform: uppercase;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="breakdown">
          <div class="row">
            <span style="color: #64748b;">Items Subtotal:</span>
            <span style="font-weight: 600;">Rs. ${itemsSubtotal.toFixed(2)}</span>
          </div>
          <div class="row">
            <span style="color: #64748b;">${isTakeaway ? 'Service Charge:' : 'Service Charge (10%):'}</span>
            <span style="font-weight: 600; color: ${isTakeaway ? '#64748b' : '#0d9488'};">
              ${isTakeaway ? 'Rs. 0.00 (Takeaway)' : '+Rs. ' + serviceCharge.toFixed(2)}
            </span>
          </div>
          <div class="total-row">
            <span>NET TOTAL:</span>
            <span>Rs. ${netTotal.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <div>${isTakeaway ? 'Please present this token at the pickup counter.' : 'Thank you for dining with us at Pol-Kole Resort!'}</div>
          <div class="notice-tag">No Taxes/VAT • 10% Service Charge applies to Dine-in & Rooms</div>
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

  printToken(order: Order): void {
    this.printReceipt(order);
  }

  cancelOrder(order: Order): void {
    this.dialogService.confirmAction('Cancel Order', `Are you sure you want to cancel order #${order.id}?`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.orderService.updateOrderStatus(order.id!, 'CANCELLED').subscribe({
          next: () => {
            this.wsService.sendMessage('ORDER_STATUS_CHANGED', { orderId: order.id, status: 'CANCELLED' });
            this.loadOrders();
            this.loading = false;
            this.dialogService.showSuccess('Order Cancelled', `Order #${order.id} has been marked as cancelled.`);
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Failed to cancel order.';
            this.loading = false;
            this.dialogService.showError('Cancel Failed', this.errorMessage);
          }
        });
      }
    });
  }

  viewOrderDetails(order: Order): void {
    const isTakeaway = !order.tableNumber && !order.roomNumber;
    const isTable = !!order.tableNumber;
    const isRoom = !isTable && !!order.roomNumber;

    const itemsSubtotal = (order.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // 10% service charge for Table dining and Room ordering; No service charge for Takeaway
    const serviceCharge = (isTable || isRoom) ? (itemsSubtotal * 0.10) : 0;
    const netTotal = itemsSubtotal + serviceCharge;

    const itemsList = order.items.map(i => `
      <div style="display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; border-bottom: 1px dashed #f1f5f9;">
        <span><strong>${i.quantity}x</strong> ${i.menuItemName}</span>
        <span>Rs. ${(i.price * i.quantity).toFixed(2)}</span>
      </div>
    `).join('');

    const details = `
      <div style="font-size: 12.5px; line-height: 1.6; color: #334155;">
        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 12px;">
          <div><strong>Order ID:</strong> #${order.id}</div>
          <div><strong>Customer:</strong> ${order.customerName || 'Walk-in'}</div>
          <div><strong>Service Location:</strong> <span style="font-weight: bold; color: ${isTakeaway ? '#0284c7' : '#16a34a'};">${isTable ? 'Table ' + order.tableNumber + ' (Dine-In)' : (isRoom ? 'Room ' + order.roomNumber + ' (Room Service)' : 'Take Away')}</span></div>
          <div><strong>Status:</strong> <span style="font-weight: bold; color: #4338ca;">${order.statusName}</span></div>
        </div>

        <div style="font-weight: bold; margin-bottom: 6px; color: #0f172a; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Ordered Items:</div>
        <div style="background: #fff; padding: 6px 10px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 12px;">
          ${itemsList}
        </div>

        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; padding: 2px 0;">
            <span style="color: #64748b;">Items Subtotal:</span>
            <span style="font-weight: 600;">Rs. ${itemsSubtotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 2px 0; color: ${isTakeaway ? '#64748b' : '#0d9488'}; font-weight: 600;">
            <span>${isTakeaway ? 'Service Charge:' : 'Service Charge (10%):'}</span>
            <span>${isTakeaway ? 'Rs. 0.00 (Takeaway)' : '+Rs. ' + serviceCharge.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 6px; padding-top: 6px; border-top: 1px solid #cbd5e1;">
            <span>Net Total:</span>
            <span>Rs. ${netTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;

    this.dialogService.showMessage('Order Details & Breakdown', details, '460px');
  }
}
