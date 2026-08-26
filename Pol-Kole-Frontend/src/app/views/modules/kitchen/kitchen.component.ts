import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiResponse } from '../../../services/room.service';
import { DialogService } from '../../../services/dialog.service';
import { WebsocketService } from '../../../services/websocket.service';
import { AttendanceService, AttendanceRecord } from '../../../services/attendance.service';

export interface KitchenOrderItem {
  id?: number;
  menuItemName: string;
  quantity: number;
  notes?: string;
}

export interface KitchenOrder {
  id?: number;
  orderId: number;
  tableNumber: string;
  roomNumber?: string;
  items: KitchenOrderItem[];
  notes?: string;
  preparationStatus: string; // RECEIVED, PREPARING, READY, DELIVERED
  preparationTimer?: number;
  startTime?: string;
  endTime?: string;
  customerName?: string;
  assignedChefId?: number;
  assignedChefName?: string;
}

@Component({
  selector: 'app-kitchen',
  standalone: false,
  templateUrl: './kitchen.component.html',
  styleUrl: './kitchen.component.css'
})
export class KitchenComponent implements OnInit {
  kitchenOrders: KitchenOrder[] = [];
  servedOrders: KitchenOrder[] = [];
  activeChefsOnDuty: AttendanceRecord[] = [];
  
  loading = false;
  successMessage = '';
  errorMessage = '';
  activeTab = 'active'; // active (RECEIVED, PREPARING) / served (READY, DELIVERED)
  
  // User identity & Role security
  currentUserId: number | null = null;
  currentUserName: string = '';
  currentUserRole: string = '';
  isChef: boolean = false;
  isManagerOrAdmin: boolean = false;

  // Manager filter dropdown
  selectedChefFilter: string = 'ALL';

  private readonly baseUrl = 'http://localhost:8080/api/kitchen';

  constructor(
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
    private readonly attendanceService: AttendanceService,
    public readonly cdr: ChangeDetectorRef,
    private readonly dialogService: DialogService,
    private readonly wsService: WebsocketService
  ) {}

