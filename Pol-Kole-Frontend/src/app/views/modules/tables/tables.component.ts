import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RestaurantTable, TableLocation, TableService } from '../../../services/table.service';
import { CodeService } from '../../../services/code.service';
import { DialogService } from '../../../services/dialog.service';
import { Order, OrderService } from '../../../services/order.service';
import { Reservation, ReservationService } from '../../../services/reservation.service';
import { WebsocketService } from '../../../services/websocket.service';
import { StaffAssignmentService, DailyStaffAssignment } from '../../../services/staff-assignment.service';
import { KitchenOrder } from '../kitchen/kitchen.component';

@Component({
  selector: 'app-tables',
  standalone: false,
  templateUrl: './tables.component.html',
  styleUrl: './tables.component.css'
})
export class TablesComponent implements OnInit, OnDestroy {
  locationDisplayedColumns = ['name', 'code', 'status', 'actions'];
  locationDataSource = new MatTableDataSource<TableLocation>([]);

  @ViewChild('locationPaginator') set locationPaginator(mp: MatPaginator) {
    this.locationDataSource.paginator = mp;
  }

  tables: RestaurantTable[] = [];
  orders: Order[] = [];
  kitchenTickets: KitchenOrder[] = [];
  reservations: Reservation[] = [];
  myAssignments: DailyStaffAssignment[] = [];
  displayedColumns = ['tableNumber', 'capacity', 'location', 'status', 'actions'];
  dataSource = new MatTableDataSource<RestaurantTable>([]);

  form: FormGroup;
  editingId: number | null = null;
  loading = false;
  errorMessage = '';
  activeTab = 'grid';
  statusFilter = 'ALL';
  isNonAdmin = false;
  currentUserId: number | null = null;

  // Table Location Management
  locations: TableLocation[] = [];
  activeLocations: TableLocation[] = [];
  locationForm: FormGroup;
  editingLocationId: number | null = null;
  locationLoading = false;
  locationErrorMessage = '';

  // Order Details Modal state
  selectedTableForDetails: RestaurantTable | null = null;

