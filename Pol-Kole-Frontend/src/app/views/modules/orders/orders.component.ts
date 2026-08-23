import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { Order, OrderService, OrderItemInput } from '../../../services/order.service';
import { RestaurantTable, TableService } from '../../../services/table.service';
import { CustomerDto, CustomerService } from '../../../services/customer.service';
import { MenuItem, MenuService } from '../../../services/menu.service';
import { HotelReservationService } from '../../../services/hotel-reservation.service';
import { Reservation, ReservationService } from '../../../services/reservation.service';
import { DialogService } from '../../../services/dialog.service';
import { ItemDiscount, ItemDiscountService } from '../../../services/item-discount.service';
import { WebsocketService } from '../../../services/websocket.service';

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
  itemDiscounts: ItemDiscount[] = [];
  displayedColumns = ['id', 'customer', 'table', 'totalAmount', 'status', 'actions'];
  dataSource = new MatTableDataSource<Order>([]);

  activeTab = 'pos';
  loading = false;
  errorMessage = '';
  successMessage = '';

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
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialogService: DialogService,
    private readonly wsService: WebsocketService
  ) {}

  ngOnInit(): void {
    this.loadAll();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.loadAll();
      this.cdr.markForCheck();
    });
  }

  loadAll(): void {
    this.loadTables();
    this.loadCustomers();
    this.loadItemDiscounts();
    this.loadMenuItems();
    this.loadOrders();
    this.loadCheckedInReservations();
    this.loadCheckedInTableReservations();
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
        this.dataSource.data = data;
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

    const total = this.cartTotal;
    this.dialogService.confirmAction('Confirm Place Order', `Place this order for Rs. ${total.toFixed(2)} to the kitchen queue?`).subscribe((confirmed) => {
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

            // Auto-print token for takeaway orders
            if (this.serviceType === 'TAKEAWAY') {
              this.printToken(createdOrder);
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

  printToken(order: Order): void {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      this.dialogService.showError('Popup Blocked', 'Please allow popups in your browser to print tokens.');
      return;
    }

    const itemsHtml = order.items.map(item => `
      <tr style="border-bottom: 1px dashed #eee;">
        <td style="padding: 6px 0; font-weight: bold;">${item.menuItemName || 'Item'}</td>
        <td style="padding: 6px 0; text-align: center;">x${item.quantity}</td>
        <td style="padding: 6px 0; text-align: right;">Rs. ${item.price * item.quantity}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order Token #${order.id}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; width: 280px; margin: 0 auto; padding: 10px; font-size: 12px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .logo { font-size: 16px; font-weight: bold; }
          .token-no { font-size: 20px; font-weight: bold; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .total { border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 6px 0; margin-top: 8px; font-weight: bold; }
          .footer { text-align: center; margin-top: 12px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">POL-KOLE RESORT</div>
          <div>Takeaway Order Ticket</div>
          <div class="token-no">#${order.id}</div>
          <div>${new Date().toLocaleString()}</div>
        </div>
        <div><strong>Guest:</strong> ${order.customerName || 'Walk-in'}</div>
        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left; padding-bottom: 4px;">Item</th>
              <th style="text-align: center; padding-bottom: 4px;">Qty</th>
              <th style="text-align: right; padding-bottom: 4px;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="total">
          <div style="display: flex; justify-content: space-between;">
            <span>TOTAL AMOUNT:</span>
            <span>Rs. ${order.totalAmount}</span>
          </div>
        </div>
        <div class="footer">
          <div>Thank you for dining with us!</div>
          <div>Please show this token to collect your meal.</div>
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
    const itemsList = order.items.map(i => `${i.quantity}x ${i.menuItemName} (Rs. ${i.price})`).join('<br>');
    const details = `
      <strong>Order ID:</strong> #${order.id}<br>
      <strong>Customer:</strong> ${order.customerName || 'Walk-in'}<br>
      <strong>Service:</strong> ${order.tableNumber ? 'Table ' + order.tableNumber : (order.roomNumber ? 'Room ' + order.roomNumber : 'Take Away')}<br>
      <strong>Status:</strong> ${order.statusName}<br>
      <strong>Total:</strong> Rs. ${order.totalAmount}<br><br>
      <strong>Items:</strong><br>${itemsList}
    `;
    this.dialogService.showMessage('Order Details', details, '450px');
  }
}