  ngOnInit(): void {
    this.initCurrentUser();
    this.loadActiveChefs();
    this.loadAll();

    // Listen to real-time order / kitchen status updates
    this.wsService.kitchenOrders$.subscribe(kOrders => {
      if (kOrders && kOrders.length > 0) {
        this.kitchenOrders = kOrders;
        this.cdr.markForCheck();
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.loadAll();
      this.cdr.markForCheck();
    });
  }

  initCurrentUser(): void {
    const idStr = localStorage.getItem('userId') || localStorage.getItem('id');
    if (idStr && !isNaN(Number(idStr))) {
      this.currentUserId = Number(idStr);
    }
    this.currentUserName = localStorage.getItem('name') || 'Chef';
    this.currentUserRole = (localStorage.getItem('role') || '').toUpperCase();
    this.isChef = this.currentUserRole.includes('CHEF') || this.currentUserRole === 'CHEF';
    this.isManagerOrAdmin = this.currentUserRole.includes('ADMIN') || this.currentUserRole.includes('MANAGER');

    // Auto-resolve userId if missing
    if (!this.currentUserId) {
      const email = localStorage.getItem('email');
      if (email) {
        this.http.get<any>('http://localhost:8080/api/users').pipe(
          catchError(() => of(null))
        ).subscribe((res) => {
          const users = res?.data || (Array.isArray(res) ? res : []);
          if (Array.isArray(users)) {
            const found = users.find((u: any) => u.email && u.email.toLowerCase() === email.toLowerCase());
            if (found && found.id) {
              this.currentUserId = found.id;
              localStorage.setItem('userId', String(found.id));
              this.cdr.markForCheck();
            }
          }
        });
      }
    }
  }

  loadActiveChefs(): void {
    const today = new Date().toISOString().split('T')[0];
    this.attendanceService.getActiveStaffSummary(today).subscribe({
      next: (summary) => {
        this.activeChefsOnDuty = summary?.activeChefs || [];
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  loadAll(): void {
    this.loadKitchenOrders();
    this.loadServedOrders();
  }

  loadKitchenOrders(): void {
    this.loading = true;
    this.http.get<ApiResponse<KitchenOrder[]>>(`${this.baseUrl}/orders`).pipe(
      map(res => res.data)
    ).subscribe({
      next: (orders) => {
        this.kitchenOrders = orders || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Failed to load kitchen queue.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadServedOrders(): void {
    this.loading = true;
    this.http.get<ApiResponse<KitchenOrder[]>>(`${this.baseUrl}/orders/served`).pipe(
      map(res => res.data)
    ).subscribe({
      next: (orders) => {
        this.servedOrders = orders || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Failed to load served history.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Resolves the single assigned active chef for a given order.
   * If not already assigned in DB, divides orders equally (round-robin)
   * among currently active attended chefs.
   */
  getAssignedChefForOrder(order: KitchenOrder): { id?: number; name: string } {
    if (order.assignedChefName) {
      return { id: order.assignedChefId, name: order.assignedChefName };
    }

    if (this.activeChefsOnDuty.length > 0) {
      const seed = Number(order.orderId || order.id || 0);
      const index = Math.abs(seed) % this.activeChefsOnDuty.length;
      const assigned = this.activeChefsOnDuty[index];
      return { id: assigned.userId, name: assigned.userName || `Chef ${assigned.userId}` };
    }

    return { name: 'Assigned Chef' };
  }

  /**
   * Strict visibility rule:
   * - A Chef ONLY sees orders assigned to THEM.
   * - Other chefs cannot see orders assigned to someone else.
   * - Admins/Managers can view all or filter by selected chef.
   */
  private filterForCurrentChef(orders: KitchenOrder[]): KitchenOrder[] {
    return orders.filter(order => {
      const assigned = this.getAssignedChefForOrder(order);

      // If logged in user is a Chef: strictly only show orders assigned to this chef
      if (this.isChef) {
        if (assigned.id && this.currentUserId && Number(assigned.id) === Number(this.currentUserId)) {
          return true;
        }
        if (assigned.name && this.currentUserName && assigned.name.trim().toLowerCase() === this.currentUserName.trim().toLowerCase()) {
          return true;
        }
        // Chef cannot see other chefs' orders
        return false;
      }

      // If Admin / Manager: can view all or filter by dropdown
      if (this.isManagerOrAdmin && this.selectedChefFilter !== 'ALL') {
        return assigned.name === this.selectedChefFilter || String(assigned.id) === this.selectedChefFilter;
      }

      return true;
    });
  }

  updateTicketStatus(id: number, status: string): void {
    const actionLabel = status === 'PREPARING' ? 'Start Cooking' : (status === 'READY' ? 'Mark Ready' : status);
    this.dialogService.confirmAction(`${actionLabel} Ticket`, `Update Ticket #${id} status to ${status}?`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.errorMessage = '';

        this.http.put<ApiResponse<KitchenOrder>>(`${this.baseUrl}/orders/${id}/status?status=${status}`, {}).pipe(
          map(res => res.data)
        ).subscribe({
          next: () => {
            this.wsService.sendMessage('KITCHEN_STATUS_CHANGED', { ticketId: id, status, chefName: this.currentUserName });
            this.loadAll();
            this.dialogService.showSuccess('Status Updated', `Ticket #${id} is now ${status}.`);
          },
          error: () => {
            this.errorMessage = 'Failed to update ticket status.';
            this.loading = false;
            this.cdr.markForCheck();
            this.dialogService.showError('Update Failed', this.errorMessage);
          }
        });
      }
    });
  }

  get receivedTickets(): KitchenOrder[] {
    const list = (this.kitchenOrders || [])
      .filter(t => t && t.preparationStatus === 'RECEIVED')
      .sort((a, b) => {
        const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return (a.id || 0) - (b.id || 0);
      });
    return this.filterForCurrentChef(list);
  }

  get preparingTickets(): KitchenOrder[] {
    const list = (this.kitchenOrders || [])
      .filter(t => t && t.preparationStatus === 'PREPARING')
      .sort((a, b) => {
        const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return (a.id || 0) - (b.id || 0);
      });
    return this.filterForCurrentChef(list);
  }

  get filteredServedOrders(): KitchenOrder[] {
    return this.filterForCurrentChef(this.servedOrders || []);
  }
}