  private wsSub: Subscription | null = null;
  private ordersSub: Subscription | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly tableService: TableService,
    private readonly orderService: OrderService,
    private readonly reservationService: ReservationService,
    private readonly staffAssignmentService: StaffAssignmentService,
    public readonly wsService: WebsocketService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly codeService: CodeService,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialogService: DialogService
  ) {
    this.form = this.fb.group({
      tableNumber: [''],
      capacity: [4, [Validators.required, Validators.min(1)]],
      locationId: [null, Validators.required],
      status: ['AVAILABLE', Validators.required]
    });

    this.locationForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      code: ['', [Validators.required, Validators.maxLength(20), Validators.pattern('^[a-zA-Z0-9-]+$')]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    const role = (localStorage.getItem('role') || '').toUpperCase();
    const isManagerOrAdmin = role.includes('ADMIN') || role.includes('MANAGER');
    this.isNonAdmin = !isManagerOrAdmin;
    if (this.isNonAdmin) {
      this.statusFilter = 'MY_ASSIGNED';
    }

    const idStr = localStorage.getItem('userId') || localStorage.getItem('id');
    if (idStr && !isNaN(Number(idStr))) {
      this.currentUserId = Number(idStr);
      this.loadMyAssignments();
    }

    this.loadLocations();
    this.loadTables();
    this.loadReservations();
    this.listenToRealtimeOrders();

    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.loadTables();
      this.loadLocations();
      this.loadReservations();
      this.cdr.markForCheck();
    });
  }

  loadMyAssignments(): void {
    if (!this.currentUserId) return;
    const today = new Date().toISOString().split('T')[0];
    this.staffAssignmentService.getAssignmentsForUser(this.currentUserId, today).subscribe({
      next: (assignments) => {
        this.myAssignments = assignments || [];
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  private normalizeNum(val: any): string {
    if (!val) return '';
    return String(val).toLowerCase().replace(/table/g, '').replace(/room/g, '').replace(/t-/g, '').replace(/t/g, '').replace(/#/g, '').replace(/\s+/g, '').trim();
  }

  ngOnDestroy(): void {
    if (this.wsSub) this.wsSub.unsubscribe();
    if (this.ordersSub) this.ordersSub.unsubscribe();
  }

  listenToRealtimeOrders(): void {
    this.ordersSub = this.wsService.allOrders$.subscribe(orders => {
      this.orders = orders || [];
      this.cdr.markForCheck();
    });

    this.wsSub = this.wsService.kitchenOrders$.subscribe(tickets => {
      this.kitchenTickets = tickets || [];
      this.cdr.markForCheck();
    });
  }

  loadReservations(): void {
    this.reservationService.filterReservations(undefined, undefined, undefined, undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        this.reservations = page?.content || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.reservations = [];
      }
    });
  }

  get myAssignedTablesCount(): number {
    return this.tables.filter(t => {
      const tNorm = this.normalizeNum(t.tableNumber);
      return this.myAssignments.some(a =>
        a.assignmentType === 'TABLE' && (
          (a.tableId && t.id && Number(a.tableId) === Number(t.id)) ||
          (this.normalizeNum(a.tableNumber) === tNorm)
        )
      );
    }).length;
  }

  get filteredTables(): RestaurantTable[] {
    if (this.statusFilter === 'MY_ASSIGNED') {
      if (this.myAssignments.length === 0) {
        return this.tables;
      }
      return this.tables.filter(t => {
        const tNorm = this.normalizeNum(t.tableNumber);
        return this.myAssignments.some(a =>
          a.assignmentType === 'TABLE' && (
            (a.tableId && t.id && Number(a.tableId) === Number(t.id)) ||
            (this.normalizeNum(a.tableNumber) === tNorm)
          )
        );
      });
    }
    if (this.statusFilter === 'ALL') {
      return this.tables;
    }
    return this.tables.filter(t => t.status?.toUpperCase() === this.statusFilter.toUpperCase());
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

  getActiveOrdersForTable(tableId?: number): Order[] {
    if (!tableId || !this.orders) return [];
    return this.orders
      .filter(o => o.tableId === tableId)
      .filter(o => {
        const s = (o.statusName || '').toUpperCase();
        return !s.includes('CANCEL') && !s.includes('PAID');
      })
      .filter(o => this.isToday(o))
      .sort((a, b) => (a.id || 0) - (b.id || 0));
  }

  getActiveOrderForTable(tableId?: number): Order | undefined {
    const activeList = this.getActiveOrdersForTable(tableId);
    return activeList.length > 0 ? activeList[activeList.length - 1] : undefined;
  }

  getTableGrandTotal(tableId?: number): number {
    return this.getActiveOrdersForTable(tableId).reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }

  getKitchenStatusForOrder(orderId?: number): string {
    if (!orderId || !this.kitchenTickets) return 'ORDERED';
    const kt = this.kitchenTickets.find(t => t.orderId === orderId);
    if (kt && kt.preparationStatus) {
      return kt.preparationStatus;
    }
    const order = this.orders.find(o => o.id === orderId);
    return order?.statusName || 'PROCESSING';
  }

  getReservationForTable(tableId?: number): Reservation | undefined {
    if (!tableId || !this.reservations) return undefined;
    return this.reservations.find(r => r.tableId === tableId);
  }

  openTableDisplay(tableId?: number): void {
    if (!tableId) return;
    window.open(`/display/table/${tableId}`, '_blank');
  }

  goToPosForTable(tableId?: number): void {
    this.router.navigate(['/main/orders'], { queryParams: { tab: 'pos', tableId } });
  }

  viewTableOrderDetails(table: RestaurantTable): void {
    const activeOrders = this.getActiveOrdersForTable(table.id);
    if (activeOrders.length === 0) {
      this.dialogService.showMessage(`Table ${table.tableNumber}`, 'No active orders recorded for this table yet.');
      return;
    }

    const roundsHtml = activeOrders.map((order, idx) => {
      const kStatus = this.getKitchenStatusForOrder(order.id);
      const itemsList = (order.items || []).map(i => `
        <div style="display:flex; justify-content:space-between; padding:3px 0; font-size:12px; color:#475569;">
          <span><strong>${i.quantity}x</strong> ${i.menuItemName}</span>
          <span style="font-family:monospace;">Rs. ${(i.price * i.quantity).toFixed(2)}</span>
        </div>
      `).join('');

      return `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:6px;">
            <div>
              <span style="font-weight:bold; color:#1e293b;">Round ${idx + 1} — Order #${order.id}</span>
              ${order.customerName ? `<span style="font-size:11px; color:#64748b; margin-left:4px;">(${order.customerName})</span>` : ''}
            </div>
            <span style="background:#e0e7ff; color:#3730a3; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:10px;">${kStatus}</span>
          </div>
          ${itemsList}
          <div style="text-align:right; font-weight:bold; font-size:12px; color:#0f172a; margin-top:6px; border-top:1px dashed #cbd5e1; padding-top:4px;">
            Subtotal: Rs. ${(order.totalAmount || 0).toFixed(2)}
          </div>
        </div>
      `;
    }).join('');

    const grandTotal = this.getTableGrandTotal(table.id);

    const content = `
      <div style="font-size:13px; line-height:1.6;">
        <p style="margin-bottom:8px;"><strong>Table:</strong> Table ${table.tableNumber} (${table.locationName || 'Main Floor'}) • <strong>${activeOrders.length} ${activeOrders.length === 1 ? 'Active Order' : 'Active Order Rounds'}</strong></p>
        <div style="max-height:280px; overflow-y:auto; padding-right:4px;">
          ${roundsHtml}
        </div>
        <div style="margin-top:12px; padding-top:10px; border-top:2px solid #0f172a; display:flex; justify-content:space-between; font-weight:900; font-size:15px;">
          <span>GRAND TOTAL BILL:</span>
          <span style="color:#059669; font-family:monospace;">Rs. ${grandTotal.toFixed(2)}</span>
        </div>
      </div>
    `;

    this.dialogService.showMessage(`Table ${table.tableNumber} - Active Dining Bill`, content, '500px');
  }

  viewReservationDetails(table: RestaurantTable): void {
    const res = this.getReservationForTable(table.id);
    if (!res) {
      this.dialogService.showMessage(`Table ${table.tableNumber}`, 'No reservation record linked to this table.');
      return;
    }

    const content = `
      <div style="font-size:13px; line-height:1.6;">
        <p><strong>Table:</strong> Table ${table.tableNumber} (${table.locationName || 'Main Floor'})</p>
        <p><strong>Guest Name:</strong> <span style="font-weight:bold; color:#1e40af;">${res.customerName || 'VIP Guest'}</span></p>
        <p><strong>Reservation Time:</strong> <span style="font-weight:bold; color:#b45309;">${res.reservationTime || 'Today'}</span></p>
        <p><strong>Reservation Date:</strong> ${res.reservationDate || 'Today'}</p>
        <p><strong>Party Size:</strong> ${res.guestsCount || table.capacity} Guests (Table Capacity: ${table.capacity})</p>
        <p><strong>Status:</strong> <span style="background:#dbeafe; color:#1e40af; padding:2px 8px; border-radius:4px; font-weight:bold;">${res.reservationStatusName || 'RESERVED'}</span></p>
        ${res.specialRequests ? `<div style="margin-top:10px; padding:8px; background:#f8fafc; border-left:3px solid #3b82f6; border-radius:4px;"><strong>Special Requests:</strong> "${res.specialRequests}"</div>` : ''}
      </div>
    `;

    this.dialogService.showMessage(`Table ${table.tableNumber} - Reservation Details`, content, '460px');
  }

  loadTables(): void {
    this.loading = true;
    this.errorMessage = '';
    this.tableService.filterTables(undefined, undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        const data = page?.content || [];
        this.tables = data;
        this.dataSource.data = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load restaurant tables', err);
        this.errorMessage = 'Failed to load restaurant tables.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadLocations(): void {
    this.locationLoading = true;
    this.locationErrorMessage = '';
    this.tableService.getTableLocations().subscribe({
      next: (data) => {
        const list = data || [];
        this.locations = list;
        this.locationDataSource.data = list;
        this.activeLocations = list.filter(loc => loc.isActive);
        this.locationLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load table locations', err);
        this.locationErrorMessage = 'Failed to load table locations.';
        this.locationLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  saveTable(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.value;
    this.loading = true;
    this.errorMessage = '';

    if (this.editingId) {
      this.tableService.updateTable(this.editingId, payload).subscribe({
        next: () => {
          this.loadTables();
          this.clearForm();
          this.loading = false;
          this.dialogService.showSuccess('Table Updated', 'Table updated successfully.');
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to update table.';
          this.loading = false;
          this.dialogService.showError('Update Failed', this.errorMessage);
        }
      });
    } else {
      this.tableService.createTable(payload).subscribe({
        next: () => {
          this.loadTables();
          this.clearForm();
          this.loading = false;
          this.dialogService.showSuccess('Table Registered', 'New table registered on floor map.');
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create table.';
          this.loading = false;
          this.dialogService.showError('Registration Failed', this.errorMessage);
        }
      });
    }
  }

  editTable(table: RestaurantTable): void {
    this.editingId = table.id || null;
    this.form.patchValue({
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      locationId: table.locationId,
      status: table.status
    });
  }

  quickStatusUpdate(table: RestaurantTable, newStatus: string): void {
    this.dialogService.confirmAction('Confirm Status Change', `Change Table ${table.tableNumber} status to ${newStatus}?`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        const payload = {
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          locationId: table.locationId,
          status: newStatus
        };
        this.tableService.updateTable(table.id!, payload).subscribe({
          next: () => {
            this.loadTables();
            this.loading = false;
            this.dialogService.showSuccess('Status Updated', `Table ${table.tableNumber} status changed to ${newStatus}.`);
          },
          error: (err) => {
            this.errorMessage = 'Failed to update table status.';
            this.loading = false;
            this.dialogService.showError('Update Failed', err.error?.message || 'Failed to update table status.');
          }
        });
      }
    });
  }

  deleteTable(id: number): void {
    const table = this.tables.find(t => t.id === id);
    const tableLabel = table ? `Table ${table.tableNumber}` : 'this table';
    this.dialogService.confirmDelete(tableLabel).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.tableService.deleteTable(id).subscribe({
          next: () => {
            this.loadTables();
            this.loading = false;
            this.dialogService.showSuccess('Deleted', `${tableLabel} was deleted successfully.`);
          },
          error: (err) => {
            this.errorMessage = 'Failed to delete table.';
            this.loading = false;
            this.dialogService.showError('Delete Failed', err.error?.message || 'Failed to delete table.');
          }
        });
      }
    });
  }

  requestClear(): void {
    if (this.form.dirty || this.editingId) {
      this.dialogService.confirmClear().subscribe((confirmed) => {
        if (confirmed) {
          this.clearForm();
          this.dialogService.showSuccess('Cleared', 'Form fields cleared successfully.');
        }
      });
    } else {
      this.clearForm();
    }
  }

  clearForm(): void {
    this.editingId = null;
    this.form.reset({
      tableNumber: '',
      capacity: 4,
      locationId: this.activeLocations.length > 0 ? this.activeLocations[0].id : null,
      status: 'AVAILABLE'
    });
  }

  getTablesCountByStatus(status: string): number {
    return this.tables.filter(t => t.status?.toUpperCase() === status.toUpperCase()).length;
  }

  getTablesCountByLocationId(locationId: number): number {
    return this.tables.filter(t => t.locationId === locationId).length;
  }

  // Location management actions
  saveLocation(): void {
    if (this.locationForm.invalid) {
      this.locationForm.markAllAsTouched();
      return;
    }
    const payload = this.locationForm.value;
    this.locationLoading = true;
    this.locationErrorMessage = '';

    if (this.editingLocationId) {
      this.tableService.updateTableLocation(this.editingLocationId, payload).subscribe({
        next: () => {
          this.loadLocations();
          this.clearLocationForm();
          this.locationLoading = false;
          this.dialogService.showSuccess('Location Updated', 'Location updated successfully.');
        },
        error: (err) => {
          this.locationErrorMessage = err.error?.message || 'Failed to update location.';
          this.locationLoading = false;
          this.dialogService.showError('Update Failed', this.locationErrorMessage);
        }
      });
    } else {
      this.tableService.createTableLocation(payload).subscribe({
        next: () => {
          this.loadLocations();
          this.clearLocationForm();
          this.locationLoading = false;
          this.dialogService.showSuccess('Location Registered', 'New location registered successfully.');
        },
        error: (err) => {
          this.locationErrorMessage = err.error?.message || 'Failed to create location.';
          this.locationLoading = false;
          this.dialogService.showError('Registration Failed', this.locationErrorMessage);
        }
      });
    }
  }

  editLocation(location: TableLocation): void {
    this.editingLocationId = location.id || null;
    this.locationForm.patchValue({
      name: location.name,
      code: location.code,
      isActive: location.isActive
    });
  }

  toggleLocationStatus(location: TableLocation): void {
    const action = location.isActive ? 'deactivate' : 'activate';
    this.dialogService.confirmAction('Confirm Status Change', `Are you sure you want to ${action} location "${location.name}"?`).subscribe((confirmed) => {
      if (confirmed) {
        const payload = { ...location, isActive: !location.isActive };
        this.tableService.updateTableLocation(location.id!, payload).subscribe({
          next: () => {
            this.loadLocations();
            this.dialogService.showSuccess('Status Updated', `Location "${location.name}" is now ${!location.isActive ? 'active' : 'inactive'}.`);
          },
          error: (err) => {
            this.locationErrorMessage = 'Failed to update location status.';
            this.dialogService.showError('Update Failed', err.error?.message || 'Failed to update location status.');
          }
        });
      }
    });
  }

  deleteLocation(id: number): void {
    const loc = this.locations.find(l => l.id === id);
    const locLabel = loc ? `Location "${loc.name}"` : 'this location';
    this.dialogService.confirmAction('Confirm Deactivation', `Are you sure you want to deactivate ${locLabel}?<br>It will be marked as inactive.`).subscribe((confirmed) => {
      if (confirmed) {
        this.locationLoading = true;
        this.tableService.deleteTableLocation(id).subscribe({
          next: () => {
            this.loadLocations();
            this.locationLoading = false;
            this.dialogService.showSuccess('Deactivated', `${locLabel} has been deactivated.`);
          },
          error: (err) => {
            this.locationErrorMessage = err.error?.message || 'Failed to delete location.';
            this.locationLoading = false;
            this.dialogService.showError('Action Failed', this.locationErrorMessage);
          }
        });
      }
    });
  }

  requestClearLocationForm(): void {
    if (this.locationForm.dirty || this.editingLocationId) {
      this.dialogService.confirmClear().subscribe((confirmed) => {
        if (confirmed) {
          this.clearLocationForm();
          this.dialogService.showSuccess('Cleared', 'Location form cleared successfully.');
        }
      });
    } else {
      this.clearLocationForm();
    }
  }

  clearLocationForm(): void {
    this.editingLocationId = null;
    this.locationForm.reset({
      name: '',
      code: '',
      isActive: true
    });
  }
}
