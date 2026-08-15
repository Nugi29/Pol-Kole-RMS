import { Component, OnInit, ViewChild } from '@angular/core';
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

@Component({
  selector: 'app-orders',
  standalone: false,
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  orders: Order[] = [];
  tables: RestaurantTable[] = [];
  customers: CustomerDto[] = [];
  menuItems: MenuItem[] = [];
  displayedColumns = ['id', 'customer', 'table', 'totalAmount', 'status', 'time', 'actions'];
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
    private readonly reservationService: HotelReservationService,
    private readonly tableReservationService: ReservationService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadTables();
    this.loadCustomers();
    this.loadMenuItems();
    this.loadOrders();
    this.loadCheckedInReservations();
    this.loadCheckedInTableReservations();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });
  }

  loadTables(): void {
    this.tableService.filterTables('OCCUPIED', undefined, undefined, 0, 100).subscribe(page => {
      this.tables = page.content;
    });
  }

  loadCustomers(): void {
    this.customerService.searchCustomers(undefined, 0, 100).subscribe(page => {
      this.customers = page.content;
    });
  }

  loadMenuItems(): void {
    this.menuService.filterMenuItems(undefined, true, undefined, 0, 100).subscribe(page => {
      this.menuItems = page.content;
    });
  }

  loadCheckedInReservations(): void {
    this.reservationService.filterReservations(undefined, undefined, 'CHECKED_IN').subscribe(page => {
      this.checkedInReservations = page.content;
    });
  }

  loadCheckedInTableReservations(): void {
    this.tableReservationService.filterReservations(undefined, undefined, 3, undefined, undefined, 0, 100).subscribe(page => {
      this.checkedInTableReservations = page.content;
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
    this.orderService.filterOrders().subscribe({
      next: (page) => {
        this.orders = page.content;
        this.dataSource.data = page.content;
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load order history.';
        this.loading = false;
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

  get cartTotal(): number {
    return this.cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
  }

  submitOrder(): void {
    const isCustomerValid = this.serviceType === 'TAKEAWAY' ? true : (this.selectedCustomerId && String(this.selectedCustomerId) !== 'null');
    const isLocationValid = this.serviceType === 'TAKEAWAY' ? true : (this.serviceType === 'TABLE' ? this.selectedTableId : this.selectedRoomId);
    if (!isCustomerValid || !isLocationValid || this.cart.length === 0) {
      this.errorMessage = this.serviceType === 'TAKEAWAY' ? 'Please add items to cart.' : 'Please select a customer, service location, and add items to cart.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const items: OrderItemInput[] = this.cart.map(c => ({
      menuItemId: c.item.id!,
      quantity: c.quantity,
      price: c.item.price,
      notes: c.notes || undefined
    }));

    const payload = {
      customerId: this.selectedCustomerId && String(this.selectedCustomerId) !== 'null' ? Number(this.selectedCustomerId) : null,
      tableId: this.serviceType === 'TABLE' ? this.selectedTableId : null,
      roomId: this.serviceType === 'ROOM' ? this.selectedRoomId : null,
      items: items
    };

    this.orderService.createOrder(payload).subscribe({
      next: (createdOrder) => {
        this.successMessage = 'Order placed successfully to Chef Kitchen Hub!';
        
        // Auto-print token for takeaway orders
        if (this.serviceType === 'TAKEAWAY') {
          this.printToken(createdOrder);
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
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to place order.';
        this.loading = false;
      }
    });
  }

  printToken(order: Order): void {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      alert('Please allow popups to print tokens.');
      return;
    }

    const itemsHtml = order.items.map(item => `
      <tr style="border-bottom: 1px dashed #eee;">
        <td style="padding: 6px 0; font-weight: bold;">${item.menuItemName || 'Item'}</td>
        <td style="padding: 6px 0; text-align: center;">x${item.quantity}</td>
        <td style="padding: 6px 0; text-align: right;">Rs. ${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
      ${item.notes ? `
      <tr>
        <td colspan="3" style="padding-bottom: 6px; font-size: 11px; color: #666; font-style: italic;">
          * Note: ${item.notes}
        </td>
      </tr>` : ''}
    `).join('');

    const customerName = order.customerName || 'Walk-in Guest';
    const orderType = order.roomNumber ? `ROOM: ${order.roomNumber}` : (order.tableNumber ? `TABLE: ${order.tableNumber}` : 'TAKEAWAY');
    const orderTime = order.orderTime ? new Date(order.orderTime).toLocaleString() : new Date().toLocaleString();

    const htmlContent = `
      <html>
        <head>
          <title>Order Token #${order.id}</title>
          <style>
            @page {
              size: auto;
              margin: 0mm;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 13px;
              color: #1a1a1a;
              width: 300px;
              margin: 0 auto;
              padding: 20px 10px;
              line-height: 1.4;
            }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 2px dashed #ccc; margin: 12px 0; }
            .header-title { font-size: 16px; font-weight: 800; color: #000; }
            .token-container {
              background: #f8f9fa;
              border: 2px solid #000;
              border-radius: 8px;
              padding: 12px;
              margin: 15px 0;
              text-align: center;
            }
            .token-label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #666;
              margin-bottom: 4px;
            }
            .token-number {
              font-size: 24px;
              font-weight: 900;
              color: #000;
            }
            .info-table {
              width: 100%;
              margin-top: 10px;
              font-size: 12px;
            }
            .info-table td {
              padding: 3px 0;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 12px;
            }
            .footer {
              font-size: 10.5px;
              color: #555;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="text-center bold header-title">POL-KOLE ROYAL RESTAURANT</div>
          <div class="text-center" style="font-size: 11px; color: #555;">Lounge & Cafe</div>
          
          <div class="divider"></div>
          
          <div class="text-center bold" style="font-size: 14px; text-transform: uppercase;">${orderType} ORDER TOKEN</div>
          
          <div class="token-container">
            <div class="token-label">Token Number</div>
            <div class="token-number">#${order.id}</div>
          </div>
          
          <table class="info-table">
            <tr>
              <td style="color: #666; width: 80px;">Order ID:</td>
              <td class="bold">#${order.id}</td>
            </tr>
            <tr>
              <td style="color: #666;">Guest:</td>
              <td class="bold">${customerName}</td>
            </tr>
            <tr>
              <td style="color: #666;">Date/Time:</td>
              <td>${orderTime}</td>
            </tr>
          </table>
          
          <div class="divider"></div>
          <div class="bold" style="font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">Ordered Items</div>
          <table class="items-table">
            ${itemsHtml}
          </table>
          
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
            <span class="bold" style="font-size: 14px;">TOTAL AMOUNT:</span>
            <span class="bold" style="font-size: 16px; color: #000;">Rs. ${(order.totalAmount || 0).toFixed(2)}</span>
          </div>
          
          <div class="divider"></div>
          <div class="text-center footer">
            Please present this token to retrieve your takeaway order.<br>
            <strong>Thank you for dining with us!</strong>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  cancelOrder(id: number): void {
    if (confirm('Are you sure you want to cancel this order?')) {
      this.loading = true;
      this.orderService.cancelOrder(id).subscribe({
        next: () => {
          this.successMessage = 'Order cancelled successfully.';
          this.loadOrders();
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to cancel order.';
          this.loading = false;
        }
      });
    }
  }
}
