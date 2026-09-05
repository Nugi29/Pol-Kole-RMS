import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ApiResponse, RoomService, Room } from '../../../services/room.service';
import { TableService, RestaurantTable } from '../../../services/table.service';
import { KitchenOrder } from '../kitchen/kitchen.component';
import { DialogService } from '../../../services/dialog.service';
import { WebsocketService } from '../../../services/websocket.service';
import { StaffAssignmentService, DailyStaffAssignment } from '../../../services/staff-assignment.service';
import { StaffNotificationService, StaffNotification } from '../../../services/staff-notification.service';
import { map, catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-waiter',
  standalone: false,
  templateUrl: './waiter.component.html',
  styleUrl: './waiter.component.css'
})
export class WaiterComponent implements OnInit {
  kitchenOrders: KitchenOrder[] = [];
  cleaningRooms: Room[] = [];
  cleaningTables: RestaurantTable[] = [];
  activeGuestCalls: any[] = [];
  myNotifications: StaffNotification[] = [];
  myAssignments: DailyStaffAssignment[] = [];
  
  loading = false;
  successMessage = '';
  errorMessage = '';
  activeTab = 'ready'; // ready / requests / history / cleaning

  // Filters
  filterMyTablesOnly = false;
  currentUserId: number | null = null;
  currentUserName: string = '';
  currentUserRole: string = '';
  isManagerOrAdmin: boolean = false;

