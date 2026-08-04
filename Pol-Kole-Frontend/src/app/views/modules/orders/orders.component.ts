import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { Order, OrderService, OrderItemInput } from '../../../services/order.service';
import { RestaurantTable, TableService } from '../../../services/table.service';
import { CustomerDto, CustomerService } from '../../../services/customer.service';
import { MenuItem, MenuService } from '../../../services/menu.service';

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
  cart: { item: MenuItem; quantity: number; notes: string }[] = [];

  constructor(
    private readonly orderService: OrderService,
    private readonly tableService: TableService,
    private readonly customerService: CustomerService,
    private readonly menuService: MenuService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadTables();
    this.loadCustomers();
    this.loadMenuItems();
    this.loadOrders();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });
  }

  loadTables(): void {
    this.tableService.filterTables(undefined, undefined, undefined, 0, 100).subscribe(page => {
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
    if (!this.selectedCustomerId || !this.selectedTableId || this.cart.length === 0) {
      this.errorMessage = 'Please select a customer, table and add at least one item to cart.';
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
      customerId: this.selectedCustomerId,
      tableId: this.selectedTableId,
      items: items
    };

    this.orderService.createOrder(payload).subscribe({
      next: () => {
        this.successMessage = 'Order placed successfully to Chef Kitchen Hub!';
        this.cart = [];
        this.selectedTableId = null;
        this.selectedCustomerId = null;
        this.loadOrders();
        this.loading = false;
        this.activeTab = 'list';
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to place order.';
        this.loading = false;
      }
    });
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