  private readonly baseUrl = `${environment.apiUrl}/kitchen`;
  private readonly http = inject(HttpClient);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly roomService: RoomService,
    private readonly tableService: TableService,
    private readonly staffAssignmentService: StaffAssignmentService,
    private readonly notificationService: StaffNotificationService,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialogService: DialogService,
    public readonly wsService: WebsocketService
  ) { }

  ngOnInit(): void {
    this.initCurrentUser();

    this.wsService.activeGuestCalls$.subscribe(calls => {
      this.activeGuestCalls = calls || [];
      this.cdr.markForCheck();
    });

    this.wsService.staffNotifications$.subscribe(notifs => {
      this.myNotifications = (notifs || []).filter(n => n.status !== 'RESOLVED' && n.status !== 'DISMISSED');
      this.cdr.markForCheck();
    });

    this.loadMyAssignments();
    this.loadMyNotifications();
    this.wsService.refreshAllData();
    this.syncBoard();

    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.syncBoard();
      this.cdr.markForCheck();
    });
  }

  initCurrentUser(): void {
    const idStr = localStorage.getItem('userId') || localStorage.getItem('id');
    if (idStr && !isNaN(Number(idStr))) {
      this.currentUserId = Number(idStr);
    }
    this.currentUserName = localStorage.getItem('name') || 'Waiter Staff';
    this.currentUserRole = (localStorage.getItem('role') || '').toUpperCase();
    this.isManagerOrAdmin = this.currentUserRole.includes('ADMIN') || this.currentUserRole.includes('MANAGER');

    // Default to showing assigned work only for non-admin/non-manager staff
    this.filterMyTablesOnly = !this.isManagerOrAdmin;

    if (!this.currentUserId) {
      const email = localStorage.getItem('email');
      if (email) {
        this.http.get<any>(`${environment.apiUrl}/users`).pipe(
          catchError(() => of(null))
        ).subscribe((res) => {
          const users = res?.data || (Array.isArray(res) ? res : []);
          if (Array.isArray(users)) {
            const found = users.find((u: any) => u.email && u.email.toLowerCase() === email.toLowerCase());
            if (found && found.id) {
              this.currentUserId = found.id;
              localStorage.setItem('userId', String(found.id));
              this.loadMyAssignments();
              this.loadMyNotifications();
              this.wsService.refreshAllData();
              this.cdr.markForCheck();
            }
          }
        });
      }
    }
  }

  loadMyAssignments(): void {
    if (!this.currentUserId) return;
    const today = new Date().toISOString().split('T')[0];
    this.staffAssignmentService.getAssignmentsForUser(this.currentUserId, today).subscribe({
      next: (assignments) => {
        this.myAssignments = assignments || [];
        this.cdr.markForCheck();
      },
      error: () => { }
    });
  }

  loadMyNotifications(): void {
    if (!this.currentUserId) return;
    this.notificationService.getUserNotifications(this.currentUserId, true).subscribe({
      next: (notifs) => {
        this.myNotifications = (notifs || []).filter(n => n.status !== 'RESOLVED' && n.status !== 'DISMISSED');
        this.cdr.markForCheck();
      },
      error: () => { }
    });
  }

  syncBoard(): void {
    if (this.activeTab === 'cleaning') {
      this.loadCleaningTasks();
    } else {
      this.loadOrders();
    }
  }

  loadCleaningTasks(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      rooms: this.roomService.filterRooms('CLEANING', undefined, 0, 1000).pipe(
        catchError(() => of({ content: [] } as any))
      ),
      tables: this.tableService.filterTables('CLEANING', undefined, undefined, 0, 1000).pipe(
        catchError(() => of({ content: [] } as any))
      )
    }).subscribe({
      next: (res) => {
        this.cleaningRooms = res.rooms?.content || [];
        this.cleaningTables = res.tables?.content || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load cleaning tasks', err);
        this.errorMessage = 'Failed to load cleaning tasks.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  cleanRoom(room: Room): void {
    if (!room.id) return;

    this.dialogService.confirmAction('Confirm Cleaning', `Mark Room ${room.roomNumber} as Clean & Available?`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.errorMessage = '';

        const updatedRoom: Room = {
          ...room,
          status: 'AVAILABLE'
        };

        this.roomService.updateRoom(room.id!, updatedRoom).subscribe({
          next: () => {
            this.loadCleaningTasks();
            this.dialogService.showSuccess('Room Cleaned', `Room ${room.roomNumber} has been cleaned and is now available.`);
          },
          error: () => {
            this.errorMessage = `Failed to update Room ${room.roomNumber}.`;
            this.loading = false;
            this.cdr.markForCheck();
            this.dialogService.showError('Update Failed', this.errorMessage);
          }
        });
      }
    });
  }

  cleanTable(table: RestaurantTable): void {
    if (!table.id) return;

    this.dialogService.confirmAction('Confirm Cleaning', `Mark Table ${table.tableNumber} as Clean & Available?`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.errorMessage = '';

        const updatedTable: RestaurantTable = {
          ...table,
          status: 'AVAILABLE'
        };

        this.tableService.updateTable(table.id!, updatedTable).subscribe({
          next: () => {
            this.loadCleaningTasks();
            this.dialogService.showSuccess('Table Cleaned', `Table ${table.tableNumber} is now clean and available.`);
          },
          error: () => {
            this.errorMessage = `Failed to update Table ${table.tableNumber}.`;
            this.loading = false;
            this.cdr.markForCheck();
            this.dialogService.showError('Update Failed', this.errorMessage);
          }
        });
      }
    });
  }

  loadOrders(): void {
    this.loading = true;
    this.errorMessage = '';

    const status = this.activeTab === 'ready' ? 'READY' : 'DELIVERED';

    this.http.get<ApiResponse<KitchenOrder[]>>(`${this.baseUrl}/orders/status?status=${status}`).pipe(
      map((res: any) => res?.data)
    ).subscribe({
      next: (orders) => {
        let orderList = orders || [];
        if (this.activeTab === 'ready') {
          orderList.sort((a, b) => {
            const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
            const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
            if (timeA !== timeB) return timeA - timeB;
            return (a.id || 0) - (b.id || 0);
          });
        }
        this.kitchenOrders = orderList;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = `Failed to load ${status.toLowerCase()} orders.`;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /** Delegates to WebsocketService.normalizeNum — single source of truth for location normalisation. */
  private normalizeNum(val: any): string {
    return this.wsService.normalizeNum(val);
  }

  get filteredKitchenOrders(): KitchenOrder[] {
    if (!this.filterMyTablesOnly || this.myAssignments.length === 0) {
      return this.kitchenOrders;
    }

    return this.kitchenOrders.filter(ko => {
      const koTableNorm = this.normalizeNum(ko.tableNumber);
      const koRoomNorm = this.normalizeNum(ko.roomNumber);

      const tableMatch = this.myAssignments.some(a =>
        a.assignmentType === 'TABLE' && this.normalizeNum(a.tableNumber) === koTableNorm
      );
      if (tableMatch) return true;

      const roomMatch = this.myAssignments.some(a =>
        a.assignmentType === 'ROOM' && this.normalizeNum(a.roomNumber) === koRoomNorm
      );
      return roomMatch;
    });
  }

  get filteredGuestCalls(): any[] {
    const list = (this.activeGuestCalls || []).filter(c => c.status !== 'COMPLETED');
    if (!this.filterMyTablesOnly || this.myAssignments.length === 0) {
      return list;
    }

    return list.filter(call => {
      // 1. Direct staff assignment ID match
      if (call.assignedStaffId && this.currentUserId && Number(call.assignedStaffId) === Number(this.currentUserId)) {
        return true;
      }

      // 2. Table location match
      if ((call.locationType || '').toUpperCase() === 'TABLE') {
        const callNorm = this.normalizeNum(call.locationNumber);
        const match = this.myAssignments.some(a =>
          a.assignmentType === 'TABLE' && (
            (a.tableId && call.locationId && Number(a.tableId) === Number(call.locationId)) ||
            (this.normalizeNum(a.tableNumber) === callNorm) ||
            (a.tableNumber && call.locationNumber && a.tableNumber.trim().toLowerCase() === call.locationNumber.trim().toLowerCase())
          )
        );
        if (match) return true;
      }

      // 3. Room location match
      if ((call.locationType || '').toUpperCase() === 'ROOM') {
        const callNorm = this.normalizeNum(call.locationNumber);
        const match = this.myAssignments.some(a =>
          a.assignmentType === 'ROOM' && (
            (a.roomId && call.locationId && Number(a.roomId) === Number(call.locationId)) ||
            (this.normalizeNum(a.roomNumber) === callNorm) ||
            (a.roomNumber && call.locationNumber && a.roomNumber.trim().toLowerCase() === call.locationNumber.trim().toLowerCase())
          )
        );
        if (match) return true;
      }

      return false;
    });
  }

  get urgentGuestCalls(): any[] {
    return this.filteredGuestCalls.filter(c => c.status === 'WAITING');
  }

  get filteredCleaningTables(): RestaurantTable[] {
    if (!this.filterMyTablesOnly || this.myAssignments.length === 0) {
      return this.cleaningTables;
    }
    return this.cleaningTables.filter(t => {
      const tNorm = this.normalizeNum(t.tableNumber);
      return this.myAssignments.some(a =>
        a.assignmentType === 'TABLE' && (
          (a.tableId && t.id && Number(a.tableId) === Number(t.id)) ||
          (this.normalizeNum(a.tableNumber) === tNorm)
        )
      );
    });
  }

  get filteredCleaningRooms(): Room[] {
    if (!this.filterMyTablesOnly || this.myAssignments.length === 0) {
      return this.cleaningRooms;
    }
    return this.cleaningRooms.filter(r => {
      const rNorm = this.normalizeNum(r.roomNumber);
      return this.myAssignments.some(a =>
        a.assignmentType === 'ROOM' && (
          (a.roomId && r.id && Number(a.roomId) === Number(r.id)) ||
          (this.normalizeNum(a.roomNumber) === rNorm)
        )
      );
    });
  }

  deliverOrder(id?: number): void {
    if (!id) return;
    this.dialogService.confirmAction('Confirm Delivery', `Mark Order #${id} as Delivered & Served to guest?`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.errorMessage = '';

        this.http.put<ApiResponse<KitchenOrder>>(`${this.baseUrl}/orders/${id}/status?status=DELIVERED`, {}).pipe(
          map((res: any) => res?.data)
        ).subscribe({
          next: () => {
            this.wsService.sendMessage('ORDER_STATUS_CHANGED', { orderId: id, status: 'DELIVERED' });
            this.loadOrders();
            this.dialogService.showSuccess('Order Delivered', `Order #${id} marked as delivered & served successfully.`);
          },
          error: () => {
            this.errorMessage = 'Failed to deliver order.';
            this.loading = false;
            this.dialogService.showError('Delivery Failed', this.errorMessage);
          }
        });
      }
    });
  }

  acceptServiceRequest(call: any): void {
    if (!call?.id) return;
    this.wsService.updateServiceRequestStatus(call.id, 'IN_PROGRESS', this.currentUserName);
    this.dialogService.showSuccess('Request Accepted', `Attending to ${call.locationType} ${call.locationNumber} (${call.callType}).`);
  }

  completeServiceRequest(call: any): void {
    if (!call) return;
    this.activeGuestCalls = (this.activeGuestCalls || []).filter(c => {
      if (call.id && c.id === call.id) return false;
      if (call.locationNumber && c.locationNumber && this.normalizeNum(call.locationNumber) === this.normalizeNum(c.locationNumber)) {
        return false;
      }
      return true;
    });
    this.wsService.resolveGuestCall(call);
    this.dialogService.showSuccess('Request Completed', `Completed ${call.callType || 'Service'} for ${call.locationType || 'Location'} ${call.locationNumber}.`);
    this.cdr.markForCheck();
  }

  dismissNotification(notif: StaffNotification): void {
    this.notificationService.resolveNotification(notif.id).subscribe({
      next: () => {
        this.myNotifications = this.myNotifications.filter(n => n.id !== notif.id);
        this.cdr.markForCheck();
      }
    });
  }
}
